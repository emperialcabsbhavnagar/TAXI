import React, { useState } from 'react';
import { Geolocation } from '@capacitor/geolocation';
import { reverseGeocodeCoords, validateCoordinates } from '../../services/liveLocationService';
import { MapPin, Navigation, ShieldCheck, CheckCircle2, AlertCircle, ArrowRight } from 'lucide-react';

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
    setStatusText('Requesting location permission...');
    setIsError(false);

    try {
      const isNative = typeof window !== 'undefined' && 
        ((window.Capacitor && typeof window.Capacitor.isNativePlatform === 'function' && window.Capacitor.isNativePlatform()) ||
         window.location.protocol === 'file:' || 
         window.location.protocol === 'capacitor:');

      if (isNative) {
        // Native Capacitor Geolocation Flow
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
          setStatusText('Acquiring precise GPS location...');
          try {
            const position = await Geolocation.getCurrentPosition({
              enableHighAccuracy: true,
              timeout: 10000,
              maximumAge: 5000
            });

            if (position && position.coords) {
              const { latitude, longitude } = position.coords;
              if (validateCoordinates(latitude, longitude)) {
                setStatusText('Location detected successfully.');
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
                }, 400);
                return;
              }
            }
          } catch (posErr) {
            console.warn('Native getCurrentPosition error:', posErr);
            setIsError(true);
            setStatusText('Device GPS is turned off. Please turn on Location in device settings or continue with manual pickup.');
            setIsLoading(false);
            return;
          }
        } else {
          setIsError(true);
          setStatusText('Location permission was denied. You can proceed to the map and enter your pickup spot manually.');
          setIsLoading(false);
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
                setStatusText('Location detected successfully.');
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
                }, 400);
                return;
              }
            }
            handleSkip();
          },
          (err) => {
            console.warn('Geolocation error:', err);
            setIsError(true);
            if (err.code === 1) {
              setStatusText('Location permission was denied. You can proceed to the map and enter your pickup location manually.');
            } else {
              setStatusText('Location is currently unavailable. You can proceed to the map and enter your pickup location manually.');
            }
            setIsLoading(false);
          },
          { enableHighAccuracy: true, timeout: 10000 }
        );
      } else {
        handleSkip();
      }
    } catch (err) {
      console.warn('Location request error:', err);
      setIsError(true);
      setStatusText('Location service is currently disabled. You can proceed to the map and select your pickup location manually.');
      setIsLoading(false);
    }
  };

  return (
    <div className="real-mobile-app" style={{ background: '#FFFFFF', minHeight: '100vh', display: 'flex', flexDirection: 'column' }}>
      {/* Header */}
      <div className="white-header-nav" style={{ borderBottom: '1px solid #F1F5F9', padding: '12px 16px', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
        <button 
          className="header-back-arrow" 
          onClick={handleSkip}
          style={{ background: 'none', border: 'none', fontSize: '24px', cursor: 'pointer', color: '#0F172A', lineHeight: 1 }}
        >
          ‹
        </button>
        <h2 className="white-header-title" style={{ margin: 0, fontSize: '17px', fontWeight: '700', color: '#0F172A' }}>
          Location Access
        </h2>
        <button 
          onClick={handleSkip}
          style={{ background: 'none', border: 'none', fontSize: '14px', fontWeight: '700', color: '#64748B', cursor: 'pointer', padding: 0 }}
        >
          Skip
        </button>
      </div>

      {/* Body with Prominent Disclosure */}
      <div className="verify-screen-body" style={{ flex: 1, padding: '24px 20px', display: 'flex', flexDirection: 'column', overflowY: 'auto' }}>
        
        {/* Animated Map Pin Illustration */}
        <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', margin: '8px auto 20px auto', width: '100%', maxWidth: '200px', height: '140px' }}>
          <svg viewBox="0 0 200 140" fill="none" xmlns="http://www.w3.org/2000/svg" style={{ width: '100%', height: '100%' }}>
            <rect width="200" height="140" rx="20" fill="#F8FAFC" />
            <circle cx="100" cy="70" r="50" fill="#E0F2FE" fillOpacity="0.6" />
            <circle cx="100" cy="70" r="32" fill="#BAE6FD" fillOpacity="0.7" />
            <circle cx="100" cy="70" r="8" fill="#0284C7" />
            <path d="M100 32 C86 32 75 43 75 57 C75 76 100 98 100 98 C100 98 125 76 125 57 C125 43 114 32 100 32 Z" fill="#0284C7" />
            <circle cx="100" cy="54" r="7" fill="#FFFFFF" />
          </svg>
        </div>

        {/* Title */}
        <div style={{ textAlign: 'center', marginBottom: '20px' }}>
          <h2 style={{ fontFamily: 'League Spartan, sans-serif', fontSize: '24px', fontWeight: '800', color: '#0F172A', margin: '0 0 8px 0', letterSpacing: '-0.02em' }}>
            Enable Location Services
          </h2>
          <p style={{ fontFamily: 'Space Grotesk, sans-serif', fontSize: '14px', color: '#64748B', lineHeight: '1.5', margin: 0 }}>
            Find nearby cabs and get accurate fares for your trip.
          </p>
        </div>

        {/* Google Play Prominent Disclosure Card */}
        <div style={{
          background: '#F8FAFC',
          border: '1.5px solid #E2E8F0',
          borderRadius: '16px',
          padding: '16px',
          marginBottom: '20px'
        }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '10px' }}>
            <ShieldCheck size={18} color="#0284C7" />
            <span style={{ fontSize: '13px', fontWeight: '700', color: '#0F172A', letterSpacing: '0.01em' }}>
              Prominent In-App Disclosure
            </span>
          </div>

          <p style={{ fontSize: '13px', color: '#475569', lineHeight: '1.6', margin: '0 0 10px 0' }}>
            <strong>Emperial Cabs</strong> collects and accesses your device&apos;s location data to provide core ride-booking features:
          </p>

          <ul style={{ margin: '0 0 12px 0', paddingLeft: '20px', fontSize: '12.5px', color: '#334155', lineHeight: '1.6' }}>
            <li><strong>Automatic Pickup:</strong> Detect your current pickup location accurately on the map.</li>
            <li><strong>Nearby Cabs:</strong> Locate and display available drivers in your area.</li>
            <li><strong>Transparent Fares:</strong> Calculate precise route distances and travel estimates.</li>
          </ul>

          <div style={{ 
            background: '#EFF6FF', 
            border: '1px solid #BFDBFE', 
            borderRadius: '10px', 
            padding: '10px 12px',
            display: 'flex',
            alignItems: 'flex-start',
            gap: '8px'
          }}>
            <Navigation size={15} color="#1D4ED8" style={{ marginTop: '2px', flexShrink: 0 }} />
            <p style={{ fontSize: '12px', color: '#1E40AF', lineHeight: '1.5', margin: 0 }}>
              <strong>Foreground Use Only:</strong> Location is only accessed while the Emperial Cabs app is open and in use. We never track your location in the background when the app is closed, and we never share your data with advertisers.
            </p>
          </div>
        </div>

        {/* Status / Error Feedback */}
        {statusText && (
          <div style={{
            background: isError ? '#FEF2F2' : '#F0FDF4',
            border: `1.5px solid ${isError ? '#FECACA' : '#BBF7D0'}`,
            borderRadius: '12px',
            padding: '12px 14px',
            marginBottom: '16px',
            display: 'flex',
            alignItems: 'center',
            gap: '10px'
          }}>
            {isError ? <AlertCircle size={18} color="#DC2626" /> : <CheckCircle2 size={18} color="#16A34A" />}
            <p style={{ fontSize: '13px', fontWeight: '600', color: isError ? '#991B1B' : '#166534', margin: 0, lineHeight: '1.4' }}>
              {statusText}
            </p>
          </div>
        )}

        {/* Action Controls */}
        <div style={{ marginTop: 'auto', paddingTop: '12px' }}>
          {isError ? (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
              <button
                onClick={handleSkip}
                style={{
                  width: '100%',
                  height: '52px',
                  borderRadius: '14px',
                  background: 'linear-gradient(135deg, #0F172A 0%, #1E293B 100%)',
                  color: '#FFFFFF',
                  fontSize: '16px',
                  fontWeight: '700',
                  border: 'none',
                  cursor: 'pointer',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  gap: '8px'
                }}
              >
                <span>Continue to Map (Set Manually)</span>
                <ArrowRight size={18} />
              </button>

              <button
                onClick={handleEnableGps}
                disabled={isLoading}
                style={{
                  width: '100%',
                  height: '48px',
                  borderRadius: '14px',
                  background: '#F1F5F9',
                  color: '#0F172A',
                  fontSize: '14px',
                  fontWeight: '700',
                  border: 'none',
                  cursor: 'pointer'
                }}
              >
                Retry Enabling GPS
              </button>
            </div>
          ) : (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
              <button
                onClick={handleEnableGps}
                disabled={isLoading}
                style={{
                  width: '100%',
                  height: '54px',
                  borderRadius: '16px',
                  background: 'linear-gradient(135deg, #FFAE00 0%, #FF9500 100%)',
                  color: '#FFFFFF',
                  fontSize: '16px',
                  fontWeight: '800',
                  border: 'none',
                  cursor: isLoading ? 'default' : 'pointer',
                  boxShadow: '0 8px 24px rgba(255, 174, 0, 0.35)',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  gap: '8px',
                  opacity: isLoading ? 0.8 : 1
                }}
              >
                {isLoading ? (
                  <span>Checking Location...</span>
                ) : (
                  <>
                    <MapPin size={18} />
                    <span>Allow Location Access</span>
                  </>
                )}
              </button>

              <button
                onClick={handleSkip}
                style={{
                  background: 'none',
                  border: 'none',
                  color: '#64748B',
                  fontSize: '14px',
                  fontWeight: '700',
                  cursor: 'pointer',
                  padding: '8px',
                  textDecoration: 'underline'
                }}
              >
                Set Location Manually
              </button>
            </div>
          )}
        </div>

      </div>
    </div>
  );
}

