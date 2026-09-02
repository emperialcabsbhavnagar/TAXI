import React from 'react';
import { Link } from 'react-router-dom';
import { Phone, Mail, MapPin, Smartphone } from 'lucide-react';
import logoImg from '../assets/images/logo.svg';
import './Footer.css';

export default function Footer() {
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
              <h4 className="footer-title">Quick Link</h4>
              <ul className="footer-links">
                <li><Link to="/">Home</Link></li>
                <li><Link to="/about">About</Link></li>
                <li><Link to="/services">Services</Link></li>
                <li><Link to="/contact">Contact</Link></li>
              </ul>
            </div>

            {/* Support Links */}
            <div className="footer-col">
              <h4 className="footer-title">Support</h4>
              <ul className="footer-links">
                <li><Link to="/contact">Customer Support</Link></li>
                <li><Link to="/faq">Disclaimer</Link></li>
                <li><Link to="/faq">FAQ</Link></li>
                <li><Link to="/contact">Contact</Link></li>
                <li><Link to="/admin" style={{ color: '#00b87c', fontWeight: 'bold' }}>⚡ Admin Portal</Link></li>
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

