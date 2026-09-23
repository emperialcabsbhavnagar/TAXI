import React, { useState, useEffect } from 'react';
import onboarding1Img from '../../assets/images/onboarding/onboarding1.png';
import onboarding2Img from '../../assets/images/onboarding/onboarding2.png';
import onboarding3Img from '../../assets/images/onboarding/onboarding3.png';
import onboarding4Img from '../../assets/images/onboarding/onboarding4.png';

// Eagerly preload all onboarding image assets into browser RAM cache for instant 0ms slide loading
if (typeof window !== 'undefined') {
  [onboarding1Img, onboarding2Img, onboarding3Img, onboarding4Img].forEach((src) => {
    const img = new Image();
    img.src = src;
  });
}

// ============================================================================
// SLIDE 1: REQUEST A RIDE (100% EXACT 4K IMAGE RENDERING WITH VECTOR CRISPNESS)
// ============================================================================
function RequestRideSVG() {
  return (
    <svg width="100%" height="100%" viewBox="0 0 440 440" preserveAspectRatio="xMidYMid meet">
      <rect x="0" y="0" width="440" height="440" fill="#FFFFFF" />
      <image 
        href={onboarding1Img} 
        x="0" 
        y="0" 
        width="440" 
        height="440" 
        preserveAspectRatio="xMidYMid meet"
        style={{
          imageRendering: 'crisp-edges',
          filter: 'contrast(102%) brightness(101%)',
          WebkitFontSmoothing: 'antialiased'
        }}
      />
    </svg>
  );
}

// 2. VEHICLE SELECTION SVG (100% EXACT 4K IMAGE RENDERING)
function VehicleSelectionSVG() {
  return (
    <svg width="100%" height="100%" viewBox="0 0 440 440" preserveAspectRatio="xMidYMid meet">
      <rect x="0" y="0" width="440" height="440" fill="#FFFFFF" />
      <image 
        href={onboarding2Img} 
        x="0" 
        y="0" 
        width="440" 
        height="440" 
        preserveAspectRatio="xMidYMid meet"
        style={{
          imageRendering: 'crisp-edges',
          filter: 'contrast(102%) brightness(101%)',
          WebkitFontSmoothing: 'antialiased'
        }}
      />
    </svg>
  );
}

// 3. LIVE RIDE TRACKING SVG (100% EXACT 4K IMAGE RENDERING)
function LiveTrackingSVG() {
  return (
    <svg width="100%" height="100%" viewBox="0 0 440 440" preserveAspectRatio="xMidYMid meet">
      <rect x="0" y="0" width="440" height="440" fill="#FFFFFF" />
      <image 
        href={onboarding3Img} 
        x="0" 
        y="0" 
        width="440" 
        height="440" 
        preserveAspectRatio="xMidYMid meet"
        style={{
          imageRendering: 'crisp-edges',
          filter: 'contrast(102%) brightness(101%)',
          WebkitFontSmoothing: 'antialiased'
        }}
      />
    </svg>
  );
}

// 4. TRIP SHARING SVG (100% EXACT 4K IMAGE RENDERING)
function TripSharingSVG() {
  return (
    <svg width="100%" height="100%" viewBox="0 0 440 440" preserveAspectRatio="xMidYMid meet">
      <rect x="0" y="0" width="440" height="440" fill="#FFFFFF" />
      <image 
        href={onboarding4Img} 
        x="0" 
        y="0" 
        width="440" 
        height="440" 
        preserveAspectRatio="xMidYMid meet"
        style={{
          imageRendering: 'crisp-edges',
          filter: 'contrast(102%) brightness(101%)',
          WebkitFontSmoothing: 'antialiased'
        }}
      />
    </svg>
  );
}


// ============================================================================
// MAIN MOBILE ONBOARDING SCREEN COMPONENT
// ============================================================================
export default function OnboardingScreen({ onFinish }) {
  const [onboardingStep, setOnboardingStep] = useState(0);

  const onboardingSlides = [
    {
      title: "Request a Ride",
      desc: "Request a ride get picked up by a nearby community driver.",
      svg: <RequestRideSVG />
    },
    {
      title: "Vehicle Selection",
      desc: "Users have the liberty to choose the type of vehicle as per their need.",
      svg: <VehicleSelectionSVG />
    },
    {
      title: "Live Ride Tracking",
      desc: "Know your driver in advance and be able to view current location in real time on the map.",
      svg: <LiveTrackingSVG />
    },
    {
      title: "Trip Sharing",
      desc: "Passengers can share their ride details with family and friends for safety reasons.",
      svg: <TripSharingSVG />
    }
  ];

  const currentSlide = onboardingSlides[onboardingStep];

  return (
    <div 
      className="real-mobile-app" 
      style={{ 
        background: '#FFFFFF',
        width: '100%',
        minWidth: '100%',
        height: '100%',
        minHeight: '100dvh',
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        justifyContent: 'space-between',
        padding: '20px 20px 30px 20px',
        boxSizing: 'border-box',
        userSelect: 'none',
        overflow: 'hidden'
      }}
    >
      <style>{`
        @keyframes slideFadeIn {
          from { opacity: 0; transform: translateY(10px) scale(0.98); }
          to { opacity: 1; transform: translateY(0px) scale(1); }
        }
        @keyframes floatMotion {
          0%, 100% { transform: translateY(0px); }
          50% { transform: translateY(-7px); }
        }
      `}</style>

      {/* Top Graphic Scene Container */}
      <div 
        style={{ 
          width: '100%', 
          display: 'flex', 
          justifyContent: 'center', 
          alignItems: 'center',
          flex: 1,
          padding: '0',
          maxHeight: '66vh'
        }}
      >
        <div
          key={onboardingStep}
          style={{
            width: '100%',
            maxWidth: '440px',
            height: '100%',
            maxHeight: '380px',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            backgroundColor: '#FFFFFF',
            position: 'relative',
            transform: 'scale(1.04)',
            animation: 'slideFadeIn 0.45s cubic-bezier(0.16, 1, 0.3, 1), floatMotion 3.8s ease-in-out infinite 0.45s',
            willChange: 'transform'
          }}
        >
          {currentSlide.svg}
        </div>
      </div>

      {/* Text Content & Active Indicators */}
      <div style={{ textAlign: 'center', width: '100%', maxWidth: '360px', marginBottom: '20px' }}>
        <h2 style={{ 
          fontFamily: "'Space Grotesk', 'League Spartan', sans-serif", 
          fontSize: '28px', 
          fontWeight: '800', 
          color: '#0F172A', 
          margin: '0 0 10px 0',
          letterSpacing: '-0.5px'
        }}>
          {currentSlide.title}
        </h2>
        
        <p style={{ 
          fontFamily: "'Space Grotesk', sans-serif", 
          fontSize: '15px', 
          color: '#64748B', 
          lineHeight: '1.55', 
          margin: '0 auto 24px auto',
          maxWidth: '320px',
          minHeight: '48px'
        }}>
          {currentSlide.desc}
        </p>

        {/* Modern Active Step Dots */}
        <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', gap: '8px' }}>
          {onboardingSlides.map((_, idx) => (
            <div 
              key={idx} 
              onClick={() => setOnboardingStep(idx)}
              style={{
                height: '7px',
                width: idx === onboardingStep ? '32px' : '7px',
                borderRadius: '4px',
                background: idx === onboardingStep ? '#FFAA00' : '#E2E8F0',
                cursor: 'pointer',
                transition: 'all 0.35s cubic-bezier(0.16, 1, 0.3, 1)'
              }} 
            />
          ))}
        </div>
      </div>

      {/* Footer Controls */}
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', width: '100%', maxWidth: '380px' }}>
        <button 
          type="button"
          onClick={onFinish}
          style={{
            background: 'transparent',
            border: 'none',
            fontFamily: "'Space Grotesk', sans-serif",
            fontSize: '16px',
            fontWeight: '700',
            color: '#64748B',
            cursor: 'pointer',
            padding: '12px 16px',
            borderRadius: '12px',
            transition: 'color 0.2s ease'
          }}
        >
          Skip
        </button>

        <button 
          type="button"
          onClick={() => {
            if (onboardingStep < onboardingSlides.length - 1) {
              setOnboardingStep(prev => prev + 1);
            } else {
              onFinish();
            }
          }}
          style={{
            background: '#FFAA00',
            color: '#0F172A',
            border: 'none',
            borderRadius: '20px',
            padding: '12px 36px',
            fontFamily: "'Space Grotesk', sans-serif",
            fontSize: '15px',
            fontWeight: '800',
            cursor: 'pointer',
            boxShadow: '0 6px 20px rgba(255, 170, 0, 0.35)',
            transition: 'transform 0.15s ease, background 0.2s ease'
          }}
        >
          {onboardingStep === onboardingSlides.length - 1 ? 'Get Started' : 'Next'}
        </button>
      </div>

    </div>
  );
}
