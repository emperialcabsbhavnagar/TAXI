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
        {/* Top-Right Symbol-Only Close Button */}
        <button
          type="button"
          onClick={(e) => {
            e.stopPropagation();
            handleDismiss();
          }}
          aria-label="Close"
          style={{
            position: 'absolute',
            top: '14px',
            right: '14px',
            zIndex: 30,
            width: '36px',
            height: '36px',
            borderRadius: '50%',
            backgroundColor: 'rgba(15, 23, 42, 0.85)',
            color: '#FFFFFF',
            border: '1.5px solid rgba(255, 255, 255, 0.45)',
            backdropFilter: 'blur(8px)',
            WebkitBackdropFilter: 'blur(8px)',
            boxShadow: '0 4px 14px rgba(0, 0, 0, 0.35)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            cursor: 'pointer',
            transition: 'all 0.18s ease'
          }}
        >
          <X size={18} strokeWidth={2.6} />
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
