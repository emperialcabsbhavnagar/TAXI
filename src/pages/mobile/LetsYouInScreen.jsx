import React, { useState } from 'react';
import { signInWithGoogle, sendEmailOTP } from '../../services/firebaseService';
import logoPng from '../../assets/images/let-you-screen/logo.png';
import bgImg from '../../assets/images/let-you-screen/bg-img.svg';
import { Mail, ArrowLeft, AlertCircle, CheckCircle2, X } from 'lucide-react';
import { NativeTripSync } from '../../services/notificationEngine';

const WhatsAppIcon = ({ size = 20, color = "#25D366" }) => (
  <svg width={size} height={size} viewBox="0 0 24 24" fill={color}>
    <path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 01-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 01-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 012.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0012.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L0 24l6.335-1.662c1.746.953 3.71 1.455 5.711 1.456h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 00-3.48-8.413z"/>
  </svg>
);

export default function LetsYouInScreen({
  phoneNumber, setPhoneNumber,
  selectedGoogleAccount, setSelectedGoogleAccount,
  onNext, onGoToCreateAccount, onGoogleSignIn, onWhatsAppSignIn, onBack,
  setAuthMethod, setAuthEmail
}) {
  const [loadingGoogle, setLoadingGoogle] = useState(false);
  const [emailInput, setEmailInput] = useState('');
  const [otpSending, setOtpSending] = useState(false);
  const [authError, setAuthError] = useState('');

  // WhatsApp verification modal state
  const [showWhatsAppModal, setShowWhatsAppModal] = useState(false);
  const [waPhone, setWaPhone] = useState(phoneNumber || '');
  const [waStep, setWaStep] = useState('input'); // 'input' | 'sent'
  const [waCode, setWaCode] = useState('');

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

  // ─── 2. WhatsApp Login ───
  const handleOpenWhatsAppModal = () => {
    setAuthError('');
    const existing = phoneNumber || localStorage.getItem('cabsy_user_phone') || '';
    const clean = existing.replace(/\D/g, '').slice(-10);
    if (clean) setWaPhone(clean);
    setWaStep('input');
    setShowWhatsAppModal(true);
  };

  const handleLaunchWhatsAppVerification = () => {
    const cleanDigits = (waPhone || '').replace(/\D/g, '').slice(-10);
    if (!cleanDigits || cleanDigits.length < 10) {
      setAuthError('Please enter a valid 10-digit WhatsApp number.');
      return;
    }

    const code = String(Math.floor(100000 + Math.random() * 900000));
    setWaCode(code);
    const formatted = '+91' + cleanDigits;
    if (setPhoneNumber) setPhoneNumber(cleanDigits);
    localStorage.setItem('cabsy_user_phone', formatted);

    const message = encodeURIComponent(`Hello EMPERIAL CABS, please verify my login.\nMobile: +91 ${cleanDigits}\nAuth Code: EMP-${code}`);
    const whatsappUrl = `https://wa.me/917226844108?text=${message}`;

    setWaStep('sent');

    try {
      if (typeof window !== 'undefined') {
        window.open(whatsappUrl, '_system') || (window.location.href = whatsappUrl);
      }
    } catch (e) {
      window.location.href = whatsappUrl;
    }
  };

  const handleCompleteWhatsAppLogin = () => {
    const cleanDigits = (waPhone || '').replace(/\D/g, '').slice(-10);
    const formatted = '+91' + cleanDigits;
    if (setPhoneNumber) setPhoneNumber(cleanDigits);
    if (setAuthMethod) setAuthMethod('whatsapp');
    localStorage.setItem('cabsy_user_phone', formatted);
    setShowWhatsAppModal(false);

    if (onWhatsAppSignIn) {
      onWhatsAppSignIn({
        phone: formatted,
        authMethod: 'whatsapp',
        code: waCode
      });
    }
  };

  // ─── 3. Email OTP Login ───
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

          {/* Bottom: Google and WhatsApp Options */}
          <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
            {/* 1. Continue with Google */}
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

            {/* 2. Continue with WhatsApp (Clean White, No Green Shade) */}
            <button 
              type="button"
              onClick={handleOpenWhatsAppModal}
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
                cursor: 'pointer',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                gap: '12px',
                boxShadow: '0 2px 8px rgba(0,0,0,0.03)',
                transition: 'all 0.15s ease'
              }}
            >
              <WhatsAppIcon size={20} color="#25D366" />
              <span>Continue with WhatsApp</span>
            </button>
          </div>

          <p className="let-you-footer-txt" style={{ textAlign: 'center', marginTop: '22px', fontSize: '14px', color: '#64748B', fontWeight: '600' }}>
            Don't have an account? <span style={{ color: '#252B34', fontWeight: '800', cursor: 'pointer' }} onClick={goToCreateAccount}>Sign up</span>
          </p>
        </div>

        {/* ─── WhatsApp Verification Modal Sheet ─── */}
        {showWhatsAppModal && (
          <div style={{
            position: 'fixed',
            inset: 0,
            background: 'rgba(15, 23, 42, 0.65)',
            backdropFilter: 'blur(4px)',
            zIndex: 1000,
            display: 'flex',
            alignItems: 'flex-end',
            justifyContent: 'center'
          }}>
            <div style={{
              width: '100%',
              maxWidth: '440px',
              background: '#FFFFFF',
              borderRadius: '28px 28px 0 0',
              padding: '24px 20px 32px 20px',
              boxSizing: 'border-box',
              animation: 'fadeInUp 0.25s cubic-bezier(0.16, 1, 0.3, 1)'
            }}>
              {/* Modal Header */}
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '16px' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                  <div style={{
                    width: '38px',
                    height: '38px',
                    borderRadius: '12px',
                    background: '#DCFCE7',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center'
                  }}>
                    <WhatsAppIcon size={22} color="#15803D" />
                  </div>
                  <div>
                    <h3 style={{ margin: 0, fontFamily: 'Space Grotesk, sans-serif', fontSize: '18px', fontWeight: '800', color: '#0F172A' }}>
                      WhatsApp Login
                    </h3>
                    <p style={{ margin: 0, fontSize: '12px', color: '#64748B', fontFamily: 'Space Grotesk, sans-serif' }}>
                      Official Desk: +91 72268 44108
                    </p>
                  </div>
                </div>
                <button
                  type="button"
                  onClick={() => setShowWhatsAppModal(false)}
                  style={{
                    border: 'none',
                    background: '#F1F5F9',
                    borderRadius: '50%',
                    width: '32px',
                    height: '32px',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    cursor: 'pointer',
                    color: '#64748B'
                  }}
                  aria-label="Close"
                >
                  <X size={18} />
                </button>
              </div>

              {waStep === 'input' ? (
                <div>
                  <p style={{ fontSize: '13px', color: '#475569', lineHeight: '1.5', fontFamily: 'Space Grotesk, sans-serif', margin: '0 0 16px 0' }}>
                    Enter your 10-digit WhatsApp mobile number to verify instantly via our official WhatsApp desk.
                  </p>

                  <div style={{
                    display: 'flex',
                    alignItems: 'center',
                    background: '#F8FAFC',
                    border: '1.5px solid #E2E8F0',
                    borderRadius: '16px',
                    padding: '0 16px',
                    height: '54px',
                    boxSizing: 'border-box'
                  }}>
                    <div style={{
                      display: 'flex',
                      alignItems: 'center',
                      gap: '6px',
                      paddingRight: '12px',
                      marginRight: '12px',
                      borderRight: '1.5px solid #CBD5E1',
                      height: '24px'
                    }}>
                      <span style={{ fontSize: '16px' }}>🇮🇳</span>
                      <span style={{ fontFamily: 'Space Grotesk, sans-serif', fontSize: '15px', fontWeight: '700', color: '#0F172A' }}>+91</span>
                    </div>
                    <input
                      type="tel"
                      value={waPhone}
                      onChange={(e) => setWaPhone(e.target.value.replace(/\D/g, '').slice(0, 10))}
                      placeholder="Enter 10-digit number"
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

                  <button
                    type="button"
                    onClick={handleLaunchWhatsAppVerification}
                    style={{
                      width: '100%',
                      marginTop: '16px',
                      padding: '14px',
                      borderRadius: '16px',
                      border: 'none',
                      background: '#25D366',
                      color: '#FFFFFF',
                      fontFamily: 'Space Grotesk, sans-serif',
                      fontWeight: '800',
                      fontSize: '15px',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      gap: '10px',
                      cursor: 'pointer',
                      boxShadow: '0 4px 14px rgba(37, 211, 102, 0.35)'
                    }}
                  >
                    <WhatsAppIcon size={20} color="#FFFFFF" />
                    <span>Open WhatsApp to Verify</span>
                  </button>
                </div>
              ) : (
                <div>
                  <div style={{
                    background: '#F0FDF4',
                    border: '1px solid #BBF7D0',
                    borderRadius: '16px',
                    padding: '16px',
                    marginBottom: '16px',
                    textAlign: 'center'
                  }}>
                    <CheckCircle2 size={32} color="#16A34A" style={{ margin: '0 auto 8px auto' }} />
                    <h4 style={{ margin: '0 0 4px 0', fontFamily: 'Space Grotesk, sans-serif', fontSize: '16px', color: '#166534', fontWeight: '800' }}>
                      Verification Opened
                    </h4>
                    <p style={{ margin: 0, fontSize: '13px', color: '#15803D', fontFamily: 'Space Grotesk, sans-serif' }}>
                      Send the pre-filled message in WhatsApp, then tap <strong>Confirm & Enter</strong> below.
                    </p>
                    <div style={{
                      marginTop: '10px',
                      padding: '6px 12px',
                      background: '#FFFFFF',
                      borderRadius: '8px',
                      display: 'inline-block',
                      fontFamily: 'monospace',
                      fontSize: '13px',
                      fontWeight: '700',
                      color: '#0F172A',
                      border: '1px dashed #86EFAC'
                    }}>
                      Code: EMP-{waCode}
                    </div>
                  </div>

                  <button
                    type="button"
                    onClick={handleCompleteWhatsAppLogin}
                    style={{
                      width: '100%',
                      padding: '14px',
                      borderRadius: '16px',
                      border: 'none',
                      background: '#0F172A',
                      color: '#FFFFFF',
                      fontFamily: 'Space Grotesk, sans-serif',
                      fontWeight: '800',
                      fontSize: '15px',
                      cursor: 'pointer',
                      boxShadow: '0 4px 14px rgba(15, 23, 42, 0.25)'
                    }}
                  >
                    Confirm & Enter
                  </button>

                  <button
                    type="button"
                    onClick={handleLaunchWhatsAppVerification}
                    style={{
                      width: '100%',
                      marginTop: '10px',
                      padding: '10px',
                      borderRadius: '12px',
                      border: 'none',
                      background: 'transparent',
                      color: '#15803D',
                      fontFamily: 'Space Grotesk, sans-serif',
                      fontWeight: '700',
                      fontSize: '13px',
                      cursor: 'pointer'
                    }}
                  >
                    Re-open WhatsApp
                  </button>
                </div>
              )}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
