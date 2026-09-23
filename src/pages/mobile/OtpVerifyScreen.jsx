import React, { useState, useRef, useEffect } from 'react';
import { verifyPhoneOTP, verifyEmailOTP, sendPhoneOTP, sendEmailOTP } from '../../services/firebaseService';
import { ArrowLeft, AlertCircle, CheckCircle2 } from 'lucide-react';

const OtpVerifyGraphic = () => (
  <svg viewBox="0 0 340 240" fill="none" xmlns="http://www.w3.org/2000/svg" style={{ width: '100%', height: '100%', maxHeight: '240px' }}>
    <defs>
      <linearGradient id="otpBg" x1="0" y1="0" x2="340" y2="240" gradientUnits="userSpaceOnUse">
        <stop stopColor="#FAFAFA" />
        <stop offset="1" stopColor="#F1F5F9" />
      </linearGradient>
      <filter id="otpShadow" x="-10%" y="-10%" width="130%" height="130%">
        <feDropShadow dx="0" dy="10" stdDeviation="16" floodColor="#0F172A" floodOpacity="0.14" />
      </filter>
    </defs>
    <rect width="340" height="240" rx="28" fill="url(#otpBg)" />

    <g filter="url(#otpShadow)" transform="translate(100, 10)">
      <rect width="140" height="215" rx="24" fill="#1E293B" />
      <rect x="6" y="6" width="128" height="203" rx="20" fill="#FFFFFF" />
      <rect x="40" y="10" width="48" height="7" rx="3.5" fill="#0F172A" />

      {/* Security Padlock Shield */}
      <g transform="translate(64, 85)">
        <circle cx="0" cy="0" r="34" fill="#FEF3C7" className="ob-animate-pulse" />
        <path d="M-14 4 C-14 -12 14 -12 14 4 V12 H-14 Z" fill="none" stroke="#FFAE00" strokeWidth="4" />
        <rect x="-18" y="10" width="36" height="30" rx="8" fill="#FFAE00" />
        <circle cx="0" cy="22" r="4" fill="#FFFFFF" />
        <path d="M0 26 V32" stroke="#FFFFFF" strokeWidth="3" strokeLinecap="round" />
      </g>

      {/* Code Dots */}
      <g transform="translate(24, 160)">
        <rect x="0" y="0" width="18" height="22" rx="6" fill="#F1F5F9" stroke="#FFAE00" strokeWidth="1.5" />
        <circle cx="9" cy="11" r="3" fill="#0F172A" />

        <rect x="24" y="0" width="18" height="22" rx="6" fill="#F1F5F9" stroke="#FFAE00" strokeWidth="1.5" />
        <circle cx="33" cy="11" r="3" fill="#0F172A" />

        <rect x="48" y="0" width="18" height="22" rx="6" fill="#F1F5F9" stroke="#FFAE00" strokeWidth="1.5" />
        <circle cx="57" cy="11" r="3" fill="#0F172A" />

        <rect x="72" y="0" width="18" height="22" rx="6" fill="#F1F5F9" stroke="#FFAE00" strokeWidth="1.5" />
        <circle cx="81" cy="11" r="3" fill="#0F172A" />
      </g>
    </g>
  </svg>
);

export default function OtpVerifyScreen({ phoneNumber, otpCode, setOtpCode, onNext, onBack, authMethod, authEmail }) {
  const [verifying, setVerifying] = useState(false);
  const [resending, setResending] = useState(false);
  const [resendSuccess, setResendSuccess] = useState('');
  const [error, setError] = useState('');
  const [countdown, setCountdown] = useState(60);
  const inputRefs = useRef([]);

  const codeLength = 6;
  const [code, setCode] = useState(Array(codeLength).fill(''));

  const targetEmail = authEmail || localStorage.getItem('cabsy_user_email_otp_target') || '';
  const cleanPhone = (phoneNumber || localStorage.getItem('cabsy_user_phone') || '').replace(/\D/g, '').slice(-10);

  const displayTarget = authMethod === 'email'
    ? (targetEmail || 'your email')
    : `+91 ${cleanPhone}`;

  const handleResendOTP = async () => {
    if (countdown > 0 || resending) return;
    setResending(true);
    setError('');
    setResendSuccess('');

    try {
      if (authMethod === 'email') {
        await sendEmailOTP(targetEmail);
      } else {
        await sendPhoneOTP('+91' + cleanPhone);
      }
      setResendSuccess('A fresh 6-digit verification code has been sent.');
      setCountdown(60);
      setCode(Array(codeLength).fill(''));
      if (inputRefs.current[0]) inputRefs.current[0].focus();
    } catch (e) {
      console.warn('[Resend OTP Error]:', e);
      setError('Failed to resend code. Please try again.');
    }
    setResending(false);
  };

  // Countdown timer
  useEffect(() => {
    if (countdown <= 0) return;
    const timer = setTimeout(() => setCountdown(c => c - 1), 1000);
    return () => clearTimeout(timer);
  }, [countdown]);

  // Auto-focus first input on mount
  useEffect(() => {
    if (inputRefs.current[0]) inputRefs.current[0].focus();
  }, []);

  const handleInput = (value, idx) => {
    if (value.length > 1) value = value.slice(-1);
    const next = [...code];
    next[idx] = value;
    setCode(next);
    setError('');

    // Auto-advance to next input
    if (value && idx < codeLength - 1) {
      inputRefs.current[idx + 1]?.focus();
    }
  };

  const handleKeyDown = (e, idx) => {
    if (e.key === 'Backspace' && !code[idx] && idx > 0) {
      inputRefs.current[idx - 1]?.focus();
    }
  };

  const handlePaste = (e) => {
    e.preventDefault();
    const pastedData = e.clipboardData.getData('text').replace(/\D/g, '').slice(0, codeLength);
    if (pastedData) {
      const next = Array(codeLength).fill('');
      for (let i = 0; i < pastedData.length; i++) {
        next[i] = pastedData[i];
      }
      setCode(next);
      if (pastedData.length === codeLength) {
        handleVerify(pastedData);
      } else {
        const nextIdx = Math.min(pastedData.length, codeLength - 1);
        inputRefs.current[nextIdx]?.focus();
      }
    }
  };

  // Auto-verify when all 6 digits are entered
  useEffect(() => {
    const full = code.join('');
    if (full.length === codeLength && code.every(d => d !== '')) {
      handleVerify(full);
    }
  }, [code]);

  const handleVerify = async (otpString) => {
    const otp = otpString || code.join('');
    if (otp.length !== codeLength) {
      setError('Please enter the full 6-digit code.');
      return;
    }

    setVerifying(true);
    setError('');

    try {
      if (authMethod === 'phone') {
        const formatted = '+91' + cleanPhone;
        const result = await verifyPhoneOTP(otp, formatted);
        if (result.success) {
          if (onNext) {
            onNext({
              phone: formatted,
              authMethod: 'phone',
              uid: result.user?.uid || 'phone_' + Date.now()
            });
          }
        } else {
          setError(result.error || 'Invalid OTP. Please check the code and try again.');
        }
      } else if (authMethod === 'email') {
        const result = verifyEmailOTP(targetEmail, otp);
        if (result.success) {
          if (onNext) {
            onNext({
              email: targetEmail,
              authMethod: 'email',
              uid: 'email_' + Date.now()
            });
          }
        } else {
          setError(result.error || 'Invalid verification code. Please check your email.');
        }
      } else {
        if (onNext) onNext();
      }
    } catch (e) {
      setError(e?.message || 'Verification failed. Please try again.');
    }

    setVerifying(false);
  };

  return (
    <div className="real-mobile-app">
      <div className="white-header-nav" style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
        <button 
          className="header-back-arrow" 
          onClick={onBack} 
          style={{ background: '#F1F5F9', border: 'none', borderRadius: '12px', width: '36px', height: '36px', display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer', color: '#0F172A' }}
          aria-label="Go Back"
        >
          <ArrowLeft size={18} />
        </button>
        <h2 className="white-header-title">OTP Verification</h2>
      </div>

      <div className="verify-screen-body" style={{ padding: '24px 20px', display: 'flex', flexDirection: 'column', alignItems: 'center', flex: 1 }}>
        <div style={{ textAlign: 'center', flex: 1, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', gap: '20px', width: '100%' }}>
          
          {/* OTP Verification Graphic Container */}
          <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', width: '100%', maxWidth: '320px', minHeight: '220px', margin: '0 auto' }}>
            <OtpVerifyGraphic />
          </div>

          <div>
            <h3 style={{ fontFamily: 'League Spartan', fontSize: '22px', fontWeight: '800', color: '#0F172A', margin: '0 0 8px 0' }}>
              Enter Verification Code
            </h3>
            <p style={{ fontFamily: 'Space Grotesk', fontSize: '14px', color: '#64748B', margin: 0, lineHeight: '1.5' }}>
              We've sent a 6-digit code to<br/>
              <span style={{ display: 'inline-flex', alignItems: 'center', gap: '8px', marginTop: '6px' }}>
                <strong style={{ color: '#0F172A', fontSize: '15px' }}>{displayTarget}</strong>
                <button
                  type="button"
                  onClick={onBack}
                  style={{
                    background: '#F1F5F9',
                    border: 'none',
                    borderRadius: '8px',
                    color: '#0F172A',
                    fontWeight: '700',
                    fontSize: '12px',
                    cursor: 'pointer',
                    padding: '3px 8px'
                  }}
                >
                  Edit
                </button>
              </span>
            </p>
          </div>

          {/* 6-digit OTP Input Grid */}
          <div style={{ display: 'flex', gap: '8px', justifyContent: 'center', margin: '8px 0' }}>
            {code.map((val, idx) => (
              <input
                key={idx}
                ref={el => inputRefs.current[idx] = el}
                type="text"
                inputMode="numeric"
                maxLength={1}
                value={val}
                onChange={(e) => handleInput(e.target.value.replace(/\D/g, ''), idx)}
                onKeyDown={(e) => handleKeyDown(e, idx)}
                onPaste={handlePaste}
                style={{
                  width: '46px', height: '54px', textAlign: 'center',
                  fontSize: '22px', fontWeight: '800', fontFamily: 'League Spartan',
                  borderRadius: '14px', border: `2px solid ${val ? '#10B981' : '#CBD5E1'}`,
                  background: val ? '#F0FDF4' : '#F8FAFC',
                  outline: 'none', color: '#0F172A',
                  transition: 'all 0.2s ease',
                  boxShadow: val ? '0 2px 8px rgba(16, 185, 129, 0.15)' : 'none'
                }}
                onFocus={(e) => { e.target.style.borderColor = '#10B981'; e.target.style.boxShadow = '0 0 0 3px rgba(16, 185, 129, 0.15)'; }}
                onBlur={(e) => { e.target.style.borderColor = val ? '#10B981' : '#CBD5E1'; e.target.style.boxShadow = val ? '0 2px 8px rgba(16, 185, 129, 0.15)' : 'none'; }}
              />
            ))}
          </div>

          {/* Error Message */}
          {error && (
            <div style={{
              display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '8px',
              background: '#FEF2F2', border: '1px solid #FCA5A5', color: '#DC2626',
              padding: '10px 16px', borderRadius: '12px', fontSize: '13px',
              fontWeight: '600', fontFamily: 'Space Grotesk', width: '100%', boxSizing: 'border-box'
            }}>
              <AlertCircle size={16} color="#DC2626" />
              <span>{error}</span>
            </div>
          )}

          {/* Resend Success Message */}
          {resendSuccess && (
            <div style={{
              display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '8px',
              background: '#ECFDF5', border: '1px solid #6EE7B7', color: '#047857',
              padding: '10px 16px', borderRadius: '12px', fontSize: '13px',
              fontWeight: '600', fontFamily: 'Space Grotesk', width: '100%', boxSizing: 'border-box'
            }}>
              <CheckCircle2 size={16} color="#047857" />
              <span>{resendSuccess}</span>
            </div>
          )}

          {/* Resend Timer */}
          <p style={{ fontFamily: 'Space Grotesk', fontSize: '13px', color: '#94A3B8', margin: 0 }}>
            {countdown > 0 ? (
              <>Didn't receive code? <span style={{ color: '#64748B', fontWeight: '700' }}>Resend in 00:{String(countdown).padStart(2, '0')}</span></>
            ) : (
              <>Didn't receive code? <span style={{ color: resending ? '#94A3B8' : '#10B981', fontWeight: '800', cursor: resending ? 'default' : 'pointer' }} onClick={handleResendOTP}>
                {resending ? 'Resending...' : 'Resend Code'}
              </span></>
            )}
          </p>
        </div>

        {/* Verify Button */}
        <button
          className="EMPERIAL CABS-btn-primary"
          disabled={verifying || code.join('').length < codeLength}
          onClick={() => handleVerify()}
          style={{
            width: '100%', marginTop: '20px',
            opacity: (verifying || code.join('').length < codeLength) ? 0.6 : 1,
            cursor: (verifying || code.join('').length < codeLength) ? 'not-allowed' : 'pointer'
          }}
        >
          {verifying ? 'Verifying Code...' : 'Verify & Continue'}
        </button>
      </div>
    </div>
  );
}
