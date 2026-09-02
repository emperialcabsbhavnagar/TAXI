import React, { useState, useEffect } from 'react';
import BottomNavBar from '../../components/BottomNavBar';
import { INITIAL_VEHICLES } from '../AdminPortal';
import { loadAllInquiriesFromMySQL, updateInquiryStatusInMySQL, saveInquiryToMySQL } from '../../services/mysqlService';
import { loadAllInquiriesFromFirestore, updateInquiryStatus as updateInquiryStatusFirestore } from '../../services/firebaseService';
import db from '../../services/dbService';
import { Calendar, Clock3, CheckCircle2, XCircle, Car, ArrowRight, X, Edit3 } from 'lucide-react';

export default function RidesTabScreen({ activeTab, setActiveTab, onBookNewRide }) {
  const [filter, setFilter] = useState('ALL'); // ALL, SUCCESS, REJECT
  const [inquiries, setInquiries] = useState([]);
  const [selectedInquiry, setSelectedInquiry] = useState(null); // Modal state for viewing/editing receipt
  const [isEditing, setIsEditing] = useState(false);
  const [editForm, setEditForm] = useState({});

  // Get current user profile for filtering
  const getUserProfile = () => {
    try {
      const saved = localStorage.getItem('cabsy_user_profile');
      return saved ? JSON.parse(saved) : null;
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

    // ── 1. INSTANT PASS (< 1ms): Display cached local inquiries immediately ──
    try {
      const localRaw = localStorage.getItem('cabsy_inquiries');
      const localList = localRaw ? JSON.parse(localRaw) : [];
      const instantRides = filterUserRides(localList);
      if (instantRides.length > 0) {
        setInquiries(instantRides);
      }
    } catch (e) {}

    // ── 2. BACKGROUND PASS: Fetch fresh MySQL & Firestore updates with tight 2.5s timeout ──
    try {
      const withTimeout = (p, ms = 2500) => Promise.race([p, new Promise(r => setTimeout(() => r([]), ms))]);

      const [mysqlData, firestoreData] = await Promise.all([
        withTimeout(loadAllInquiriesFromMySQL().catch(() => [])),
        withTimeout(loadAllInquiriesFromFirestore().catch(() => []))
      ]);

      const inqMap = new Map();
      const localRaw = localStorage.getItem('cabsy_inquiries');
      const localList = localRaw ? JSON.parse(localRaw) : [];
      [...(Array.isArray(localList) ? localList : []),
       ...(Array.isArray(mysqlData) ? mysqlData : []),
       ...(Array.isArray(firestoreData) ? firestoreData : [])].forEach(item => {
        if (item && item.id) {
          inqMap.set(item.id, { ...inqMap.get(item.id), ...item });
        }
      });
      const mergedList = Array.from(inqMap.values());
      const freshUserRides = filterUserRides(mergedList);

      setInquiries(freshUserRides);
      return;
    } catch (e) {
      console.error("Failed to fetch remote inquiries", e);
    }
  };

  useEffect(() => {
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
      updateInquiryStatusInMySQL(inqId, 'Cancelled').catch(() => {});
      updateInquiryStatusFirestore(inqId, 'Cancelled').catch(() => {});
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
      window.dispatchEvent(new CustomEvent('EMPERIAL CABS_inquiry_cancelled', { detail: { id: inqId } }));
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
        canCancel: false,
        canEdit: false,
        cancelReason: 'Trip has already started. Active trips cannot be cancelled by customer.'
      };
    }
    if (st.includes('approve') || st.includes('confirm') || st.includes('assigned') || st.includes('success')) {
      return {
        label: 'Confirmed',
        Icon: CheckCircle2,
        bg: '#ECFDF5',
        border: '#A7F3D0',
        color: '#047857',
        canCancel: true,
        canEdit: false,
        cancelReason: 'You can cancel this inquiry before the trip starts.'
      };
    }
    if (st.includes('reject') || st.includes('decline') || st.includes('cancel')) {
      return {
        label: 'Cancelled',
        Icon: XCircle,
        bg: '#FEE2E2',
        border: '#FCA5A5',
        color: '#B91C1C',
        canCancel: false,
        canEdit: false,
        cancelReason: 'Booking already cancelled.'
      };
    }
    return {
      label: 'Pending Approval',
      Icon: Clock3,
      bg: '#F1F5F9',
      border: '#CBD5E1',
      color: '#475569',
      canCancel: true,
      canEdit: true,
      cancelReason: 'You can modify or cancel this pending inquiry anytime.'
    };
  };

  return (
    <div className="real-mobile-app">
      {/* Header Nav */}
      <div className="white-header-nav" style={{ padding: '16px 20px', borderBottom: '1px solid #E2E8F0', background: '#FFFFFF' }}>
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
                  border: isSelected ? '2px solid #34D399' : '1.5px solid #E2E8F0',
                  background: isSelected ? '#F0FDF4' : '#FFFFFF',
                  color: isSelected ? '#0F172A' : '#64748B',
                  fontFamily: 'League Spartan, sans-serif',
                  fontSize: '14px',
                  fontWeight: '800',
                  cursor: 'pointer',
                  boxShadow: isSelected ? '0 4px 12px rgba(52, 211, 153, 0.2)' : 'none',
                  transition: 'all 0.2s ease',
                  display: 'flex',
                  flexDirection: 'column',
                  alignItems: 'center',
                  gap: '2px'
                }}
              >
                <span>{tab.label}</span>
                <span style={{ fontSize: '11px', fontWeight: '700', color: isSelected ? '#059669' : '#94A3B8' }}>
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
          <div style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
            {filteredInquiries.map((inq, index) => {
              const badge = getStatusBadge(inq.status);
              const inqId = inq.id || inq.createdAt || `INQ-${index}`;
              return (
                <div
                  key={inqId}
                  style={{
                    background: '#FFFFFF',
                    border: '1.5px solid #E2E8F0',
                    borderRadius: '20px',
                    padding: '16px',
                    boxShadow: '0 4px 14px rgba(0,0,0,0.03)',
                    transition: 'all 0.2s ease',
                    cursor: 'pointer'
                  }}
                  onClick={() => {
                    setSelectedInquiry(inq);
                    setEditForm(inq);
                    setIsEditing(false);
                  }}
                >
                  {/* Top Bar ID & Status Badge */}
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '12px' }}>
                    <div>
                      <span style={{ fontFamily: 'League Spartan', fontWeight: '800', color: '#0F172A', fontSize: '16px' }}>
                        {inq.id || `INQ-#${1000 + index}`}
                      </span>
                      <span style={{ fontSize: '11px', fontWeight: '700', color: '#64748B', marginLeft: '8px', textTransform: 'uppercase' }}>
                        {inq.tripType === 'round-trip' ? '• Round Trip' : '• One-Way'}
                      </span>
                    </div>

                    <span 
                      style={{
                        background: badge.bg,
                        border: `1px solid ${badge.border}`,
                        color: badge.color,
                        padding: '4px 10px',
                        borderRadius: '16px',
                        fontSize: '12px',
                        fontWeight: '800',
                        fontFamily: 'League Spartan',
                        display: 'flex',
                        alignItems: 'center',
                        gap: '4px'
                      }}
                    >
                      {badge.Icon && <badge.Icon size={13} />}
                      {badge.label}
                    </span>
                  </div>

                  {/* Date & Time */}
                  <div style={{ fontSize: '13px', color: '#64748B', marginBottom: '12px', fontFamily: 'Space Grotesk', fontWeight: '600', display: 'flex', alignItems: 'center', gap: '6px' }}>
                    <Calendar size={14} color="#64748B" />
                    <span>{inq.scheduledDate || 'Today'} • {inq.scheduledTime || '04:30 PM'}</span>
                  </div>

                  {/* Route Box */}
                  <div style={{ background: '#F8FAFC', padding: '12px', borderRadius: '14px', marginBottom: '12px', border: '1px solid #F1F5F9' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '8px' }}>
                      <span style={{ width: '8px', height: '8px', borderRadius: '50%', background: '#22C55E', flexShrink: 0 }}></span>
                      <span style={{ fontSize: '14px', fontWeight: '700', color: '#0F172A', fontFamily: 'League Spartan' }}>
                        {inq.pickup || inq.pickupLoc || 'Pickup Location'}
                      </span>
                    </div>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                      <span style={{ width: '8px', height: '8px', borderRadius: '50%', background: '#EF4444', flexShrink: 0 }}></span>
                      <span style={{ fontSize: '14px', fontWeight: '700', color: '#0F172A', fontFamily: 'League Spartan' }}>
                        {inq.dropoff || inq.dropoffLoc || 'Destination Point'}
                      </span>
                    </div>
                  </div>

                  {/* Car, Fare & Action Buttons */}
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', borderTop: '1px solid #F1F5F9', paddingTop: '10px' }}>
                    <div>
                      <div style={{ fontWeight: '800', color: '#0F172A', fontSize: '15px', fontFamily: 'League Spartan' }}>
                        {inq.vehicle || inq.carName || inq.selectedCar || 'SWIFT'}
                      </div>
                      <div style={{ fontSize: '12px', color: '#64748B', fontFamily: 'Space Grotesk' }}>
                        {typeof inq.price === 'string' ? inq.price : (inq.fare ? `₹${inq.fare.toLocaleString('en-IN')}` : '₹0')}
                      </div>
                    </div>

                    <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                      <button 
                        type="button"
                        onClick={(e) => {
                          e.stopPropagation();
                          setSelectedInquiry(inq);
                          setEditForm(inq);
                          setIsEditing(false);
                        }}
                        style={{
                          background: '#F1F5F9',
                          border: '1px solid #CBD5E1',
                          color: '#0F172A',
                          padding: '6px 12px',
                          borderRadius: '12px',
                          fontFamily: 'League Spartan',
                          fontWeight: '800',
                          fontSize: '13px',
                          cursor: 'pointer'
                        }}
                      >
                        View Receipt
                      </button>

                      {badge.canCancel && (
                        <button 
                          type="button"
                          onClick={(e) => {
                            e.stopPropagation();
                            handleCancelInquiry(inq.id || inq.createdAt);
                          }}
                          style={{
                            background: '#FEF2F2',
                            border: '1px solid #FECACA',
                            color: '#DC2626',
                            padding: '6px 12px',
                            borderRadius: '12px',
                            fontFamily: 'League Spartan',
                            fontWeight: '800',
                            fontSize: '13px',
                            cursor: 'pointer'
                          }}
                        >
                          Cancel ✕
                        </button>
                      )}
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
                    <span style={{ fontSize: '12px', fontWeight: '800', color: '#059669', display: 'block' }}>
                      VEHICLE {selectedInquiry.driver ? `• ${selectedInquiry.driver}` : ''}
                    </span>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginTop: '2px' }}>
                      <span style={{ fontSize: '16px', fontWeight: '800', color: '#0F172A', fontFamily: 'League Spartan' }}>{selectedInquiry.vehicle || selectedInquiry.carName || selectedInquiry.selectedCar || 'SWIFT'}</span>
                      {(selectedInquiry.plate || selectedInquiry.vehiclePlate || selectedInquiry.carPlate) && (
                        <span style={{ background: '#F59E0B', color: '#0F172A', padding: '2px 8px', borderRadius: '6px', fontWeight: '900', fontSize: '11px', fontFamily: 'Space Grotesk', letterSpacing: '1px', border: '1px solid #FFFFFF' }}>
                          {selectedInquiry.plate || selectedInquiry.vehiclePlate || selectedInquiry.carPlate}
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
                  {getStatusBadge(selectedInquiry.status).canEdit && (
                    <button
                      onClick={() => setIsEditing(true)}
                      style={{
                        width: '100%',
                        background: 'linear-gradient(135deg, #6EE7B7 0%, #34D399 100%)',
                        color: '#FFFFFF',
                        border: 'none',
                        padding: '14px',
                        borderRadius: '16px',
                        fontFamily: 'League Spartan, sans-serif',
                        fontSize: '16px',
                        fontWeight: '800',
                        cursor: 'pointer',
                        boxShadow: '0 4px 14px rgba(110, 231, 183, 0.4)',
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
                        padding: '14px',
                        borderRadius: '16px',
                        fontFamily: 'League Spartan, sans-serif',
                        fontSize: '16px',
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
                    style={{ width: '100%', padding: '12px', borderRadius: '12px', border: '1.5px solid #CBD5E1', fontFamily: 'Space Grotesk', fontWeight: '700', boxSizing: 'border-box' }}
                  />
                </div>

                <div style={{ marginBottom: '14px' }}>
                  <label style={{ fontSize: '12px', fontWeight: '800', color: '#64748B', display: 'block', marginBottom: '4px' }}>DESTINATION POINT</label>
                  <input 
                    type="text"
                    value={editForm.dropoff || editForm.dropoffLoc || ''}
                    onChange={(e) => setEditForm(prev => ({ ...prev, dropoff: e.target.value, dropoffLoc: e.target.value }))}
                    style={{ width: '100%', padding: '12px', borderRadius: '12px', border: '1.5px solid #CBD5E1', fontFamily: 'Space Grotesk', fontWeight: '700', boxSizing: 'border-box' }}
                  />
                </div>

                {/* DATE & TIME DROPDOWNS */}
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '10px', marginBottom: '14px' }}>
                  <div>
                    <label style={{ fontSize: '12px', fontWeight: '800', color: '#64748B', display: 'block', marginBottom: '4px' }}>SCHEDULED DATE</label>
                    <select
                      value={editForm.scheduledDate || 'Today, 10 Aug 2026'}
                      onChange={(e) => setEditForm(prev => ({ ...prev, scheduledDate: e.target.value }))}
                      style={{ width: '100%', padding: '12px', borderRadius: '12px', border: '1.5px solid #CBD5E1', fontFamily: 'Space Grotesk', fontWeight: '700', background: '#FFFFFF', color: '#0F172A', boxSizing: 'border-box' }}
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
                      setEditForm(prev => ({
                        ...prev,
                        vehicle: selName,
                        carName: selName,
                        fare: newFare,
                        price: `₹${newFare.toLocaleString('en-IN')}`
                      }));
                    }}
                    style={{ width: '100%', padding: '12px', borderRadius: '12px', border: '1.5px solid #CBD5E1', fontFamily: 'Space Grotesk', fontWeight: '700', background: '#FFFFFF', color: '#0F172A', boxSizing: 'border-box' }}
                  >
                    {getAvailableVehicles().map(v => (
                      <option key={v.id || v.name} value={v.name}>
                        🚗 {v.name} — ₹{v.ratePerKm || v.rate || 5}/km
                      </option>
                    ))}
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
