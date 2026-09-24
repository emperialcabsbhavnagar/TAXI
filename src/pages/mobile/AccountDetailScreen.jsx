import React, { useState, useEffect } from 'react';
import db from '../../services/dbService';
import { saveCustomerToMySQL } from '../../services/mysqlService';
import { ArrowLeft, Camera, CheckCircle2, ArrowRight } from 'lucide-react';

const formatNameFromEmail = (email) => {
  if (!email || !email.includes('@')) return '';
  const username = email.split('@')[0];
  return username
    .split(/[._-]/)
    .filter(Boolean)
    .map(w => w.charAt(0).toUpperCase() + w.slice(1).toLowerCase())
    .join(' ');
};

export default function AccountDetailScreen({ onBack, onSave, isCreateMode = false, googleData }) {
  const getInitialProfile = () => {
    try {
      const saved = localStorage.getItem('cabsy_user_profile');
      const base = saved ? JSON.parse(saved) : {};
      const authMethod = localStorage.getItem('cabsy_auth_method') || (googleData ? 'google' : (base.phone ? 'phone' : ''));
      const savedPhone = (isCreateMode && authMethod !== 'phone') ? '' : (localStorage.getItem('cabsy_user_phone') || '');
      const savedEmailTarget = localStorage.getItem('cabsy_user_email_otp_target') || '';

      const emailVal = googleData?.email || base.email || savedEmailTarget || '';
      let nameVal = googleData?.name || base.name || '';
      if ((!nameVal || nameVal === 'Google User' || nameVal === 'Empire Rider') && emailVal) {
        nameVal = formatNameFromEmail(emailVal);
      }

      const phoneVal = (isCreateMode && authMethod !== 'phone') ? (base.phone || '') : (googleData?.phone || base.phone || savedPhone || '');
      const ageVal = (base.age && Number(base.age) > 0 && Number(base.age) <= 100) ? base.age : (isCreateMode ? '' : 26);
      const professionVal = base.profession || '';
      const areaVal = base.area || '';

      return {
        id: base.id || ('CUST-' + Math.floor(10000 + Math.random() * 89999)),
        name: nameVal,
        email: emailVal,
        phone: phoneVal,
        age: ageVal,
        profession: professionVal,
        area: areaVal,
        photoURL: googleData?.photoURL || base.photoURL || null,
        joined: base.joined || new Date().toISOString().split('T')[0]
      };
    } catch (e) {
      return {
        id: 'CUST-' + Math.floor(10000 + Math.random() * 89999),
        name: googleData?.name || '',
        email: googleData?.email || '',
        phone: localStorage.getItem('cabsy_user_phone') || '',
        age: '',
        profession: '',
        area: '',
        photoURL: googleData?.photoURL || null,
        joined: new Date().toISOString().split('T')[0]
      };
    }
  };

  const [profile, setProfile] = useState(getInitialProfile);
  const [savedSuccess, setSavedSuccess] = useState(false);
  const [validationError, setValidationError] = useState('');

  // Determine if phone or email was pre-verified during OTP/Google login
  const authMethod = localStorage.getItem('cabsy_auth_method') || (googleData ? 'google' : '');
  const isPhoneVerified = Boolean(
    (profile.phone && profile.phone.replace(/\D/g, '').length >= 10) &&
    (authMethod === 'phone' || localStorage.getItem('cabsy_user_phone_verified') === 'true')
  );

  const isEmailVerified = Boolean(
    (profile.email && profile.email.includes('@')) &&
    (
      Boolean(googleData && googleData.email) ||
      authMethod === 'google' ||
      authMethod === 'email' ||
      localStorage.getItem('cabsy_user_email_verified') === 'true'
    )
  );

  useEffect(() => {
    async function syncFromDb() {
      try {
        const savedPhone = localStorage.getItem('cabsy_user_phone') || profile.phone || '';
        const cleanPhone = savedPhone.replace(/\D/g, '');
        if (cleanPhone) {
          const dbCust = await db.getCustomerByPhone(cleanPhone);
          if (dbCust && dbCust.name) {
            setProfile(prev => ({
              ...prev,
              ...dbCust,
              name: dbCust.name || prev.name || '',
              email: dbCust.email || prev.email || '',
              phone: dbCust.phone || prev.phone || '',
              photoURL: dbCust.photoURL || prev.photoURL || null
            }));
          }
        }
      } catch (e) {}
    }
    if (!isCreateMode) {
      syncFromDb();
    }
  }, [isCreateMode]);

  useEffect(() => {
    try {
      const saved = localStorage.getItem('cabsy_user_profile');
      const base = saved ? JSON.parse(saved) : {};
      const currentAuth = localStorage.getItem('cabsy_auth_method') || (googleData ? 'google' : '');
      const savedPhone = (isCreateMode && currentAuth !== 'phone') ? '' : (localStorage.getItem('cabsy_user_phone') || '');
      const source = googleData || (base.email ? base : null);

      const emailVal = source?.email || base.email || '';
      let nameVal = source?.name || base.name || '';
      if ((!nameVal || nameVal === 'Google User' || nameVal === 'Empire Rider') && emailVal) {
        nameVal = formatNameFromEmail(emailVal);
      }

      setProfile(prev => ({
        ...prev,
        name: nameVal || prev.name || '',
        email: emailVal || prev.email || '',
        phone: (isCreateMode && currentAuth !== 'phone') ? (base.phone || '') : (source?.phone || prev.phone || base.phone || savedPhone || ''),
        photoURL: source?.photoURL || prev.photoURL || base.photoURL || null
      }));
    } catch (e) {}
  }, [googleData]);

  const handlePhotoUpload = (e) => {
    const file = e.target.files[0];
    if (file) {
      const reader = new FileReader();
      reader.onloadend = () => {
        setProfile(prev => ({ ...prev, photoURL: reader.result }));
      };
      reader.readAsDataURL(file);
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setValidationError('');

    if (!profile.name || !profile.name.trim()) {
      setValidationError('Please enter your full name to continue.');
      return;
    }

    const cleanPhone = (profile.phone || '').replace(/\D/g, '');
    if (cleanPhone.length < 10) {
      setValidationError('Please enter a valid 10-digit mobile number to complete registration.');
      return;
    }

    const formattedPhone = cleanPhone.length >= 10 ? (profile.phone.startsWith('+') ? profile.phone : `+91 ${cleanPhone.slice(-10)}`) : profile.phone;

    const finalProfile = {
      ...profile,
      id: profile.id || ('CUST-' + Math.floor(10000 + Math.random() * 89999)),
      name: profile.name.trim(),
      phone: formattedPhone,
      email: (profile.email || '').toLowerCase().trim(),
      totalRides: (Number.isNaN(Number(profile.totalRides)) || !profile.totalRides) ? 0 : Number(profile.totalRides),
      totalSpent: (Number.isNaN(Number(profile.totalSpent)) || !profile.totalSpent) ? 0 : Number(profile.totalSpent),
      joined: profile.joined || new Date().toISOString().split('T')[0],
      status: 'Active',
      lastLogin: new Date().toISOString()
    };

    try {
      localStorage.setItem('cabsy_user_profile', JSON.stringify(finalProfile));
      localStorage.setItem('EMPERIAL CABS_onboarded', 'true');
      localStorage.setItem('EMPERIAL CABS_profile_completed', 'true');
      if (cleanPhone) {
        localStorage.setItem(`cabsy_user_profile_${cleanPhone.slice(-10)}`, JSON.stringify(finalProfile));
        localStorage.setItem('cabsy_user_phone', finalProfile.phone);
      }
      if (finalProfile.email) {
        localStorage.setItem(`cabsy_user_profile_email_${finalProfile.email.toLowerCase().trim()}`, JSON.stringify(finalProfile));
      }
      db.saveCustomer(finalProfile);

      // Async background DB write (non-blocking so UI moves instantly)
      saveCustomerToMySQL(finalProfile).catch(() => {});

      window.dispatchEvent(new Event('storage'));
      window.dispatchEvent(new CustomEvent('EMPERIAL CABS_db_sync', { detail: { type: 'CUSTOMER_UPDATED', data: finalProfile } }));
    } catch (err) {}

    setSavedSuccess(true);
    if (onSave) onSave(finalProfile);
    else if (onBack) onBack();
  };

  return (
    <div className="real-mobile-app" style={{ background: '#F8FAFC', minHeight: '100vh', display: 'flex', flexDirection: 'column' }}>
      {/* Top Header */}
      <div className="white-header-nav" style={{ 
        display: 'flex', 
        alignItems: 'center', 
        justifyContent: 'center',
        padding: '16px 20px', 
        background: '#FFFFFF',
        borderBottom: '1px solid #E2E8F0',
        position: 'sticky',
        top: 0,
        zIndex: 10
      }}>
        <button 
          className="header-back-arrow" 
          onClick={onBack}
          aria-label="Go Back"
          style={{ 
            position: 'absolute',
            left: '16px',
            background: '#F1F5F9', 
            border: 'none', 
            width: '36px', 
            height: '36px', 
            borderRadius: '12px', 
            cursor: 'pointer',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            color: '#0F172A'
          }}
        >
          <ArrowLeft size={18} />
        </button>
        <h2 className="white-header-title" style={{ fontSize: '18px', fontWeight: '800', color: '#0F172A', fontFamily: 'League Spartan, sans-serif', margin: 0, textAlign: 'center' }}>
          {isCreateMode ? 'Complete Your Profile' : 'Profile Details'}
        </h2>
      </div>

      <div className="mobile-screen-body" style={{ padding: '24px 20px 120px 20px', flex: 1, maxWidth: '500px', margin: '0 auto', width: '100%', boxSizing: 'border-box' }}>
        
        {isCreateMode && (
          <div style={{ textAlign: 'center', marginBottom: '20px' }}>
            <h3 style={{ fontFamily: 'League Spartan, sans-serif', fontSize: '24px', fontWeight: '800', color: '#0F172A', margin: '0 0 6px 0' }}>
              Welcome to EMPERIAL CABS
            </h3>
            <p style={{ fontFamily: 'Space Grotesk, sans-serif', fontSize: '14px', color: '#64748B', margin: 0 }}>
              Please complete your profile to finish registration.
            </p>
          </div>
        )}

        {/* Photo Upload Section */}
        <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', marginBottom: '24px' }}>
          <div style={{ position: 'relative' }}>
            {profile.photoURL ? (
              <img 
                src={profile.photoURL} 
                alt="Avatar" 
                onError={(e) => { e.target.style.display = 'none'; e.target.nextSibling.style.display = 'flex'; }}
                style={{ width: '92px', height: '92px', borderRadius: '50%', objectFit: 'cover', border: '3px solid #10B981', boxShadow: '0 8px 20px rgba(16,185,129,0.2)' }} 
              />
            ) : null}
            <div style={{ width: '92px', height: '92px', borderRadius: '50%', background: 'linear-gradient(135deg, #10B981 0%, #059669 100%)', color: '#FFFFFF', fontWeight: '800', display: profile.photoURL ? 'none' : 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '36px', boxShadow: '0 8px 20px rgba(16,185,129,0.3)' }}>
              {profile.name ? profile.name.charAt(0).toUpperCase() : 'R'}
            </div>
            <label 
              htmlFor="avatar-file-input"
              aria-label="Upload Photo"
              style={{
                position: 'absolute',
                bottom: '0',
                right: '0',
                background: '#10B981',
                color: '#FFFFFF',
                width: '32px',
                height: '32px',
                borderRadius: '50%',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                cursor: 'pointer',
                border: '2.5px solid #FFFFFF',
                boxShadow: '0 2px 8px rgba(0,0,0,0.18)'
              }}
            >
              <Camera size={16} color="#FFFFFF" />
            </label>
            <input 
              id="avatar-file-input" 
              type="file" 
              accept="image/*" 
              onChange={handlePhotoUpload} 
              style={{ display: 'none' }} 
            />
          </div>
          <p style={{ margin: '8px 0 0 0', fontSize: '13px', color: '#64748B', fontFamily: 'Space Grotesk, sans-serif', fontWeight: '500' }}>
            Tap camera icon to upload photo
          </p>
        </div>

        {/* Validation Error */}
        {validationError && (
          <div style={{ background: '#FEF2F2', border: '1.5px solid #FCA5A5', color: '#991B1B', padding: '12px 16px', borderRadius: '14px', fontWeight: '600', textAlign: 'center', marginBottom: '16px', fontFamily: 'Space Grotesk, sans-serif', fontSize: '14px' }}>
            {validationError}
          </div>
        )}

        {/* Success Alert */}
        {savedSuccess && (
          <div style={{ background: '#DCFCE7', border: '1.5px solid #86EFAC', color: '#15803D', padding: '12px 16px', borderRadius: '14px', fontWeight: '700', textAlign: 'center', marginBottom: '20px', fontFamily: 'League Spartan, sans-serif', fontSize: '15px' }}>
            Profile Saved Successfully
          </div>
        )}

        <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '18px' }}>
          <div>
            <label style={{ fontSize: '12px', fontWeight: '800', color: '#475569', letterSpacing: '0.6px', display: 'block', marginBottom: '8px', fontFamily: 'Space Grotesk, sans-serif' }}>
              FULL NAME <span style={{ color: '#EF4444' }}>*</span>
            </label>
            <input 
              type="text" 
              required
              placeholder="e.g. Ramesh Patel"
              value={profile.name}
              onChange={(e) => setProfile({ ...profile, name: e.target.value })}
              style={{ width: '100%', boxSizing: 'border-box', padding: '15px 18px', borderRadius: '16px', border: '1.5px solid #CBD5E1', fontSize: '15px', fontFamily: 'Space Grotesk, sans-serif', outline: 'none', background: '#FFFFFF', color: '#0F172A', transition: 'border-color 0.2s' }}
            />
          </div>

          <div>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '8px' }}>
              <label style={{ fontSize: '12px', fontWeight: '800', color: '#475569', letterSpacing: '0.6px', fontFamily: 'Space Grotesk, sans-serif' }}>
                PHONE NUMBER
              </label>
              {isPhoneVerified && (
                <span style={{ display: 'inline-flex', alignItems: 'center', gap: '4px', fontSize: '11px', fontWeight: '700', color: '#10B981', background: '#ECFDF5', padding: '2px 8px', borderRadius: '8px' }}>
                  <CheckCircle2 size={12} color="#10B981" /> Verified
                </span>
              )}
            </div>
            <input 
              type="tel" 
              required
              placeholder="Enter 10-digit mobile number"
              value={profile.phone}
              onChange={(e) => setProfile({ ...profile, phone: e.target.value })}
              style={{ width: '100%', boxSizing: 'border-box', padding: '15px 18px', borderRadius: '16px', border: '1.5px solid #CBD5E1', fontSize: '15px', fontFamily: 'Space Grotesk, sans-serif', outline: 'none', background: isPhoneVerified ? '#F8FAFC' : '#FFFFFF', color: '#0F172A' }}
            />
          </div>

          <div>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '8px' }}>
              <label style={{ fontSize: '12px', fontWeight: '800', color: '#475569', letterSpacing: '0.6px', fontFamily: 'Space Grotesk, sans-serif' }}>
                EMAIL ADDRESS
              </label>
              {isEmailVerified && (
                <span style={{ display: 'inline-flex', alignItems: 'center', gap: '4px', fontSize: '11px', fontWeight: '700', color: '#10B981', background: '#ECFDF5', padding: '2px 8px', borderRadius: '8px' }}>
                  <CheckCircle2 size={12} color="#10B981" /> Verified
                </span>
              )}
            </div>
            <input 
              type="email" 
              placeholder="e.g. name@example.com"
              value={profile.email}
              onChange={(e) => setProfile({ ...profile, email: e.target.value })}
              style={{ width: '100%', boxSizing: 'border-box', padding: '15px 18px', borderRadius: '16px', border: '1.5px solid #CBD5E1', fontSize: '15px', fontFamily: 'Space Grotesk, sans-serif', outline: 'none', background: isEmailVerified ? '#F8FAFC' : '#FFFFFF', color: '#0F172A' }}
            />
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px' }}>
            <div>
              <label style={{ fontSize: '12px', fontWeight: '800', color: '#475569', letterSpacing: '0.6px', display: 'block', marginBottom: '8px', fontFamily: 'Space Grotesk, sans-serif' }}>AGE</label>
              <input 
                type="number" 
                placeholder="e.g. 28"
                value={profile.age}
                onChange={(e) => setProfile({ ...profile, age: e.target.value })}
                style={{ width: '100%', boxSizing: 'border-box', padding: '15px 18px', borderRadius: '16px', border: '1.5px solid #CBD5E1', fontSize: '15px', fontFamily: 'Space Grotesk, sans-serif', outline: 'none', background: '#FFFFFF', color: '#0F172A' }}
              />
            </div>
            <div>
              <label style={{ fontSize: '12px', fontWeight: '800', color: '#475569', letterSpacing: '0.6px', display: 'block', marginBottom: '8px', fontFamily: 'Space Grotesk, sans-serif' }}>PROFESSION</label>
              <input 
                type="text" 
                placeholder="e.g. Business"
                value={profile.profession}
                onChange={(e) => setProfile({ ...profile, profession: e.target.value })}
                style={{ width: '100%', boxSizing: 'border-box', padding: '15px 18px', borderRadius: '16px', border: '1.5px solid #CBD5E1', fontSize: '15px', fontFamily: 'Space Grotesk, sans-serif', outline: 'none', background: '#FFFFFF', color: '#0F172A' }}
              />
            </div>
          </div>

          <div>
            <label style={{ fontSize: '12px', fontWeight: '800', color: '#475569', letterSpacing: '0.6px', display: 'block', marginBottom: '8px', fontFamily: 'Space Grotesk, sans-serif' }}>CITY & REGION</label>
            <input 
              type="text" 
              placeholder="e.g. Bhavnagar, Gujarat"
              value={profile.area}
              onChange={(e) => setProfile({ ...profile, area: e.target.value })}
              style={{ width: '100%', boxSizing: 'border-box', padding: '15px 18px', borderRadius: '16px', border: '1.5px solid #CBD5E1', fontSize: '15px', fontFamily: 'Space Grotesk, sans-serif', outline: 'none', background: '#FFFFFF', color: '#0F172A' }}
            />
          </div>

          <button 
            type="submit"
            style={{ 
              marginTop: '12px', 
              width: '100%', 
              boxSizing: 'border-box', 
              padding: '16px 20px', 
              fontSize: '17px', 
              fontWeight: '800',
              fontFamily: 'League Spartan, sans-serif',
              color: '#FFFFFF',
              background: 'linear-gradient(135deg, #10B981 0%, #059669 100%)',
              border: 'none',
              borderRadius: '28px',
              cursor: 'pointer',
              boxShadow: '0 8px 24px rgba(16, 185, 129, 0.35)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              gap: '8px'
            }}
          >
            <span>{isCreateMode ? 'Complete Registration & Enter App' : 'Save Profile Changes'}</span>
            <ArrowRight size={18} />
          </button>
        </form>
      </div>
    </div>
  );
}
