import React from 'react';
import InteractiveMap from '../../components/InteractiveMap';
import { getCoordsForPlace, generateRoutePolyline } from '../../utils/locationCoords';
import { Wallet, QrCode, Banknote, CreditCard, ArrowLeft, CheckCircle2, ArrowRight, ShieldCheck, Tag } from 'lucide-react';

export default function SelectPaymentScreen({ 
  userCoords,
  pickupLoc,
  dropoffLoc,
  selectedPayment, 
  setSelectedPayment, 
  promoCode, 
  setPromoCode, 
  onRequestRide, 
  onBack,
  tripType = 'one-way',
  isCustom = false
}) {
  const isCustomMode = isCustom || tripType === 'custom-trip' || tripType === 'round-trip';
  const pickupPos = getCoordsForPlace(pickupLoc || "Bhavnagar, Gujarat", userCoords);
  const destPos = getCoordsForPlace(dropoffLoc || "Ahmedabad Airport (AMD)", userCoords);
  const routePolyline = generateRoutePolyline(pickupPos, destPos);

  const paymentMethods = [
    { id: 'wallet', label: 'Empire Wallet', icon: Wallet },
    { id: 'gpay', label: 'UPI / QR', icon: QrCode },
    { id: 'cash', label: 'Cash to Driver', icon: Banknote },
    { id: 'card', label: 'Debit / Credit Card', icon: CreditCard }
  ];

  return (
    <div className="real-mobile-app">
      <div className="full-homescreen-map-wrapper">
        <div className="live-map-viewport">
          <InteractiveMap
            center={pickupPos}
            zoom={13}
            userLabel={pickupLoc || "Pickup Spot"}
            destination={destPos}
            routePolyline={routePolyline}
          />

          <div className="homescreen-bottom-card" style={{ background: '#FFFFFF', borderTopLeftRadius: '28px', borderTopRightRadius: '28px', boxShadow: '0 -10px 40px rgba(0,0,0,0.12)', padding: '24px 20px' }}>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '16px' }}>
              <button 
                type="button"
                onClick={onBack}
                style={{
                  background: '#F1F5F9',
                  border: 'none',
                  borderRadius: '16px',
                  padding: '8px 14px',
                  display: 'flex',
                  alignItems: 'center',
                  gap: '6px',
                  cursor: 'pointer',
                  fontFamily: 'Space Grotesk, sans-serif',
                  fontWeight: '700',
                  fontSize: '13px',
                  color: '#0F172A'
                }}
              >
                <ArrowLeft size={16} />
                <span>Back</span>
              </button>
              <div style={{ background: '#ECFDF5', color: '#047857', border: '1px solid #10B981', padding: '4px 12px', borderRadius: '12px', fontSize: '12px', fontWeight: '800', display: 'flex', alignItems: 'center', gap: '4px' }}>
                <ShieldCheck size={14} color="#10B981" />
                <span>{isCustomMode ? 'Rate As Per Fleet Car (Per KM)' : 'Fixed Transparent Fare'}</span>
              </div>
            </div>

            <p style={{ fontFamily: 'League Spartan, sans-serif', fontSize: '14px', fontWeight: '800', color: '#0F172A', letterSpacing: '0.5px', margin: '0 0 10px 0', textTransform: 'uppercase' }}>
              Select Payment Option
            </p>
            
            {/* Payment Option Cards */}
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: '10px', marginBottom: '18px' }}>
              {paymentMethods.map((item) => {
                const isSelected = selectedPayment === item.id;
                const IconComponent = item.icon;
                return (
                  <div 
                    key={item.id}
                    style={{
                      background: isSelected ? '#ECFDF5' : '#F8FAFC',
                      border: isSelected ? '2px solid #10B981' : '1.5px solid #E2E8F0',
                      borderRadius: '18px',
                      padding: '12px 14px',
                      display: 'flex',
                      alignItems: 'center',
                      gap: '10px',
                      cursor: 'pointer',
                      boxShadow: isSelected ? '0 4px 14px rgba(16, 185, 129, 0.2)' : 'none',
                      transition: 'all 0.2s ease'
                    }}
                    onClick={() => setSelectedPayment(item.id)}
                  >
                    <div style={{ width: '36px', height: '36px', borderRadius: '10px', background: isSelected ? '#10B981' : '#E2E8F0', color: isSelected ? '#FFFFFF' : '#475569', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                      <IconComponent size={18} />
                    </div>
                    <span style={{ fontFamily: 'Space Grotesk, sans-serif', fontWeight: '700', fontSize: '13px', color: '#0F172A' }}>{item.label}</span>
                  </div>
                );
              })}
            </div>

            <div style={{ display: 'flex', alignItems: 'center', gap: '6px', margin: '14px 0 8px 0' }}>
              <Tag size={15} color="#10B981" />
              <p style={{ fontFamily: 'League Spartan, sans-serif', fontSize: '14px', fontWeight: '800', color: '#0F172A', letterSpacing: '0.5px', margin: 0, textTransform: 'uppercase' }}>
                Promo / Voucher Code
              </p>
            </div>
            <div style={{ display: 'flex', gap: '10px', marginBottom: '20px' }}>
              <input 
                style={{ flex: 1, background: '#F8FAFC', border: '1.5px solid #CBD5E1', borderRadius: '14px', padding: '12px 16px', outline: 'none', fontFamily: 'Space Grotesk, sans-serif', fontSize: '16px', fontWeight: '600', color: '#0F172A', boxSizing: 'border-box' }}
                placeholder="Enter promo code (e.g. EMPIRE50)"
                value={promoCode}
                onChange={(e) => setPromoCode(e.target.value)}
              />
            </div>

            <button 
              type="button"
              className="EMPERIAL CABS-btn-primary" 
              onClick={onRequestRide}
              style={{
                width: '100%',
                padding: '16px',
                borderRadius: '16px',
                background: 'linear-gradient(135deg, #10B981 0%, #059669 100%)',
                color: '#FFFFFF',
                border: 'none',
                fontFamily: 'League Spartan, sans-serif',
                fontSize: '17px',
                fontWeight: '800',
                cursor: 'pointer',
                boxShadow: '0 10px 25px rgba(16, 185, 129, 0.4)',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                gap: '8px',
                letterSpacing: '0.5px'
              }}
            >
              <span>CONFIRM BOOKING & ASSIGN DRIVER</span>
              <ArrowRight size={20} />
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
