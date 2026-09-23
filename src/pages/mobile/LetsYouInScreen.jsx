import React, { useState } from 'react';
import { signInWithGoogle, setupRecaptcha, sendPhoneOTP, sendEmailOTP } from '../../services/firebaseService';
import logoPng from '../../assets/images/let-you-screen/logo.png';
import { Smartphone, Mail, ArrowLeft, AlertCircle } from 'lucide-react';

export default function LetsYouInScreen({
  phoneNumber, setPhoneNumber,
  selectedGoogleAccount, setSelectedGoogleAccount,
  onNext, onGoToCreateAccount, onGoogleSignIn, onBack,
  setAuthMethod, setAuthEmail
}) {
  const [loading, setLoading] = useState(false);
  const [loginMode, setLoginMode] = useState('phone'); // 'phone' | 'email'
  const [emailInput, setEmailInput] = useState('');
  const [otpSending, setOtpSending] = useState(false);
  const [otpError, setOtpError] = useState('');

  // ─── Main handler: "Continue with Google" button ──
  const handleGoogleAuth = async () => {
    setLoading(true);
    setOtpError('');
    try {
      const res = await signInWithGoogle();
      if (res && res.email && !res.error) {
        if (onGoogleSignIn) {
          onGoogleSignIn({ ...res, authMethod: 'google' });
        }
      } else {
        setLoading(false);
        const errText = res?.error ? String(res.error) : '';
        if (errText) {
          console.warn('[GoogleAuth Note]:', errText);
          setLoginMode('email');
          setOtpError(errText.includes('10') || errText.includes('Developer error') || errText.includes('Something went wrong')
            ? 'Please enter your Google email address below to receive your 6-digit verification code.'
            : (errText.includes('cancelled') || errText.includes('canceled')
              ? ''
              : 'Please enter your email or mobile number below to receive your OTP.'));
        }
      }
    } catch (err) {
      console.warn('[Auth] Google sign-in note:', err);
      setLoading(false);
      setLoginMode('email');
      setOtpError('Please enter your email address below to receive your 6-digit verification code.');
    }
  };

  const handleSendOTP = async () => {
    setOtpError('');

    if (loginMode === 'phone') {
      const cleanPhone = (phoneNumber || '').replace(/\D/g, '').slice(-10);
      if (!cleanPhone || cleanPhone.length < 10) {
        setOtpError('Please enter a valid 10-digit mobile number.');
        return;
      }
      setOtpSending(true);
      try {
        setupRecaptcha('recaptcha-container');
        const formatted = '+91' + cleanPhone;
        const result = await sendPhoneOTP(formatted);
        if (result.success) {
          if (setAuthMethod) setAuthMethod('phone');
          if (setPhoneNumber) setPhoneNumber(cleanPhone);
          localStorage.setItem('cabsy_user_phone', formatted);
          if (onNext) onNext();
        } else {
          setOtpError(result.error || 'Failed to send OTP to mobile. Please try again.');
        }
      } catch (e) {
        console.warn('Phone OTP error:', e);
        setOtpError('Could not send OTP. Please try again.');
      }
      setOtpSending(false);
    } else {
      // Email OTP Route
      const cleanEmail = (emailInput || '').toLowerCase().trim();
      const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
      if (!cleanEmail || !emailRegex.test(cleanEmail)) {
        setOtpError('Please enter a valid email address.');
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
          setOtpError(result.error || 'Failed to send verification code to email.');
        }
      } catch (e) {
        console.warn('Email OTP error:', e);
        setOtpError('Could not send verification code. Please try again.');
      }
      setOtpSending(false);
    }
  };

  const goToCreateAccount = onGoToCreateAccount || onNext;

  return (
    <div className="real-mobile-app">
      <div className="let-you-in-page-wrapper">
        {/* Red Brand Header Banner */}
        <div className="let-you-red-header">
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
          <h1 className="let-you-title">Let's You In</h1>

          {/* Segmented Control Toggle (Zomato / Modern Corporate Style) */}
          <div style={{
            display: 'flex',
            background: '#F1F5F9',
            padding: '4px',
            borderRadius: '16px',
            marginBottom: '20px'
          }}>
            <button
              type="button"
              onClick={() => { setLoginMode('phone'); setOtpError(''); }}
              style={{
                flex: 1,
                padding: '10px 16px',
                border: 'none',
                cursor: 'pointer',
                fontFamily: 'Space Grotesk, sans-serif',
                fontWeight: loginMode === 'phone' ? '700' : '600',
                fontSize: '14px',
                borderRadius: '12px',
                background: loginMode === 'phone' ? '#FFFFFF' : 'transparent',
                color: loginMode === 'phone' ? '#0F172A' : '#64748B',
                boxShadow: loginMode === 'phone' ? '0 2px 8px rgba(0,0,0,0.06)' : 'none',
                transition: 'all 0.2s cubic-bezier(0.16, 1, 0.3, 1)',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                gap: '8px'
              }}
            >
              <Smartphone size={18} color={loginMode === 'phone' ? '#10B981' : '#64748B'} />
              Phone OTP
            </button>

            <button
              type="button"
              onClick={() => { setLoginMode('email'); setOtpError(''); }}
              style={{
                flex: 1,
                padding: '10px 16px',
                border: 'none',
                cursor: 'pointer',
                fontFamily: 'Space Grotesk, sans-serif',
                fontWeight: loginMode === 'email' ? '700' : '600',
                fontSize: '14px',
                borderRadius: '12px',
                background: loginMode === 'email' ? '#FFFFFF' : 'transparent',
                color: loginMode === 'email' ? '#0F172A' : '#64748B',
                boxShadow: loginMode === 'email' ? '0 2px 8px rgba(0,0,0,0.06)' : 'none',
                transition: 'all 0.2s cubic-bezier(0.16, 1, 0.3, 1)',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                gap: '8px'
              }}
            >
              <Mail size={18} color={loginMode === 'email' ? '#10B981' : '#64748B'} />
              Email OTP
            </button>
          </div>

          {/* In-Line Mobile Input (+91 strictly inline) */}
          {loginMode === 'phone' && (
            <div style={{
              display: 'flex',
              alignItems: 'center',
              background: '#F8FAFC',
              border: '1.5px solid #E2E8F0',
              borderRadius: '16px',
              padding: '0 16px',
              height: '56px',
              boxSizing: 'border-box',
              transition: 'all 0.2s ease'
            }}>
              <div style={{
                display: 'flex',
                alignItems: 'center',
                gap: '8px',
                paddingRight: '14px',
                marginRight: '14px',
                borderRight: '1.5px solid #CBD5E1',
                whiteSpace: 'nowrap',
                height: '24px'
              }}>
                <span style={{ fontSize: '18px', lineHeight: 1 }}>🇮🇳</span>
                <span style={{ fontFamily: 'Space Grotesk, sans-serif', fontSize: '15px', fontWeight: '700', color: '#0F172A' }}>+91</span>
              </div>
              <input 
                type="tel" 
                value={phoneNumber} 
                onChange={(e) => setPhoneNumber(e.target.value.replace(/\D/g, '').slice(0, 10))} 
                placeholder="Enter 10-digit Mobile Number"
                maxLength={10}
                style={{
                  border: 'none',
                  background: 'transparent',
                  outline: 'none',
                  width: '100%',
                  fontFamily: 'Space Grotesk, sans-serif',
                  fontSize: '16px',
                  fontWeight: '600',
                  color: '#0F172A'
                }}
              />
            </div>
          )}

          {/* In-Line Email Input */}
          {loginMode === 'email' && (
            <div style={{
              display: 'flex',
              alignItems: 'center',
              background: '#F8FAFC',
              border: '1.5px solid #E2E8F0',
              borderRadius: '16px',
              padding: '0 16px',
              height: '56px',
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
                <Mail size={20} color="#64748B" />
              </div>
              <input 
                type="email" 
                value={emailInput} 
                onChange={(e) => setEmailInput(e.target.value)} 
                placeholder="Enter Email Address"
                style={{
                  border: 'none',
                  background: 'transparent',
                  outline: 'none',
                  width: '100%',
                  fontFamily: 'Space Grotesk, sans-serif',
                  fontSize: '16px',
                  fontWeight: '600',
                  color: '#0F172A'
                }}
              />
            </div>
          )}

          {/* Clean Error Message */}
          {otpError && (
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
              <span>{otpError}</span>
            </div>
          )}

          {/* Send OTP Button */}
          <button
            type="button"
            className="let-you-signin-btn"
            disabled={otpSending}
            onClick={handleSendOTP}
            style={{ marginTop: '16px', opacity: otpSending ? 0.7 : 1, cursor: otpSending ? 'wait' : 'pointer' }}
          >
            {otpSending ? 'Sending OTP...' : (loginMode === 'phone' ? 'Send OTP to Phone' : 'Send OTP to Email')}
          </button>

          {/* Invisible reCAPTCHA container for Firebase Phone Auth */}
          <div id="recaptcha-container"></div>

          <div style={{ textAlign: 'center', margin: '18px 0 12px 0', fontSize: '13px', color: '#94A3B8', fontWeight: '700' }}>
            ────── OR ──────
          </div>

          {/* Google Sign-In Button */}
          <button 
            type="button"
            disabled={loading}
            onClick={handleGoogleAuth}
            style={{
              width: '100%',
              padding: '14px',
              borderRadius: '16px',
              border: '1.5px solid #E2E8F0',
              background: '#FFFFFF',
              color: '#212B46',
              fontFamily: 'League Spartan, sans-serif',
              fontWeight: '800',
              fontSize: '15px',
              cursor: loading ? 'wait' : 'pointer',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              gap: '10px',
              boxShadow: '0 2px 8px rgba(0,0,0,0.04)',
              opacity: loading ? 0.7 : 1
            }}
          >
            <svg width="20" height="20" viewBox="0 0 24 24">
              <path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"/>
              <path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"/>
              <path fill="#FBBC05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.06H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.94l2.85-2.22.81-.63z"/>
              <path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.06l3.66 2.84c.87-2.6 3.3-4.52 6.16-4.52z"/>
            </svg>
            {loading ? 'Connecting with Google...' : 'Continue with Google'}
          </button>

          <p className="let-you-footer-txt" style={{ textAlign: 'center', marginTop: '24px', fontSize: '14px', color: '#64748B', fontWeight: '600' }}>
            Don't have an account? <span style={{ color: '#10B981', fontWeight: '800', cursor: 'pointer' }} onClick={goToCreateAccount}>Sign up</span>
          </p>
        </div>
      </div>
    </div>
  );
}
