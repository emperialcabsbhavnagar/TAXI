import React from 'react';
import { Shield, Lock, Eye, FileText, CheckCircle2 } from 'lucide-react';

export default function PrivacyPolicy() {
  return (
    <div style={{ background: '#F8FAFC', minHeight: '100vh', paddingTop: '40px', paddingBottom: '80px', fontFamily: 'system-ui, -apple-system, sans-serif', color: '#0F172A' }}>
      <div style={{ maxWidth: '900px', margin: '0 auto', padding: '0 20px' }}>
        
        {/* Header Badge */}
        <div style={{ textAlign: 'center', marginBottom: '32px' }}>
          <div style={{ display: 'inline-flex', alignItems: 'center', gap: '8px', background: '#ECFDF5', color: '#059669', padding: '8px 16px', borderRadius: '30px', fontWeight: '600', fontSize: '14px', marginBottom: '16px' }}>
            <Shield size={18} /> EMPERIAL CABS Data Protection Guarantee
          </div>
          <h1 style={{ fontSize: '36px', fontWeight: '800', margin: '0 0 12px 0', letterSpacing: '-0.02em', color: '#0F172A' }}>
            Privacy Policy
          </h1>
          <p style={{ color: '#64748B', fontSize: '16px', margin: 0 }}>
            Last Updated: September 2026 | EMPERIAL CABS Customer & Partner Platform
          </p>
        </div>

        {/* Card */}
        <div style={{ background: '#FFFFFF', borderRadius: '24px', border: '1px solid #E2E8F0', padding: '40px', boxShadow: '0 4px 20px rgba(0,0,0,0.03)' }}>
          
          <section style={{ marginBottom: '32px' }}>
            <h2 style={{ fontSize: '20px', fontWeight: '700', color: '#1E293B', display: 'flex', alignItems: 'center', gap: '10px', marginBottom: '12px' }}>
              <Eye size={22} style={{ color: '#10B981' }} /> 1. Information We Collect
            </h2>
            <p style={{ color: '#475569', lineHeight: '1.7', fontSize: '15px' }}>
              At EMPERIAL CABS, we collect necessary customer details to facilitate fast, reliable cab bookings across Bhavnagar and Gujarat. This includes:
            </p>
            <ul style={{ color: '#475569', lineHeight: '1.8', fontSize: '15px', paddingLeft: '24px' }}>
              <li><strong>Personal Details:</strong> Your name, mobile phone number, and email address for booking confirmations and OTP authentication.</li>
              <li><strong>Location Data:</strong> Device location coordinates (precise or approximate) to determine pickup points, calculate optimal routes, and show real-time driver tracking on the map.</li>
              <li><strong>Ride Details:</strong> Pickup address, destination, ride duration, fare, and payment confirmation status.</li>
            </ul>
          </section>

          <hr style={{ border: 'none', borderTop: '1px solid #F1F5F9', margin: '32px 0' }} />

          <section style={{ marginBottom: '32px' }}>
            <h2 style={{ fontSize: '20px', fontWeight: '700', color: '#1E293B', display: 'flex', alignItems: 'center', gap: '10px', marginBottom: '12px' }}>
              <Lock size={22} style={{ color: '#10B981' }} /> 2. How We Use Your Information
            </h2>
            <p style={{ color: '#475569', lineHeight: '1.7', fontSize: '15px' }}>
              Your data is exclusively used to provide safe and efficient transportation services:
            </p>
            <ul style={{ color: '#475569', lineHeight: '1.8', fontSize: '15px', paddingLeft: '24px' }}>
              <li>Assigning nearby verified drivers for instant or scheduled bookings.</li>
              <li>Providing real-time location updates for live trip tracking.</li>
              <li>Sending ride confirmation SMS and digital invoice receipts.</li>
              <li>Providing 24/7 customer support for trip inquiries or lost items.</li>
            </ul>
          </section>

          <hr style={{ border: 'none', borderTop: '1px solid #F1F5F9', margin: '32px 0' }} />

          <section style={{ marginBottom: '32px' }}>
            <h2 style={{ fontSize: '20px', fontWeight: '700', color: '#1E293B', display: 'flex', alignItems: 'center', gap: '10px', marginBottom: '12px' }}>
              <Shield size={22} style={{ color: '#10B981' }} /> 3. Data Protection & Security
            </h2>
            <p style={{ color: '#475569', lineHeight: '1.7', fontSize: '15px' }}>
              We implement industry-standard SSL encryption and secure database controls to safeguard your data. We strictly **DO NOT sell or rent customer personal information** to any third party advertisers.
            </p>
          </section>

          <hr style={{ border: 'none', borderTop: '1px solid #F1F5F9', margin: '32px 0' }} />

          <section style={{ marginBottom: '32px' }}>
            <h2 style={{ fontSize: '20px', fontWeight: '700', color: '#1E293B', display: 'flex', alignItems: 'center', gap: '10px', marginBottom: '12px' }}>
              <FileText size={22} style={{ color: '#10B981' }} /> 4. Contact Us
            </h2>
            <p style={{ color: '#475569', lineHeight: '1.7', fontSize: '15px' }}>
              If you have any questions regarding our Privacy Policy or data handling practices, please contact us at:
            </p>
            <div style={{ background: '#F8FAFC', padding: '16px 20px', borderRadius: '12px', color: '#334155', fontSize: '15px', marginTop: '12px' }}>
              <p style={{ margin: '0 0 6px 0' }}><strong>EMPERIAL CABS Customer Care</strong></p>
              <p style={{ margin: '0 0 6px 0' }}>📍 Bhavnagar, Gujarat, India</p>
              <p style={{ margin: '0 0 6px 0' }}>📞 Customer Helpline: +91 99799 97063 / +91 98984 89270</p>
              <p style={{ margin: 0 }}>✉️ Email: info@emperialcabs.com</p>
            </div>
          </section>

        </div>
      </div>
    </div>
  );
}
