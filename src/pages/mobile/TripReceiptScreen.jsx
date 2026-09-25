import React, { useState, useEffect } from 'react';
import { CheckCircle2, ArrowRight, Home, Receipt, ShieldCheck, Car, Gift, Star, MapPin } from 'lucide-react';

export default function TripReceiptScreen({ tripData, onDone }) {
  const [receipt, setReceipt] = useState(() => {
    if (tripData) return tripData;
    try {
      const saved = localStorage.getItem('EMPERIAL CABS_last_completed_trip');
      if (saved) {
        const parsed = JSON.parse(saved);
        if (parsed) return parsed;
      }
      const inquiriesRaw = localStorage.getItem('cabsy_inquiries');
      if (inquiriesRaw) {
        const list = JSON.parse(inquiriesRaw);
        if (Array.isArray(list)) {
          const completed = list.find(i => i.status === 'Completed');
          if (completed) return completed;
        }
      }
    } catch (e) {}
    return {
      id: 'INQ-REC-001',
      customerName: 'Valued Customer',
      pickup: 'Bhavnagar, Gujarat',
      dropoff: 'Ahmedabad Int. Airport (AMD)',
      fare: 270,
      driver: 'Rajesh Kumar',
      rewardAmount: 0,
      date: new Date().toLocaleDateString()
    };
  });

  const [driverRating, setDriverRating] = useState(5);

  useEffect(() => {
    if (tripData) setReceipt(tripData);
  }, [tripData]);

  const fareNum = Number(receipt.fare || receipt.price || 270);
  const rewardVal = Number(receipt.rewardAmount || receipt.rewardGiven || 0);
  const hasReward = rewardVal > 0;

  const handleFinish = () => {
    try {
      const current = localStorage.getItem('EMPERIAL CABS_last_completed_trip');
      if (current) {
        const parsed = JSON.parse(current);
        parsed.dismissed = true;
        localStorage.setItem('EMPERIAL CABS_last_completed_trip', JSON.stringify(parsed));
      }
    } catch (e) {}

    if (onDone) onDone();
  };

  return (
    <div className="real-mobile-app">
      <div className="white-header-nav" style={{ padding: '16px 20px', borderBottom: '1px solid #E2E8F0', background: '#FFFFFF' }}>
        <h2 className="white-header-title" style={{ fontFamily: 'League Spartan', fontSize: '20px', fontWeight: '800', color: '#0F172A', margin: 0, display: 'flex', alignItems: 'center', gap: '8px' }}>
          <Receipt size={22} color="#34D399" />
          <span>Official Trip E-Receipt</span>
        </h2>
      </div>

      <div className="mobile-screen-body" style={{ padding: '20px', overflowY: 'auto' }}>
        <div style={{
          background: '#FFFFFF',
          border: '1.5px solid #E2E8F0',
          borderRadius: '24px',
          padding: '24px 20px',
          boxShadow: '0 12px 32px rgba(0,0,0,0.06)',
          marginBottom: '20px'
        }}>
          {/* Company Branding & Checkmark Header */}
          <div style={{ textAlign: 'center', marginBottom: '18px' }}>
            <img src="/EMPERAL_CABS_Website_Logo_Sharp.svg" alt="EMPERIAL CABS" style={{ height: '36px', width: 'auto', marginBottom: '14px', display: 'inline-block' }} />
            
            <div style={{
              width: '58px', height: '58px', borderRadius: '50%',
              background: 'linear-gradient(135deg, #6EE7B7 0%, #34D399 100%)',
              color: '#FFFFFF', display: 'flex', alignItems: 'center', justifyContent: 'center',
              margin: '0 auto 10px auto', boxShadow: '0 10px 25px rgba(110, 231, 183, 0.4)'
            }}>
              <CheckCircle2 size={32} strokeWidth={2.5} />
            </div>

            <h3 style={{ fontFamily: 'League Spartan, sans-serif', fontSize: '22px', fontWeight: '800', margin: 0, color: '#0F172A' }}>
              Trip Completed
            </h3>
            
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '4px', marginTop: '4px' }}>
              <ShieldCheck size={14} color="#34D399" />
              <p style={{ fontSize: '12px', color: '#64748B', margin: 0, fontFamily: 'Space Grotesk, sans-serif', fontWeight: '700' }}>
                Ref ID: <strong>{receipt.id || 'INQ-REF'}</strong> • {receipt.date || 'Today'}
              </p>
            </div>
          </div>

          {/* Route Details */}
          <div style={{ background: '#F8FAFC', padding: '14px', borderRadius: '16px', marginBottom: '18px', border: '1px solid #E2E8F0' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '8px' }}>
              <span style={{ width: '8px', height: '8px', borderRadius: '50%', background: '#22C55E', flexShrink: 0 }}></span>
              <span style={{ fontSize: '13px', fontWeight: '700', color: '#0F172A', fontFamily: 'Space Grotesk' }}>
                {receipt.pickup || receipt.pickupLoc || 'Pickup Location'}
              </span>
            </div>
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
              <span style={{ width: '8px', height: '8px', borderRadius: '50%', background: '#EF4444', flexShrink: 0 }}></span>
              <span style={{ fontSize: '13px', fontWeight: '700', color: '#0F172A', fontFamily: 'Space Grotesk' }}>
                {receipt.dropoff || receipt.dropoffLoc || 'Destination Point'}
              </span>
            </div>
          </div>

          {/* Chauffeur & Vehicle Info */}
          {receipt.driver && (
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: '10px', background: '#F1F5F9', padding: '12px 14px', borderRadius: '14px', marginBottom: '18px' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                <div style={{ width: '36px', height: '36px', borderRadius: '10px', background: '#0F172A', color: '#34D399', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                  <Car size={18} />
                </div>
                <div>
                  <div style={{ fontSize: '13px', fontWeight: '800', color: '#0F172A', fontFamily: 'Space Grotesk' }}>Chauffeur: {receipt.driver}</div>
                  <div style={{ fontSize: '11px', color: '#64748B', fontWeight: '600' }}>{receipt.vehicle || receipt.selectedCar || 'Executive Cab'}</div>
                </div>
              </div>
              {(receipt.plate || receipt.vehiclePlate || receipt.carPlate) && (
                <div style={{ background: '#FFFFFF', color: '#0F172A', padding: '4px 10px', borderRadius: '8px', fontWeight: '900', fontSize: '12px', fontFamily: 'Space Grotesk, sans-serif', letterSpacing: '0.8px', border: '1.5px solid #CBD5E1', display: 'inline-flex', alignItems: 'center', gap: '5px' }}>
                  🚗 {receipt.plate || receipt.vehiclePlate || receipt.carPlate}
                </div>
              )}
            </div>
          )}

          {/* Fare Itemized Breakdown */}
          <div style={{ borderTop: '1px dashed #CBD5E1', borderBottom: '1px dashed #CBD5E1', padding: '14px 0', margin: '14px 0', display: 'flex', flexDirection: 'column', gap: '10px', fontFamily: 'Space Grotesk, sans-serif' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '13px', color: '#64748B' }}>
              <span>Vehicle Class ({receipt.vehicle || 'Regular'})</span>
              <span style={{ fontWeight: '700', color: '#0F172A' }}>₹{fareNum.toFixed(2)}</span>
            </div>
            {Number(receipt.walletDiscountUsed) > 0 && (
              <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '13px', color: '#059669' }}>
                <span>Wallet Reward Discount</span>
                <span style={{ fontWeight: '800' }}>-₹{Number(receipt.walletDiscountUsed).toFixed(2)}</span>
              </div>
            )}
            <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '13px', color: '#64748B' }}>
              <span>Toll, Fuel & Chauffeur Charges</span>
              <span style={{ fontWeight: '700', color: '#10B981' }}>Included</span>
            </div>
          </div>

          {/* Total Net Fare */}
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', paddingTop: '4px' }}>
            <span style={{ fontFamily: 'League Spartan, sans-serif', fontSize: '18px', fontWeight: '800', color: '#0F172A' }}>Total Fare Paid</span>
            <span style={{ fontFamily: 'League Spartan, sans-serif', fontSize: '26px', fontWeight: '800', color: '#10B981' }}>₹{fareNum.toFixed(2)}</span>
          </div>
        </div>

        {/* Reward Banner */}
        {hasReward && (
          <div style={{
            background: 'linear-gradient(135deg, #ECFDF5 0%, #D1FAE5 100%)',
            border: '1.5px solid #10B981',
            borderRadius: '20px',
            padding: '14px 16px',
            marginBottom: '20px',
            display: 'flex',
            alignItems: 'center',
            gap: '12px'
          }}>
            <div style={{ width: '40px', height: '40px', borderRadius: '12px', background: '#10B981', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#FFFFFF', flexShrink: 0 }}>
              <Gift size={20} />
            </div>
            <div style={{ flex: 1 }}>
              <h4 style={{ fontFamily: 'League Spartan, sans-serif', fontSize: '16px', fontWeight: '800', color: '#065F46', margin: 0 }}>
                ₹{rewardVal.toFixed(2)} Wallet Credit Added!
              </h4>
              <p style={{ fontFamily: 'Space Grotesk, sans-serif', fontSize: '12px', color: '#047857', margin: 0, fontWeight: '600' }}>
                Credited to your Empire Wallet for next ride.
              </p>
            </div>
          </div>
        )}

        {/* Driver Star Rating */}
        <div style={{ background: '#FFFFFF', border: '1px solid #E2E8F0', borderRadius: '20px', padding: '16px', marginBottom: '20px', textAlign: 'center' }}>
          <div style={{ fontSize: '13px', fontWeight: '800', color: '#0F172A', marginBottom: '10px', fontFamily: 'Space Grotesk' }}>Rate Your Chauffeur Experience</div>
          <div style={{ display: 'flex', justifyContent: 'center', gap: '8px' }}>
            {[1, 2, 3, 4, 5].map((star) => (
              <button
                key={star}
                type="button"
                onClick={() => setDriverRating(star)}
                style={{
                  background: 'none', border: 'none', padding: '4px', cursor: 'pointer',
                  color: star <= driverRating ? '#F59E0B' : '#CBD5E1', transition: 'transform 0.15s ease'
                }}
              >
                <Star size={26} fill={star <= driverRating ? '#F59E0B' : 'transparent'} strokeWidth={1.5} />
              </button>
            ))}
          </div>
        </div>

        {/* Action Buttons: Download Receipt & Done */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
          <button 
            type="button"
            onClick={() => {
              window.print();
            }}
            style={{
              width: '100%',
              padding: '14px',
              borderRadius: '16px',
              background: '#F1F5F9',
              border: '1.5px solid #CBD5E1',
              color: '#0F172A',
              fontFamily: 'League Spartan, sans-serif',
              fontSize: '16px',
              fontWeight: '800',
              cursor: 'pointer',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              gap: '8px'
            }}
          >
            <Receipt size={18} />
            <span>DOWNLOAD E-RECEIPT (PDF)</span>
          </button>

          <button 
            onClick={handleFinish}
            style={{
              width: '100%',
              padding: '16px',
              borderRadius: '16px',
              background: 'linear-gradient(135deg, #6EE7B7 0%, #34D399 100%)',
              color: '#FFFFFF',
              border: 'none',
              fontFamily: 'League Spartan, sans-serif',
              fontSize: '17px',
              fontWeight: '800',
              cursor: 'pointer',
              boxShadow: '0 10px 25px rgba(110, 231, 183, 0.4)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              gap: '8px'
            }}
          >
            <Home size={18} />
            <span>RETURN TO HOME</span>
          </button>
        </div>
      </div>
    </div>
  );
}
