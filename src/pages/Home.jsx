import React from 'react';
import { Link } from 'react-router-dom';
import { CheckCircle2, ShieldCheck, Wrench, ArrowRight, Star, MapPin, Navigation, Smartphone, Clock, Users, Package, Calendar, Briefcase, Plane } from 'lucide-react';
import { loadAllVehiclesFromMySQL } from '../services/mysqlService';
import './Pages.css';

export default function Home({ onOpenBooking }) {
  const [vehicles, setVehicles] = React.useState(() => {
    try {
      const saved = localStorage.getItem('cabsy_vehicles');
      if (saved) {
        const parsed = JSON.parse(saved);
        if (Array.isArray(parsed) && parsed.length > 0) return parsed;
      }
    } catch (e) {}
    return [
      { id: 1, name: 'Empire Regular', rate: '15', passengers: '1 - 4 Passenger', image: 'https://images.unsplash.com/photo-1549399542-7e3f8b79c341?w=600&auto=format&fit=crop&q=80' },
      { id: 2, name: 'Empire XL', rate: '22', passengers: '1 - 6 Passenger', image: 'https://images.unsplash.com/photo-1533473359331-0135ef1b58bf?w=600&auto=format&fit=crop&q=80' },
      { id: 3, name: 'Empire Luxury', rate: '35', passengers: '1 - 4 Passenger', image: 'https://images.unsplash.com/photo-1555215695-3004980ad54e?w=600&auto=format&fit=crop&q=80' },
      { id: 4, name: 'Empire Electric', rate: '18', passengers: '1 - 4 Passenger', image: 'https://images.unsplash.com/photo-1563720223185-11003d516935?w=600&auto=format&fit=crop&q=80' },
    ];
  });

  React.useEffect(() => {
    const syncVehicles = () => {
      try {
        const saved = localStorage.getItem('cabsy_vehicles');
        if (saved) {
          const parsed = JSON.parse(saved);
          if (Array.isArray(parsed) && parsed.length > 0) setVehicles(parsed);
        }
      } catch (e) {}
    };

    loadAllVehiclesFromMySQL().then(fetched => {
      if (Array.isArray(fetched) && fetched.length > 0) {
        setVehicles(fetched);
        try { localStorage.setItem('cabsy_vehicles', JSON.stringify(fetched)); } catch(e) {}
      }
    }).catch(() => {});

    window.addEventListener('storage', syncVehicles);
    window.addEventListener('EMPERIAL CABS_vehicles_updated', syncVehicles);

    let bc;
    try {
      if ('BroadcastChannel' in window) {
        bc = new BroadcastChannel('EMPERIAL CABS_realtime_sync');
        bc.onmessage = (event) => {
          if (event.data && event.data.type === 'VEHICLES_UPDATED') {
            syncVehicles();
          }
        };
      }
    } catch (e) {}

    return () => {
      window.removeEventListener('storage', syncVehicles);
      window.removeEventListener('EMPERIAL CABS_vehicles_updated', syncVehicles);
      if (bc) bc.close();
    };
  }, []);

  return (
    <div className="page-home">
      {/* HERO SECTION */}
      <section className="hero-section">
        <div className="container">
          <div className="hero-card">
            <div className="hero-overlay"></div>
            <div className="hero-content">
              <div className="pill-badge dark-badge">
                <span className="dot"></span> The Perfect Ride Awaits
              </div>
              <h1 className="hero-title">
                Get Where You Need to Go, Safely and Affordably
              </h1>
              <p className="hero-subtitle">
                Experience seamless, reliable, and comfortable intercity &amp; local cab rides with verified professional drivers, upfront transparent pricing, and 24/7 customer support.
              </p>

              <div className="hero-cta-group">
                <Link to="/book-ride" className="btn btn-primary">
                  Book Your Ride
                </Link>
                <Link to="/about" className="btn btn-outline-white">
                  Learn More
                </Link>
              </div>
            </div>

            {/* Hero Smartphone Graphics (Apple iPhone 15 Pro iOS Style) */}
            <div className="hero-graphic-wrap animate-float">
              <div className="ios-phone-frame">
                <div className="ios-screen">
                  {/* Dynamic Island Header */}
                  <div className="ios-status-bar">
                    <span className="ios-time">9:41</span>
                    <div className="dynamic-island">
                      <div className="island-dot"></div>
                      <div className="island-camera"></div>
                    </div>
                    <div className="ios-icons">
                      <span>📶</span>
                      <span>5G</span>
                      <span className="battery-icon">🔋</span>
                    </div>
                  </div>

                  {/* App Top Glass Header */}
                  <div className="ios-app-header">
                    <div className="ios-brand-badge">
                      <span className="brand-dot"></span> EMPERIAL CABS
                    </div>
                    <div className="ios-profile-avatar">
                      <span className="user-avatar">RK</span>
                    </div>
                  </div>

                  {/* Floating Glass Route Input Box */}
                  <div className="ios-route-box">
                    <div className="route-pins-col">
                      <span className="pin-pickup"></span>
                      <span className="pin-dash-line"></span>
                      <span className="pin-dropoff"></span>
                    </div>
                    <div className="route-inputs-col">
                      <div className="input-row">
                        <small>PICKUP</small>
                        <span>Bhavnagar City Center</span>
                      </div>
                      <div className="input-divider"></div>
                      <div className="input-row">
                        <small>DESTINATION</small>
                        <span>Ahmedabad Int. Airport (AMD)</span>
                      </div>
                    </div>
                  </div>

                  {/* Interactive Map Section - Bhavnagar to Ahmedabad Route */}
                  <div className="ios-map-container">
                    <svg viewBox="0 0 280 140" className="ios-map-svg">
                      <defs>
                        <linearGradient id="bhavnagarAhmRoute" x1="0%" y1="100%" x2="100%" y2="0%">
                          <stop offset="0%" stopColor="#10B981" />
                          <stop offset="50%" stopColor="#FDC511" />
                          <stop offset="100%" stopColor="#EF4444" />
                        </linearGradient>
                      </defs>
                      {/* Map Land Background */}
                      <rect width="280" height="140" fill="#F1F5F9" />
                      {/* Gulf of Khambhat Water Silhouette */}
                      <path d="M 0 140 Q 120 130, 280 140 Z" fill="#E2E8F0" />
                      {/* Highway Road Network */}
                      <path d="M 20 140 L 70 0 M 180 140 L 250 0 M 0 60 L 280 75" stroke="#FFFFFF" strokeWidth="6" fill="none" />
                      <path d="M 35 115 C 80 115, 95 35, 235 30" stroke="url(#bhavnagarAhmRoute)" strokeWidth="6" strokeLinecap="round" strokeDasharray="8 4" fill="none" />
                      
                      {/* City Markers & Labels */}
                      {/* Bhavnagar Pin (Pickup) */}
                      <circle cx="35" cy="115" r="7" fill="#10B981" stroke="#FFFFFF" strokeWidth="2.5" />
                      <text x="48" y="119" fill="#0F172A" fontSize="9.5" fontWeight="800">BHAVNAGAR</text>

                      {/* Dholera Highway Tag */}
                      <rect x="110" y="55" width="60" height="15" rx="4" fill="#0F172A" opacity="0.85" />
                      <text x="140" y="66" fill="#FDC511" fontSize="7.5" fontWeight="700" textAnchor="middle">NH 751 EXP</text>

                      {/* Ahmedabad Pin (Destination) */}
                      <circle cx="235" cy="30" r="7" fill="#EF4444" stroke="#FFFFFF" strokeWidth="2.5" />
                      <text x="175" y="24" fill="#0F172A" fontSize="9.5" fontWeight="800">AHMEDABAD</text>

                      {/* Live Moving Taxi Marker */}
                      <g className="anim-taxi-marker" transform="translate(125, 38)">
                        <rect x="0" y="0" width="26" height="15" rx="3.5" fill="#FDC511" stroke="#0F172A" strokeWidth="1.5" />
                        <rect x="6" y="2" width="6" height="11" rx="1" fill="#0F172A" />
                        <circle cx="6" cy="15" r="2" fill="#0F172A" />
                        <circle cx="20" cy="15" r="2" fill="#0F172A" />
                      </g>
                    </svg>

                    {/* Live Trip Summary Chip */}
                    <div className="ios-live-chip">
                      <span className="live-pulse"></span>
                      <span>Via Dholera Exp. • 3 hr 15 min (172.5 km)</span>
                    </div>
                  </div>

                  {/* iOS Fleet Selector Drawer (TIME & DISTANCE ONLY - NO RATES) */}
                  <div className="ios-fleet-selector">
                    <div className="fleet-item active">
                      <div className="fleet-item-info">
                        <span className="car-name">Empire Sedan</span>
                        <small>Swift Dzire / Etios • 4 Seats</small>
                      </div>
                      <div className="fleet-item-time-dist">
                        <span className="trip-time">3 hr 15 min</span>
                        <small className="trip-dist">172.5 km</small>
                      </div>
                    </div>
                    <div className="fleet-item">
                      <div className="fleet-item-info">
                        <span className="car-name">Empire SUV</span>
                        <small>Ertiga / Innova • 6 Seats</small>
                      </div>
                      <div className="fleet-item-time-dist">
                        <span className="trip-time">3 hr 10 min</span>
                        <small className="trip-dist">172.5 km</small>
                      </div>
                    </div>
                  </div>

                  {/* Apple-style Swipe / Book Ride Button */}
                  <div className="ios-bottom-bar">
                    <button className="ios-book-btn">
                      <span>BOOK RIDE • 3 HR 15 MIN</span>
                      <span className="btn-arrow">→</span>
                    </button>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* FLEET CARDS SECTION */}
      <section className="section fleet-section">
        <div className="container">
          <div className="section-header">
            <h2>Explore Our Executive Car Fleet</h2>
            <p>Choose from our diverse range of regular sedans, spacious family SUVs, executive luxury cars, and eco-friendly electric cabs.</p>
          </div>

          <div className="grid-4-cols">
            {vehicles.map((car, idx) => (
              <div key={car.id || idx} className="card fleet-card">
                <h3>{car.name}</h3>
                <div style={{ background: '#DCFCE7', color: '#166534', padding: '2px 8px', borderRadius: '12px', fontSize: '12px', fontWeight: 'bold', display: 'inline-block', marginBottom: '4px' }}>
                  ₹{car.rate} / km
                </div>
                <p className="fleet-cap">{car.passengers || '1 - 4 Passenger'}</p>
                <Link to="/services" className="fleet-link">Learn More &gt;</Link>
                <div className="fleet-img-wrap">
                  <img src={car.image} alt={car.name} className="fleet-car-img" />
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* FEATURE SECTION 1 */}
      <section className="section feature-section">
        <div className="container">
          <div className="grid-2-cols align-center">
            <div className="feature-text">
              <h2>Make your travel experience as easy and stress-free as possible</h2>
              <p className="section-desc">
                Whether traveling for business or leisure, our modern fleet and experienced drivers guarantee a smooth, comfortable, and timely journey every single time.
              </p>

              <div className="grid-2-cols checklist-grid">
                <div className="check-item">
                  <CheckCircle2 size={20} className="check-icon" />
                  <span>Easy-to-use booking platform</span>
                </div>
                <div className="check-item">
                  <CheckCircle2 size={20} className="check-icon" />
                  <span>Clear and transparent prices</span>
                </div>
                <div className="check-item">
                  <CheckCircle2 size={20} className="check-icon" />
                  <span>Professional Verified Drivers</span>
                </div>
                <div className="check-item">
                  <CheckCircle2 size={20} className="check-icon" />
                  <span>Diverse vehicles for your needs</span>
                </div>
              </div>
            </div>

            <div className="feature-media">
              <div className="feature-image-container">
                <img 
                  src="/assets/images/stress_free_travel_cab.png" 
                  alt="Seamless & Stress-free Cab Journey" 
                  className="rounded-img stress-free-img"
                />
                <div className="dashed-trail-decorator"></div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* FEATURE SECTION 2 - SAFETY */}
      <section className="section safety-section">
        <div className="container">
          <div className="grid-2-cols align-center">
            <div className="feature-media">
              <img 
                src="/assets/images/safety_comfort_spotlight.png" 
                alt="Putting Your Safety & Comfort in The Spotlight" 
                className="rounded-img"
              />
            </div>

            <div className="feature-text">
              <h2>Putting Your Safety &amp; Comfort in The Spotlight</h2>
              <p className="section-desc">
                Every vehicle in the Emperial Cabs fleet undergoes rigorous multi-point safety checks and daily sanitization routines. Our background-verified professional chauffeurs are dedicated to delivering a secure, punctual, and premium travel experience.
              </p>

              <div className="safety-cards-grid">
                <div className="safety-item">
                  <div className="icon-box">
                    <ShieldCheck size={26} />
                  </div>
                  <div>
                    <h4>Safety Measures</h4>
                    <p className="small-text">Verified drivers, live GPS trip tracking, and 24/7 emergency support.</p>
                  </div>
                </div>

                <div className="safety-item">
                  <div className="icon-box">
                    <Wrench size={26} />
                  </div>
                  <div>
                    <h4>Well-Maintained Vehicles</h4>
                    <p className="small-text">Clean, climate-controlled interiors with regular certified servicing.</p>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* SIMPLE STEPS SECTION */}
      <section className="section section-mint steps-section">
        <div className="container">
          <div className="steps-grid-wrap" style={{ display: 'grid', gridTemplateColumns: '1fr 1.25fr', gap: '2.25rem', alignItems: 'center' }}>
            <div className="feature-text">
              <h2>Simple Steps to Book Your Ride</h2>
              <p className="section-desc">
                Book your hassle-free trip in less than 60 seconds with our intuitive reservation system.
              </p>

              <div className="steps-list" style={{ marginTop: '1.5rem' }}>
                <div className="step-card active">
                  <span className="step-num">1.</span>
                  <div>
                    <h4>Type Your Destination</h4>
                    <p>Enter your pickup address and destination to instantly view transparent route fares.</p>
                  </div>
                </div>

                <div className="step-card">
                  <span className="step-num">2.</span>
                  <div>
                    <h4>Confirm Pick-up Location</h4>
                    <p>Pinpoint your exact pickup location for fast, accurate driver matching and arrival.</p>
                  </div>
                </div>

                <div className="step-card">
                  <span className="step-num">3.</span>
                  <div>
                    <h4>Choose Payment Method</h4>
                    <p>Select your preferred payment mode: Cash, Cards, UPI, or corporate billing.</p>
                  </div>
                </div>

                <div className="step-card">
                  <span className="step-num">4.</span>
                  <div>
                    <h4>Driver On The Way To Pick-up</h4>
                    <p>Track your driver in real-time as they navigate directly to your location.</p>
                  </div>
                </div>
              </div>
            </div>

            <div className="feature-media">
              <img 
                src="/assets/images/simple_steps_infographic.png" 
                alt="Simple Steps to Book Your Ride - Mobile App Process" 
                className="rounded-img"
                style={{ 
                  width: '100%', 
                  height: '100%', 
                  maxHeight: '710px', 
                  objectFit: 'contain', 
                  background: '#FFFFFF', 
                  padding: '1rem',
                  borderRadius: '24px',
                  boxShadow: '0 12px 30px rgba(15, 23, 42, 0.08)'
                }}
              />
            </div>
          </div>
        </div>
      </section>

      {/* 6-SERVICES GRID SECTION */}
      <section className="section services-section">
        <div className="container">
          <div className="section-header">
            <h2>The Ultimate Taxi Service Experience Awaits</h2>
            <p>Discover tailored transportation solutions designed for business, personal, and intercity travel.</p>
          </div>

          <div className="grid-3-cols">
            <div className="card service-card">
              <div className="icon-box">
                <Plane size={26} />
              </div>
              <h3>Airport Transfers</h3>
              <p>On-time airport pickups and drop-offs with flight tracking and free wait time.</p>
            </div>

            <div className="card service-card">
              <div className="icon-box">
                <Clock size={26} />
              </div>
              <h3>Hourly Rentals</h3>
              <p>Flexible cab rentals with a dedicated chauffeur for full-day or half-day city errands.</p>
            </div>

            <div className="card service-card">
              <div className="icon-box">
                <Users size={26} />
              </div>
              <h3>Ride-Sharing</h3>
              <p>Affordable shared rides for budget-friendly intercity and local travel routes.</p>
            </div>

            <div className="card service-card">
              <div className="icon-box">
                <Package size={26} />
              </div>
              <h3>Package Delivery</h3>
              <p>Fast and secure doorstep parcel delivery service across city locations.</p>
            </div>

            <div className="card service-card">
              <div className="icon-box">
                <Calendar size={26} />
              </div>
              <h3>Scheduled Rides</h3>
              <p>Pre-book your cab days or weeks in advance with guaranteed vehicle availability.</p>
            </div>

            <div className="card service-card">
              <div className="icon-box">
                <Briefcase size={26} />
              </div>
              <h3>Corporate Accounts</h3>
              <p>Seamless business travel solutions with centralized invoicing and priority dispatch.</p>
            </div>
          </div>
        </div>
      </section>

      {/* DOWNLOAD APP CTA BANNER */}
      <section className="section download-banner-section">
        <div className="container">
          <div className="download-card">
            <div className="download-content">
              <h2>The Easiest Way to Book Your Ride Download Our App for Instant Access</h2>
              <p>Get the Emperial Cabs app today for instant one-tap bookings, live GPS tracking, and exclusive discounts.</p>

              <div className="store-badges dark-badges">
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

            <div className="download-image-wrap">
              <img 
                src="/assets/images/app_download_phone.png" 
                alt="Emperial Cabs Mobile Booking Experience" 
                className="cta-person-img"
                style={{ borderRadius: '24px', boxShadow: '0 20px 40px rgba(0,0,0,0.15)' }}
              />
            </div>
          </div>
        </div>
      </section>




    </div>
  );
}
