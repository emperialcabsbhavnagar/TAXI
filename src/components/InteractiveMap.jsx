import React, { useEffect } from 'react';
import { MapContainer, TileLayer, Marker, Popup, Polyline, useMap } from 'react-leaflet';
import L from 'leaflet';
import 'leaflet/dist/leaflet.css';

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

// Custom DivIcons for high visual appeal without image loading failures
const createUserPinIcon = (label = "Your Location") => {
  return L.divIcon({
    className: 'custom-leaflet-user-pin',
    html: `
      <div style="display: flex; flex-direction: column; align-items: center; transform: translate(-50%, -100%);">
        <div style="background: #0F172A; color: #FFFFFF; padding: 4px 10px; border-radius: 12px; font-family: 'Space Grotesk', sans-serif; font-size: 11px; font-weight: 700; white-space: nowrap; box-shadow: 0 4px 12px rgba(0,0,0,0.25); margin-bottom: 4px;">
          <span style="color: #22C55E; margin-right: 4px;">●</span> ${label}
        </div>
        <div style="width: 16px; height: 16px; background: #22C55E; border: 3px solid #FFFFFF; border-radius: 50%; box-shadow: 0 0 10px rgba(34,197,94,0.8);"></div>
      </div>
    `,
    iconSize: [0, 0],
    iconAnchor: [0, 0]
  });
};

const createTaxiPinIcon = (badge = "Driver") => {
  return L.divIcon({
    className: 'custom-leaflet-blue-arrow-pin',
    html: `
      <div style="display: flex; flex-direction: column; align-items: center; transform: translate(-50%, -50%);">
        <div style="width: 35px; height: 35px; background: #FFFFFF; border-radius: 50%; display: flex; align-items: center; justify-content: center; box-shadow: 0 3px 12px rgba(37, 99, 235, 0.4); border: 2.5px solid #2563EB;">
          <svg width="19" height="19" viewBox="0 0 24 24" fill="#2563EB">
            <path d="M12 2L4.5 20.29l.71.71L12 18l6.79 3 .71-.71z"/>
          </svg>
        </div>
      </div>
    `,
    iconSize: [0, 0],
    iconAnchor: [0, 0]
  });
};

const createDestinationPinIcon = (label = "Dropoff") => {
  return L.divIcon({
    className: 'custom-leaflet-dest-pin',
    html: `
      <div style="display: flex; flex-direction: column; align-items: center; transform: translate(-50%, -100%);">
        <div style="background: #EF4444; color: #FFFFFF; padding: 4px 10px; border-radius: 12px; font-family: 'Space Grotesk', sans-serif; font-size: 11px; font-weight: 700; white-space: nowrap; box-shadow: 0 4px 12px rgba(0,0,0,0.25); margin-bottom: 4px;">
          <span style="color: #FFFFFF; margin-right: 4px;">●</span> ${label}
        </div>
        <div style="width: 14px; height: 14px; background: #EF4444; border: 3px solid #FFFFFF; border-radius: 50%; box-shadow: 0 0 10px rgba(239,68,68,0.7);"></div>
      </div>
    `,
    iconSize: [0, 0],
    iconAnchor: [0, 0]
  });
};

// Component to dynamically re-center & auto-fit route bounds on map view update with ultra-smooth motion
function MapRecenter({ center, destination, routePolyline, zoom }) {
  const map = useMap();
  const prevCenterRef = React.useRef(center);

  useEffect(() => {
    if (!map || !map._container) return;

    const refreshMapSize = () => {
      try {
        if (map && map._container) {
          map.invalidateSize();
        }
      } catch (e) {}
    };

    refreshMapSize();
    const t1 = setTimeout(refreshMapSize, 100);
    const t2 = setTimeout(refreshMapSize, 350);

    try {
      if (Array.isArray(routePolyline) && routePolyline.length >= 2) {
        const validPts = routePolyline
          .filter(p => p && typeof p.lat === 'number' && typeof p.lng === 'number')
          .map(p => [p.lat, p.lng]);
        if (validPts.length >= 2) {
          const bounds = L.latLngBounds(validPts);
          map.fitBounds(bounds, { padding: [40, 40], maxZoom: 15, animate: true, duration: 0.8, easeLinearity: 0.25 });
          return;
        }
      }

      if (destination && typeof destination.lat === 'number' && typeof destination.lng === 'number' && center && typeof center.lat === 'number') {
        const bounds = L.latLngBounds([
          [center.lat, center.lng],
          [destination.lat, destination.lng]
        ]);
        map.fitBounds(bounds, { padding: [40, 40], maxZoom: 15, animate: true, duration: 0.8, easeLinearity: 0.25 });
      } else if (center && typeof center.lat === 'number' && typeof center.lng === 'number') {
        map.flyTo([center.lat, center.lng], zoom || 15, {
          animate: true,
          duration: 0.8,
          easeLinearity: 0.2
        });
        prevCenterRef.current = center;
      }
    } catch (err) {
      console.warn("Leaflet map view set notice:", err);
    }

    return () => {
      clearTimeout(t1);
      clearTimeout(t2);
    };
  }, [center?.lat, center?.lng, destination?.lat, destination?.lng, zoom, map]);

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

import { fetchRoadPolyline } from '../utils/locationCoords';

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

  // Calculate distance in KM between pickup and destination
  const calculateDistanceKm = (lat1, lon1, lat2, lon2) => {
    if (typeof lat1 !== 'number' || typeof lon1 !== 'number' || typeof lat2 !== 'number' || typeof lon2 !== 'number') return 18.5;
    const R = 6371;
    const dLat = (lat2 - lat1) * Math.PI / 180;
    const dLon = (lon2 - lon1) * Math.PI / 180;
    const a = 
      Math.sin(dLat/2) * Math.sin(dLat/2) +
      Math.cos(lat1 * Math.PI / 180) * Math.cos(lat2 * Math.PI / 180) * 
      Math.sin(dLon/2) * Math.sin(dLon/2);
    const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1-a));
    const d = R * c;
    return d < 0.5 ? 18.5 : Math.round(d * 10) / 10;
  };

  const distKm = destination && typeof destination.lat === 'number' ? calculateDistanceKm(safeLat, safeLng, destination.lat, destination.lng) : null;
  const estMins = distKm ? Math.max(12, Math.round(distKm * 1.5)) : null;

  const activePolyline = liveRoadLine || routePolyline;
  const rawPositions = Array.isArray(activePolyline) ? activePolyline : [];
  const safePositions = rawPositions
    .filter(p => p && typeof p.lat === 'number' && !isNaN(p.lat) && typeof p.lng === 'number' && !isNaN(p.lng))
    .map(p => [p.lat, p.lng]);
  const hasPolyline = safePositions.length >= 2;

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
          style={{ width: '100%', height: '100%', background: '#E2E8F0', willChange: 'transform' }}
        >
          <MapRecenter center={{ lat: safeLat, lng: safeLng }} destination={destination} routePolyline={routePolyline} zoom={zoom} />
          
          {/* Ultra Fast Multi-Server Google Maps Tile Layer */}
          <TileLayer
            attribution='&copy; Google Maps'
            url="https://{s}.google.com/vt/lyrs=m&x={x}&y={y}&z={z}"
            subdomains={['mt0', 'mt1', 'mt2', 'mt3']}
            maxZoom={20}
            maxNativeZoom={20}
          />

          {/* User GPS Location Marker — FIXED & NON-MOVEABLE */}
          {showUserPin && (!isSameSpotAsDriver) && (
            <Marker 
              position={[safeLat, safeLng]} 
              icon={createUserPinIcon(userLabel)}
              draggable={false}
            >
              <Popup>📍 Your Live GPS Location</Popup>
            </Marker>
          )}

          {/* Nearby Available Taxis */}
          {Array.isArray(nearbyTaxis) && nearbyTaxis.map((taxi, idx) => {
            if (!taxi || typeof taxi.lat !== 'number' || typeof taxi.lng !== 'number') return null;
            return (
              <Marker 
                key={idx} 
                position={[taxi.lat, taxi.lng]} 
                icon={createTaxiPinIcon(taxi.label || `Taxi #${idx + 1}`)}
              />
            );
          })}

          {/* Destination Pin */}
          {destination && typeof destination.lat === 'number' && typeof destination.lng === 'number' && (
            <Marker position={[destination.lat, destination.lng]} icon={createDestinationPinIcon(destination.label || "Dropoff Location")}>
              <Popup>🏁 {destination.label || "Destination"}</Popup>
            </Marker>
          )}

          {/* Active Driver Taxi Marker */}
          {activeDriverPos && typeof activeDriverPos.lat === 'number' && typeof activeDriverPos.lng === 'number' && (
            <Marker position={[activeDriverPos.lat, activeDriverPos.lng]} icon={createTaxiPinIcon("Your Driver")}>
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
