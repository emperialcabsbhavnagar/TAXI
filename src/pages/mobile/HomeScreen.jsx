import React, { useState, useEffect, useRef } from 'react';
import InteractiveMap from '../../components/InteractiveMap';
import { getCoordsForPlace, generateRoutePolyline, calculateDistanceKm, estimateEtaMins } from '../../utils/locationCoords';
import BottomNavBar from '../../components/BottomNavBar';
import { getBestLiveLocation, watchLiveLocation, reverseGeocodeCoords } from '../../services/liveLocationService';
import { db } from '../../services/dbService';
import { getCustomerNotifications } from '../../services/notificationEngine';
import { loadAllInquiriesFromMySQL } from '../../services/mysqlService';
import { RotateCcw, User, Bell, CheckCircle2, XCircle, Clock3, Gift, MapPin, ArrowRight, X, Car, ShieldCheck, Star, Sparkles, Award, ChevronUp, ChevronDown } from 'lucide-react';

export default function HomeScreen({ activeTab, setActiveTab, onStartBooking, onOpenTracking }) {
  // Load saved profile from localStorage
  const userProfile = React.useMemo(() => {
    try {
      const saved = localStorage.getItem('cabsy_user_profile');
      return saved ? JSON.parse(saved) : null;
    } catch (e) { return null; }
  }, []);

  const userName = userProfile?.name || 'Rider';
  const userPhoto = userProfile?.photoURL || null;

  // Time-based greeting
  const greeting = React.useMemo(() => {
    const h = new Date().getHours();
    if (h < 12) return 'Good Morning';
    if (h < 17) return 'Good Afternoon';
    return 'Good Evening';
  }, []);

  const [customerAddress, setCustomerAddress] = useState('Locating address...');
  const [userCoords, setUserCoords] = useState({ lat: 21.7645, lng: 72.1519 });
  const [isLocating, setIsLocating] = useState(true);

  // Active Ride Live Sync & Completed Trip Detection
  const [activeRide, setActiveRide] = useState(null);
  const [completedModal, setCompletedModal] = useState(null);
  const [driverRating, setDriverRating] = useState(5);
  const prevActiveRideIdRef = useRef(null);

  useEffect(() => {
    const checkActiveRide = async () => {
      try {
        const userProfRaw = localStorage.getItem('cabsy_user_profile');
        const userProf = userProfRaw ? JSON.parse(userProfRaw) : null;
        const uPhone = (userProf?.phone || localStorage.getItem('cabsy_user_phone') || '').replace(/\D/g, '');
        const uEmail = (userProf?.email || '').toLowerCase().trim();

        // 1. Fetch remote inquiries from Hostinger MySQL for instant multi-device sync
        let list = [];
        try {
          const remoteInqs = await loadAllInquiriesFromMySQL().catch(() => []);
          if (Array.isArray(remoteInqs) && remoteInqs.length > 0) {
            list = remoteInqs;
            localStorage.setItem('cabsy_inquiries', JSON.stringify(remoteInqs));
          }
        } catch (e) {}

        if (list.length === 0) {
          const saved = localStorage.getItem('cabsy_inquiries');
          if (saved) {
            const parsed = JSON.parse(saved);
            if (Array.isArray(parsed)) list = parsed;
          }
        }

        // 2. Check for newly completed trip to present official receipt modal
        const lastCompletedRaw = localStorage.getItem('EMPERIAL CABS_last_completed_trip');
        if (lastCompletedRaw) {
          try {
            const parsedLast = JSON.parse(lastCompletedRaw);
            if (parsedLast && parsedLast.id && !parsedLast.dismissed) {
              setCompletedModal(parsedLast);
            }
          } catch(e) {}
        }

        // 3. Find active ride (In Progress, On Ride, Started)
        const activeStatuses = ['In Progress', 'On Ride', 'Started'];
        const matchedRide = (!uPhone && !uEmail) ? null : list.find(i => {
          if (!i) return false;
          const iPhone = i.customerPhone ? String(i.customerPhone).replace(/\D/g, '') : '';
          const iEmail = i.customerEmail ? String(i.customerEmail).toLowerCase().trim() : '';

          const isMatch = (uPhone && iPhone && uPhone.slice(-10) === iPhone.slice(-10)) ||
                          (uEmail && iEmail && uEmail === iEmail);

          const statusStr = String(i.status || '');
          return isMatch && activeStatuses.some(s => statusStr.toLowerCase() === s.toLowerCase());
        });

        if (matchedRide) {
          setActiveRide(matchedRide);
          prevActiveRideIdRef.current = matchedRide.id;
          return;
        } else {
          // If active ride ended, check if it was marked Completed in list
          if (prevActiveRideIdRef.current) {
            const completedTrip = list.find(i => (i.id === prevActiveRideIdRef.current || i.status === 'Completed') && !i.dismissed);
            if (completedTrip) {
              setCompletedModal(completedTrip);
              localStorage.setItem('EMPERIAL CABS_last_completed_trip', JSON.stringify(completedTrip));
            }
            prevActiveRideIdRef.current = null;
          }
          setActiveRide(null);
        }
      } catch (e) {
        console.warn("Check active ride notice:", e);
      }
    };

    checkActiveRide();

    // 1.5-second live polling interval for Zomato-style map refresh
    const pollInterval = setInterval(checkActiveRide, 1500);

    // Cross-tab real-time BroadcastChannel
    let bc = null;
    try {
      if ('BroadcastChannel' in window) {
        bc = new BroadcastChannel('EMPERIAL CABS_realtime_sync');
        bc.onmessage = (msg) => {
          if (msg.data?.type === 'TRIP_STARTED') {
            checkActiveRide();
          } else if (msg.data?.type === 'TRIP_COMPLETED' && msg.data?.data) {
            setCompletedModal(msg.data.data);
            setActiveRide(null);
          } else if (msg.data?.type === 'CUSTOMER_NOTIFICATION' && msg.data?.data) {
            loadNotifs();
          } else {
            checkActiveRide();
          }
        };
      }
    } catch (e) {}

    const handleTripCompletedEvent = (e) => {
      if (e.detail) setCompletedModal(e.detail);
      checkActiveRide();
    };

    window.addEventListener('storage', checkActiveRide);
    window.addEventListener('EMPERIAL CABS_trip_started', checkActiveRide);
    window.addEventListener('EMPERIAL CABS_trip_completed', handleTripCompletedEvent);
    window.addEventListener('EMPERIAL CABS_db_sync', checkActiveRide);
    window.addEventListener('cabsy-new-inquiry', checkActiveRide);

    return () => {
      clearInterval(pollInterval);
      if (bc) bc.close();
      window.removeEventListener('storage', checkActiveRide);
      window.removeEventListener('EMPERIAL CABS_trip_started', checkActiveRide);
      window.removeEventListener('EMPERIAL CABS_trip_completed', handleTripCompletedEvent);
      window.removeEventListener('EMPERIAL CABS_db_sync', checkActiveRide);
      window.removeEventListener('cabsy-new-inquiry', checkActiveRide);
    };
  }, []);

  // Route line & pickup position start directly from the user's real live GPS location
  const activePickupPos = activeRide 
    ? (userCoords && typeof userCoords.lat === 'number' && !isNaN(userCoords.lat) ? userCoords : getCoordsForPlace(activeRide.pickup || activeRide.pickupLoc, { lat: 21.7645, lng: 72.1519 }))
    : null;
  const activeDestPos = activeRide ? getCoordsForPlace(activeRide.dropoff || activeRide.dropoffLoc, userCoords) : null;
  const activePolyline = (activePickupPos && activeDestPos) ? generateRoutePolyline(activePickupPos, activeDestPos) : [];

  // Live GPS Distance & ETA Calculation on Home Screen Map
  const currentLivePos = userCoords || activePickupPos || { lat: 21.7645, lng: 72.1519 };
  const realDistKmNum = (activeDestPos && currentLivePos) ? calculateDistanceKm(currentLivePos.lat, currentLivePos.lng, activeDestPos.lat, activeDestPos.lng) : 0;
  const displayDistKm = realDistKmNum > 0 ? realDistKmNum.toFixed(1) : "0.0";
  const totalMinsLeft = Math.max(1, estimateEtaMins(realDistKmNum));
  const hoursLeft = Math.floor(totalMinsLeft / 60);
  const minsLeft = totalMinsLeft % 60;
  const etaTimeStr = hoursLeft > 0 ? `${hoursLeft}h ${minsLeft}m` : `${minsLeft}m`;
  const arrivalDate = new Date(Date.now() + totalMinsLeft * 60000);
  const arrivalTimeFormatted = arrivalDate.toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit', hour12: true });

  const handleExitRide = () => {
    try {
      const saved = localStorage.getItem('cabsy_inquiries');
      if (saved) {
        const list = JSON.parse(saved);
        const updated = list.map(i => {
          if (i.status === 'Confirmed' || i.status === 'In Progress' || i.status === 'On Ride') {
            return { ...i, status: 'Completed' };
          }
          return i;
        });
        localStorage.setItem('cabsy_inquiries', JSON.stringify(updated));
        window.dispatchEvent(new Event('storage'));
        window.dispatchEvent(new Event('EMPERIAL CABS_trip_started'));
      }
    } catch (e) {}
    setActiveRide(null);
  };

  // Notification Modal State & Live Updates
  const [isNotifOpen, setIsNotifOpen] = useState(false);
  const [userNotifs, setUserNotifs] = useState([]);

  useEffect(() => {
    const loadNotifs = () => {
      const notifs = [];

      // 1. Direct Push Notifications from Admin / Engine
      const directNotifs = getCustomerNotifications(userProfile?.phone, userProfile?.email);
      if (directNotifs && directNotifs.length > 0) {
        directNotifs.forEach(dn => {
          let icon = '🔔';
          if (dn.type === 'reward') icon = '🎁';
          else if (dn.type === 'trip_started') icon = '▶';
          else if (dn.type === 'trip_completed') icon = '🏁';
          else if (dn.type === 'confirmed') icon = '✅';
          else if (dn.type === 'cancelled') icon = '❌';

          notifs.push({
            id: dn.id,
            type: dn.type || 'inquiry',
            icon,
            title: dn.title,
            desc: dn.desc || dn.body,
            time: dn.time || 'Just now',
            read: dn.read || false
          });
        });
      }

      try {
        const inquiries = db.getInquiries();
        const userInquiries = inquiries.filter(i => 
          (userProfile?.phone && i.customerPhone === userProfile.phone) ||
          (userProfile?.email && i.customerEmail === userProfile.email) ||
          (userProfile?.name && i.customerName?.toLowerCase() === userProfile.name?.toLowerCase())
        );

        if (userInquiries.length > 0) {
          userInquiries.forEach(inq => {
            if (inq.status === 'Confirmed' && !notifs.some(n => n.id === `inq-conf-${inq.id}`)) {
              notifs.push({
                id: `inq-conf-${inq.id}`,
                type: 'inquiry',
                icon: '🎉',
                title: `Booking Confirmed (${inq.id})`,
                desc: `Your trip from ${inq.pickup} to ${inq.dropoff} is confirmed! Driver: ${inq.driver || 'Assigned'}`,
                time: inq.date || 'Today',
                read: false
              });
            } else if (inq.status === 'Pending' && !notifs.some(n => n.id === `inq-pend-${inq.id}`)) {
              notifs.push({
                id: `inq-pend-${inq.id}`,
                type: 'inquiry',
                icon: '⏳',
                title: `Ride Inquiry Pending (${inq.id})`,
                desc: `Inquiry for ${inq.vehicle} (₹${inq.fare}) is under review by EMPERIAL CABS dispatchers.`,
                time: inq.date || 'Just now',
                read: false
              });
            }
          });
        }
      } catch (e) {}

      notifs.push({
        id: 'sys-gps',
        type: 'system',
        icon: '📍',
        title: 'GPS Live Location Active',
        desc: `Current pickup spot set near ${customerAddress}`,
        time: 'Active Now',
        read: true
      });

      setUserNotifs(notifs);
    };

    loadNotifs();

    window.addEventListener('storage', loadNotifs);
    window.addEventListener('EMPERIAL CABS_ride_booked', loadNotifs);
    window.addEventListener('EMPERIAL CABS_customer_notif', loadNotifs);
    return () => {
      window.removeEventListener('storage', loadNotifs);
      window.removeEventListener('EMPERIAL CABS_ride_booked', loadNotifs);
      window.removeEventListener('EMPERIAL CABS_customer_notif', loadNotifs);
    };
  }, [customerAddress, userProfile]);

  useEffect(() => {
    try {
      const saved = localStorage.getItem('EMPERIAL CABS_user_location');
      if (saved) {
        const parsed = JSON.parse(saved);
        if (parsed && typeof parsed.lat === 'number' && typeof parsed.lng === 'number') {
          setUserCoords({ lat: parsed.lat, lng: parsed.lng });
          if (parsed.address) setCustomerAddress(parsed.address);
        }
      }
    } catch (e) {}
  }, []);

  const updateLocation = (coords, addr) => {
    setUserCoords(coords);
    if (addr) setCustomerAddress(addr);
    try {
      localStorage.setItem('EMPERIAL CABS_user_location', JSON.stringify({ lat: coords.lat, lng: coords.lng, address: addr }));
    } catch (e) {}
  };

  useEffect(() => {
    let watchId = null;

    // Fetch initial high-accuracy location via 3-Method 3-Check engine
    getBestLiveLocation().then(res => {
      if (res) {
        updateLocation({ lat: res.lat, lng: res.lng }, res.address);
        setIsLocating(false);
      }
    });

    // Start real-time watch update
    watchId = watchLiveLocation((updateRes) => {
      if (updateRes) {
        updateLocation({ lat: updateRes.lat, lng: updateRes.lng }, updateRes.address);
        setIsLocating(false);
      }
    });

    return () => {
      if (watchId !== null && navigator.geolocation) {
        navigator.geolocation.clearWatch(watchId);
      }
    };
  }, []);

  const [isSearchOpen, setIsSearchOpen] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [isSheetCollapsed, setIsSheetCollapsed] = useState(false);

  // Dynamically load places configured in Admin Portal (cabsy_places)
  const getAdminPlaces = () => {
    try {
      const savedPlaces = localStorage.getItem('cabsy_places');
      if (savedPlaces) {
        const parsed = JSON.parse(savedPlaces);
        if (Array.isArray(parsed) && parsed.length > 0) {
          return parsed.map(p => ({
            name: p,
            ...getCoordsForPlace(p, userCoords)
          }));
        }
      }
    } catch (e) {}

    return [
      { name: 'Bhavnagar Airport (BHU)', lat: 21.7523, lng: 72.1852 },
      { name: 'Takhteshwar Temple, Bhavnagar', lat: 21.7565, lng: 72.1456 },
      { name: 'Alkapuri, Vadodara', lat: 22.3106, lng: 73.1670 },
      { name: 'Ahmedabad Airport (AMD)', lat: 23.0772, lng: 72.6347 },
      { name: 'Mumbai Central, Maharashtra', lat: 19.0760, lng: 72.8777 }
    ];
  };

  const [adminPlacesList, setAdminPlacesList] = useState(getAdminPlaces);

  useEffect(() => {
    setAdminPlacesList(getAdminPlaces());
  }, [isSearchOpen]);

  const filteredLocations = adminPlacesList.filter(loc => 
    loc.name.toLowerCase().includes(searchQuery.toLowerCase())
  );

  return (
    <div className="real-mobile-app">
      <div className="full-homescreen-map-wrapper">
        <div className="live-map-viewport" style={{ position: 'relative', overflow: 'hidden' }}>
          {/* Leaflet Interactive Map */}
          <InteractiveMap
            center={activePickupPos || userCoords}
            zoom={activeRide ? 11 : 15}
            userLabel={activeRide ? (activeRide.pickup || "Pickup Point") : "Your Live Spot"}
            destination={activeDestPos}
            activeDriverPos={activePickupPos}
            routePolyline={activePolyline}
            onUserLocationChange={(newCoords) => {
              updateLocation(newCoords, `Pinned Spot (${newCoords.lat.toFixed(4)}, ${newCoords.lng.toFixed(4)})`);
            }}
          />

          {/* Floating Top Controls */}
          <div className="map-floating-header">
            {/* Left Control: Profile Button */}
            <div 
              className="floating-icon-btn" 
              onClick={() => setActiveTab && setActiveTab('account')}
              title="My Account Profile"
              style={{
                background: '#FFFFFF',
                border: '1.5px solid #E2E8F0',
                padding: '6px 14px',
                borderRadius: '24px',
                fontSize: '13px',
                fontWeight: '700',
                color: '#0F172A',
                display: 'flex',
                alignItems: 'center',
                gap: '6px',
                cursor: 'pointer',
                boxShadow: '0 4px 14px rgba(0,0,0,0.08)',
                width: 'auto'
              }}
            >
              <div style={{ width: '24px', height: '24px', borderRadius: '50%', background: 'linear-gradient(135deg, #10B981 0%, #059669 100%)', color: '#FFFFFF', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0, overflow: 'hidden' }}>
                {userPhoto ? (
                  <img 
                    src={userPhoto} 
                    alt="User" 
                    onError={(e) => { e.target.style.display = 'none'; if (e.target.nextSibling) e.target.nextSibling.style.display = 'block'; }}
                    style={{ width: '24px', height: '24px', borderRadius: '50%', objectFit: 'cover' }} 
                  />
                ) : null}
                <User size={14} color="#FFFFFF" style={{ display: userPhoto ? 'none' : 'block' }} />
              </div>
              <span style={{ fontFamily: 'Space Grotesk', fontSize: '13px', fontWeight: '700', color: '#0F172A' }}>Profile</span>
            </div>

            {/* Center Control: Live GPS Indicator */}
            <div style={{ background: '#FFFFFF', padding: '6px 14px', borderRadius: '20px', boxShadow: '0 4px 14px rgba(0,0,0,0.06)', border: '1.5px solid #E2E8F0', fontFamily: 'Space Grotesk', fontSize: '13px', fontWeight: '700', color: '#0F172A', display: 'flex', alignItems: 'center', gap: '6px' }}>
              <span style={{ color: '#22C55E' }}>●</span> GPS Live
            </div>

            {/* Right Control: Notification Bell Button */}
            <div 
              className="floating-icon-btn" 
              onClick={() => {
                setIsNotifOpen(true);
                // Mark all as read when opened
                setUserNotifs(prev => prev.map(n => ({ ...n, read: true })));
              }}
              title="Notifications & Updates"
              style={{
                position: 'relative',
                background: '#FFFFFF',
                border: '1.5px solid #E2E8F0',
                width: '44px',
                height: '44px',
                borderRadius: '50%',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                cursor: 'pointer',
                boxShadow: '0 4px 14px rgba(0,0,0,0.08)'
              }}
            >
              <Bell size={18} color="#0F172A" />
              {userNotifs.filter(n => !n.read).length > 0 && (
                <span style={{ position: 'absolute', top: '-2px', right: '-2px', background: '#EF4444', color: '#FFFFFF', fontSize: '10px', fontWeight: '800', width: '18px', height: '18px', borderRadius: '50%', display: 'flex', alignItems: 'center', justifyContent: 'center', border: '2px solid #FFFFFF' }}>
                  {userNotifs.filter(n => !n.read).length}
                </span>
              )}
            </div>
          </div>

          {/* Bottom Expandable Trip Sheet */}
          <div className={`homescreen-bottom-card ${isSheetCollapsed ? 'collapsed' : ''}`}>
            {/* Top Center Line Handle Bar (Click Trigger for Up/Down - Morphing Shape) */}
            <div 
              className="drag-handle-toggle-area"
              onClick={() => setIsSheetCollapsed(prev => !prev)}
              style={{ cursor: 'pointer', padding: '2px 0 2px 0', width: '100%', display: 'flex', justifyContent: 'center', alignItems: 'center', userSelect: 'none' }}
              title="Click top center line to collapse/expand"
            >
              <svg width="40" height="10" viewBox="0 0 40 10" style={{ display: 'block' }}>
                <path 
                  d={isSheetCollapsed ? "M 8 8 L 20 2 L 32 8" : "M 8 2 L 20 8 L 32 2"} 
                  stroke="#64748B" 
                  strokeWidth="3.5" 
                  strokeLinecap="round" 
                  strokeLinejoin="round" 
                  fill="none" 
                  style={{ transition: 'all 0.3s cubic-bezier(0.16, 1, 0.3, 1)' }}
                />
              </svg>
            </div>

            {/* ACTIVE RIDE LIVE CARD ON HOMESCREEN (Light Theme, No Buttons) */}
            {activeRide && (
              <div 
                style={{
                  background: '#FFFFFF',
                  borderRadius: '20px',
                  padding: '16px 20px',
                  color: '#0F172A',
                  marginBottom: '16px',
                  boxShadow: '0 4px 16px rgba(0,0,0,0.06)',
                  border: '1.5px solid #E2E8F0',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'space-between'
                }}
              >
                <div>
                  <div style={{ fontSize: '26px', fontWeight: '900', color: '#16A34A', fontFamily: 'Space Grotesk, sans-serif', lineHeight: 1 }}>
                    {etaTimeStr}
                  </div>
                  <div style={{ color: '#64748B', fontSize: '13px', fontWeight: '700', marginTop: '4px', fontFamily: 'Space Grotesk, sans-serif' }}>
                    {displayDistKm} km • {arrivalTimeFormatted}
                  </div>
                </div>

                <div style={{ background: '#F1F5F9', padding: '6px 14px', borderRadius: '16px', fontSize: '12px', fontWeight: '800', color: '#0F172A', fontFamily: 'Space Grotesk, sans-serif', border: '1px solid #E2E8F0', display: 'flex', alignItems: 'center', gap: '6px' }}>
                  <span style={{ color: '#22C55E' }}>●</span> Live Ride
                </div>
              </div>
            )}

            {/* Greeting Header */}
            <div style={{ marginBottom: '14px' }}>
              <p className="home-greeting-txt" style={{ margin: 0 }}>{greeting}</p>
              <p style={{ fontFamily: 'League Spartan', fontSize: '20px', fontWeight: '800', color: '#0F172A', margin: '2px 0 0 0' }}>
                Welcome back, {userName}
              </p>
            </div>

            {/* Pickup Spot Selector Card */}
            <div 
              style={{
                background: '#F8FAFC',
                border: '1.5px solid #E2E8F0',
                borderRadius: '18px',
                padding: '14px 16px',
                display: 'flex',
                alignItems: 'center',
                gap: '12px',
                cursor: 'pointer',
                marginBottom: '16px'
              }}
              onClick={() => setIsSearchOpen(true)}
            >
              <div style={{ width: '38px', height: '38px', borderRadius: '50%', background: '#F0FDF4', border: '1px solid #BBF7D0', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '18px' }}>
                ●
              </div>
              <div style={{ flex: 1, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                <div style={{ fontSize: '11px', color: '#22C55E', fontWeight: '800', letterSpacing: '0.5px' }}>CURRENT PICKUP LOCATION</div>
                <div style={{ fontFamily: 'Space Grotesk', color: '#0F172A', fontSize: '15px', fontWeight: '700', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                  {customerAddress}
                </div>
              </div>
              <span style={{ fontSize: '16px', color: '#64748B', fontWeight: 'bold' }}>→</span>
            </div>

            {/* Primary Action Button */}
            <button 
              className="EMPERIAL CABS-btn-primary" 
              style={{ width: '100%', padding: '16px', fontSize: '18px', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '8px' }} 
              onClick={onStartBooking}
            >
              Where do you want to go?
            </button>
          </div>
        </div>
      </div>

      {/* Notifications & Live Updates Modal Overlay */}
      {isNotifOpen && (
        <div style={{ position: 'fixed', inset: 0, background: 'rgba(15, 23, 42, 0.65)', zIndex: 9999, display: 'flex', flexDirection: 'column', justifyContent: 'flex-end', backdropFilter: 'blur(4px)' }}>
          <div style={{ background: '#FFFFFF', borderTopLeftRadius: '28px', borderTopRightRadius: '28px', padding: '24px', maxHeight: '85vh', display: 'flex', flexDirection: 'column', gap: '16px' }}>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', borderBottom: '1px solid #E2E8F0', paddingBottom: '12px' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                <span style={{ fontSize: '22px' }}>🔔</span>
                <h2 style={{ fontFamily: 'League Spartan', fontSize: '22px', fontWeight: '800', color: '#0F172A', margin: 0 }}>
                  Notifications & Live Updates
                </h2>
              </div>
              <button onClick={() => setIsNotifOpen(false)} style={{ background: '#F1F5F9', border: 'none', width: '36px', height: '36px', borderRadius: '50%', fontSize: '16px', cursor: 'pointer', color: '#0F172A', fontWeight: 'bold' }}>✕</button>
            </div>

            {/* Notification List */}
            <div style={{ display: 'flex', flexDirection: 'column', gap: '12px', overflowY: 'auto', maxHeight: '420px', paddingRight: '4px' }}>
              {userNotifs.length === 0 ? (
                <div style={{ textAlign: 'center', padding: '32px 16px', color: '#64748B' }}>
                  <div style={{ fontSize: '32px', marginBottom: '8px' }}>🔔</div>
                  <p style={{ fontWeight: '700', margin: 0 }}>No new notifications</p>
                  <small>All ride updates and announcements will appear here.</small>
                </div>
              ) : (
                userNotifs.map((notif, idx) => (
                  <div 
                    key={idx}
                    style={{
                      padding: '14px 16px',
                      borderRadius: '16px',
                      background: notif.type === 'inquiry' ? '#F0FDF4' : '#F8FAFC',
                      border: `1.5px solid ${notif.type === 'inquiry' ? '#BBF7D0' : '#E2E8F0'}`,
                      display: 'flex',
                      gap: '12px',
                      alignItems: 'flex-start'
                    }}
                  >
                    <div style={{ fontSize: '20px', marginTop: '2px' }}>{notif.icon}</div>
                    <div style={{ flex: 1 }}>
                      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '2px' }}>
                        <strong style={{ fontFamily: 'Space Grotesk', fontSize: '15px', color: '#0F172A' }}>{notif.title}</strong>
                        <span style={{ fontSize: '11px', color: '#64748B', fontWeight: '600' }}>{notif.time}</span>
                      </div>
                      <p style={{ margin: '4px 0 0 0', fontSize: '13px', color: '#334155', lineHeight: '1.4' }}>{notif.desc}</p>
                    </div>
                  </div>
                ))
              )}
            </div>

            <button 
              onClick={() => setIsNotifOpen(false)}
              style={{ background: 'linear-gradient(135deg, #6EE7B7 0%, #34D399 100%)', color: '#FFFFFF', border: 'none', padding: '14px', borderRadius: '16px', fontWeight: '800', fontSize: '16px', cursor: 'pointer', marginTop: '4px', boxShadow: '0 6px 20px rgba(110, 231, 183, 0.4)' }}
            >
              Close Updates
            </button>
          </div>
        </div>
      )}

      {/* Location Search Modal Overlay */}
      {isSearchOpen && (
        <div style={{ position: 'fixed', inset: 0, background: 'rgba(15, 23, 42, 0.65)', zIndex: 9999, display: 'flex', flexDirection: 'column', justifyContent: 'flex-end', backdropFilter: 'blur(4px)' }}>
          <div style={{ background: '#FFFFFF', borderTopLeftRadius: '28px', borderTopRightRadius: '28px', padding: '24px', maxHeight: '80vh', display: 'flex', flexDirection: 'column', gap: '16px' }}>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
              <h2 style={{ fontFamily: 'League Spartan', fontSize: '20px', fontWeight: '800', color: '#0F172A', margin: 0 }}>Select Pickup Location</h2>
              <button onClick={() => setIsSearchOpen(false)} style={{ background: '#F1F5F9', border: 'none', width: '36px', height: '36px', borderRadius: '50%', fontSize: '16px', cursor: 'pointer', color: '#0F172A' }}>✕</button>
            </div>

            <input 
              type="text" 
              placeholder="Search street, locality or city..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              style={{ padding: '14px 16px', borderRadius: '14px', border: '1.5px solid #CBD5E1', outline: 'none', fontFamily: 'Space Grotesk', fontSize: '15px', fontWeight: '600' }}
            />

            <div style={{ display: 'flex', flexDirection: 'column', gap: '8px', overflowY: 'auto', maxHeight: '300px' }}>
              {filteredLocations.map((loc, i) => (
                <div 
                  key={i}
                  onClick={() => {
                    updateLocation({ lat: loc.lat, lng: loc.lng }, loc.name);
                    setIsSearchOpen(false);
                  }}
                  style={{ padding: '14px 16px', borderRadius: '14px', background: '#F8FAFC', cursor: 'pointer', border: '1px solid #E2E8F0', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}
                >
                  <span style={{ fontFamily: 'Space Grotesk', fontWeight: '700', color: '#0F172A', fontSize: '14px' }}>{loc.name}</span>
                  <span style={{ fontSize: '12px', color: '#4ADE80', fontWeight: '800' }}>Select →</span>
                </div>
              ))}
            </div>

            <button 
              onClick={() => { setIsSearchOpen(false); onStartBooking(); }}
              style={{ background: 'linear-gradient(135deg, #6EE7B7 0%, #34D399 100%)', color: '#FFFFFF', border: 'none', padding: '16px', borderRadius: '16px', fontWeight: '800', fontSize: '16px', cursor: 'pointer', marginTop: '6px', boxShadow: '0 8px 24px rgba(110, 231, 183, 0.4)' }}
            >
              Confirm Location & Continue →
            </button>
          </div>
        </div>
      )}

      {/* Multinational Big-Company Style "Trip Completed" Modal */}
      {completedModal && (() => {
        const rewardVal = Number(completedModal.rewardAmount || completedModal.rewardGiven || 0);
        const hasReward = rewardVal > 0 || (completedModal.rewardIssued && rewardVal > 0);
        
        return (
          <div style={{
            position: 'fixed', inset: 0, background: 'rgba(15, 23, 42, 0.8)', zIndex: 10000,
            display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '20px', backdropFilter: 'blur(16px)'
          }}>
            <div style={{
              background: '#FFFFFF', borderRadius: '28px', padding: '28px 24px 24px 24px', width: '100%', maxWidth: '390px',
              boxShadow: '0 25px 60px -15px rgba(0, 0, 0, 0.4)', textAlign: 'center', overflow: 'hidden', position: 'relative',
              border: '1px solid rgba(255, 255, 255, 0.6)'
            }}>
              {/* Top Banner Celebration Badge */}
              <div style={{ display: 'flex', justifyContent: 'center', marginBottom: '16px' }}>
                <div style={{
                  position: 'relative',
                  width: '76px', height: '76px', borderRadius: '50%', background: 'linear-gradient(135deg, #10B981 0%, #059669 100%)',
                  display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#FFFFFF',
                  boxShadow: '0 12px 30px rgba(16, 185, 129, 0.45)'
                }}>
                  <CheckCircle2 size={44} strokeWidth={2.5} />
                </div>
              </div>

              <h2 style={{ fontFamily: 'League Spartan, sans-serif', fontSize: '26px', fontWeight: '800', color: '#0F172A', margin: '0 0 4px 0', letterSpacing: '-0.3px' }}>
                Trip Completed!
              </h2>
              <p style={{ fontFamily: 'Space Grotesk, sans-serif', fontSize: '14px', color: '#64748B', margin: '0 0 20px 0', fontWeight: '500' }}>
                Thank you for riding with <strong style={{ color: '#0F172A' }}>EMPERIAL CABS</strong>
              </p>

              {/* Route & Driver Summary Card */}
              <div style={{ background: '#F8FAFC', border: '1px solid #E2E8F0', borderRadius: '20px', padding: '16px', textAlign: 'left', marginBottom: '16px' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '14px', borderBottom: '1px solid #E2E8F0', paddingBottom: '10px' }}>
                  <div>
                    <span style={{ fontSize: '11px', fontWeight: '800', color: '#94A3B8', textTransform: 'uppercase', letterSpacing: '0.5px' }}>Trip ID</span>
                    <div style={{ fontWeight: '800', fontSize: '14px', color: '#0F172A', fontFamily: 'Space Grotesk, sans-serif' }}>{completedModal.id || 'INQ-COMPLETED'}</div>
                  </div>
                  <div style={{ textAlign: 'right' }}>
                    <span style={{ fontSize: '11px', fontWeight: '800', color: '#94A3B8', textTransform: 'uppercase', letterSpacing: '0.5px' }}>Total Fare</span>
                    <div style={{ fontWeight: '800', fontSize: '20px', color: '#10B981', fontFamily: 'Space Grotesk, sans-serif' }}>₹{Number(completedModal.fare || 0).toFixed(2)}</div>
                  </div>
                </div>

                {/* Pickup -> Dropoff Locations Timeline */}
                <div style={{ display: 'flex', flexDirection: 'column', gap: '10px', position: 'relative', paddingLeft: '4px' }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                    <div style={{ width: '10px', height: '10px', borderRadius: '50%', background: '#10B981', flexShrink: 0, boxShadow: '0 0 0 3px rgba(16,185,129,0.15)' }}></div>
                    <span style={{ fontFamily: 'Space Grotesk, sans-serif', fontSize: '13px', fontWeight: '700', color: '#1E293B', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{completedModal.pickup || completedModal.pickupLoc || 'Pickup Location'}</span>
                  </div>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                    <div style={{ width: '10px', height: '10px', borderRadius: '50%', background: '#EF4444', flexShrink: 0, boxShadow: '0 0 0 3px rgba(239,68,68,0.15)' }}></div>
                    <span style={{ fontFamily: 'Space Grotesk, sans-serif', fontSize: '13px', fontWeight: '700', color: '#1E293B', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{completedModal.dropoff || completedModal.dropoffLoc || 'Destination'}</span>
                  </div>
                </div>

                {/* Driver & Assigned Car Details */}
                {completedModal.driver && (
                  <div style={{ marginTop: '14px', paddingTop: '12px', borderTop: '1px dashed #CBD5E1', display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: '12px' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                      <div style={{ width: '38px', height: '38px', borderRadius: '12px', background: 'linear-gradient(135deg, #0F172A 0%, #1E293B 100%)', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#34D399', flexShrink: 0 }}>
                        <Car size={20} />
                      </div>
                      <div>
                        <div style={{ fontSize: '14px', fontWeight: '800', color: '#0F172A', fontFamily: 'Space Grotesk, sans-serif' }}>Driver: {completedModal.driver}</div>
                        <div style={{ fontSize: '12px', color: '#64748B', fontWeight: '700' }}>{completedModal.vehicle || completedModal.selectedCar || 'SWIFT'}</div>
                      </div>
                    </div>
                    {(completedModal.plate || completedModal.vehiclePlate || completedModal.carPlate) && (
                      <div style={{ background: '#F59E0B', color: '#0F172A', padding: '4px 10px', borderRadius: '8px', fontWeight: '900', fontSize: '12px', fontFamily: 'Space Grotesk, sans-serif', letterSpacing: '1px', border: '1.5px solid #FFFFFF', boxShadow: '0 2px 6px rgba(0,0,0,0.1)' }}>
                        {completedModal.plate || completedModal.vehiclePlate || completedModal.carPlate}
                      </div>
                    )}
                  </div>
                )}
              </div>

              {/* REWARD SECTION — ONLY SHOWN IF REWARD WAS ISSUED & > 0 */}
              {hasReward && (
                <div style={{
                  background: 'linear-gradient(135deg, #ECFDF5 0%, #D1FAE5 100%)',
                  border: '1.5px solid #10B981',
                  borderRadius: '20px',
                  padding: '16px',
                  marginBottom: '20px',
                  textAlign: 'center',
                  boxShadow: '0 8px 20px rgba(16, 185, 129, 0.15)',
                  display: 'flex',
                  alignItems: 'center',
                  gap: '12px'
                }}>
                  <div style={{ width: '42px', height: '42px', borderRadius: '14px', background: '#10B981', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#FFFFFF', flexShrink: 0 }}>
                    <Gift size={22} />
                  </div>
                  <div style={{ textAlign: 'left', flex: 1 }}>
                    <h4 style={{ fontFamily: 'League Spartan, sans-serif', fontSize: '16px', fontWeight: '800', color: '#065F46', margin: '0 0 2px 0' }}>
                      ₹{rewardVal.toFixed(2)} Cash Reward Earned!
                    </h4>
                    <p style={{ fontFamily: 'Space Grotesk, sans-serif', fontSize: '12px', color: '#047857', margin: 0, fontWeight: '600' }}>
                      Added to your Empire Wallet balance.
                    </p>
                  </div>
                </div>
              )}

              {/* Rating Stars with Vector Star Icons */}
              <div style={{ marginBottom: '22px' }}>
                <div style={{ fontSize: '13px', fontWeight: '700', color: '#475569', marginBottom: '10px', fontFamily: 'Space Grotesk, sans-serif' }}>Rate Your Driver Experience</div>
                <div style={{ display: 'flex', justifyContent: 'center', gap: '10px' }}>
                  {[1, 2, 3, 4, 5].map((star) => (
                    <button
                      key={star}
                      type="button"
                      onClick={() => setDriverRating(star)}
                      style={{
                        background: 'none', border: 'none', padding: '4px', cursor: 'pointer',
                        color: star <= driverRating ? '#F59E0B' : '#CBD5E1', transition: 'transform 0.15s ease',
                        display: 'flex', alignItems: 'center', justifyContent: 'center'
                      }}
                    >
                      <Star size={28} fill={star <= driverRating ? '#F59E0B' : 'transparent'} strokeWidth={1.5} />
                    </button>
                  ))}
                </div>
              </div>

              {/* Action Button */}
              <button
                type="button"
                onClick={() => {
                  setCompletedModal(null);
                  localStorage.removeItem('EMPERIAL CABS_last_completed_trip');
                }}
                style={{
                  width: '100%',
                  padding: '16px',
                  borderRadius: '16px',
                  background: 'linear-gradient(135deg, #10B981 0%, #059669 100%)',
                  color: '#FFFFFF',
                  border: 'none',
                  fontFamily: 'League Spartan, sans-serif',
                  fontSize: '17px',
                  fontWeight: '800',
                  cursor: 'pointer',
                  boxShadow: '0 10px 25px rgba(16, 185, 129, 0.4)',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  gap: '8px',
                  letterSpacing: '0.5px'
                }}
              >
                <span>DONE / BOOK NEXT RIDE</span>
                <ArrowRight size={20} />
              </button>
            </div>
          </div>
        );
      })()}

      {/* Bottom Navigation Toolbar */}
      <BottomNavBar activeTab={activeTab} setActiveTab={setActiveTab} />
    </div>
  );
}
