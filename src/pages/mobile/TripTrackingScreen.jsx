import React, { useState, useEffect, useRef, useMemo } from 'react';
import InteractiveMap from '../../components/InteractiveMap';
import BottomNavBar from '../../components/BottomNavBar';
import { getCoordsForPlace, generateRoutePolyline, getCachedRoutePolyline, calculateDistanceKm, estimateEtaMins } from '../../utils/locationCoords';
import { loadAllInquiriesFromMySQL, updateInquiryStatusInMySQL } from '../../services/mysqlService';
import { sendSystemPushNotification } from '../../services/notificationEngine';
import { Geolocation } from '@capacitor/geolocation';
import { RotateCcw, CheckCircle2 } from 'lucide-react';

export default function TripTrackingScreen({ userCoords, pickupLoc, dropoffLoc, activeTab, setActiveTab, onNavigateTab, onCompleteRide, onExit }) {
  const [activeRide, setActiveRide] = useState(null);
  const [liveGpsCoords, setLiveGpsCoords] = useState(null);
  const hasCompletedRef = useRef(false);

  // 1. Sync Active Ride Data from Hostinger MySQL / localStorage (Sub-second Multi-Device Sync)
  useEffect(() => {
    const syncRide = async () => {
      try {
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

        const savedProfile = localStorage.getItem('cabsy_user_profile');
        const savedPhone = localStorage.getItem('cabsy_user_phone');
        const userProf = savedProfile ? JSON.parse(savedProfile) : null;
        const uPhone = (userProf?.phone || savedPhone || '').replace(/\D/g, '');
        const uEmail = (userProf?.email || '').toLowerCase().trim();

        const activeStatuses = ['In Progress', 'On Ride', 'Started'];
        const current = (!uPhone && !uEmail) ? null : list.find(i => {
          if (!i) return false;
          const iPhone = i.customerPhone ? String(i.customerPhone).replace(/\D/g, '') : '';
          const iEmail = i.customerEmail ? String(i.customerEmail).toLowerCase().trim() : '';
          const isMatch = (uPhone && iPhone && uPhone.slice(-10) === iPhone.slice(-10)) ||
                          (uEmail && iEmail && uEmail === iEmail);
          const statusStr = String(i.status || '');
          return isMatch && activeStatuses.some(s => statusStr.toLowerCase() === s.toLowerCase());
        });

        if (current) {
          setActiveRide(current);
        } else {
          const completed = list.find(i => {
            if (!i) return false;
            const iPhone = i.customerPhone ? String(i.customerPhone).replace(/\D/g, '') : '';
            const iEmail = i.customerEmail ? String(i.customerEmail).toLowerCase().trim() : '';
            const isMatch = (uPhone && iPhone && uPhone.slice(-10) === iPhone.slice(-10)) ||
                            (uEmail && iEmail && uEmail === iEmail);
            return isMatch && i.status === 'Completed';
          });
          if (completed && onCompleteRide) {
            onCompleteRide();
          } else if (onNavigateTab) {
            onNavigateTab('home');
          }
        }
      } catch (e) {}
    };

    syncRide();
    const interval = setInterval(syncRide, 1500); // 1.5s sub-second live Zomato-style map refresh

    window.addEventListener('storage', syncRide);
    window.addEventListener('EMPERIAL CABS_trip_started', syncRide);
    window.addEventListener('EMPERIAL CABS_trip_completed', syncRide);

    return () => {
      clearInterval(interval);
      window.removeEventListener('storage', syncRide);
      window.removeEventListener('EMPERIAL CABS_trip_started', syncRide);
      window.removeEventListener('EMPERIAL CABS_trip_completed', syncRide);
    };
  }, [onCompleteRide]);

  // 2. Battery-Efficient On-Demand GPS Location (Takes 2s snapshot and immediately shuts off GPS)
  const fetchSingleSnapshotGps = async () => {
    try {
      if (window.Capacitor?.isNativePlatform?.()) {
        const perm = await Geolocation.checkPermissions().catch(() => null);
        if (perm?.location !== 'granted') {
          await Geolocation.requestPermissions().catch(() => null);
        }
        const pos = await Geolocation.getCurrentPosition({
          enableHighAccuracy: true,
          timeout: 4000,
          maximumAge: 5000
        });
        if (pos?.coords) {
          setLiveGpsCoords({
            lat: pos.coords.latitude,
            lng: pos.coords.longitude
          });
          return;
        }
      }
    } catch (e) {}

    if (navigator.geolocation) {
      navigator.geolocation.getCurrentPosition(
        (pos) => {
          if (pos && pos.coords) {
            setLiveGpsCoords({
              lat: pos.coords.latitude,
              lng: pos.coords.longitude
            });
          }
        },
        (err) => console.warn("GPS snapshot notice:", err),
        { enableHighAccuracy: true, timeout: 4000, maximumAge: 5000 }
      );
    }
  };

  useEffect(() => {
    fetchSingleSnapshotGps();
    // Non-continuous periodic refresh every 25 seconds while tracking, turning off GPS between polls
    const interval = setInterval(fetchSingleSnapshotGps, 25000);
    return () => clearInterval(interval);
  }, []);

  const rawPickup = activeRide?.pickup || pickupLoc || "Bhavnagar, Gujarat";
  const rawDropoff = activeRide?.dropoff || dropoffLoc || "Ahmedabad Airport (AMD)";

  const actualPickup = typeof rawPickup === 'object' ? (rawPickup.label || rawPickup.name || "Bhavnagar, Gujarat") : String(rawPickup || "Bhavnagar, Gujarat");
  const actualDropoff = typeof rawDropoff === 'object' ? (rawDropoff.label || rawDropoff.name || "Ahmedabad Airport (AMD)") : String(rawDropoff || "Ahmedabad Airport (AMD)");

  const currentLivePos = liveGpsCoords || userCoords || { lat: 21.7645, lng: 72.1519 };
  const pickupPos = currentLivePos;
  const destPos = getCoordsForPlace(actualDropoff, userCoords);

  const routePolyline = useMemo(() => {
    return getCachedRoutePolyline(currentLivePos, destPos);
  }, [
    currentLivePos?.lat ? currentLivePos.lat.toFixed(3) : '',
    currentLivePos?.lng ? currentLivePos.lng.toFixed(3) : '',
    destPos?.lat ? destPos.lat.toFixed(3) : '',
    destPos?.lng ? destPos.lng.toFixed(3) : ''
  ]);

  // Real-time Live Distance & ETA calculation to Destination
  const realDistKmNum = calculateDistanceKm(currentLivePos.lat, currentLivePos.lng, destPos.lat, destPos.lng);
  const displayDistKm = realDistKmNum > 0 ? realDistKmNum.toFixed(1) : "0.0";
  
  const totalMinsLeft = Math.max(1, estimateEtaMins(realDistKmNum));
  const hoursLeft = Math.floor(totalMinsLeft / 60);
  const minsLeft = totalMinsLeft % 60;
  const etaTimeStr = hoursLeft > 0 ? `${hoursLeft}h ${minsLeft}m` : `${minsLeft}m`;

  // Arrival clock calculation based on live distance
  const arrivalDate = new Date(Date.now() + totalMinsLeft * 60000);
  const arrivalTimeFormatted = arrivalDate.toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit', hour12: true });

  const [mapCenter, setMapCenter] = useState(currentLivePos);
  useEffect(() => {
    setMapCenter(currentLivePos);
  }, [currentLivePos.lat, currentLivePos.lng]);

  // 3. Auto-Complete Trip when customer reaches destination (within 250m)
  const handleAutoCompleteRide = async () => {
    if (!activeRide || hasCompletedRef.current) return;
    hasCompletedRef.current = true;

    const finalFare = Number(activeRide.fare || activeRide.totalFareNum || 0);
    const completedRide = {
      ...activeRide,
      status: 'Completed',
      fare: finalFare,
      totalFareNum: finalFare,
      completedAt: new Date().toISOString()
    };

    // 1. Update localStorage inquiries & completed trip
    try {
      const saved = localStorage.getItem('cabsy_inquiries');
      if (saved) {
        const list = JSON.parse(saved);
        const updated = list.map(i => i.id === activeRide.id ? completedRide : i);
        localStorage.setItem('cabsy_inquiries', JSON.stringify(updated));
      }
      localStorage.setItem('EMPERIAL CABS_last_completed_trip', JSON.stringify(completedRide));
      localStorage.removeItem('EMPERIAL CABS_active_trip');
    } catch (e) {}

    // 2. Sync to Hostinger MySQL
    try {
      await updateInquiryStatusInMySQL(activeRide.id, 'Completed', activeRide.driver || 'Assigned Driver', finalFare);
    } catch (e) {}

    // 3. Dispatch global events
    window.dispatchEvent(new Event('storage'));
    window.dispatchEvent(new CustomEvent('EMPERIAL CABS_trip_completed', { detail: completedRide }));

    // 4. Send native status bar notification to phone
    sendSystemPushNotification(
      '🏁 Destination Reached - Trip Completed!',
      `You have arrived safely at ${actualDropoff}. Total Fare: ₹${finalFare}. Thank you for riding with Emperial Cabs!`,
      'completed-' + activeRide.id
    );

    // 5. Navigate to Trip Receipt screen
    if (onCompleteRide) {
      setTimeout(() => onCompleteRide(), 600);
    }
  };

  // Check geofence arrival: auto-complete when car/customer reaches destination
  useEffect(() => {
    if (!activeRide || hasCompletedRef.current) return;
    const isOngoing = activeRide.status === 'In Progress' || activeRide.status === 'On Ride';
    if (!isOngoing) return;

    // Check if within 250m (0.25 km) of destination
    if (realDistKmNum > 0 && realDistKmNum <= 0.25) {
      handleAutoCompleteRide();
    }
  }, [realDistKmNum, activeRide]);

  return (
    <div className="real-mobile-app" style={{ background: '#F8FAFC', position: 'relative', width: '100%', height: '100vh', minHeight: '100vh', overflow: 'hidden' }}>
      
      {/* 1. MAIN MAP VIEWPORT */}
      <div className="full-homescreen-map-wrapper" style={{ height: '100%', width: '100%', position: 'absolute', top: 0, left: 0 }}>
        <InteractiveMap
          center={mapCenter}
          zoom={13}
          userLabel={actualPickup}
          destination={destPos}
          activeDriverPos={currentLivePos}
          routePolyline={routePolyline}
        />
      </div>

      {/* 3. BOTTOM NAVIGATION STATUS CARD (Clean White Theme) */}
      <div style={{
        position: 'absolute',
        bottom: '64px',
        left: 0,
        right: 0,
        zIndex: 999,
        background: '#FFFFFF',
        borderTopLeftRadius: '24px',
        borderTopRightRadius: '24px',
        padding: '16px 20px',
        boxShadow: '0 -10px 30px rgba(0, 0, 0, 0.08)',
        borderTop: '1.5px solid #E2E8F0',
        color: '#0F172A'
      }}>
        <div style={{ width: '40px', height: '4px', background: '#CBD5E1', borderRadius: '4px', margin: '0 auto 12px auto' }}></div>

        {/* Assigned Driver & Car Plate Banner */}
        {activeRide && (
          <div style={{ background: '#F8FAFC', padding: '10px 14px', borderRadius: '14px', marginBottom: '14px', display: 'flex', alignItems: 'center', justifyContent: 'space-between', border: '1.5px solid #E2E8F0' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
              <div style={{ width: '38px', height: '38px', borderRadius: '10px', background: '#FEF08A', color: '#0F172A', display: 'flex', alignItems: 'center', justifyContent: 'center', fontWeight: '800', fontSize: '18px', flexShrink: 0, border: '1px solid #FDE047' }}>
                🚕
              </div>
              <div>
                <div style={{ fontSize: '14px', fontWeight: '800', color: '#0F172A', fontFamily: 'Space Grotesk, sans-serif' }}>{activeRide.driver || 'Chauffeur Assigned'}</div>
                <div style={{ fontSize: '12px', color: '#64748B', fontWeight: '600' }}>{activeRide.vehicle || activeRide.carName || activeRide.selectedCar || 'SWIFT'}</div>
              </div>
            </div>
            {(activeRide.plate || activeRide.vehiclePlate || activeRide.carPlate) && (
              <div style={{ background: '#FFFFFF', color: '#0F172A', padding: '5px 12px', borderRadius: '10px', fontWeight: '900', fontSize: '12px', fontFamily: 'Space Grotesk, sans-serif', letterSpacing: '0.8px', border: '1.5px solid #CBD5E1', display: 'inline-flex', alignItems: 'center', gap: '6px', boxShadow: '0 2px 6px rgba(0,0,0,0.04)' }}>
                🚗 {activeRide.plate || activeRide.vehiclePlate || activeRide.carPlate}
              </div>
            )}
          </div>
        )}

        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
          <div>
            <div style={{ fontSize: '28px', fontWeight: '900', color: '#16A34A', fontFamily: 'Space Grotesk, sans-serif', lineHeight: 1 }}>
              {etaTimeStr}
            </div>
            <div style={{ color: '#64748B', fontSize: '13px', fontWeight: '700', marginTop: '4px', fontFamily: 'Space Grotesk, sans-serif' }}>
              {displayDistKm} km • {arrivalTimeFormatted}
            </div>
          </div>

          <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
            <button 
              onClick={() => setMapCenter(currentLivePos)}
              style={{
                width: '44px',
                height: '44px',
                borderRadius: '50%',
                background: '#F8FAFC',
                border: '1.5px solid #E2E8F0',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                cursor: 'pointer',
                boxShadow: '0 2px 8px rgba(0,0,0,0.04)'
              }}
              title="Recentre Map"
            >
              <RotateCcw size={18} color="#0F172A" />
            </button>

            {realDistKmNum <= 0.3 ? (
              <button 
                onClick={handleAutoCompleteRide}
                style={{
                  background: '#16A34A',
                  color: '#FFFFFF',
                  border: 'none',
                  padding: '10px 18px',
                  borderRadius: '24px',
                  fontWeight: '900',
                  fontSize: '14px',
                  cursor: 'pointer',
                  display: 'flex',
                  alignItems: 'center',
                  gap: '6px',
                  boxShadow: '0 4px 16px rgba(22, 163, 74, 0.3)'
                }}
              >
                <CheckCircle2 size={16} /> Arrived (Complete)
              </button>
            ) : (
              <button 
                onClick={onExit || onCompleteRide}
                style={{
                  background: '#F1F5F9',
                  color: '#0F172A',
                  border: '1.5px solid #CBD5E1',
                  padding: '10px 20px',
                  borderRadius: '24px',
                  fontWeight: '800',
                  fontSize: '14px',
                  cursor: 'pointer',
                  boxShadow: '0 2px 8px rgba(0,0,0,0.04)'
                }}
              >
                Exit
              </button>
            )}
          </div>
        </div>
      </div>

      {/* 4. BOTTOM NAVIGATION TOOLBAR */}
      <BottomNavBar 
        activeTab={activeTab || 'rides'} 
        setActiveTab={(tab) => {
          if (onNavigateTab) {
            onNavigateTab(tab);
          } else if (setActiveTab) {
            setActiveTab(tab);
          }
        }} 
      />
    </div>
  );
}
