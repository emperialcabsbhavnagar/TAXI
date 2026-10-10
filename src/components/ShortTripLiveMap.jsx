import React, { useEffect, useRef, useState } from 'react';
import { MapContainer, TileLayer, Marker, Polyline, useMap } from 'react-leaflet';
import L from 'leaflet';
import 'leaflet/dist/leaflet.css';
import { Crosshair, Clock, Navigation } from 'lucide-react';

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

// Custom DivIcon for Pickup Pin
const createPickupPin = (label = "Pickup") => {
  return L.divIcon({
    className: 'short-trip-pickup-pin',
    html: `
      <div style="display:flex; flex-direction:column; align-items:center; transform:translate(-50%, -100%);">
        <div style="background:#0F172A; color:#FFFFFF; padding:3px 8px; border-radius:8px; font-size:10px; font-weight:800; white-space:nowrap; box-shadow:0 3px 10px rgba(0,0,0,0.3); margin-bottom:3px; border:1px solid rgba(255,255,255,0.2);">
          ${label}
        </div>
        <div style="width:14px; height:14px; background:#10B981; border:2.5px solid #FFFFFF; border-radius:50%; box-shadow:0 0 10px rgba(16,185,129,0.9);"></div>
      </div>
    `,
    iconSize: [0, 0],
    iconAnchor: [0, 0]
  });
};

// Custom DivIcon for Destination Pin
const createDropoffPin = (label = "Drop-off") => {
  return L.divIcon({
    className: 'short-trip-dropoff-pin',
    html: `
      <div style="display:flex; flex-direction:column; align-items:center; transform:translate(-50%, -100%);">
        <div style="background:#0F172A; color:#FFFFFF; padding:3px 8px; border-radius:8px; font-size:10px; font-weight:800; white-space:nowrap; box-shadow:0 3px 10px rgba(0,0,0,0.3); margin-bottom:3px; border:1px solid rgba(255,255,255,0.2);">
          ${label}
        </div>
        <div style="width:14px; height:14px; background:#DC2626; border:2.5px solid #FFFFFF; border-radius:50%; box-shadow:0 0 10px rgba(220,38,38,0.9);"></div>
      </div>
    `,
    iconSize: [0, 0],
    iconAnchor: [0, 0]
  });
};

// Auto-fitter to ensure both pins and polyline fit inside the 20km Bhavnagar viewport
function MapAutoFitter({ pickup, dropoff, route }) {
  const map = useMap();
  useEffect(() => {
    if (!map) return;
    try {
      setTimeout(() => {
        map.invalidateSize();
        if (route && route.length > 0) {
          const bounds = L.latLngBounds(route);
          map.fitBounds(bounds, { padding: [25, 25], maxZoom: 14 });
        } else if (pickup && dropoff) {
          const bounds = L.latLngBounds([pickup, dropoff]);
          map.fitBounds(bounds, { padding: [25, 25], maxZoom: 14 });
        }
      }, 150);
    } catch (e) {}
  }, [map, pickup, dropoff, route]);
  return null;
}

export default function ShortTripLiveMap({ 
  pickupCoords, 
  dropoffCoords, 
  selectedKm = 20,
  onRecenter,
  isLocating = false
}) {
  // Default Bhavnagar coordinates
  const defaultPickup = [21.7645, 72.1480];
  const pCoords = (pickupCoords && typeof pickupCoords.lat === 'number' && typeof pickupCoords.lng === 'number')
    ? [pickupCoords.lat, pickupCoords.lng]
    : defaultPickup;

  // Generate realistic route points connecting pickup and drop-off in Bhavnagar
  const calculateWaypoints = () => {
    const lat1 = pCoords[0];
    const lng1 = pCoords[1];

    // Destination waypoint depending on selectedKm (e.g. 10km vs 20km radius in Bhavnagar)
    const latDelta = (selectedKm === 10 ? 0.045 : 0.082);
    const lngDelta = (selectedKm === 10 ? -0.035 : -0.065);
    const dest = (dropoffCoords && typeof dropoffCoords.lat === 'number' && typeof dropoffCoords.lng === 'number')
      ? [dropoffCoords.lat, dropoffCoords.lng]
      : [lat1 + latDelta, lng1 + lngDelta];

    // Smooth road simulation points (Google Maps polyline style)
    const mid1 = [lat1 + (dest[0] - lat1) * 0.32 + 0.004, lng1 + (dest[1] - lng1) * 0.28];
    const mid2 = [lat1 + (dest[0] - lat1) * 0.65 - 0.003, lng1 + (dest[1] - lng1) * 0.68 + 0.002];
    const mid3 = [lat1 + (dest[0] - lat1) * 0.88, lng1 + (dest[1] - lng1) * 0.92];

    return {
      dest,
      polyline: [
        [lat1, lng1],
        mid1,
        mid2,
        mid3,
        dest
      ]
    };
  };

  const { dest, polyline } = calculateWaypoints();

  // Driving time estimate based on km
  const estTimeMin = selectedKm === 10 ? 16 : (selectedKm === 20 ? 28 : (selectedKm * 1.4).toFixed(0));

  return (
    <div 
      className="short-trip-live-map-wrapper"
      style={{
        position: 'relative',
        width: '100%',
        height: '210px',
        borderRadius: '20px',
        overflow: 'hidden',
        border: '1.5px solid #E2E8F0',
        boxShadow: '0 4px 16px rgba(0, 0, 0, 0.05)',
        backgroundColor: '#E5E7EB'
      }}
    >
      <MapContainer
        center={pCoords}
        zoom={13}
        zoomControl={false}
        attributionControl={false}
        scrollWheelZoom={false}
        dragging={true}
        doubleClickZoom={false}
        style={{ width: '100%', height: '100%', zIndex: 1 }}
      >
        {/* Crisp Positron / OSM Roads Tile Layer */}
        <TileLayer
          url="https://{s}.basemaps.cartocdn.com/rastertiles/voyager/{z}/{x}/{y}{r}.png"
          maxZoom={19}
        />

        {/* Live Route Polyline in Google Maps Blue */}
        <Polyline
          positions={polyline}
          pathOptions={{
            color: '#2563EB',
            weight: 5.5,
            opacity: 0.95,
            lineCap: 'round',
            lineJoin: 'round'
          }}
        />

        {/* Route Casing Shadow for Google Maps Depth Effect */}
        <Polyline
          positions={polyline}
          pathOptions={{
            color: '#1D4ED8',
            weight: 8,
            opacity: 0.35,
            lineCap: 'round',
            lineJoin: 'round'
          }}
        />

        {/* Pickup Pin */}
        <Marker position={pCoords} icon={createPickupPin("Pickup")} />

        {/* Drop-off Pin */}
        <Marker position={dest} icon={createDropoffPin(`${selectedKm} KM`)} />

        {/* Auto Bounds Fitter */}
        <MapAutoFitter pickup={pCoords} dropoff={dest} route={polyline} />
      </MapContainer>

      {/* Floating Google Maps Style Time & Distance Pill */}
      <div
        style={{
          position: 'absolute',
          top: '12px',
          left: '12px',
          zIndex: 10,
          backgroundColor: 'rgba(15, 23, 42, 0.92)',
          color: '#FFFFFF',
          backdropFilter: 'blur(8px)',
          WebkitBackdropFilter: 'blur(8px)',
          padding: '7px 12px',
          borderRadius: '12px',
          display: 'flex',
          alignItems: 'center',
          gap: '8px',
          boxShadow: '0 4px 14px rgba(0,0,0,0.25)',
          border: '1px solid rgba(255,255,255,0.15)'
        }}
      >
        <div style={{ display: 'flex', alignItems: 'center', gap: '5px' }}>
          <Clock size={14} color="#60A5FA" />
          <span style={{ fontSize: '13px', fontWeight: 800 }}>{estTimeMin} min</span>
        </div>
        <span style={{ color: 'rgba(255,255,255,0.4)', fontSize: '12px' }}>•</span>
        <div style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
          <Navigation size={12} color="#34D399" />
          <span style={{ fontSize: '12px', fontWeight: 700, color: '#E2E8F0' }}>~{selectedKm} km</span>
        </div>
      </div>

      {/* Bhavnagar 20 KM Local Zone Tag */}
      <div
        style={{
          position: 'absolute',
          top: '12px',
          right: '12px',
          zIndex: 10,
          backgroundColor: '#FFFFFF',
          color: '#0F172A',
          padding: '4px 10px',
          borderRadius: '999px',
          fontSize: '11px',
          fontWeight: 800,
          boxShadow: '0 2px 8px rgba(0,0,0,0.12)',
          border: '1px solid #E2E8F0',
          display: 'flex',
          alignItems: 'center',
          gap: '4px'
        }}
      >
        <span style={{ width: '6px', height: '6px', borderRadius: '50%', backgroundColor: '#2563EB' }} />
        <span>Bhavnagar Zone</span>
      </div>

      {/* Floating Target GPS Button at Bottom-Right */}
      <button
        type="button"
        onClick={onRecenter}
        disabled={isLocating}
        aria-label="Target Live GPS"
        style={{
          position: 'absolute',
          bottom: '12px',
          right: '12px',
          zIndex: 10,
          width: '38px',
          height: '38px',
          borderRadius: '50%',
          backgroundColor: '#FFFFFF',
          border: '1px solid #CBD5E1',
          boxShadow: '0 4px 14px rgba(0, 0, 0, 0.2)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          cursor: isLocating ? 'wait' : 'pointer',
          color: '#0F172A',
          transition: 'all 0.18s ease'
        }}
      >
        <Crosshair size={18} strokeWidth={2.4} style={{ animation: isLocating ? 'spin 1s linear infinite' : 'none' }} />
      </button>

      <style>{`
        @keyframes spin {
          from { transform: rotate(0deg); }
          to { transform: rotate(360deg); }
        }
      `}</style>
    </div>
  );
}
