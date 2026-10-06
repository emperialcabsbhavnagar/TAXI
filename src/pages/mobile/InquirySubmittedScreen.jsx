import React from 'react';

export default function InquirySubmittedScreen({ inquiry, onGoHome, onViewRides }) {
  const inqData = inquiry || {
    id: 'INQ-4821',
    customerName: 'Dhruvil Patel',
    customerPhone: '+91 72268 44108',
    pickup: 'Bhavnagar, Gujarat',
    dropoff: 'Ahmedabad Airport (AMD)',
    vehicle: 'SWIFT',
    fare: 770,
    date: new Date().toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' }),
    status: 'Pending'
  };

  return (
    <div className="real-mobile-app" style={{ background: '#F8FAFC', display: 'flex', flexDirection: 'column', minHeight: '100vh', position: 'relative' }}>
      {/* Top Header */}
      <div className="white-header-nav" style={{ boxShadow: '0 2px 10px rgba(0,0,0,0.03)' }}>
        <h2 className="white-header-title">Booking Confirmation</h2>
      </div>

      <div className="mobile-screen-body" style={{ padding: '20px 20px 120px 20px', flex: 1, overflowY: 'auto', display: 'flex', flexDirection: 'column', alignItems: 'center' }}>
        
        {/* Checkmark Icon Badge */}
        <div style={{ 
          width: '72px', 
          height: '72px', 
          borderRadius: '50%', 
          background: 'linear-gradient(135deg, #22C55E 0%, #16A34A 100%)', 
          display: 'flex', 
          alignItems: 'center', 
          justifyContent: 'center', 
          color: '#FFFFFF', 
          fontSize: '36px', 
          fontWeight: 'bold',
          boxShadow: '0 10px 28px rgba(34, 197, 94, 0.35)',
          marginBottom: '16px'
        }}>
          ✓
        </div>

        <h2 style={{ fontFamily: 'League Spartan, sans-serif', fontSize: '24px', fontWeight: '800', color: '#0F172A', margin: '0 0 4px 0', textAlign: 'center' }}>
          Booking Inquiry Submitted!
        </h2>
        <p style={{ fontFamily: 'Space Grotesk, sans-serif', fontSize: '13px', color: '#64748B', margin: '0 0 18px 0', textAlign: 'center', maxWidth: '320px', lineHeight: '1.4' }}>
          Your ride booking request has been registered in our Admin Dispatcher Portal.
        </p>

        {/* Inquiry Card Details */}
        <div style={{ 
          width: '100%', 
          background: '#FFFFFF', 
          borderRadius: '20px', 
          border: '1.5px solid #E2E8F0', 
          padding: '18px', 
          boxShadow: '0 6px 20px rgba(0,0,0,0.04)', 
          marginBottom: '16px',
          boxSizing: 'border-box'
        }}>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', borderBottom: '1px solid #F1F5F9', paddingBottom: '12px', marginBottom: '12px' }}>
            <div>
              <span style={{ fontSize: '11px', fontWeight: '800', color: '#64748B', letterSpacing: '0.5px', display: 'block' }}>INQUIRY REFERENCE ID</span>
              <span style={{ fontFamily: 'League Spartan', fontSize: '18px', fontWeight: '800', color: '#0F172A' }}>{inqData.id}</span>
            </div>
            <span style={{ background: '#F0FDF4', border: '1px solid #BBF7D0', color: '#059669', padding: '4px 10px', borderRadius: '16px', fontSize: '11px', fontWeight: '800' }}>
              ● {inqData.status} Confirmation
            </span>
          </div>

          <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
            <div>
              <span style={{ fontSize: '11px', fontWeight: '800', color: '#64748B', display: 'block', marginBottom: '2px' }}>CUSTOMER DETAILS</span>
              <span style={{ fontSize: '13px', fontWeight: '700', color: '#0F172A', fontFamily: 'Space Grotesk' }}>{inqData.customerName} ({inqData.customerPhone})</span>
            </div>

            <div style={{ display: 'flex', gap: '10px', alignItems: 'center', background: '#F8FAFC', padding: '10px', borderRadius: '12px' }}>
              <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '3px' }}>
                <span style={{ width: '8px', height: '8px', borderRadius: '50%', background: '#22C55E' }}></span>
                <div style={{ width: '2px', height: '12px', background: '#CBD5E1' }}></div>
                <span style={{ width: '8px', height: '8px', borderRadius: '50%', background: '#EF4444' }}></span>
              </div>
              <div style={{ flex: 1, display: 'flex', flexDirection: 'column', gap: '2px' }}>
                <span style={{ fontSize: '12px', fontWeight: '700', color: '#0F172A', fontFamily: 'Space Grotesk' }}>{inqData.pickup}</span>
                <span style={{ fontSize: '12px', fontWeight: '700', color: '#0F172A', fontFamily: 'Space Grotesk' }}>{inqData.dropoff}</span>
              </div>
            </div>

            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', paddingTop: '2px' }}>
              <div>
                <span style={{ fontSize: '11px', fontWeight: '800', color: '#64748B', display: 'block' }}>SELECTED FLEET CAR</span>
                <span style={{ fontSize: '14px', fontWeight: '800', color: '#0F172A', fontFamily: 'League Spartan' }}>{inqData.vehicle}</span>
              </div>
              <div style={{ textAlign: 'right' }}>
                <span style={{ fontSize: '11px', fontWeight: '800', color: '#64748B', display: 'block' }}>ESTIMATED FARE</span>
                <span style={{ fontSize: '18px', fontWeight: '800', color: '#10B981', fontFamily: 'League Spartan' }}>₹{inqData.fare}</span>
              </div>
            </div>
          </div>
        </div>

        {/* Dispatcher Notice Box */}
        <div style={{ background: '#F0FDF4', border: '1.5px solid #BBF7D0', borderRadius: '14px', padding: '12px 14px', width: '100%', boxSizing: 'border-box' }}>
          <p style={{ margin: 0, fontSize: '12px', color: '#059669', fontFamily: 'Space Grotesk', fontWeight: '600', lineHeight: '1.4' }}>
            ℹ️ <strong>Dispatcher Action:</strong> Our admin dispatch team has received this inquiry in the Admin Panel and will call you at <strong>{inqData.customerPhone}</strong> to confirm vehicle availability.
          </p>
        </div>

      </div>

      {/* Sticky Bottom Action Bar */}
      <div style={{ 
        position: 'fixed', 
        bottom: 0, 
        left: 0, 
        right: 0, 
        background: '#FFFFFF', 
        borderTop: '1px solid #E2E8F0', 
        padding: '10px 16px', 
        display: 'flex', 
        flexDirection: 'column', 
        alignItems: 'center',
        gap: '8px', 
        boxShadow: '0 -6px 20px rgba(0,0,0,0.06)', 
        zIndex: 100 
      }}>
        <button 
          className="EMPERIAL CABS-btn-primary" 
          onClick={onViewRides}
          style={{ width: '95%', padding: '11px', fontSize: '15px', borderRadius: '14px' }}
        >
          View My Booking Inquiries →
        </button>

        <button 
          onClick={onGoHome}
          style={{
            width: '95%',
            background: '#F1F5F9',
            border: '1.5px solid #CBD5E1',
            color: '#0F172A',
            padding: '10px',
            borderRadius: '12px',
            fontFamily: 'League Spartan, sans-serif',
            fontSize: '14px',
            fontWeight: '800',
            cursor: 'pointer'
          }}
        >
          Back to Home
        </button>
      </div>
    </div>
  );
}
