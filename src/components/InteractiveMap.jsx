import React, { useEffect, useMemo, useRef, useState, useCallback } from 'react';
import { MapContainer, TileLayer, Marker, Popup, Polyline, useMap } from 'react-leaflet';
import L from 'leaflet';
import 'leaflet/dist/leaflet.css';
import { fetchRoadPolyline, calculateBearing, calculateDistanceKm, estimateEtaMins } from '../utils/locationCoords';

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

// 1. High-Visibility Google Maps Style Live Navigation Start Arrow + Going Car with Pulsing Radar
const createStartNavArrowIcon = (heading = 0, label = "Start Location") => {
  return L.divIcon({
    className: 'google-nav-live-arrow',
    html: `
      <div style="position: relative; width: 64px; height: 64px; display: flex; align-items: center; justify-content: center; pointer-events: none;">
        <!-- Pulsing Radar Wave Rings -->
        <div style="position: absolute; width: 56px; height: 56px; border-radius: 50%; background: rgba(59, 130, 246, 0.22); border: 2px solid rgba(59, 130, 246, 0.65); animation: navPulse 2s infinite ease-out;"></div>
        <div style="position: absolute; width: 36px; height: 36px; border-radius: 50%; background: rgba(37, 99, 235, 0.35); filter: blur(3px);"></div>
        
        <!-- Directional 3D Going Car / Navigation Arrow rotated to heading -->
        <div style="position: absolute; transform: rotate(${heading}deg); transition: transform 0.35s ease-out; width: 44px; height: 44px; display: flex; align-items: center; justify-content: center; filter: drop-shadow(0 6px 14px rgba(0,0,0,0.5));">
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
            <!-- Dual Headlights Beam -->
            <circle cx="11" cy="7" r="2.8" fill="#FEF08A"/>
            <circle cx="29" cy="7" r="2.8" fill="#FEF08A"/>
            <!-- Dual Taillights -->
            <circle cx="11" cy="47" r="2.4" fill="#EF4444"/>
            <circle cx="29" cy="47" r="2.4" fill="#EF4444"/>
          </svg>
        </div>

        <!-- Start Location Badge Pill -->
        <div style="position: absolute; top: -14px; left: 50%; transform: translateX(-50%); background: #0F172A; color: #FFFFFF; padding: 2px 8px; border-radius: 10px; font-family: 'Space Grotesk', sans-serif; font-size: 10px; font-weight: 800; white-space: nowrap; box-shadow: 0 4px 10px rgba(0,0,0,0.35); border: 1.5px solid rgba(255,255,255,0.25); pointer-events: none;">
          <span style="color: #22C55E; margin-right: 3px;">●</span> ${label}
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
      <div style="display: flex; flex-direction: column; align-items: center; transform: translate(-50%, -100%);">
        <div style="background: #EF4444; color: #FFFFFF; padding: 4px 10px; border-radius: 12px; font-family: 'Space Grotesk', sans-serif; font-size: 11px; font-weight: 700; white-space: nowrap; box-shadow: 0 4px 12px rgba(239,68,68,0.35); margin-bottom: 4px;">
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
 * Controller: Handles Main Focus on Live Arrow, Free Touch Exploration, and 10-Second Auto Re-center
 */
function MapNavigationController({
  center,
  destination,
  isFreeMode,
  setIsFreeMode,
  countdown,
  setCountdown,
  registerRecenter
}) {
  const map = useMap();
  const timerRef = useRef(null);
  const countdownIntervalRef = useRef(null);
  const isInteractingRef = useRef(false);

  // Recenter smoothly onto the live arrow at navigation zoom
  const recenterToLiveArrow = useCallback(() => {
    if (!map || !map._container) return;
    setIsFreeMode(false);
    setCountdown(10);
    clearInterval(countdownIntervalRef.current);
    clearTimeout(timerRef.current);

    if (center && typeof center.lat === 'number' && typeof center.lng === 'number') {
      map.flyTo([center.lat, center.lng], 15.5, {
        animate: true,
        duration: 1.2,
        easeLinearity: 0.25
      });
    }
  }, [map, center?.lat, center?.lng, setIsFreeMode, setCountdown]);

  // Expose recenter trigger to parent component
  useEffect(() => {
    if (registerRecenter) {
      registerRecenter(() => recenterToLiveArrow);
    }
  }, [registerRecenter, recenterToLiveArrow]);

  useEffect(() => {
    if (!map || !map._container) return;

    const refreshMapSize = () => {
      try {
        if (map && map._container) map.invalidateSize({ animate: false });
      } catch (e) {}
    };

    refreshMapSize();
    const t1 = setTimeout(refreshMapSize, 100);
    const t2 = setTimeout(refreshMapSize, 400);

    // Initial camera placement: focus directly on the Start Arrow at navigation zoom 15.5
    if (center && typeof center.lat === 'number' && typeof center.lng === 'number') {
      map.setView([center.lat, center.lng], 15.5);
    }

    // Start 10-second countdown when user finishes touching
    const start10sInactivityTimer = () => {
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
        recenterToLiveArrow();
      }, 10000);
    };

    const handleTouchStart = () => {
      isInteractingRef.current = true;
      clearTimeout(timerRef.current);
      clearInterval(countdownIntervalRef.current);
      setIsFreeMode(true);
    };

    const handleTouchEnd = () => {
      isInteractingRef.current = false;
      start10sInactivityTimer();
    };

    map.on('dragstart', handleTouchStart);
    map.on('zoomstart', handleTouchStart);
    map.on('dragend', handleTouchEnd);
    map.on('zoomend', handleTouchEnd);

    const container = map.getContainer();
    container.addEventListener('touchstart', handleTouchStart, { passive: true });
    container.addEventListener('touchend', handleTouchEnd, { passive: true });
    container.addEventListener('mousedown', handleTouchStart);
    container.addEventListener('mouseup', handleTouchEnd);

    return () => {
      clearTimeout(t1);
      clearTimeout(t2);
      clearTimeout(timerRef.current);
      clearInterval(countdownIntervalRef.current);
      map.off('dragstart', handleTouchStart);
      map.off('zoomstart', handleTouchStart);
      map.off('dragend', handleTouchEnd);
      map.off('zoomend', handleTouchEnd);
      container.removeEventListener('touchstart', handleTouchStart);
      container.removeEventListener('touchend', handleTouchEnd);
      container.removeEventListener('mousedown', handleTouchStart);
      container.removeEventListener('mouseup', handleTouchEnd);
    };
  }, [map, center?.lat, center?.lng, recenterToLiveArrow, setIsFreeMode, setCountdown]);

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
    console.warn("Leaflet Map Render Exception:", error, errorInfo);
  }

  render() {
    if (this.state.hasError) {
      const lat = this.props.center?.lat || 21.7645;
      const lng = this.props.center?.lng || 72.1519;
      return (
        <div style={{ width: '100%', height: '100%', position: 'relative', background: '#F1F5F9' }}>
          <iframe
            title="Google Maps Live Vector Fallback"
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

  const [liveRoadLine, setLiveRoadLine] = useState(null);
  const [isFreeMode, setIsFreeMode] = useState(false);
  const [countdown, setCountdown] = useState(10);
  const recenterFnRef = useRef(null);

  const registerRecenter = useCallback((fn) => {
    recenterFnRef.current = fn;
  }, []);

  useEffect(() => {
    if (destination && typeof destination.lat === 'number' && typeof destination.lng === 'number') {
      let isMounted = true;
      fetchRoadPolyline({ lat: safeLat, lng: safeLng }, destination).then(pts => {
        if (isMounted && Array.isArray(pts) && pts.length > 0) {
          setLiveRoadLine(pts);
        }
      });
      return () => { isMounted = false; };
    } else {
      setLiveRoadLine(null);
    }
  }, [safeLat, safeLng, destination?.lat, destination?.lng]);

  const activePolyline = liveRoadLine || routePolyline;
  const rawPositions = Array.isArray(activePolyline) ? activePolyline : [];
  const safePositions = rawPositions
    .filter(p => p && typeof p.lat === 'number' && !isNaN(p.lat) && typeof p.lng === 'number' && !isNaN(p.lng))
    .map(p => [p.lat, p.lng]);
  const hasPolyline = safePositions.length >= 2;

  // Calculate live heading angle for the Start Arrow / Going Car pointing along the highway
  const navHeading = useMemo(() => {
    if (hasPolyline && safePositions.length >= 2) {
      return calculateBearing(
        { lat: safePositions[0][0], lng: safePositions[0][1] },
        { lat: safePositions[1][0], lng: safePositions[1][1] }
      );
    }
    if (destination && typeof destination.lat === 'number' && typeof destination.lng === 'number') {
      return calculateBearing({ lat: safeLat, lng: safeLng }, destination);
    }
    return 0;
  }, [hasPolyline, safePositions, destination, safeLat, safeLng]);

  return (
    <div 
      className="interactive-google-map-container" 
      style={{ 
        ...style, 
        position: 'relative', 
        width: '100%', 
        height: '100%', 
        overflow: 'hidden', 
        touchAction: 'pan-x pan-y',
        WebkitOverflowScrolling: 'touch'
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
            isFreeMode={isFreeMode}
            setIsFreeMode={setIsFreeMode}
            countdown={countdown}
            setCountdown={setCountdown}
            registerRecenter={registerRecenter}
          />
          
          {/* Ultra Fast Google Maps Tile Layer with Hairline-Free Seam Smoothing */}
          <TileLayer
            attribution='&copy; Google Maps'
            url="https://{s}.google.com/vt/lyrs=m&x={x}&y={y}&z={z}"
            subdomains={['mt0', 'mt1', 'mt2', 'mt3']}
            maxZoom={20}
            maxNativeZoom={20}
            keepBuffer={6}
          />

          {/* PRIMARY FOCUS: Prominent Google Maps Start Navigation Arrow + Going Car with Pulsing Radar Halo */}
          {showUserPin && (
            <Marker 
              position={[safeLat, safeLng]} 
              icon={createStartNavArrowIcon(navHeading, userLabel || "Start Location")}
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

          {/* Google Maps Style Royal Blue Navigation Route Line */}
          {hasPolyline ? (
            <>
              <Polyline 
                positions={safePositions} 
                pathOptions={{ color: '#1E3A8A', weight: 8, opacity: 0.85, lineCap: 'round', lineJoin: 'round' }} 
              />
              <Polyline 
                positions={safePositions} 
                pathOptions={{ color: '#3B82F6', weight: 5, opacity: 1.0, lineCap: 'round', lineJoin: 'round' }} 
              />
            </>
          ) : (destination && typeof destination.lat === 'number' && typeof destination.lng === 'number' ? (
            <>
              <Polyline
                positions={[[safeLat, safeLng], [destination.lat, destination.lng]]}
                pathOptions={{ color: '#1E3A8A', weight: 8, opacity: 0.85, lineCap: 'round', lineJoin: 'round' }}
              />
              <Polyline
                positions={[[safeLat, safeLng], [destination.lat, destination.lng]]}
                pathOptions={{ color: '#3B82F6', weight: 5, opacity: 1.0, lineCap: 'round', lineJoin: 'round' }}
              />
            </>
          ) : null)}
        </MapContainer>
      </MapErrorBoundary>

      {/* Floating Re-center Button when exploring in Free Map Mode */}
      {isFreeMode && (
        <button
          type="button"
          onClick={(e) => {
            e.stopPropagation();
            if (recenterFnRef.current) {
              recenterFnRef.current();
            }
          }}
          style={{
            position: 'absolute',
            bottom: '120px',
            right: '16px',
            zIndex: 1000,
            background: '#0F172A',
            color: '#FFFFFF',
            border: '2px solid rgba(255, 255, 255, 0.25)',
            padding: '10px 18px',
            borderRadius: '30px',
            display: 'flex',
            alignItems: 'center',
            gap: '8px',
            boxShadow: '0 8px 24px rgba(0, 0, 0, 0.35)',
            cursor: 'pointer',
            fontSize: '13px',
            fontWeight: '800',
            fontFamily: 'Space Grotesk, sans-serif'
          }}
        >
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="#38BDF8" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
            <polygon points="3 11 22 2 13 21 11 13 3 11"/>
          </svg>
          <span>Re-center ({countdown}s)</span>
        </button>
      )}
    </div>
  );
}
