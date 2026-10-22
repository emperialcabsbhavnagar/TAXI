import React, { useState, useEffect } from 'react';
import BottomNavBar from '../../components/BottomNavBar';
import { INITIAL_VEHICLES } from '../AdminPortal';
import { loadAllInquiriesFromMySQL, updateInquiryStatusInMySQL, saveInquiryToMySQL } from '../../services/mysqlService';
import { notifyAdmin, registerPushNotifications } from '../../services/notificationEngine';
import db from '../../services/dbService';
import { Calendar, Clock3, CheckCircle2, XCircle, Car, ArrowRight, X, Edit3, User, Phone, ChevronRight, Briefcase, FileText } from 'lucide-react';
import TripReceiptScreen from './TripReceiptScreen';
import sedanImg from '../../assets/images/short-trip-sedan.png';
import suvImg from '../../assets/images/short-trip-suv.png';

export default function RidesTabScreen({ activeTab, setActiveTab, onBookNewRide }) {
  const [filter, setFilter] = useState('ALL'); // ALL, SUCCESS, REJECT
  const [inquiries, setInquiries] = useState([]);
  const [selectedInquiry, setSelectedInquiry] = useState(null); // Modal state for viewing/editing receipt
  const [viewingReceipt, setViewingReceipt] = useState(null); // Full pre-receipt screen view
  const [isEditing, setIsEditing] = useState(false);
  const [editForm, setEditForm] = useState({});

  // Get current user profile for filtering
  const getUserProfile = () => {
    try {
      const saved = localStorage.getItem('cabsy_user_profile');
      if (saved) {
        const parsed = JSON.parse(saved);
        if (parsed) return parsed;
      }
      const savedPhone = localStorage.getItem('cabsy_user_phone');
      if (savedPhone) return { phone: savedPhone };
      return null;
    } catch (e) { return null; }
  };

  // Helper to load available fleet vehicles from Admin
  const getAvailableVehicles = () => {
    try {
      const saved = localStorage.getItem('cabsy_vehicles');
      if (saved) {
        const parsed = JSON.parse(saved);
        if (Array.isArray(parsed) && parsed.length > 0) return parsed;
      }
    } catch (e) {}
    return INITIAL_VEHICLES;
  };

  // Load ONLY current user's inquiries (Instant cache + Background Sync)
  const loadInquiries = async () => {
    const userProfile = getUserProfile();
    const userPhone = (userProfile?.phone || '').replace(/\D/g, '');
    const userEmail = (userProfile?.email || '').toLowerCase().trim();

    const filterUserRides = (items) => {
      if (!Array.isArray(items)) return [];
      const seen = new Set();
      return items.filter(item => {
        if (!item) return false;
        const iPhone = (item.customerPhone || '').replace(/\D/g, '');
        const iEmail = (item.customerEmail || '').toLowerCase().trim();

        const matchesPhone = userPhone && iPhone && (userPhone.slice(-10) === iPhone.slice(-10));
        const matchesEmail = userEmail && iEmail && (userEmail === iEmail);

        if (!matchesPhone && !matchesEmail) return false;
        const idKey = item.id || `${iPhone}-${item.timestamp || item.scheduledTime}`;
        if (seen.has(idKey)) return false;
        seen.add(idKey);
        return true;
      });
    };

    const sortByLatest = (arr) => {
      if (!Array.isArray(arr)) return [];
      return [...arr].sort((a, b) => {
        const tA = new Date(a.created_at || a.timestamp || 0).getTime();
        const tB = new Date(b.created_at || b.timestamp || 0).getTime();
        return tB - tA;
      });
    };

    // ── 1. INSTANT PASS (< 1ms): Display cached local inquiries immediately ──
    try {
      const localRaw = localStorage.getItem('cabsy_inquiries');
      const localList = localRaw ? JSON.parse(localRaw) : [];
      const instantRides = sortByLatest(filterUserRides(localList));
      if (instantRides.length > 0) {
        setInquiries(instantRides);
      }
    } catch (e) {}

    // ── 2. BACKGROUND PASS: Fetch fresh MySQL updates directly from Hostinger database ──
    try {
      const mysqlData = await loadAllInquiriesFromMySQL().catch(() => []);

      const inqMap = new Map();
      const localRaw = localStorage.getItem('cabsy_inquiries');
      const localList = localRaw ? JSON.parse(localRaw) : [];
      // Populate local items first
      (Array.isArray(localList) ? localList : []).forEach(item => {
        if (item && item.id) {
          inqMap.set(item.id, item);
        }
      });
      // Remote MySQL data takes priority with the live truth
      (Array.isArray(mysqlData) ? mysqlData : []).forEach(item => {
        if (item && item.id) {
          inqMap.set(item.id, { ...inqMap.get(item.id), ...item });
        }
      });
      const mergedList = Array.from(inqMap.values());
      try {
        localStorage.setItem('cabsy_inquiries', JSON.stringify(mergedList));
      } catch (e) {}

      const freshUserRides = sortByLatest(filterUserRides(mergedList));
      setInquiries(freshUserRides);
      return;
    } catch (e) {
      console.error("Failed to fetch remote inquiries", e);
    }
  };

  useEffect(() => {
    registerPushNotifications('customer').catch(() => {});
    loadInquiries();

    // Listen for live updates from Admin Portal or booking submissions
    const handleStorageChange = () => loadInquiries();

    let bc = null;
    try {
      if ('BroadcastChannel' in window) {
        bc = new BroadcastChannel('EMPERIAL CABS_realtime_sync');
        bc.onmessage = () => loadInquiries();
      }
    } catch (e) {}

    window.addEventListener('storage', handleStorageChange);
    window.addEventListener('EMPERIAL CABS_ride_booked', handleStorageChange);
    window.addEventListener('EMPERIAL CABS_db_sync', handleStorageChange);
    window.addEventListener('EMPERIAL CABS_trip_completed', handleStorageChange);

    const interval = setInterval(loadInquiries, 10000);

    return () => {
      if (bc) bc.close();
      window.removeEventListener('storage', handleStorageChange);
      window.removeEventListener('EMPERIAL CABS_ride_booked', handleStorageChange);
      window.removeEventListener('EMPERIAL CABS_db_sync', handleStorageChange);
      window.removeEventListener('EMPERIAL CABS_trip_completed', handleStorageChange);
      clearInterval(interval);
    };
  }, []);

  // Cancel Inquiry Action
  const handleCancelInquiry = (inqId) => {
    const targetInq = inquiries.find(item => item.id === inqId || item.createdAt === inqId);
    if (targetInq) {
      const st = (targetInq.status || '').toLowerCase();
      if (st.includes('progress') || st.includes('ride') || st.includes('start') || st.includes('complete')) {
        alert("Trip has already started! Active rides cannot be cancelled by the customer.");
        return;
      }
    }

    if (!window.confirm("Are you sure you want to cancel this booking inquiry?")) return;

    try {
      const targetInq = inquiries.find(item => item.id === inqId || item.createdAt === inqId);
      updateInquiryStatusInMySQL(inqId, 'Cancelled', null, null, null, null, null, null, null, 'customer').catch(() => {});
      try {
        localStorage.setItem(`cabsy_inquiry_cancelled_notified_${inqId}`, 'true');
      } catch (e) {}
      const updatedList = inquiries.map(item => {
        if (item.id === inqId || (item.createdAt && item.createdAt === inqId)) {
          return { ...item, status: 'Cancelled' };
        }
        return item;
      });

      // Auto-refund coupon/wallet coins used for this booking
      if (targetInq && Number(targetInq.walletDiscountUsed) > 0 && targetInq.customerPhone) {
        db.refundWalletCoins(targetInq.customerPhone, targetInq.walletDiscountUsed, inqId, targetInq.pickup, targetInq.dropoff);
      }

      localStorage.setItem('cabsy_inquiries', JSON.stringify(updatedList));
      setInquiries(updatedList);
      if (selectedInquiry && (selectedInquiry.id === inqId || selectedInquiry.createdAt === inqId)) {
        setSelectedInquiry(prev => prev ? { ...prev, status: 'Cancelled' } : null);
      }

      window.dispatchEvent(new Event('storage'));
      window.dispatchEvent(new CustomEvent('EMPERIAL CABS_inquiry_cancelled', { detail: { id: inqId, inquiry: targetInq } }));

      // Dispatch Admin Notification so dispatch team immediately receives sound, push, badge & alert
      const custName = targetInq?.customerName || targetInq?.name || 'Customer';
      const custPhone = targetInq?.customerPhone || targetInq?.phone || '';
      const pickupPlace = targetInq?.pickup || 'Pickup';
      const dropoffPlace = targetInq?.dropoff || 'Dropoff';
      const inqDisplayId = targetInq?.id || inqId;

      notifyAdmin({
        type: 'cancellation',
        title: `Ride Cancelled: #${inqDisplayId}`,
        body: `Customer ${custName} (${custPhone}) cancelled trip: ${pickupPlace} → ${dropoffPlace}`,
        extraData: {
          inquiryId: inqDisplayId,
          tab: 'inquiries',
          status: 'Cancelled',
          customerName: custName,
          customerPhone: custPhone
        }
      });
    } catch (e) {
      console.error("Error cancelling inquiry:", e);
    }
  };

  // Save Edit Receipt Action
  const handleSaveEdit = (e) => {
    e.preventDefault();
    try {
      saveInquiryToMySQL(editForm).catch(() => {});
      const updatedList = inquiries.map(item => {
        if (item.id === editForm.id || (item.createdAt && item.createdAt === editForm.createdAt)) {
          return { ...item, ...editForm };
        }
        return item;
      });

      localStorage.setItem('cabsy_inquiries', JSON.stringify(updatedList));
      setInquiries(updatedList);
      setSelectedInquiry(editForm);
      setIsEditing(false);
      window.dispatchEvent(new Event('storage'));
    } catch (err) {
      console.error("Error saving inquiry edit:", err);
    }
  };

  // Filter logic for 3 tabs: ALL, SUCCESS, REJECT
  const getFilteredInquiries = () => {
    return inquiries.filter(item => {
      const st = (item.status || 'Pending').toLowerCase();
      if (filter === 'ALL') return true;
      if (filter === 'SUCCESS') {
        return st.includes('approve') || st.includes('confirm') || st.includes('success') || st.includes('completed');
      }
      if (filter === 'REJECT') {
        return st.includes('reject') || st.includes('decline') || st.includes('cancel');
      }
      return true;
    });
  };

  const filteredInquiries = getFilteredInquiries();

  const getStatusBadge = (statusStr) => {
    const st = (statusStr || 'Pending').toLowerCase();

    if (st.includes('completed') || st.includes('finish')) {
      return {
        label: 'Completed',
        Icon: CheckCircle2,
        bg: '#DCFCE7',
        border: '#86EFAC',
        color: '#15803D',
        step: 4,
        canCancel: false,
        canEdit: false
      };
    }
    if (st.includes('progress') || st.includes('ride') || st.includes('started') || st.includes('on the way')) {
      return {
        label: 'In Progress',
        Icon: CheckCircle2,
        bg: '#E0F2FE',
        border: '#BAE6FD',
        color: '#0369A1',
        step: 3,
        canCancel: false,
        canEdit: false,
        cancelReason: 'Trip has already started. Active trips cannot be cancelled by customer.'
      };
    }
    if (st.includes('approve') || st.includes('confirm') || st.includes('assigned') || st.includes('success')) {
      return {
        label: 'Confirmed',
        Icon: CheckCircle2,
        bg: '#DCFCE7',
        border: '#86EFAC',
        color: '#15803D',
        step: 3,
        canCancel: true,
        canEdit: false,
        cancelReason: 'You can cancel this inquiry before the trip starts.'
      };
    }
    if (st.includes('review')) {
      return {
        label: 'Reviewing',
        Icon: Clock3,
        bg: '#FEF3C7',
        border: '#FDE68A',
        color: '#B45309',
        step: 2,
        canCancel: true,
        canEdit: true
      };
    }
    if (st.includes('reject') || st.includes('decline') || st.includes('cancel')) {
      return {
        label: 'Cancelled',
        Icon: XCircle,
        bg: '#FEE2E2',
        border: '#FCA5A5',
        color: '#B91C1C',
        step: 1,
        isCancelled: true,
        canCancel: false,
        canEdit: false,
        cancelReason: 'Booking already cancelled.'
      };
    }
    return {
      label: 'Pending Approval',
      Icon: Clock3,
      bg: '#FEF3C7',
      border: '#FDE68A',
      color: '#B45309',
      step: 1,
      canCancel: true,
      canEdit: true,
      cancelReason: 'You can modify or cancel this pending inquiry anytime.'
    };
  };

  // Automated vehicle classification for all regular inquiries & Short Trip inquiries:
  // - 4 Seats (or <= 4 seats, or Sedan / fleet 4-seater): Car Name: "Sedan", Seats: "4 Seats", Bags: "2 Bags"
  // - More than 4 seats (> 4 seats, or SUV / fleet 7-seater): Car Name: "SUV", Seats: "6-7 Seats", Bags: "3 Bags"
  const getVehicleClassification = (inq) => {
    if (!inq) {
      return { isSuv: false, carName: 'Sedan', seats: '4 Seats', bags: '2 Bags', image: sedanImg };
    }
    const rawName = String(inq.vehicle || inq.carName || inq.selectedCar || '').trim();
    const lowerName = rawName.toLowerCase();
    const vType = String(inq.vehicleType || '').toLowerCase().trim();

    // 1. Check matched fleet vehicle from admin
    let fleetCar = null;
    const fleet = getAvailableVehicles();
    if (Array.isArray(fleet) && fleet.length > 0 && lowerName) {
      fleetCar = fleet.find(f => {
        const fName = String(f.name || '').toLowerCase().trim();
        const fId = String(f.id || '').toLowerCase().trim();
        return fName === lowerName || fId === lowerName ||
               (fName.length > 2 && lowerName.includes(fName)) ||
               (lowerName.length > 2 && fName.includes(lowerName));
      });
    }

    // 2. Extract numeric seat count
    let seatNum = null;
    const rawSeats = inq.seats || inq.passengers || fleetCar?.passengers || fleetCar?.seats || '';
    if (typeof rawSeats === 'number') {
      seatNum = rawSeats;
    } else if (typeof rawSeats === 'string' && rawSeats) {
      const match = rawSeats.match(/\d+/);
      if (match) {
        seatNum = parseInt(match[0], 10);
      }
    }

    // 3. Name keywords for SUV detection
    const suvKeywords = [
      'suv', 'ertiga', 'eartice', 'innova', 'crysta', 'carens', 'rumion',
      'scorpio', 'xuv', 'bolero', 'fortuner', 'safari', 'harrier',
      'marazzo', 'triber', 'hycross', 'tavera', 'cruiser'
    ];
    const isSuvName = suvKeywords.some(k => lowerName.includes(k));

    let isSuv = false;
    if (seatNum !== null) {
      isSuv = seatNum > 4;
    } else if (vType === 'suv' || isSuvName) {
      isSuv = true;
    } else if (vType === 'sedan') {
      isSuv = false;
    } else if (fleetCar) {
      const fPass = String(fleetCar.passengers || '').toLowerCase();
      const m = fPass.match(/\d+/);
      const fSeats = m ? parseInt(m[0], 10) : 4;
      isSuv = fSeats > 4;
    } else {
      isSuv = false;
    }

    return isSuv ? {
      isSuv: true,
      carName: 'SUV',
      seats: '6-7 Seats',
      bags: '3 Bags',
      image: suvImg
    } : {
      isSuv: false,
      carName: 'Sedan',
      seats: '4 Seats',
      bags: '2 Bags',
      image: sedanImg
    };
  };

  const getShortVehicleName = (raw, inq) => {
    return getVehicleClassification(inq || { vehicle: raw }).carName;
  };

  const getSpecificCarImage = (inq) => {
    return getVehicleClassification(inq).image;
  };

  const formatFare = (val) => {
    if (!val && val !== 0) return '10,000.00';
    if (typeof val === 'string') {
      const clean = val.replace(/[^\d.]/g, '');
      const num = parseFloat(clean);
      if (!isNaN(num)) return num.toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
      return val;
    }
    return Number(val).toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
  };

  // Full Pre-Receipt Screen View Interception
  if (viewingReceipt) {
    return (
      <TripReceiptScreen
        tripData={viewingReceipt}
        onDone={() => setViewingReceipt(null)}
      />
    );
  }

  return (
    <div className="real-mobile-app">
      {/* Header Nav */}
      <div className="white-header-nav">
        <h2 className="white-header-title" style={{ fontFamily: 'League Spartan', fontSize: '22px', fontWeight: '800', color: '#0F172A', margin: 0 }}>
          My Rides & Inquiries
        </h2>
      </div>

      <div className="app-scroll-content" style={{ padding: '16px 20px 90px 20px' }}>
        {/* 3 FILTER TABS: ALL | SUCCESS | REJECT */}
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '8px', marginBottom: '20px' }}>
          {[
            { key: 'ALL', label: 'All Rides', count: inquiries.length },
            { 
              key: 'SUCCESS', 
              label: 'Success', 
              count: inquiries.filter(i => {
                const st = (i.status || '').toLowerCase();
                return st.includes('approve') || st.includes('confirm') || st.includes('success') || st.includes('completed');
              }).length 
            },
            { 
              key: 'REJECT', 
              label: 'Rejected', 
              count: inquiries.filter(i => {
                const st = (i.status || '').toLowerCase();
                return st.includes('reject') || st.includes('decline') || st.includes('cancel');
              }).length 
            }
          ].map(tab => {
            const isSelected = filter === tab.key;
            return (
              <button
                key={tab.key}
                type="button"
                onClick={() => setFilter(tab.key)}
                style={{
                  padding: '12px 6px',
                  borderRadius: '14px',
                  border: isSelected ? '2px solid #0F172A' : '1.5px solid #E2E8F0',
                  background: isSelected ? '#0F172A' : '#FFFFFF',
                  color: isSelected ? '#FFFFFF' : '#64748B',
                  fontFamily: 'League Spartan, sans-serif',
                  fontSize: '14px',
                  fontWeight: '800',
                  cursor: 'pointer',
                  boxShadow: isSelected ? '0 4px 12px rgba(15, 23, 42, 0.15)' : 'none',
                  transition: 'all 0.2s ease',
                  display: 'flex',
                  flexDirection: 'column',
                  alignItems: 'center',
                  gap: '2px'
                }}
              >
                <span>{tab.label}</span>
                <span style={{ fontSize: '11px', fontWeight: '700', color: isSelected ? '#94A3B8' : '#94A3B8' }}>
                  ({tab.count})
                </span>
              </button>
            );
          })}
        </div>

        {/* INQUIRIES LIST (NO DEMO DATA) */}
        {filteredInquiries.length === 0 ? (
          <div style={{ padding: '40px 20px', background: '#FFFFFF', borderRadius: '20px', border: '1.5px solid #E2E8F0', marginTop: '10px', textAlign: 'center' }}>
            <div style={{ display: 'flex', justifyContent: 'center', marginBottom: '12px' }}><Car size={42} color="#94A3B8" /></div>
            <h3 style={{ fontFamily: 'League Spartan', fontSize: '18px', fontWeight: '800', color: '#0F172A', margin: '0 0 6px 0' }}>
              No {filter === 'SUCCESS' ? 'Confirmed' : filter === 'REJECT' ? 'Rejected' : ''} Trips Found
            </h3>
            <p style={{ fontFamily: 'Space Grotesk', fontSize: '13px', color: '#64748B', margin: '0 0 16px 0' }}>
              {filter === 'ALL' ? "You haven't submitted any ride inquiries yet." : `No inquiries found in ${filter.toLowerCase()} tab.`}
            </p>
            <button
              onClick={onBookNewRide}
              style={{
                background: 'linear-gradient(135deg, #6EE7B7 0%, #34D399 100%)',
                color: '#FFFFFF',
                border: 'none',
                padding: '12px 24px',
                borderRadius: '14px',
                fontFamily: 'League Spartan',
                fontWeight: '800',
                fontSize: '15px',
                cursor: 'pointer',
                boxShadow: '0 4px 14px rgba(110, 231, 183, 0.4)',
                display: 'inline-flex',
                alignItems: 'center',
                gap: '6px'
              }}
            >
              Book New Trip <ArrowRight size={16} />
            </button>
          </div>
        ) : (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
            {filteredInquiries.map((inq, index) => {
              const badge = getStatusBadge(inq.status);
              const inqId = inq.id || (inq.createdAt ? `INQ-${String(inq.createdAt).slice(-4)}` : `INQ-${index + 29}`);
              const vehClass = getVehicleClassification(inq);
              const displayCarName = vehClass.carName;
              const seatsCount = vehClass.seats;
              const bagsCount = vehClass.bags;
              const carImgSrc = vehClass.image;
              const isSuv = vehClass.isSuv;
              const fareFormatted = formatFare(inq.fare || inq.price);

              const timelineSteps = [
                { key: 'submitted', label: 'Inquiry Submitted', step: 1 },
                { key: 'reviewing', label: 'Reviewing', step: 2 },
                { key: 'assignment', label: 'Driver Assignment', step: 3 },
                { key: 'completed', label: 'Completed', step: 4 }
              ];
              const currentStep = badge.step || 1;

              return (
                <div
                  key={inqId}
                  style={{
                    background: '#FFFFFF',
                    border: '1.5px solid #E2E8F0',
                    borderRadius: '20px',
                    padding: '16px 14px 14px',
                    boxShadow: '0 4px 18px rgba(0, 0, 0, 0.04)',
                    transition: 'all 0.2s ease',
                    cursor: 'pointer',
                    overflow: 'hidden'
                  }}
                  onClick={() => {
                    setSelectedInquiry(inq);
                    setEditForm(inq);
                    setIsEditing(false);
                  }}
                >
                  {/* Top Header: ID + Status Pill + Chevron & Date below */}
                  <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', marginBottom: '12px' }}>
                    <div>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                        <span style={{ fontFamily: 'League Spartan', fontWeight: '800', color: '#0F172A', fontSize: '19px', letterSpacing: '-0.02em' }}>
                          {inqId}
                        </span>
                        <span 
                          style={{
                            background: badge.bg,
                            color: badge.color,
                            padding: '3px 10px',
                            borderRadius: '999px',
                            fontSize: '11.5px',
                            fontWeight: '700',
                            fontFamily: 'League Spartan',
                            whiteSpace: 'nowrap'
                          }}
                        >
                          {badge.label}
                        </span>
                      </div>
                      <div style={{ fontSize: '12.5px', color: '#64748B', fontFamily: 'Space Grotesk', fontWeight: '500', marginTop: '3px' }}>
                        {inq.scheduledDate || inq.date || '10 Aug 2026'} • {inq.scheduledTime || inq.time || '03:30 PM'}
                      </div>
                    </div>

                    <div style={{ padding: '2px', color: '#94A3B8' }}>
                      <ChevronRight size={19} strokeWidth={2.2} />
                    </div>
                  </div>

                  {/* Route Container (Pickup & Drop-off with ... truncation) */}
                  <div style={{ background: '#F8FAFC', padding: '12px 14px', borderRadius: '16px', marginBottom: '14px', border: '1px solid #F1F5F9' }}>
                    {/* Pickup Row */}
                    <div style={{ display: 'flex', alignItems: 'flex-start', gap: '10px' }}>
                      <div style={{ width: '9px', height: '9px', borderRadius: '50%', background: '#10B981', flexShrink: 0, marginTop: '4px' }} />
                      <div style={{ flex: 1, minWidth: 0, overflow: 'hidden' }}>
                        <div 
                          title={inq.pickup || inq.pickupLoc || 'Bhavnagar'}
                          style={{
                            fontSize: '14px',
                            fontWeight: '800',
                            color: '#0F172A',
                            fontFamily: 'League Spartan',
                            lineHeight: 1.25,
                            whiteSpace: 'nowrap',
                            overflow: 'hidden',
                            textOverflow: 'ellipsis',
                            display: 'block'
                          }}
                        >
                          {inq.pickup || inq.pickupLoc || 'Bhavnagar'}
                        </div>
                        <div style={{ fontSize: '11px', color: '#64748B', fontWeight: '500', marginTop: '1px' }}>
                          Pickup Location
                        </div>
                      </div>
                    </div>

                    {/* Vertical Dashed Line */}
                    <div style={{ borderLeft: '2px dashed #CBD5E1', height: '14px', marginLeft: '3.5px', margin: '3px 0 3px 3.5px' }} />

                    {/* Drop-off Row */}
                    <div style={{ display: 'flex', alignItems: 'flex-start', gap: '10px' }}>
                      <div style={{ width: '9px', height: '9px', borderRadius: '50%', background: '#EF4444', flexShrink: 0, marginTop: '4px' }} />
                      <div style={{ flex: 1, minWidth: 0, overflow: 'hidden' }}>
                        <div 
                          title={inq.dropoff || inq.dropoffLoc || 'Mumbai'}
                          style={{
                            fontSize: '14px',
                            fontWeight: '800',
                            color: '#0F172A',
                            fontFamily: 'League Spartan',
                            lineHeight: 1.25,
                            whiteSpace: 'nowrap',
                            overflow: 'hidden',
                            textOverflow: 'ellipsis',
                            display: 'block'
                          }}
                        >
                          {inq.dropoff || inq.dropoffLoc || 'Mumbai'}
                        </div>
                        <div style={{ fontSize: '11px', color: '#64748B', fontWeight: '500', marginTop: '1px' }}>
                          Drop-off Location
                        </div>
                      </div>
                    </div>
                  </div>

                  {/* Vehicle Thumbnail, Specs, Fare & Cancel Button (Spacious, No Overlap) */}
                  <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '14px', gap: '10px' }}>
                    {/* Car Thumbnail */}
                    <div style={{ width: '74px', height: '52px', background: '#F8FAFC', borderRadius: '12px', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0, padding: '3px', overflow: 'hidden', border: '1px solid #F1F5F9' }}>
                      <img 
                        src={carImgSrc} 
                        alt={displayCarName}
                        style={{ width: '100%', height: '100%', objectFit: 'contain' }}
                        onError={(e) => { e.currentTarget.src = isSuv ? suvImg : sedanImg; }}
                      />
                    </div>

                    {/* Car Name & Seats / Bags */}
                    <div style={{ minWidth: 0, flex: 1, overflow: 'hidden' }}>
                      <div style={{
                        fontWeight: '800',
                        color: '#0F172A',
                        fontSize: '15px',
                        fontFamily: 'League Spartan',
                        lineHeight: 1.2,
                        whiteSpace: 'nowrap',
                        overflow: 'hidden',
                        textOverflow: 'ellipsis'
                      }}>
                        {displayCarName}
                      </div>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '4px', marginTop: '4px' }}>
                        <User size={12} color="#64748B" />
                        <span style={{ fontSize: '11.5px', color: '#64748B', fontWeight: '600', whiteSpace: 'nowrap' }}>
                          {seatsCount}
                        </span>
                      </div>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '4px', marginTop: '2px' }}>
                        <Briefcase size={12} color="#64748B" />
                        <span style={{ fontSize: '11.5px', color: '#64748B', fontWeight: '600', whiteSpace: 'nowrap' }}>
                          {bagsCount}
                        </span>
                      </div>
                    </div>

                    {/* Subtle Vertical Divider */}
                    <div style={{ width: '1px', backgroundColor: '#F1F5F9', margin: '0 2px', alignSelf: 'stretch', flexShrink: 0 }} />

                    {/* Fare & Cancel Booking Button */}
                    <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'flex-end', justifyContent: 'center', gap: '6px', flexShrink: 0, minWidth: '95px' }}>
                      <div style={{ fontSize: '17px', fontWeight: '800', color: '#0F172A', fontFamily: 'Space Grotesk', lineHeight: 1 }}>
                        ₹{fareFormatted}
                      </div>

                      {badge.canCancel ? (
                        <button
                          type="button"
                          onClick={(e) => {
                            e.stopPropagation();
                            handleCancelInquiry(inq.id || inq.createdAt);
                          }}
                          style={{
                            background: '#FFF1F2',
                            border: '1.2px solid #FECDD3',
                            color: '#E11D48',
                            padding: '5px 12px',
                            borderRadius: '8px',
                            fontFamily: 'League Spartan',
                            fontWeight: '700',
                            fontSize: '11.5px',
                            cursor: 'pointer',
                            whiteSpace: 'nowrap',
                            boxShadow: '0 1px 4px rgba(225, 29, 72, 0.08)'
                          }}
                        >
                          Cancel Booking
                        </button>
                      ) : badge.isCancelled ? (
                        <span style={{ color: '#DC2626', fontSize: '11.5px', fontWeight: '700' }}>
                          Cancelled
                        </span>
                      ) : (
                        <span style={{ color: '#15803D', fontSize: '11.5px', fontWeight: '700' }}>
                          {badge.label}
                        </span>
                      )}
                    </div>
                  </div>

                  {/* 4-Step Horizontal Timeline Progress Tracker */}
                  <div style={{ paddingTop: '10px', borderTop: '1px solid #F1F5F9' }}>
                    <div style={{ display: 'flex', alignItems: 'center', position: 'relative', margin: '0 8px' }}>
                      {timelineSteps.map((stepItem, sIdx) => {
                        const isCurrent = currentStep === stepItem.step;
                        const isPast = currentStep > stepItem.step;
                        const isLast = sIdx === timelineSteps.length - 1;

                        return (
                          <React.Fragment key={stepItem.key}>
                            {/* Node Indicator */}
                            <div style={{ position: 'relative', zIndex: 2, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                              {isCurrent ? (
                                /* Red Double Circle for current active node */
                                <div style={{ width: '18px', height: '18px', borderRadius: '50%', border: '2px solid #EF4444', backgroundColor: '#FFFFFF', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                                  <div style={{ width: '7px', height: '7px', borderRadius: '50%', backgroundColor: '#EF4444' }} />
                                </div>
                              ) : isPast ? (
                                /* Solid Red dot for completed node */
                                <div style={{ width: '12px', height: '12px', borderRadius: '50%', backgroundColor: '#EF4444' }} />
                              ) : (
                                /* Gray Outline Circle for upcoming node */
                                <div style={{ width: '12px', height: '12px', borderRadius: '50%', border: '1.8px solid #CBD5E1', backgroundColor: '#FFFFFF' }} />
                              )}
                            </div>

                            {/* Connecting Line between nodes */}
                            {!isLast && (
                              <div style={{
                                flex: 1,
                                height: '2px',
                                backgroundColor: isPast ? '#EF4444' : '#E2E8F0',
                                margin: '0 2px'
                              }} />
                            )}
                          </React.Fragment>
                        );
                      })}
                    </div>

                    {/* Step Labels Row */}
                    <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', marginTop: '6px', textAlign: 'center' }}>
                      {timelineSteps.map((stepItem) => {
                        const isCurrent = currentStep === stepItem.step;
                        return (
                          <span
                            key={stepItem.key}
                            style={{
                              fontSize: '10px',
                              lineHeight: 1.15,
                              fontFamily: 'League Spartan',
                              fontWeight: isCurrent ? '800' : '600',
                              color: isCurrent ? '#EF4444' : '#64748B',
                              padding: '0 2px',
                              wordBreak: 'break-word'
                            }}
                          >
                            {stepItem.label}
                          </span>
                        );
                      })}
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* DETAILED RECEIPT & EDIT MODAL */}
      {selectedInquiry && (
        <div style={{ position: 'fixed', inset: 0, background: 'rgba(15, 23, 42, 0.75)', zIndex: 9999, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '16px', backdropFilter: 'blur(4px)' }}>
          <div style={{ background: '#FFFFFF', borderRadius: '24px', padding: '24px', width: '100%', maxWidth: '420px', maxHeight: '90vh', overflowY: 'auto', boxShadow: '0 20px 40px rgba(0,0,0,0.25)' }}>
            
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '16px', borderBottom: '1px solid #F1F5F9', paddingBottom: '12px' }}>
              <div>
                <h3 style={{ fontFamily: 'League Spartan', fontSize: '20px', fontWeight: '800', color: '#0F172A', margin: 0 }}>
                  {isEditing ? 'Edit Inquiry Receipt' : 'Inquiry Receipt'}
                </h3>
                <span style={{ fontSize: '12px', color: '#64748B', fontFamily: 'Space Grotesk' }}>
                  {selectedInquiry.id || 'INQ-REF'}
                </span>
              </div>
              <button 
                onClick={() => setSelectedInquiry(null)} 
                style={{ background: '#F1F5F9', border: 'none', borderRadius: '50%', width: '32px', height: '32px', fontSize: '16px', cursor: 'pointer', color: '#0F172A', fontWeight: 'bold' }}
              >
                ✕
              </button>
            </div>

            {!isEditing ? (
              /* VIEW RECEIPT DETAILS */
              <div>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px' }}>
                  <span style={{ fontSize: '13px', fontWeight: '700', color: '#64748B' }}>STATUS:</span>
                  <span style={{ background: getStatusBadge(selectedInquiry.status).bg, border: `1px solid ${getStatusBadge(selectedInquiry.status).border}`, color: getStatusBadge(selectedInquiry.status).color, padding: '6px 14px', borderRadius: '16px', fontSize: '13px', fontWeight: '800', fontFamily: 'League Spartan' }}>
                    {getStatusBadge(selectedInquiry.status).label}
                  </span>
                </div>

                <div style={{ background: '#F8FAFC', padding: '14px', borderRadius: '16px', marginBottom: '16px', border: '1px solid #E2E8F0' }}>
                  <div style={{ marginBottom: '10px' }}>
                    <span style={{ fontSize: '11px', fontWeight: '800', color: '#64748B', display: 'block' }}>PICKUP LOCATION</span>
                    <span style={{ fontSize: '15px', fontWeight: '800', color: '#0F172A', fontFamily: 'League Spartan' }}>{selectedInquiry.pickup || selectedInquiry.pickupLoc}</span>
                  </div>
                  <div>
                    <span style={{ fontSize: '11px', fontWeight: '800', color: '#64748B', display: 'block' }}>DESTINATION POINT</span>
                    <span style={{ fontSize: '15px', fontWeight: '800', color: '#0F172A', fontFamily: 'League Spartan' }}>{selectedInquiry.dropoff || selectedInquiry.dropoffLoc}</span>
                  </div>
                </div>

                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px', marginBottom: '16px' }}>
                  <div style={{ background: '#F8FAFC', padding: '12px', borderRadius: '14px', border: '1px solid #E2E8F0' }}>
                    <span style={{ fontSize: '11px', fontWeight: '800', color: '#64748B', display: 'block' }}>SCHEDULED DATE</span>
                    <span style={{ fontSize: '14px', fontWeight: '800', color: '#0F172A', fontFamily: 'Space Grotesk' }}>{selectedInquiry.scheduledDate || 'Today'}</span>
                  </div>
                  <div style={{ background: '#F8FAFC', padding: '12px', borderRadius: '14px', border: '1px solid #E2E8F0' }}>
                    <span style={{ fontSize: '11px', fontWeight: '800', color: '#64748B', display: 'block' }}>TIME</span>
                    <span style={{ fontSize: '14px', fontWeight: '800', color: '#0F172A', fontFamily: 'Space Grotesk' }}>{selectedInquiry.scheduledTime || '04:30 PM'}</span>
                  </div>
                </div>

                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', background: '#F0FDF4', border: '1.5px solid #BBF7D0', padding: '14px', borderRadius: '16px', marginBottom: '20px' }}>
                  <div>
                    <span style={{ fontSize: '12px', fontWeight: '800', color: '#059669', display: 'flex', alignItems: 'center', gap: '5px' }}>
                      <User size={13} /> Chauffeur: {selectedInquiry.driver || 'Assigned Driver'}
                    </span>
                    {(selectedInquiry.driverPhone || selectedInquiry.driverNumber) && (
                      <a 
                        href={`tel:${selectedInquiry.driverPhone || selectedInquiry.driverNumber}`} 
                        style={{ fontSize: '12px', color: '#047857', fontWeight: '700', textDecoration: 'none', display: 'inline-flex', alignItems: 'center', gap: '5px', margin: '2px 0 4px 0' }}
                      >
                        <Phone size={11} /> {selectedInquiry.driverPhone || selectedInquiry.driverNumber}
                      </a>
                    )}
                    <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginTop: '2px', flexWrap: 'wrap' }}>
                      <span style={{ fontSize: '16px', fontWeight: '800', color: '#0F172A', fontFamily: 'League Spartan' }}>
                        {getVehicleClassification(selectedInquiry).carName}
                      </span>
                      <span style={{ fontSize: '12px', color: '#64748B', fontWeight: '700', fontFamily: 'Space Grotesk' }}>
                        ({getVehicleClassification(selectedInquiry).seats} • {getVehicleClassification(selectedInquiry).bags})
                      </span>
                      {(selectedInquiry.plate || selectedInquiry.vehiclePlate || selectedInquiry.carPlate) && (
                        <span style={{ background: '#FFFFFF', color: '#0F172A', padding: '3px 8px', borderRadius: '8px', fontWeight: '900', fontSize: '11px', fontFamily: 'Space Grotesk, sans-serif', letterSpacing: '0.8px', border: '1.5px solid #CBD5E1', display: 'inline-flex', alignItems: 'center', gap: '5px', boxShadow: '0 1px 3px rgba(0,0,0,0.06)' }}>
                          🚗 {selectedInquiry.plate || selectedInquiry.vehiclePlate || selectedInquiry.carPlate}
                        </span>
                      )}
                    </div>
                  </div>
                  <div style={{ textAlign: 'right' }}>
                    <span style={{ fontSize: '12px', fontWeight: '800', color: '#059669', display: 'block' }}>TOTAL FARE</span>
                    <span style={{ fontSize: '22px', fontWeight: '800', color: '#34D399', fontFamily: 'League Spartan' }}>{typeof selectedInquiry.price === 'string' ? selectedInquiry.price : (selectedInquiry.fare ? `₹${selectedInquiry.fare.toLocaleString('en-IN')}` : '₹0')}</span>
                  </div>
                </div>

                {/* MODAL ACTION BUTTONS */}
                <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
                  {/* Prominent View Pre-Receipt / E-Invoice button */}
                  <button
                    type="button"
                    onClick={() => {
                      setViewingReceipt(selectedInquiry);
                      setSelectedInquiry(null);
                    }}
                    style={{
                      width: '100%',
                      background: 'linear-gradient(135deg, #10B981 0%, #059669 100%)',
                      color: '#FFFFFF',
                      border: 'none',
                      padding: '14px',
                      borderRadius: '16px',
                      fontFamily: 'League Spartan, sans-serif',
                      fontSize: '15px',
                      fontWeight: '800',
                      cursor: 'pointer',
                      boxShadow: '0 4px 14px rgba(16, 185, 129, 0.35)',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      gap: '8px'
                    }}
                  >
                    <FileText size={18} />
                    <span>View Pre-Receipt / E-Invoice</span>
                  </button>

                  {getStatusBadge(selectedInquiry.status).canEdit && (
                    <button
                      onClick={() => setIsEditing(true)}
                      style={{
                        width: '100%',
                        background: '#F1F5F9',
                        color: '#0F172A',
                        border: '1.5px solid #CBD5E1',
                        padding: '13px',
                        borderRadius: '16px',
                        fontFamily: 'League Spartan, sans-serif',
                        fontSize: '15px',
                        fontWeight: '800',
                        cursor: 'pointer',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        gap: '8px'
                      }}
                    >
                      <Edit3 size={16} />
                      <span>Edit Inquiry Details</span>
                    </button>
                  )}

                  {getStatusBadge(selectedInquiry.status).canCancel && (
                    <button
                      onClick={() => handleCancelInquiry(selectedInquiry.id || selectedInquiry.createdAt)}
                      style={{
                        width: '100%',
                        background: '#FEF2F2',
                        border: '1.5px solid #FECACA',
                        color: '#DC2626',
                        padding: '13px',
                        borderRadius: '16px',
                        fontFamily: 'League Spartan, sans-serif',
                        fontSize: '15px',
                        fontWeight: '800',
                        cursor: 'pointer',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        gap: '8px'
                      }}
                    >
                      <XCircle size={16} />
                      <span>Cancel Inquiry</span>
                    </button>
                  )}
                </div>
              </div>
            ) : (
              /* EDIT RECEIPT FORM */
              <form onSubmit={handleSaveEdit}>
                <div style={{ marginBottom: '14px' }}>
                  <label style={{ fontSize: '12px', fontWeight: '800', color: '#64748B', display: 'block', marginBottom: '4px' }}>PICKUP LOCATION</label>
                  <input 
                    type="text"
                    value={editForm.pickup || editForm.pickupLoc || ''}
                    onChange={(e) => setEditForm(prev => ({ ...prev, pickup: e.target.value, pickupLoc: e.target.value }))}
                    style={{ width: '100%', padding: '12px', borderRadius: '12px', border: '1.5px solid #CBD5E1', fontFamily: 'Space Grotesk', fontSize: '16px', fontWeight: '700', boxSizing: 'border-box' }}
                  />
                </div>

                <div style={{ marginBottom: '14px' }}>
                  <label style={{ fontSize: '12px', fontWeight: '800', color: '#64748B', display: 'block', marginBottom: '4px' }}>DESTINATION POINT</label>
                  <input 
                    type="text"
                    value={editForm.dropoff || editForm.dropoffLoc || ''}
                    onChange={(e) => setEditForm(prev => ({ ...prev, dropoff: e.target.value, dropoffLoc: e.target.value }))}
                    style={{ width: '100%', padding: '12px', borderRadius: '12px', border: '1.5px solid #CBD5E1', fontFamily: 'Space Grotesk', fontSize: '16px', fontWeight: '700', boxSizing: 'border-box' }}
                  />
                </div>

                {/* DATE & TIME DROPDOWNS */}
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '10px', marginBottom: '14px' }}>
                  <div>
                    <label style={{ fontSize: '12px', fontWeight: '800', color: '#64748B', display: 'block', marginBottom: '4px' }}>SCHEDULED DATE</label>
                    <select
                      value={editForm.scheduledDate || 'Today, 10 Aug 2026'}
                      onChange={(e) => setEditForm(prev => ({ ...prev, scheduledDate: e.target.value }))}
                      style={{ width: '100%', padding: '12px', borderRadius: '12px', border: '1.5px solid #CBD5E1', fontFamily: 'Space Grotesk', fontSize: '16px', fontWeight: '700', background: '#FFFFFF', color: '#0F172A', boxSizing: 'border-box' }}
                    >
                      {["Today, 10 Aug 2026", "Tomorrow, 11 Aug 2026", "Wed, 12 Aug 2026", "Thu, 13 Aug 2026", "Fri, 14 Aug 2026", "Sat, 15 Aug 2026"].map(d => (
                        <option key={d} value={d}>{d}</option>
                      ))}
                    </select>
                  </div>
                  <div>
                    <label style={{ fontSize: '12px', fontWeight: '800', color: '#64748B', display: 'block', marginBottom: '4px' }}>PICKUP TIME</label>
                    <select
                      value={editForm.scheduledTime || '04:30 PM'}
                      onChange={(e) => setEditForm(prev => ({ ...prev, scheduledTime: e.target.value }))}
                      style={{ width: '100%', padding: '12px', borderRadius: '12px', border: '1.5px solid #CBD5E1', fontFamily: 'Space Grotesk', fontWeight: '700', background: '#FFFFFF', color: '#0F172A', boxSizing: 'border-box' }}
                    >
                      {[
                        "08:00 AM", "08:30 AM", "09:00 AM", "09:30 AM", "10:00 AM", "10:30 AM", "11:00 AM", "11:30 AM",
                        "12:00 PM", "12:30 PM", "01:00 PM", "01:30 PM", "02:00 PM", "02:30 PM", "03:00 PM", "03:30 PM",
                        "04:00 PM", "04:30 PM", "05:00 PM", "05:30 PM", "06:00 PM", "06:30 PM", "07:00 PM", "07:30 PM", "08:00 PM", "08:30 PM", "09:00 PM"
                      ].map(t => (
                        <option key={t} value={t}>{t}</option>
                      ))}
                    </select>
                  </div>
                </div>

                {/* VEHICLE / FLEET CAR DROPDOWN */}
                <div style={{ marginBottom: '20px' }}>
                  <label style={{ fontSize: '12px', fontWeight: '800', color: '#64748B', display: 'block', marginBottom: '4px' }}>FLEET VEHICLE CAR</label>
                  <select
                    value={editForm.vehicle || editForm.carName || ''}
                    onChange={(e) => {
                      const selName = e.target.value;
                      const vehicles = getAvailableVehicles();
                      const matched = vehicles.find(v => v.name === selName);
                      const rate = Number(matched?.ratePerKm || matched?.pricePerKm || matched?.rate) || 5;
                      const newFare = Math.round(rate * 154); // default route distance
                      const vClass = getVehicleClassification({ vehicle: selName, passengers: matched?.passengers });
                      setEditForm(prev => ({
                        ...prev,
                        vehicle: selName,
                        carName: selName,
                        seats: vClass.seats,
                        luggage: vClass.bags,
                        bags: vClass.bags,
                        vehicleType: vClass.isSuv ? 'suv' : 'sedan',
                        fare: newFare,
                        price: `₹${newFare.toLocaleString('en-IN')}`
                      }));
                    }}
                    style={{ width: '100%', padding: '12px', borderRadius: '12px', border: '1.5px solid #CBD5E1', fontFamily: 'Space Grotesk', fontWeight: '700', background: '#FFFFFF', color: '#0F172A', boxSizing: 'border-box' }}
                  >
                    {getAvailableVehicles().map(v => {
                      const vc = getVehicleClassification({ vehicle: v.name, passengers: v.passengers });
                      return (
                        <option key={v.id || v.name} value={v.name}>
                          🚗 {v.name} ({vc.carName} • {vc.seats}, {vc.bags}) — ₹{v.ratePerKm || v.rate || 5}/km
                        </option>
                      );
                    })}
                  </select>
                </div>

                <div style={{ display: 'flex', gap: '10px' }}>
                  <button
                    type="button"
                    onClick={() => setIsEditing(false)}
                    style={{ flex: 1, background: '#F1F5F9', border: 'none', padding: '14px', borderRadius: '16px', fontFamily: 'League Spartan', fontWeight: '800', cursor: 'pointer' }}
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    style={{ flex: 1, background: 'linear-gradient(135deg, #6EE7B7 0%, #34D399 100%)', color: '#FFFFFF', border: 'none', padding: '14px', borderRadius: '16px', fontFamily: 'League Spartan', fontWeight: '800', cursor: 'pointer', boxShadow: '0 4px 14px rgba(110, 231, 183, 0.4)' }}
                  >
                    Save Changes
                  </button>
                </div>
              </form>
            )}

          </div>
        </div>
      )}

      {/* Bottom Navigation Toolbar */}
      <BottomNavBar activeTab={activeTab} setActiveTab={setActiveTab} />
    </div>
  );
}
