import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { Phone, Mail, MapPin, Smartphone } from 'lucide-react';
import logoImg from '../assets/images/logo.svg';
import { loadAllRoutesFromMySQL } from '../services/mysqlService';
import { slugify } from '../data/seoKeywordsData';
import './Footer.css';

export default function Footer() {
  const [popularRoutes, setPopularRoutes] = useState(() => {
    try {
      const saved = localStorage.getItem('cabsy_destinations') || localStorage.getItem('cabsy_routes');
      if (saved) {
        const parsed = JSON.parse(saved);
        if (Array.isArray(parsed)) {
          const valid = parsed.filter(r => r && r.pickup && r.dropoff);
          if (valid.length > 0) return valid.slice(0, 6);
        }
      }
    } catch (e) {}
    return [];
  });

  useEffect(() => {
    const loadRoutes = () => {
      try {
        const saved = localStorage.getItem('cabsy_destinations') || localStorage.getItem('cabsy_routes');
        if (saved) {
          const parsed = JSON.parse(saved);
          if (Array.isArray(parsed)) {
            const valid = parsed.filter(r => r && r.pickup && r.dropoff);
            if (valid.length > 0) {
              setPopularRoutes(valid.slice(0, 6));
            }
          }
        }
      } catch (e) {}

      loadAllRoutesFromMySQL().then(fetched => {
        if (Array.isArray(fetched) && fetched.length > 0) {
          const valid = fetched.filter(r => r && r.pickup && r.dropoff);
          if (valid.length > 0) {
            setPopularRoutes(valid.slice(0, 6));
          }
        }
      }).catch(() => {});
    };

    loadRoutes();

    window.addEventListener('storage', loadRoutes);
    window.addEventListener('EMPERIAL CABS_destinations_updated', loadRoutes);
    return () => {
      window.removeEventListener('storage', loadRoutes);
      window.removeEventListener('EMPERIAL CABS_destinations_updated', loadRoutes);
    };
  }, []);

  return (
    <footer className="cabsy-footer">
      <div className="container">
        <div className="footer-box">
          <div className="footer-grid">
            {/* Brand Column */}
            <div className="footer-brand">
              <Link to="/" className="brand-logo footer-logo" style={{ display: 'inline-flex', alignItems: 'center', textDecoration: 'none' }}>
                <img 
                  src={logoImg} 
                  alt="EMPERIAL CABS" 
                  style={{ height: '56px', width: 'auto', display: 'block', objectFit: 'contain' }}
                />
              </Link>
              <p className="footer-desc">
                India's premier executive cab service delivering safe, reliable, and luxury mobility solutions 24/7.
              </p>
            </div>

            {/* Quick Links */}
            <div className="footer-col">
              <h4 className="footer-title">Quick Links</h4>
              <ul className="footer-links">
                <li><Link to="/">Home</Link></li>
                <li><Link to="/about">About Us</Link></li>
                <li><Link to="/services">Fleet & Rates</Link></li>
                <li><Link to="/routes">All Gujarat Routes</Link></li>
                <li><Link to="/contact">Contact Support</Link></li>
              </ul>
            </div>

            {/* Popular Gujarat Routes - Dynamically generated from Admin routes */}
            <div className="footer-col">
              <h4 className="footer-title">Popular Routes</h4>
              <ul className="footer-links">
                {popularRoutes.length > 0 ? (
                  popularRoutes.map((r, idx) => {
                    const slug = `${slugify(r.pickup)}-to-${slugify(r.dropoff)}`;
                    return (
                      <li key={r.id || idx}>
                        <Link to={`/taxi/${slug}`}>{r.pickup} to {r.dropoff}</Link>
                      </li>
                    );
                  })
                ) : (
                  <>
                    <li><Link to="/taxi/bhavnagar-to-ahmedabad">Bhavnagar to Ahmedabad</Link></li>
                    <li><Link to="/taxi/bhavnagar-to-vadodara">Bhavnagar to Vadodara</Link></li>
                    <li><Link to="/taxi/bhavnagar-to-surat">Bhavnagar to Surat</Link></li>
                    <li><Link to="/taxi/bhavnagar-to-rajkot">Bhavnagar to Rajkot</Link></li>
                    <li><Link to="/taxi/ahmedabad-to-bhavnagar">Ahmedabad to Bhavnagar</Link></li>
                  </>
                )}
                <li><Link to="/routes" style={{ color: '#10B981', fontWeight: '700' }}>View All Routes &rarr;</Link></li>
              </ul>
            </div>

            {/* Support Links */}
            <div className="footer-col">
              <h4 className="footer-title">Support</h4>
              <ul className="footer-links">
                <li><Link to="/faq">Frequently Asked Questions</Link></li>
                <li><Link to="/contact">24/7 Helpline</Link></li>
                <li><Link to="/privacy">Privacy & Terms</Link></li>
                <li><Link to="/admin" style={{ color: '#10B981', fontWeight: 'bold' }}>Admin Portal</Link></li>
              </ul>
            </div>

            {/* Our Office */}
            <div className="footer-col">
              <h4 className="footer-title">Our Office</h4>
              <p className="office-text">
                Emperial Cabs Hub, Outer Ring Road,<br />
                Connaught Place, New Delhi 110001, India
              </p>
              
              <h4 className="footer-title contact-title">Contact</h4>
              <p className="contact-item">
                <Phone size={16} className="contact-icon" />
                <span>+91 98765 43210</span>
              </p>
              <p className="contact-item">
                <Mail size={16} className="contact-icon" />
                <span>support@emperialcabs.com</span>
              </p>
            </div>
          </div>

          {/* Bottom Bar */}
          <div className="footer-bottom">
            <div className="footer-legal">
              <Link to="/privacy">Privacy Policy</Link>
              <span className="separator">|</span>
              <Link to="/terms">Terms & Conditions</Link>
            </div>

            <div className="store-badges">
              <a href="#download" className="store-badge google-play">
                <div className="badge-icon">▶</div>
                <div className="badge-text">
                  <small>GET IT ON</small>
                  <span>Google Play</span>
                </div>
              </a>

              <a href="#download" className="store-badge app-store">
                <div className="badge-icon"></div>
                <div className="badge-text">
                  <small>Download on the</small>
                  <span>App Store</span>
                </div>
              </a>
            </div>
          </div>
        </div>

        <div className="footer-copyright">
          <p>© {new Date().getFullYear()} Emperial Cabs. All Rights Reserved.</p>
        </div>
      </div>
    </footer>
  );
}

