import React, { useState, useEffect } from 'react';
import db from '../../services/dbService';
import { saveCustomerToMySQL } from '../../services/mysqlService';
import { saveCustomerToFirestore } from '../../services/firebaseService';

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
      const savedPhone = localStorage.getItem('cabsy_user_phone') || '';

      const emailVal = googleData?.email || base.email || '';
      let nameVal = googleData?.name || base.name || '';
      if ((!nameVal || nameVal === 'Google User') && emailVal) {
        nameVal = formatNameFromEmail(emailVal);
      }

      // In create mode: pre-fill Google data (name, email, photo) but leave
      // customer-specific fields blank so the user is forced to fill them
      const phoneVal = googleData?.phone || base.phone || savedPhone || '';
      const ageVal = (base.age && Number(base.age) > 0 && Number(base.age) <= 100) ? base.age : (isCreateMode ? '' : 26);
      const professionVal = base.profession || (isCreateMode ? '' : '');
      const areaVal = base.area || (isCreateMode ? '' : '');

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
    syncFromDb();
  }, []);

  useEffect(() => {
    try {
      const saved = localStorage.getItem('cabsy_user_profile');
      const base = saved ? JSON.parse(saved) : {};
      const savedPhone = localStorage.getItem('cabsy_user_phone') || '';
      const source = googleData || (base.email ? base : null);

      const emailVal = source?.email || base.email || '';
      let nameVal = source?.name || base.name || '';
      if ((!nameVal || nameVal === 'Google User' || nameVal === 'Google Rider') && emailVal) {
        nameVal = formatNameFromEmail(emailVal);
      }

      setProfile(prev => ({
        ...prev,
        name: nameVal || prev.name || '',
        email: emailVal || prev.email || '',
        phone: source?.phone || prev.phone || base.phone || savedPhone || '',
        photoURL: source?.photoURL || prev.photoURL || base.photoURL || null
      }));
    } catch (e) {}
  }, [googleData]);

  const [savedSuccess, setSavedSuccess] = useState(false);

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

  const [validationError, setValidationError] = useState('');

  const handleSubmit = async (e) => {
    e.preventDefault();
    setValidationError('');

    // In create mode, phone number is mandatory
    const cleanPhone = (profile.phone || '').replace(/\D/g, '');
    if (isCreateMode && cleanPhone.length < 10) {
      setValidationError('Please enter a valid phone number to continue.');
      return;
    }
    if (isCreateMode && !profile.name.trim()) {
      setValidationError('Please enter your name to continue.');
      return;
    }

    const finalProfile = {
      ...profile,
      id: profile.id || ('CUST-' + Math.floor(10000 + Math.random() * 89999)),
      totalRides: (Number.isNaN(Number(profile.totalRides)) || !profile.totalRides) ? 0 : Number(profile.totalRides),
      totalSpent: (Number.isNaN(Number(profile.totalSpent)) || !profile.totalSpent) ? 0 : Number(profile.totalSpent),
      joined: profile.joined || new Date().toISOString().split('T')[0]
    };
    try {
      localStorage.setItem('cabsy_user_profile', JSON.stringify(finalProfile));
      localStorage.setItem('EMPERIAL CABS_onboarded', 'true');
      localStorage.setItem('EMPERIAL CABS_profile_completed', 'true');
      if (cleanPhone) {
        localStorage.setItem(`cabsy_user_profile_${cleanPhone}`, JSON.stringify(finalProfile));
        localStorage.setItem('cabsy_user_phone', finalProfile.phone);
      }
      if (finalProfile.email) {
        localStorage.setItem(`cabsy_user_profile_email_${finalProfile.email.toLowerCase().trim()}`, JSON.stringify(finalProfile));
      }
      db.saveCustomer(finalProfile);
      await saveCustomerToMySQL(finalProfile).catch(() => {});
      await saveCustomerToFirestore(finalProfile).catch(() => {});
      window.dispatchEvent(new Event('storage'));
      window.dispatchEvent(new CustomEvent('EMPERIAL CABS_db_sync', { detail: { type: 'CUSTOMER_UPDATED', data: finalProfile } }));
    } catch (err) {}
    setSavedSuccess(true);
    setTimeout(() => {
      setSavedSuccess(false);
      if (onSave) onSave(finalProfile);
      else if (onBack) onBack();
    }, 1000);
  };

  return (
    <div className="real-mobile-app" style={{ background: '#F8FAFC', minHeight: '100vh', display: 'flex', flexDirection: 'column' }}>
      {/* Header */}
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
          style={{ 
            position: 'absolute',
            left: '16px',
            background: '#F1F5F9', 
            border: 'none', 
            width: '36px', 
            height: '36px', 
            borderRadius: '50%', 
            fontSize: '18px', 
            cursor: 'pointer',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            color: '#0F172A'
          }}
        >
          ←
        </button>
        <h2 className="white-header-title" style={{ fontSize: '18px', fontWeight: '800', color: '#0F172A', fontFamily: 'League Spartan', margin: 0, textAlign: 'center' }}>
          {isCreateMode ? 'Complete Customer Profile' : 'Profile Details'}
        </h2>
      </div>

      <div className="mobile-screen-body" style={{ padding: '24px 20px 120px 20px', flex: 1, maxWidth: '500px', margin: '0 auto', width: '100%', boxSizing: 'border-box' }}>
        {/* Photo Upload Section */}
        <div style={{ textCenter: 'center', display: 'flex', flexDirection: 'column', alignItems: 'center', marginBottom: '28px' }}>
          <div style={{ position: 'relative' }}>
            {profile.photoURL ? (
              <img 
                src={profile.photoURL} 
                alt="Avatar" 
                onError={(e) => { e.target.style.display = 'none'; e.target.nextSibling.style.display = 'flex'; }}
                style={{ width: '96px', height: '96px', borderRadius: '50%', objectFit: 'cover', border: '3px solid #10B981', boxShadow: '0 8px 20px rgba(16,185,129,0.2)' }} 
              />
            ) : null}
            <div style={{ width: '96px', height: '96px', borderRadius: '50%', background: 'linear-gradient(135deg, #10B981 0%, #059669 100%)', color: '#FFFFFF', fontWeight: '800', display: profile.photoURL ? 'none' : 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '38px', boxShadow: '0 8px 20px rgba(16,185,129,0.3)' }}>
              {profile.name ? profile.name.charAt(0).toUpperCase() : 'R'}
            </div>
            <label 
              htmlFor="avatar-file-input"
              style={{
                position: 'absolute',
                bottom: '2px',
                right: '2px',
                background: '#10B981',
                color: '#FFFFFF',
                width: '34px',
                height: '34px',
                borderRadius: '50%',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                cursor: 'pointer',
                fontSize: '15px',
                border: '2.5px solid #FFFFFF',
                boxShadow: '0 2px 8px rgba(0,0,0,0.18)'
              }}
            >
              📷
            </label>
            <input 
              id="avatar-file-input" 
              type="file" 
              accept="image/*" 
              onChange={handlePhotoUpload} 
              style={{ display: 'none' }} 
            />
          </div>
          <p style={{ margin: '10px 0 0 0', fontSize: '13px', color: '#64748B', fontFamily: 'Space Grotesk', fontWeight: '500' }}>
            Tap camera icon to change picture
          </p>
        </div>

        {/* Validation Error */}
        {validationError && (
          <div style={{ background: '#FEF2F2', border: '1.5px solid #FCA5A5', color: '#991B1B', padding: '14px 18px', borderRadius: '16px', fontWeight: '700', textAlign: 'center', marginBottom: '16px', fontFamily: 'Space Grotesk', fontSize: '14px' }}>
            {validationError}
          </div>
        )}

        {/* Success Alert */}
        {savedSuccess && (
          <div style={{ background: '#DCFCE7', border: '1.5px solid #86EFAC', color: '#15803D', padding: '14px 18px', borderRadius: '16px', fontWeight: '800', textAlign: 'center', marginBottom: '24px', fontFamily: 'League Spartan', fontSize: '16px' }}>
            Profile Saved Successfully
          </div>
        )}

        <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
          <div>
            <label style={{ fontSize: '12px', fontWeight: '800', color: '#475569', letterSpacing: '0.6px', display: 'block', marginBottom: '8px' }}>FULL NAME</label>
            <input 
              type="text" 
              required
              placeholder="Enter your full name"
              value={profile.name}
              onChange={(e) => setProfile({ ...profile, name: e.target.value })}
              style={{ width: '100%', boxSizing: 'border-box', padding: '15px 18px', borderRadius: '16px', border: '1.5px solid #CBD5E1', fontSize: '15px', fontFamily: 'Space Grotesk', outline: 'none', background: '#FFFFFF', color: '#0F172A', transition: 'border-color 0.2s' }}
            />
          </div>

          <div>
            <label style={{ fontSize: '12px', fontWeight: '800', color: '#475569', letterSpacing: '0.6px', display: 'block', marginBottom: '8px' }}>PHONE NUMBER</label>
            <input 
              type="tel" 
              required
              placeholder="Enter your phone number"
              value={profile.phone}
              onChange={(e) => setProfile({ ...profile, phone: e.target.value })}
              style={{ width: '100%', boxSizing: 'border-box', padding: '15px 18px', borderRadius: '16px', border: '1.5px solid #CBD5E1', fontSize: '15px', fontFamily: 'Space Grotesk', outline: 'none', background: '#FFFFFF', color: '#0F172A', transition: 'border-color 0.2s' }}
            />
          </div>

          <div>
            <label style={{ fontSize: '12px', fontWeight: '800', color: '#475569', letterSpacing: '0.6px', display: 'block', marginBottom: '8px' }}>EMAIL ADDRESS</label>
            <input 
              type="email" 
              required
              placeholder="Enter your email address"
              value={profile.email}
              onChange={(e) => setProfile({ ...profile, email: e.target.value })}
              style={{ width: '100%', boxSizing: 'border-box', padding: '15px 18px', borderRadius: '16px', border: '1.5px solid #CBD5E1', fontSize: '15px', fontFamily: 'Space Grotesk', outline: 'none', background: '#FFFFFF', color: '#0F172A', transition: 'border-color 0.2s' }}
            />
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px' }}>
            <div>
              <label style={{ fontSize: '12px', fontWeight: '800', color: '#475569', letterSpacing: '0.6px', display: 'block', marginBottom: '8px' }}>AGE</label>
              <input 
                type="number" 
                placeholder="26"
                value={profile.age}
                onChange={(e) => setProfile({ ...profile, age: e.target.value })}
                style={{ width: '100%', boxSizing: 'border-box', padding: '15px 18px', borderRadius: '16px', border: '1.5px solid #CBD5E1', fontSize: '15px', fontFamily: 'Space Grotesk', outline: 'none', background: '#FFFFFF', color: '#0F172A' }}
              />
            </div>
            <div>
              <label style={{ fontSize: '12px', fontWeight: '800', color: '#475569', letterSpacing: '0.6px', display: 'block', marginBottom: '8px' }}>PROFESSION</label>
              <input 
                type="text" 
                placeholder="Rider"
                value={profile.profession}
                onChange={(e) => setProfile({ ...profile, profession: e.target.value })}
                style={{ width: '100%', boxSizing: 'border-box', padding: '15px 18px', borderRadius: '16px', border: '1.5px solid #CBD5E1', fontSize: '15px', fontFamily: 'Space Grotesk', outline: 'none', background: '#FFFFFF', color: '#0F172A' }}
              />
            </div>
          </div>

          <div>
            <label style={{ fontSize: '12px', fontWeight: '800', color: '#475569', letterSpacing: '0.6px', display: 'block', marginBottom: '8px' }}>CITY & REGION</label>
            <input 
              type="text" 
              placeholder="Bhavnagar, Gujarat"
              value={profile.area}
              onChange={(e) => setProfile({ ...profile, area: e.target.value })}
              style={{ width: '100%', boxSizing: 'border-box', padding: '15px 18px', borderRadius: '16px', border: '1.5px solid #CBD5E1', fontSize: '15px', fontFamily: 'Space Grotesk', outline: 'none', background: '#FFFFFF', color: '#0F172A' }}
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
              fontFamily: 'League Spartan',
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
            <span>Save Profile & Continue</span>
            <span style={{ fontSize: '20px' }}>→</span>
          </button>
        </form>
      </div>
    </div>
  );
}
