import React, { useEffect, useMemo, useRef } from 'react';
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

// 1. User Pickup / Live Spot Pin
const createUserPinIcon = (label = "Your Location") => {
  return L.divIcon({
    className: 'custom-leaflet-user-pin',
    html: `
      <div style="display: flex; flex-direction: column; align-items: center; transform: translate(-50%, -100%); pointer-events: none;">
        <div style="background: #0F172A; color: #FFFFFF; padding: 4px 10px; border-radius: 12px; font-family: 'Space Grotesk', sans-serif; font-size: 11px; font-weight: 700; white-space: nowrap; box-shadow: 0 4px 12px rgba(0,0,0,0.25); margin-bottom: 4px;">
          <span style="color: #22C55E; margin-right: 4px;">●</span> ${label}
        </div>
        <div style="width: 18px; height: 18px; background: #22C55E; border: 3px solid #FFFFFF; border-radius: 50%; box-shadow: 0 0 12px rgba(34,197,94,0.9);"></div>
      </div>
    `,
    iconSize: [0, 0],
    iconAnchor: [0, 0]
  });
};

// 2. Realistic Top-Down Going Car Icon with Dynamic Direction / Heading
const createGoingCarIcon = (heading = 0, badge = "Driver") => {
  return L.divIcon({
    className: 'custom-leaflet-going-car-pin',
    html: `
      <div style="display: flex; flex-direction: column; align-items: center; transform: translate(-50%, -50%);">
        <div style="transform: rotate(${heading}deg); transition: transform 0.4s ease-out; filter: drop-shadow(0 6px 14px rgba(0,0,0,0.4));">
          <svg width="36" height="48" viewBox="0 0 40 54" fill="none" xmlns="http://www.w3.org/2000/svg">
            <!-- 4 Tires / Wheels -->
            <rect x="2" y="10" width="5" height="11" rx="2" fill="#0F172A"/>
            <rect x="33" y="10" width="5" height="11" rx="2" fill="#0F172A"/>
            <rect x="2" y="33" width="5" height="11" rx="2" fill="#0F172A"/>
            <rect x="33" y="33" width="5" height="11" rx="2" fill="#0F172A"/>
            <!-- Main Car Body (Chauffeur Taxi Yellow #FACC15) -->
            <rect x="6" y="5" width="28" height="44" rx="7" fill="#FACC15" stroke="#CA8A04" stroke-width="1.6"/>
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
            <circle cx="11" cy="7" r="2.5" fill="#FEF08A"/>
            <circle cx="29" cy="7" r="2.5" fill="#FEF08A"/>
            <!-- Dual Taillights -->
            <circle cx="11" cy="47" r="2" fill="#EF4444"/>
            <circle cx="29" cy="47" r="2" fill="#EF4444"/>
          </svg>
        </div>
      </div>
    `,
    iconSize: [0, 0],
    iconAnchor: [0, 0]
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
        <div style="width: 16px; height: 16px; background: #EF4444; border: 3px solid #FFFFFF; border-radius: 50%; box-shadow: 0 0 12px rgba(239,68,68,0.85);"></div>
      </div>
    `,
    iconSize: [0, 0],
    iconAnchor: [0, 0]
  });
};

// Component to dynamically re-center & auto-fit route bounds on map view update with ultra-smooth motion
function MapRecenter({ center, destination, routePolyline, zoom }) {
  const map = useMap();

  useEffect(() => {
    if (!map || !map._container) return;

    const refreshMapSize = () => {
      try {
        if (map && map._container) {
          map.invalidateSize({ animate: false });
        }
      } catch (e) {}
    };

    refreshMapSize();
    const t1 = setTimeout(refreshMapSize, 80);
    const t2 = setTimeout(refreshMapSize, 250);
    const t3 = setTimeout(refreshMapSize, 600);

    window.addEventListener('resize', refreshMapSize);

    try {
      if (destination && typeof destination.lat === 'number' && typeof destination.lng === 'number' && center && typeof center.lat === 'number') {
        const bounds = L.latLngBounds([
          [center.lat, center.lng],
          [destination.lat, destination.lng]
        ]);
        if (Array.isArray(routePolyline) && routePolyline.length >= 2) {
          routePolyline.forEach(pt => {
            if (pt && typeof pt.lat === 'number' && typeof pt.lng === 'number') {
              bounds.extend([pt.lat, pt.lng]);
            }
          });
        }
        map.fitBounds(bounds, { padding: [50, 50], maxZoom: 14, animate: true, duration: 0.8 });
      } else if (Array.isArray(routePolyline) && routePolyline.length >= 2) {
        const validPts = routePolyline
          .filter(p => p && typeof p.lat === 'number' && typeof p.lng === 'number')
          .map(p => [p.lat, p.lng]);
        if (validPts.length >= 2) {
          const bounds = L.latLngBounds(validPts);
          map.fitBounds(bounds, { padding: [50, 50], maxZoom: 14, animate: true, duration: 0.8 });
        }
      } else if (center && typeof center.lat === 'number' && typeof center.lng === 'number') {
        map.flyTo([center.lat, center.lng], zoom || 15, {
          animate: true,
          duration: 0.8
        });
      }
    } catch (err) {
      console.warn("Leaflet map view set notice:", err);
    }

    return () => {
      clearTimeout(t1);
      clearTimeout(t2);
      clearTimeout(t3);
      window.removeEventListener('resize', refreshMapSize);
    };
  }, [center?.lat, center?.lng, destination?.lat, destination?.lng, zoom, map, routePolyline]);

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
  zoom = 15,
  showUserPin = true,
  userLabel = "Your Location",
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

  const [liveRoadLine, setLiveRoadLine] = React.useState(null);

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

  // Calculate live heading angle for the going car
  const carHeading = useMemo(() => {
    if (destination && typeof destination.lat === 'number' && typeof destination.lng === 'number') {
      return calculateBearing({ lat: safeLat, lng: safeLng }, destination);
    }
    if (hasPolyline && safePositions.length >= 2) {
      return calculateBearing(
        { lat: safePositions[0][0], lng: safePositions[0][1] },
        { lat: safePositions[1][0], lng: safePositions[1][1] }
      );
    }
    return 0;
  }, [safeLat, safeLng, destination, hasPolyline, safePositions]);

  const driverHeading = useMemo(() => {
    if (activeDriverPos && destination) {
      return calculateBearing(activeDriverPos, destination);
    }
    return carHeading;
  }, [activeDriverPos, destination, carHeading]);

  const isSameSpotAsDriver = activeDriverPos && typeof activeDriverPos.lat === 'number' && typeof activeDriverPos.lng === 'number' &&
    Math.abs(activeDriverPos.lat - safeLat) < 0.0002 && Math.abs(activeDriverPos.lng - safeLng) < 0.0002;

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
          zoom={zoom || 15}
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
          <MapRecenter center={{ lat: safeLat, lng: safeLng }} destination={destination} routePolyline={activePolyline} zoom={zoom} />
          
          {/* Ultra Fast Google Maps Tile Layer with Hairline-Free Seam Smoothing */}
          <TileLayer
            attribution='&copy; Google Maps'
            url="https://{s}.google.com/vt/lyrs=m&x={x}&y={y}&z={z}"
            subdomains={['mt0', 'mt1', 'mt2', 'mt3']}
            maxZoom={20}
            maxNativeZoom={20}
            keepBuffer={6}
          />

          {/* User GPS Location Marker */}
          {showUserPin && (!isSameSpotAsDriver) && (
            <Marker 
              position={[safeLat, safeLng]} 
              icon={createUserPinIcon(userLabel)}
              draggable={false}
            >
              <Popup>📍 Your Live GPS Location</Popup>
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

          {/* Destination Pin */}
          {destination && typeof destination.lat === 'number' && typeof destination.lng === 'number' && (
            <Marker position={[destination.lat, destination.lng]} icon={createDestinationPinIcon(destination.label || "Dropoff Location")}>
              <Popup>🏁 {destination.label || "Destination"}</Popup>
            </Marker>
          )}

          {/* Active Going Car (Chauffeur Taxi) Marker */}
          {activeDriverPos && typeof activeDriverPos.lat === 'number' && typeof activeDriverPos.lng === 'number' && (
            <Marker position={[activeDriverPos.lat, activeDriverPos.lng]} icon={createGoingCarIcon(driverHeading, "Your Driver")}>
              <Popup>🚕 Driver En Route</Popup>
            </Marker>
          )}

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
    </div>
  );
}
