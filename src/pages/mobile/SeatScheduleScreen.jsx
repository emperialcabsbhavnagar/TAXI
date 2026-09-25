import React, { useState, useEffect } from 'react';
import InteractiveMap from '../../components/InteractiveMap';
import { getCoordsForPlace, generateRoutePolyline, calculateDistanceKm } from '../../utils/locationCoords';
import { INITIAL_VEHICLES } from '../AdminPortal';
import { db } from '../../services/dbService';
import { getRoutePriceFromMySQL, loadAllRoutesFromMySQL } from '../../services/mysqlService';
import { Gift, ArrowLeft, Sparkles, CheckCircle2 } from 'lucide-react';

export default function SeatScheduleScreen({ 
  userCoords,
  pickupLoc,
  dropoffLoc,
  pickupCity,
  dropoffCity,
  noOfDays = 1,
  isCustom = false,
  tripType = 'one-way',
  setTripType,
  scheduledDate, 
  setScheduledDate, 
  scheduledTime, 
  setScheduledTime,
  returnDate,
  setReturnDate,
  selectedCar,
  setSelectedCar,
  onNext, 
  onBack 
}) {
  const isCustomMode = isCustom || tripType === 'custom-trip';

  const pickupPos = getCoordsForPlace(pickupLoc || "Bhavnagar, Gujarat", userCoords);
  const destPos = getCoordsForPlace(dropoffLoc || "Ahmedabad Airport (AMD)", userCoords);
  const routePolyline = generateRoutePolyline(pickupPos, destPos);

  // Compute distance & Avg KM/day dynamically
  const getRouteDistanceKm = () => {
    try {
      const savedDest = localStorage.getItem('cabsy_destinations') || localStorage.getItem('cabsy_routes');
      if (savedDest) {
        const parsedD = JSON.parse(savedDest);
        if (Array.isArray(parsedD) && parsedD.length > 0) {
          const matched = parsedD.find(r => 
            (pickupLoc && r.pickup && (r.pickup.toLowerCase().includes(pickupLoc.toLowerCase()) || pickupLoc.toLowerCase().includes(r.pickup.toLowerCase()))) &&
            (dropoffLoc && r.dropoff && (r.dropoff.toLowerCase().includes(dropoffLoc.toLowerCase()) || dropoffLoc.toLowerCase().includes(r.dropoff.toLowerCase())))
          );
          if (matched && matched.distanceKm) return Number(matched.distanceKm);
        }
      }
    } catch (e) {}

    const rawRoadKm = Math.round(calculateDistanceKm(pickupPos.lat, pickupPos.lng, destPos.lat, destPos.lng));
    return rawRoadKm > 10 ? rawRoadKm : 175;
  };

  const baseDistance = getRouteDistanceKm();
  const effectiveDistance = tripType === 'round-trip' ? baseDistance * 2 : baseDistance;
  const estTotalKm = isCustomMode 
    ? Math.max(baseDistance, 300 * (noOfDays || 1))
    : effectiveDistance;
  const avgKmPerDay = isCustomMode ? Math.round(estTotalKm / (noOfDays || 1)) : estTotalKm;

  const [matchedRoute, setMatchedRoute] = useState(() => {
    try {
      const savedDest = localStorage.getItem('cabsy_destinations') || localStorage.getItem('cabsy_routes');
      if (savedDest) {
        const parsedD = JSON.parse(savedDest);
        if (Array.isArray(parsedD) && parsedD.length > 0) {
          const pClean = (pickupLoc || '').toLowerCase().trim();
          const dClean = (dropoffLoc || '').toLowerCase().trim();
          return parsedD.find(r => 
            (r.pickup && r.dropoff) &&
            (((r.pickup.toLowerCase().includes(pClean) || pClean.includes(r.pickup.toLowerCase())) &&
              (r.dropoff.toLowerCase().includes(dClean) || dClean.includes(r.dropoff.toLowerCase()))) ||
             ((r.pickup.toLowerCase().includes(dClean) || dClean.includes(r.pickup.toLowerCase())) &&
              (r.dropoff.toLowerCase().includes(pClean) || pClean.includes(r.dropoff.toLowerCase()))))
          ) || null;
        }
      }
    } catch (e) {}
    return null;
  });

  useEffect(() => {
    let isMounted = true;
    if (pickupLoc && dropoffLoc) {
      getRoutePriceFromMySQL(pickupLoc, dropoffLoc).then(liveRoute => {
        if (!isMounted || !liveRoute) return;
        let cp = liveRoute.car_prices || {};
        if (typeof cp === 'string') {
          try { cp = JSON.parse(cp); } catch(e) { cp = {}; }
        }
        setMatchedRoute({
          ...liveRoute,
          price: Number(liveRoute.price) || 0,
          car_prices: cp
        });
      }).catch(() => {});
    }
    return () => { isMounted = false; };
  }, [pickupLoc, dropoffLoc]);

  // Load configured vehicles from Admin Portal
  const getFleetVehicles = () => {
    let rawList = [];
    try {
      const savedV = localStorage.getItem('cabsy_vehicles');
      if (savedV) {
        const parsed = JSON.parse(savedV);
        if (Array.isArray(parsed) && parsed.length > 0) {
          rawList = parsed;
        }
      }
    } catch (e) {}

    if (rawList.length === 0) {
      rawList = INITIAL_VEHICLES;
    }

    return rawList
      .filter(v => (v.status || 'Active').toLowerCase() === 'active')
      .map((v, idx) => {
        const r = Number(v.ratePerKm || v.pricePerKm || v.rate) || 5;
        let fare = 0;
        let isFixed = false;

        let directPrice = null;
        if (matchedRoute && matchedRoute.car_prices && typeof matchedRoute.car_prices === 'object') {
          directPrice = matchedRoute.car_prices[v.id] ?? matchedRoute.car_prices[v.name];
          if (directPrice === null || directPrice === undefined || directPrice === '') {
            const vNameLower = (v.name || '').toLowerCase().trim();
            const vIdLower = (v.id || '').toLowerCase().trim();
            for (const [k, val] of Object.entries(matchedRoute.car_prices)) {
              const kL = k.toLowerCase().trim();
              if (kL === vIdLower || kL === vNameLower) {
                directPrice = val;
                break;
              }
            }
          }
        }

        if (directPrice !== null && directPrice !== undefined && directPrice !== '' && !isNaN(Number(directPrice)) && Number(directPrice) > 0) {
          const numP = Number(directPrice);
          fare = tripType === 'round-trip' ? numP * 2 : numP;
          isFixed = true;
        } else if (matchedRoute && matchedRoute.price && Number(matchedRoute.price) > 0) {
          const isSevenSeater = (v.passengers && v.passengers.includes('7')) || (v.name && (v.name.toLowerCase().includes('ertiga') || v.name.toLowerCase().includes('innova')));
          const isLuxury = v.name && (v.name.toLowerCase().includes('innova') || v.name.toLowerCase().includes('crysta'));
          const multiplier = isLuxury ? 1.7 : (isSevenSeater ? 1.35 : 1.0);
          const oneWay = Math.round(Number(matchedRoute.price) * multiplier);
          fare = tripType === 'round-trip' ? oneWay * 2 : oneWay;
          isFixed = true;
        } else {
          fare = isCustomMode 
            ? Math.round(r * estTotalKm)
            : Math.round(r * effectiveDistance);
          isFixed = false;
        }

        return {
          id: v.id || `CAR-${101 + idx}`,
          name: v.name,
          type: v.passengers || v.type || '4 Persons',
          ratePerKm: r,
          totalFareNum: fare,
          price: `₹${fare.toLocaleString('en-IN')}`,
          isFixedPrice: isFixed,
          tag: isFixed ? 'Fixed Rate' : (v.status || 'Active')
        };
      });
  };

  const fleet = getFleetVehicles();
  const [currentCarId, setCurrentCarId] = useState(selectedCar || fleet[0]?.id);
  const activeCarObj = fleet.find(c => c.id === currentCarId) || fleet[0];

  // Wallet Reward Redemption State
  const [useWalletDiscount, setUseWalletDiscount] = useState(true);
  const [walletBalance, setWalletBalance] = useState(0);

  // Exact Pickup & Drop-off Address Details (Entered manually by customer)
  const [pickupAddressDetail, setPickupAddressDetail] = useState('');
  const [dropoffAddressDetail, setDropoffAddressDetail] = useState('');

  // Swipe to Confirm State & Drag Handler
  const [dragX, setDragX] = useState(0);
  const [isDragging, setIsDragging] = useState(false);
  const [isConfirmed, setIsConfirmed] = useState(false);
  const sliderRef = React.useRef(null);
  const handleWidth = 56;

  const userProfile = React.useMemo(() => {
    try {
      const saved = localStorage.getItem('cabsy_user_profile');
      return saved ? JSON.parse(saved) : null;
    } catch (e) { return null; }
  }, []);

  const userPhone = userProfile?.phone || '+91 98765 43210';

  useEffect(() => {
    const w = db.getCustomerWallet(userPhone);
    setWalletBalance(w.balance || 0);
  }, [userPhone]);

  const [isSheetCollapsed, setIsSheetCollapsed] = useState(false);
  const baseFare = activeCarObj ? activeCarObj.totalFareNum : 770;
  const discountAmount = (useWalletDiscount && walletBalance > 0) ? Math.min(walletBalance, baseFare) : 0;
  const netFare = Math.max(0, baseFare - discountAmount);

  const handleConfirmBooking = () => {
    const payload = {
      ...activeCarObj,
      tripType: isCustomMode ? 'Custom Trip' : (tripType === 'round-trip' ? 'Round Trip (Return)' : 'One-Way'),
      isCustom: isCustomMode,
      pickupCity: isCustomMode ? (pickupCity || pickupLoc) : null,
      dropoffCity: isCustomMode ? (dropoffCity || dropoffLoc) : null,
      pickup: pickupAddressDetail.trim() ? `${pickupAddressDetail.trim()}, ${pickupLoc}` : pickupLoc,
      dropoff: dropoffAddressDetail.trim() ? `${dropoffAddressDetail.trim()}, ${dropoffLoc}` : dropoffLoc,
      exactPickupAddress: pickupAddressDetail || pickupLoc,
      exactDropoffAddress: dropoffAddressDetail || dropoffLoc,
      noOfDays: isCustomMode ? noOfDays : 1,
      totalDistanceKm: estTotalKm,
      avgKmPerDay: avgKmPerDay,
      totalFareNum: netFare,
      originalFare: baseFare,
      walletDiscountUsed: discountAmount,
      couponUsed: discountAmount > 0 ? `Wallet Reward (-₹${discountAmount})` : null
    };
    onNext && onNext(payload);
  };

  const triggerSwipeConfirm = () => {
    if (isConfirmed) return;
    if (sliderRef.current) {
      const maxDrag = sliderRef.current.getBoundingClientRect().width - handleWidth;
      setDragX(maxDrag);
    }
    setIsConfirmed(true);
    setTimeout(() => {
      handleConfirmBooking();
    }, 250);
  };

  const onStartDrag = (clientX) => {
    if (isConfirmed) return;
    setIsDragging(true);
    if (sliderRef.current) {
      const rect = sliderRef.current.getBoundingClientRect();
      const currentX = Math.max(0, Math.min(clientX - rect.left - handleWidth / 2, rect.width - handleWidth));
      setDragX(currentX);
    }
  };

  const onMoveDrag = (clientX) => {
    if (!isDragging || isConfirmed || !sliderRef.current) return;
    const rect = sliderRef.current.getBoundingClientRect();
    const maxDrag = rect.width - handleWidth;
    const newX = Math.max(0, Math.min(clientX - rect.left - handleWidth / 2, maxDrag));
    setDragX(newX);

    if (newX >= maxDrag * 0.82) {
      setIsConfirmed(true);
      setDragX(maxDrag);
      setIsDragging(false);
      setTimeout(() => {
        handleConfirmBooking();
      }, 250);
    }
  };

  const onEndDrag = () => {
    if (isConfirmed) return;
    setIsDragging(false);
    if (sliderRef.current) {
      const rect = sliderRef.current.getBoundingClientRect();
      const maxDrag = rect.width - handleWidth;
      if (dragX < maxDrag * 0.82) {
        setDragX(0);
      }
    }
  };

  useEffect(() => {
    const handleTouchMove = (e) => {
      if (isDragging && e.touches && e.touches[0]) {
        onMoveDrag(e.touches[0].clientX);
      }
    };
    const handleTouchEnd = () => {
      if (isDragging) onEndDrag();
    };
    const handleMouseMove = (e) => {
      if (isDragging) onMoveDrag(e.clientX);
    };
    const handleMouseUp = () => {
      if (isDragging) onEndDrag();
    };

    if (isDragging) {
      window.addEventListener('touchmove', handleTouchMove, { passive: false });
      window.addEventListener('touchend', handleTouchEnd);
      window.addEventListener('mousemove', handleMouseMove);
      window.addEventListener('mouseup', handleMouseUp);
    }
    return () => {
      window.removeEventListener('touchmove', handleTouchMove);
      window.removeEventListener('touchend', handleTouchEnd);
      window.removeEventListener('mousemove', handleMouseMove);
      window.removeEventListener('mouseup', handleMouseUp);
    };
  }, [isDragging, dragX, isConfirmed]);

  return (
    <div className="real-mobile-app">
      <div className="full-homescreen-map-wrapper">
        <div className="live-map-viewport">
          <InteractiveMap
            center={pickupPos}
            zoom={13}
            userLabel={pickupLoc || "Pickup Point"}
            destination={destPos}
            routePolyline={routePolyline}
          />

          {/* Bottom Card for Trip Type, Schedule & Vehicle Selection */}
          <div className={`homescreen-bottom-card ${isSheetCollapsed ? 'collapsed' : ''}`} style={{ maxHeight: '82vh', overflowY: 'auto' }}>
            {/* Top Center Line Handle Bar */}
            <div 
              className="drag-handle-toggle-area"
              onClick={() => setIsSheetCollapsed(prev => !prev)}
              style={{ cursor: 'pointer', padding: '2px 0 6px 0', width: '100%', display: 'flex', justifyContent: 'center', alignItems: 'center', userSelect: 'none' }}
              title="Click top center line to collapse/expand"
            >
              <svg width="40" height="10" viewBox="0 0 40 10" style={{ display: 'block' }}>
                <path 
                  d={isSheetCollapsed ? "M 8 8 L 20 2 L 32 8" : "M 8 2 L 20 8 L 32 2"} 
                  stroke="#64748B" 
                  strokeWidth="3.5" 
                  strokeLinecap="round" 
                  strokeLinejoin="round" 
                  fill="none" 
                  style={{ transition: 'all 0.3s cubic-bezier(0.16, 1, 0.3, 1)' }}
                />
              </svg>
            </div>

            {/* Back Button & Header Tag */}
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '14px' }}>
              <button 
                type="button"
                onClick={onBack}
                style={{
                  background: '#F1F5F9',
                  border: 'none',
                  borderRadius: '16px',
                  padding: '8px 14px',
                  display: 'flex',
                  alignItems: 'center',
                  gap: '6px',
                  cursor: 'pointer',
                  fontFamily: 'Space Grotesk, sans-serif',
                  fontWeight: '700',
                  fontSize: '13px',
                  color: '#0F172A'
                }}
              >
                <ArrowLeft size={16} />
                <span>Back</span>
              </button>
              
              <div style={{ background: '#F0FDF4', border: '1.5px solid #BBF7D0', padding: '6px 14px', borderRadius: '16px', fontSize: '13px', fontWeight: '800', color: '#059669', display: 'flex', alignItems: 'center', gap: '6px', boxShadow: '0 2px 8px rgba(16,185,129,0.1)' }}>
                <span>●</span> {isCustomMode ? `Custom Outstation (${noOfDays || 1} Day${(noOfDays || 1) > 1 ? 's' : ''})` : (tripType === 'round-trip' ? `${effectiveDistance} KM (${baseDistance} KM × 2)` : `${baseDistance} KM`)}
              </div>
            </div>

            {/* CUSTOM TRIP SUMMARY HEADER (SHOWN ONLY WHEN IS_CUSTOM IS TRUE) */}
            {isCustomMode && (
              <div style={{
                background: '#ECFDF5',
                border: '1.5px solid #A7F3D0',
                borderRadius: '18px',
                padding: '14px 16px',
                marginBottom: '16px',
                boxShadow: '0 2px 10px rgba(16,185,129,0.08)'
              }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '8px' }}>
                  <Sparkles size={18} color="#10B981" />
                  <span style={{ fontFamily: 'League Spartan', fontSize: '16px', fontWeight: '800', color: '#047857' }}>
                    Custom Rental: {pickupCity || 'Bhavnagar'} ➔ {dropoffCity || 'Ahmedabad'} ({noOfDays || 1} Day{(noOfDays || 1) > 1 ? 's' : ''})
                  </span>
                </div>
                <div style={{ fontSize: '13px', color: '#065F46', fontWeight: '600', fontFamily: 'Space Grotesk', marginBottom: '2px' }}>
                  <strong>Pickup:</strong> {pickupLoc}
                </div>
                <div style={{ fontSize: '13px', color: '#065F46', fontWeight: '600', fontFamily: 'Space Grotesk' }}>
                  <strong>Dropoff:</strong> {dropoffLoc}
                </div>
              </div>
            )}

            {/* STANDARD MODE OPTIONS: 1. SELECT TRIP TYPE & 2. SCHEDULE PICKUP DATE & TIME (HIDDEN IF IS_CUSTOM IS TRUE) */}
            {!isCustomMode && (
              <>
                {/* 1. TRIP TYPE SELECTOR */}
                <p style={{ fontFamily: 'League Spartan', fontSize: '14px', fontWeight: '800', color: '#0F172A', letterSpacing: '0.3px', margin: '0 0 8px 0', textTransform: 'uppercase' }}>
                  1. SELECT TRIP TYPE
                </p>

                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '10px', marginBottom: '16px' }}>
                  <button
                    type="button"
                    onClick={() => setTripType('one-way')}
                    style={{
                      padding: '12px 10px',
                      borderRadius: '14px',
                      border: tripType === 'one-way' ? '2px solid #10B981' : '1.5px solid #E2E8F0',
                      background: tripType === 'one-way' ? '#F0FDF4' : '#FFFFFF',
                      color: tripType === 'one-way' ? '#0F172A' : '#64748B',
                      fontFamily: 'League Spartan, sans-serif',
                      fontSize: '14px',
                      fontWeight: '800',
                      cursor: 'pointer',
                      boxShadow: tripType === 'one-way' ? '0 4px 14px rgba(16,185,129,0.2)' : 'none',
                      transition: 'all 0.2s ease',
                      display: 'flex',
                      flexDirection: 'column',
                      alignItems: 'center',
                      gap: '2px'
                    }}
                  >
                    <span>One-Way</span>
                    <span style={{ fontSize: '11px', fontWeight: '700', color: '#059669' }}>{baseDistance} KM</span>
                  </button>

                  <button
                    type="button"
                    onClick={() => setTripType('round-trip')}
                    style={{
                      padding: '12px 10px',
                      borderRadius: '14px',
                      border: tripType === 'round-trip' ? '2px solid #10B981' : '1.5px solid #E2E8F0',
                      background: tripType === 'round-trip' ? '#F0FDF4' : '#FFFFFF',
                      color: tripType === 'round-trip' ? '#0F172A' : '#64748B',
                      fontFamily: 'League Spartan, sans-serif',
                      fontSize: '14px',
                      fontWeight: '800',
                      cursor: 'pointer',
                      boxShadow: tripType === 'round-trip' ? '0 4px 14px rgba(16,185,129,0.2)' : 'none',
                      transition: 'all 0.2s ease',
                      display: 'flex',
                      flexDirection: 'column',
                      alignItems: 'center',
                      gap: '2px'
                    }}
                  >
                    <span>Round Trip</span>
                    <span style={{ fontSize: '11px', fontWeight: '700', color: '#059669' }}>{baseDistance * 2} KM</span>
                  </button>
                </div>

                {/* 2. SCHEDULE DATE & TIME */}
                <p style={{ fontFamily: 'League Spartan', fontSize: '14px', fontWeight: '800', color: '#0F172A', letterSpacing: '0.3px', margin: '0 0 8px 0', textTransform: 'uppercase' }}>
                  2. SCHEDULE PICKUP DATE & TIME
                </p>

                <div className="schedule-inputs-row" style={{ marginBottom: tripType === 'round-trip' ? '10px' : '16px' }}>
                  <div className="schedule-input-box" style={{ position: 'relative', display: 'flex', alignItems: 'center' }}>
                    <select 
                      value={scheduledDate} 
                      onChange={(e) => setScheduledDate(e.target.value)}
                      style={{ width: '100%', border: 'none', background: 'transparent', outline: 'none', fontFamily: 'Space Grotesk', fontSize: '14px', fontWeight: '700', color: '#0F172A', cursor: 'pointer' }}
                    >
                      <option value="Today, 10 Aug 2026">Today, 10 Aug 2026</option>
                      <option value="Tomorrow, 11 Aug 2026">Tomorrow, 11 Aug 2026</option>
                      <option value="Wed, 12 Aug 2026">Wed, 12 Aug 2026</option>
                      <option value="Thu, 13 Aug 2026">Thu, 13 Aug 2026</option>
                      <option value="Fri, 14 Aug 2026">Fri, 14 Aug 2026</option>
                      <option value="Sat, 15 Aug 2026">Sat, 15 Aug 2026</option>
                    </select>
                  </div>

                  <div className="schedule-input-box" style={{ position: 'relative', display: 'flex', alignItems: 'center' }}>
                    <select 
                      value={scheduledTime} 
                      onChange={(e) => setScheduledTime(e.target.value)} 
                      style={{ width: '100%', border: 'none', background: 'transparent', outline: 'none', fontFamily: 'Space Grotesk', fontSize: '14px', fontWeight: '700', color: '#0F172A', cursor: 'pointer' }}
                    >
                      {[
                        "08:00 AM", "08:30 AM", "09:00 AM", "09:30 AM", "10:00 AM", "10:30 AM", "11:00 AM", "11:30 AM",
                        "12:00 PM", "12:30 PM", "01:00 PM", "01:30 PM", "02:00 PM", "02:30 PM", "03:00 PM", "03:30 PM",
                        "04:00 PM", "04:30 PM", "05:00 PM", "05:30 PM", "06:00 PM", "06:30 PM", "07:00 PM", "07:30 PM"
                      ].map(t => (
                        <option key={t} value={t}>{t}</option>
                      ))}
                    </select>
                  </div>
                </div>

                {/* Optional Return Date if Round Trip */}
                {tripType === 'round-trip' && (
                  <div style={{ marginBottom: '16px' }}>
                    <label style={{ fontSize: '11px', fontWeight: '800', color: '#64748B', display: 'block', marginBottom: '4px', textTransform: 'uppercase' }}>
                      RETURN DATE (OPTIONAL)
                    </label>
                    <div className="schedule-input-box">
                      <select 
                        value={returnDate || 'Tomorrow, 11 Aug 2026'} 
                        onChange={(e) => setReturnDate && setReturnDate(e.target.value)}
                        style={{ width: '100%', border: 'none', background: 'transparent', outline: 'none', fontFamily: 'Space Grotesk', fontSize: '14px', fontWeight: '700', color: '#0F172A', cursor: 'pointer' }}
                      >
                        <option value="Tomorrow, 11 Aug 2026">Tomorrow, 11 Aug 2026</option>
                        <option value="Wed, 12 Aug 2026">Wed, 12 Aug 2026</option>
                        <option value="Thu, 13 Aug 2026">Thu, 13 Aug 2026</option>
                        <option value="Fri, 14 Aug 2026">Fri, 14 Aug 2026</option>
                        <option value="Sat, 15 Aug 2026">Sat, 15 Aug 2026</option>
                      </select>
                    </div>
                  </div>
                )}
              </>
            )}

            {/* EXACT PICKUP & DROP-OFF ADDRESS DETAILS (CUSTOMER MANUAL ENTRY) */}
            <p style={{ fontFamily: 'League Spartan', fontSize: '14px', fontWeight: '800', color: '#0F172A', letterSpacing: '0.3px', margin: '0 0 8px 0', textTransform: 'uppercase' }}>
              {isCustomMode ? 'EXACT PICKUP & DROP-OFF ADDRESS' : '3. EXACT PICKUP & DROP-OFF ADDRESS'}
            </p>

            <div style={{ display: 'flex', flexDirection: 'column', gap: '12px', marginBottom: '16px' }}>
              {/* Pickup Address Input Box */}
              <div style={{ background: '#FFFFFF', border: '1.5px solid #CBD5E1', borderRadius: '16px', padding: '12px 14px', boxShadow: '0 2px 6px rgba(0,0,0,0.03)' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '6px' }}>
                  <div style={{ width: '10px', height: '10px', borderRadius: '50%', background: '#10B981', flexShrink: 0 }} />
                  <span style={{ fontSize: '12px', fontWeight: '800', color: '#059669', textTransform: 'uppercase', fontFamily: 'League Spartan', letterSpacing: '0.5px' }}>
                    Enter Exact Pickup Address ({pickupCity || pickupLoc || 'Pickup City'})
                  </span>
                </div>
                <input 
                  type="text"
                  value={pickupAddressDetail}
                  onChange={(e) => setPickupAddressDetail(e.target.value)}
                  placeholder="Type exact house no, street, landmark..."
                  style={{
                    width: '100%',
                    border: '1px solid #E2E8F0',
                    background: '#F8FAFC',
                    borderRadius: '10px',
                    padding: '10px 12px',
                    outline: 'none',
                    fontFamily: 'Space Grotesk, sans-serif',
                    fontSize: '14px',
                    fontWeight: '700',
                    color: '#0F172A',
                    boxSizing: 'border-box'
                  }}
                />
              </div>

              {/* Drop-off Address Input Box */}
              <div style={{ background: '#FFFFFF', border: '1.5px solid #CBD5E1', borderRadius: '16px', padding: '12px 14px', boxShadow: '0 2px 6px rgba(0,0,0,0.03)' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '6px' }}>
                  <div style={{ width: '10px', height: '10px', borderRadius: '50%', background: '#EF4444', flexShrink: 0 }} />
                  <span style={{ fontSize: '12px', fontWeight: '800', color: '#DC2626', textTransform: 'uppercase', fontFamily: 'League Spartan', letterSpacing: '0.5px' }}>
                    Enter Exact Drop-Off Address ({dropoffCity || dropoffLoc || 'Destination City'})
                  </span>
                </div>
                <input 
                  type="text"
                  value={dropoffAddressDetail}
                  onChange={(e) => setDropoffAddressDetail(e.target.value)}
                  placeholder="Type exact hotel name, terminal no, office..."
                  style={{
                    width: '100%',
                    border: '1px solid #E2E8F0',
                    background: '#F8FAFC',
                    borderRadius: '10px',
                    padding: '10px 12px',
                    outline: 'none',
                    fontFamily: 'Space Grotesk, sans-serif',
                    fontSize: '14px',
                    fontWeight: '700',
                    color: '#0F172A',
                    boxSizing: 'border-box'
                  }}
                />
              </div>
            </div>

            {/* SELECT FLEET CAR ON THIS SCREEN */}
            <p style={{ fontFamily: 'League Spartan', fontSize: '14px', fontWeight: '800', color: '#0F172A', letterSpacing: '0.3px', margin: '0 0 8px 0', textTransform: 'uppercase' }}>
              {isCustomMode ? 'SELECT FLEET CAR (PRICE PER KM)' : '4. SELECT FLEET CAR (PRICE PER KM)'}
            </p>

            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: '10px', marginBottom: '16px' }}>
              {fleet.map((car) => {
                const isSelected = currentCarId === car.id;
                return (
                  <div
                    key={car.id}
                    onClick={() => {
                      setCurrentCarId(car.id);
                      if (setSelectedCar) setSelectedCar(car.id);
                    }}
                    style={{
                      background: isSelected ? '#F0FDF4' : '#FFFFFF',
                      border: isSelected ? '2px solid #10B981' : '1.5px solid #E2E8F0',
                      borderRadius: '16px',
                      padding: '12px',
                      cursor: 'pointer',
                      boxShadow: isSelected ? '0 4px 14px rgba(16, 185, 129, 0.2)' : 'none',
                      transition: 'all 0.2s ease',
                      display: 'flex',
                      flexDirection: 'column',
                      justifyContent: 'space-between'
                    }}
                  >
                    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '4px' }}>
                      <span style={{ fontFamily: 'League Spartan', fontSize: '15px', fontWeight: '800', color: '#0F172A' }}>{car.name}</span>
                      <span style={{ fontSize: '12px', fontWeight: '800', background: isSelected ? '#DCFCE7' : '#F1F5F9', color: isSelected ? '#15803D' : '#059669', padding: '4px 10px', borderRadius: '10px' }}>
                        ₹{car.ratePerKm}/km
                      </span>
                    </div>

                    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', paddingTop: '6px', borderTop: '1px solid #F1F5F9' }}>
                      <span style={{ fontSize: '12px', fontWeight: '600', color: '#64748B' }}>{car.type}</span>
                      {!isCustomMode && (
                        <span style={{ fontFamily: 'League Spartan', fontSize: '18px', fontWeight: '800', color: '#22C55E' }}>{car.price}</span>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>

            {/* WALLET REWARD DISCOUNT CARD */}
            {walletBalance > 0 && (
              <div style={{ background: '#F0FDF4', border: '1.5px solid #BBF7D0', borderRadius: '16px', padding: '12px 16px', marginBottom: '16px' }}>
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '4px' }}>
                  <div style={{ fontFamily: 'League Spartan, sans-serif', fontSize: '15px', fontWeight: '800', color: '#0F172A', display: 'flex', alignItems: 'center', gap: '8px' }}>
                    <Gift size={18} color="#10B981" />
                    <span>Apply Wallet Reward Balance</span>
                  </div>
                  <label style={{ display: 'flex', alignItems: 'center', gap: '6px', cursor: 'pointer', fontFamily: 'Space Grotesk', fontSize: '13px', fontWeight: '800', color: '#15803D' }}>
                    <input 
                      type="checkbox" 
                      checked={useWalletDiscount} 
                      onChange={(e) => setUseWalletDiscount(e.target.checked)}
                      style={{ width: '18px', height: '18px', accentColor: '#10B981', cursor: 'pointer' }}
                    />
                    Use Reward
                  </label>
                </div>
                <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '12px', color: '#047857', fontWeight: '700' }}>
                  <span>Available Wallet: ₹{walletBalance.toLocaleString('en-IN')}</span>
                  {useWalletDiscount && discountAmount > 0 && (
                    <span style={{ color: '#E11D48', fontWeight: '800' }}>-₹{discountAmount} Discount Applied</span>
                  )}
                </div>
              </div>
            )}

            {/* ULTRA-SMOOTH SWIPE RIGHT TO CONFIRM SLIDER */}
            <div 
              ref={sliderRef}
              style={{
                position: 'relative',
                width: '100%',
                height: '62px',
                background: isConfirmed ? '#34D399' : '#0F172A',
                borderRadius: '31px',
                padding: '4px',
                display: 'flex',
                alignItems: 'center',
                userSelect: 'none',
                touchAction: 'none',
                overflow: 'hidden',
                boxShadow: isConfirmed 
                  ? '0 10px 28px rgba(52, 211, 153, 0.45)' 
                  : '0 8px 24px rgba(15, 23, 42, 0.25)',
                transition: isDragging ? 'none' : 'background 0.35s cubic-bezier(0.16, 1, 0.3, 1), box-shadow 0.35s ease',
                cursor: isConfirmed ? 'default' : 'pointer'
              }}
              onMouseDown={(e) => onStartDrag(e.clientX)}
              onTouchStart={(e) => e.touches && e.touches[0] && onStartDrag(e.touches[0].clientX)}
            >
              {/* Shimmer / Animated Gradient Background Fill */}
              <div 
                style={{
                  position: 'absolute',
                  left: 0,
                  top: 0,
                  bottom: 0,
                  width: isConfirmed ? '100%' : `${dragX + handleWidth}px`,
                  background: 'linear-gradient(90deg, #10B981 0%, #34D399 50%, #6EE7B7 100%)',
                  borderRadius: '31px',
                  transition: isDragging ? 'none' : 'width 0.3s cubic-bezier(0.25, 1, 0.5, 1)',
                  pointerEvents: 'none'
                }}
              />

              {/* Sliding Circular Handle */}
              <div
                style={{
                  position: 'absolute',
                  left: `${dragX + 5}px`,
                  width: '54px',
                  height: '54px',
                  borderRadius: '50%',
                  background: '#FFFFFF',
                  boxShadow: isDragging 
                    ? '0 6px 20px rgba(0, 0, 0, 0.35), 0 0 0 4px rgba(110, 231, 183, 0.4)' 
                    : '0 4px 14px rgba(0, 0, 0, 0.25)',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  cursor: 'grab',
                  transition: isDragging ? 'none' : 'left 0.3s cubic-bezier(0.25, 1, 0.5, 1), transform 0.2s ease',
                  transform: isDragging ? 'scale(1.05)' : 'scale(1)',
                  zIndex: 3
                }}
                onClick={(e) => {
                  e.stopPropagation();
                  triggerSwipeConfirm();
                }}
              >
                {isConfirmed ? (
                  <CheckCircle2 size={28} color="#34D399" />
                ) : (
                  <span style={{ fontSize: '20px', color: '#10B981', fontWeight: '900', display: 'flex', alignItems: 'center' }}>
                    ➔
                  </span>
                )}
              </div>

              {/* Slider Label Text */}
              <div 
                style={{
                  width: '100%',
                  textAlign: 'center',
                  paddingLeft: '56px',
                  paddingRight: '16px',
                  color: '#FFFFFF',
                  fontFamily: 'League Spartan, sans-serif',
                  fontSize: '16px',
                  fontWeight: '800',
                  letterSpacing: '0.5px',
                  zIndex: 2,
                  pointerEvents: 'none',
                  opacity: isConfirmed ? 1 : Math.max(0.1, 1 - (dragX / 160)),
                  transition: 'opacity 0.2s ease',
                  textTransform: 'uppercase'
                }}
              >
                {isConfirmed 
                  ? '✓ BOOKING CONFIRMED!' 
                  : (isCustomMode 
                      ? 'SWIPE RIGHT TO CONFIRM →' 
                      : `SWIPE RIGHT TO CONFIRM (${discountAmount > 0 ? `₹${netFare}` : activeCarObj.price}) →`
                    )
                }
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
