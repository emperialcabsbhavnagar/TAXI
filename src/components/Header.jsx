import React, { useState, useEffect } from 'react';
import { Link, useLocation } from 'react-router-dom';
import { ChevronDown, Menu, X, Phone, Car } from 'lucide-react';
import logoSvg from '../assets/images/logo.svg';
import './Header.css';

export default function Header({ onOpenBooking }) {
  const [isScrolled, setIsScrolled] = useState(false);
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const location = useLocation();

  useEffect(() => {
    const handleScroll = () => {
      if (window.scrollY > 20) {
        setIsScrolled(true);
      } else {
        setIsScrolled(false);
      }
    };
    window.addEventListener('scroll', handleScroll);
    return () => window.removeEventListener('scroll', handleScroll);
  }, []);

  // Close menus on route change
  useEffect(() => {
    setMobileMenuOpen(false);
  }, [location]);

  return (
    <header className={`cabsy-header ${isScrolled ? 'scrolled' : ''}`}>
      <div className="container header-container">
        {/* Logo */}
        <Link to="/" className="brand-logo">
          <img 
            src={logoSvg} 
            alt="EMPERIAL CABS" 
            className="brand-logo-img"
          />
        </Link>

        {/* Navigation Menu */}
        <nav className={`main-nav ${mobileMenuOpen ? 'mobile-open' : ''}`}>
          <ul className="nav-list">
            <li className="nav-item">
              <Link 
                to="/" 
                className={`nav-link ${location.pathname === '/' ? 'active' : ''}`}
              >
                Home
              </Link>
            </li>
            
            <li className="nav-item">
              <Link 
                to="/about" 
                className={`nav-link ${location.pathname === '/about' ? 'active' : ''}`}
              >
                About
              </Link>
            </li>

            <li className="nav-item">
              <Link 
                to="/services" 
                className={`nav-link ${location.pathname === '/services' ? 'active' : ''}`}
              >
                Services
              </Link>
            </li>

            <li className="nav-item">
              <Link 
                to="/routes" 
                className={`nav-link ${location.pathname.startsWith('/routes') || location.pathname.startsWith('/taxi/') ? 'active' : ''}`}
              >
                Routes
              </Link>
            </li>

            <li className="nav-item">
              <Link 
                to="/book-ride" 
                className={`nav-link ${location.pathname === '/book-ride' ? 'active' : ''}`}
              >
                Book Ride
              </Link>
            </li>

            <li className="nav-item">
              <Link 
                to="/contact" 
                className={`nav-link ${location.pathname === '/contact' ? 'active' : ''}`}
              >
                Contact
              </Link>
            </li>
          </ul>
        </nav>

        {/* Action Buttons */}
        <div className="header-actions">
          <Link to="/book-ride" className="btn btn-primary header-cta-btn">
            <Car size={18} />
            <span>Book Ride</span>
          </Link>
          
          <button 
            className="mobile-toggle-btn"
            onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
            aria-label="Toggle navigation"
          >
            {mobileMenuOpen ? <X size={26} /> : <Menu size={26} />}
          </button>
        </div>
      </div>
    </header>
  );
}
