import React, { useEffect } from 'react';

const AccountCreatedGraphic = () => (
  <svg viewBox="0 0 340 260" fill="none" xmlns="http://www.w3.org/2000/svg" style={{ width: '100%', height: '100%', maxHeight: '260px' }}>
    <defs>
      <linearGradient id="accBg" x1="0" y1="0" x2="340" y2="260" gradientUnits="userSpaceOnUse">
        <stop stopColor="#FAFAFA" />
        <stop offset="1" stopColor="#ECFDF5" />
      </linearGradient>
      <filter id="accShadow" x="-10%" y="-10%" width="130%" height="130%">
        <feDropShadow dx="0" dy="10" stdDeviation="16" floodColor="#10B981" floodOpacity="0.2" />
      </filter>
    </defs>
    <rect width="340" height="260" rx="28" fill="url(#accBg)" />

    {/* Background Celebration Sparkles */}
    <g opacity="0.6">
      <circle cx="50" cy="50" r="4" fill="#FFAE00" />
      <circle cx="290" cy="60" r="6" fill="#10B981" />
      <circle cx="40" cy="200" r="5" fill="#3B82F6" />
      <circle cx="300" cy="190" r="4" fill="#FFAE00" />
      <path d="M70 120 L74 128 L82 132 L74 136 L70 144 L66 136 L58 132 L66 128 Z" fill="#FFAE00" />
      <path d="M260 110 L263 115 L268 118 L263 121 L260 126 L257 121 L252 118 L257 115 Z" fill="#10B981" />
    </g>

    {/* Central Success Badge */}
    <g transform="translate(170, 125)">
      {/* Outer Pulsing Aura */}
      <circle cx="0" cy="0" r="70" fill="#D1FAE5" className="ob-animate-pulse" />
      <circle cx="0" cy="0" r="55" fill="#10B981" filter="url(#accShadow)" />
      
      {/* Checkmark Icon */}
      <path d="M-18 -2 L-6 10 L18 -14" stroke="#FFFFFF" strokeWidth="9" strokeLinecap="round" strokeLinejoin="round" className="ob-animate-check" />
    </g>

    {/* Gold Crown / VIP Star Top Accent */}
    <g transform="translate(170, 42)" className="ob-animate-float">
      <circle cx="0" cy="0" r="18" fill="#FFAE00" />
      <path d="M-6 -2 L0 -9 L6 -2 L8 5 L-8 5 Z" fill="#FFFFFF" />
    </g>
  </svg>
);

export default function AccountCreatedScreen({ onNext, onBack }) {
  useEffect(() => {
    try {
      localStorage.setItem('EMPERIAL CABS_onboarded', 'true');
      localStorage.setItem('EMPERIAL CABS_profile_completed', 'true');
    } catch (e) {}
  }, []);

  return (
    <div className="real-mobile-app" style={{ background: '#FFFFFF' }}>
      <div className="white-header-nav" style={{ display: 'flex', alignItems: 'center', borderBottom: '1px solid #F1F5F9' }}>
        <button 
          className="header-back-arrow" 
          onClick={onNext}
          style={{ background: 'none', border: 'none', fontSize: '24px', cursor: 'pointer', color: '#0F172A', marginRight: '12px' }}
        >
          ‹
        </button>
        <h2 className="white-header-title" style={{ fontFamily: 'League Spartan, sans-serif', fontSize: '20px', fontWeight: '800', color: '#0F172A', margin: 0 }}>
          Account Created
        </h2>
      </div>

      <div className="verify-screen-body" style={{ padding: '20px 20px 28px 20px', display: 'flex', flexDirection: 'column', height: 'calc(100% - 60px)', justifyContent: 'space-between', boxSizing: 'border-box' }}>
        <div style={{ textAlign: 'center', flex: 1, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center' }}>
          <div style={{ width: '100%', maxWidth: '320px', minHeight: '250px', display: 'flex', justifyContent: 'center', alignItems: 'center', margin: '0 auto 16px auto' }}>
            <AccountCreatedGraphic />
          </div>

          <h2 style={{ fontFamily: 'League Spartan, sans-serif', fontSize: '32px', fontWeight: '800', color: '#0F172A', margin: '0 0 10px 0', letterSpacing: '-0.5px' }}>
            Account Created
          </h2>

          <p style={{ fontFamily: 'Space Grotesk, sans-serif', fontSize: '16px', color: '#64748B', lineHeight: '1.6', maxWidth: '310px', margin: '0 auto' }}>
            Your account had been created successfully. Welcome to EMPERIAL CABS Executive Mobility.
          </p>
        </div>

        <div style={{ width: '100%', marginTop: '20px' }}>
          <button 
            className="notification-allow-btn" 
            onClick={onNext}
            style={{
              width: '100%',
              height: '56px',
              borderRadius: '16px',
              background: '#FFAE00',
              color: '#FFFFFF',
              fontFamily: 'League Spartan, sans-serif',
              fontSize: '18px',
              fontWeight: '800',
              border: 'none',
              cursor: 'pointer',
              boxShadow: '0 8px 20px rgba(255, 174, 0, 0.35)',
              transition: 'transform 0.15s ease'
            }}
          >
            Get Started
          </button>
        </div>
      </div>
    </div>
  );
}
