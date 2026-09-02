import React, { useState } from 'react';
import db from '../../services/dbService';
import { signInWithGoogle, loadCustomerFromFirestore, saveCustomerToFirestore, setupRecaptcha, sendPhoneOTP, sendEmailOTP } from '../../services/firebaseService';
import { saveCustomerToMySQL, loadAllInquiriesFromMySQL, loadAllCustomersFromMySQL } from '../../services/mysqlService';
import logoPng from '../../assets/images/let-you-screen/logo.png';

// ─── Utility: derive a clean display name from an email ──────────────────────
const formatNameFromEmail = (email) => {
  if (!email || !email.includes('@')) return '';
  return email.split('@')[0]
    .split(/[._-]/)
    .filter(Boolean)
    .map(w => w.charAt(0).toUpperCase() + w.slice(1).toLowerCase())
    .join(' ');
};

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
  const [emailOtpCode, setEmailOtpCode] = useState(''); // displayed to user for testing

  // ─── After Google gives us user data: check DB for returning vs new user ──
  const processGoogleUser = async (googleData) => {
    if (!googleData || !googleData.email) return;

    setLoading(true);
    const email = googleData.email.toLowerCase().trim();
    let name = googleData.name || '';
    if (!name || name === 'Google User') {
      name = formatNameFromEmail(email);
    }
    const photoURL = googleData.photoURL || null;
    const uid = googleData.uid || 'goog_' + Date.now();

    let existingProfile = null;

    // ── 1. Check local storage for existing completed profile by email ──
    try {
      const savedRaw = localStorage.getItem('cabsy_user_profile');
      if (savedRaw) {
        const parsed = JSON.parse(savedRaw);
        if (parsed && parsed.email && parsed.email.toLowerCase().trim() === email && parsed.phone) {
          existingProfile = parsed;
        }
      }
    } catch (e) {}

    // ── 2. Check Hostinger MySQL database for returning user by email ──
    if (!existingProfile) {
      try {
        const mysqlCustomers = await loadAllCustomersFromMySQL().catch(() => []);
        const match = (mysqlCustomers || []).find(c => {
          const cEmail = (c.email || c.customerEmail || '').toLowerCase().trim();
          return cEmail === email && (c.phone || c.name);
        });
        if (match) {
          existingProfile = {
            id: match.id || ('CUST-' + Math.floor(10000 + Math.random() * 89999)),
            name: match.name || match.customerName || name,
            email: email,
            phone: match.phone || match.customerPhone || '',
            photoURL: match.photoURL || photoURL,
            profession: match.profession || '',
            area: match.area || '',
            status: 'Active'
          };
        }
      } catch (e) {}
    }

    // ── 3. Check Firestore database for returning user by email ──
    if (!existingProfile) {
      try {
        const firestoreMatch = await loadCustomerFromFirestore(email).catch(() => null);
        if (firestoreMatch && (firestoreMatch.name || firestoreMatch.phone)) {
          existingProfile = {
            id: firestoreMatch.id || ('CUST-' + Math.floor(10000 + Math.random() * 89999)),
            name: firestoreMatch.name || name,
            email: email,
            phone: firestoreMatch.phone || '',
            photoURL: firestoreMatch.photoURL || photoURL,
            profession: firestoreMatch.profession || '',
            area: firestoreMatch.area || '',
            status: 'Active'
          };
        }
      } catch (e) {}
    }

    // ─── DECISION: Returning user (has phone on record) vs New user ───
    if (existingProfile && existingProfile.phone) {
      // ── RETURNING USER: Exists in DB with completed profile -> Direct Home ──
      const merged = {
        ...existingProfile,
        name: existingProfile.name || name,
        photoURL: photoURL || existingProfile.photoURL,
        uid: uid,
        lastLogin: new Date().toISOString()
      };

      try {
        localStorage.setItem('cabsy_user_profile', JSON.stringify(merged));
        localStorage.setItem('cabsy_user_phone', merged.phone || '');
        localStorage.setItem('EMPERIAL CABS_onboarded', 'true');
        localStorage.setItem('EMPERIAL CABS_profile_completed', 'true');
        window.dispatchEvent(new Event('storage'));
      } catch (e) {}

      if (setSelectedGoogleAccount) setSelectedGoogleAccount(merged);
      saveCustomerToFirestore(merged).catch(() => {});
      saveCustomerToMySQL(merged).catch(() => {});
      try { db.saveCustomer(merged); } catch(e) {}
      restoreTrips(merged);

      setLoading(false);

      // Signal MobileAppView: this is a RETURNING user -> go to APP_HOME
      if (onGoogleSignIn) {
        onGoogleSignIn(merged);
      }
    } else {
      // ── NEW USER: Not found in DB -> Route to Create Profile form ──
      const newDraftProfile = {
        id: 'CUST-' + Math.floor(10000 + Math.random() * 89999),
        name,
        email,
        phone: '',       // Blank — customer must fill this
        photoURL,
        uid,
        age: '',          // Blank — customer must fill this
        profession: '',   // Blank — customer must fill this
        area: '',         // Blank — customer must fill this
        registeredAt: new Date().toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' }),
        status: 'Active',
        lastLogin: new Date().toISOString()
      };

      try {
        // Save draft (without profile_completed flag) so AccountDetailScreen can read it
        localStorage.setItem('cabsy_user_profile', JSON.stringify(newDraftProfile));
        localStorage.setItem('EMPERIAL CABS_onboarded', 'true');
        localStorage.removeItem('EMPERIAL CABS_profile_completed');
        window.dispatchEvent(new Event('storage'));
      } catch (e) {}

      if (setSelectedGoogleAccount) setSelectedGoogleAccount(newDraftProfile);
      setLoading(false);

      // Signal MobileAppView: this is a NEW user -> go to CREATE_PROFILE
      if (onGoToCreateAccount) {
        onGoToCreateAccount();
      }
    }
  };

  // ─── Restore trip history from MySQL for returning user ──
  const restoreTrips = async (profile) => {
    try {
      const mysqlInquiries = await loadAllInquiriesFromMySQL().catch(() => []);
      const userPhone = (profile.phone || '').replace(/\D/g, '');
      const userEmail = (profile.email || '').toLowerCase().trim();

      const userTrips = (mysqlInquiries || []).filter(i => {
        const iPhone = (i.customerPhone || '').replace(/\D/g, '');
        const iEmail = (i.customerEmail || '').toLowerCase().trim();
        return (userPhone && iPhone && userPhone === iPhone) ||
               (userEmail && iEmail && userEmail === iEmail);
      });

      if (userTrips.length > 0) {
        const localRaw = localStorage.getItem('cabsy_inquiries');
        const localList = localRaw ? JSON.parse(localRaw) : [];
        const existingIds = new Set(localList.map(i => i.id).filter(Boolean));
        const fresh = userTrips.filter(i => !existingIds.has(i.id));
        const merged = [...fresh, ...localList];
        localStorage.setItem('cabsy_inquiries', JSON.stringify(merged));
        window.dispatchEvent(new Event('storage'));
      }
    } catch (e) {
      console.warn('[Auth] Trip restore failed:', e);
    }
  };

  // ─── Main handler: "Continue with Google" button ──
  const handleGoogleAuth = async () => {
    setLoading(true);
    setOtpError('');
    try {
      const res = await signInWithGoogle();
      if (res && res.email) {
        await processGoogleUser(res);
      } else if (res && res.error) {
        setLoading(false);
        const errMsg = String(res.error);
        if (errMsg.includes('10:') || errMsg.includes('12500') || errMsg.includes('BadAuthentication') || errMsg.includes('DEVELOPER_ERROR')) {
          setOtpError('Google Sign-In requires SHA-1 fingerprint added in Firebase Console for package com.emperialcabs.booking.');
        } else {
          setOtpError('Google Sign-In note: ' + errMsg);
        }
      } else {
        setLoading(false);
      }
    } catch (err) {
      console.warn('[Auth] Google auth error:', err);
      setLoading(false);
    }
  };

  const goToCreateAccount = onGoToCreateAccount || onNext;

  return (
    <div className="real-mobile-app">
      <div className="let-you-in-page-wrapper">
        {/* Red City Banner Header */}
        <div className="let-you-red-header">
          <button className="let-you-white-back-btn" onClick={onBack}>
            <svg width="24" height="24" viewBox="0 0 24 24" fill="none">
              <path d="M15 18L9 12L15 6" stroke="#FFFFFF" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"/>
            </svg>
          </button>
          
          <div className="let-you-centered-logo-box">
            <img 
              src={logoPng} 
              alt="EMPERIAL CABS Logo" 
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

          {/* Segmented Control Toggle (Big Company / Uber Style) */}
          <div style={{
            display: 'flex',
            background: '#F1F5F9',
            padding: '4px',
            borderRadius: '16px',
            marginBottom: '20px'
          }}>
            <button
              type="button"
              onClick={() => { setLoginMode('phone'); setOtpError(''); setEmailOtpCode(''); }}
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
              <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke={loginMode === 'phone' ? '#10B981' : '#64748B'} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <rect x="5" y="2" width="14" height="20" rx="2" ry="2"/>
                <line x1="12" y1="18" x2="12.01" y2="18"/>
              </svg>
              Phone OTP
            </button>

            <button
              type="button"
              onClick={() => { setLoginMode('email'); setOtpError(''); setEmailOtpCode(''); }}
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
              <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke={loginMode === 'email' ? '#10B981' : '#64748B'} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <path d="M4 4h16c1.1 0 2 .9 2 2v12c0 1.1-.9 2-2 2H4c-1.1 0-2-.9-2-2V6c0-1.1.9-2 2-2z"/>
                <polyline points="22,6 12,13 2,6"/>
              </svg>
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
                onChange={(e) => setPhoneNumber(e.target.value)} 
                placeholder="Enter Mobile Number"
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
                <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="#64748B" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <path d="M4 4h16c1.1 0 2 .9 2 2v12c0 1.1-.9 2-2 2H4c-1.1 0-2-.9-2-2V6c0-1.1.9-2 2-2z"/>
                  <polyline points="22,6 12,13 2,6"/>
                </svg>
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

          {/* Clean Error Message (No Emojis) */}
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
              <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="#DC2626" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <circle cx="12" cy="12" r="10"/>
                <line x1="12" y1="8" x2="12" y2="12"/>
                <line x1="12" y1="16" x2="12.01" y2="16"/>
              </svg>
              <span>{otpError}</span>
            </div>
          )}

          {/* Send OTP Button */}
          <button
            className="let-you-signin-btn"
            disabled={otpSending}
            onClick={async () => {
              setOtpError('');
              setEmailOtpCode('');
              
              if (loginMode === 'phone') {
                const cleanPhone = (phoneNumber || '').replace(/\D/g, '');
                if (!cleanPhone || cleanPhone.length < 10) {
                  setOtpError('Please enter a valid 10-digit mobile number.');
                  return;
                }
                setOtpSending(true);
                try {
                  setupRecaptcha('recaptcha-container');
                  const result = await sendPhoneOTP(cleanPhone);
                  if (result.success) {
                    if (setAuthMethod) setAuthMethod('phone');
                    localStorage.setItem('cabsy_user_phone', '+91' + cleanPhone);
                    if (onNext) onNext();
                  } else {
                    setOtpError(result.error || 'Failed to send OTP.');
                  }
                } catch (e) {
                  console.warn('Phone OTP error:', e);
                  setOtpError('Could not send OTP. Please try again.');
                }
                setOtpSending(false);
              } else {
                // Email OTP
                const email = (emailInput || '').trim();
                if (!email || !email.includes('@')) {
                  setOtpError('Please enter a valid email address.');
                  return;
                }
                setOtpSending(true);
                const result = await sendEmailOTP(email);
                if (result.success) {
                  if (setAuthMethod) setAuthMethod('email');
                  if (setAuthEmail) setAuthEmail(email);
                  localStorage.setItem('cabsy_user_email_otp_target', email);
                  if (onNext) onNext();
                } else {
                  setOtpError(result.error || 'Failed to generate OTP.');
                }
                setOtpSending(false);
              }
            }}
            style={{ marginTop: '16px', opacity: otpSending ? 0.7 : 1 }}
          >
            {otpSending ? 'Sending OTP...' : `Send OTP to ${loginMode === 'phone' ? 'Phone' : 'Email'}`}
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
            {loading ? 'Signing in...' : 'Continue with Google'}
          </button>

          <p className="let-you-footer-txt" style={{ textAlign: 'center', marginTop: '24px', fontSize: '14px', color: '#64748B', fontWeight: '600' }}>
            Don't have an account? <span style={{ color: '#10B981', fontWeight: '800', cursor: 'pointer' }} onClick={goToCreateAccount}>Sign up</span>
          </p>
        </div>
      </div>
    </div>
  );
}
