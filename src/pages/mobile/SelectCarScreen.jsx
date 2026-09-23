import React from 'react';
import InteractiveMap from '../../components/InteractiveMap';
import { getCoordsForPlace, generateRoutePolyline } from '../../utils/locationCoords';
import { INITIAL_VEHICLES } from '../AdminPortal';
import { loadAllVehiclesFromMySQL, loadAllRoutesFromMySQL } from '../../services/mysqlService';
import car1 from '../../assets/images/map/car1.png';
import car2 from '../../assets/images/map/car2.png';
import car3 from '../../assets/images/map/car3.png';
import car4 from '../../assets/images/map/car4.png';

const carImages = [car1, car2, car3, car4];

export default function SelectCarScreen({ 
  userCoords, 
  pickupLoc, 
  dropoffLoc, 
  tripType = 'one-way',
  selectedCar, 
  setSelectedCar, 
  onNext, 
  onBack 
}) {
  const pickupPos = getCoordsForPlace(pickupLoc || "Bhavnagar, Gujarat", userCoords);
  const destPos = getCoordsForPlace(dropoffLoc || "Ahmedabad Airport (AMD)", userCoords);
  const routePolyline = generateRoutePolyline(pickupPos, destPos);

  const [cloudRoutes, setCloudRoutes] = React.useState(() => {
    try {
      const savedDest = localStorage.getItem('cabsy_destinations') || localStorage.getItem('cabsy_routes');
      if (savedDest) {
        const parsedD = JSON.parse(savedDest);
        if (Array.isArray(parsedD) && parsedD.length > 0) return parsedD;
      }
    } catch (e) {}
    return [];
  });

  const getMatchedRoute = () => {
    try {
      const routesList = (Array.isArray(cloudRoutes) && cloudRoutes.length > 0) ? cloudRoutes : [];
      if (routesList.length > 0) {
        const matched = routesList.find(r => 
          (pickupLoc && r.pickup && (r.pickup.toLowerCase().includes(pickupLoc.toLowerCase()) || pickupLoc.toLowerCase().includes(r.pickup.toLowerCase()))) &&
          (dropoffLoc && r.dropoff && (r.dropoff.toLowerCase().includes(dropoffLoc.toLowerCase()) || dropoffLoc.toLowerCase().includes(r.dropoff.toLowerCase())))
        );
        if (matched) return matched;
      }
      const savedDest = localStorage.getItem('cabsy_destinations') || localStorage.getItem('cabsy_routes');
      if (savedDest) {
        const parsedD = JSON.parse(savedDest);
        if (Array.isArray(parsedD) && parsedD.length > 0) {
          const matched = parsedD.find(r => 
            (pickupLoc && r.pickup && (r.pickup.toLowerCase().includes(pickupLoc.toLowerCase()) || pickupLoc.toLowerCase().includes(r.pickup.toLowerCase()))) &&
            (dropoffLoc && r.dropoff && (r.dropoff.toLowerCase().includes(dropoffLoc.toLowerCase()) || dropoffLoc.toLowerCase().includes(r.dropoff.toLowerCase())))
          );
          if (matched) return matched;
        }
      }
    } catch (e) {}
    return null;
  };

  const matchedRoute = getMatchedRoute();
  const hasFixedPrice = matchedRoute && matchedRoute.price !== undefined && matchedRoute.price !== null && matchedRoute.price !== '';
  const fixedPriceNum = hasFixedPrice ? Number(matchedRoute.price) : 0;

  const getRouteDistanceKm = () => {
    if (matchedRoute && matchedRoute.distanceKm) return Number(matchedRoute.distanceKm);
    return 154;
  };

  const baseDistanceKm = getRouteDistanceKm();
  const effectiveDistanceKm = tripType === 'round-trip' ? baseDistanceKm * 2 : baseDistanceKm;

  const [cloudVehicles, setCloudVehicles] = React.useState(() => {
    try {
      const saved = localStorage.getItem('cabsy_vehicles');
      if (saved) {
        const parsed = JSON.parse(saved);
        if (Array.isArray(parsed) && parsed.length > 0) return parsed;
      }
    } catch (e) {}
    return INITIAL_VEHICLES;
  });

  React.useEffect(() => {
    let isMounted = true;
    loadAllVehiclesFromMySQL().then(fetched => {
      if (isMounted && Array.isArray(fetched) && fetched.length > 0) {
        setCloudVehicles(fetched);
        try {
          localStorage.setItem('cabsy_vehicles', JSON.stringify(fetched));
        } catch (e) {}
      }
    }).catch(() => {});

    loadAllRoutesFromMySQL().then(fetchedRoutes => {
      if (isMounted && Array.isArray(fetchedRoutes) && fetchedRoutes.length > 0) {
        const formattedRoutes = fetchedRoutes.map(r => ({
          id: r.id,
          name: `${r.pickup} → ${r.dropoff}`,
          pickup: r.pickup,
          dropoff: r.dropoff,
          price: Number(r.price) || 0,
          duration: r.duration || ''
        }));
        setCloudRoutes(formattedRoutes);
        try {
          localStorage.setItem('cabsy_destinations', JSON.stringify(formattedRoutes));
          localStorage.setItem('cabsy_routes', JSON.stringify(formattedRoutes));
        } catch (e) {}
      }
    }).catch(() => {});

    const handleUpdate = () => {
      try {
        const saved = localStorage.getItem('cabsy_vehicles');
        if (saved) {
          const parsed = JSON.parse(saved);
          if (Array.isArray(parsed) && parsed.length > 0) setCloudVehicles(parsed);
        }
      } catch (e) {}
    };

    window.addEventListener('storage', handleUpdate);
    window.addEventListener('EMPERIAL CABS_vehicles_updated', handleUpdate);
    return () => {
      isMounted = false;
      window.removeEventListener('storage', handleUpdate);
      window.removeEventListener('EMPERIAL CABS_vehicles_updated', handleUpdate);
    };
  }, []);

  const getAdminVehicles = () => {
    const rawVehicles = (Array.isArray(cloudVehicles) && cloudVehicles.length > 0) ? cloudVehicles : INITIAL_VEHICLES;

    return rawVehicles.filter(v => v.status !== 'Inactive').map((v, idx) => {
      const ratePerKm = Number(v.rate || 15);
      let totalFare = 0;
      if (hasFixedPrice && fixedPriceNum > 0) {
        const isSevenSeater = (v.passengers && v.passengers.includes('7')) || (v.name && v.name.toLowerCase().includes('eartice'));
        const multiplier = isSevenSeater ? 1.3 : 1.0;
        const oneWayFare = Math.round(fixedPriceNum * multiplier);
        totalFare = tripType === 'round-trip' ? oneWayFare * 2 : oneWayFare;
      } else {
        totalFare = Math.round(effectiveDistanceKm * ratePerKm);
      }

      return {
        id: v.id || idx + 1,
        name: v.name,
        passengers: v.passengers || '4 Persons',
        img: v.image || carImages[idx % carImages.length],
        dist: matchedRoute?.duration || `${effectiveDistanceKm} km`,
        time: matchedRoute?.duration || `${Math.round(effectiveDistanceKm * 1.4)} min`,
        ratePerKm,
        totalFareNum: totalFare,
        price: `₹${totalFare.toLocaleString('en-IN')}`,
        isFixedPrice: hasFixedPrice
      };
    });
  };

  const allVehicles = getAdminVehicles();
  const currentCarObj = allVehicles.find(c => c.id === selectedCar) || allVehicles[0] || {};

  return (
    <div className="real-mobile-app">
      <div className="full-homescreen-map-wrapper">
        <div className="live-map-viewport">
          <InteractiveMap
            center={pickupPos}
            zoom={13}
            userLabel={pickupLoc || "Pickup Location"}
            destination={destPos}
            routePolyline={routePolyline}
          />

          <div className="homescreen-bottom-card">
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '16px' }}>
              <button 
                onClick={onBack}
                style={{
                  background: '#F1F5F9',
                  border: 'none',
                  borderRadius: '20px',
                  padding: '8px 16px',
                  display: 'flex',
                  alignItems: 'center',
                  gap: '6px',
                  cursor: 'pointer',
                  fontFamily: 'Space Grotesk, sans-serif',
                  fontWeight: '700',
                  fontSize: '14px',
                  color: '#0F172A'
                }}
              >
                <span>←</span> Back
              </button>
              <div style={{ background: '#F0FDF4', border: '1.5px solid #BBF7D0', color: '#059669', padding: '6px 14px', borderRadius: '16px', fontSize: '13px', fontWeight: '800', display: 'flex', alignItems: 'center', gap: '6px', boxShadow: '0 2px 8px rgba(16,185,129,0.1)' }}>
                <span>●</span> {hasFixedPrice 
                  ? (tripType === 'round-trip' ? 'Round Trip • Fixed Route' : 'One-Way • Fixed Route')
                  : (tripType === 'round-trip' ? `Round Trip • ${effectiveDistanceKm} KM` : `One-Way • ${effectiveDistanceKm} KM`)}
              </div>
            </div>

            <p style={{ fontFamily: 'League Spartan', fontSize: '15px', fontWeight: '800', color: '#0F172A', letterSpacing: '0.3px', margin: '0 0 10px 0', textTransform: 'uppercase' }}>
              {hasFixedPrice ? 'SELECT FLEET VEHICLE (FIXED ROUTE FARE)' : 'SELECT FLEET VEHICLE (RATE / KM)'}
            </p>
            
            {/* Scrollable Car Selection Cards */}
            <div style={{ 
              display: 'flex', 
              gap: '12px', 
              marginBottom: '16px', 
              overflowX: 'auto', 
              paddingBottom: '8px', 
              WebkitOverflowScrolling: 'touch'
            }}>
              {allVehicles.map((car) => {
                const isSelected = (selectedCar === car.id || currentCarObj.id === car.id);
                return (
                  <div 
                    key={car.id} 
                    style={{
                      flex: '0 0 calc(32% - 8px)',
                      minWidth: '110px',
                      background: isSelected ? '#F0FDF4' : '#FFFFFF',
                      border: isSelected ? '2px solid #10B981' : '1.5px solid #E2E8F0',
                      borderRadius: '18px',
                      padding: '12px 8px',
                      display: 'flex',
                      flexDirection: 'column',
                      alignItems: 'center',
                      justifyContent: 'center',
                      cursor: 'pointer',
                      boxShadow: isSelected ? '0 4px 14px rgba(16,185,129,0.2)' : '0 2px 6px rgba(0,0,0,0.02)',
                      transition: 'all 0.2s ease'
                    }}
                    onClick={() => setSelectedCar(car.id)}
                  >
                    <img src={car.img} alt={car.name} style={{ height: '48px', width: '80px', objectFit: 'cover', borderRadius: '8px' }} />
                    <span style={{ fontSize: '13px', fontWeight: '800', color: isSelected ? '#0F172A' : '#475569', marginTop: '6px', textAlign: 'center', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis', maxWidth: '100%' }}>
                      {car.name}
                    </span>
                    <span style={{ fontSize: '11px', color: '#64748B', fontWeight: '700', marginTop: '2px' }}>
                      {hasFixedPrice ? 'Fixed Rate' : `₹${car.ratePerKm}/km`}
                    </span>
                    <span style={{ fontSize: '13px', fontWeight: '800', color: '#22C55E', marginTop: '2px' }}>
                      {car.price}
                    </span>
                  </div>
                );
              })}
            </div>

            {/* Selected Car Details */}
            <div style={{ background: '#F8FAFC', border: '1.5px solid #E2E8F0', borderRadius: '16px', padding: '14px 16px', marginBottom: '16px', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
              <div>
                <h4 style={{ margin: 0, fontSize: '16px', fontWeight: '800', color: '#0F172A', fontFamily: 'League Spartan' }}>
                  {currentCarObj.name} ({currentCarObj.passengers})
                </h4>
                <p style={{ margin: '2px 0 0 0', fontSize: '12px', color: '#64748B', fontFamily: 'Space Grotesk' }}>
                  {hasFixedPrice 
                    ? `Admin Fixed Fare (${tripType === 'round-trip' ? 'Round Trip 2×' : 'One-Way'})`
                    : `Rate: ₹${currentCarObj.ratePerKm}/km × ${effectiveDistanceKm} KM (${tripType === 'round-trip' ? 'Round Trip' : 'One-Way'})`}
                </p>
              </div>
              <div style={{ textAlign: 'right' }}>
                <span style={{ fontSize: '20px', fontWeight: '800', color: '#22C55E', fontFamily: 'League Spartan', display: 'block' }}>
                  {currentCarObj.price}
                </span>
                <span style={{ fontSize: '11px', color: '#15803D', fontWeight: '700' }}>✓ Taxes & Tolls Included</span>
              </div>
            </div>

            {/* Summary Stats */}
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '10px', marginBottom: '18px' }}>
              <div style={{ background: '#F8FAFC', border: '1.5px solid #E2E8F0', borderRadius: '14px', padding: '10px 8px', textAlign: 'center', fontFamily: 'Space Grotesk', fontWeight: '700', fontSize: '13px', color: '#0F172A' }}>
                {hasFixedPrice 
                  ? (matchedRoute?.duration ? `⏱️ ${matchedRoute.duration}` : 'Fixed Route')
                  : (tripType === 'round-trip' ? `Distance: ${effectiveDistanceKm} KM (2×)` : `Distance: ${effectiveDistanceKm} KM`)}
              </div>
              <div style={{ background: '#F8FAFC', border: '1.5px solid #E2E8F0', borderRadius: '14px', padding: '10px 8px', textAlign: 'center', fontFamily: 'Space Grotesk', fontWeight: '700', fontSize: '13px', color: '#0F172A' }}>
                Trip: {tripType === 'round-trip' ? 'Round Trip' : 'One-Way'}
              </div>
              <div style={{ background: '#F8FAFC', border: '1.5px solid #E2E8F0', borderRadius: '14px', padding: '10px 8px', textAlign: 'center', fontFamily: 'Space Grotesk', fontWeight: '700', fontSize: '13px', color: '#22C55E' }}>
                {hasFixedPrice ? 'Fixed Pricing' : `Rate: ₹${currentCarObj.ratePerKm}/km`}
              </div>
            </div>

            <button className="EMPERIAL CABS-btn-primary" onClick={() => onNext && onNext(currentCarObj)}>
              Confirm {currentCarObj.name} ({currentCarObj.price}) →
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
