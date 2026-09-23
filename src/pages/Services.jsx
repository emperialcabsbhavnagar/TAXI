import React from 'react';
import { Link } from 'react-router-dom';
import { Plane, Clock, Users, Package, Calendar, Briefcase, ShieldCheck, Wrench, Star } from 'lucide-react';
import { loadAllVehiclesFromMySQL } from '../services/mysqlService';
import './Pages.css';

export default function Services({ onOpenBooking }) {
  const [vehicles, setVehicles] = React.useState(() => {
    try {
      const saved = localStorage.getItem('cabsy_vehicles');
      if (saved) {
        const parsed = JSON.parse(saved);
        if (Array.isArray(parsed) && parsed.length > 0) return parsed;
      }
    } catch (e) {}
    return [
      { id: 1, name: 'Emperial Regular Sedan', rate: '15', passengers: '1 - 4 Passengers • Dzire / Etios', image: '/assets/images/exact_tourist_cab.jpg', description: 'Perfect for quick city commutes, business meetings, and rapid airport transfers.' },
      { id: 2, name: 'Emperial XL SUV', rate: '22', passengers: '1 - 6 Passengers • Ertiga / Innova', image: '/assets/images/steps_tourist_cab.jpg', description: 'Spacious legroom and large boot space for family vacations and group luggage.' },
      { id: 3, name: 'Emperial Executive Luxury', rate: '35', passengers: '1 - 4 Passengers • Camry / Mercedes', image: '/assets/images/yellow_headlight_taxi.png', description: 'Red-carpet VIP mobility designed for corporate executives, delegations, and weddings.' },
      { id: 4, name: 'Emperial Eco Green EV', rate: '18', passengers: '1 - 4 Passengers • Tigor EV / BYD', image: '/assets/images/safety_comfort_spotlight.png', description: 'Zero-emission, whisper-quiet electric cabs for eco-conscious city travel.' }
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
    <div className="page-services">
      {/* PAGE BANNER */}
      <section className="page-banner">
        <div className="container">
          <div className="banner-card">
            <div className="banner-overlay"></div>
            <div className="banner-content">
              <div className="breadcrumb">
                <Link to="/">Home</Link> &gt; <span>Services</span>
              </div>
              <h1 className="banner-title">Experience Convenience & Luxury Across Our Service Offerings</h1>
            </div>
          </div>
        </div>
      </section>

      {/* THE RIGHT VEHICLE FOR YOUR JOURNEY */}
      <section className="section vehicle-fleet-section">
        <div className="container">
          <div className="section-header">
            <h2>The Right Vehicle for Every Journey</h2>
            <p>Select from our curated fleet of luxury sedans, spacious family SUVs, executive EVs, and premium outstation cabs.</p>
          </div>

          <div className="grid-4-cols">
            {vehicles.map((car, idx) => (
              <div key={car.id || idx} className="card fleet-card">
                <div className="fleet-img-wrap">
                  <img src={car.image} alt={car.name} />
                </div>
                <div className="fleet-card-body">
                  <h3>{car.name}</h3>
                  <span className="fleet-cap">{car.passengers || '1 - 4 Passengers'}</span>
                  <p className="small-text" style={{ margin: '0.6rem 0 1rem', color: 'var(--body-text)' }}>
                    {car.description || 'Executive fleet cab vehicle.'}
                  </p>
                  <Link to="/book-ride" className="btn btn-primary fleet-link-btn">Book Now &gt;</Link>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* 6 ULTIMATE SERVICES GRID */}
      <section className="section services-grid-section">
        <div className="container">
          <div className="section-header">
            <h2>The Ultimate Executive Cab Experience Awaits</h2>
            <p>Tailored mobility solutions engineered for reliability, safety, and business-class comfort across India.</p>
          </div>

          <div className="grid-3-cols">
            <div className="card service-card">
              <div className="icon-box"><Plane size={26} /></div>
              <h3>Airport Transfers</h3>
              <p>Guaranteed on-time doorstep pickups and flight delay tracking at all major Indian domestic and international airport terminals.</p>
            </div>

            <div className="card service-card">
              <div className="icon-box"><Clock size={26} /></div>
              <h3>Hourly Local Rentals</h3>
              <p>Flexible 4-hour, 8-hour, or 12-hour local cab rentals with unlimited stops for business meetings, shopping, and city tours.</p>
            </div>

            <div className="card service-card">
              <div className="icon-box"><Users size={26} /></div>
              <h3>Outstation Intercity Tours</h3>
              <p>Comfortable one-way and round-trip intercity cabs with transparent per-kilometer pricing and zero hidden driver charges.</p>
            </div>

            <div className="card service-card">
              <div className="icon-box"><Package size={26} /></div>
              <h3>Package & Express Delivery</h3>
              <p>Fast, trackable, and safe doorstep parcel delivery service for urgent documents and packages across the city.</p>
            </div>

            <div className="card service-card">
              <div className="icon-box"><Calendar size={26} /></div>
              <h3>Scheduled & Pre-Booked Rides</h3>
              <p>Pre-book your cabs days or weeks in advance with guaranteed vehicle assignment and fixed, surge-free fare confirmation.</p>
            </div>

            <div className="card service-card">
              <div className="icon-box"><Briefcase size={26} /></div>
              <h3>Corporate Mobility Accounts</h3>
              <p>Centralized monthly billing, GST-compliant invoicing, priority dispatch, and dedicated account management for corporate enterprises.</p>
            </div>
          </div>
        </div>
      </section>

      {/* SIMPLE STEPS TO BOOK YOUR RIDE */}
      <section className="section section-mint steps-section">
        <div className="container">
          <div className="section-header">
            <h2>Simple Steps to Book Your Ride</h2>
            <p>Reserve your premium cab in under 60 seconds with our seamless booking workflow.</p>
          </div>

          <div className="grid-2-cols align-center">
            <div className="steps-list">
              <div className="step-card active">
                <span className="step-num">1.</span>
                <div>
                  <h4>Select Pickup & Destination</h4>
                  <p>Type your pickup location, airport terminal, or destination address for instant transparent fare calculation.</p>
                </div>
              </div>

              <div className="step-card">
                <span className="step-num">2.</span>
                <div>
                  <h4>Choose Your Preferred Vehicle</h4>
                  <p>Select from Regular Sedan, XL SUV, Executive Luxury, or Green EV based on passenger capacity and comfort preference.</p>
                </div>
              </div>

              <div className="step-card">
                <span className="step-num">3.</span>
                <div>
                  <h4>Select Payment Method</h4>
                  <p>Pay conveniently using UPI, GPay, Paytm, Credit/Debit Cards, or cash directly to your chauffeur upon completion.</p>
                </div>
              </div>

              <div className="step-card">
                <span className="step-num">4.</span>
                <div>
                  <h4>Driver Dispatched & Live Tracking</h4>
                  <p>Receive instant driver details, phone number, vehicle registration plate, and real-time live GPS arrival tracking.</p>
                </div>
              </div>
            </div>

            <div className="steps-graphic text-center">
              <div className="feature-media">
                <img 
                  src="/assets/images/simple_steps_infographic.png" 
                  alt="Emperial Cabs Simple Ride Booking Experience" 
                  className="rounded-img"
                />
              </div>
            </div>
          </div>
        </div>
      </section>
    </div>
  );
}

