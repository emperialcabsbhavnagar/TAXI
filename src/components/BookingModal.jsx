import React, { useState, useEffect } from 'react';
import db from '../services/dbService';
import { INITIAL_VEHICLES } from '../pages/AdminPortal';
import { loadAllVehiclesFromMySQL, getRoutePriceFromMySQL } from '../services/mysqlService';
import { X, MapPin, Navigation, Car, Clock, ShieldCheck, CheckCircle } from 'lucide-react';
import { notifyAdmin } from '../services/notificationEngine';
import './BookingModal.css';

export default function BookingModal({ isOpen, onClose, initialData }) {
  const [pickup, setPickup] = useState('');
  const [dropoff, setDropoff] = useState('');
  const [vehicles, setVehicles] = useState([]);
  const [vehicleId, setVehicleId] = useState('');
  const [submitted, setSubmitted] = useState(false);
  const [matchedRoute, setMatchedRoute] = useState(null);

  const [activeRide, setActiveRide] = useState(null);

  useEffect(() => {
    if (isOpen && initialData) {
      if (initialData.pickup) setPickup(initialData.pickup);
      if (initialData.dropoff) setDropoff(initialData.dropoff);
      if (initialData.vehicleId) setVehicleId(initialData.vehicleId);
    }
  }, [isOpen, initialData]);

  useEffect(() => {
    const checkActiveRide = () => {
      try {
        const savedInquiries = localStorage.getItem('cabsy_inquiries');
        if (savedInquiries) {
          const list = JSON.parse(savedInquiries);
          const ongoing = list.find(i => i.status === 'Confirmed' || i.status === 'In Progress' || i.status === 'On Ride');
          setActiveRide(ongoing || null);
        }
      } catch (e) {}
    };
    checkActiveRide();
    window.addEventListener('storage', checkActiveRide);
    return () => window.removeEventListener('storage', checkActiveRide);
  }, []);

  useEffect(() => {
    const loadVehicles = () => {
      const savedVehicles = localStorage.getItem('cabsy_vehicles');
      const parsedVehicles = savedVehicles ? JSON.parse(savedVehicles) : INITIAL_VEHICLES;
      const activeVehicles = parsedVehicles.filter(v => v.status !== 'Inactive');
      const list = activeVehicles.length > 0 ? activeVehicles : INITIAL_VEHICLES;
      setVehicles(list);
      setVehicleId(prev => list.some(v => v.id === prev) ? prev : list[0]?.id || '');
    };

    loadVehicles();

    loadAllVehiclesFromMySQL().then(fetched => {
      if (Array.isArray(fetched) && fetched.length > 0) {
        const active = fetched.filter(v => v.status !== 'Inactive');
        if (active.length > 0) {
          setVehicles(active);
          setVehicleId(prev => active.some(v => v.id === prev) ? prev : active[0]?.id || '');
          try { localStorage.setItem('cabsy_vehicles', JSON.stringify(fetched)); } catch(e) {}
        }
      }
    }).catch(() => {});

    window.addEventListener('storage', loadVehicles);
    window.addEventListener('EMPERIAL CABS_vehicles_updated', loadVehicles);
    return () => {
      window.removeEventListener('storage', loadVehicles);
      window.removeEventListener('EMPERIAL CABS_vehicles_updated', loadVehicles);
    };
  }, []);

  // Lookup matched route whenever pickup or dropoff changes
  useEffect(() => {
    if (!pickup.trim() || !dropoff.trim()) {
      setMatchedRoute(null);
      return;
    }

    let isCurrent = true;
    const pNorm = pickup.toLowerCase().trim();
    const dNorm = dropoff.toLowerCase().trim();

    // Check localStorage cache first
    try {
      const savedRoutes = localStorage.getItem('cabsy_destinations') || localStorage.getItem('cabsy_routes');
      if (savedRoutes) {
        const parsed = JSON.parse(savedRoutes);
        if (Array.isArray(parsed)) {
          const found = parsed.find(r => {
            if (!r || !r.pickup || !r.dropoff) return false;
            const rp = r.pickup.toLowerCase().trim();
            const rd = r.dropoff.toLowerCase().trim();
            const fwd = (pNorm.includes(rp) || rp.includes(pNorm)) && (dNorm.includes(rd) || rd.includes(dNorm));
            const rev = (pNorm.includes(rd) || rd.includes(pNorm)) && (dNorm.includes(rp) || rp.includes(dNorm));
            return fwd || rev;
          });
          if (found && isCurrent) {
            setMatchedRoute(found);
          }
        }
      }
    } catch (e) {}

    // Live MySQL check
    getRoutePriceFromMySQL(pickup, dropoff).then(liveRoute => {
      if (!isCurrent) return;
      if (liveRoute && (Number(liveRoute.price) > 0 || liveRoute.car_prices)) {
        setMatchedRoute({
          id: liveRoute.id,
          pickup: liveRoute.pickup,
          dropoff: liveRoute.dropoff,
          price: Number(liveRoute.price) || 0,
          duration: liveRoute.duration || '',
          car_prices: liveRoute.car_prices || {}
        });
      }
    }).catch(() => {});

    return () => { isCurrent = false; };
  }, [pickup, dropoff]);

  if (!isOpen) return null;

  const selectedVeh = vehicles.find(v => v.id === vehicleId) || vehicles[0] || INITIAL_VEHICLES[0];
  const ratePerKm = parseFloat(selectedVeh.rate || 15.0);
  const estimatedDist = pickup && dropoff ? (matchedRoute?.distanceKm ? Number(matchedRoute.distanceKm) : 154) : 8.0; // km
  
  let calculatedFare = 0;
  let isFixed = false;

  if (matchedRoute) {
    let directCarPrice = (matchedRoute.car_prices) 
      ? (matchedRoute.car_prices[selectedVeh.id] ?? matchedRoute.car_prices[selectedVeh.name]) 
      : null;

    if (!directCarPrice && matchedRoute.car_prices && typeof matchedRoute.car_prices === 'object') {
      const vNameNorm = (selectedVeh.name || '').toLowerCase().trim();
      const vIdNorm = (selectedVeh.id || '').toLowerCase().trim();
      for (const [key, val] of Object.entries(matchedRoute.car_prices)) {
        const kNorm = key.toLowerCase().trim();
        if (kNorm === vNameNorm || kNorm === vIdNorm) {
          directCarPrice = val;
          break;
        }
      }
    }

    if (directCarPrice !== null && directCarPrice !== undefined && directCarPrice !== '' && !isNaN(Number(directCarPrice)) && Number(directCarPrice) > 0) {
      calculatedFare = Number(directCarPrice);
      isFixed = true;
    } else if (matchedRoute.price && Number(matchedRoute.price) > 0) {
      const isSevenSeater = (selectedVeh.passengers && selectedVeh.passengers.includes('7')) || (selectedVeh.name && (selectedVeh.name.toLowerCase().includes('ertiga') || selectedVeh.name.toLowerCase().includes('innova')));
      const isLuxury = selectedVeh.name && (selectedVeh.name.toLowerCase().includes('innova') || selectedVeh.name.toLowerCase().includes('crysta'));
      const multiplier = isLuxury ? 1.7 : (isSevenSeater ? 1.35 : 1.0);
      calculatedFare = Math.round(Number(matchedRoute.price) * multiplier);
      isFixed = true;
    }
  }

  if (!isFixed) {
    calculatedFare = Math.round(estimatedDist * ratePerKm + 50.0);
  }

  const estimatedFare = calculatedFare.toFixed(2);
  const estimatedTime = matchedRoute?.duration || `${Math.round(estimatedDist * 1.5)} min`;

  const handleSubmit = (e) => {
    e.preventDefault();
    if (activeRide) {
      alert("You already have an active ride in progress. Cannot book a second ride!");
      return;
    }
    const newInq = {
      customerName: 'Web Passenger',
      customerPhone: '+91 98765 00000',
      pickup: pickup || 'Downtown Terminal',
      dropoff: dropoff || 'Airport T3',
      vehicle: selectedVeh.name,
      fare: parseFloat(estimatedFare),
      status: 'Pending',
      driver: 'Unassigned',
      date: new Date().toLocaleString('en-IN')
    };
    db.saveInquiry(newInq);

    // Send Phone/Desktop Push Notification & Bell Notif to Admin
    notifyAdmin({
      type: 'inquiry',
      title: 'New Ride Inquiry Received',
      body: `New booking for ${newInq.customerName}: ${newInq.pickup} -> ${newInq.dropoff} (Rs ${parseFloat(estimatedFare).toFixed(2)})`
    });

    setSubmitted(true);
  };

  const handleReset = () => {
    setSubmitted(false);
    onClose();
  };

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal-content card" onClick={(e) => e.stopPropagation()}>
        <button className="modal-close-btn" onClick={onClose}>
          <X size={20} />
        </button>

        {activeRide ? (
          <div className="text-center p-4">
            <div style={{ fontSize: '48px', marginBottom: '8px' }}>🚗</div>
            <h2>Active Ride In Progress</h2>
            <p style={{ margin: '12px 0', color: '#64748B' }}>
              You currently have an active trip (<strong>{activeRide.pickup} → {activeRide.dropoff}</strong>).
              <br />You cannot book a second ride while your ongoing trip is active!
            </p>
            <div style={{ background: '#F8FAFC', padding: '12px', borderRadius: '12px', border: '1px solid #E2E8F0', margin: '16px 0' }}>
              <strong>Status: <span style={{ color: '#059669' }}>{activeRide.status}</span></strong> • Driver: {activeRide.driver || 'Assigned Driver'}
            </div>
            <button onClick={onClose} className="btn btn-primary">
              Close & View Live Ride Tracking
            </button>
          </div>
        ) : !submitted ? (
          <div>
            <div className="modal-header">
              <span className="pill-badge">
                <span className="dot"></span> Online Booking Studio
              </span>
              <h2>Book Your EMPERIAL CABS Ride</h2>
              <p>Experience safe, reliable, and premium transportation at your fingertips.</p>
            </div>

            <form onSubmit={handleSubmit} className="booking-form">
              {/* Route Input Group */}
              <div className="input-group">
                <label><MapPin size={16} className="text-green" /> Pick-up Location</label>
                <input 
                  type="text" 
                  placeholder="Enter pick-up address or airport terminal..." 
                  value={pickup}
                  onChange={(e) => setPickup(e.target.value)}
                  required
                />
              </div>

              <div className="input-group">
                <label><Navigation size={16} className="text-green" /> Destination Location</label>
                <input 
                  type="text" 
                  placeholder="Enter drop-off destination..." 
                  value={dropoff}
                  onChange={(e) => setDropoff(e.target.value)}
                  required
                />
              </div>

              {/* Vehicle Selection */}
              <div className="vehicle-selector">
                <label><Car size={16} className="text-green" /> Choose Vehicle Class</label>
                <div className="vehicle-grid">
                  {vehicles.map((v) => (
                    <div 
                      key={v.id}
                      className={`vehicle-card ${vehicleId === v.id ? 'selected' : ''}`}
                      onClick={() => setVehicleId(v.id)}
                    >
                      {v.image ? (
                        <img src={v.image} alt={v.name} style={{ width: '40px', height: '28px', objectFit: 'cover', borderRadius: '4px' }} />
                      ) : (
                        <span className="veh-emoji">🚕</span>
                      )}
                      <span className="veh-name">{v.name}</span>
                      <small className="veh-cap">{v.passengers || '4 Seats'}</small>
                    </div>
                  ))}
                </div>
              </div>

              {/* Live Fare Estimation Summary */}
              <div className="fare-estimate-box">
                <div className="fare-detail">
                  <span className="fare-label">Estimated Distance</span>
                  <span className="fare-val">{estimatedDist} km</span>
                </div>
                <div className="fare-detail">
                  <span className="fare-label">Estimated Time</span>
                  <span className="fare-val">{estimatedTime} min</span>
                </div>
                <div className="fare-detail total">
                  <span className="fare-label">Estimated Fare</span>
                  <span className="fare-price">₹{estimatedFare}</span>
                </div>
              </div>

              <button type="submit" className="btn btn-primary btn-block">
                Confirm & Request Ride Now
              </button>
            </form>
          </div>
        ) : (
          <div className="success-modal-state text-center">
            <div className="success-icon-wrap">
              <CheckCircle size={64} className="text-green" />
            </div>
            <h2>Ride Requested Successfully!</h2>
            <p>Your driver is being assigned. Live tracking details have been sent to your mobile phone.</p>
            
            <div className="booking-summary-card">
              <div className="summary-row">
                <span>Vehicle:</span> <strong>{selectedVeh.name}</strong>
              </div>
              <div className="summary-row">
                <span>Est. Fare:</span> <strong>₹{estimatedFare}</strong>
              </div>
              <div className="summary-row">
                <span>ETA:</span> <strong>{estimatedTime} mins</strong>
              </div>
            </div>

            <button onClick={handleReset} className="btn btn-primary">
              Done & Return
            </button>
          </div>
        )}
      </div>
    </div>
  );
}
