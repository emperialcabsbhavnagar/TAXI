import React from 'react';
import { X, ArrowRight } from 'lucide-react';

/**
 * ShortTripPosterModal
 * High-impact login promo poster matching the official design specification.
 * Displays on app launch / login with a clear top-right Cancel button to return to normal home screen.
 */
export default function ShortTripPosterModal({ isOpen, onClose, onOpenShortTrip }) {
  if (!isOpen) return null;

  const handleAction = () => {
    try {
      sessionStorage.setItem('cabsy_short_trip_poster_dismissed', 'true');
    } catch (e) {}
    if (onOpenShortTrip) onOpenShortTrip();
  };

  const handleDismiss = () => {
    try {
      sessionStorage.setItem('cabsy_short_trip_poster_dismissed', 'true');
    } catch (e) {}
    if (onClose) onClose();
  };

  return (
    <div 
      className="short-trip-poster-overlay"
      style={{
        position: 'fixed',
        inset: 0,
        zIndex: 100000,
        backgroundColor: 'rgba(15, 23, 42, 0.82)',
        backdropFilter: 'blur(8px)',
        WebkitBackdropFilter: 'blur(8px)',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        padding: '16px',
        boxSizing: 'border-box',
        animation: 'posterOverlayFade 0.22s ease-out'
      }}
      onClick={(e) => {
        if (e.target === e.currentTarget) handleDismiss();
      }}
    >
      <div 
        className="short-trip-poster-card"
        style={{
          position: 'relative',
          width: '100%',
          maxWidth: '380px',
          maxHeight: '90vh',
          backgroundColor: '#FFFFFF',
          borderRadius: '26px',
          overflow: 'hidden',
          boxShadow: '0 25px 60px -15px rgba(0, 0, 0, 0.6), 0 0 0 1px rgba(255, 255, 255, 0.25)',
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          animation: 'posterCardPop 0.28s cubic-bezier(0.16, 1, 0.3, 1)',
          cursor: 'pointer'
        }}
        onClick={handleAction}
      >
        {/* Prominent Top-Right Cancel Button */}
        <button
          type="button"
          onClick={(e) => {
            e.stopPropagation();
            handleDismiss();
          }}
          aria-label="Cancel and return to home"
          style={{
            position: 'absolute',
            top: '12px',
            right: '12px',
            zIndex: 30,
            padding: '7px 14px',
            borderRadius: '999px',
            backgroundColor: 'rgba(15, 23, 42, 0.85)',
            color: '#FFFFFF',
            border: '1.5px solid rgba(255, 255, 255, 0.4)',
            backdropFilter: 'blur(8px)',
            WebkitBackdropFilter: 'blur(8px)',
            boxShadow: '0 4px 16px rgba(0, 0, 0, 0.35)',
            display: 'inline-flex',
            alignItems: 'center',
            gap: '6px',
            fontSize: '13px',
            fontWeight: 800,
            letterSpacing: '0.02em',
            cursor: 'pointer',
            transition: 'all 0.18s ease'
          }}
        >
          <X size={16} strokeWidth={2.8} />
          <span>Cancel</span>
        </button>

        {/* Poster Visual Presentation */}
        <div style={{ width: '100%', position: 'relative', backgroundColor: '#FFFFFF', display: 'flex', flexDirection: 'column', alignItems: 'center' }}>
          <img 
            src="/short-trip-poster.png" 
            alt="Short Trips Now Available in Bhavnagar"
            style={{
              width: '100%',
              height: 'auto',
              maxHeight: '85vh',
              objectFit: 'contain',
              display: 'block'
            }}
          />
        </div>
      </div>

      <style>{`
        @keyframes posterOverlayFade {
          from { opacity: 0; }
          to { opacity: 1; }
        }
        @keyframes posterCardPop {
          from { transform: scale(0.92) translateY(14px); opacity: 0; }
          to { transform: scale(1) translateY(0); opacity: 1; }
        }
      `}</style>
    </div>
  );
}
