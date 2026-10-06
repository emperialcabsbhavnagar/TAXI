import React, { useState } from 'react';
import { Bell } from 'lucide-react';
import { requestNotificationPermission } from '../../services/notificationEngine';

export default function NotificationOptScreen({ onNext, onBack }) {
  const [statusText, setStatusText] = useState('');
  const [isLoading, setIsLoading] = useState(false);

  const handleAllowNotifications = async () => {
    setIsLoading(true);
    setStatusText('');

    try {
      localStorage.setItem('EMPERIAL CABS_permissions_asked', 'true');
      const granted = await requestNotificationPermission();
      if (granted) {
        setStatusText('Notifications enabled.');
      }
      setTimeout(() => {
        if (onNext) onNext();
      }, 350);
    } catch (e) {
      if (onNext) onNext();
    }
  };

  const handleSkip = () => {
    try {
      localStorage.setItem('EMPERIAL CABS_permissions_asked', 'true');
    } catch (e) {}
    if (onNext) onNext();
    else if (onBack) onBack();
  };

  return (
    <div className="real-mobile-app" style={{ background: '#FFFFFF', minHeight: '100vh', display: 'flex', flexDirection: 'column' }}>
      {/* Clean Top Navigation */}
      <div className="white-header-nav" style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '16px 20px', borderBottom: '1px solid #F1F5F9' }}>
        <button 
          className="header-back-arrow" 
          onClick={handleSkip}
          style={{ background: 'none', border: 'none', fontSize: '24px', cursor: 'pointer', color: '#0F172A', padding: 0, lineHeight: 1 }}
        >
          ‹
        </button>
        <h2 style={{ fontSize: '17px', fontWeight: '700', color: '#0F172A', margin: 0 }}>
          Notifications
        </h2>
        <button 
          onClick={handleSkip}
          style={{ background: 'none', border: 'none', fontSize: '14px', fontWeight: '700', color: '#64748B', cursor: 'pointer', padding: 0 }}
        >
          Skip
        </button>
      </div>

      {/* Main Content */}
      <div style={{ flex: 1, padding: '40px 24px', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', textAlign: 'center' }}>
        
        {/* Minimal Icon */}
        <div style={{
          width: '64px',
          height: '64px',
          borderRadius: '20px',
          background: '#F8FAFC',
          border: '1.5px solid #E2E8F0',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          marginBottom: '24px'
        }}>
          <Bell size={28} color="#0F172A" />
        </div>

        {/* Clean Title */}
        <h2 style={{ fontSize: '22px', fontWeight: '800', color: '#0F172A', margin: '0 0 10px 0', letterSpacing: '-0.02em' }}>
          Enable Notifications
        </h2>

        {/* Single Clean Line */}
        <p style={{ fontSize: '14px', color: '#64748B', lineHeight: '1.6', margin: '0 0 24px 0', maxWidth: '320px' }}>
          Receive real-time updates on your booking status, driver arrival, and trip receipts.
        </p>

        {statusText && (
          <p style={{ fontSize: '13px', fontWeight: '600', color: '#475569', marginBottom: '20px' }}>
            {statusText}
          </p>
        )}
      </div>

      {/* Bottom Actions */}
      <div style={{ padding: '24px 20px', display: 'flex', flexDirection: 'column', gap: '12px' }}>
        <button 
          type="button"
          onClick={handleAllowNotifications}
          disabled={isLoading}
          style={{
            width: '100%',
            height: '52px',
            borderRadius: '14px',
            background: 'linear-gradient(135deg, #FFAE00 0%, #FF9500 100%)',
            color: '#FFFFFF',
            fontSize: '16px',
            fontWeight: '800',
            border: 'none',
            cursor: isLoading ? 'default' : 'pointer',
            boxShadow: '0 4px 14px rgba(255, 174, 0, 0.3)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            opacity: isLoading ? 0.8 : 1
          }}
        >
          {isLoading ? 'Checking...' : 'Allow Notifications'}
        </button>

        <button 
          type="button"
          onClick={handleSkip}
          style={{
            width: '100%',
            height: '44px',
            borderRadius: '12px',
            background: 'transparent',
            border: 'none',
            fontSize: '14px',
            fontWeight: '700',
            color: '#64748B',
            cursor: 'pointer'
          }}
        >
          Not Now
        </button>
      </div>
    </div>
  );
}

