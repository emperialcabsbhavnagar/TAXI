import React, { useState, useEffect } from 'react';
import db from '../services/dbService';
import { 
  MapPin, 
  Car, 
  Calendar, 
  Clock, 
  User, 
  Phone, 
  CheckCircle2, 
  ArrowRightLeft, 
  ShieldCheck, 
  ChevronRight,
  Sparkles
} from 'lucide-react';
import { INITIAL_VEHICLES, INITIAL_PLACES, INITIAL_DESTINATIONS } from './AdminPortal';
import './Pages.css';

const FALLBACK_VEHICLES = [
  { id: 'V-1', name: 'Emperial Regular Sedan', rate: 15, passengers: '1-4 Passengers', status: 'Active', image: '/assets/images/exact_tourist_cab.jpg' },
  { id: 'V-2', name: 'Emperial XL SUV', rate: 22, passengers: '1-6 Passengers', status: 'Active', image: '/assets/images/steps_tourist_cab_hd.png' },
  { id: 'V-3', name: 'Emperial Executive Luxury', rate: 45, passengers: '1-4 Passengers', status: 'Active', image: '/assets/images/yellow_headlight_taxi.png' },
  { id: 'V-4', name: 'Emperial Eco Green EV', rate: 18, passengers: '1-4 Passengers', status: 'Active', image: '/assets/images/safety_comfort_spotlight.png' }
];

export default function BookRide() {
  const [places, setPlaces] = useState([]);
  const [destinations, setDestinations] = useState([]);
  const [vehicles, setVehicles] = useState([]);
  
  // Trip Type State: 'one-way' (Point to Point) | 'round-trip' | 'custom-trip'
  const [tripType, setTripType] = useState('one-way');
  const [noOfDays, setNoOfDays] = useState(1);
  const [returnDate, setReturnDate] = useState('');

  const [pickupLocation, setPickupLocation] = useState('');
  const [dropoffDestination, setDropoffDestination] = useState('');
  const [distanceKm, setDistanceKm] = useState(18);
  const [isMatchedRoute, setIsMatchedRoute] = useState(false);
  
  const [selectedVehicleId, setSelectedVehicleId] = useState('');
  
  const [customerName, setCustomerName] = useState('');
  const [customerPhone, setCustomerPhone] = useState('');
  const [pickupDate, setPickupDate] = useState(new Date().toISOString().split('T')[0]);
  const [pickupTime, setPickupTime] = useState('10:00');

  const [bookingSuccess, setBookingSuccess] = useState(null);

  // Load places, destinations, and vehicles from Admin Portal storage
  useEffect(() => {
    const loadDynamicData = () => {
      const savedPlaces = localStorage.getItem('cabsy_places');
      const parsedPlaces = savedPlaces ? JSON.parse(savedPlaces) : INITIAL_PLACES;
      
      const savedDest = localStorage.getItem('cabsy_destinations');
      const parsedDest = savedDest ? JSON.parse(savedDest) : INITIAL_DESTINATIONS;
      setDestinations(parsedDest);

      const combinedPlaces = Array.from(new Set([
        ...(Array.isArray(parsedPlaces) ? parsedPlaces : []),
        ...(Array.isArray(parsedDest) ? parsedDest.flatMap(d => [d.pickup, d.dropoff]) : []),
        ...INITIAL_PLACES
      ].filter(Boolean)));

      setPlaces(combinedPlaces);
      
      const initialFrom = combinedPlaces[0] || 'Bhavnagar, Gujarat';
      const initialTo = combinedPlaces[1] || combinedPlaces[0] || 'Ahmedabad Airport (AMD)';
      setPickupLocation(prev => prev || initialFrom);
      setDropoffDestination(prev => prev || initialTo);

      const savedVehicles = localStorage.getItem('cabsy_vehicles');
      const parsedVehicles = savedVehicles ? JSON.parse(savedVehicles) : (INITIAL_VEHICLES || FALLBACK_VEHICLES);
      const activeVehicles = parsedVehicles.filter(v => v.status !== 'Inactive');
      const finalVehicles = activeVehicles.length > 0 ? activeVehicles : FALLBACK_VEHICLES;
      setVehicles(finalVehicles);
      
      setSelectedVehicleId(prev => {
        if (finalVehicles.some(v => v.id === prev)) return prev;
        return finalVehicles[0]?.id || FALLBACK_VEHICLES[0].id;
      });
    };

    loadDynamicData();

    const handleStorageChange = () => {
      loadDynamicData();
    };

    window.addEventListener('storage', handleStorageChange);
    window.addEventListener('taxigo_vehicles_updated', handleStorageChange);
    window.addEventListener('EMPERIAL CABS_vehicles_updated', handleStorageChange);
    window.addEventListener('EMPERIAL CABS_places_updated', handleStorageChange);
    window.addEventListener('EMPERIAL CABS_destinations_updated', handleStorageChange);
    return () => {
      window.removeEventListener('storage', handleStorageChange);
      window.removeEventListener('taxigo_vehicles_updated', handleStorageChange);
      window.removeEventListener('EMPERIAL CABS_vehicles_updated', handleStorageChange);
      window.removeEventListener('EMPERIAL CABS_places_updated', handleStorageChange);
      window.removeEventListener('EMPERIAL CABS_destinations_updated', handleStorageChange);
    };
  }, []);

  // Update KM whenever Pickup or Dropoff changes
  useEffect(() => {
    if (!pickupLocation || !dropoffDestination) return;

    if (pickupLocation === dropoffDestination) {
      setDistanceKm(0);
      setIsMatchedRoute(true);
      return;
    }

    const matched = destinations.find(
      d => (d.pickup === pickupLocation && d.dropoff === dropoffDestination) ||
           (d.pickup === dropoffDestination && d.dropoff === pickupLocation)
    );

    if (matched) {
      setDistanceKm(Number(matched.distanceKm));
      setIsMatchedRoute(true);
    } else {
      setDistanceKm(15);
      setIsMatchedRoute(false);
    }
  }, [pickupLocation, dropoffDestination, destinations]);

  // Swap pickup & dropoff
  const handleSwapPlaces = () => {
    const temp = pickupLocation;
    setPickupLocation(dropoffDestination);
    setDropoffDestination(temp);
  };

  const currentVehicle = vehicles.find(v => v.id === selectedVehicleId) || vehicles[0] || FALLBACK_VEHICLES[0];
  const ratePerKm = parseFloat(currentVehicle?.rate || 15);

  // Calculate effective distance & fare based on trip type
  const effectiveDistanceKm = tripType === 'round-trip' 
    ? distanceKm * 2 
    : (tripType === 'custom-trip' ? Math.max(distanceKm, 300 * noOfDays) : distanceKm);

  const calculatedFare = (effectiveDistanceKm * ratePerKm).toFixed(2);

  const handleSubmitBooking = (e) => {
    e.preventDefault();
    if (!customerName || !customerPhone) {
      alert("Please enter your name and phone number to complete booking.");
      return;
    }

    if (pickupLocation === dropoffDestination) {
      alert("Pick-up location and drop-off destination cannot be the same!");
      return;
    }

    const newInquiryId = `INQ-${Math.floor(1000 + Math.random() * 9000)}`;
    const tripTypeLabel = tripType === 'custom-trip' ? 'Custom Outstation' : (tripType === 'round-trip' ? 'Round Trip (Return)' : 'Point to Point (One-Way)');
    const newInquiry = {
      id: newInquiryId,
      customerName,
      customerPhone,
      pickup: pickupLocation,
      dropoff: dropoffDestination,
      vehicle: currentVehicle.name,
      fare: parseFloat(calculatedFare),
      tripType: tripTypeLabel,
      isCustom: tripType === 'custom-trip',
      noOfDays: tripType === 'custom-trip' ? noOfDays : 1,
      totalDistanceKm: effectiveDistanceKm,
      status: 'Pending',
      driver: 'Unassigned',
      date: `${pickupDate} ${pickupTime}` + (tripType === 'round-trip' && returnDate ? ` (Return: ${returnDate})` : '')
    };

    db.saveInquiry(newInquiry);
    setBookingSuccess(newInquiry);
  };

  return (
    <div className="light-booking-container">
      <div className="light-booking-wrapper">
        
        {/* LIGHT PAGE HEADER */}
        <div className="light-booking-header text-center">
          <h2>Book Your Taxi Ride</h2>
          <p>Choose your pick-up location, drop-off destination, and vehicle class to estimate your fare.</p>
        </div>

        {bookingSuccess ? (
          /* LIGHT SUCCESS CONFIRMATION BOX */
          <div className="light-success-card">
            <div className="success-icon-badge">
              <CheckCircle2 size={54} />
            </div>
            <h3>Booking Confirmed!</h3>
            <p className="subtitle">Your booking request reference is <strong>{bookingSuccess.id}</strong>.</p>

            <div className="success-details-list">
              <div className="detail-item">
                <span>Passenger Name:</span>
                <strong>{bookingSuccess.customerName}</strong>
              </div>
              <div className="detail-item">
                <span>Pick-up Location:</span>
                <strong>{bookingSuccess.pickup}</strong>
              </div>
              <div className="detail-item">
                <span>Destination:</span>
                <strong>{bookingSuccess.dropoff}</strong>
              </div>
              <div className="detail-item">
                <span>Vehicle Class:</span>
                <strong>{bookingSuccess.vehicle}</strong>
              </div>
              <div className="detail-item fare-item">
                <span>Total Calculated Fare:</span>
                <strong className="text-green text-xl">₹{Number(bookingSuccess.fare).toFixed(2)}</strong>
              </div>
            </div>

            <div className="mt-4 flex gap-3 justify-center">
              <button className="btn btn-primary" onClick={() => setBookingSuccess(null)}>
                Book Another Ride
              </button>
              <a href="/" className="btn btn-outline">
                Back to Home
              </a>
            </div>
          </div>
        ) : (
          /* SINGLE-SCREEN LIGHT FORM GRID */
          <div className="light-booking-grid">
            
            {/* SINGLE COLUMN FLUID FORM WITH TRIP SUMMARY FIRST AND SUBMIT BUTTON AT THE VERY BOTTOM */}
            <div className="light-form-card" style={{ width: '100%' }}>
              <form onSubmit={handleSubmitBooking}>
                
                {/* STEP 1: TRIP TYPE SELECTION */}
                <div className="form-section">
                  <label className="section-title">
                    <Sparkles size={16} className="text-green" /> 1. Select Trip Type
                  </label>
                  
                  <div className="trip-type-selector-grid mt-2" style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '10px' }}>
                    <button
                      type="button"
                      onClick={() => setTripType('one-way')}
                      style={{
                        padding: '12px 10px',
                        borderRadius: '14px',
                        border: tripType === 'one-way' ? '2px solid #00b87c' : '1.5px solid #cbd5e1',
                        background: tripType === 'one-way' ? '#f0fdf4' : '#ffffff',
                        color: tripType === 'one-way' ? '#0f172a' : '#475569',
                        fontWeight: '800',
                        fontSize: '0.92rem',
                        cursor: 'pointer',
                        display: 'flex',
                        flexDirection: 'column',
                        alignItems: 'center',
                        gap: '2px',
                        boxShadow: tripType === 'one-way' ? '0 4px 14px rgba(0, 184, 124, 0.15)' : 'none',
                        transition: 'all 0.2s ease'
                      }}
                    >
                      <span>Point to Point</span>
                      <span style={{ fontSize: '0.75rem', color: '#00b87c', fontWeight: '700' }}>One-Way</span>
                    </button>

                    <button
                      type="button"
                      onClick={() => setTripType('round-trip')}
                      style={{
                        padding: '12px 10px',
                        borderRadius: '14px',
                        border: tripType === 'round-trip' ? '2px solid #00b87c' : '1.5px solid #cbd5e1',
                        background: tripType === 'round-trip' ? '#f0fdf4' : '#ffffff',
                        color: tripType === 'round-trip' ? '#0f172a' : '#475569',
                        fontWeight: '800',
                        fontSize: '0.92rem',
                        cursor: 'pointer',
                        display: 'flex',
                        flexDirection: 'column',
                        alignItems: 'center',
                        gap: '2px',
                        boxShadow: tripType === 'round-trip' ? '0 4px 14px rgba(0, 184, 124, 0.15)' : 'none',
                        transition: 'all 0.2s ease'
                      }}
                    >
                      <span>Round Trip</span>
                      <span style={{ fontSize: '0.75rem', color: '#00b87c', fontWeight: '700' }}>Return Journey</span>
                    </button>

                    <button
                      type="button"
                      onClick={() => setTripType('custom-trip')}
                      style={{
                        padding: '12px 10px',
                        borderRadius: '14px',
                        border: tripType === 'custom-trip' ? '2px solid #00b87c' : '1.5px solid #cbd5e1',
                        background: tripType === 'custom-trip' ? '#f0fdf4' : '#ffffff',
                        color: tripType === 'custom-trip' ? '#0f172a' : '#475569',
                        fontWeight: '800',
                        fontSize: '0.92rem',
                        cursor: 'pointer',
                        display: 'flex',
                        flexDirection: 'column',
                        alignItems: 'center',
                        gap: '2px',
                        boxShadow: tripType === 'custom-trip' ? '0 4px 14px rgba(0, 184, 124, 0.15)' : 'none',
                        transition: 'all 0.2s ease'
                      }}
                    >
                      <span>Custom Outstation</span>
                      <span style={{ fontSize: '0.75rem', color: '#00b87c', fontWeight: '700' }}>Multi-Day Rental</span>
                    </button>
                  </div>
                </div>

                {/* STEP 2: ROUTE PICKER */}
                <div className="form-section mt-3">
                  <label className="section-title">
                    <MapPin size={16} className="text-green" /> 2. Select Route Locations
                  </label>
                  
                  <div className="route-picker-row mt-2">
                    <div className="field-group">
                      <span className="field-label">From (Pick-up)</span>
                      <select 
                        className="light-select"
                        value={pickupLocation}
                        onChange={e => setPickupLocation(e.target.value)}
                        required
                      >
                        {places.map((p, idx) => (
                          <option key={idx} value={p}>{p}</option>
                        ))}
                      </select>
                    </div>

                    <button 
                      type="button" 
                      className="light-btn-swap"
                      title="Swap Pickup & Dropoff"
                      onClick={handleSwapPlaces}
                    >
                      <ArrowRightLeft size={16} />
                    </button>

                    <div className="field-group">
                      <span className="field-label">To (Drop-off)</span>
                      <select 
                        className="light-select"
                        value={dropoffDestination}
                        onChange={e => setDropoffDestination(e.target.value)}
                        required
                      >
                        {places.map((p, idx) => (
                          <option key={idx} value={p}>{p}</option>
                        ))}
                      </select>
                    </div>
                  </div>
                  
                  <div className="route-distance-chip mt-2">
                    <span className="dot green"></span>
                    <span>
                      {tripType === 'round-trip' 
                        ? `Round Trip Distance: ${effectiveDistanceKm} KM (${distanceKm} KM × 2)` 
                        : (tripType === 'custom-trip' 
                            ? `Custom Outstation Est. Distance: ${effectiveDistanceKm} KM`
                            : `Distance: ${distanceKm} KM`
                          )
                      }
                    </span>
                  </div>
                </div>

                {/* STEP 3: VEHICLE CHOICE */}
                <div className="form-section mt-3">
                  <label className="section-title">
                    <Car size={16} className="text-green" /> 3. Choose Vehicle Class
                  </label>

                  <div className="vehicle-light-grid mt-2">
                    {vehicles.map(v => (
                      <div 
                        key={v.id} 
                        className={`vehicle-light-card ${selectedVehicleId === v.id ? 'active' : ''}`}
                        onClick={() => setSelectedVehicleId(v.id)}
                      >
                        <img src={v.image} alt={v.name} className="vehicle-thumb" />
                        <div className="vehicle-info">
                          <h4 className="m-0 text-sm font-bold">{v.name}</h4>
                          <small className="text-muted">{v.passengers}</small>
                        </div>
                        <span className="vehicle-price">₹{v.rate}/km</span>
                      </div>
                    ))}
                  </div>
                </div>

                {/* STEP 4: CONTACT & SCHEDULE */}
                <div className="form-section mt-3">
                  <label className="section-title">
                    <User size={16} className="text-green" /> 4. Contact & Schedule
                  </label>

                  <div className="form-row-4col mt-2">
                    <div className="field-group">
                      <span className="field-label">Full Name</span>
                      <input 
                        type="text" 
                        className="light-input"
                        placeholder="Rajesh Kumar"
                        value={customerName}
                        onChange={e => setCustomerName(e.target.value)}
                        required
                      />
                    </div>

                    <div className="field-group">
                      <span className="field-label">Phone</span>
                      <input 
                        type="tel" 
                        className="light-input"
                        placeholder="+91 98765 43210"
                        value={customerPhone}
                        onChange={e => setCustomerPhone(e.target.value)}
                        required
                      />
                    </div>

                    <div className="field-group">
                      <span className="field-label">Pickup Date</span>
                      <input 
                        type="date" 
                        className="light-input"
                        value={pickupDate}
                        onChange={e => setPickupDate(e.target.value)}
                        required
                      />
                    </div>

                    <div className="field-group">
                      <span className="field-label">Time</span>
                      <input 
                        type="time" 
                        className="light-input"
                        value={pickupTime}
                        onChange={e => setPickupTime(e.target.value)}
                        required
                      />
                    </div>

                    {/* Conditional Return Date for Round Trip */}
                    {tripType === 'round-trip' && (
                      <div className="field-group">
                        <span className="field-label">Return Date</span>
                        <input 
                          type="date" 
                          className="light-input"
                          value={returnDate}
                          onChange={e => setReturnDate(e.target.value)}
                        />
                      </div>
                    )}

                    {/* Conditional Days Selector for Custom Outstation */}
                    {tripType === 'custom-trip' && (
                      <div className="field-group">
                        <span className="field-label">Rental Duration</span>
                        <select 
                          className="light-select"
                          value={noOfDays}
                          onChange={e => setNoOfDays(Number(e.target.value))}
                        >
                          <option value={1}>1 Day</option>
                          <option value={2}>2 Days</option>
                          <option value={3}>3 Days</option>
                          <option value={4}>4 Days</option>
                          <option value={5}>5+ Days</option>
                        </select>
                      </div>
                    )}
                  </div>
                </div>

                {/* TRIP SUMMARY (DISPLAYED ABOVE SUBMIT BUTTON) */}
                <div className="light-summary-card mt-3">
                  <h3 className="summary-title">Trip Summary</h3>

                  <div className="route-timeline mt-2">
                    <div className="timeline-item">
                      <span className="timeline-dot green"></span>
                      <div>
                        <small>PICK-UP LOCATION</small>
                        <strong>{pickupLocation}</strong>
                      </div>
                    </div>

                    <div className="timeline-line"></div>

                    <div className="timeline-item">
                      <span className="timeline-dot red"></span>
                      <div>
                        <small>DROP-OFF DESTINATION</small>
                        <strong>{dropoffDestination}</strong>
                      </div>
                    </div>
                  </div>

                  <div className="summary-list mt-3">
                    <div className="summary-row">
                      <span>Trip Type:</span>
                      <strong className="text-green">
                        {tripType === 'custom-trip' ? 'Custom Outstation' : (tripType === 'round-trip' ? 'Round Trip' : 'Point to Point (One-Way)')}
                      </strong>
                    </div>
                    <div className="summary-row">
                      <span>Total Distance:</span>
                      <strong>{effectiveDistanceKm} KM {tripType === 'round-trip' ? '(Round Trip)' : ''}</strong>
                    </div>
                    <div className="summary-row">
                      <span>Vehicle Class:</span>
                      <strong>{currentVehicle.name}</strong>
                    </div>
                    <div className="summary-row">
                      <span>Rate:</span>
                      <strong className="text-green">₹{currentVehicle.rate} / km</strong>
                    </div>
                  </div>

                  <div className="fare-big-box mt-3">
                    <div className="fare-label">Estimated Total Fare</div>
                    <div className="fare-price">₹{calculatedFare}</div>
                    <small className="fare-note">
                      {tripType === 'round-trip' 
                        ? 'Includes Return Journey (2× Distance)' 
                        : (tripType === 'custom-trip' ? `Custom ${noOfDays} Day Rental Package` : 'Fixed transparent pricing based on KM')
                      }
                    </small>
                  </div>

                  <div className="trust-badge mt-3">
                    <ShieldCheck size={18} className="text-green" style={{ flexShrink: 0, display: 'block' }} />
                    <span style={{ fontSize: '13px', fontWeight: '600', color: '#475569', lineHeight: '1.2' }}>
                      Instant confirmation & driver dispatch.
                    </span>
                  </div>
                </div>

                {/* FINAL ACTION BUTTON (VERY LAST AT THE BOTTOM) */}
                <button type="submit" className="light-submit-btn mt-3">
                  Book Ride Now <ChevronRight size={18} />
                </button>
              </form>
            </div>

          </div>
        )}
      </div>
    </div>
  );
}
