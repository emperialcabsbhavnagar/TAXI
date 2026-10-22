import React, { useEffect, useMemo, useRef, useState, useCallback } from 'react';
import { MapContainer, TileLayer, Marker, Popup, Polyline, useMap } from 'react-leaflet';
import L from 'leaflet';
import 'leaflet/dist/leaflet.css';
import { getCachedRoutePolyline, fetchRoadPolyline, calculateBearing, calculateDistanceKm, estimateEtaMins } from '../utils/locationCoords';

// Safely patch Leaflet DomUtil to prevent uncaught TypeError: Cannot read properties of undefined (reading '_leaflet_pos')
if (typeof L !== 'undefined' && L.DomUtil && !L.DomUtil._patchedLeafletPos) {
  L.DomUtil._patchedLeafletPos = true;
  const origGetPos = L.DomUtil.getPosition;
  L.DomUtil.getPosition = function (el) {
    if (!el) return new L.Point(0, 0);
    try {
      return origGetPos.call(L.DomUtil, el) || new L.Point(0, 0);
    } catch (err) {
      return new L.Point(0, 0);
    }
  };
}

// 1. High-Visibility Google Maps Style Live Navigation Start Arrow + 3D Going Car with Pulsing Radar
// The car on phone screen ALWAYS faces the TOP side (forward direction)
const createStartNavArrowIcon = (heading = 0, label = "Start Location", counterRotation = 0) => {
  return L.divIcon({
    className: 'google-nav-live-arrow',
    html: `
      <div style="position: relative; width: 64px; height: 64px; display: flex; align-items: center; justify-content: center; pointer-events: none;">
        <!-- Pulsing Radar Wave Rings -->
        <div style="position: absolute; width: 56px; height: 56px; border-radius: 50%; background: rgba(59, 130, 246, 0.22); border: 2px solid rgba(59, 130, 246, 0.65); animation: navPulse 2s infinite ease-out;"></div>
        <div style="position: absolute; width: 36px; height: 36px; border-radius: 50%; background: rgba(37, 99, 235, 0.35); filter: blur(3px);"></div>
        
        <!-- Directional 3D Going Car: Counter-rotated so it ALWAYS faces the TOP SIDE of mobile device screen -->
        <div style="position: absolute; transform: rotate(${counterRotation}deg); transition: transform 0.35s ease-out; width: 44px; height: 44px; display: flex; align-items: center; justify-content: center; filter: drop-shadow(0 6px 14px rgba(0,0,0,0.5));">
          <svg width="34" height="46" viewBox="0 0 40 54" fill="none" xmlns="http://www.w3.org/2000/svg">
            <!-- 4 Tires / Wheels -->
            <rect x="2" y="10" width="5" height="11" rx="2" fill="#0F172A"/>
            <rect x="33" y="10" width="5" height="11" rx="2" fill="#0F172A"/>
            <rect x="2" y="33" width="5" height="11" rx="2" fill="#0F172A"/>
            <rect x="33" y="33" width="5" height="11" rx="2" fill="#0F172A"/>
            <!-- Main Car Body (Chauffeur Taxi Yellow #FACC15) -->
            <rect x="6" y="5" width="28" height="44" rx="7" fill="#FACC15" stroke="#CA8A04" stroke-width="1.8"/>
            <!-- Side Mirrors -->
            <rect x="3" y="18" width="4" height="3" rx="1.5" fill="#EAB308"/>
            <rect x="33" y="18" width="4" height="3" rx="1.5" fill="#EAB308"/>
            <!-- Front Windshield Glass -->
            <path d="M10 16C10 14 11 13 14 13H26C29 13 30 14 30 16L29 20H11L10 16Z" fill="#1E293B"/>
            <!-- Roof -->
            <rect x="10" y="21" width="20" height="16" rx="3" fill="#EAB308"/>
            <!-- Taxi Sign on Roof -->
            <rect x="15" y="27" width="10" height="4.5" rx="1.5" fill="#0F172A"/>
            <rect x="16" y="28" width="8" height="2.5" rx="0.5" fill="#FFFFFF"/>
            <!-- Rear Windshield Glass -->
            <path d="M11 39H29L28 42C28 43 27 44 25 44H15C13 44 12 43 12 42L11 39Z" fill="#1E293B"/>
            <!-- Dual Headlights Beam at top -->
            <circle cx="11" cy="7" r="2.8" fill="#FEF08A"/>
            <circle cx="29" cy="7" r="2.8" fill="#FEF08A"/>
            <!-- Dual Taillights at bottom -->
            <circle cx="11" cy="47" r="2.4" fill="#EF4444"/>
            <circle cx="29" cy="47" r="2.4" fill="#EF4444"/>
          </svg>
        </div>

        <!-- Start Location Badge Pill (Clean White Theme, always upright) -->
        <div style="position: absolute; top: -14px; left: 50%; transform: translateX(-50%) rotate(${counterRotation}deg); background: #FFFFFF; color: #0F172A; padding: 3px 9px; border-radius: 12px; font-family: 'Space Grotesk', sans-serif; font-size: 11px; font-weight: 800; white-space: nowrap; box-shadow: 0 4px 12px rgba(0,0,0,0.15); border: 1.5px solid #CBD5E1; pointer-events: none;">
          <span style="color: #16A34A; margin-right: 3px;">●</span> ${label}
        </div>
      </div>
    `,
    iconSize: [64, 64],
    iconAnchor: [32, 32]
  });
};

// 2. Realistic Top-Down Going Car Icon for Nearby Taxis or Driver
const createGoingCarIcon = (heading = 0, badge = "Driver") => {
  return L.divIcon({
    className: 'custom-leaflet-going-car-pin',
    html: `
      <div style="position: relative; width: 44px; height: 44px; display: flex; align-items: center; justify-content: center; transform: translate(-50%, -50%);">
        <div style="transform: rotate(${heading}deg); transition: transform 0.4s ease-out; filter: drop-shadow(0 6px 14px rgba(0,0,0,0.4));">
          <svg width="34" height="46" viewBox="0 0 40 54" fill="none" xmlns="http://www.w3.org/2000/svg">
            <rect x="2" y="10" width="5" height="11" rx="2" fill="#0F172A"/>
            <rect x="33" y="10" width="5" height="11" rx="2" fill="#0F172A"/>
            <rect x="2" y="33" width="5" height="11" rx="2" fill="#0F172A"/>
            <rect x="33" y="33" width="5" height="11" rx="2" fill="#0F172A"/>
            <rect x="6" y="5" width="28" height="44" rx="7" fill="#FACC15" stroke="#CA8A04" stroke-width="1.6"/>
            <rect x="3" y="18" width="4" height="3" rx="1.5" fill="#EAB308"/>
            <rect x="33" y="18" width="4" height="3" rx="1.5" fill="#EAB308"/>
            <path d="M10 16C10 14 11 13 14 13H26C29 13 30 14 30 16L29 20H11L10 16Z" fill="#1E293B"/>
            <rect x="10" y="21" width="20" height="16" rx="3" fill="#EAB308"/>
            <rect x="15" y="27" width="10" height="4.5" rx="1.5" fill="#0F172A"/>
            <rect x="16" y="28" width="8" height="2.5" rx="0.5" fill="#FFFFFF"/>
            <path d="M11 39H29L28 42C28 43 27 44 25 44H15C13 44 12 43 12 42L11 39Z" fill="#1E293B"/>
            <circle cx="11" cy="7" r="2.5" fill="#FEF08A"/>
            <circle cx="29" cy="7" r="2.5" fill="#FEF08A"/>
            <circle cx="11" cy="47" r="2" fill="#EF4444"/>
            <circle cx="29" cy="47" r="2" fill="#EF4444"/>
          </svg>
        </div>
      </div>
    `,
    iconSize: [44, 44],
    iconAnchor: [22, 22]
  });
};

// 3. Dropoff Destination Pin
const createDestinationPinIcon = (label = "Dropoff") => {
  return L.divIcon({
    className: 'custom-leaflet-dest-pin',
    html: `
      <div style="display: flex; flex-direction: column; align-items: center; transform: translate(-50%, -100%); pointer-events: none;">
        <div style="background: #EF4444; color: #FFFFFF; padding: 4px 10px; border-radius: 12px; font-family: 'Space Grotesk', sans-serif; font-size: 11px; font-weight: 700; white-space: nowrap; box-shadow: 0 4px 12px rgba(239,68,68,0.35); margin-bottom: 4px; border: 1.5px solid #FFFFFF;">
          <span style="color: #FFFFFF; margin-right: 4px;">●</span> ${label}
        </div>
        <div style="width: 18px; height: 18px; background: #EF4444; border: 3px solid #FFFFFF; border-radius: 50%; box-shadow: 0 0 12px rgba(239,68,68,0.85);"></div>
      </div>
    `,
    iconSize: [0, 0],
    iconAnchor: [0, 0]
  });
};

/**
 * Controller: Keeps Camera Focused on Live Car (Google Maps style) and Handles 10s Inactivity Auto-Recenter
 */
function MapNavigationController({
  center,
  destination,
  stablePositions,
  isFreeMode,
  setIsFreeMode,
  countdown,
  setCountdown,
  registerRecenter,
  startInactivityTimer
}) {
  const map = useMap();

  // Recenter smoothly onto the live arrow at navigation zoom (16)
  const recenterToLiveArrow = useCallback(() => {
    if (!map || !map._container) return;
    if (center && typeof center.lat === 'number' && typeof center.lng === 'number') {
      map.flyTo([center.lat, center.lng], 16, {
        animate: true,
        duration: 0.8,
        easeLinearity: 0.25
      });
    }
  }, [map, center?.lat, center?.lng]);

  useEffect(() => {
    if (registerRecenter) {
      registerRecenter(() => recenterToLiveArrow);
    }
  }, [registerRecenter, recenterToLiveArrow]);

  // Normal Screen View: Always keep camera focused on the live car / start location at navigation zoom 16
  useEffect(() => {
    if (!map || !map._container) return;
    if (!isFreeMode && center && typeof center.lat === 'number' && typeof center.lng === 'number') {
      const curZoom = map.getZoom();
      const targetZoom = (!curZoom || curZoom < 14) ? 16 : curZoom;
      map.setView([center.lat, center.lng], targetZoom);
    }
  }, [map, center?.lat, center?.lng, isFreeMode]);

  useEffect(() => {
    if (!map || !map._container) return;

    const refreshMapSize = () => {
      try {
        if (map && map._container) map.invalidateSize({ animate: false });
      } catch (e) {}
    };

    refreshMapSize();
    const t1 = setTimeout(refreshMapSize, 120);
    const t2 = setTimeout(refreshMapSize, 450);

    const handleDragStart = () => {
      setIsFreeMode(true);
    };

    const handleDragEnd = () => {
      if (startInactivityTimer) startInactivityTimer();
    };

    map.on('dragstart', handleDragStart);
    map.on('zoomstart', handleDragStart);
    map.on('dragend', handleDragEnd);
    map.on('zoomend', handleDragEnd);

    return () => {
      clearTimeout(t1);
      clearTimeout(t2);
      map.off('dragstart', handleDragStart);
      map.off('zoomstart', handleDragStart);
      map.off('dragend', handleDragEnd);
      map.off('zoomend', handleDragEnd);
    };
  }, [map, setIsFreeMode, startInactivityTimer]);

  return null;
}

class MapErrorBoundary extends React.Component {
  constructor(props) {
    super(props);
    this.state = { hasError: false };
  }

  static getDerivedStateFromError() {
    return { hasError: true };
  }

  componentDidCatch(error, errorInfo) {
    console.warn("Leaflet Map Render Notice:", error, errorInfo);
  }

  render() {
    if (this.state.hasError) {
      const lat = this.props.center?.lat || 21.7645;
      const lng = this.props.center?.lng || 72.1519;
      return (
        <div style={{ width: '100%', height: '100%', position: 'relative', background: '#F8FAFC' }}>
          <iframe
            title="Google Maps Vector Fallback"
            src={`https://maps.google.com/maps?q=${lat},${lng}&z=15&output=embed`}
            style={{ width: '100%', height: '100%', border: 0 }}
          />
        </div>
      );
    }
    return this.props.children;
  }
}

export default function InteractiveMap({
  center = { lat: 21.7645, lng: 72.1519 },
  zoom = 15.5,
  showUserPin = true,
  userLabel = "Start Location",
  nearbyTaxis = [],
  destination = null,
  routePolyline = null,
  activeDriverPos = null,
  onUserLocationChange = null,
  style = { width: '100%', height: '100%' }
}) {
  const safeLat = (center && typeof center.lat === 'number' && !isNaN(center.lat)) ? center.lat : 21.7645;
  const safeLng = (center && typeof center.lng === 'number' && !isNaN(center.lng)) ? center.lng : 72.1519;
  const mapCenter = [safeLat, safeLng];

  // 1. Dynamic Highway & Live Road Routing (Adapts automatically as driver moves or changes route)
  const stableRouteKey = useMemo(() => {
    if (!destination || typeof destination.lat !== 'number' || typeof destination.lng !== 'number') return null;
    return `${safeLat.toFixed(3)},${safeLng.toFixed(3)}->${destination.lat.toFixed(3)},${destination.lng.toFixed(3)}`;
  }, [safeLat, safeLng, destination]);

  const [liveRoadCoords, setLiveRoadCoords] = useState(null);

  // Dynamic reroute listener: When driver position changes or reroutes, fetch real road geometry in background
  useEffect(() => {
    if (!destination || typeof destination.lat !== 'number' || typeof destination.lng !== 'number') {
      setLiveRoadCoords(null);
      return;
    }
    let isCancelled = false;
    fetchRoadPolyline({ lat: safeLat, lng: safeLng }, destination).then(pts => {
      if (!isCancelled && Array.isArray(pts) && pts.length >= 2) {
        setLiveRoadCoords(pts.map(p => [p.lat, p.lng]));
      }
    }).catch(() => {});

    return () => { isCancelled = true; };
  }, [stableRouteKey]);

  const stablePositions = useMemo(() => {
    if (!destination || typeof destination.lat !== 'number' || typeof destination.lng !== 'number') return [];
    if (liveRoadCoords && liveRoadCoords.length >= 2) {
      return liveRoadCoords;
    }
    if (Array.isArray(routePolyline) && routePolyline.length >= 2) {
      return routePolyline
        .map(p => {
          if (!p) return null;
          const lat = Array.isArray(p) ? p[0] : p.lat;
          const lng = Array.isArray(p) ? p[1] : p.lng;
          if (typeof lat === 'number' && !isNaN(lat) && typeof lng === 'number' && !isNaN(lng)) {
            return [lat, lng];
          }
          return null;
        })
        .filter(Boolean);
    }
    const pts = getCachedRoutePolyline({ lat: safeLat, lng: safeLng }, destination);
    return pts.map(p => [p.lat, p.lng]);
  }, [stableRouteKey, liveRoadCoords, routePolyline, safeLat, safeLng, destination]);

  // 2. Navigation Heading: Direction of travel along the highway
  const navHeading = useMemo(() => {
    if (stablePositions.length >= 2) {
      return calculateBearing(
        { lat: stablePositions[0][0], lng: stablePositions[0][1] },
        { lat: stablePositions[1][0], lng: stablePositions[1][1] }
      );
    }
    if (destination && typeof destination.lat === 'number' && typeof destination.lng === 'number') {
      return calculateBearing({ lat: safeLat, lng: safeLng }, destination);
    }
    return 0;
  }, [stablePositions, destination, safeLat, safeLng]);

  // Heading-Up Rotation: Map turns by -navHeading so highway ahead points STRAIGHT UP (12 o'clock)
  const straightAheadHeading = useMemo(() => {
    return -navHeading;
  }, [navHeading]);

  // Rotation & Free Mode State
  const [currentRotation, setCurrentRotation] = useState(straightAheadHeading);
  const [isFreeMode, setIsFreeMode] = useState(false);
  const [countdown, setCountdown] = useState(10);
  const [isInteracting, setIsInteracting] = useState(false);

  const recenterFnRef = useRef(null);
  const timerRef = useRef(null);
  const countdownIntervalRef = useRef(null);
  const containerRef = useRef(null);

  // Synchronize straight-ahead heading when not in free mode
  useEffect(() => {
    if (!isFreeMode) {
      setCurrentRotation(straightAheadHeading);
    }
  }, [straightAheadHeading, isFreeMode]);

  const registerRecenter = useCallback((fn) => {
    recenterFnRef.current = fn;
  }, []);

  // Smoothly align map so the highway to destination points STRAIGHT UP (12 o'clock)
  const alignStraightAhead = useCallback(() => {
    setIsFreeMode(false);
    setCountdown(10);
    clearInterval(countdownIntervalRef.current);
    clearTimeout(timerRef.current);
    setCurrentRotation(straightAheadHeading);
    if (recenterFnRef.current) {
      recenterFnRef.current();
    }
  }, [straightAheadHeading]);

  // Start 10-second inactivity timer returning map to straight-ahead alignment
  const startInactivityTimer = useCallback(() => {
    clearTimeout(timerRef.current);
    clearInterval(countdownIntervalRef.current);

    setIsFreeMode(true);
    setCountdown(10);
    let secLeft = 10;

    countdownIntervalRef.current = setInterval(() => {
      secLeft -= 1;
      setCountdown(Math.max(0, secLeft));
      if (secLeft <= 0) {
        clearInterval(countdownIntervalRef.current);
      }
    }, 1000);

    timerRef.current = setTimeout(() => {
      alignStraightAhead();
    }, 10000);
  }, [alignStraightAhead]);

  // Manual rotation buttons: Turn Left / Turn Right
  const handleManualRotate = (deltaDeg) => {
    setIsFreeMode(true);
    setCurrentRotation(prev => (prev + deltaDeg) % 360);
    startInactivityTimer();
  };

  // Compass Button: Toggles between Straight-Ahead (Heading Up) and North-Up (0°)
  const handleCompassClick = () => {
    if (Math.abs(currentRotation - straightAheadHeading) > 5) {
      alignStraightAhead();
    } else {
      setIsFreeMode(true);
      setCurrentRotation(0);
      startInactivityTimer();
    }
  };

  // Two-Finger Gesture Twist Rotation
  const touchStartAngleRef = useRef(0);
  const rotationOnTouchStartRef = useRef(0);

  const getTouchAngle = (t1, t2) => {
    const dx = t2.clientX - t1.clientX;
    const dy = t2.clientY - t1.clientY;
    return (Math.atan2(dy, dx) * 180) / Math.PI;
  };

  const onTouchStart = (e) => {
    if (e.touches && e.touches.length === 2) {
      touchStartAngleRef.current = getTouchAngle(e.touches[0], e.touches[1]);
      rotationOnTouchStartRef.current = currentRotation;
      setIsInteracting(true);
      setIsFreeMode(true);
      clearTimeout(timerRef.current);
      clearInterval(countdownIntervalRef.current);
    }
  };

  const onTouchMove = (e) => {
    if (e.touches && e.touches.length === 2) {
      const currentAngle = getTouchAngle(e.touches[0], e.touches[1]);
      const diff = currentAngle - touchStartAngleRef.current;
      setCurrentRotation(rotationOnTouchStartRef.current + diff);
      if (e.cancelable) e.preventDefault();
    }
  };

  const onTouchEnd = (e) => {
    if (e.touches && e.touches.length < 2 && isInteracting) {
      setIsInteracting(false);
      startInactivityTimer();
    }
  };

  return (
    <div 
      ref={containerRef}
      className="interactive-google-map-container" 
      onTouchStart={onTouchStart}
      onTouchMove={onTouchMove}
      onTouchEnd={onTouchEnd}
      style={{ 
        ...style, 
        position: 'relative', 
        width: '100%', 
        height: '100%', 
        overflow: 'hidden', 
        background: '#F1F5F9'
      }}
    >
      {/* 
        ROTATABLE MAP INNER VIEWPORT (148% size):
        Rotates smoothly around center (50% 50%) so the road ahead ALWAYS points straight UP.
        Sized 148% so corners NEVER clip or show white background at any 360° angle.
      */}
      <div
        className="map-rotatable-inner"
        style={{
          position: 'absolute',
          width: '148%',
          height: '148%',
          top: '-24%',
          left: '-24%',
          transform: `rotate(${currentRotation}deg)`,
          transformOrigin: '50% 50%',
          transition: isInteracting ? 'none' : 'transform 0.45s cubic-bezier(0.2, 0.8, 0.2, 1)',
          willChange: 'transform'
        }}
      >
        <MapErrorBoundary center={{ lat: safeLat, lng: safeLng }}>
          <MapContainer
            center={mapCenter}
            zoom={15.5}
            preferCanvas={true}
            zoomControl={false}
            dragging={true}
            touchZoom={true}
            scrollWheelZoom={true}
            doubleClickZoom={true}
            bounceAtZoomLimits={false}
            zoomSnap={0.25}
            zoomDelta={0.5}
            zoomAnimation={true}
            fadeAnimation={true}
            markerZoomAnimation={true}
            easeLinearity={0.2}
            wheelDebounceTime={40}
            wheelPxPerZoomLevel={80}
            inertia={true}
            inertiaDeceleration={2400}
            inertiaMaxSpeed={1800}
            style={{ width: '100%', height: '100%', background: '#F1F5F9', willChange: 'transform' }}
          >
            <MapNavigationController
              center={{ lat: safeLat, lng: safeLng }}
              destination={destination}
              stablePositions={stablePositions}
              isFreeMode={isFreeMode}
              setIsFreeMode={setIsFreeMode}
              countdown={countdown}
              setCountdown={setCountdown}
              registerRecenter={registerRecenter}
              startInactivityTimer={startInactivityTimer}
            />
            
            {/* Ultra Fast Google Maps Tile Layer */}
            <TileLayer
              attribution='&copy; Google Maps'
              url="https://{s}.google.com/vt/lyrs=m&x={x}&y={y}&z={z}"
              subdomains={['mt0', 'mt1', 'mt2', 'mt3']}
              maxZoom={20}
              maxNativeZoom={20}
              keepBuffer={6}
            />

            {/* PRIMARY FOCUS: Prominent Start Navigation Arrow + 3D Going Car facing Highway Direction */}
            {showUserPin && (
              <Marker 
                position={[safeLat, safeLng]} 
                icon={createStartNavArrowIcon(navHeading, userLabel || "Start Location", -currentRotation)}
                draggable={false}
                zIndexOffset={1000}
              >
                <Popup>📍 Start Navigation Spot</Popup>
              </Marker>
            )}

            {/* Destination Pin */}
            {destination && typeof destination.lat === 'number' && typeof destination.lng === 'number' && (
              <Marker 
                position={[destination.lat, destination.lng]} 
                icon={createDestinationPinIcon(destination.label || "Dropoff Location")}
                zIndexOffset={900}
              >
                <Popup>🏁 {destination.label || "Destination"}</Popup>
              </Marker>
            )}

            {/* Nearby Available Going Cars */}
            {Array.isArray(nearbyTaxis) && nearbyTaxis.map((taxi, idx) => {
              if (!taxi || typeof taxi.lat !== 'number' || typeof taxi.lng !== 'number') return null;
              return (
                <Marker 
                  key={idx} 
                  position={[taxi.lat, taxi.lng]} 
                  icon={createGoingCarIcon(taxi.heading || ((idx * 45) % 360), taxi.label || `Taxi #${idx + 1}`)}
                />
              );
            })}

            {/* 
              AUTHENTIC GOOGLE MAPS STYLE HIGHWAY NAVIGATION ROUTE LINE (ZERO FLICKER)
              Rendered on HTML5 Canvas with hardware acceleration
            */}
            {stablePositions.length >= 2 && (
              <>
                {/* 1. Deep Sapphire Blue Outer Road Casing */}
                <Polyline 
                  key={`route-casing-${stableRouteKey}`}
                  positions={stablePositions} 
                  smoothFactor={1.2}
                  pathOptions={{ color: '#1E3A8A', weight: 9, opacity: 0.90, lineCap: 'round', lineJoin: 'round' }} 
                />
                {/* 2. Core Google Maps Electric Royal Blue Highway Line */}
                <Polyline 
                  key={`route-core-${stableRouteKey}`}
                  positions={stablePositions} 
                  smoothFactor={1.2}
                  pathOptions={{ color: '#2563EB', weight: 6, opacity: 1.0, lineCap: 'round', lineJoin: 'round' }} 
                />
                {/* 3. Luminous Sky Blue Center Guidance Accent */}
                <Polyline 
                  key={`route-accent-${stableRouteKey}`}
                  positions={stablePositions} 
                  smoothFactor={1.2}
                  pathOptions={{ color: '#93C5FD', weight: 2.5, opacity: 0.95, lineCap: 'round', lineJoin: 'round' }} 
                />
              </>
            )}
          </MapContainer>
        </MapErrorBoundary>
      </div>

      {/* 
        GOOGLE MAPS STYLE MINIMAL COMPASS (Only shows when map is turned or rotated)
        Tapping it smoothly resets the map orientation to True North / Straight Ahead
      */}
      {Math.abs(currentRotation) > 1 && (
        <div 
          style={{ 
            position: 'absolute', 
            top: '110px', 
            right: '16px', 
            zIndex: 1000 
          }}
        >
          <button
            type="button"
            onClick={handleCompassClick}
            title="Reset Orientation"
            style={{
              width: '40px',
              height: '40px',
              borderRadius: '50%',
              background: '#FFFFFF',
              border: '1.5px solid #CBD5E1',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              boxShadow: '0 4px 14px rgba(0,0,0,0.12)',
              cursor: 'pointer',
              position: 'relative',
              padding: 0
            }}
          >
            {/* Minimal Compass Needle */}
            <div style={{ transform: `rotate(${-currentRotation}deg)`, transition: isInteracting ? 'none' : 'transform 0.4s ease-out', width: '22px', height: '22px', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
              <svg width="20" height="20" viewBox="0 0 24 24" fill="none">
                <polygon points="12,3 15.5,12 12,9.5" fill="#EF4444" />
                <polygon points="12,3 8.5,12 12,9.5" fill="#DC2626" />
                <polygon points="12,21 15.5,12 12,14.5" fill="#64748B" />
                <polygon points="12,21 8.5,12 12,14.5" fill="#94A3B8" />
                <circle cx="12" cy="12" r="2" fill="#0F172A" />
              </svg>
            </div>
            <span style={{ position: 'absolute', top: '1px', fontSize: '8px', fontWeight: '900', color: '#EF4444', fontFamily: 'Space Grotesk, sans-serif' }}>N</span>
          </button>
        </div>
      )}
    </div>
  );
}
