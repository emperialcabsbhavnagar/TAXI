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
  saveCustomerToMySQL,
  saveNotificationToMySQL
} from '../../services/mysqlService';
import { 
  notifyAdmin, 
  registerPushNotifications, 
  syncNativeCustomerTrip,
  triggerRemoteServerPush
} from '../../services/notificationEngine';
import { 
  getBestLiveLocation, 
  reverseGeocodeCoords 
} from '../../services/liveLocationService';
import sedanImg from '../../assets/images/short-trip-sedan.png';
import suvImg from '../../assets/images/short-trip-suv.png';
import { BHAVNAGAR_20KM_PLACES, searchBhavnagarPlaces } from '../../data/bhavnagarPlaces';
import { calculateDistanceKm } from '../../utils/locationCoords';
import { Search, Compass, Building2, ChevronRight, X as CloseIcon } from 'lucide-react';

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
  const [dropoffLocation, setDropoffLocation] = useState('Railway Station (Bhavnagar Terminus)');
  const [scheduleTime, setScheduleTime] = useState('Instant (Reaching in 10-15 Mins)');
  const [notes, setNotes] = useState('');

  // Live GPS Coordinates for Pickup, Dropoff & Map
  const [pickupCoords, setPickupCoords] = useState({ lat: 21.7645, lng: 72.1519 });
  const [dropoffCoords, setDropoffCoords] = useState({ lat: 21.7702, lng: 72.1444, label: 'Railway Station (Bhavnagar Terminus - BVC)' });
  const [googleMapsLink, setGoogleMapsLink] = useState('https://www.google.com/maps?q=21.7645,72.1519');
  const [isLocating, setIsLocating] = useState(false);

  // Suggestions Modal State (A to Z Bhavnagar Places within 20 KM)
  const [activeSuggestionField, setActiveSuggestionField] = useState(null); // 'pickup' | 'dropoff' | null
  const [placeSearchText, setPlaceSearchText] = useState('');
  const [selectedPlaceCategory, setSelectedPlaceCategory] = useState('ALL');

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
    const lat2 = dropoffCoords?.lat || (lat1 + (selectedKm === 10 ? 0.045 : 0.082));
    const lng2 = dropoffCoords?.lng || (lng1 + (selectedKm === 10 ? -0.035 : -0.065));

    const dest = {
      lat: lat2,
      lng: lng2,
      label: dropoffLocation || `${selectedKm} KM Dropoff`
    };

    return {
      dest,
      polyline: null
    };
  };

  const handleSelectPlace = (place) => {
    const formatted = `${place.name}, ${place.area}`;
    if (activeSuggestionField === 'pickup') {
      setPickupLocation(formatted);
      setPickupCoords({ lat: place.lat, lng: place.lng });
      setGoogleMapsLink(`https://www.google.com/maps/search/?api=1&query=${place.lat},${place.lng}`);
      if (dropoffCoords && typeof dropoffCoords.lat === 'number') {
        const d = calculateDistanceKm(place.lat, place.lng, dropoffCoords.lat, dropoffCoords.lng);
        if (d > 12) setSelectedKm(20);
        else setSelectedKm(10);
      }
    } else if (activeSuggestionField === 'dropoff') {
      setDropoffLocation(formatted);
      setDropoffCoords({ lat: place.lat, lng: place.lng, label: place.name });
      if (pickupCoords && typeof pickupCoords.lat === 'number') {
        const d = calculateDistanceKm(pickupCoords.lat, pickupCoords.lng, place.lat, place.lng);
        if (d > 12) setSelectedKm(20);
        else setSelectedKm(10);
      }
    }
    setActiveSuggestionField(null);
    setPlaceSearchText('');
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
        vehicleImage: selectedVehicle === 'suv' ? suvImg : sedanImg,
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

      const notifTitle = `New Short Trip Booking #${shortTripId} (${selectedKm} KM)`;
      const notifBody = `Customer ${cName} (${cPhone}) booked a ${selectedVehicle.toUpperCase()} for ${selectedKm} km: ${pickupLocation} ➔ ${dropoffLocation}. Fare: ₹${currentFare}`;

      // 1. Save locally for instant offline-first availability
      try {
        const existing = JSON.parse(localStorage.getItem('cabsy_inquiries') || '[]');
        localStorage.setItem('cabsy_inquiries', JSON.stringify([newInquiry, ...existing]));
      } catch (e) {}

      // 2. Notify Admin IMMEDIATELY without waiting for network roundtrip
      notifyAdmin({
        type: 'short_trip',
        title: notifTitle,
        body: notifBody,
        extraData: { 
          inquiryId: shortTripId, 
          isShortTrip: true,
          tab: 'short_trips',
          pickupLat: pickupCoords.lat,
          pickupLng: pickupCoords.lng,
          googleMapsLink: googleMapsLink
        }
      });

      // 3. Save to Hostinger MySQL & Customer DB concurrently
      await Promise.allSettled([
        saveInquiryToMySQL(newInquiry),
        saveCustomerToMySQL(userProf)
      ]);

      // 5. Register push & background alarm sync for closed-app delivery
      registerPushNotifications('customer', cPhone, cEmail).catch(() => {});
      syncNativeCustomerTrip(shortTripId, cPhone, cEmail).catch(() => {});

      // 6. Broadcast updates
      window.dispatchEvent(new Event('storage'));
      window.dispatchEvent(new CustomEvent('EMPERIAL CABS_ride_booked', { detail: newInquiry }));

      // 7. Show Confirmation Screen and automatically shift to Rides tab
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
          padding: '10px 18px',
          paddingTop: 'calc(var(--android-status-bar-height, 0px) + 8px)',
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
          {/* Pickup Location Row */}
          <div style={{ marginBottom: '14px' }}>
            <div style={{ marginBottom: '6px' }}>
              <label style={{ fontSize: '12px', fontWeight: 800, color: '#0F172A', textTransform: 'uppercase', letterSpacing: '0.02em', margin: 0 }}>
                Pickup Location
              </label>
            </div>
            
            <div style={{ display: 'flex', gap: '8px' }}>
              <div 
                onClick={() => {
                  setActiveSuggestionField('pickup');
                  setPlaceSearchText('');
                }}
                style={{
                  flex: 1,
                  display: 'flex',
                  alignItems: 'center',
                  gap: '8px',
                  backgroundColor: '#F8FAFC',
                  border: '1.5px solid #CBD5E1',
                  borderRadius: '12px',
                  padding: '10px 12px',
                  cursor: 'pointer',
                  overflow: 'hidden'
                }}
              >
                <MapPin size={16} color="#C53030" style={{ flexShrink: 0 }} />
                <div style={{
                  width: '100%',
                  fontSize: '13px',
                  fontWeight: 700,
                  color: '#0F172A',
                  whiteSpace: 'nowrap',
                  overflow: 'hidden',
                  textOverflow: 'ellipsis'
                }}>
                  {pickupLocation || 'Select pickup location'}
                </div>
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
            <div style={{ marginBottom: '6px' }}>
              <label style={{ fontSize: '12px', fontWeight: 800, color: '#0F172A', marginBottom: 0, textTransform: 'uppercase', letterSpacing: '0.02em' }}>
                Drop-off Destination
              </label>
            </div>

            <div 
              onClick={() => {
                setActiveSuggestionField('dropoff');
                setPlaceSearchText('');
              }}
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: '8px',
                backgroundColor: '#F8FAFC',
                border: '1.5px solid #CBD5E1',
                borderRadius: '12px',
                padding: '10px 12px',
                cursor: 'pointer',
                overflow: 'hidden'
              }}
            >
              <MapPin size={16} color="#64748B" style={{ flexShrink: 0 }} />
              <div style={{
                width: '100%',
                fontSize: '13px',
                fontWeight: 700,
                color: '#0F172A',
                whiteSpace: 'nowrap',
                overflow: 'hidden',
                textOverflow: 'ellipsis'
              }}>
                {dropoffLocation || 'Select drop-off location in Bhavnagar'}
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* TRIP PACKAGE & PICKUP SCHEDULE (UNIFIED, CLEAN ARRANGEMENT) */}
      <div style={{ padding: '0 18px 12px' }}>
        <div 
          style={{
            backgroundColor: '#FFFFFF',
            borderRadius: '20px',
            border: '1.5px solid #E2E8F0',
            padding: '16px',
            boxShadow: '0 4px 16px rgba(0, 0, 0, 0.04)',
            display: 'flex',
            flexDirection: 'column',
            gap: '14px'
          }}
        >
          {/* Row 1: Trip Distance (Approx.) */}
          <div>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '8px' }}>
              <label style={{ fontSize: '12px', fontWeight: 800, color: '#0F172A', textTransform: 'uppercase', letterSpacing: '0.02em', margin: 0 }}>
                Trip Distance (Approx.)
              </label>
              <span style={{ fontSize: '11px', fontWeight: 700, color: '#64748B' }}>
                Bhavnagar Local Package
              </span>
            </div>
            
            <div style={{ display: 'grid', gridTemplateColumns: `repeat(${availableKmOptions.length}, 1fr)`, gap: '8px' }}>
              {availableKmOptions.map((km) => {
                const isSelected = selectedKm === km;
                return (
                  <button
                    key={km}
                    type="button"
                    onClick={() => setSelectedKm(km)}
                    style={{
                      padding: '11px 8px',
                      borderRadius: '12px',
                      border: isSelected ? '2px solid #C53030' : '1.5px solid #CBD5E1',
                      backgroundColor: isSelected ? '#FEE2E2' : '#F8FAFC',
                      color: isSelected ? '#C53030' : '#0F172A',
                      fontSize: '13.5px',
                      fontWeight: 800,
                      cursor: 'pointer',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      gap: '4px',
                      transition: 'all 0.15s ease',
                      boxShadow: isSelected ? '0 2px 8px rgba(197, 48, 48, 0.12)' : 'none'
                    }}
                  >
                    <span>~ {km} km</span>
                  </button>
                );
              })}
            </div>
          </div>

          {/* Divider */}
          <div style={{ height: '1px', backgroundColor: '#F1F5F9' }} />

          {/* Row 2: Pickup Schedule */}
          <div>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '8px' }}>
              <label style={{ fontSize: '12px', fontWeight: 800, color: '#0F172A', textTransform: 'uppercase', letterSpacing: '0.02em', margin: 0 }}>
                Pickup Schedule
              </label>
              <span style={{ fontSize: '11px', fontWeight: 700, color: '#16A34A', display: 'flex', alignItems: 'center', gap: '4px' }}>
                <span style={{ width: '6px', height: '6px', borderRadius: '50%', backgroundColor: '#16A34A' }} />
                Instant Available
              </span>
            </div>

            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '8px' }}>
              {[
                { val: 'Instant (Reaching in 10-15 Mins)', label: 'Instant', sub: '10-15 Min' },
                { val: 'Within 30 Mins', label: 'In 30 Min', sub: 'Flexible' },
                { val: 'Later Today', label: 'Later', sub: 'Today' }
              ].map(opt => {
                const isSelected = scheduleTime === opt.val;
                return (
                  <button
                    key={opt.val}
                    type="button"
                    onClick={() => setScheduleTime(opt.val)}
                    style={{
                      padding: '8px 4px',
                      borderRadius: '12px',
                      border: isSelected ? '2px solid #C53030' : '1.5px solid #CBD5E1',
                      backgroundColor: isSelected ? '#FEE2E2' : '#F8FAFC',
                      color: isSelected ? '#C53030' : '#0F172A',
                      cursor: 'pointer',
                      display: 'flex',
                      flexDirection: 'column',
                      alignItems: 'center',
                      justifyContent: 'center',
                      gap: '2px',
                      transition: 'all 0.15s ease',
                      boxShadow: isSelected ? '0 2px 8px rgba(197, 48, 48, 0.12)' : 'none'
                    }}
                  >
                    <span style={{ fontSize: '12.5px', fontWeight: 800 }}>{opt.label}</span>
                    <span style={{ fontSize: '10px', fontWeight: 600, color: isSelected ? '#C53030' : '#64748B' }}>{opt.sub}</span>
                  </button>
                );
              })}
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
              src={sedanImg || "/short-trip-sedan.png"} 
              alt="Sedan (4 Seats)"
              onError={(e) => { e.currentTarget.src = "/short-trip-sedan.png"; }}
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
              src={suvImg || "/short-trip-suv.png"} 
              alt="SUV (6-7 Seats)"
              onError={(e) => { e.currentTarget.src = "/short-trip-suv.png"; }}
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

      {/* BHAVNAGAR 20 KM PLACES SELECTION MODAL (A TO Z) */}
      {activeSuggestionField && (
        <div
          style={{
            position: 'fixed',
            inset: 0,
            zIndex: 99999,
            backgroundColor: 'rgba(15, 23, 42, 0.75)',
            backdropFilter: 'blur(6px)',
            WebkitBackdropFilter: 'blur(6px)',
            display: 'flex',
            alignItems: 'flex-end',
            justifyContent: 'center'
          }}
          onClick={(e) => {
            if (e.target === e.currentTarget) setActiveSuggestionField(null);
          }}
        >
          <div
            style={{
              width: '100%',
              maxWidth: '480px',
              backgroundColor: '#FFFFFF',
              borderTopLeftRadius: '28px',
              borderTopRightRadius: '28px',
              maxHeight: '85vh',
              display: 'flex',
              flexDirection: 'column',
              boxShadow: '0 -10px 40px rgba(0,0,0,0.25)',
              overflow: 'hidden'
            }}
          >
            {/* Modal Header */}
            <div style={{ padding: '18px 20px 14px', borderBottom: '1px solid #E2E8F0', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
              <div>
                <h3 style={{ margin: 0, fontSize: '18px', fontWeight: 800, color: '#0F172A' }}>
                  {activeSuggestionField === 'pickup' ? 'Select Pickup Location' : 'Select Drop-off Destination'}
                </h3>
                <p style={{ margin: '3px 0 0', fontSize: '12px', color: '#64748B', fontWeight: 600 }}>
                  All 50+ places within 20 km in Bhavnagar (A to Z)
                </p>
              </div>
              <button
                type="button"
                onClick={() => setActiveSuggestionField(null)}
                style={{
                  background: '#F1F5F9',
                  border: 'none',
                  borderRadius: '50%',
                  width: '34px',
                  height: '34px',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  color: '#475569',
                  cursor: 'pointer'
                }}
              >
                <CloseIcon size={18} />
              </button>
            </div>

            {/* Search Input */}
            <div style={{ padding: '12px 20px', borderBottom: '1px solid #F1F5F9' }}>
              <div style={{
                display: 'flex',
                alignItems: 'center',
                gap: '10px',
                backgroundColor: '#F8FAFC',
                border: '1.5px solid #CBD5E1',
                borderRadius: '12px',
                padding: '10px 14px'
              }}>
                <Search size={16} color="#64748B" />
                <input
                  type="text"
                  value={placeSearchText}
                  onChange={(e) => setPlaceSearchText(e.target.value)}
                  placeholder="Type to search any Bhavnagar place..."
                  autoFocus
                  style={{
                    width: '100%',
                    border: 'none',
                    background: 'transparent',
                    outline: 'none',
                    fontSize: '14px',
                    fontWeight: 700,
                    color: '#0F172A'
                  }}
                />
                {placeSearchText && (
                  <button
                    type="button"
                    onClick={() => setPlaceSearchText('')}
                    style={{ background: 'none', border: 'none', color: '#94A3B8', cursor: 'pointer', padding: 0 }}
                  >
                    ✕
                  </button>
                )}
              </div>

              {/* Category Pills */}
              <div style={{ display: 'flex', gap: '6px', overflowX: 'auto', padding: '10px 0 2px', scrollbarWidth: 'none' }}>
                {['ALL', 'Transit', 'Circle & Chowk', 'Area', 'Landmark & Temple', 'Medical', 'College'].map(cat => (
                  <button
                    key={cat}
                    type="button"
                    onClick={() => setSelectedPlaceCategory(cat)}
                    style={{
                      padding: '5px 12px',
                      borderRadius: '999px',
                      fontSize: '11px',
                      fontWeight: 700,
                      whiteSpace: 'nowrap',
                      border: selectedPlaceCategory === cat ? '1.5px solid #C53030' : '1px solid #E2E8F0',
                      backgroundColor: selectedPlaceCategory === cat ? '#FEE2E2' : '#FFFFFF',
                      color: selectedPlaceCategory === cat ? '#C53030' : '#475569',
                      cursor: 'pointer'
                    }}
                  >
                    {cat === 'ALL' ? 'All (A-Z)' : cat}
                  </button>
                ))}
              </div>
            </div>

            {/* Places List */}
            <div style={{ flex: 1, overflowY: 'auto', maxHeight: '55vh', padding: '8px 14px 24px' }}>
              {(() => {
                let filtered = searchBhavnagarPlaces(placeSearchText);
                if (selectedPlaceCategory !== 'ALL') {
                  filtered = filtered.filter(p => p.category === selectedPlaceCategory);
                }

                if (filtered.length === 0) {
                  return (
                    <div style={{ padding: '36px 20px', textAlign: 'center', color: '#94A3B8' }}>
                      <Compass size={36} style={{ opacity: 0.35, marginBottom: '8px' }} />
                      <div style={{ fontSize: '15px', fontWeight: 700, color: '#475569' }}>No locations found</div>
                      <div style={{ fontSize: '12px', marginTop: '4px' }}>Try searching with a different name or spelling</div>
                    </div>
                  );
                }

                return filtered.map((place, idx) => (
                  <div
                    key={`${place.name}-${idx}`}
                    onClick={() => handleSelectPlace(place)}
                    style={{
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'space-between',
                      padding: '12px 14px',
                      borderRadius: '12px',
                      margin: '4px 0',
                      cursor: 'pointer',
                      transition: 'background 0.15s ease',
                      backgroundColor: '#FFFFFF',
                      borderBottom: '1px solid #F8FAFC'
                    }}
                  >
                    <div style={{ display: 'flex', alignItems: 'center', gap: '12px', flex: 1, minWidth: 0 }}>
                      <div style={{
                        width: '36px',
                        height: '36px',
                        borderRadius: '10px',
                        backgroundColor: activeSuggestionField === 'pickup' ? '#FEE2E2' : '#EFF6FF',
                        color: activeSuggestionField === 'pickup' ? '#C53030' : '#2563EB',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        flexShrink: 0
                      }}>
                        <MapPin size={18} />
                      </div>
                      <div style={{ minWidth: 0, flex: 1 }}>
                        <div style={{ fontSize: '14px', fontWeight: 800, color: '#0F172A', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                          {place.name}
                        </div>
                        <div style={{ fontSize: '12px', color: '#64748B', fontWeight: 600, marginTop: '2px', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                          {place.area}
                        </div>
                      </div>
                    </div>

                    <div style={{ display: 'flex', alignItems: 'center', gap: '8px', flexShrink: 0, marginLeft: '10px' }}>
                      <span style={{
                        fontSize: '11px',
                        fontWeight: 800,
                        backgroundColor: '#F1F5F9',
                        color: '#334155',
                        padding: '3px 8px',
                        borderRadius: '6px'
                      }}>
                        ~{place.distanceKm} km
                      </span>
                      <ChevronRight size={16} color="#CBD5E1" />
                    </div>
                  </div>
                ));
              })()}
            </div>
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
