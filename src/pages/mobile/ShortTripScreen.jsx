import React, { useState, useEffect } from 'react';
import { 
  ArrowLeft, 
  MapPin, 
  Navigation, 
  Calendar, 
  Clock, 
  Phone, 
  CheckCircle2, 
  AlertCircle, 
  Car, 
  Send,
  Crosshair,
  ArrowRight
} from 'lucide-react';
import BottomNavBar from '../../components/BottomNavBar';
import { 
  saveInquiryToMySQL, 
  loadAllInquiriesFromMySQL, 
  loadSettingsFromMySQL,
  saveCustomerToMySQL
} from '../../services/mysqlService';
import { 
  notifyAdmin, 
  registerPushNotifications, 
  syncNativeCustomerTrip 
} from '../../services/notificationEngine';

export const DEFAULT_SHORT_TRIP_PRICING = {
  sedan: {
    km10: 299,
    km20: 499,
    km30: 0,
    km40: 0,
    extraKmRate: 14
  },
  suv: {
    km10: 449,
    km20: 699,
    km30: 0,
    km40: 0,
    extraKmRate: 18
  }
};

export default function ShortTripScreen({ activeTab, setActiveTab }) {
  // Mode toggle: 'book' vs 'inquiry' matching the screenshot
  const [subTab, setSubTab] = useState('book');

  // Pricing configuration loaded from Admin / MySQL / LocalStorage
  const [pricing, setPricing] = useState(() => {
    try {
      const saved = localStorage.getItem('cabsy_short_trip_pricing');
      if (saved) return JSON.parse(saved);
    } catch (e) {}
    return DEFAULT_SHORT_TRIP_PRICING;
  });

  // Selected Booking Parameters
  const [selectedVehicle, setSelectedVehicle] = useState('sedan'); // 'sedan' | 'suv'
  const [selectedKm, setSelectedKm] = useState(20); // Default 20 km (matching screenshot)
  const [pickupLocation, setPickupLocation] = useState('Bhavnagar City (Current Location)');
  const [dropoffLocation, setDropoffLocation] = useState('Local Travel in Bhavnagar');
  const [scheduleTime, setScheduleTime] = useState('Instant (Reaching in 10-15 Mins)');
  const [notes, setNotes] = useState('');

  // Active Ride tracking state
  const [activeBooking, setActiveBooking] = useState(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [bookingSuccess, setBookingSuccess] = useState(false);

  // Sync pricing from MySQL settings on mount
  useEffect(() => {
    registerPushNotifications('customer').catch(() => {});

    loadSettingsFromMySQL().then(res => {
      if (res && res.short_trip_pricing) {
        try {
          const parsed = typeof res.short_trip_pricing === 'string' 
            ? JSON.parse(res.short_trip_pricing) 
            : res.short_trip_pricing;
          setPricing(parsed);
          localStorage.setItem('cabsy_short_trip_pricing', JSON.stringify(parsed));
        } catch (e) {}
      }
    }).catch(() => {});
  }, []);

  // Poll active short trip status for live arrival time, driver assignment, etc.
  useEffect(() => {
    const fetchActiveShortTrip = async () => {
      try {
        const userProf = JSON.parse(localStorage.getItem('cabsy_user_profile') || '{}');
        const userPhone = (userProf?.phone || localStorage.getItem('cabsy_user_phone') || '').replace(/\D/g, '');
        const userEmail = (userProf?.email || '').toLowerCase().trim();

        if (!userPhone && !userEmail) return;

        const inquiries = await loadAllInquiriesFromMySQL().catch(() => []);
        if (Array.isArray(inquiries)) {
          const match = inquiries.find(i => {
            if (!i || !(i.isShortTrip || i.tripType === 'Short Trip' || i.tripType === 'short-trip')) return false;
            const iPhone = (i.customerPhone || '').replace(/\D/g, '');
            const iEmail = (i.customerEmail || '').toLowerCase().trim();
            const phoneMatch = userPhone && iPhone && userPhone.slice(-10) === iPhone.slice(-10);
            const emailMatch = userEmail && iEmail && userEmail === iEmail;
            const activeStatus = ['Pending', 'Confirmed', 'In Progress', 'On Ride'].includes(i.status);
            return (phoneMatch || emailMatch) && activeStatus;
          });

          if (match) {
            setActiveBooking(match);
          } else {
            // Check localStorage fallback
            const localList = JSON.parse(localStorage.getItem('cabsy_inquiries') || '[]');
            const localMatch = localList.find(i => {
              if (!i || !(i.isShortTrip || i.tripType === 'Short Trip' || i.tripType === 'short-trip')) return false;
              const iPhone = (i.customerPhone || '').replace(/\D/g, '');
              const iEmail = (i.customerEmail || '').toLowerCase().trim();
              const phoneMatch = userPhone && iPhone && userPhone.slice(-10) === iPhone.slice(-10);
              const emailMatch = userEmail && iEmail && userEmail === iEmail;
              const activeStatus = ['Pending', 'Confirmed', 'In Progress', 'On Ride'].includes(i.status);
              return (phoneMatch || emailMatch) && activeStatus;
            });
            setActiveBooking(localMatch || null);
          }
        }
      } catch (e) {}
    };

    fetchActiveShortTrip();
    const interval = setInterval(fetchActiveShortTrip, 4000);
    return () => clearInterval(interval);
  }, []);

  // Determine available distance options based on admin set prices
  // Always 10 and 20 km. If admin adds 30 or 40 km price, show those as well.
  const currentVehiclePricing = pricing[selectedVehicle] || DEFAULT_SHORT_TRIP_PRICING[selectedVehicle];
  const availableKmOptions = [10, 20];
  if (currentVehiclePricing.km30 && Number(currentVehiclePricing.km30) > 0) availableKmOptions.push(30);
  if (currentVehiclePricing.km40 && Number(currentVehiclePricing.km40) > 0) availableKmOptions.push(40);

  useEffect(() => {
    if (!availableKmOptions.includes(selectedKm)) {
      setSelectedKm(availableKmOptions[0] || 10);
    }
  }, [availableKmOptions, selectedKm]);

  // Current calculated fare
  const currentFare = (() => {
    if (selectedKm === 10) return currentVehiclePricing.km10 || 299;
    if (selectedKm === 20) return currentVehiclePricing.km20 || 499;
    if (selectedKm === 30) return currentVehiclePricing.km30 || 699;
    if (selectedKm === 40) return currentVehiclePricing.km40 || 899;
    return currentVehiclePricing.km20 || 499;
  })();

  const extraKmRate = currentVehiclePricing.extraKmRate || (selectedVehicle === 'suv' ? 18 : 14);

  // Use Current Location helper
  const handleUseCurrentLocation = () => {
    setPickupLocation('Current Location (Bhavnagar)');
  };

  // Handle Booking Submission
  const handleBookNow = async () => {
    setIsSubmitting(true);
    try {
      const userProf = JSON.parse(localStorage.getItem('cabsy_user_profile') || '{}');
      const savedPhone = localStorage.getItem('cabsy_user_phone') || '+91 98250 99887';
      const cPhone = userProf?.phone || savedPhone;
      const cEmail = userProf?.email || 'customer@emperialcabs.com';
      const cName = userProf?.name || 'Valued Rider';

      const shortTripId = 'ST-' + Date.now().toString().slice(-6);

      const newInquiry = {
        id: shortTripId,
        customerName: cName,
        customerPhone: cPhone,
        customerEmail: cEmail,
        pickup: pickupLocation,
        dropoff: dropoffLocation || `Local Bhavnagar (${selectedKm} KM Short Trip)`,
        vehicle: selectedVehicle === 'suv' ? 'SUV (6-7 Seater)' : 'Sedan (4 Seater)',
        vehicleType: selectedVehicle,
        selectedKm: selectedKm,
        isShortTrip: true,
        tripType: 'Short Trip',
        fare: currentFare,
        originalFare: currentFare,
        extraKmRate: extraKmRate,
        scheduledDate: 'Today',
        scheduledTime: scheduleTime,
        driver: 'Unassigned',
        driverPhone: '',
        plate: '',
        status: 'Pending',
        arrivalTime: '',
        notes: `Short Trip around ${selectedKm} km in Bhavnagar. Extra km rate: ₹${extraKmRate}/km. ${notes}`.trim(),
        timestamp: new Date().toISOString(),
        date: new Date().toISOString().split('T')[0]
      };

      // 1. Save locally
      try {
        const existing = JSON.parse(localStorage.getItem('cabsy_inquiries') || '[]');
        localStorage.setItem('cabsy_inquiries', JSON.stringify([newInquiry, ...existing]));
      } catch (e) {}

      // 2. Save directly to Hostinger MySQL
      await saveInquiryToMySQL(newInquiry).catch(() => {});
      saveCustomerToMySQL(userProf).catch(() => {});

      // 3. Register push & background alarm sync for closed-app delivery
      registerPushNotifications('customer', cPhone, cEmail).catch(() => {});
      syncNativeCustomerTrip(shortTripId, cPhone).catch(() => {});

      // 4. Notify Admin
      notifyAdmin({
        type: 'short_trip',
        title: `New Short Trip Booking #${shortTripId} (${selectedKm} KM)`,
        body: `Customer ${cName} (${cPhone}) booked a ${selectedVehicle.toUpperCase()} for ${selectedKm} km in Bhavnagar. Fare: ₹${currentFare}`,
        extraData: { inquiryId: shortTripId, isShortTrip: true }
      });

      // 5. Update local state
      setActiveBooking(newInquiry);
      setBookingSuccess(true);
      window.dispatchEvent(new Event('storage'));
      window.dispatchEvent(new CustomEvent('EMPERIAL CABS_ride_booked', { detail: newInquiry }));
    } catch (err) {
      console.error('Short trip booking failed:', err);
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div 
      className="short-trip-screen"
      style={{
        width: '100%',
        minHeight: '100dvh',
        backgroundColor: '#FFFFFF',
        display: 'flex',
        flexDirection: 'column',
        boxSizing: 'border-box',
        paddingBottom: '96px',
        overflowY: 'auto',
        fontFamily: "'Inter', -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif"
      }}
    >
      {/* TOP HEADER MATCHING SCREENSHOT */}
      <div 
        style={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          padding: '14px 18px',
          borderBottom: '1px solid #F1F5F9',
          backgroundColor: '#FFFFFF',
          position: 'sticky',
          top: 0,
          zIndex: 50
        }}
      >
        <button
          type="button"
          onClick={() => {
            if (setActiveTab) setActiveTab('home');
          }}
          style={{
            background: 'none',
            border: 'none',
            padding: '6px',
            cursor: 'pointer',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            color: '#0F172A',
            borderRadius: '50%'
          }}
          aria-label="Go Back to Home"
        >
          <ArrowLeft size={22} strokeWidth={2.4} />
        </button>

        <div style={{ textAlign: 'center' }}>
          <h1 style={{ margin: 0, fontSize: '18px', fontWeight: 800, color: '#0F172A', letterSpacing: '-0.01em' }}>
            Short Trip
          </h1>
          <p style={{ margin: '1px 0 0', fontSize: '12px', color: '#64748B', fontWeight: 500 }}>
            Book a cab for around {selectedKm} km
          </p>
        </div>

        <div style={{ width: '34px' }} />
      </div>

      {/* SEGMENTED CONTROL: BOOK A CAB vs SEND INQUIRY */}
      <div style={{ padding: '12px 18px 6px' }}>
        <div 
          style={{
            display: 'grid',
            gridTemplateColumns: '1fr 1fr',
            backgroundColor: '#F8FAFC',
            borderRadius: '16px',
            padding: '4px',
            border: '1px solid #E2E8F0'
          }}
        >
          <button
            type="button"
            onClick={() => setSubTab('book')}
            style={{
              padding: '10px 14px',
              borderRadius: '12px',
              border: 'none',
              backgroundColor: subTab === 'book' ? '#FEE2E2' : 'transparent',
              color: subTab === 'book' ? '#DC2626' : '#64748B',
              fontSize: '14px',
              fontWeight: 800,
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              gap: '8px',
              cursor: 'pointer',
              transition: 'all 0.18s ease'
            }}
          >
            <Car size={16} strokeWidth={2.4} />
            <span>Book a Cab</span>
          </button>

          <button
            type="button"
            onClick={() => setSubTab('inquiry')}
            style={{
              padding: '10px 14px',
              borderRadius: '12px',
              border: 'none',
              backgroundColor: subTab === 'inquiry' ? '#FEE2E2' : 'transparent',
              color: subTab === 'inquiry' ? '#DC2626' : '#64748B',
              fontSize: '14px',
              fontWeight: 800,
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              gap: '8px',
              cursor: 'pointer',
              transition: 'all 0.18s ease'
            }}
          >
            <Send size={15} strokeWidth={2.4} />
            <span>Send Inquiry</span>
          </button>
        </div>
      </div>

      {/* LIVE ACTIVE RIDE CARD (When a short trip is pending or confirmed) */}
      {activeBooking && (
        <div style={{ margin: '10px 18px 4px' }}>
          <div 
            style={{
              borderRadius: '20px',
              border: activeBooking.status === 'Confirmed' ? '1.5px solid #10B981' : '1.5px solid #F59E0B',
              backgroundColor: '#FFFFFF',
              boxShadow: '0 8px 24px rgba(0,0,0,0.06)',
              overflow: 'hidden'
            }}
          >
            {/* Header Status Bar */}
            <div 
              style={{
                backgroundColor: activeBooking.status === 'Confirmed' ? '#ECFDF5' : '#FFFBEB',
                padding: '10px 14px',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'space-between',
                borderBottom: '1px solid rgba(0,0,0,0.05)'
              }}
            >
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                <div 
                  style={{
                    width: '9px',
                    height: '9px',
                    borderRadius: '50%',
                    backgroundColor: activeBooking.status === 'Confirmed' ? '#10B981' : '#F59E0B'
                  }} 
                />
                <span style={{ fontSize: '12px', fontWeight: 800, color: activeBooking.status === 'Confirmed' ? '#047857' : '#B45309' }}>
                  {activeBooking.status === 'Confirmed' ? 'CAB DISPATCHED & ON THE WAY' : 'SEARCHING NEAREST DRIVER...'}
                </span>
              </div>
              <span style={{ fontSize: '11px', fontWeight: 700, color: '#64748B' }}>
                #{activeBooking.id}
              </span>
            </div>

            {/* Content Body */}
            <div style={{ padding: '14px' }}>
              {activeBooking.status === 'Confirmed' ? (
                <div>
                  {/* Big Live Cab Arrival Banner */}
                  <div 
                    style={{
                      backgroundColor: '#10B981',
                      color: '#FFFFFF',
                      padding: '12px 14px',
                      borderRadius: '14px',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'space-between',
                      marginBottom: '12px',
                      boxShadow: '0 4px 14px rgba(16, 185, 129, 0.25)'
                    }}
                  >
                    <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                      <Clock size={22} strokeWidth={2.4} />
                      <div>
                        <div style={{ fontSize: '10px', textTransform: 'uppercase', letterSpacing: '0.05em', opacity: 0.9, fontWeight: 700 }}>
                          Cab Pickup Arrival
                        </div>
                        <div style={{ fontSize: '18px', fontWeight: 800 }}>
                          {activeBooking.arrivalTime ? `Reaching in ${activeBooking.arrivalTime}` : 'Arriving Shortly'}
                        </div>
                      </div>
                    </div>
                    <span style={{ fontSize: '11px', backgroundColor: 'rgba(255,255,255,0.25)', padding: '3px 8px', borderRadius: '999px', fontWeight: 800 }}>
                      Live
                    </span>
                  </div>

                  {/* Driver & Car Details */}
                  <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '8px', marginBottom: '10px' }}>
                    <div style={{ backgroundColor: '#F8FAFC', padding: '10px 12px', borderRadius: '12px', border: '1px solid #E2E8F0' }}>
                      <div style={{ fontSize: '10px', color: '#64748B', fontWeight: 700, textTransform: 'uppercase' }}>CHAUFFEUR</div>
                      <div style={{ fontSize: '14px', fontWeight: 800, color: '#0F172A', marginTop: '2px' }}>{activeBooking.driver || 'Assigned Driver'}</div>
                      {activeBooking.driverPhone && (
                        <a 
                          href={`tel:${activeBooking.driverPhone}`}
                          style={{ display: 'inline-flex', alignItems: 'center', gap: '4px', marginTop: '4px', fontSize: '12px', fontWeight: 700, color: '#2563EB', textDecoration: 'none' }}
                        >
                          <Phone size={11} />
                          <span>{activeBooking.driverPhone}</span>
                        </a>
                      )}
                    </div>

                    <div style={{ backgroundColor: '#F8FAFC', padding: '10px 12px', borderRadius: '12px', border: '1px solid #E2E8F0' }}>
                      <div style={{ fontSize: '10px', color: '#64748B', fontWeight: 700, textTransform: 'uppercase' }}>CAR NUMBER</div>
                      <div style={{ fontSize: '14px', fontWeight: 800, color: '#0F172A', marginTop: '2px' }}>{activeBooking.plate || 'GJ-04-AB-1234'}</div>
                      <div style={{ fontSize: '11px', fontWeight: 600, color: '#64748B', marginTop: '2px' }}>{activeBooking.vehicle}</div>
                    </div>
                  </div>

                  <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', paddingTop: '8px', borderTop: '1px solid #F1F5F9', fontSize: '12px' }}>
                    <span style={{ color: '#64748B' }}>Fixed Fare ({activeBooking.selectedKm || 20} KM):</span>
                    <span style={{ fontSize: '15px', fontWeight: 800, color: '#C53030' }}>₹{activeBooking.fare}</span>
                  </div>
                </div>
              ) : (
                <div>
                  <p style={{ margin: '0 0 6px', fontSize: '13px', color: '#334155', fontWeight: 600 }}>
                    Booking submitted for <strong>{activeBooking.selectedKm || 20} KM ({activeBooking.vehicle})</strong>. Admin is dispatching the nearest cab now.
                  </p>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '6px', fontSize: '11px', color: '#64748B' }}>
                    <Clock size={13} />
                    <span>You will receive an instant push notification with driver details & pickup time.</span>
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      {/* PINK PROMO HEADER CARD — MATCHING SCREENSHOT */}
      <div style={{ padding: '10px 18px 12px' }}>
        <div 
          style={{
            backgroundColor: '#FFF1F2',
            borderRadius: '20px',
            padding: '16px',
            display: 'flex',
            alignItems: 'center',
            gap: '14px',
            border: '1px solid #FFE4E6'
          }}
        >
          <div 
            style={{
              width: '46px',
              height: '46px',
              borderRadius: '50%',
              backgroundColor: '#FFE4E6',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              color: '#DC2626',
              flexShrink: 0
            }}
          >
            <MapPin size={24} strokeWidth={2.4} />
          </div>

          <div>
            <div style={{ fontSize: '11px', fontWeight: 800, color: '#DC2626', letterSpacing: '0.04em', textTransform: 'uppercase' }}>
              SHORT TRIP
            </div>
            <div style={{ fontSize: '18px', fontWeight: 800, color: '#0F172A', marginTop: '1px' }}>
              For around {selectedKm} km
            </div>
            <div style={{ fontSize: '12px', color: '#64748B', marginTop: '2px', fontWeight: 500 }}>
              Quick, Easy and Comfortable
            </div>
          </div>
        </div>
      </div>

      {/* PICKUP & DROPOFF FORM CARD */}
      <div style={{ padding: '0 18px 12px' }}>
        <div 
          style={{
            backgroundColor: '#FFFFFF',
            borderRadius: '20px',
            border: '1px solid #E2E8F0',
            padding: '16px',
            position: 'relative'
          }}
        >
          {/* Pickup Location Row */}
          <div style={{ marginBottom: '14px' }}>
            <label style={{ display: 'block', fontSize: '12px', fontWeight: 700, color: '#475569', marginBottom: '6px' }}>
              Pickup Location
            </label>
            <div style={{ display: 'flex', gap: '8px' }}>
              <div 
                style={{
                  flex: 1,
                  display: 'flex',
                  alignItems: 'center',
                  gap: '8px',
                  backgroundColor: '#F8FAFC',
                  border: '1px solid #CBD5E1',
                  borderRadius: '12px',
                  padding: '10px 12px'
                }}
              >
                <MapPin size={16} color="#DC2626" style={{ flexShrink: 0 }} />
                <input
                  type="text"
                  value={pickupLocation}
                  onChange={(e) => setPickupLocation(e.target.value)}
                  placeholder="Select pickup location"
                  style={{
                    width: '100%',
                    border: 'none',
                    background: 'transparent',
                    fontSize: '13px',
                    fontWeight: 600,
                    color: '#0F172A',
                    outline: 'none'
                  }}
                />
              </div>

              {/* Use Current Button */}
              <button
                type="button"
                onClick={handleUseCurrentLocation}
                style={{
                  backgroundColor: '#FEE2E2',
                  border: '1px solid #FECACA',
                  borderRadius: '12px',
                  padding: '8px 12px',
                  display: 'flex',
                  flexDirection: 'column',
                  alignItems: 'center',
                  justifyContent: 'center',
                  cursor: 'pointer',
                  flexShrink: 0
                }}
              >
                <Navigation size={13} color="#DC2626" fill="#DC2626" />
                <span style={{ fontSize: '10px', fontWeight: 800, color: '#DC2626', marginTop: '2px', whiteSpace: 'nowrap' }}>
                  Use Current
                </span>
              </button>
            </div>
          </div>

          {/* Drop-off Location Row */}
          <div>
            <label style={{ display: 'block', fontSize: '12px', fontWeight: 700, color: '#475569', marginBottom: '6px' }}>
              Drop-off Location
            </label>
            <div 
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: '8px',
                backgroundColor: '#F8FAFC',
                border: '1px solid #CBD5E1',
                borderRadius: '12px',
                padding: '10px 12px'
              }}
            >
              <MapPin size={16} color="#64748B" style={{ flexShrink: 0 }} />
              <input
                type="text"
                value={dropoffLocation}
                onChange={(e) => setDropoffLocation(e.target.value)}
                placeholder="Select drop-off location"
                style={{
                  width: '100%',
                  border: 'none',
                  background: 'transparent',
                  fontSize: '13px',
                  fontWeight: 600,
                  color: '#0F172A',
                  outline: 'none'
                }}
              />
            </div>
          </div>
        </div>
      </div>

      {/* TWO SELECTION COLUMNS: DISTANCE & TIMING */}
      <div style={{ padding: '0 18px 14px' }}>
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '10px' }}>
          {/* Trip Distance Selector */}
          <div>
            <label style={{ display: 'block', fontSize: '11px', fontWeight: 700, color: '#475569', marginBottom: '6px' }}>
              Trip Distance (Approx.)
            </label>
            <div 
              style={{
                display: 'flex',
                flexDirection: 'column',
                gap: '6px'
              }}
            >
              <div style={{ display: 'flex', gap: '6px', flexWrap: 'wrap' }}>
                {availableKmOptions.map((km) => (
                  <button
                    key={km}
                    type="button"
                    onClick={() => setSelectedKm(km)}
                    style={{
                      flex: 1,
                      padding: '10px 8px',
                      borderRadius: '12px',
                      border: selectedKm === km ? '2px solid #DC2626' : '1px solid #CBD5E1',
                      backgroundColor: selectedKm === km ? '#FEE2E2' : '#F8FAFC',
                      color: selectedKm === km ? '#DC2626' : '#0F172A',
                      fontSize: '13px',
                      fontWeight: 800,
                      cursor: 'pointer',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      gap: '4px',
                      transition: 'all 0.15s ease'
                    }}
                  >
                    <span>~ {km} km</span>
                  </button>
                ))}
              </div>
            </div>
          </div>

          {/* When do you need a cab? */}
          <div>
            <label style={{ display: 'block', fontSize: '11px', fontWeight: 700, color: '#475569', marginBottom: '6px' }}>
              When do you need a cab?
            </label>
            <div 
              style={{
                padding: '10px 10px',
                borderRadius: '12px',
                border: '1px solid #CBD5E1',
                backgroundColor: '#F8FAFC',
                display: 'flex',
                alignItems: 'center',
                gap: '6px'
              }}
            >
              <Calendar size={15} color="#64748B" style={{ flexShrink: 0 }} />
              <select
                value={scheduleTime}
                onChange={(e) => setScheduleTime(e.target.value)}
                style={{
                  border: 'none',
                  background: 'transparent',
                  fontSize: '12px',
                  fontWeight: 700,
                  color: '#0F172A',
                  outline: 'none',
                  width: '100%',
                  cursor: 'pointer'
                }}
              >
                <option value="Instant (Reaching in 10-15 Mins)">Instant Pickup</option>
                <option value="Within 30 Mins">Within 30 Mins</option>
                <option value="Later Today">Later Today</option>
              </select>
            </div>
          </div>
        </div>
      </div>

      {/* MAP ILLUSTRATION OF BHAVNAGAR MATCHING SCREENSHOT */}
      <div style={{ padding: '0 18px 14px' }}>
        <div 
          style={{
            position: 'relative',
            borderRadius: '20px',
            overflow: 'hidden',
            border: '1px solid #E2E8F0',
            boxShadow: '0 2px 10px rgba(0,0,0,0.03)'
          }}
        >
          <img 
            src="/short-trip-map.png" 
            alt="Bhavnagar Short Trip Route Map"
            style={{
              width: '100%',
              height: 'auto',
              maxHeight: '180px',
              objectFit: 'cover',
              display: 'block'
            }}
          />
          {/* Target GPS Button in Bottom Right */}
          <button
            type="button"
            onClick={handleUseCurrentLocation}
            aria-label="Target Current GPS Location"
            style={{
              position: 'absolute',
              bottom: '12px',
              right: '12px',
              width: '38px',
              height: '38px',
              borderRadius: '50%',
              backgroundColor: '#FFFFFF',
              border: '1px solid #E2E8F0',
              boxShadow: '0 4px 12px rgba(0,0,0,0.15)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              cursor: 'pointer',
              color: '#0F172A'
            }}
          >
            <Crosshair size={18} strokeWidth={2.4} />
          </button>
        </div>
      </div>

      {/* SELECT CAB TYPE (SEDAN AND SUV ONLY PER SPECIFICATION) */}
      <div style={{ padding: '0 18px 14px' }}>
        <h3 style={{ margin: '0 0 10px', fontSize: '15px', fontWeight: 800, color: '#0F172A' }}>
          Select Cab Type
        </h3>

        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px' }}>
          {/* 1. SEDAN CARD */}
          <div
            onClick={() => setSelectedVehicle('sedan')}
            style={{
              position: 'relative',
              backgroundColor: '#FFFFFF',
              borderRadius: '18px',
              border: selectedVehicle === 'sedan' ? '2px solid #DC2626' : '1.5px solid #E2E8F0',
              padding: '12px 10px',
              display: 'flex',
              flexDirection: 'column',
              alignItems: 'center',
              cursor: 'pointer',
              boxShadow: selectedVehicle === 'sedan' ? '0 4px 14px rgba(220, 38, 38, 0.12)' : '0 1px 3px rgba(0,0,0,0.02)',
              transition: 'all 0.18s ease'
            }}
          >
            {/* Active Checkmark Pill */}
            {selectedVehicle === 'sedan' && (
              <div 
                style={{
                  position: 'absolute',
                  top: '8px',
                  right: '8px',
                  width: '20px',
                  height: '20px',
                  borderRadius: '50%',
                  backgroundColor: '#DC2626',
                  color: '#FFFFFF',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  fontSize: '11px'
                }}
              >
                ✓
              </div>
            )}

            <img 
              src="/short-trip-sedan.png" 
              alt="Sedan (4 Seats)"
              style={{
                width: '100%',
                maxHeight: '62px',
                objectFit: 'contain',
                margin: '4px 0 8px'
              }}
            />

            <div style={{ fontSize: '14px', fontWeight: 800, color: '#0F172A' }}>
              Sedan
            </div>
            <div style={{ fontSize: '11px', color: '#64748B', fontWeight: 600 }}>
              4 Seats
            </div>
            <div style={{ fontSize: '13px', fontWeight: 800, color: '#DC2626', marginTop: '4px' }}>
              ₹{selectedKm === 10 ? (pricing.sedan?.km10 || 299) : (pricing.sedan?.km20 || 499)}
            </div>
          </div>

          {/* 2. SUV CARD */}
          <div
            onClick={() => setSelectedVehicle('suv')}
            style={{
              position: 'relative',
              backgroundColor: '#FFFFFF',
              borderRadius: '18px',
              border: selectedVehicle === 'suv' ? '2px solid #DC2626' : '1.5px solid #E2E8F0',
              padding: '12px 10px',
              display: 'flex',
              flexDirection: 'column',
              alignItems: 'center',
              cursor: 'pointer',
              boxShadow: selectedVehicle === 'suv' ? '0 4px 14px rgba(220, 38, 38, 0.12)' : '0 1px 3px rgba(0,0,0,0.02)',
              transition: 'all 0.18s ease'
            }}
          >
            {/* Active Checkmark Pill */}
            {selectedVehicle === 'suv' && (
              <div 
                style={{
                  position: 'absolute',
                  top: '8px',
                  right: '8px',
                  width: '20px',
                  height: '20px',
                  borderRadius: '50%',
                  backgroundColor: '#DC2626',
                  color: '#FFFFFF',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  fontSize: '11px'
                }}
              >
                ✓
              </div>
            )}

            <img 
              src="/short-trip-suv.png" 
              alt="SUV (6-7 Seats)"
              style={{
                width: '100%',
                maxHeight: '62px',
                objectFit: 'contain',
                margin: '4px 0 8px'
              }}
            />

            <div style={{ fontSize: '14px', fontWeight: 800, color: '#0F172A' }}>
              SUV
            </div>
            <div style={{ fontSize: '11px', color: '#64748B', fontWeight: 600 }}>
              6–7 Seats
            </div>
            <div style={{ fontSize: '13px', fontWeight: 800, color: '#DC2626', marginTop: '4px' }}>
              ₹{selectedKm === 10 ? (pricing.suv?.km10 || 449) : (pricing.suv?.km20 || 699)}
            </div>
          </div>
        </div>
      </div>

      {/* CRITICAL NOTE: EXTRA KM CHARGE POLICY (AS SPECIFIED BY USER) */}
      <div style={{ padding: '0 18px 16px' }}>
        <div 
          style={{
            backgroundColor: '#FFFBEB',
            border: '1.5px solid #FDE68A',
            borderRadius: '14px',
            padding: '11px 14px',
            display: 'flex',
            alignItems: 'flex-start',
            gap: '8px'
          }}
        >
          <AlertCircle size={17} color="#D97706" style={{ flexShrink: 0, marginTop: '2px' }} />
          <div>
            <span style={{ fontSize: '12px', fontWeight: 800, color: '#92400E' }}>
              Important Distance Policy:
            </span>
            <p style={{ margin: '2px 0 0', fontSize: '12px', color: '#78350F', lineHeight: 1.45, fontWeight: 500 }}>
              This fixed package covers up to <strong>{selectedKm} KM</strong>. If your ride exceeds {selectedKm} km, extra distance will be charged at <strong>₹{extraKmRate}/km</strong> for {selectedVehicle === 'suv' ? 'SUV' : 'Sedan'}.
            </p>
          </div>
        </div>
      </div>

      {/* BIG PROMINENT "BOOK NOW →" BUTTON MATCHING SCREENSHOT */}
      <div style={{ padding: '0 18px 18px' }}>
        <button
          type="button"
          onClick={handleBookNow}
          disabled={isSubmitting}
          style={{
            width: '100%',
            padding: '16px 24px',
            borderRadius: '999px',
            border: 'none',
            backgroundColor: '#C53030',
            color: '#FFFFFF',
            fontSize: '17px',
            fontWeight: 800,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            gap: '10px',
            boxShadow: '0 8px 24px rgba(197, 48, 48, 0.38)',
            cursor: isSubmitting ? 'not-allowed' : 'pointer',
            transition: 'all 0.18s ease'
          }}
        >
          {isSubmitting ? (
            <span>Booking Cab...</span>
          ) : (
            <>
              <span>Book Now (₹{currentFare})</span>
              <ArrowRight size={20} strokeWidth={2.6} />
            </>
          )}
        </button>
      </div>

      {/* Persistent Bottom App Navigation Bar */}
      <BottomNavBar activeTab={activeTab} setActiveTab={setActiveTab} />
    </div>
  );
}
