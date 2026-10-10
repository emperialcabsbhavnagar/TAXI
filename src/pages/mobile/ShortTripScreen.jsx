import React, { useState, useEffect } from 'react';
import { 
  ArrowLeft, 
  MapPin, 
  Navigation, 
  Calendar, 
  Clock, 
  CheckCircle2, 
  AlertCircle, 
  ArrowRight,
  Loader2,
  Crosshair,
  Car,
  ShieldCheck
} from 'lucide-react';
import BottomNavBar from '../../components/BottomNavBar';
import InteractiveMap from '../../components/InteractiveMap';
import { 
  saveInquiryToMySQL, 
  loadSettingsFromMySQL,
  saveCustomerToMySQL
} from '../../services/mysqlService';
import { 
  notifyAdmin, 
  registerPushNotifications, 
  syncNativeCustomerTrip 
} from '../../services/notificationEngine';
import { 
  getBestLiveLocation, 
  reverseGeocodeCoords 
} from '../../services/liveLocationService';

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
  const [selectedKm, setSelectedKm] = useState(20); // Default 20 km
  const [pickupLocation, setPickupLocation] = useState('Fetching live pickup location...');
  const [dropoffLocation, setDropoffLocation] = useState('Local Travel in Bhavnagar');
  const [scheduleTime, setScheduleTime] = useState('Instant (Reaching in 10-15 Mins)');
  const [notes, setNotes] = useState('');

  // Live GPS Coordinates for Pickup & Map
  const [pickupCoords, setPickupCoords] = useState({ lat: 21.7645, lng: 72.1519 });
  const [googleMapsLink, setGoogleMapsLink] = useState('https://www.google.com/maps?q=21.7645,72.1519');
  const [isLocating, setIsLocating] = useState(false);

  // Booking Confirmation State & Transition
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [confirmedBooking, setConfirmedBooking] = useState(null);
  const [showConfirmModal, setShowConfirmModal] = useState(false);

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

  // Fetch Live Current Location & Full Detailed Street Address
  const handleUseCurrentLocation = async () => {
    setIsLocating(true);
    try {
      const loc = await getBestLiveLocation();
      if (loc && typeof loc.lat === 'number' && typeof loc.lng === 'number') {
        const fullAddr = await reverseGeocodeCoords(loc.lat, loc.lng);
        setPickupCoords({ lat: loc.lat, lng: loc.lng });
        setPickupLocation(fullAddr || `Current Location (${loc.lat.toFixed(4)}, ${loc.lng.toFixed(4)})`);
        setGoogleMapsLink(`https://www.google.com/maps/search/?api=1&query=${loc.lat},${loc.lng}`);
      } else {
        setPickupLocation('Waghawadi Road, Vidhyanagar, Bhavnagar - 364002');
      }
    } catch (err) {
      console.warn('Location detection failed:', err);
      setPickupLocation('Bhavnagar City Center, Gujarat');
    } finally {
      setIsLocating(false);
    }
  };

  // Auto-detect location once on mount
  useEffect(() => {
    handleUseCurrentLocation();
  }, []);

  // Determine available distance options based on admin set prices
  // Always 10 and 20 km. If admin adds positive price for 30 or 40 km, show those as well.
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

  // Calculate destination & road route for Google Maps interactive map
  const calculateMapRoute = () => {
    const lat1 = pickupCoords?.lat || 21.7645;
    const lng1 = pickupCoords?.lng || 72.1519;

    const latDelta = selectedKm === 10 ? 0.045 : 0.082;
    const lngDelta = selectedKm === 10 ? -0.035 : -0.065;

    const dest = {
      lat: lat1 + latDelta,
      lng: lng1 + lngDelta,
      label: `${selectedKm} KM Dropoff`
    };

    const mid1 = { lat: lat1 + (dest.lat - lat1) * 0.32 + 0.004, lng: lng1 + (dest.lng - lng1) * 0.28 };
    const mid2 = { lat: lat1 + (dest.lat - lat1) * 0.65 - 0.003, lng: lng1 + (dest.lng - lng1) * 0.68 + 0.002 };
    const mid3 = { lat: lat1 + (dest.lat - lat1) * 0.88, lng: lng1 + (dest.lng - lng1) * 0.92 };

    return {
      dest,
      polyline: [
        { lat: lat1, lng: lng1 },
        mid1,
        mid2,
        mid3,
        { lat: dest.lat, lng: dest.lng }
      ]
    };
  };

  const { dest: mapDest, polyline: mapPolyline } = calculateMapRoute();
  const estTimeMin = selectedKm === 10 ? 16 : (selectedKm === 20 ? 28 : Math.round(selectedKm * 1.4));

  // Handle Booking Submission -> Shows confirmation screen & shifts to Rides
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
        pickupLat: pickupCoords.lat,
        pickupLng: pickupCoords.lng,
        googleMapsLink: googleMapsLink,
        pickupGoogleMapsLink: googleMapsLink,
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
        notes: `Short Trip around ${selectedKm} km in Bhavnagar. Extra km rate: ₹${extraKmRate}/km. Maps: ${googleMapsLink}. ${notes}`.trim(),
        timestamp: new Date().toISOString(),
        date: new Date().toISOString().split('T')[0]
      };

      // 1. Save locally
      try {
        const existing = JSON.parse(localStorage.getItem('cabsy_inquiries') || '[]');
        localStorage.setItem('cabsy_inquiries', JSON.stringify([newInquiry, ...existing]));
      } catch (e) {}

      // 2. Save to MySQL
      await saveInquiryToMySQL(newInquiry).catch(() => {});
      saveCustomerToMySQL(userProf).catch(() => {});

      // 3. Register push & background alarm sync for closed-app delivery
      registerPushNotifications('customer', cPhone, cEmail).catch(() => {});
      syncNativeCustomerTrip(shortTripId, cPhone).catch(() => {});

      // 4. Notify Admin
      notifyAdmin({
        type: 'short_trip',
        title: `New Short Trip Booking #${shortTripId} (${selectedKm} KM)`,
        body: `Customer ${cName} (${cPhone}) booked a ${selectedVehicle.toUpperCase()} for ${selectedKm} km at ${pickupLocation}. Fare: ₹${currentFare}`,
        extraData: { 
          inquiryId: shortTripId, 
          isShortTrip: true,
          pickupLat: pickupCoords.lat,
          pickupLng: pickupCoords.lng,
          googleMapsLink: googleMapsLink
        }
      });

      // 5. Broadcast updates
      window.dispatchEvent(new Event('storage'));
      window.dispatchEvent(new CustomEvent('EMPERIAL CABS_ride_booked', { detail: newInquiry }));

      // 6. Show Confirmation Screen and automatically shift to Rides tab
      setConfirmedBooking(newInquiry);
      setShowConfirmModal(true);

      setTimeout(() => {
        setShowConfirmModal(false);
        if (setActiveTab) setActiveTab('rides');
      }, 1800);
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
        backgroundColor: '#F8FAFC',
        color: '#0F172A',
        display: 'flex',
        flexDirection: 'column',
        boxSizing: 'border-box',
        paddingBottom: '96px',
        overflowY: 'auto',
        fontFamily: "'Inter', -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif"
      }}
    >
      {/* TOP HEADER */}
      <div 
        style={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          padding: '14px 18px',
          borderBottom: '1px solid #E2E8F0',
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
            background: '#F1F5F9',
            border: 'none',
            padding: '8px',
            cursor: 'pointer',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            color: '#0F172A',
            borderRadius: '50%',
            transition: 'background-color 0.15s ease'
          }}
          aria-label="Go Back to Home"
        >
          <ArrowLeft size={20} strokeWidth={2.4} />
        </button>

        <div style={{ textAlign: 'center' }}>
          <h1 style={{ margin: 0, fontSize: '18px', fontWeight: 800, color: '#0F172A', letterSpacing: '-0.02em' }}>
            Instant Short Trip
          </h1>
          <p style={{ margin: '1px 0 0', fontSize: '12px', color: '#64748B', fontWeight: 600 }}>
            Around {selectedKm} km in Bhavnagar
          </p>
        </div>

        <div style={{ width: '36px' }} />
      </div>

      {/* TOP PROMO CARD (BOX BG: WHITE, BRAND ACCENT) */}
      <div style={{ padding: '12px 18px 10px' }}>
        <div 
          style={{
            backgroundColor: '#FFFFFF',
            borderRadius: '20px',
            padding: '16px 18px',
            display: 'flex',
            alignItems: 'center',
            gap: '14px',
            border: '1.5px solid #E2E8F0',
            boxShadow: '0 4px 16px rgba(0, 0, 0, 0.04)'
          }}
        >
          <div 
            style={{
              width: '46px',
              height: '46px',
              borderRadius: '50%',
              backgroundColor: '#FEE2E2',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              color: '#C53030',
              flexShrink: 0
            }}
          >
            <MapPin size={24} strokeWidth={2.4} />
          </div>

          <div>
            <div style={{ fontSize: '11px', fontWeight: 800, letterSpacing: '0.06em', color: '#C53030', textTransform: 'uppercase' }}>
              SHORT TRIP PACKAGE
            </div>
            <div style={{ fontSize: '18px', fontWeight: 800, marginTop: '1px', color: '#0F172A', letterSpacing: '-0.01em' }}>
              For around {selectedKm} km
            </div>
            <div style={{ fontSize: '12px', color: '#64748B', marginTop: '2px', fontWeight: 500 }}>
              Quick, Easy and Comfortable • Bhavnagar Local
            </div>
          </div>
        </div>
      </div>

      {/* PICKUP & DROPOFF FORM BOX (BOX BG: WHITE) */}
      <div style={{ padding: '0 18px 12px' }}>
        <div 
          style={{
            backgroundColor: '#FFFFFF',
            borderRadius: '20px',
            border: '1.5px solid #E2E8F0',
            padding: '16px',
            boxShadow: '0 4px 16px rgba(0, 0, 0, 0.04)'
          }}
        >
          {/* Pickup Location Row (Label: "Pickup Location", No Coordinates) */}
          <div style={{ marginBottom: '14px' }}>
            <label style={{ display: 'block', fontSize: '12px', fontWeight: 800, color: '#0F172A', textTransform: 'uppercase', letterSpacing: '0.02em', marginBottom: '6px' }}>
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
                  border: '1.5px solid #CBD5E1',
                  borderRadius: '12px',
                  padding: '10px 12px'
                }}
              >
                <MapPin size={16} color="#C53030" style={{ flexShrink: 0 }} />
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
                    fontWeight: 700,
                    color: '#0F172A',
                    outline: 'none'
                  }}
                />
              </div>

              {/* Use Current Location Button */}
              <button
                type="button"
                onClick={handleUseCurrentLocation}
                disabled={isLocating}
                style={{
                  backgroundColor: '#FEE2E2',
                  color: '#C53030',
                  border: '1px solid #FECACA',
                  borderRadius: '12px',
                  padding: '8px 12px',
                  display: 'flex',
                  flexDirection: 'column',
                  alignItems: 'center',
                  justifyContent: 'center',
                  cursor: isLocating ? 'wait' : 'pointer',
                  flexShrink: 0,
                  boxShadow: '0 2px 6px rgba(197, 48, 48, 0.12)',
                  minWidth: '82px',
                  transition: 'all 0.15s ease'
                }}
              >
                {isLocating ? (
                  <>
                    <Loader2 size={13} style={{ animation: 'spin 1s linear infinite' }} />
                    <span style={{ fontSize: '10px', fontWeight: 800, marginTop: '2px', whiteSpace: 'nowrap' }}>
                      Locating...
                    </span>
                  </>
                ) : (
                  <>
                    <Navigation size={13} fill="#C53030" />
                    <span style={{ fontSize: '10px', fontWeight: 800, marginTop: '2px', whiteSpace: 'nowrap' }}>
                      Use Current
                    </span>
                  </>
                )}
              </button>
            </div>
          </div>

          {/* Drop-off Destination Row */}
          <div>
            <label style={{ display: 'block', fontSize: '12px', fontWeight: 800, color: '#0F172A', marginBottom: '6px', textTransform: 'uppercase', letterSpacing: '0.02em' }}>
              Drop-off Destination
            </label>
            <div 
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: '8px',
                backgroundColor: '#F8FAFC',
                border: '1.5px solid #CBD5E1',
                borderRadius: '12px',
                padding: '10px 12px'
              }}
            >
              <MapPin size={16} color="#64748B" style={{ flexShrink: 0 }} />
              <input
                type="text"
                value={dropoffLocation}
                onChange={(e) => setDropoffLocation(e.target.value)}
                placeholder="Select drop-off location in Bhavnagar"
                style={{
                  width: '100%',
                  border: 'none',
                  background: 'transparent',
                  fontSize: '13px',
                  fontWeight: 700,
                  color: '#0F172A',
                  outline: 'none'
                }}
              />
            </div>
          </div>
        </div>
      </div>

      {/* TWO SELECTION COLUMNS: DISTANCE & TIMING (BOX BG: WHITE) */}
      <div style={{ padding: '0 18px 12px' }}>
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '10px' }}>
          {/* Trip Distance Selector */}
          <div 
            style={{
              backgroundColor: '#FFFFFF',
              borderRadius: '18px',
              border: '1.5px solid #E2E8F0',
              padding: '12px',
              boxShadow: '0 4px 16px rgba(0, 0, 0, 0.04)'
            }}
          >
            <label style={{ display: 'block', fontSize: '11px', fontWeight: 800, color: '#475569', marginBottom: '8px', textTransform: 'uppercase' }}>
              Trip Distance (Approx.)
            </label>
            <div style={{ display: 'flex', gap: '6px', flexWrap: 'wrap' }}>
              {availableKmOptions.map((km) => {
                const isSelected = selectedKm === km;
                return (
                  <button
                    key={km}
                    type="button"
                    onClick={() => setSelectedKm(km)}
                    style={{
                      flex: 1,
                      padding: '9px 6px',
                      borderRadius: '12px',
                      border: isSelected ? '2px solid #C53030' : '1.5px solid #CBD5E1',
                      backgroundColor: isSelected ? '#FEE2E2' : '#FFFFFF',
                      color: isSelected ? '#C53030' : '#0F172A',
                      fontSize: '13px',
                      fontWeight: 800,
                      cursor: 'pointer',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      transition: 'all 0.15s ease'
                    }}
                  >
                    <span>~ {km} km</span>
                  </button>
                );
              })}
            </div>
          </div>

          {/* When do you need a cab? */}
          <div 
            style={{
              backgroundColor: '#FFFFFF',
              borderRadius: '18px',
              border: '1.5px solid #E2E8F0',
              padding: '12px',
              boxShadow: '0 4px 16px rgba(0, 0, 0, 0.04)'
            }}
          >
            <label style={{ display: 'block', fontSize: '11px', fontWeight: 800, color: '#475569', marginBottom: '8px', textTransform: 'uppercase' }}>
              Pickup Schedule
            </label>
            <div 
              style={{
                padding: '9px 10px',
                borderRadius: '12px',
                border: '1.5px solid #CBD5E1',
                backgroundColor: '#F8FAFC',
                display: 'flex',
                alignItems: 'center',
                gap: '6px'
              }}
            >
              <Calendar size={15} color="#C53030" style={{ flexShrink: 0 }} />
              <select
                value={scheduleTime}
                onChange={(e) => setScheduleTime(e.target.value)}
                style={{
                  border: 'none',
                  background: 'transparent',
                  fontSize: '12px',
                  fontWeight: 800,
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

      {/* LIVE MAP: IDENTICAL TO HOME SCREEN MAP (GOOGLE MAPS TILES & PINS) */}
      <div style={{ padding: '0 18px 14px' }}>
        <div 
          style={{
            position: 'relative',
            width: '100%',
            height: '210px',
            borderRadius: '20px',
            overflow: 'hidden',
            border: '1.5px solid #E2E8F0',
            boxShadow: '0 4px 16px rgba(0, 0, 0, 0.06)',
            backgroundColor: '#FFFFFF'
          }}
        >
          {/* Exact InteractiveMap from HomeScreen */}
          <InteractiveMap
            center={pickupCoords}
            zoom={13}
            userLabel="Pickup Location"
            destination={mapDest}
            routePolyline={mapPolyline}
            showUserPin={true}
            style={{ width: '100%', height: '100%' }}
          />

          {/* Floating Time & Distance Badge */}
          <div
            style={{
              position: 'absolute',
              top: '12px',
              left: '12px',
              zIndex: 1000,
              backgroundColor: '#FFFFFF',
              color: '#0F172A',
              padding: '6px 12px',
              borderRadius: '12px',
              display: 'flex',
              alignItems: 'center',
              gap: '8px',
              boxShadow: '0 4px 14px rgba(0,0,0,0.18)',
              border: '1px solid #E2E8F0'
            }}
          >
            <div style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
              <Clock size={13} color="#C53030" />
              <span style={{ fontSize: '12px', fontWeight: 800, color: '#C53030' }}>{estTimeMin} min</span>
            </div>
            <span style={{ color: '#CBD5E1', fontSize: '11px' }}>•</span>
            <div style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
              <Navigation size={12} color="#0F172A" />
              <span style={{ fontSize: '12px', fontWeight: 700, color: '#0F172A' }}>~{selectedKm} km</span>
            </div>
          </div>

          {/* Floating Re-center GPS Button */}
          <button
            type="button"
            onClick={handleUseCurrentLocation}
            disabled={isLocating}
            aria-label="Re-center Live Location"
            style={{
              position: 'absolute',
              bottom: '12px',
              right: '12px',
              zIndex: 1000,
              width: '38px',
              height: '38px',
              borderRadius: '50%',
              backgroundColor: '#FFFFFF',
              border: '1.5px solid #CBD5E1',
              boxShadow: '0 4px 14px rgba(0, 0, 0, 0.2)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              cursor: isLocating ? 'wait' : 'pointer',
              color: '#0F172A'
            }}
          >
            <Crosshair size={18} strokeWidth={2.4} />
          </button>
        </div>
      </div>

      {/* SELECT CAB TYPE (SEDAN AND SUV ONLY, BOX BG: WHITE) */}
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
              border: selectedVehicle === 'sedan' ? '2px solid #C53030' : '1.5px solid #E2E8F0',
              padding: '12px 10px',
              display: 'flex',
              flexDirection: 'column',
              alignItems: 'center',
              cursor: 'pointer',
              boxShadow: selectedVehicle === 'sedan' ? '0 4px 14px rgba(197, 48, 48, 0.14)' : '0 2px 8px rgba(0,0,0,0.03)',
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
                  backgroundColor: '#C53030',
                  color: '#FFFFFF',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  fontSize: '11px',
                  fontWeight: 800
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
            <div style={{ fontSize: '14px', fontWeight: 800, color: '#C53030', marginTop: '4px' }}>
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
              border: selectedVehicle === 'suv' ? '2px solid #C53030' : '1.5px solid #E2E8F0',
              padding: '12px 10px',
              display: 'flex',
              flexDirection: 'column',
              alignItems: 'center',
              cursor: 'pointer',
              boxShadow: selectedVehicle === 'suv' ? '0 4px 14px rgba(197, 48, 48, 0.14)' : '0 2px 8px rgba(0,0,0,0.03)',
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
                  backgroundColor: '#C53030',
                  color: '#FFFFFF',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  fontSize: '11px',
                  fontWeight: 800
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
            <div style={{ fontSize: '14px', fontWeight: 800, color: '#C53030', marginTop: '4px' }}>
              ₹{selectedKm === 10 ? (pricing.suv?.km10 || 449) : (pricing.suv?.km20 || 699)}
            </div>
          </div>
        </div>
      </div>

      {/* CRITICAL NOTE: EXTRA KM CHARGE POLICY (BOX BG: WHITE) */}
      <div style={{ padding: '0 18px 16px' }}>
        <div 
          style={{
            backgroundColor: '#FFFFFF',
            border: '1.5px solid #FEE2E2',
            borderRadius: '16px',
            padding: '12px 14px',
            display: 'flex',
            alignItems: 'flex-start',
            gap: '10px',
            boxShadow: '0 4px 16px rgba(0, 0, 0, 0.04)'
          }}
        >
          <AlertCircle size={18} color="#C53030" style={{ flexShrink: 0, marginTop: '2px' }} />
          <div>
            <span style={{ fontSize: '12px', fontWeight: 800, color: '#C53030' }}>
              Important Distance Policy:
            </span>
            <p style={{ margin: '2px 0 0', fontSize: '12px', color: '#475569', lineHeight: 1.45, fontWeight: 500 }}>
              This fixed package covers up to <strong>{selectedKm} KM</strong>. If your ride exceeds {selectedKm} km, extra distance will be charged at <strong>₹{extraKmRate}/km</strong> for {selectedVehicle === 'suv' ? 'SUV' : 'Sedan'}.
            </p>
          </div>
        </div>
      </div>

      {/* PROMINENT "BOOK NOW →" BUTTON (BRAND CRIMSON RED) */}
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

      {/* BOOKING CONFIRMATION MODAL (SHIFTS TO RIDES SCREEN) */}
      {showConfirmModal && confirmedBooking && (
        <div
          style={{
            position: 'fixed',
            inset: 0,
            zIndex: 100000,
            backgroundColor: 'rgba(15, 23, 42, 0.75)',
            backdropFilter: 'blur(6px)',
            WebkitBackdropFilter: 'blur(6px)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            padding: '20px',
            boxSizing: 'border-box'
          }}
        >
          <div
            style={{
              backgroundColor: '#FFFFFF',
              borderRadius: '24px',
              padding: '24px',
              width: '100%',
              maxWidth: '360px',
              boxShadow: '0 25px 60px -15px rgba(0, 0, 0, 0.5)',
              display: 'flex',
              flexDirection: 'column',
              alignItems: 'center',
              textAlign: 'center',
              animation: 'confirmPop 0.25s cubic-bezier(0.16, 1, 0.3, 1)'
            }}
          >
            {/* Green Success Pulse Badge */}
            <div
              style={{
                width: '64px',
                height: '64px',
                borderRadius: '50%',
                backgroundColor: '#DCFCE7',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                color: '#16A34A',
                marginBottom: '16px'
              }}
            >
              <CheckCircle2 size={38} strokeWidth={2.6} />
            </div>

            <h3 style={{ margin: '0 0 4px', fontSize: '20px', fontWeight: 800, color: '#0F172A' }}>
              Booking Confirmed!
            </h3>
            <p style={{ margin: '0 0 16px', fontSize: '13px', color: '#64748B', fontWeight: 500 }}>
              Your cab request <strong>#{confirmedBooking.id}</strong> has been submitted.
            </p>

            {/* Quick Trip Details Card */}
            <div
              style={{
                width: '100%',
                backgroundColor: '#F8FAFC',
                borderRadius: '16px',
                padding: '12px 14px',
                border: '1px solid #E2E8F0',
                marginBottom: '18px',
                textAlign: 'left',
                boxSizing: 'border-box'
              }}
            >
              <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '6px' }}>
                <span style={{ fontSize: '11px', color: '#64748B', fontWeight: 700 }}>VEHICLE</span>
                <span style={{ fontSize: '12px', color: '#0F172A', fontWeight: 800 }}>{confirmedBooking.vehicle}</span>
              </div>
              <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '6px' }}>
                <span style={{ fontSize: '11px', color: '#64748B', fontWeight: 700 }}>PACKAGE</span>
                <span style={{ fontSize: '12px', color: '#C53030', fontWeight: 800 }}>{confirmedBooking.selectedKm} KM (₹{confirmedBooking.fare})</span>
              </div>
              <div>
                <span style={{ fontSize: '11px', color: '#64748B', fontWeight: 700 }}>PICKUP</span>
                <div style={{ fontSize: '12px', color: '#0F172A', fontWeight: 700, marginTop: '2px', lineHeight: 1.3 }}>
                  {confirmedBooking.pickup}
                </div>
              </div>
            </div>

            <div style={{ display: 'flex', alignItems: 'center', gap: '6px', fontSize: '12px', color: '#16A34A', fontWeight: 700, marginBottom: '14px' }}>
              <Loader2 size={13} style={{ animation: 'spin 1s linear infinite' }} />
              <span>Redirecting to My Rides...</span>
            </div>

            <button
              type="button"
              onClick={() => {
                setShowConfirmModal(false);
                if (setActiveTab) setActiveTab('rides');
              }}
              style={{
                width: '100%',
                padding: '13px 20px',
                borderRadius: '999px',
                border: 'none',
                backgroundColor: '#C53030',
                color: '#FFFFFF',
                fontSize: '15px',
                fontWeight: 800,
                cursor: 'pointer',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                gap: '8px',
                boxShadow: '0 4px 14px rgba(197, 48, 48, 0.35)'
              }}
            >
              <span>View in My Rides</span>
              <ArrowRight size={16} />
            </button>
          </div>
        </div>
      )}

      {/* Persistent Bottom App Navigation Bar */}
      <BottomNavBar activeTab={activeTab} setActiveTab={setActiveTab} />

      <style>{`
        @keyframes spin {
          from { transform: rotate(0deg); }
          to { transform: rotate(360deg); }
        }
        @keyframes confirmPop {
          from { transform: scale(0.9); opacity: 0; }
          to { transform: scale(1); opacity: 1; }
        }
      `}</style>
    </div>
  );
}
