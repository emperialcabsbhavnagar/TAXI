import React, { useState } from 'react';
import { signInWithGoogle, sendEmailOTP } from '../../services/firebaseService';
import logoPng from '../../assets/images/let-you-screen/logo.png';
import bgImg from '../../assets/images/let-you-screen/bg-img.svg';
import { Mail, ArrowLeft, AlertCircle } from 'lucide-react';
import { NativeTripSync } from '../../services/notificationEngine';

export default function LetsYouInScreen({
  phoneNumber, setPhoneNumber,
  selectedGoogleAccount, setSelectedGoogleAccount,
  onNext, onGoToCreateAccount, onGoogleSignIn, onBack,
  setAuthMethod, setAuthEmail
}) {
  const [loadingGoogle, setLoadingGoogle] = useState(false);
  const [emailInput, setEmailInput] = useState('');
  const [otpSending, setOtpSending] = useState(false);
  const [authError, setAuthError] = useState('');

  // Switch status bar icons to white on red header banner, restore to dark on exit
  React.useEffect(() => {
    try {
      if (NativeTripSync && typeof NativeTripSync.setStatusBarTheme === 'function') {
        NativeTripSync.setStatusBarTheme({ theme: 'dark' });
      } else if (window.Capacitor?.Plugins?.NativeTripSync?.setStatusBarTheme) {
        window.Capacitor.Plugins.NativeTripSync.setStatusBarTheme({ theme: 'dark' });
      }
    } catch (e) {}
    return () => {
      try {
        if (NativeTripSync && typeof NativeTripSync.setStatusBarTheme === 'function') {
          NativeTripSync.setStatusBarTheme({ theme: 'light' });
        } else if (window.Capacitor?.Plugins?.NativeTripSync?.setStatusBarTheme) {
          window.Capacitor.Plugins.NativeTripSync.setStatusBarTheme({ theme: 'light' });
        }
      } catch (e) {}
    };
  }, []);

  // ─── 1. Google Sign-In ───
  const handleGoogleAuth = async () => {
    setLoadingGoogle(true);
    setAuthError('');
    try {
      const res = await signInWithGoogle();
      if (res && res.email && !res.error) {
        if (onGoogleSignIn) {
          onGoogleSignIn({ ...res, authMethod: 'google' });
        }
      } else {
        setLoadingGoogle(false);
        const errText = res?.error ? String(res.error) : '';
        if (errText && !errText.includes('cancelled') && !errText.includes('canceled')) {
          setAuthError('Google sign-in was not completed. Please try again or use Email.');
        }
      }
    } catch (err) {
      console.warn('[Auth] Google sign-in note:', err);
      setLoadingGoogle(false);
      setAuthError('Google sign-in was not completed. Please try again or use Email.');
    }
  };

  // ─── 2. Email OTP Login ───
  const handleSendEmailOTP = async () => {
    setAuthError('');
    const cleanEmail = (emailInput || '').toLowerCase().trim();
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!cleanEmail || !emailRegex.test(cleanEmail)) {
      setAuthError('Please enter a valid email address.');
      return;
    }

    setOtpSending(true);
    try {
      const result = await sendEmailOTP(cleanEmail);
      if (result.success) {
        if (setAuthMethod) setAuthMethod('email');
        if (setAuthEmail) setAuthEmail(cleanEmail);
        localStorage.setItem('cabsy_user_email_otp_target', cleanEmail);
        if (onNext) onNext();
      } else {
        setAuthError(result.error || 'Failed to send verification code to email.');
      }
    } catch (e) {
      console.warn('Email OTP error:', e);
      setAuthError('Could not send verification code. Please try again.');
    }
    setOtpSending(false);
  };

  const goToCreateAccount = onGoToCreateAccount || onNext;

  return (
    <div className="real-mobile-app">
      <div className="let-you-in-page-wrapper">
        {/* Red Brand Header Banner */}
        <div 
          className="let-you-red-header"
          style={{
            backgroundImage: `url(${bgImg})`,
            backgroundRepeat: 'no-repeat',
            backgroundPosition: 'center top',
            backgroundSize: 'cover',
            backgroundColor: '#FB4945'
          }}
        >
          <button className="let-you-white-back-btn" onClick={onBack} aria-label="Go Back">
            <ArrowLeft size={22} color="#FFFFFF" />
          </button>
          
          <div className="let-you-centered-logo-box">
            <img 
              src={logoPng} 
              alt="EMPERIAL CABS" 
              onError={(e) => {
                e.target.onerror = null;
                e.target.src = logoPng;
              }}
            />
          </div>
        </div>

        {/* White Curved Bottom Sheet Content */}
        <div className="let-you-white-bottom-sheet">
          <h1 className="let-you-title" style={{ marginBottom: '6px' }}>Let's You In</h1>
          <p style={{ textAlign: 'center', color: '#64748B', fontSize: '14px', margin: '0 0 20px 0', fontFamily: 'Space Grotesk, sans-serif' }}>
            Choose your preferred sign-in method
          </p>

          {/* Top: Email Login */}
          <div style={{
            display: 'flex',
            alignItems: 'center',
            background: '#F8FAFC',
            border: '1.5px solid #E2E8F0',
            borderRadius: '16px',
            padding: '0 16px',
            height: '54px',
            boxSizing: 'border-box',
            transition: 'all 0.2s ease'
          }}>
            <div style={{
              display: 'flex',
              alignItems: 'center',
              paddingRight: '14px',
              marginRight: '14px',
              borderRight: '1.5px solid #CBD5E1',
              height: '24px'
            }}>
              <Mail size={19} color="#64748B" />
            </div>
            <input 
              type="email" 
              value={emailInput} 
              onChange={(e) => setEmailInput(e.target.value)} 
              placeholder="Enter your email address"
              autoCapitalize="none"
              autoCorrect="off"
              style={{
                border: 'none',
                background: 'transparent',
                outline: 'none',
                width: '100%',
                fontFamily: 'Space Grotesk, sans-serif',
                fontSize: '15px',
                fontWeight: '600',
                color: '#0F172A'
              }}
            />
          </div>

          {/* Clean Error Message */}
          {authError && (
            <div style={{
              display: 'flex',
              alignItems: 'center',
              gap: '8px',
              background: '#FEF2F2',
              border: '1px solid #FCA5A5',
              color: '#991B1B',
              padding: '12px 16px',
              borderRadius: '14px',
              fontSize: '13px',
              fontWeight: '600',
              marginTop: '12px',
              fontFamily: 'Space Grotesk, sans-serif'
            }}>
              <AlertCircle size={18} color="#DC2626" />
              <span>{authError}</span>
            </div>
          )}

          {/* Continue with Email Button */}
          <button
            type="button"
            className="let-you-signin-btn"
            disabled={otpSending}
            onClick={handleSendEmailOTP}
            style={{ 
              marginTop: '14px', 
              opacity: otpSending ? 0.7 : 1, 
              cursor: otpSending ? 'wait' : 'pointer'
            }}
          >
            {otpSending ? 'Sending verification code...' : 'Continue with Email'}
          </button>

          {/* Divider */}
          <div style={{ 
            display: 'flex', 
            alignItems: 'center', 
            margin: '22px 0 18px 0', 
            gap: '12px' 
          }}>
            <div style={{ flex: 1, height: '1px', background: '#E2E8F0' }} />
            <span style={{ fontSize: '12px', color: '#94A3B8', fontWeight: '700', letterSpacing: '0.5px' }}>
              OR CONTINUE WITH
            </span>
            <div style={{ flex: 1, height: '1px', background: '#E2E8F0' }} />
          </div>

          {/* Bottom: Google Sign-In */}
          <div>
            <button 
              type="button"
              disabled={loadingGoogle}
              onClick={handleGoogleAuth}
              style={{
                width: '100%',
                padding: '14px 16px',
                borderRadius: '16px',
                border: '1.5px solid #E2E8F0',
                background: '#FFFFFF',
                color: '#0F172A',
                fontFamily: 'Space Grotesk, sans-serif',
                fontWeight: '700',
                fontSize: '15px',
                cursor: loadingGoogle ? 'wait' : 'pointer',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                gap: '12px',
                boxShadow: '0 2px 8px rgba(0,0,0,0.03)',
                transition: 'all 0.15s ease',
                opacity: loadingGoogle ? 0.7 : 1
              }}
            >
              <svg width="20" height="20" viewBox="0 0 24 24">
                <path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"/>
                <path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"/>
                <path fill="#FBBC05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.06H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.94l2.85-2.22.81-.63z"/>
                <path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.06l3.66 2.84c.87-2.6 3.3-4.52 6.16-4.52z"/>
              </svg>
              <span>{loadingGoogle ? 'Connecting with Google...' : 'Continue with Google'}</span>
            </button>
          </div>

          <p className="let-you-footer-txt" style={{ textAlign: 'center', marginTop: '24px', fontSize: '14px', color: '#64748B', fontWeight: '600' }}>
            Don't have an account? <span style={{ color: '#252B34', fontWeight: '800', cursor: 'pointer' }} onClick={goToCreateAccount}>Sign up</span>
          </p>
        </div>
      </div>
    </div>
  );
}
