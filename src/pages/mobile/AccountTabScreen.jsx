import React, { useState, useEffect } from 'react';
import BottomNavBar from '../../components/BottomNavBar';
import { User, ShieldCheck, Bell, FileText, Lock, Headphones, LogOut, Edit3, ChevronRight, X, Moon, Sun, Monitor } from 'lucide-react';

export default function AccountTabScreen({ activeTab, setActiveTab, onNavigate, onNavigateScreen, onLogout, onBack }) {
  const handleOpenEdit = () => {
    if (onNavigateScreen) onNavigateScreen('accountdetail');
    else if (onNavigate) onNavigate('accountdetail');
  };

  const [userProfile, setUserProfile] = useState(() => {
    try {
      const saved = localStorage.getItem('cabsy_user_profile');
      return saved ? JSON.parse(saved) : {
        name: 'Rider',
        email: 'user@empirecab.in',
        phone: '+91 98765 43210',
        age: 26,
        profession: 'Rider',
        area: 'Bhavnagar, Gujarat',
        photoURL: null
      };
    } catch (e) {
      return {
        name: 'Rider',
        email: 'user@empirecab.in',
        phone: '+91 98765 43210',
        age: 26,
        profession: 'Rider',
        area: 'Bhavnagar, Gujarat',
        photoURL: null
      };
    }
  });

  const [showInfoModal, setShowInfoModal] = useState(null);
  const [showLogoutConfirm, setShowLogoutConfirm] = useState(false);
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);

  useEffect(() => {
    try {
      document.body.classList.remove('dark-mode');
      localStorage.removeItem('cabsy_theme_mode');
    } catch (e) {}
  }, []);

  useEffect(() => {
    const handleStorageChange = () => {
      try {
        const saved = localStorage.getItem('cabsy_user_profile');
        if (saved) setUserProfile(JSON.parse(saved));
      } catch (e) {}
    };
    window.addEventListener('storage', handleStorageChange);
    return () => window.removeEventListener('storage', handleStorageChange);
  }, []);

  return (
    <div className="real-mobile-app" style={{ background: '#F8FAFC' }}>
      {/* Header */}
      <div className="white-header-nav" style={{ boxShadow: '0 2px 10px rgba(0,0,0,0.03)' }}>
        {onBack && <button className="header-back-arrow" onClick={onBack}>←</button>}
        <h2 className="white-header-title">My Account & Profile</h2>
      </div>

      <div className="app-scroll-content" style={{ padding: '20px 20px 100px 20px' }}>
        {/* Profile Card Header */}
        <div 
          onClick={handleOpenEdit}
          style={{ 
            background: 'linear-gradient(135deg, #34D399 0%, #10B981 100%)', 
            borderRadius: '24px', 
            padding: '18px 20px', 
            color: '#FFFFFF',
            boxShadow: '0 12px 28px rgba(52, 211, 153, 0.35)',
            marginBottom: '20px',
            display: 'flex',
            alignItems: 'center',
            gap: '14px',
            cursor: 'pointer',
            overflow: 'hidden'
          }}
        >
          <div style={{ position: 'relative', flexShrink: 0 }}>
            {userProfile.photoURL ? (
              <img 
                src={userProfile.photoURL} 
                alt="Profile" 
                onError={(e) => { e.target.style.display = 'none'; e.target.nextSibling.style.display = 'flex'; }}
                style={{ width: '60px', height: '60px', borderRadius: '50%', objectFit: 'cover', border: '3px solid #FFFFFF', boxShadow: '0 4px 12px rgba(0,0,0,0.15)' }} 
              />
            ) : null}
            <div style={{ width: '60px', height: '60px', borderRadius: '50%', background: '#FFFFFF', color: '#10B981', fontWeight: '800', display: userProfile.photoURL ? 'none' : 'flex', alignItems: 'center', justifyContent: 'center', border: '3px solid #FFFFFF', boxShadow: '0 4px 12px rgba(0,0,0,0.15)' }}>
              <User size={28} />
            </div>
          </div>

          <div style={{ flex: 1, minWidth: 0, overflow: 'hidden' }}>
            <h3 style={{ fontFamily: 'League Spartan', fontWeight: '800', fontSize: '20px', color: '#FFFFFF', margin: 0, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
              {userProfile.name || 'Rider'}
            </h3>
            <p style={{ margin: '2px 0 0 0', fontSize: '12px', opacity: 0.95, fontFamily: 'Space Grotesk', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
              {userProfile.phone || ''} {userProfile.phone && userProfile.email ? '•' : ''} {userProfile.email || ''}
            </p>
          </div>

          <button 
            onClick={(e) => { e.stopPropagation(); handleOpenEdit(); }}
            style={{ flexShrink: 0, background: 'rgba(255,255,255,0.25)', border: '1px solid rgba(255,255,255,0.5)', color: '#FFFFFF', padding: '8px 14px', borderRadius: '14px', fontWeight: '800', fontSize: '12px', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '4px' }}
          >
            <Edit3 size={13} /> Edit
          </button>
        </div>

        {/* Profile Attributes Quick Grid */}
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '10px', marginBottom: '20px' }}>
          <div style={{ background: '#FFFFFF', border: '1px solid #E2E8F0', borderRadius: '16px', padding: '12px 10px', textAlign: 'center' }}>
            <div style={{ fontSize: '11px', color: '#64748B', fontWeight: '700' }}>AGE</div>
            <div style={{ fontSize: '14px', fontWeight: '800', color: '#0F172A', fontFamily: 'Space Grotesk' }}>
              {(userProfile.age && Number(userProfile.age) > 0 && Number(userProfile.age) <= 100) ? userProfile.age : 26} yrs
            </div>
          </div>
          <div style={{ background: '#FFFFFF', border: '1px solid #E2E8F0', borderRadius: '16px', padding: '12px 10px', textAlign: 'center' }}>
            <div style={{ fontSize: '11px', color: '#64748B', fontWeight: '700' }}>ROLE</div>
            <div style={{ fontSize: '13px', fontWeight: '800', color: '#0F172A', fontFamily: 'Space Grotesk', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{userProfile.profession || 'Rider'}</div>
          </div>
          <div style={{ background: '#FFFFFF', border: '1px solid #E2E8F0', borderRadius: '16px', padding: '12px 10px', textAlign: 'center' }}>
            <div style={{ fontSize: '11px', color: '#64748B', fontWeight: '700' }}>LOCATION</div>
            <div style={{ fontSize: '13px', fontWeight: '800', color: '#0F172A', fontFamily: 'Space Grotesk', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{userProfile.area || 'Bhavnagar, Gujarat'}</div>
          </div>
        </div>

        {/* Settings List */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: '8px', marginBottom: '24px' }}>
          {/* Theme Selector Setting */}


          {[
            { id: 'profile', Icon: User, title: 'Personal Details & Photo', desc: 'Manage name, phone, age & picture' },
            { id: 'safety', Icon: ShieldCheck, title: 'Safety & Emergency Contacts', desc: 'Share trip details with trusted contacts' },
            { id: 'notifications', Icon: Bell, title: 'Push Notifications', desc: 'Ride status alerts & offer updates' },
            { id: 'terms', Icon: FileText, title: 'Terms of Service', desc: 'EMPERIAL CABS legal guidelines and privacy' },
            { id: 'privacy', Icon: Lock, title: 'Privacy Policy', desc: 'How your data is protected' },
            { id: 'support', Icon: Headphones, title: '24x7 Customer Support', desc: 'Call or chat with EMPERIAL CABS help desk' }
          ].map((item) => (
            <div 
              key={item.id} 
              onClick={() => {
                if (item.id === 'profile') handleOpenEdit();
                else setShowInfoModal(item);
              }}
              style={{ background: '#FFFFFF', border: '1.5px solid #E2E8F0', borderRadius: '18px', padding: '14px 16px', display: 'flex', alignItems: 'center', gap: '14px', cursor: 'pointer' }}
            >
              <div style={{ width: '38px', height: '38px', borderRadius: '12px', background: '#F1F5F9', color: '#10B981', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                <item.Icon size={20} />
              </div>
              <div style={{ flex: 1 }}>
                <div style={{ fontSize: '14px', fontWeight: '700', color: '#0F172A', fontFamily: 'Space Grotesk' }}>{item.title}</div>
                <div style={{ fontSize: '12px', color: '#64748B' }}>{item.desc}</div>
              </div>
              <ChevronRight size={18} color="#94A3B8" />
            </div>
          ))}
        </div>

        {/* Logout Button */}
        <button 
          onClick={() => setShowLogoutConfirm(true)}
          style={{ 
            width: '100%', 
            background: '#FEF2F2', 
            border: '1.5px solid #FECACA', 
            color: '#E11D48', 
            padding: '16px', 
            borderRadius: '18px', 
            fontFamily: 'League Spartan', 
            fontSize: '17px', 
            fontWeight: '800',
            cursor: 'pointer',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            gap: '8px'
          }}
        >
          <LogOut size={18} /> Logout Account
        </button>

        {/* Delete Account & Data Button (Google Play Policy Compliance) */}
        <button 
          onClick={() => setShowDeleteConfirm(true)}
          style={{ 
            width: '100%', 
            background: 'transparent', 
            border: 'none', 
            color: '#94A3B8', 
            padding: '12px', 
            fontFamily: 'Space Grotesk', 
            fontSize: '13px', 
            fontWeight: '600',
            cursor: 'pointer',
            marginTop: '8px',
            textDecoration: 'underline'
          }}
        >
          Delete Account & Personal Data
        </button>
      </div>

      {/* Logout Confirmation Modal Overlay */}
      {showLogoutConfirm && (
        <div style={{ position: 'fixed', inset: 0, background: 'rgba(15, 23, 42, 0.65)', zIndex: 9999, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '20px', backdropFilter: 'blur(4px)' }}>
          <div style={{ background: '#FFFFFF', borderRadius: '24px', padding: '24px', maxWidth: '340px', width: '100%', boxShadow: '0 20px 40px rgba(0,0,0,0.15)', textAlign: 'center' }}>
            <div style={{ width: '48px', height: '48px', borderRadius: '50%', background: '#FEF2F2', color: '#E11D48', display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '0 auto 14px' }}>
              <LogOut size={24} />
            </div>
            <h3 style={{ margin: '0 0 8px 0', fontFamily: 'League Spartan', fontSize: '20px', fontWeight: '800', color: '#0F172A' }}>
              Logout of EMPERIAL CABS?
            </h3>
            <p style={{ fontFamily: 'Space Grotesk', fontSize: '14px', color: '#64748B', lineHeight: '1.45', margin: '0 0 20px 0' }}>
              You will need to sign in again to book rides or view ongoing trip history.
            </p>
            <div style={{ display: 'flex', gap: '10px' }}>
              <button 
                onClick={() => setShowLogoutConfirm(false)}
                style={{ flex: 1, background: '#F1F5F9', color: '#475569', border: 'none', padding: '14px', borderRadius: '14px', fontWeight: '700', fontSize: '15px', cursor: 'pointer', fontFamily: 'Space Grotesk' }}
              >
                Cancel
              </button>
              <button 
                onClick={() => {
                  setShowLogoutConfirm(false);
                  if (onLogout) onLogout();
                }}
                style={{ flex: 1, background: '#E11D48', color: '#FFFFFF', border: 'none', padding: '14px', borderRadius: '14px', fontWeight: '800', fontSize: '15px', cursor: 'pointer', fontFamily: 'League Spartan', boxShadow: '0 4px 14px rgba(225, 29, 72, 0.35)' }}
              >
                Logout
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Delete Account Confirmation Modal Overlay */}
      {showDeleteConfirm && (
        <div style={{ position: 'fixed', inset: 0, background: 'rgba(15, 23, 42, 0.65)', zIndex: 9999, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '20px', backdropFilter: 'blur(4px)' }}>
          <div style={{ background: '#FFFFFF', borderRadius: '24px', padding: '24px', maxWidth: '340px', width: '100%', boxShadow: '0 20px 40px rgba(0,0,0,0.15)', textAlign: 'center' }}>
            <div style={{ width: '48px', height: '48px', borderRadius: '50%', background: '#FEF2F2', color: '#DC2626', display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '0 auto 14px' }}>
              <Lock size={24} />
            </div>
            <h3 style={{ margin: '0 0 8px 0', fontFamily: 'League Spartan', fontSize: '20px', fontWeight: '800', color: '#0F172A' }}>
              Delete Account & Data?
            </h3>
            <p style={{ fontFamily: 'Space Grotesk', fontSize: '13px', color: '#64748B', lineHeight: '1.45', margin: '0 0 20px 0' }}>
              This will permanently delete your profile, saved locations, and ride records in accordance with Google Play data protection guidelines.
            </p>
            <div style={{ display: 'flex', gap: '10px' }}>
              <button 
                onClick={() => setShowDeleteConfirm(false)}
                style={{ flex: 1, background: '#F1F5F9', color: '#475569', border: 'none', padding: '14px', borderRadius: '14px', fontWeight: '700', fontSize: '15px', cursor: 'pointer', fontFamily: 'Space Grotesk' }}
              >
                Cancel
              </button>
              <button 
                onClick={() => {
                  try {
                    localStorage.removeItem('cabsy_user_profile');
                    localStorage.removeItem('cabsy_user_session');
                    localStorage.removeItem('cabsy_inquiries');
                  } catch (e) {}
                  setShowDeleteConfirm(false);
                  if (onLogout) onLogout();
                }}
                style={{ flex: 1, background: '#DC2626', color: '#FFFFFF', border: 'none', padding: '14px', borderRadius: '14px', fontWeight: '800', fontSize: '15px', cursor: 'pointer', fontFamily: 'League Spartan', boxShadow: '0 4px 14px rgba(220, 38, 38, 0.35)' }}
              >
                Delete
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Info Modal Overlay */}
      {showInfoModal && (
        <div style={{ position: 'fixed', inset: 0, background: 'rgba(15, 23, 42, 0.65)', zIndex: 9999, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '20px', backdropFilter: 'blur(4px)' }}>
          <div style={{ background: '#FFFFFF', borderRadius: '24px', padding: '24px', maxWidth: '340px', width: '100%', boxShadow: '0 20px 40px rgba(0,0,0,0.15)' }}>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '14px' }}>
              <h3 style={{ margin: 0, fontFamily: 'League Spartan', fontSize: '18px', fontWeight: '800', color: '#0F172A' }}>
                {showInfoModal.icon} {showInfoModal.title}
              </h3>
              <button onClick={() => setShowInfoModal(null)} style={{ background: '#F1F5F9', border: 'none', borderRadius: '50%', width: '32px', height: '32px', fontSize: '16px', cursor: 'pointer', color: '#0F172A' }}>✕</button>
            </div>
            <p style={{ fontFamily: 'Space Grotesk', fontSize: '14px', color: '#475569', lineHeight: '1.5', margin: '0 0 20px 0' }}>
              {showInfoModal.desc}. This setting is fully active for your EMPERIAL CABS rider profile in Gujarat, India.
            </p>
            <button 
              onClick={() => setShowInfoModal(null)}
              style={{ width: '100%', background: 'linear-gradient(135deg, #10B981 0%, #059669 100%)', color: '#FFFFFF', border: 'none', padding: '14px', borderRadius: '16px', fontWeight: '800', fontSize: '15px', cursor: 'pointer', boxShadow: '0 6px 20px rgba(16, 185, 129, 0.35)' }}
            >
              Close Window
            </button>
          </div>
        </div>
      )}

      {/* Bottom Navigation Toolbar */}
      <BottomNavBar activeTab={activeTab} setActiveTab={setActiveTab} />
    </div>
  );
}
