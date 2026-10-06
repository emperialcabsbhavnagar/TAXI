import React, { useState } from 'react';
import { Geolocation } from '@capacitor/geolocation';
import { reverseGeocodeCoords, validateCoordinates } from '../../services/liveLocationService';
import { MapPin } from 'lucide-react';

export default function LocationPermScreen({ onAllow, onSkip, onNext, onBack }) {
  const [statusText, setStatusText] = useState('');
  const [isError, setIsError] = useState(false);
  const [isLoading, setIsLoading] = useState(false);

  const handleSkip = () => {
    try {
      localStorage.setItem('EMPERIAL CABS_location_configured', 'true');
      localStorage.setItem('EMPERIAL CABS_gps_enabled', 'false');
    } catch (e) {}
    if (onSkip) onSkip();
    else if (onNext) onNext();
    else if (onBack) onBack();
  };

  const handleEnableGps = async () => {
    setIsLoading(true);
    setStatusText('');
    setIsError(false);

    try {
      const isNative = typeof window !== 'undefined' && 
        ((window.Capacitor && typeof window.Capacitor.isNativePlatform === 'function' && window.Capacitor.isNativePlatform()) ||
         window.location.protocol === 'file:' || 
         window.location.protocol === 'capacitor:');

      if (isNative) {
        let permStatus = null;
        try {
          permStatus = await Geolocation.checkPermissions();
          if (!permStatus || permStatus.location !== 'granted') {
            permStatus = await Geolocation.requestPermissions();
          }
        } catch (pErr) {
          console.warn('Native permission check/request error:', pErr);
        }

        if (permStatus && permStatus.location === 'granted') {
          try {
            const position = await Geolocation.getCurrentPosition({
              enableHighAccuracy: true,
              timeout: 10000,
              maximumAge: 5000
            });

            if (position && position.coords) {
              const { latitude, longitude } = position.coords;
              if (validateCoordinates(latitude, longitude)) {
                const addr = await reverseGeocodeCoords(latitude, longitude);
                try {
                  localStorage.setItem('EMPERIAL CABS_location_configured', 'true');
                  localStorage.setItem('EMPERIAL CABS_gps_enabled', 'true');
                  localStorage.setItem('EMPERIAL CABS_user_location', JSON.stringify({
                    lat: latitude,
                    lng: longitude,
                    address: addr || 'Current Location'
                  }));
                } catch (e) {}

                setTimeout(() => {
                  if (onAllow) onAllow({ lat: latitude, lng: longitude }, addr);
                  else if (onNext) onNext();
                }, 350);
                return;
              }
            }
          } catch (posErr) {
            console.warn('Native getCurrentPosition error:', posErr);
            handleSkip();
            return;
          }
        } else {
          handleSkip();
          return;
        }
      }

      // Fallback: Web / HTML5 Geolocation Flow
      if (navigator.geolocation) {
        navigator.geolocation.getCurrentPosition(
          async (pos) => {
            if (pos && pos.coords) {
              const { latitude, longitude } = pos.coords;
              if (validateCoordinates(latitude, longitude)) {
                const addr = await reverseGeocodeCoords(latitude, longitude);
                try {
                  localStorage.setItem('EMPERIAL CABS_location_configured', 'true');
                  localStorage.setItem('EMPERIAL CABS_gps_enabled', 'true');
                  localStorage.setItem('EMPERIAL CABS_user_location', JSON.stringify({
                    lat: latitude,
                    lng: longitude,
                    address: addr || 'Current Location'
                  }));
                } catch (e) {}

                setTimeout(() => {
                  if (onAllow) onAllow({ lat: latitude, lng: longitude }, addr);
                  else if (onNext) onNext();
                }, 350);
                return;
              }
            }
            handleSkip();
          },
          (err) => {
            console.warn('Geolocation error:', err);
            handleSkip();
          },
          { enableHighAccuracy: true, timeout: 10000 }
        );
      } else {
        handleSkip();
      }
    } catch (err) {
      console.warn('Location request error:', err);
      handleSkip();
    }
  };

  return (
    <div className="real-mobile-app" style={{ background: '#FFFFFF', minHeight: '100vh', display: 'flex', flexDirection: 'column' }}>
      {/* Clean Top Navigation matching phone_screen_updated.png */}
      <div className="white-header-nav" style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '16px 20px', borderBottom: '1px solid #F1F5F9' }}>
        <h2 style={{ fontSize: '18px', fontWeight: '800', color: '#0F172A', margin: 0, letterSpacing: '-0.01em' }}>
          Location
        </h2>
        <button 
          onClick={handleSkip}
          style={{ background: 'none', border: 'none', fontSize: '15px', fontWeight: '600', color: '#2563EB', cursor: 'pointer', padding: 0 }}
        >
          Skip
        </button>
      </div>

      {/* Main Content */}
      <div style={{ flex: 1, padding: '40px 24px', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', textAlign: 'center' }}>
        
        {/* Minimal Icon */}
        <div style={{
          width: '64px',
          height: '64px',
          borderRadius: '20px',
          background: '#F8FAFC',
          border: '1.5px solid #E2E8F0',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          marginBottom: '24px'
        }}>
          <MapPin size={28} color="#0F172A" />
        </div>

        {/* Clean Title */}
        <h2 style={{ fontSize: '22px', fontWeight: '800', color: '#0F172A', margin: '0 0 10px 0', letterSpacing: '-0.02em' }}>
          Enable Location
        </h2>

        {/* Single Clean Line */}
        <p style={{ fontSize: '14px', color: '#64748B', lineHeight: '1.6', margin: '0 0 12px 0', maxWidth: '320px' }}>
          Allow location access to detect your pickup point, find nearby cabs, and calculate accurate fares.
        </p>

        {/* Concise Foreground Disclosure */}
        <p style={{ fontSize: '12px', color: '#94A3B8', lineHeight: '1.5', margin: '0 0 20px 0', maxWidth: '300px' }}>
          Emperial Cabs accesses foreground device location only while the app is in use.
        </p>

        {statusText && (
          <p style={{ fontSize: '13px', fontWeight: '600', color: isError ? '#DC2626' : '#166534', marginBottom: '20px' }}>
            {statusText}
          </p>
        )}
      </div>

      {/* Bottom Actions matching phone_screen_updated.png */}
      <div style={{ padding: '24px 20px', display: 'flex', flexDirection: 'column', gap: '12px' }}>
        <button 
          type="button"
          onClick={handleEnableGps}
          disabled={isLoading}
          style={{
            width: '100%',
            height: '52px',
            borderRadius: '14px',
            background: 'linear-gradient(135deg, #FFAE00 0%, #FF9500 100%)',
            color: '#FFFFFF',
            fontSize: '16px',
            fontWeight: '800',
            border: 'none',
            cursor: isLoading ? 'default' : 'pointer',
            boxShadow: '0 4px 14px rgba(255, 174, 0, 0.3)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            opacity: isLoading ? 0.8 : 1
          }}
        >
          {isLoading ? 'Checking Location...' : 'Allow Location'}
        </button>

        <button 
          type="button"
          onClick={handleSkip}
          style={{
            width: '100%',
            height: '44px',
            borderRadius: '12px',
            background: 'transparent',
            border: 'none',
            fontSize: '14px',
            fontWeight: '700',
            color: '#64748B',
            cursor: 'pointer'
          }}
        >
          Not Now
        </button>
      </div>
    </div>
  );
}
