import React, { useState, useEffect, useMemo } from 'react';
import { getBestLiveLocation } from '../../services/liveLocationService';
import { getCoordsForPlace, calculateDistanceKm } from '../../utils/locationCoords';
import { 
  loadAllPlacesFromMySQL, 
  loadAllRoutesFromMySQL, 
  safeStorageGetItem,
  saveInquiryToMySQL,
  saveContactMessageToMySQL,
  expandBidirectionalRoutes
} from '../../services/mysqlService';
import { notifyAdmin } from '../../services/notificationEngine';
import { 
  Navigation, 
  MapPin, 
  ArrowLeft, 
  ArrowRight, 
  ArrowUpDown, 
  Compass, 
  Sparkles, 
  Calendar, 
  Clock, 
  Plus, 
  Minus, 
  CheckCircle, 
  CheckCircle2,
  AlertCircle,
  Send,
  Car, 
  Flame, 
  TrendingUp,
  Info,
  Phone,
  User
} from 'lucide-react';

const DEFAULT_PLACES = [
  "Bhavnagar, Gujarat",
  "Bhavnagar Railway Station",
  "Ahmedabad Airport (AMD)",
  "Vadodara Central Railway Station",
  "SG Highway IT Park",
  "Alkapuri Commercial Hub",
  "Ghogha Circle & Beach",
  "Mumbai Central Airport (BOM)",
  "Surat Textile Hub",
  "Rajkot Trikon Baug",
  "Sihor GIDC",
  "Talaja Main Market",
  "Palitana Bus Stand",
  "Mahuva Beach Road"
];

const ALL_CITIES_AND_VILLAGES = [
  // Major Cities & Regional Hubs
  "Ahmedabad", "Bhavnagar", "Vadodara", "Surat", "Rajkot", "Gandhinagar", "Jamnagar", "Junagadh",
  "Anand", "Bharuch", "Navsari", "Vapi", "Valsad", "Mehsana", "Palanpur", "Patan", "Porbandar",
  "Amreli", "Botad", "Morbi", "Surendranagar", "Bhuj", "Gandhidham", "Dahod", "Godhra", "Nadiad",
  "Mainpuri", "Saand", "Mumbai", "Pune", "Thane", "Nashik", "Udaipur", "Jaipur", "Abu Road", 
  "Indore", "Bhopal", "Delhi", "Gurgaon", "Noida",
  // Bhavnagar & Saurashtra Towns / Villages / Talukas
  "Mahuva", "Sihor", "Talaja", "Palitana", "Gariadhar", "Vallabhipur", "Umrala", "Jesar", "Ghogha",
  "Sanand", "Dholera", "Lothal", "Vartej", "Songadh", "Tana", "Bhandariya", "Trapaj", "Koliyak", "Alang",
  "Wadhwan", "Limbdi", "Chotila", "Halvad", "Dhangadhra", "Jasdan", "Gondal", "Jetpur", "Dhoraji",
  "Upleta", "Anjar", "Mandvi", "Mundra", "Nakhatrana", "Halol", "Veraval", "Somnath", "Dwarka",
  "Kodinar", "Una", "Keshod", "Manavadar", "Visavadar", "Bhanvad", "Khambhalia", "Okha", "Salaya",
  "Jodiya", "Dhrol", "Kalavad", "Lalpur", "Vinchhiya", "Babra", "Lathi", "Lilia", "Kunkavav",
  "Dhari", "Khambha", "Rajula", "Jafrabad", "Ranavav", "Kutiyana", "Bhayavadar", "Paddhari",
  "Kotda Sangani", "Lodhika", "Sayla", "Muli", "Lakhtar", "Thangadh", "Patdi", "Dasada", "Raphar", "Bhachau",
  "Petlad", "Khambhat", "Borsad", "Dabhoi", "Karjan", "Vyara", "Bardoli", "Ankleshwar"
];

export default function SelectLocationScreen({ 
  pickupLoc, 
  setPickupLoc, 
  dropoffLoc, 
  setDropoffLoc, 
  pickupCity = '',
  setPickupCity = () => {},
  dropoffCity = '',
  setDropoffCity = () => {},
  noOfDays = 1,
  setNoOfDays = () => {},
  isCustom = false,
  setIsCustom = () => {},
  tripType,
  setTripType = () => {},
  onSelectLocation, 
  onBack 
}) {
  const [places, setPlaces] = useState(() => {
    try {
      const savedPlaces = safeStorageGetItem('cabsy_places') || localStorage.getItem('cabsy_places');
      if (savedPlaces) {
        const parsed = typeof savedPlaces === 'string' ? JSON.parse(savedPlaces) : savedPlaces;
        if (Array.isArray(parsed) && parsed.length > 0) {
          return parsed.map(p => typeof p === 'string' ? p : (p.name || p.title || p.location));
        }
      }
    } catch (e) {}
    return DEFAULT_PLACES;
  });

  const isRoutePriced = (r) => {
    if (!r || !r.pickup || !r.dropoff) return false;
    const baseP = Number(r.price) || 0;
    if (baseP > 0) return true;
    if (r.car_prices && typeof r.car_prices === 'object') {
      return Object.values(r.car_prices).some(v => Number(v) > 0);
    }
    return false;
  };

  const [routes, setRoutes] = useState(() => {
    try {
      const savedDestinations = safeStorageGetItem('cabsy_destinations') || localStorage.getItem('cabsy_destinations') || localStorage.getItem('cabsy_routes');
      if (savedDestinations) {
        const parsed = typeof savedDestinations === 'string' ? JSON.parse(savedDestinations) : savedDestinations;
        if (Array.isArray(parsed)) {
          return parsed.filter(isRoutePriced);
        }
      }
    } catch (e) {}
    return [];
  });

  const [activeDropdown, setActiveDropdown] = useState(null); // 'pickup' | 'dropoff' | 'pickupCity' | 'dropoffCity' | null
  const [mode, setMode] = useState(isCustom ? 'custom' : 'standard'); // 'standard' | 'custom'

  // Local Custom Form State
  const [cPickupCity, setCPickupCity] = useState(pickupCity || 'Bhavnagar');
  const [cDropoffCity, setCDropoffCity] = useState(dropoffCity || 'Ahmedabad');
  const [cPickupAddress, setCPickupAddress] = useState(pickupLoc || 'Bhavnagar, Gujarat');
  const [cDropoffAddress, setCDropoffAddress] = useState(dropoffLoc || 'Ahmedabad Airport (AMD)');
  const [cDays, setCDays] = useState(noOfDays || 1);

  // Calculate dynamic driving distance & average KM/day
  const p1Coords = getCoordsForPlace(cPickupCity || cPickupAddress);
  const p2Coords = getCoordsForPlace(cDropoffCity || cDropoffAddress);
  const calculatedRoadKm = Math.round(calculateDistanceKm(p1Coords.lat, p1Coords.lng, p2Coords.lat, p2Coords.lng)) || 175;
  const estTotalKm = Math.max(calculatedRoadKm > 10 ? calculatedRoadKm : 175, 300 * cDays);
  const avgKmPerDay = Math.round(estTotalKm / cDays);

  // Load Admin back config directly from storage & database
  const loadAdminConfig = () => {
    try {
      const savedPlaces = safeStorageGetItem('cabsy_places') || localStorage.getItem('cabsy_places');
      if (savedPlaces) {
        const parsedP = typeof savedPlaces === 'string' ? JSON.parse(savedPlaces) : savedPlaces;
        if (Array.isArray(parsedP) && parsedP.length > 0) {
          const cleanPlaces = parsedP.map(p => typeof p === 'string' ? p : (p.name || p.title || p.location));
          setPlaces(cleanPlaces);
        }
      }

      const savedDestinations = safeStorageGetItem('cabsy_destinations') || localStorage.getItem('cabsy_destinations') || localStorage.getItem('cabsy_routes');
      if (savedDestinations) {
        const parsedD = typeof savedDestinations === 'string' ? JSON.parse(savedDestinations) : savedDestinations;
        if (Array.isArray(parsedD)) {
          setRoutes(expandBidirectionalRoutes(parsedD.filter(isRoutePriced)));
        }
      }
    } catch (e) {
      console.warn("Failed to load admin routes:", e);
    }

    // Direct Hostinger MySQL central database sync
    loadAllPlacesFromMySQL().then(mysqlPlaces => {
      if (Array.isArray(mysqlPlaces) && mysqlPlaces.length > 0) {
        setPlaces(mysqlPlaces);
        try { localStorage.setItem('cabsy_places', JSON.stringify(mysqlPlaces)); } catch (e) {}
      }
    }).catch(() => {});

    loadAllRoutesFromMySQL().then(mysqlRoutes => {
      if (mysqlRoutes !== null && Array.isArray(mysqlRoutes)) {
        const formattedRoutes = mysqlRoutes
          .map(r => ({
            id: r.id,
            name: `${r.pickup} → ${r.dropoff}`,
            pickup: r.pickup,
            dropoff: r.dropoff,
            price: Number(r.price) || 0,
            duration: r.duration || '',
            car_prices: r.car_prices || {}
          }))
          .filter(isRoutePriced);
        const expanded = expandBidirectionalRoutes(formattedRoutes);
        setRoutes(expanded);
        try {
          localStorage.setItem('cabsy_destinations', JSON.stringify(expanded));
          localStorage.setItem('cabsy_routes', JSON.stringify(expanded));
        } catch (e) {}
      }
    }).catch(() => {});
  };

  useEffect(() => {
    loadAdminConfig();

    const handleSync = (e) => {
      if (e?.detail && Array.isArray(e.detail)) {
        setRoutes(expandBidirectionalRoutes(e.detail.filter(isRoutePriced)));
      } else {
        loadAdminConfig();
      }
    };

    window.addEventListener('EMPERIAL CABS_destinations_updated', handleSync);
    window.addEventListener('storage', handleSync);

    let bc = null;
    if (typeof window !== 'undefined' && 'BroadcastChannel' in window) {
      try {
        bc = new BroadcastChannel('emperial_cabs_channel');
        bc.onmessage = (event) => {
          if (event.data?.type === 'DESTINATIONS_UPDATED' && Array.isArray(event.data.destinations)) {
            setRoutes(expandBidirectionalRoutes(event.data.destinations.filter(isRoutePriced)));
          }
        };
      } catch (e) {}
    }

    return () => {
      window.removeEventListener('EMPERIAL CABS_destinations_updated', handleSync);
      window.removeEventListener('storage', handleSync);
      if (bc) bc.close();
    };
  }, []);

  // Available pickup cities uniquely extracted from all active direct routes
  const availablePickups = useMemo(() => {
    const list = routes.map(r => r.pickup?.trim()).filter(Boolean);
    return Array.from(new Set(list));
  }, [routes]);

  // Dropoff suggestions tailored to the currently entered / selected pickup
  const availableDropoffs = useMemo(() => {
    if (!pickupLoc || pickupLoc.trim() === '') {
      return Array.from(new Set(routes.map(r => r.dropoff?.trim()).filter(Boolean)));
    }
    const p = pickupLoc.toLowerCase().trim();
    const matched = routes.filter(r => {
      const rp = (r.pickup || '').toLowerCase().trim();
      return rp === p || rp.includes(p) || p.includes(rp);
    });
    const list = matched.map(r => r.dropoff?.trim()).filter(Boolean);
    if (list.length > 0) return Array.from(new Set(list));
    return Array.from(new Set(routes.map(r => r.dropoff?.trim()).filter(Boolean)));
  }, [routes, pickupLoc]);

  // Dynamic filter for cities & villages
  const getFilteredCities = (query) => {
    if (!query || query.trim() === '') return ALL_CITIES_AND_VILLAGES.slice(0, 15);
    const q = query.toLowerCase().trim();
    const filtered = ALL_CITIES_AND_VILLAGES.filter(c => c.toLowerCase().includes(q));
    return filtered.length > 0 ? filtered : [];
  };

  const getFilteredPlaces = getFilteredCities;

  // Filtered available pickup suggestions
  const getFilteredPickups = (query) => {
    if (!query || query.trim() === '') return availablePickups;
    const q = query.toLowerCase().trim();
    return availablePickups.filter(p => p.toLowerCase().includes(q));
  };

  // Filtered available dropoff suggestions
  const getFilteredDropoffs = (query) => {
    if (!query || query.trim() === '') return availableDropoffs;
    const q = query.toLowerCase().trim();
    return availableDropoffs.filter(p => p.toLowerCase().includes(q));
  };

  // Direct route strict matcher
  const matchedDirectRoute = useMemo(() => {
    if (!pickupLoc || !dropoffLoc) return null;
    const p = pickupLoc.trim().toLowerCase();
    const d = dropoffLoc.trim().toLowerCase();
    return routes.find(r => {
      if (!r || !r.pickup || !r.dropoff) return false;
      const rp = String(r.pickup).trim().toLowerCase();
      const rd = String(r.dropoff).trim().toLowerCase();
      return (p === rp || p.includes(rp) || rp.includes(p)) &&
             (d === rd || d.includes(rd) || rd.includes(d));
    }) || null;
  }, [routes, pickupLoc, dropoffLoc]);

  const isDirectRouteAvailable = Boolean(matchedDirectRoute);

  // Dynamically sort direct routes so the selected or matching route always comes FIRST (Top 1)
  const sortedRoutes = useMemo(() => {
    if (!Array.isArray(routes) || routes.length === 0) return [];
    const p = (pickupLoc || '').trim().toLowerCase();
    const d = (dropoffLoc || '').trim().toLowerCase();

    return [...routes].sort((a, b) => {
      const ap = (a.pickup || '').trim().toLowerCase();
      const ad = (a.dropoff || '').trim().toLowerCase();
      const bp = (b.pickup || '').trim().toLowerCase();
      const bd = (b.dropoff || '').trim().toLowerCase();

      // Priority 1: Exact match on both pickup and dropoff -> immediately position Top 1
      const aExact = Boolean(p && d && ap === p && ad === d);
      const bExact = Boolean(p && d && bp === p && bd === d);
      if (aExact && !bExact) return -1;
      if (!aExact && bExact) return 1;

      // Priority 2: Fuzzy match on both pickup and dropoff
      const aBothMatch = Boolean(p && d && (ap.includes(p) || p.includes(ap)) && (ad.includes(d) || d.includes(ad)));
      const bBothMatch = Boolean(p && d && (bp.includes(p) || p.includes(bp)) && (bd.includes(d) || d.includes(bd)));
      if (aBothMatch && !bBothMatch) return -1;
      if (!aBothMatch && bBothMatch) return 1;

      // Priority 3: Pickup match
      const aPickupMatch = Boolean(p && (ap === p || ap.includes(p) || p.includes(ap)));
      const bPickupMatch = Boolean(p && (bp === p || bp.includes(p) || p.includes(bp)));
      if (aPickupMatch && !bPickupMatch) return -1;
      if (!aPickupMatch && bPickupMatch) return 1;

      // Priority 4: Dropoff match
      const aDropMatch = Boolean(d && (ad === d || ad.includes(d) || d.includes(ad)));
      const bDropMatch = Boolean(d && (bd === d || bd.includes(d) || d.includes(bd)));
      if (aDropMatch && !bDropMatch) return -1;
      if (!aDropMatch && bDropMatch) return 1;

      return 0;
    });
  }, [routes, pickupLoc, dropoffLoc]);

  // Custom Inquiry form state for when route is not available
  const [customInquiryState, setCustomInquiryState] = useState(() => {
    let name = '';
    let phone = '';
    try {
      const savedProfile = localStorage.getItem('cabsy_user_profile');
      if (savedProfile) {
        const p = JSON.parse(savedProfile);
        name = p.name || '';
        phone = p.phone || '';
      }
    } catch (e) {}
    return {
      name,
      phone,
      date: new Date().toISOString().split('T')[0],
      isSubmitting: false,
      isSubmitted: false,
      error: ''
    };
  });

  const handleSendCustomInquiry = async (e) => {
    if (e && e.preventDefault) e.preventDefault();
    if (!pickupLoc.trim() || !dropoffLoc.trim()) {
      setCustomInquiryState(prev => ({ ...prev, error: 'Please enter both pickup and dropoff locations.' }));
      return;
    }
    const cleanPhone = (customInquiryState.phone || '').trim();
    if (!cleanPhone || cleanPhone.replace(/\D/g, '').length < 10) {
      setCustomInquiryState(prev => ({ ...prev, error: 'Please enter a valid 10-digit phone number.' }));
      return;
    }
    if (!customInquiryState.name.trim()) {
      setCustomInquiryState(prev => ({ ...prev, error: 'Please enter your full name.' }));
      return;
    }

    setCustomInquiryState(prev => ({ ...prev, isSubmitting: true, error: '' }));

    const inqId = 'INQ-CUST-' + Math.floor(100000 + Math.random() * 900000);
    const dateStr = customInquiryState.date || new Date().toISOString().split('T')[0];
    const customerName = customInquiryState.name.trim();

    const inquiryPayload = {
      id: inqId,
      customerName: customerName,
      customerPhone: cleanPhone,
      customerEmail: 'emperialcabsbhavnagar@gmail.com',
      pickup: pickupLoc.trim(),
      dropoff: dropoffLoc.trim(),
      pickupCity: pickupLoc.trim(),
      dropoffCity: dropoffLoc.trim(),
      tripType: 'Custom Trip',
      isCustom: true,
      status: 'Pending',
      date: dateStr,
      scheduledDate: dateStr,
      scheduledTime: '10:00 AM',
      noOfDays: 1,
      fare: 0,
      vehicle: 'To Be Quoted',
      notes: `Custom Route Request: ${pickupLoc.trim()} → ${dropoffLoc.trim()} (Route not listed directly)`,
      timestamp: new Date().toISOString()
    };

    const newMsg = {
      id: 'MSG-' + inqId,
      name: customerName,
      phone: cleanPhone,
      email: 'emperialcabsbhavnagar@gmail.com',
      subject: `Custom Route: ${pickupLoc.trim()} → ${dropoffLoc.trim()}`,
      message: `Customer requested unlisted route from ${pickupLoc.trim()} to ${dropoffLoc.trim()} on ${dateStr}. Please provide quote.`,
      category: 'Custom Route Inquiry',
      date: dateStr,
      status: 'Unread'
    };

    try {
      await saveInquiryToMySQL(inquiryPayload).catch(err => console.warn('Save custom inquiry MySQL notice:', err));
      await saveContactMessageToMySQL(newMsg).catch(err => console.warn('Save contact message MySQL notice:', err));

      try {
        const existingInqs = JSON.parse(localStorage.getItem('cabsy_inquiries') || '[]');
        localStorage.setItem('cabsy_inquiries', JSON.stringify([inquiryPayload, ...existingInqs]));
      } catch (e) {}

      try {
        const existingMsgs = JSON.parse(localStorage.getItem('cabsy_contact_messages') || localStorage.getItem('cabsy_messages') || '[]');
        localStorage.setItem('cabsy_contact_messages', JSON.stringify([newMsg, ...existingMsgs]));
        localStorage.setItem('cabsy_messages', JSON.stringify([newMsg, ...existingMsgs]));
        localStorage.setItem('cabsy_user_profile', JSON.stringify({ name: customerName, phone: cleanPhone, email: 'emperialcabsbhavnagar@gmail.com' }));
      } catch (e) {}

      // Dispatch Admin Notification so dispatch immediately receives push alert and dashboard update
      notifyAdmin({
        type: 'custom',
        title: `New Custom Route Inquiry #${inqId}`,
        body: `Customer ${customerName} (${cleanPhone}) requested custom route: ${pickupLoc.trim()} → ${dropoffLoc.trim()}`,
        extraData: { 
          tab: 'custom_inquiries', 
          inquiryId: inqId,
          messageId: newMsg.id,
          customerName: customerName,
          customerPhone: cleanPhone,
          pickup: pickupLoc.trim(),
          dropoff: dropoffLoc.trim()
        }
      });

      window.dispatchEvent(new Event('storage'));
      window.dispatchEvent(new CustomEvent('EMPERIAL CABS_ride_booked', { detail: inquiryPayload }));
      window.dispatchEvent(new Event('EMPERIAL CABS_messages_updated'));

      setCustomInquiryState(prev => ({
        ...prev,
        isSubmitting: false,
        isSubmitted: true,
        error: ''
      }));
    } catch (err) {
      console.error('Custom route inquiry submit error:', err);
      setCustomInquiryState(prev => ({
        ...prev,
        isSubmitting: false,
        error: 'Failed to submit inquiry. Please try calling directly or tap call button.'
      }));
    }
  };

  const handleSelectRoute = (route) => {
    setPickupLoc(route.pickup);
    setDropoffLoc(route.dropoff);
    if (setPickupCity) setPickupCity(route.pickup);
    if (setDropoffCity) setDropoffCity(route.dropoff);
    setIsCustom(false);
    setActiveDropdown(null);
  };

  const isStandardReady = Boolean(pickupLoc && pickupLoc.trim() !== '' && dropoffLoc && dropoffLoc.trim() !== '' && isDirectRouteAvailable);
  // ALLOW ANY CUSTOM ENTRY typed by user for pickupCity and dropoffCity
  const isCustomReady = cPickupCity && cPickupCity.trim() !== '' && cDropoffCity && cDropoffCity.trim() !== '';

  const handleProceedStandard = () => {
    if (!isDirectRouteAvailable) return;
    setIsCustom(false);
    onSelectLocation();
  };

  const handleProceedCustom = () => {
    setIsCustom(true);
    const finalPickupCity = cPickupCity.trim();
    const finalDropoffCity = cDropoffCity.trim();
    const finalPickupAddr = cPickupAddress.trim() !== '' ? cPickupAddress.trim() : `${finalPickupCity}, Gujarat`;
    const finalDropoffAddr = cDropoffAddress.trim() !== '' ? cDropoffAddress.trim() : `${finalDropoffCity}, Main Spot`;

    setPickupCity(finalPickupCity);
    setDropoffCity(finalDropoffCity);
    setPickupLoc(finalPickupAddr);
    setDropoffLoc(finalDropoffAddr);
    setNoOfDays(cDays);
    if (setTripType) setTripType('custom-trip');
    onSelectLocation();
  };

  return (
    <div className="real-mobile-app" style={{ background: '#F8FAFC', minHeight: '100vh', display: 'flex', flexDirection: 'column' }}>
      {/* Header Bar */}
      <div 
        style={{ 
          boxShadow: '0 2px 10px rgba(0,0,0,0.03)', 
          display: 'flex', 
          alignItems: 'center', 
          justifyContent: 'space-between', 
          padding: '12px 16px', 
          background: '#FFFFFF',
          minHeight: '56px',
          borderBottom: '1px solid #F1F5F9'
        }}
      >
        <button 
          type="button"
          onClick={onBack} 
          aria-label="Back"
          style={{ 
            background: '#F1F5F9', 
            border: 'none', 
            borderRadius: '12px', 
            width: '38px', 
            height: '38px', 
            display: 'flex', 
            alignItems: 'center', 
            justifyContent: 'center', 
            cursor: 'pointer', 
            color: '#0F172A',
            flexShrink: 0
          }}
        >
          <ArrowLeft size={18} />
        </button>
        <h2 
          style={{ 
            margin: 0, 
            fontSize: '18px', 
            fontWeight: '800', 
            fontFamily: 'League Spartan, sans-serif',
            color: '#0F172A',
            textAlign: 'center',
            flex: 1
          }}
        >
          Select Destination
        </h2>
        <div style={{ width: '38px', height: '38px', flexShrink: 0 }} aria-hidden="true" />
      </div>

      <div className="mobile-screen-body" style={{ padding: '16px 20px 110px 20px', flex: 1 }}>
        
        {/* PREMIUM CLEAN LIGHT SEGMENTED TOGGLE */}
        <div style={{ 
          background: '#F1F5F9', 
          borderRadius: '16px', 
          padding: '4px', 
          display: 'grid', 
          gridTemplateColumns: '1fr 1fr', 
          gap: '4px', 
          marginBottom: '20px',
          border: '1px solid #E2E8F0'
        }}>
          <button
            type="button"
            onClick={() => {
              setMode('standard');
              setIsCustom(false);
            }}
            style={{
              padding: '10px 12px',
              borderRadius: '12px',
              border: mode === 'standard' ? '1px solid #CBD5E1' : 'none',
              background: mode === 'standard' ? '#FFFFFF' : 'transparent',
              color: mode === 'standard' ? '#0F172A' : '#64748B',
              fontFamily: 'League Spartan, sans-serif',
              fontSize: '14px',
              fontWeight: '800',
              cursor: 'pointer',
              boxShadow: mode === 'standard' ? '0 2px 6px rgba(0,0,0,0.06)' : 'none',
              transition: 'all 0.2s ease',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              gap: '6px'
            }}
          >
            <Car size={16} color={mode === 'standard' ? '#10B981' : '#64748B'} />
            <span>One Way Trip</span>
          </button>

          <button
            type="button"
            onClick={() => {
              setMode('custom');
              setIsCustom(true);
            }}
            style={{
              padding: '10px 12px',
              borderRadius: '12px',
              border: mode === 'custom' ? '1.5px solid #10B981' : 'none',
              background: mode === 'custom' ? '#FFFFFF' : 'transparent',
              color: mode === 'custom' ? '#0F172A' : '#64748B',
              fontFamily: 'League Spartan, sans-serif',
              fontSize: '14px',
              fontWeight: '800',
              cursor: 'pointer',
              boxShadow: mode === 'custom' ? '0 2px 8px rgba(16,185,129,0.15)' : 'none',
              transition: 'all 0.2s ease',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              gap: '6px'
            }}
          >
            <Sparkles size={16} color={mode === 'custom' ? '#10B981' : '#64748B'} />
            <span>Round Trip</span>
          </button>
        </div>

        {/* MODE 1: STANDARD POINT-TO-POINT */}
        {mode === 'standard' && (
          <div>
            {/* Pickup & Dropoff Card */}
            <div style={{ 
              background: '#FFFFFF', 
              borderRadius: '20px', 
              padding: '16px', 
              boxShadow: '0 4px 20px rgba(0,0,0,0.05)', 
              border: '1px solid #E2E8F0',
              marginBottom: '20px',
              position: 'relative'
            }}>
              {/* Pickup Input */}
              <div style={{ position: 'relative', marginBottom: '14px' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '10px', marginBottom: '6px' }}>
                  <span style={{ width: '10px', height: '10px', borderRadius: '50%', background: '#22C55E', boxShadow: '0 0 8px rgba(34,197,94,0.4)', display: 'inline-block' }}></span>
                  <span style={{ fontSize: '11px', fontWeight: '800', color: '#64748B', letterSpacing: '0.8px' }}>PICKUP LOCATION</span>
                </div>
                <input 
                  style={{ 
                    width: '100%', 
                    padding: '12px 14px', 
                    borderRadius: '14px', 
                    border: '1.5px solid #CBD5E1', 
                    outline: 'none', 
                    fontFamily: 'Space Grotesk, sans-serif', 
                    fontSize: '16px', 
                    fontWeight: '600', 
                    color: '#0F172A', 
                    background: '#F8FAFC',
                    boxSizing: 'border-box'
                  }} 
                  value={pickupLoc} 
                  onChange={(e) => setPickupLoc(e.target.value)} 
                  onFocus={() => setActiveDropdown('pickup')}
                  placeholder="Search pickup spot, city or village..."
                />

                {activeDropdown === 'pickup' && (
                  <div style={{ position: 'absolute', top: '100%', left: 0, right: 0, zIndex: 50, background: '#FFFFFF', border: '1.5px solid #E2E8F0', borderRadius: '16px', boxShadow: '0 12px 32px rgba(0,0,0,0.12)', maxHeight: '240px', overflowY: 'auto', marginTop: '6px' }}>
                    <div 
                      onClick={async () => {
                        setPickupLoc('Detecting live location...');
                        const locRes = await getBestLiveLocation();
                        if (locRes && locRes.address) {
                          setPickupLoc(locRes.address);
                        } else {
                          setPickupLoc('Bhavnagar, Gujarat');
                        }
                        setActiveDropdown(null);
                      }}
                      style={{ padding: '12px 16px', fontSize: '14px', fontWeight: '700', color: '#059669', background: '#ECFDF5', borderBottom: '1px solid #A7F3D0', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '10px' }}
                    >
                      <Navigation size={18} color="#10B981" />
                      <span><strong>Use My Current Live GPS Spot</strong></span>
                    </div>

                    {/* Available direct route pickups */}
                    {availablePickups.length > 0 && (
                      <>
                        <div style={{ padding: '8px 14px', fontSize: '11px', fontWeight: '800', color: '#047857', background: '#F0FDF4', borderBottom: '1px solid #DCFCE7', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                          <span>AVAILABLE DIRECT ROUTE PICKUPS</span>
                          <span style={{ fontSize: '10px', background: '#DCFCE7', padding: '2px 6px', borderRadius: '6px', fontWeight: '800' }}>Direct Routes</span>
                        </div>
                        {getFilteredPickups(pickupLoc).map((spot, i) => (
                          <div 
                            key={`pk-dir-${i}`}
                            style={{ padding: '12px 16px', fontSize: '14px', fontWeight: '700', color: '#0F172A', borderBottom: '1px solid #F1F5F9', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '10px', background: '#FFFFFF' }}
                            onClick={() => {
                              setPickupLoc(spot);
                              setActiveDropdown('dropoff');
                            }}
                          >
                            <MapPin size={16} color="#10B981" />
                            <span>{spot}</span>
                          </div>
                        ))}
                      </>
                    )}

                    {/* Custom typed location fallback */}
                    {pickupLoc.trim() !== '' && !availablePickups.some(p => p.toLowerCase() === pickupLoc.toLowerCase().trim()) && !getFilteredPlaces(pickupLoc).some(p => p.toLowerCase() === pickupLoc.toLowerCase().trim()) && (
                      <div 
                        onClick={() => setActiveDropdown(null)}
                        style={{ padding: '10px 14px', fontSize: '13px', fontWeight: '700', color: '#059669', background: '#F0FDF4', borderBottom: '1px solid #E2E8F0', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '8px' }}
                      >
                        <Sparkles size={16} color="#10B981" />
                        <span>Use Custom Spot: "<strong>{pickupLoc}</strong>"</span>
                      </div>
                    )}

                    <div style={{ padding: '10px 14px', fontSize: '11px', fontWeight: '800', color: '#64748B', background: '#F8FAFC', borderBottom: '1px solid #E2E8F0' }}>
                      OTHER CITIES & VILLAGES
                    </div>
                    {getFilteredPlaces(pickupLoc).filter(p => !availablePickups.some(ap => ap.toLowerCase() === p.toLowerCase())).map((place, i) => (
                      <div 
                        key={`pk-pl-${i}`}
                        style={{ padding: '12px 16px', fontSize: '14px', fontWeight: '600', color: '#0F172A', borderBottom: '1px solid #F1F5F9', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '10px' }}
                        onClick={() => {
                          setPickupLoc(place);
                          setActiveDropdown(null);
                        }}
                      >
                        <MapPin size={16} color="#94A3B8" />
                        <span>{place}</span>
                      </div>
                    ))}
                  </div>
                )}
              </div>

              {/* INTERACTIVE LOCATION SWAP BUTTON */}
              <div style={{ position: 'relative', height: '0', display: 'flex', justifyContent: 'flex-end', zIndex: 20 }}>
                <button
                  type="button"
                  onClick={(e) => {
                    e.stopPropagation();
                    const prevPickup = pickupLoc;
                    const prevDropoff = dropoffLoc;
                    setPickupLoc(prevDropoff);
                    setDropoffLoc(prevPickup);
                    if (setPickupCity && setDropoffCity) {
                      const prevPC = pickupCity;
                      const prevDC = dropoffCity;
                      setPickupCity(prevDC);
                      setDropoffCity(prevPC);
                    }
                  }}
                  title="Swap Pickup and Drop-off locations"
                  style={{
                    position: 'absolute',
                    top: '-18px',
                    right: '16px',
                    width: '38px',
                    height: '38px',
                    borderRadius: '50%',
                    background: '#FFFFFF',
                    border: '1.5px solid #CBD5E1',
                    boxShadow: '0 4px 14px rgba(0,0,0,0.1)',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    cursor: 'pointer',
                    color: '#0F172A',
                    transition: 'all 0.25s cubic-bezier(0.16, 1, 0.3, 1)'
                  }}
                  onMouseEnter={(e) => {
                    e.currentTarget.style.borderColor = '#10B981';
                    e.currentTarget.style.transform = 'scale(1.1) rotate(180deg)';
                    e.currentTarget.style.boxShadow = '0 6px 18px rgba(16,185,129,0.25)';
                  }}
                  onMouseLeave={(e) => {
                    e.currentTarget.style.borderColor = '#CBD5E1';
                    e.currentTarget.style.transform = 'scale(1) rotate(0deg)';
                    e.currentTarget.style.boxShadow = '0 4px 14px rgba(0,0,0,0.1)';
                  }}
                >
                  <ArrowUpDown size={17} color="#10B981" />
                </button>
              </div>

              {/* Dropoff Input */}
              <div style={{ position: 'relative', borderTop: '1px dashed #E2E8F0', paddingTop: '14px' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '6px' }}>
                  <MapPin size={16} color="#EF4444" />
                  <span style={{ fontSize: '11px', fontWeight: '800', color: '#64748B', letterSpacing: '0.8px' }}>DROP-OFF DESTINATION</span>
                </div>
                <input 
                  style={{ 
                    width: '100%', 
                    padding: '12px 14px', 
                    borderRadius: '14px', 
                    border: '1.5px solid #CBD5E1', 
                    outline: 'none', 
                    fontFamily: 'Space Grotesk, sans-serif', 
                    fontSize: '16px', 
                    fontWeight: '600', 
                    color: '#0F172A', 
                    background: '#F8FAFC',
                    boxSizing: 'border-box'
                  }} 
                  value={dropoffLoc} 
                  onChange={(e) => setDropoffLoc(e.target.value)} 
                  onFocus={() => setActiveDropdown('dropoff')}
                  placeholder="Search destination spot, city or village..."
                />

                {activeDropdown === 'dropoff' && (
                  <div style={{ position: 'absolute', top: '100%', left: 0, right: 0, zIndex: 50, background: '#FFFFFF', border: '1.5px solid #E2E8F0', borderRadius: '16px', boxShadow: '0 12px 32px rgba(0,0,0,0.12)', maxHeight: '240px', overflowY: 'auto', marginTop: '6px' }}>
                    {/* Available direct destinations */}
                    {availableDropoffs.length > 0 && (
                      <>
                        <div style={{ padding: '8px 14px', fontSize: '11px', fontWeight: '800', color: '#047857', background: '#F0FDF4', borderBottom: '1px solid #DCFCE7', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                          <span>{pickupLoc.trim() ? `DIRECT ROUTES FROM ${pickupLoc.toUpperCase().trim()}` : 'AVAILABLE DIRECT DESTINATIONS'}</span>
                          <span style={{ fontSize: '10px', background: '#DCFCE7', padding: '2px 6px', borderRadius: '6px', fontWeight: '800' }}>Direct Route</span>
                        </div>
                        {getFilteredDropoffs(dropoffLoc).map((dest, i) => (
                          <div 
                            key={`dp-dir-${i}`}
                            style={{ padding: '12px 16px', fontSize: '14px', fontWeight: '700', color: '#0F172A', borderBottom: '1px solid #F1F5F9', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '10px', background: '#FFFFFF' }}
                            onClick={() => {
                              setDropoffLoc(dest);
                              setActiveDropdown(null);
                            }}
                          >
                            <MapPin size={16} color="#EF4444" />
                            <span>{dest}</span>
                          </div>
                        ))}
                      </>
                    )}

                    {/* Custom typed location fallback */}
                    {dropoffLoc.trim() !== '' && !availableDropoffs.some(p => p.toLowerCase() === dropoffLoc.toLowerCase().trim()) && !getFilteredPlaces(dropoffLoc).some(p => p.toLowerCase() === dropoffLoc.toLowerCase().trim()) && (
                      <div 
                        onClick={() => setActiveDropdown(null)}
                        style={{ padding: '10px 14px', fontSize: '13px', fontWeight: '700', color: '#059669', background: '#F0FDF4', borderBottom: '1px solid #E2E8F0', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '8px' }}
                      >
                        <Sparkles size={16} color="#10B981" />
                        <span>Use Custom Spot: "<strong>{dropoffLoc}</strong>"</span>
                      </div>
                    )}

                    <div style={{ padding: '10px 14px', fontSize: '11px', fontWeight: '800', color: '#64748B', background: '#F8FAFC', borderBottom: '1px solid #E2E8F0' }}>
                      OTHER CITIES & VILLAGES
                    </div>
                    {getFilteredPlaces(dropoffLoc).filter(p => !availableDropoffs.some(ad => ad.toLowerCase() === p.toLowerCase())).map((place, i) => (
                      <div 
                        key={`dp-pl-${i}`}
                        style={{ padding: '12px 16px', fontSize: '14px', fontWeight: '600', color: '#0F172A', borderBottom: '1px solid #F1F5F9', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '10px' }}
                        onClick={() => {
                          setDropoffLoc(place);
                          setActiveDropdown(null);
                        }}
                      >
                        <MapPin size={16} color="#94A3B8" />
                        <span>{place}</span>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </div>

            {/* ROUTE NOT AVAILABLE WARNING & CUSTOM INQUIRY FORM */}
            {pickupLoc && pickupLoc.trim() !== '' && dropoffLoc && dropoffLoc.trim() !== '' && !isDirectRouteAvailable && (
              <div style={{
                background: '#FFFFFF',
                borderRadius: '20px',
                padding: '20px',
                marginBottom: '20px',
                border: '1.5px solid #F59E0B',
                boxShadow: '0 8px 24px rgba(245, 158, 11, 0.1)',
                animation: 'fadeIn 0.25s ease'
              }}>
                <div style={{ display: 'flex', alignItems: 'flex-start', gap: '12px', marginBottom: '14px' }}>
                  <div style={{
                    width: '38px',
                    height: '38px',
                    borderRadius: '12px',
                    background: '#FEF3C7',
                    border: '1px solid #FDE68A',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    flexShrink: 0
                  }}>
                    <AlertCircle size={22} color="#D97706" />
                  </div>
                  <div>
                    <div style={{
                      display: 'inline-block',
                      background: '#FEF3C7',
                      color: '#B45309',
                      fontSize: '11px',
                      fontWeight: '800',
                      padding: '3px 8px',
                      borderRadius: '6px',
                      letterSpacing: '0.5px',
                      marginBottom: '4px'
                    }}>
                      DIRECT ROUTE NOT AVAILABLE
                    </div>
                    <h4 style={{
                      margin: '2px 0 6px 0',
                      fontFamily: 'League Spartan, sans-serif',
                      fontSize: '18px',
                      fontWeight: '800',
                      color: '#0F172A'
                    }}>
                      Direct Route Not Listed
                    </h4>
                    <p style={{
                      margin: 0,
                      fontSize: '13px',
                      color: '#64748B',
                      lineHeight: 1.45
                    }}>
                      A fixed-fare automated route is not directly available between <strong>{pickupLoc}</strong> and <strong>{dropoffLoc}</strong>. Submit your custom trip inquiry below and our dispatch team will promptly arrange your cab!
                    </p>
                  </div>
                </div>

                {customInquiryState.isSubmitted ? (
                  <div style={{
                    background: '#F0FDF4',
                    border: '1.5px solid #86EFAC',
                    borderRadius: '16px',
                    padding: '16px',
                    textAlign: 'center'
                  }}>
                    <CheckCircle2 size={32} color="#16A34A" style={{ margin: '0 auto 8px auto', display: 'block' }} />
                    <h5 style={{ margin: '0 0 6px 0', fontSize: '16px', fontWeight: '800', color: '#15803D', fontFamily: 'League Spartan, sans-serif' }}>
                      Inquiry Sent to Admin!
                    </h5>
                    <p style={{ margin: '0 0 12px 0', fontSize: '13px', color: '#166534', lineHeight: 1.4 }}>
                      We received your custom route request from <strong>{pickupLoc}</strong> to <strong>{dropoffLoc}</strong>. Our admin team will contact you at <strong>{customInquiryState.phone}</strong> shortly with your custom price.
                    </p>
                    <a
                      href="tel:+917226844108"
                      style={{
                        display: 'inline-flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        gap: '8px',
                        background: '#15803D',
                        color: '#FFFFFF',
                        textDecoration: 'none',
                        padding: '10px 18px',
                        borderRadius: '12px',
                        fontSize: '13px',
                        fontWeight: '700'
                      }}
                    >
                      <Phone size={15} color="#FFFFFF" />
                      <span>Call Admin Directly (+91 7226844108)</span>
                    </a>
                  </div>
                ) : (
                  <form onSubmit={handleSendCustomInquiry} style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
                    <div style={{
                      background: '#F8FAFC',
                      border: '1px solid #E2E8F0',
                      borderRadius: '14px',
                      padding: '12px',
                      display: 'flex',
                      flexDirection: 'column',
                      gap: '8px'
                    }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '8px', fontSize: '13px', color: '#334155' }}>
                        <MapPin size={15} color="#22C55E" />
                        <span style={{ fontWeight: '700' }}>Pickup:</span>
                        <span style={{ color: '#0F172A', fontWeight: '600' }}>{pickupLoc}</span>
                      </div>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '8px', fontSize: '13px', color: '#334155' }}>
                        <MapPin size={15} color="#EF4444" />
                        <span style={{ fontWeight: '700' }}>Drop-off:</span>
                        <span style={{ color: '#0F172A', fontWeight: '600' }}>{dropoffLoc}</span>
                      </div>
                    </div>

                    <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '10px' }}>
                      <div>
                        <label style={{ fontSize: '11px', fontWeight: '800', color: '#475569', display: 'block', marginBottom: '4px' }}>
                          TRAVEL DATE
                        </label>
                        <input
                          type="date"
                          value={customInquiryState.date}
                          onChange={(e) => setCustomInquiryState(prev => ({ ...prev, date: e.target.value }))}
                          style={{
                            width: '100%',
                            padding: '10px 12px',
                            borderRadius: '12px',
                            border: '1.5px solid #CBD5E1',
                            fontFamily: 'Space Grotesk, sans-serif',
                            fontSize: '13px',
                            fontWeight: '600',
                            color: '#0F172A',
                            boxSizing: 'border-box'
                          }}
                        />
                      </div>
                      <div>
                        <label style={{ fontSize: '11px', fontWeight: '800', color: '#475569', display: 'block', marginBottom: '4px' }}>
                          YOUR NAME
                        </label>
                        <input
                          type="text"
                          placeholder="Your Name"
                          value={customInquiryState.name}
                          onChange={(e) => setCustomInquiryState(prev => ({ ...prev, name: e.target.value }))}
                          style={{
                            width: '100%',
                            padding: '10px 12px',
                            borderRadius: '12px',
                            border: '1.5px solid #CBD5E1',
                            fontFamily: 'Space Grotesk, sans-serif',
                            fontSize: '16px',
                            fontWeight: '600',
                            color: '#0F172A',
                            boxSizing: 'border-box'
                          }}
                        />
                      </div>
                    </div>

                    <div>
                      <label style={{ fontSize: '11px', fontWeight: '800', color: '#475569', display: 'block', marginBottom: '4px' }}>
                        PHONE NUMBER (FOR CUSTOM QUOTE)
                      </label>
                      <input
                        type="tel"
                        placeholder="10-digit mobile number"
                        value={customInquiryState.phone}
                        onChange={(e) => setCustomInquiryState(prev => ({ ...prev, phone: e.target.value }))}
                        style={{
                          width: '100%',
                          padding: '10px 12px',
                          borderRadius: '12px',
                          border: '1.5px solid #CBD5E1',
                          fontFamily: 'Space Grotesk, sans-serif',
                          fontSize: '16px',
                          fontWeight: '600',
                          color: '#0F172A',
                          boxSizing: 'border-box'
                        }}
                      />
                    </div>

                    {customInquiryState.error && (
                      <div style={{ fontSize: '12px', color: '#DC2626', fontWeight: '700' }}>
                        {customInquiryState.error}
                      </div>
                    )}

                    <button
                      type="submit"
                      disabled={customInquiryState.isSubmitting}
                      style={{
                        width: '100%',
                        background: '#0F172A',
                        color: '#FFFFFF',
                        border: 'none',
                        padding: '13px',
                        borderRadius: '14px',
                        fontFamily: 'League Spartan, sans-serif',
                        fontSize: '15px',
                        fontWeight: '800',
                        cursor: customInquiryState.isSubmitting ? 'wait' : 'pointer',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        gap: '8px',
                        boxShadow: '0 4px 14px rgba(15, 23, 42, 0.25)'
                      }}
                    >
                      <Send size={15} color="#FFFFFF" />
                      <span>{customInquiryState.isSubmitting ? 'Sending Inquiry...' : 'Send Custom Route Inquiry to Admin'}</span>
                    </button>

                    <div style={{ textAlign: 'center', fontSize: '12px', color: '#64748B', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '6px' }}>
                      <Phone size={13} color="#64748B" />
                      <span>Need instant booking? Call Admin:</span>
                      <a href="tel:+917226844108" style={{ color: '#0F172A', fontWeight: '700', textDecoration: 'none' }}>+91 7226844108</a>
                    </div>
                  </form>
                )}
              </div>
            )}

            {/* Direct Routes List */}
            <div>
              <h3 style={{ fontFamily: 'League Spartan', fontSize: '16px', fontWeight: '800', color: '#0F172A', margin: '0 0 12px 0' }}>
                Available Direct Routes
              </h3>
              {sortedRoutes.length === 0 ? (
                <div style={{
                  padding: '24px 16px',
                  textAlign: 'center',
                  background: '#FFFFFF',
                  borderRadius: '20px',
                  border: '1.5px dashed #CBD5E1',
                  color: '#64748B',
                  fontSize: '13px',
                  fontWeight: '600'
                }}>
                  No direct routes currently configured in database. You can search any custom pickup and dropoff above.
                </div>
              ) : (
                <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
                {sortedRoutes.map((route, idx) => {
                  const isSelected = pickupLoc.trim().toLowerCase() === (route.pickup || '').trim().toLowerCase() &&
                                     dropoffLoc.trim().toLowerCase() === (route.dropoff || '').trim().toLowerCase();
                  const baseP = Number(route.price) || 0;
                  let carPriceVals = [];
                  if (route.car_prices && typeof route.car_prices === 'object') {
                    carPriceVals = Object.values(route.car_prices).map(Number).filter(v => v > 0);
                  }
                  const startingPrice = baseP > 0 ? (carPriceVals.length > 0 ? Math.min(baseP, ...carPriceVals) : baseP) : (carPriceVals.length > 0 ? Math.min(...carPriceVals) : null);

                  return (
                    <div 
                      key={route.id || idx} 
                      style={{ 
                        padding: '16px', 
                        background: isSelected ? '#F0FDF4' : '#FFFFFF', 
                        borderRadius: '20px', 
                        border: isSelected ? '2px solid #10B981' : '1.5px solid #E2E8F0', 
                        boxShadow: isSelected ? '0 6px 18px rgba(52, 211, 153, 0.25)' : '0 2px 10px rgba(0,0,0,0.03)', 
                        cursor: 'pointer',
                        transition: 'all 0.2s ease',
                        position: 'relative'
                      }}
                      onClick={() => handleSelectRoute(route)}
                    >
                      {isSelected && (
                        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '8px' }}>
                          <span style={{ fontSize: '11px', fontWeight: '800', color: '#047857', background: '#D1FAE5', border: '1px solid #A7F3D0', padding: '2px 8px', borderRadius: '6px', letterSpacing: '0.5px' }}>
                            TOP 1 MATCHED ROUTE
                          </span>
                          <span style={{ fontSize: '12px', fontWeight: '800', color: '#059669', display: 'flex', alignItems: 'center', gap: '4px' }}>
                            <CheckCircle size={14} color="#10B981" />
                            Selected
                          </span>
                        </div>
                      )}
                      <div style={{ display: 'flex', gap: '12px', alignItems: 'center', justifyContent: 'space-between' }}>
                        <div style={{ display: 'flex', gap: '12px', alignItems: 'center', flex: 1 }}>
                          <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '4px' }}>
                            <span style={{ width: '10px', height: '10px', borderRadius: '50%', background: '#22C55E' }}></span>
                            <div style={{ width: '2px', height: '18px', background: '#CBD5E1' }}></div>
                            <span style={{ width: '10px', height: '10px', borderRadius: '50%', background: '#EF4444' }}></span>
                          </div>
                          <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
                            <div style={{ fontSize: '14px', fontWeight: '700', color: '#0F172A', fontFamily: 'Space Grotesk, sans-serif' }}>{route.pickup}</div>
                            <div style={{ fontSize: '14px', fontWeight: '700', color: '#0F172A', fontFamily: 'Space Grotesk, sans-serif' }}>{route.dropoff}</div>
                          </div>
                        </div>

                        {/* Price & Duration Badge */}
                        <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'flex-end', gap: '4px' }}>
                          {startingPrice && (
                            <div style={{
                              background: '#ECFDF5',
                              color: '#047857',
                              padding: '4px 10px',
                              borderRadius: '10px',
                              fontFamily: 'League Spartan, sans-serif',
                              fontSize: '15px',
                              fontWeight: '800',
                              border: '1px solid #A7F3D0',
                              whiteSpace: 'nowrap'
                            }}>
                              From ₹{startingPrice.toLocaleString('en-IN')}
                            </div>
                          )}
                          {route.duration && (
                            <span style={{ fontSize: '11px', color: '#64748B', fontWeight: '600', display: 'flex', alignItems: 'center', gap: '4px' }}>
                              <Clock size={12} color="#64748B" />
                              {route.duration}
                            </span>
                          )}
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
              )}
            </div>
          </div>
        )}

        {/* MODE 2: CUSTOM OUTSTATION & MULTI-CITY TRIP (CLEAN LIGHT CORPORATE UI WITH DYNAMIC SEARCH & KM ACCURACY) */}
        {mode === 'custom' && (
          <div>
            {/* HERO CARD */}
            <div style={{
              background: '#FFFFFF',
              borderRadius: '24px',
              padding: '20px',
              border: '1.5px solid #E2E8F0',
              marginBottom: '20px',
              boxShadow: '0 4px 20px rgba(0,0,0,0.04)',
              position: 'relative'
            }}>
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '10px' }}>
                <span style={{ background: '#ECFDF5', color: '#047857', border: '1px solid #A7F3D0', padding: '4px 12px', borderRadius: '20px', fontSize: '11px', fontWeight: '800', letterSpacing: '0.5px', textTransform: 'uppercase' }}>
                  Round Trip Journey
                </span>
                <Sparkles size={20} color="#10B981" />
              </div>
              <h3 style={{ margin: '0 0 6px 0', fontFamily: 'League Spartan', fontSize: '20px', fontWeight: '800', color: '#0F172A', lineHeight: 1.2 }}>
                Round Trip & Multi-City Tour
              </h3>
              <p style={{ margin: 0, fontSize: '13px', color: '#64748B', lineHeight: 1.4 }}>
                Specify your exact pickup & dropoff cities, villages, door-to-door locations, and number of days.
              </p>
            </div>

            {/* CITIES & LOCATIONS FORM CARD */}
            <div style={{ 
              background: '#FFFFFF', 
              borderRadius: '24px', 
              padding: '20px', 
              boxShadow: '0 4px 20px rgba(0,0,0,0.04)', 
              border: '1.5px solid #E2E8F0',
              marginBottom: '20px'
            }}>
              {/* PICKUP & DROPOFF CITY GRID */}
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px', marginBottom: '16px' }}>
                {/* Pickup City */}
                <div style={{ position: 'relative' }}>
                  <label style={{ fontSize: '11px', fontWeight: '800', color: '#475569', display: 'block', marginBottom: '6px', letterSpacing: '0.5px' }}>
                    PICKUP CITY / VILLAGE
                  </label>
                  <input
                    type="text"
                    placeholder="Type city or village (e.g. saand)..."
                    value={cPickupCity}
                    onChange={(e) => setCPickupCity(e.target.value)}
                    onFocus={() => setActiveDropdown('pickupCity')}
                    style={{
                      width: '100%',
                      padding: '12px',
                      borderRadius: '14px',
                      border: '1.5px solid #CBD5E1',
                      fontFamily: 'Space Grotesk, sans-serif',
                      fontSize: '16px',
                      fontWeight: '700',
                      color: '#0F172A',
                      background: '#F8FAFC',
                      outline: 'none',
                      boxSizing: 'border-box'
                    }}
                  />
                  {activeDropdown === 'pickupCity' && (
                    <div style={{ position: 'absolute', top: '100%', left: 0, right: 0, zIndex: 50, background: '#FFFFFF', border: '1.5px solid #CBD5E1', borderRadius: '14px', boxShadow: '0 12px 32px rgba(0,0,0,0.15)', maxHeight: '200px', overflowY: 'auto', marginTop: '4px' }}>
                      {/* Option to use exact typed text if custom */}
                      {cPickupCity.trim() !== '' && (
                        <div
                          onClick={() => setActiveDropdown(null)}
                          style={{ padding: '10px 14px', fontSize: '13px', fontWeight: '700', color: '#059669', background: '#ECFDF5', borderBottom: '1px solid #A7F3D0', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '8px' }}
                        >
                          <Sparkles size={14} color="#10B981" />
                          <span>Use Location: "<strong>{cPickupCity}</strong>"</span>
                        </div>
                      )}

                      {getFilteredCities(cPickupCity).map((city, idx) => (
                        <div
                          key={idx}
                          onClick={() => {
                            setCPickupCity(city);
                            if (!cPickupAddress || cPickupAddress === 'Bhavnagar, Gujarat') {
                              setCPickupAddress(`${city}, Gujarat`);
                            }
                            setActiveDropdown(null);
                          }}
                          style={{ padding: '10px 14px', fontSize: '13px', fontWeight: '700', color: '#0F172A', borderBottom: '1px solid #F1F5F9', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '8px' }}
                        >
                          <MapPin size={14} color="#10B981" />
                          <span>{city}</span>
                        </div>
                      ))}
                    </div>
                  )}
                </div>

                {/* Dropoff City */}
                <div style={{ position: 'relative' }}>
                  <label style={{ fontSize: '11px', fontWeight: '800', color: '#475569', display: 'block', marginBottom: '6px', letterSpacing: '0.5px' }}>
                    DROPOFF CITY / VILLAGE
                  </label>
                  <input
                    type="text"
                    placeholder="Type city or village (e.g. manipuri)..."
                    value={cDropoffCity}
                    onChange={(e) => setCDropoffCity(e.target.value)}
                    onFocus={() => setActiveDropdown('dropoffCity')}
                    style={{
                      width: '100%',
                      padding: '12px',
                      borderRadius: '14px',
                      border: '1.5px solid #CBD5E1',
                      fontFamily: 'Space Grotesk, sans-serif',
                      fontSize: '16px',
                      fontWeight: '700',
                      color: '#0F172A',
                      background: '#F8FAFC',
                      outline: 'none',
                      boxSizing: 'border-box'
                    }}
                  />
                  {activeDropdown === 'dropoffCity' && (
                    <div style={{ position: 'absolute', top: '100%', left: 0, right: 0, zIndex: 50, background: '#FFFFFF', border: '1.5px solid #CBD5E1', borderRadius: '14px', boxShadow: '0 12px 32px rgba(0,0,0,0.15)', maxHeight: '200px', overflowY: 'auto', marginTop: '4px' }}>
                      {/* Option to use exact typed text if custom */}
                      {cDropoffCity.trim() !== '' && (
                        <div
                          onClick={() => setActiveDropdown(null)}
                          style={{ padding: '10px 14px', fontSize: '13px', fontWeight: '700', color: '#059669', background: '#ECFDF5', borderBottom: '1px solid #A7F3D0', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '8px' }}
                        >
                          <Sparkles size={14} color="#10B981" />
                          <span>Use Destination: "<strong>{cDropoffCity}</strong>"</span>
                        </div>
                      )}

                      {getFilteredCities(cDropoffCity).map((city, idx) => (
                        <div
                          key={idx}
                          onClick={() => {
                            setCDropoffCity(city);
                            if (!cDropoffAddress || cDropoffAddress === 'Ahmedabad Airport (AMD)') {
                              setCDropoffAddress(`${city}, Main Location`);
                            }
                            setActiveDropdown(null);
                          }}
                          style={{ padding: '10px 14px', fontSize: '13px', fontWeight: '700', color: '#0F172A', borderBottom: '1px solid #F1F5F9', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '8px' }}
                        >
                          <MapPin size={14} color="#EF4444" />
                          <span>{city}</span>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              </div>

              {/* ACTUAL DETAILED PICKUP LOCATION */}
              <div style={{ marginBottom: '14px' }}>
                <label style={{ fontSize: '11px', fontWeight: '800', color: '#475569', display: 'block', marginBottom: '6px', letterSpacing: '0.5px' }}>
                  ACTUAL DETAILED PICKUP LOCATION
                </label>
                <input
                  type="text"
                  placeholder="e.g. House 14, Waghawadi Road, near Circle"
                  value={cPickupAddress}
                  onChange={(e) => setCPickupAddress(e.target.value)}
                  style={{
                    width: '100%',
                    padding: '12px 14px',
                    borderRadius: '14px',
                    border: '1.5px solid #CBD5E1',
                    fontFamily: 'Space Grotesk, sans-serif',
                    fontSize: '16px',
                    fontWeight: '600',
                    color: '#0F172A',
                    background: '#F8FAFC',
                    outline: 'none',
                    boxSizing: 'border-box'
                  }}
                />
              </div>

              {/* ACTUAL DETAILED DROPOFF LOCATION */}
              <div style={{ marginBottom: '16px' }}>
                <label style={{ fontSize: '11px', fontWeight: '800', color: '#475569', display: 'block', marginBottom: '6px', letterSpacing: '0.5px' }}>
                  ACTUAL DETAILED DROPOFF LOCATION
                </label>
                <input
                  type="text"
                  placeholder="e.g. Terminal 2, Airport or Main Chowk"
                  value={cDropoffAddress}
                  onChange={(e) => setCDropoffAddress(e.target.value)}
                  style={{
                    width: '100%',
                    padding: '12px 14px',
                    borderRadius: '14px',
                    border: '1.5px solid #CBD5E1',
                    fontFamily: 'Space Grotesk, sans-serif',
                    fontSize: '16px',
                    fontWeight: '600',
                    color: '#0F172A',
                    background: '#F8FAFC',
                    outline: 'none',
                    boxSizing: 'border-box'
                  }}
                />
              </div>

              {/* NUMBER OF DAYS STEPPER CONTROL */}
              <div style={{
                background: '#F8FAFC',
                border: '1.5px solid #E2E8F0',
                borderRadius: '18px',
                padding: '14px 16px',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'space-between'
              }}>
                <div>
                  <span style={{ fontSize: '11px', fontWeight: '800', color: '#475569', display: 'block', textTransform: 'uppercase', letterSpacing: '0.5px' }}>
                    TRIP DURATION
                  </span>
                  <span style={{ fontSize: '15px', fontWeight: '800', color: '#0F172A', fontFamily: 'League Spartan, sans-serif' }}>
                    {cDays} {cDays === 1 ? 'Day Rental' : 'Days Rental'}
                  </span>
                </div>

                <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                  <button
                    type="button"
                    onClick={() => setCDays(Math.max(1, cDays - 1))}
                    style={{
                      width: '38px',
                      height: '38px',
                      borderRadius: '12px',
                      border: '1.5px solid #CBD5E1',
                      background: '#FFFFFF',
                      color: '#0F172A',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      cursor: 'pointer',
                      boxShadow: '0 2px 4px rgba(0,0,0,0.05)'
                    }}
                  >
                    <Minus size={18} />
                  </button>

                  <span style={{ fontSize: '18px', fontWeight: '800', color: '#0F172A', minWidth: '24px', textAlign: 'center', fontFamily: 'League Spartan, sans-serif' }}>
                    {cDays}
                  </span>

                  <button
                    type="button"
                    onClick={() => setCDays(cDays + 1)}
                    style={{
                      width: '38px',
                      height: '38px',
                      borderRadius: '12px',
                      border: 'none',
                      background: '#10B981',
                      color: '#FFFFFF',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      cursor: 'pointer',
                      boxShadow: '0 4px 12px rgba(16,185,129,0.3)'
                    }}
                  >
                    <Plus size={18} />
                  </button>
                </div>
              </div>
            </div>

            {/* DYNAMIC ROUTE SUMMARY BADGE */}
            {isCustomReady && (
              <div style={{
                background: '#ECFDF5',
                border: '1.5px solid #A7F3D0',
                borderRadius: '18px',
                padding: '14px 16px',
                marginBottom: '20px',
                boxShadow: '0 4px 14px rgba(16,185,129,0.1)'
              }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '4px' }}>
                  <CheckCircle size={20} color="#10B981" />
                  <span style={{ fontSize: '15px', fontWeight: '800', color: '#047857', fontFamily: 'League Spartan, sans-serif' }}>
                    {cPickupCity} ➔ {cDropoffCity} ({cDays} Day{cDays > 1 ? 's' : ''})
                  </span>
                </div>
                <div style={{ fontSize: '12px', color: '#065F46', fontWeight: '600', lineHeight: 1.4 }}>
                  Custom itinerary specified. Proceed to select your fleet vehicle.
                </div>
              </div>
            )}
          </div>
        )}
      </div>

      {/* STICKY BOTTOM BUTTON */}
      <div style={{ 
        position: 'fixed', 
        bottom: 0, 
        left: 0, 
        right: 0, 
        padding: '16px 20px', 
        background: '#FFFFFF', 
        borderTop: '1px solid #E2E8F0', 
        boxShadow: '0 -6px 20px rgba(0,0,0,0.06)', 
        zIndex: 100 
      }}>
        {mode === 'standard' ? (
          <button 
            style={{
              width: '100%',
              background: isStandardReady 
                ? 'linear-gradient(135deg, #6EE7B7 0%, #34D399 100%)' 
                : '#E2E8F0',
              color: isStandardReady ? '#FFFFFF' : '#94A3B8',
              border: 'none',
              padding: '16px',
              borderRadius: '18px',
              fontFamily: 'League Spartan, sans-serif',
              fontSize: '18px',
              fontWeight: '800',
              cursor: isStandardReady ? 'pointer' : 'not-allowed',
              boxShadow: isStandardReady ? '0 8px 24px rgba(110, 231, 183, 0.4)' : 'none',
              transition: 'all 0.2s ease',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              gap: '8px'
            }}
            disabled={!isStandardReady}
            onClick={handleProceedStandard}
          >
            {(!pickupLoc || !pickupLoc.trim() || !dropoffLoc || !dropoffLoc.trim()) 
              ? 'Select Pickup & Destination'
              : !isDirectRouteAvailable
                ? 'Route Not In Direct Roster — Send Inquiry Above'
                : 'Confirm Route & Schedule Trip →'}
          </button>
        ) : (
          <button 
            style={{
              width: '100%',
              background: isCustomReady 
                ? 'linear-gradient(135deg, #6EE7B7 0%, #34D399 100%)' 
                : '#E2E8F0',
              color: isCustomReady ? '#FFFFFF' : '#94A3B8',
              border: 'none',
              padding: '16px',
              borderRadius: '18px',
              fontFamily: 'League Spartan, sans-serif',
              fontSize: '18px',
              fontWeight: '800',
              cursor: isCustomReady ? 'pointer' : 'not-allowed',
              boxShadow: isCustomReady ? '0 8px 24px rgba(52, 211, 153, 0.4)' : 'none',
              transition: 'all 0.2s ease',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              gap: '8px'
            }}
            disabled={!isCustomReady}
            onClick={handleProceedCustom}
          >
            {isCustomReady ? 'Continue to Select Fleet Car →' : 'Fill Pickup & Dropoff Details'}
          </button>
        )}
      </div>
    </div>
  );
}
