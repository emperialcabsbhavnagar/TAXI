import React, { useState, useEffect, useMemo } from 'react';
import { useLocation } from 'react-router-dom';
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
  Sparkles,
  Zap,
  Crosshair
} from 'lucide-react';
import { 
  loadAllVehiclesFromMySQL, 
  loadAllPlacesFromMySQL, 
  loadAllRoutesFromMySQL, 
  getRoutePriceFromMySQL, 
  safeStorageSetItem, 
  saveInquiryToMySQL,
  loadSettingsFromMySQL
} from '../services/mysqlService';
import { notifyAdmin } from '../services/notificationEngine';
import sedanShortImg from '../assets/images/short-trip-sedan.png';
import suvShortImg from '../assets/images/short-trip-suv.png';
import { BHAVNAGAR_20KM_PLACES } from '../data/bhavnagarPlaces';
import './Pages.css';

export const DEFAULT_SHORT_TRIP_PRICING = {
  sedan: { km10: 299, km20: 499, km30: 0, km40: 0, extraKmRate: 14 },
  suv: { km10: 449, km20: 699, km30: 0, km40: 0, extraKmRate: 18 }
};

const FALLBACK_VEHICLES = [
  { id: 'V-1', name: 'Emperial Regular Sedan', rate: 15, passengers: '1-4 Passengers', status: 'Active', image: '/assets/images/exact_tourist_cab.jpg' },
  { id: 'V-2', name: 'Emperial XL SUV', rate: 22, passengers: '1-6 Passengers', status: 'Active', image: '/assets/images/steps_tourist_cab_hd.png' },
  { id: 'V-3', name: 'Emperial Executive Luxury', rate: 45, passengers: '1-4 Passengers', status: 'Active', image: '/assets/images/yellow_headlight_taxi.png' },
  { id: 'V-4', name: 'Emperial Eco Green EV', rate: 18, passengers: '1-4 Passengers', status: 'Active', image: '/assets/images/safety_comfort_spotlight.png' }
];

const ALL_CITIES_AND_VILLAGES = [
  "Bhavnagar", "Ahmedabad", "Vadodara", "Surat", "Rajkot", "Gandhinagar", "Jamnagar", "Junagadh",
  "Anand", "Bharuch", "Navsari", "Vapi", "Valsad", "Mehsana", "Palanpur", "Patan", "Porbandar",
  "Amreli", "Botad", "Morbi", "Surendranagar", "Bhuj", "Gandhidham", "Dahod", "Godhra", "Nadiad",
  "Mainpuri", "Saand", "Mumbai", "Pune", "Thane", "Nashik", "Udaipur", "Jaipur", "Abu Road", 
  "Indore", "Bhopal", "Delhi", "Gurgaon", "Noida",
  "Mahuva", "Sihor", "Talaja", "Palitana", "Gariadhar", "Vallabhipur", "Umrala", "Jesar", "Ghogha",
  "Sanand", "Dholera", "Lothal", "Vartej", "Songadh", "Tana", "Bhandariya", "Trapaj", "Koliyak", "Alang",
  "Wadhwan", "Limbdi", "Chotila", "Halvad", "Dhangadhra", "Jasdan", "Gondal", "Jetpur", "Dhoraji",
  "Upleta", "Anjar", "Mandvi", "Mundra", "Nakhatrana", "Halol", "Veraval", "Somnath", "Dwarka",
  "Kodinar", "Una", "Keshod", "Manavadar", "Visavadar", "Bhanvad", "Khambhalia", "Okha", "Salaya"
];

const isRoutePriced = (r) => {
  if (!r || !r.pickup || !r.dropoff) return false;
  const baseP = Number(r.price) || 0;
  if (baseP > 0) return true;
  if (r.car_prices && typeof r.car_prices === 'object') {
    return Object.values(r.car_prices).some(v => Number(v) > 0);
  }
  return false;
};

export default function BookRide() {
  const location = useLocation();
  const [places, setPlaces] = useState([]);
  const [destinations, setDestinations] = useState([]);
  const [vehicles, setVehicles] = useState([]);
  
  // Trip Type State: 'one-way' (One Way Trip) | 'custom-trip' (Round Trip) | 'instant' (Instant Cab)
  const [tripType, setTripType] = useState('one-way');
  const [noOfDays, setNoOfDays] = useState(1);
  const [returnDate, setReturnDate] = useState('');

  // Instant Cab / Short Trip State
  const [instantPricing, setInstantPricing] = useState(() => {
    try {
      const saved = localStorage.getItem('cabsy_short_trip_pricing');
      if (saved) return JSON.parse(saved);
    } catch (e) {}
    return DEFAULT_SHORT_TRIP_PRICING;
  });
  const [instantVehicle, setInstantVehicle] = useState('sedan'); // 'sedan' | 'suv'
  const [instantKm, setInstantKm] = useState(20); // 10 | 20 | 30 | 40
  const [instantPickup, setInstantPickup] = useState('');
  const [instantDropoff, setInstantDropoff] = useState('');
  const [instantScheduleType, setInstantScheduleType] = useState('instant'); // 'instant' | 'scheduled'
  const [isDetectingLocation, setIsDetectingLocation] = useState(false);

  // Sync pricing from MySQL settings on mount
  useEffect(() => {
    loadSettingsFromMySQL().then(res => {
      if (res && res.short_trip_pricing) {
        try {
          const parsed = typeof res.short_trip_pricing === 'string' 
            ? JSON.parse(res.short_trip_pricing) 
            : res.short_trip_pricing;
          setInstantPricing(parsed);
          localStorage.setItem('cabsy_short_trip_pricing', JSON.stringify(parsed));
        } catch (e) {}
      }
    }).catch(() => {});
  }, []);

  // Quick GPS Location Detection for Instant Pickup
  const handleDetectLocation = () => {
    if (!navigator.geolocation) {
      alert("Geolocation is not supported by your browser. Please type your location.");
      return;
    }
    setIsDetectingLocation(true);
    navigator.geolocation.getCurrentPosition(
      async (pos) => {
        const { latitude, longitude } = pos.coords;
        try {
          const resp = await fetch(`https://nominatim.openstreetmap.org/reverse?format=json&lat=${latitude}&lon=${longitude}&zoom=18&addressdetails=1`);
          const data = await resp.json();
          if (data && data.display_name) {
            setInstantPickup(data.display_name);
          } else {
            setInstantPickup(`GPS Location (${latitude.toFixed(4)}, ${longitude.toFixed(4)}), Bhavnagar`);
          }
        } catch (e) {
          setInstantPickup(`GPS Location (${latitude.toFixed(4)}, ${longitude.toFixed(4)}), Bhavnagar`);
        } finally {
          setIsDetectingLocation(false);
        }
      },
      () => {
        alert("Could not detect location. Please type your pickup address.");
        setIsDetectingLocation(false);
      },
      { timeout: 8000 }
    );
  };

  // Instant pricing calculations
  const currentInstantVehPricing = instantPricing[instantVehicle] || DEFAULT_SHORT_TRIP_PRICING[instantVehicle];
  const availableInstantKmOptions = useMemo(() => {
    const opts = [10, 20];
    if (currentInstantVehPricing.km30 && Number(currentInstantVehPricing.km30) > 0) opts.push(30);
    if (currentInstantVehPricing.km40 && Number(currentInstantVehPricing.km40) > 0) opts.push(40);
    return opts;
  }, [currentInstantVehPricing]);

  useEffect(() => {
    if (!availableInstantKmOptions.includes(instantKm)) {
      setInstantKm(availableInstantKmOptions[0] || 10);
    }
  }, [availableInstantKmOptions, instantKm]);

  const instantFare = useMemo(() => {
    if (instantKm === 10) return currentInstantVehPricing.km10 || (instantVehicle === 'suv' ? 449 : 299);
    if (instantKm === 20) return currentInstantVehPricing.km20 || (instantVehicle === 'suv' ? 699 : 499);
    if (instantKm === 30) return currentInstantVehPricing.km30 || (instantVehicle === 'suv' ? 949 : 699);
    if (instantKm === 40) return currentInstantVehPricing.km40 || (instantVehicle === 'suv' ? 1199 : 899);
    return currentInstantVehPricing.km20 || (instantVehicle === 'suv' ? 699 : 499);
  }, [currentInstantVehPricing, instantKm, instantVehicle]);

  const instantExtraKmRate = currentInstantVehPricing.extraKmRate || (instantVehicle === 'suv' ? 18 : 14);

  const [pickupLocation, setPickupLocation] = useState('');
  const [dropoffDestination, setDropoffDestination] = useState('');

  // Round Trip Specific Fields (Custom Outstation & Multi-day)
  const [pickupCity, setPickupCity] = useState('Bhavnagar');
  const [dropoffCity, setDropoffCity] = useState('Ahmedabad');
  const [exactPickupAddress, setExactPickupAddress] = useState('');
  const [exactDropoffAddress, setExactDropoffAddress] = useState('');

  const [distanceKm, setDistanceKm] = useState(18);
  const [fixedPrice, setFixedPrice] = useState(null);
  const [isMatchedRoute, setIsMatchedRoute] = useState(false);
  const [matchedRouteData, setMatchedRouteData] = useState(null);
  
  const [selectedVehicleId, setSelectedVehicleId] = useState('');

  // Parse URL Query Parameters if user navigated directly from a Route landing page
  useEffect(() => {
    try {
      const params = new URLSearchParams(location.search);
      const qFrom = params.get('from');
      const qTo = params.get('to');
      const qVeh = params.get('vehicle') || params.get('vehicleId');
      if (qFrom) {
        setPickupLocation(qFrom);
        setPickupCity(qFrom);
      }
      if (qTo) {
        setDropoffDestination(qTo);
        setDropoffCity(qTo);
      }
      if (qVeh) {
        setSelectedVehicleId(qVeh);
      }
    } catch (e) {}
  }, [location.search]);
  
  const [customerName, setCustomerName] = useState('');
  const [customerPhone, setCustomerPhone] = useState('');
  const [pickupDate, setPickupDate] = useState(new Date().toISOString().split('T')[0]);
  const [pickupTime, setPickupTime] = useState('10:00');

  const [bookingSuccess, setBookingSuccess] = useState(null);

  // Active routes strictly with valid positive pricing
  const activeRoutes = useMemo(() => {
    return (destinations || []).filter(isRoutePriced);
  }, [destinations]);

  // Only cities that have a configured active route can appear in From (Pick-up)
  const availableFromCities = useMemo(() => {
    const set = new Set();
    activeRoutes.forEach(r => {
      if (r.pickup) set.add(r.pickup.trim());
      if (r.dropoff) set.add(r.dropoff.trim());
    });
    return Array.from(set).sort((a, b) => a.localeCompare(b));
  }, [activeRoutes]);

  // Destination cities strictly connected to selected pickupLocation in activeRoutes
  const availableToCities = useMemo(() => {
    if (!pickupLocation) return [];
    const pNorm = pickupLocation.toLowerCase().trim();
    const set = new Set();
    activeRoutes.forEach(r => {
      const rp = (r.pickup || '').toLowerCase().trim();
      const rd = (r.dropoff || '').toLowerCase().trim();
      if (rp === pNorm && r.dropoff) {
        set.add(r.dropoff.trim());
      } else if (rd === pNorm && r.pickup) {
        set.add(r.pickup.trim());
      }
    });
    return Array.from(set).sort((a, b) => a.localeCompare(b));
  }, [activeRoutes, pickupLocation]);

  // Keep pickupLocation in sync with available routes
  useEffect(() => {
    if (tripType === 'one-way') {
      if (availableFromCities.length > 0) {
        setPickupLocation(prev => {
          if (prev && availableFromCities.includes(prev)) return prev;
          return availableFromCities[0];
        });
      } else {
        setPickupLocation('');
      }
    }
  }, [availableFromCities, tripType]);

  // Keep dropoffDestination in sync with available destination routes for that pickup
  useEffect(() => {
    if (tripType === 'one-way') {
      if (availableToCities.length > 0) {
        setDropoffDestination(prev => {
          if (prev && availableToCities.includes(prev)) return prev;
          return availableToCities[0];
        });
      } else {
        setDropoffDestination('');
      }
    }
  }, [pickupLocation, availableToCities, tripType]);

  // Load destinations and vehicles from Admin Portal storage & MySQL
  useEffect(() => {
    const loadDynamicData = () => {
      const savedDest = localStorage.getItem('cabsy_destinations') || localStorage.getItem('cabsy_routes');
      const parsedDest = savedDest ? JSON.parse(savedDest) : [];
      setDestinations(Array.isArray(parsedDest) ? parsedDest : []);

      const savedVehicles = localStorage.getItem('cabsy_vehicles');
      const parsedVehicles = savedVehicles ? JSON.parse(savedVehicles) : (INITIAL_VEHICLES || FALLBACK_VEHICLES);
      const activeVehicles = parsedVehicles.filter(v => v.status !== 'Inactive');
      const finalVehicles = activeVehicles.length > 0 ? activeVehicles : FALLBACK_VEHICLES;
      setVehicles(finalVehicles);
      
      setSelectedVehicleId(prev => {
        if (finalVehicles.some(v => v.id === prev)) return prev;
        return finalVehicles[0]?.id || FALLBACK_VEHICLES[0].id;
      });

      loadAllVehiclesFromMySQL().then(fetched => {
        if (Array.isArray(fetched) && fetched.length > 0) {
          const active = fetched.filter(v => v.status !== 'Inactive');
          if (active.length > 0) {
            setVehicles(active);
            try { localStorage.setItem('cabsy_vehicles', JSON.stringify(fetched)); } catch(e) {}
          }
        }
      }).catch(() => {});

      loadAllRoutesFromMySQL().then(fetchedRoutes => {
        if (Array.isArray(fetchedRoutes) && fetchedRoutes.length > 0) {
          const formatted = fetchedRoutes.map(r => ({
            id: r.id,
            name: `${r.pickup} → ${r.dropoff}`,
            pickup: r.pickup,
            dropoff: r.dropoff,
            price: Number(r.price) || 0,
            duration: r.duration || '',
            car_prices: r.car_prices || {}
          }));
          setDestinations(formatted);
          safeStorageSetItem('cabsy_destinations', formatted);
          try {
            localStorage.setItem('cabsy_routes', JSON.stringify(formatted));
          } catch(e) {}
        }
      }).catch(() => {});
    };

    loadDynamicData();

    const handleStorageChange = () => {
      loadDynamicData();
    };

    window.addEventListener('storage', handleStorageChange);
    window.addEventListener('taxigo_vehicles_updated', handleStorageChange);
    window.addEventListener('EMPERIAL CABS_vehicles_updated', handleStorageChange);
    window.addEventListener('EMPERIAL CABS_destinations_updated', handleStorageChange);
    return () => {
      window.removeEventListener('storage', handleStorageChange);
      window.removeEventListener('taxigo_vehicles_updated', handleStorageChange);
      window.removeEventListener('EMPERIAL CABS_vehicles_updated', handleStorageChange);
      window.removeEventListener('EMPERIAL CABS_destinations_updated', handleStorageChange);
    };
  }, []);

  // Update KM and fixed route pricing whenever Pickup or Dropoff changes
  useEffect(() => {
    if (tripType === 'instant') return;
    const fromLoc = tripType === 'custom-trip' ? pickupCity : pickupLocation;
    const toLoc = tripType === 'custom-trip' ? dropoffCity : dropoffDestination;

    if (!fromLoc || !toLoc) {
      setMatchedRouteData(null);
      setFixedPrice(null);
      setIsMatchedRoute(false);
      return;
    }

    if (fromLoc === toLoc && tripType !== 'custom-trip') {
      setDistanceKm(0);
      setIsMatchedRoute(true);
      setMatchedRouteData(null);
      return;
    }

    let isCurrent = true;
    const fLower = fromLoc.toLowerCase().trim();
    const tLower = toLoc.toLowerCase().trim();

    const matched = activeRoutes.find(d => {
      if (!d || !d.pickup || !d.dropoff) return false;
      const dp = d.pickup.toLowerCase().trim();
      const dd = d.dropoff.toLowerCase().trim();
      return (dp === fLower && dd === tLower) ||
             (dp === tLower && dd === fLower) ||
             (dp.includes(fLower) && dd.includes(tLower)) ||
             (dp.includes(tLower) && dd.includes(fLower));
    });

    if (matched) {
      setMatchedRouteData(matched);
      if (matched.price !== undefined && matched.price !== null && matched.price !== '' && Number(matched.price) > 0) {
        setFixedPrice(Number(matched.price));
      } else {
        setFixedPrice(null);
      }
      setDistanceKm(Number(matched.distanceKm) || 154);
      setIsMatchedRoute(true);
    } else {
      setMatchedRouteData(null);
      setFixedPrice(null);
      setDistanceKm(175);
      setIsMatchedRoute(false);
    }

    // High scale O(1) live backend verification for exact route pricing
    getRoutePriceFromMySQL(fromLoc, toLoc).then(liveRoute => {
      if (!isCurrent || !liveRoute) return;
      const formattedLive = {
        id: liveRoute.id,
        name: `${liveRoute.pickup} → ${liveRoute.dropoff}`,
        pickup: liveRoute.pickup,
        dropoff: liveRoute.dropoff,
        price: Number(liveRoute.price) || 0,
        duration: liveRoute.duration || '',
        car_prices: liveRoute.car_prices || {}
      };
      setMatchedRouteData(formattedLive);
      if (formattedLive.price > 0) {
        setFixedPrice(formattedLive.price);
        setIsMatchedRoute(true);
      }
    }).catch(() => {});

    return () => {
      isCurrent = false;
    };
  }, [pickupLocation, dropoffDestination, pickupCity, dropoffCity, activeRoutes, tripType]);

  // Swap pickup & dropoff
  const handleSwapPlaces = () => {
    if (tripType === 'custom-trip') {
      const tempC = pickupCity;
      setPickupCity(dropoffCity);
      setDropoffCity(tempC);

      const tempAddr = exactPickupAddress;
      setExactPickupAddress(exactDropoffAddress);
      setExactDropoffAddress(tempAddr);
    } else {
      const temp = pickupLocation;
      setPickupLocation(dropoffDestination);
      setDropoffDestination(temp);
    }
  };

  const currentVehicle = vehicles.find(v => v.id === selectedVehicleId) || vehicles[0] || FALLBACK_VEHICLES[0];
  const ratePerKm = parseFloat(currentVehicle?.rate || 15);

  // Calculate effective distance & fare based on trip type (Minimum 300km/day for Round Trip)
  const effectiveDistanceKm = tripType === 'custom-trip' 
    ? Math.max(distanceKm > 10 ? distanceKm : 175, 300 * noOfDays) 
    : distanceKm;

  // Exact car price calculation helper: checks specific car_prices, then base fixed price
  const getVehicleFare = (veh) => {
    if (!veh) return { fare: '0.00', isFixed: false, available: false };
    if (tripType === 'custom-trip') {
      const kmFare = (effectiveDistanceKm * parseFloat(veh.rate || 15)).toFixed(2);
      return { fare: kmFare, isFixed: false, available: true };
    }
    if (tripType === 'instant') {
      return { fare: String(instantFare), isFixed: true, available: true };
    }

    // ONE-WAY DIRECT ROUTE:
    const cp = matchedRouteData?.car_prices;
    const hasConfiguredCarPrices = cp && typeof cp === 'object' && Object.values(cp).some(v => Number(v) > 0);

    // 1. Check exact car price configured for this vehicle on this route
    if (cp && typeof cp === 'object') {
      let directPrice = cp[veh.id] ?? cp[veh.name];
      if (directPrice === undefined || directPrice === null || directPrice === '') {
        const vNameNorm = (veh.name || '').toLowerCase().trim();
        const vIdNorm = (veh.id || '').toLowerCase().trim();
        for (const [key, val] of Object.entries(cp)) {
          const kNorm = key.toLowerCase().trim();
          if (kNorm === vNameNorm || kNorm === vIdNorm) {
            directPrice = val;
            break;
          }
        }
      }
      if (directPrice !== undefined && directPrice !== null && directPrice !== '' && !isNaN(Number(directPrice)) && Number(directPrice) > 0) {
        const numP = Number(directPrice);
        return {
          fare: numP.toFixed(2),
          isFixed: true,
          oneWayFixed: numP,
          available: true
        };
      }
    }

    // 2. Base fixed price multiplier ONLY IF NO individual car prices are configured on this route
    // If admin has configured individual car prices for this route, any unentered vehicle MUST NOT be shown!
    if (!hasConfiguredCarPrices && fixedPrice && fixedPrice > 0) {
      const isSevenSeater = (veh?.passengers && veh.passengers.includes('7')) || (veh?.name && (veh.name.toLowerCase().includes('ertiga') || veh.name.toLowerCase().includes('innova')));
      const isLuxury = veh?.name && (veh.name.toLowerCase().includes('innova') || veh.name.toLowerCase().includes('crysta'));
      const multiplier = isLuxury ? 1.7 : (isSevenSeater ? 1.35 : 1.0);
      const baseFixed = Math.round(fixedPrice * multiplier);
      return {
        fare: baseFixed.toFixed(2),
        isFixed: true,
        oneWayFixed: baseFixed,
        available: true
      };
    }

    // If no price entry exists for this car for this route, it is NOT available:
    return { fare: '0.00', isFixed: false, available: false };
  };

  // Vehicles displayed in selector:
  // "if the amount is not entry for that car then dont show that car for that route !!"
  const displayedVehicles = useMemo(() => {
    if (tripType === 'custom-trip') {
      return vehicles;
    }
    if (tripType === 'instant') {
      return [];
    }
    // For One-Way trips: STRICTLY ONLY SHOW CARS THAT HAVE AN ENTERED AMOUNT > 0!
    return vehicles.filter(v => {
      const fareInfo = getVehicleFare(v);
      return fareInfo.available && Number(fareInfo.fare) > 0;
    });
  }, [vehicles, tripType, matchedRouteData, fixedPrice, effectiveDistanceKm]);

  // Keep selectedVehicleId pointing to a valid visible vehicle
  useEffect(() => {
    if (tripType === 'one-way' && displayedVehicles.length > 0) {
      if (!displayedVehicles.some(v => v.id === selectedVehicleId)) {
        setSelectedVehicleId(displayedVehicles[0].id);
      }
    }
  }, [displayedVehicles, selectedVehicleId, tripType]);

  const calculatedFare = getVehicleFare(currentVehicle).fare;

  const handleSubmitBooking = (e) => {
    e.preventDefault();
    if (!customerName || !customerPhone) {
      alert("Please enter your name and phone number to complete booking.");
      return;
    }

    // 1. INSTANT TRIP SUBMISSION
    if (tripType === 'instant') {
      if (!instantPickup.trim()) {
        alert("Please enter your pickup location / address in Bhavnagar.");
        return;
      }
      if (!instantDropoff.trim()) {
        alert("Please enter your destination / dropoff address in Bhavnagar.");
        return;
      }

      const newInquiryId = db.getNextInquiryId();
      const vehName = instantVehicle === 'suv' ? 'SUV (Ertiga / XL6 - 6 Seater)' : 'Sedan (Swift / Aura / Dzire - 4 Seater)';
      const schedText = instantScheduleType === 'instant' ? 'Instant (10-15 Mins)' : `${pickupDate} ${pickupTime}`;

      const newInquiry = {
        id: newInquiryId,
        customerName: customerName.trim(),
        customerPhone: customerPhone.trim(),
        pickupCity: 'Bhavnagar',
        dropoffCity: 'Bhavnagar',
        pickup: instantPickup.trim(),
        dropoff: instantDropoff.trim(),
        exactPickupAddress: instantPickup.trim(),
        exactDropoffAddress: instantDropoff.trim(),
        vehicle: vehName,
        vehicleCategory: instantVehicle,
        selectedKm: instantKm,
        totalDistanceKm: instantKm,
        fare: instantFare,
        originalFare: instantFare,
        ratePerKm: instantExtraKmRate,
        extraKmRate: instantExtraKmRate,
        tripType: 'Short Trip',
        isShortTrip: true,
        scheduledDate: pickupDate,
        scheduledTime: schedText,
        driver: 'Unassigned',
        status: 'Pending',
        notes: `Instant Short Trip booked from website (${instantKm} KM package). Extra km rate: ₹${instantExtraKmRate}/km.`,
        timestamp: new Date().toISOString(),
        date: pickupDate
      };

      db.saveInquiry(newInquiry);
      saveInquiryToMySQL(newInquiry).catch(e => console.warn('MySQL book ride save failed:', e));

      notifyAdmin({
        type: 'short_trip',
        title: `New Short Trip Booking #${newInquiry.id} (${instantKm} KM)`,
        body: `Customer ${newInquiry.customerName} (${newInquiry.customerPhone}) booked Instant ${instantVehicle.toUpperCase()} for ${instantKm} KM: ${newInquiry.pickup} ➔ ${newInquiry.dropoff}. Fare: ₹${instantFare}`,
        extraData: { inquiryId: newInquiry.id, isShortTrip: true, tab: 'short_trips' }
      });

      setBookingSuccess(newInquiry);
      return;
    }

    // 2. ONE-WAY & CUSTOM TRIP SUBMISSION
    const isCustomMode = tripType === 'custom-trip';

    if (!isCustomMode) {
      if (activeRoutes.length === 0 || !pickupLocation || !dropoffDestination) {
        alert("No active direct route available to book. Please choose Round Trip for custom travel.");
        return;
      }
      const currentFareInfo = getVehicleFare(currentVehicle);
      if (!currentFareInfo.available || Number(currentFareInfo.fare) <= 0) {
        alert("The selected vehicle does not have pricing configured for this route. Please select another vehicle.");
        return;
      }
    }
    const finalPickupCity = isCustomMode ? (pickupCity.trim() || 'Bhavnagar') : (pickupLocation.split(',')[0] || pickupLocation);
    const finalDropoffCity = isCustomMode ? (dropoffCity.trim() || 'Ahmedabad') : (dropoffDestination.split(',')[0] || dropoffDestination);
    
    if (finalPickupCity.toLowerCase() === finalDropoffCity.toLowerCase() && !exactPickupAddress && !exactDropoffAddress) {
      alert("Pick-up city/location and drop-off city/destination cannot be identical!");
      return;
    }

    const finalPickupAddr = exactPickupAddress.trim() 
      ? `${exactPickupAddress.trim()}, ${finalPickupCity}` 
      : `${finalPickupCity}, Gujarat`;

    const finalDropoffAddr = exactDropoffAddress.trim() 
      ? `${exactDropoffAddress.trim()}, ${finalDropoffCity}` 
      : `${finalDropoffCity}, Gujarat`;

    const newInquiryId = db.getNextInquiryId();
    const newInquiry = {
      id: newInquiryId,
      customerName,
      customerPhone,
      pickupCity: finalPickupCity,
      dropoffCity: finalDropoffCity,
      pickup: finalPickupAddr,
      dropoff: finalDropoffAddr,
      exactPickupAddress: exactPickupAddress.trim() || finalPickupCity,
      exactDropoffAddress: exactDropoffAddress.trim() || finalDropoffCity,
      vehicle: currentVehicle.name,
      ratePerKm: parseFloat(currentVehicle.rate || 15),
      fare: isCustomMode ? parseFloat(currentVehicle.rate || 15) : parseFloat(calculatedFare),
      tripType: isCustomMode ? `Round Trip (${noOfDays} Day${noOfDays > 1 ? 's' : ''})` : 'One Way Trip',
      isCustom: isCustomMode,
      noOfDays: isCustomMode ? noOfDays : 1,
      totalDistanceKm: effectiveDistanceKm,
      status: 'Pending',
      driver: 'Unassigned',
      date: `${pickupDate} ${pickupTime}` + (isCustomMode && noOfDays > 1 ? ` (${noOfDays} Days)` : '')
    };

    db.saveInquiry(newInquiry);
    saveInquiryToMySQL(newInquiry).catch(e => console.warn('MySQL book ride save failed:', e));

    const adminFareText = isCustomMode 
      ? `₹${currentVehicle.rate}/km as per ${currentVehicle.name}` 
      : `₹${newInquiry.fare}`;

    notifyAdmin({
      type: isCustomMode ? 'custom-trip' : 'inquiry',
      title: `New Ride Inquiry ${newInquiry.id}`,
      body: `Customer ${newInquiry.customerName} (${newInquiry.customerPhone}) requested ${newInquiry.pickup} to ${newInquiry.dropoff} (${adminFareText})`,
      extraData: { inquiryId: newInquiry.id, tab: isCustomMode ? 'custom_inquiries' : 'inquiries' }
    });
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
          bookingSuccess.isShortTrip ? (
            /* LIGHT SUCCESS CONFIRMATION BOX FOR INSTANT CAB */
            <div className="light-success-card">
              <div className="success-icon-badge" style={{ background: '#ecfdf5', color: '#059669' }}>
                <CheckCircle2 size={54} />
              </div>
              <div style={{ display: 'inline-flex', alignItems: 'center', gap: '6px', background: '#FEF3C7', color: '#92400E', padding: '4px 12px', borderRadius: '20px', fontSize: '12px', fontWeight: '800', marginBottom: '8px' }}>
                <Zap size={14} color="#D97706" />
                <span>Instant Cab Dispatch Requested</span>
              </div>
              <h3>Instant Cab Booking Confirmed!</h3>
              <p className="subtitle">Your booking request reference is <strong>{bookingSuccess.id}</strong>.</p>

              <div className="success-details-list">
                <div className="detail-item">
                  <span>Passenger Name:</span>
                  <strong>{bookingSuccess.customerName}</strong>
                </div>
                <div className="detail-item">
                  <span>Contact Phone:</span>
                  <strong>{bookingSuccess.customerPhone}</strong>
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
                <div className="detail-item">
                  <span>Included Package:</span>
                  <strong>{bookingSuccess.selectedKm} KM Package</strong>
                </div>
                <div className="detail-item fare-item">
                  <span>Total Package Fare:</span>
                  <strong className="text-green text-xl">
                    ₹{Number(bookingSuccess.fare).toFixed(2)}
                  </strong>
                </div>
                <div className="detail-item" style={{ fontSize: '12px', color: '#64748b' }}>
                  <span>Package Terms:</span>
                  <span style={{ fontWeight: '600' }}>Includes {bookingSuccess.selectedKm} KM • Extra distance ₹{bookingSuccess.extraKmRate}/KM • Driver reaching in 10-15 mins</span>
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
            /* LIGHT SUCCESS CONFIRMATION BOX FOR ONE-WAY & OUTSTATION */
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
                  <span>{bookingSuccess.isCustom ? 'Billing Rate Structure:' : 'Total Calculated Fare:'}</span>
                  <strong className="text-green text-xl">
                    {bookingSuccess.isCustom 
                      ? `₹${bookingSuccess.ratePerKm || bookingSuccess.fare}/KM (As per Fleet Car)` 
                      : `₹${Number(bookingSuccess.fare).toFixed(2)}`}
                  </strong>
                </div>
                {bookingSuccess.isCustom && (
                  <div className="detail-item" style={{ fontSize: '12px', color: '#64748b' }}>
                    <span>Billing Terms:</span>
                    <span style={{ fontWeight: '600' }}>Actual KM traveled (300 KM/Day Min) • Toll, State Tax & Parking extra</span>
                  </div>
                )}
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
          )
        ) : (
          /* SINGLE-SCREEN LIGHT FORM GRID */
          <div className="light-booking-grid">
            
            {/* SINGLE COLUMN FLUID FORM WITH TRIP SUMMARY FIRST AND SUBMIT BUTTON AT THE VERY BOTTOM */}
            <div className="light-form-card" style={{ width: '100%' }}>
              <form onSubmit={handleSubmitBooking}>
                
                {/* STEP 1: TRIP TYPE SELECTION */}
                <div className="form-section">
                  <label className="section-title">
                    <Sparkles size={16} color="#0f172a" /> 1. Select Trip Type
                  </label>
                  
                  <div className="trip-type-selector-grid mt-2" style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(130px, 1fr))', gap: '12px' }}>
                    <button
                      type="button"
                      onClick={() => setTripType('one-way')}
                      style={{
                        padding: '14px 10px',
                        borderRadius: '14px',
                        border: tripType === 'one-way' ? '2px solid #E3B10F' : '1px solid #e2e8f0',
                        background: tripType === 'one-way' ? '#ffffff' : '#f8fafc',
                        color: tripType === 'one-way' ? '#0f172a' : '#64748b',
                        fontWeight: '800',
                        fontSize: '0.96rem',
                        cursor: 'pointer',
                        display: 'flex',
                        flexDirection: 'column',
                        alignItems: 'center',
                        gap: '4px',
                        boxShadow: tripType === 'one-way' ? '0 4px 12px rgba(227, 177, 15, 0.18)' : 'none',
                        transition: 'all 0.2s ease'
                      }}
                    >
                      <span>One Way Trip</span>
                      <span style={{ fontSize: '0.73rem', color: tripType === 'one-way' ? '#0f172a' : '#64748b', fontWeight: '600' }}>Direct Route</span>
                    </button>

                    <button
                      type="button"
                      onClick={() => setTripType('custom-trip')}
                      style={{
                        padding: '14px 10px',
                        borderRadius: '14px',
                        border: tripType === 'custom-trip' ? '2px solid #E3B10F' : '1px solid #e2e8f0',
                        background: tripType === 'custom-trip' ? '#ffffff' : '#f8fafc',
                        color: tripType === 'custom-trip' ? '#0f172a' : '#64748b',
                        fontWeight: '800',
                        fontSize: '0.96rem',
                        cursor: 'pointer',
                        display: 'flex',
                        flexDirection: 'column',
                        alignItems: 'center',
                        gap: '4px',
                        boxShadow: tripType === 'custom-trip' ? '0 4px 12px rgba(227, 177, 15, 0.18)' : 'none',
                        transition: 'all 0.2s ease'
                      }}
                    >
                      <span>Round Trip</span>
                      <span style={{ fontSize: '0.73rem', color: tripType === 'custom-trip' ? '#0f172a' : '#64748b', fontWeight: '600' }}>Outstation & Multi-Day</span>
                    </button>

                    <button
                      type="button"
                      onClick={() => setTripType('instant')}
                      style={{
                        padding: '14px 10px',
                        borderRadius: '14px',
                        border: tripType === 'instant' ? '2px solid #E3B10F' : '1px solid #e2e8f0',
                        background: tripType === 'instant' ? '#ffffff' : '#f8fafc',
                        color: tripType === 'instant' ? '#0f172a' : '#64748b',
                        fontWeight: '800',
                        fontSize: '0.96rem',
                        cursor: 'pointer',
                        display: 'flex',
                        flexDirection: 'column',
                        alignItems: 'center',
                        gap: '4px',
                        boxShadow: tripType === 'instant' ? '0 4px 12px rgba(227, 177, 15, 0.18)' : 'none',
                        transition: 'all 0.2s ease'
                      }}
                    >
                      <div style={{ display: 'flex', alignItems: 'center', gap: '5px' }}>
                        <Zap size={16} color={tripType === 'instant' ? '#d97706' : '#94a3b8'} fill={tripType === 'instant' ? '#d97706' : 'none'} />
                        <span>Instant Cab</span>
                      </div>
                      <span style={{ fontSize: '0.73rem', color: tripType === 'instant' ? '#0f172a' : '#64748b', fontWeight: '600' }}>City Rides (10 - 40 KM)</span>
                    </button>
                  </div>
                </div>

                {/* STEP 2: ROUTE PICKER */}
                <div className="form-section mt-3">
                  <label className="section-title">
                    <MapPin size={16} color="#0f172a" /> 2. Select Route Locations
                  </label>
                  
                  {/* Shared datalist for city & village autocomplete */}
                  <datalist id="cities-village-list">
                    {ALL_CITIES_AND_VILLAGES.map((c, idx) => (
                      <option key={idx} value={c} />
                    ))}
                  </datalist>

                  {/* Shared datalist for Bhavnagar instant local places */}
                  <datalist id="bhavnagar-places-list">
                    {BHAVNAGAR_20KM_PLACES.map((p, idx) => (
                      <option key={idx} value={p.name} />
                    ))}
                  </datalist>

                  {tripType === 'instant' ? (
                    /* INSTANT SHORT TRIP INPUTS: PACKAGE DISTANCE + BHAVNAGAR LOCATIONS */
                    <div style={{ background: '#f8fafc', border: '1px solid #e2e8f0', borderRadius: '16px', padding: '16px', marginTop: '10px' }}>
                      <div style={{ marginBottom: '14px' }}>
                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '8px' }}>
                          <span style={{ fontSize: '13px', fontWeight: '700', color: '#475569', textTransform: 'uppercase' }}>
                            SELECT DISTANCE PACKAGE
                          </span>
                          <span style={{ fontSize: '11px', fontWeight: '700', color: '#059669', background: '#ecfdf5', padding: '2px 8px', borderRadius: '6px' }}>
                            Extra KM: ₹{instantExtraKmRate}/KM
                          </span>
                        </div>

                        <div style={{ display: 'grid', gridTemplateColumns: `repeat(${availableInstantKmOptions.length}, 1fr)`, gap: '10px' }}>
                          {availableInstantKmOptions.map(km => (
                            <button
                              key={km}
                              type="button"
                              onClick={() => setInstantKm(km)}
                              style={{
                                padding: '10px 14px',
                                borderRadius: '12px',
                                border: instantKm === km ? '2px solid #E3B10F' : '1px solid #cbd5e1',
                                background: instantKm === km ? '#FFFBEB' : '#ffffff',
                                color: instantKm === km ? '#92400E' : '#334155',
                                fontWeight: '800',
                                fontSize: '14px',
                                cursor: 'pointer',
                                display: 'flex',
                                flexDirection: 'column',
                                alignItems: 'center',
                                gap: '2px',
                                transition: 'all 0.15s ease'
                              }}
                            >
                              <span>{km} KM</span>
                              <small style={{ fontSize: '11px', color: '#64748B', fontWeight: '600' }}>
                                From ₹{currentInstantVehPricing[`km${km}`] || (km === 10 ? 299 : 499)}
                              </small>
                            </button>
                          ))}
                        </div>
                      </div>

                      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(260px, 1fr))', gap: '12px' }}>
                        <div className="field-group">
                          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '4px' }}>
                            <span className="field-label" style={{ fontWeight: '700', color: '#334155', margin: 0 }}>
                              PICKUP LOCATION / LANDMARK
                            </span>
                            <button
                              type="button"
                              onClick={handleDetectLocation}
                              disabled={isDetectingLocation}
                              style={{
                                background: 'transparent',
                                border: 'none',
                                color: '#D97706',
                                fontSize: '11px',
                                fontWeight: '700',
                                cursor: 'pointer',
                                display: 'inline-flex',
                                alignItems: 'center',
                                gap: '4px',
                                padding: 0
                              }}
                            >
                              <Crosshair size={12} />
                              {isDetectingLocation ? 'Locating...' : 'Use GPS'}
                            </button>
                          </div>
                          <input 
                            type="text"
                            list="bhavnagar-places-list"
                            className="light-input"
                            placeholder="e.g. Waghawadi Road, Vidhyanagar, Bhavnagar..."
                            value={instantPickup}
                            onChange={e => setInstantPickup(e.target.value)}
                            required
                          />
                        </div>

                        <div className="field-group">
                          <span className="field-label" style={{ fontWeight: '700', color: '#334155' }}>
                            DROPOFF DESTINATION / ADDRESS
                          </span>
                          <input 
                            type="text"
                            list="bhavnagar-places-list"
                            className="light-input"
                            placeholder="e.g. Railway Station, Airport, or Ghogha Circle..."
                            value={instantDropoff}
                            onChange={e => setInstantDropoff(e.target.value)}
                            required
                          />
                        </div>
                      </div>
                    </div>
                  ) : tripType === 'custom-trip' ? (
                    /* CUSTOM OUTSTATION & MULTI-CITY INPUTS */
                    <div style={{ background: '#f8fafc', border: '1px solid #e2e8f0', borderRadius: '16px', padding: '16px', marginTop: '10px' }}>
                      <div style={{ display: 'grid', gridTemplateColumns: '1fr auto 1fr', gap: '10px', alignItems: 'center', marginBottom: '12px' }}>
                        <div className="field-group">
                          <span className="field-label" style={{ fontWeight: '700', color: '#475569' }}>PICKUP CITY / VILLAGE</span>
                          <input 
                            type="text"
                            list="cities-village-list"
                            className="light-input"
                            style={{ fontWeight: '700' }}
                            placeholder="Type city or village (e.g. Bhavnagar, Saand)..."
                            value={pickupCity}
                            onChange={e => setPickupCity(e.target.value)}
                            required
                          />
                        </div>

                        <button 
                          type="button" 
                          className="light-btn-swap"
                          style={{ marginTop: '18px' }}
                          title="Swap Pickup & Dropoff"
                          onClick={handleSwapPlaces}
                        >
                          <ArrowRightLeft size={16} />
                        </button>

                        <div className="field-group">
                          <span className="field-label" style={{ fontWeight: '700', color: '#475569' }}>DROPOFF CITY / VILLAGE</span>
                          <input 
                            type="text"
                            list="cities-village-list"
                            className="light-input"
                            style={{ fontWeight: '700' }}
                            placeholder="Type city or village (e.g. Ahmedabad, Mainpuri)..."
                            value={dropoffCity}
                            onChange={e => setDropoffCity(e.target.value)}
                            required
                          />
                        </div>
                      </div>

                      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '10px' }}>
                        <div className="field-group">
                          <span className="field-label">ACTUAL DETAILED PICKUP ADDRESS</span>
                          <input 
                            type="text"
                            className="light-input"
                            placeholder="e.g. House 14, Waghawadi Road, near Circle"
                            value={exactPickupAddress}
                            onChange={e => setExactPickupAddress(e.target.value)}
                          />
                        </div>

                        <div className="field-group">
                          <span className="field-label">ACTUAL DETAILED DROPOFF ADDRESS</span>
                          <input 
                            type="text"
                            className="light-input"
                            placeholder="e.g. Terminal 2, Airport or Main Chowk"
                            value={exactDropoffAddress}
                            onChange={e => setExactDropoffAddress(e.target.value)}
                          />
                        </div>
                      </div>
                    </div>
                  ) : activeRoutes.length === 0 ? (
                    /* CLEAN EMPTY STATE WHEN NO ONE-WAY ROUTES ARE CONFIGURED */
                    <div style={{ textAlign: 'center', padding: '28px 16px', background: '#f8fafc', borderRadius: '16px', border: '1.5px dashed #cbd5e1', marginTop: '10px' }}>
                      <MapPin size={28} color="#94a3b8" style={{ marginBottom: '8px' }} />
                      <h4 style={{ margin: '0 0 6px 0', fontSize: '15px', fontWeight: '800', color: '#1e293b' }}>
                        No One-Way Routes Currently Configured
                      </h4>
                      <p style={{ margin: '0 0 16px 0', fontSize: '13px', color: '#64748b', maxWidth: '420px', marginInline: 'auto' }}>
                        Direct routes configured by the administrator in the Admin Portal will appear here automatically. For any custom pickup and dropoff city, switch to <strong>Round Trip</strong> above.
                      </p>
                      <button 
                        type="button" 
                        onClick={() => setTripType('custom-trip')}
                        style={{ padding: '9px 18px', borderRadius: '10px', background: '#e3b10f', color: '#0f172a', fontWeight: '800', fontSize: '13px', border: 'none', cursor: 'pointer', boxShadow: '0 2px 6px rgba(227, 177, 15, 0.25)' }}
                      >
                        Switch to Round Trip (Any City)
                      </button>
                    </div>
                  ) : (
                    /* ONE-WAY TRIP DROPDOWNS STRICTLY FILTERED TO CONFIGURED ACTIVE ROUTES */
                    <div>
                      <div className="route-picker-row mt-2">
                        <div className="field-group">
                          <span className="field-label">From (Pick-up City/Area)</span>
                          <select 
                            className="light-select"
                            value={pickupLocation}
                            onChange={e => setPickupLocation(e.target.value)}
                            required
                          >
                            {availableFromCities.map((p, idx) => (
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
                          <span className="field-label">To (Drop-off Destination)</span>
                          <select 
                            className="light-select"
                            value={dropoffDestination}
                            onChange={e => setDropoffDestination(e.target.value)}
                            required
                          >
                            {availableToCities.map((p, idx) => (
                              <option key={idx} value={p}>{p}</option>
                            ))}
                          </select>
                        </div>
                      </div>

                      {/* EXACT PICKUP AND DROPOFF LOCATION INPUTS */}
                      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(260px, 1fr))', gap: '12px', marginTop: '12px' }}>
                        <div className="field-group">
                          <span className="field-label" style={{ fontWeight: '700', color: '#334155' }}>EXACT PICKUP LOCATION / ADDRESS</span>
                          <input 
                            type="text"
                            className="light-input"
                            placeholder={`e.g. Airport Terminal, Railway Station, Hotel, or Home in ${pickupLocation || 'pickup location'}...`}
                            value={exactPickupAddress}
                            onChange={e => setExactPickupAddress(e.target.value)}
                            required
                          />
                        </div>

                        <div className="field-group">
                          <span className="field-label" style={{ fontWeight: '700', color: '#334155' }}>EXACT DROPOFF LOCATION / ADDRESS</span>
                          <input 
                            type="text"
                            className="light-input"
                            placeholder={`e.g. Hotel, Office, Area, or Destination Address in ${dropoffDestination || 'destination'}...`}
                            value={exactDropoffAddress}
                            onChange={e => setExactDropoffAddress(e.target.value)}
                            required
                          />
                        </div>
                      </div>
                    </div>
                  )}
                  
                  {tripType === 'one-way' && activeRoutes.length > 0 && isMatchedRoute && (
                    <div className="route-distance-chip mt-2">
                      <span className="dot green"></span>
                      <span>Fixed Route: {pickupLocation} → {dropoffDestination}</span>
                    </div>
                  )}
                </div>

                {/* STEP 3: VEHICLE CHOICE */}
                <div className="form-section mt-3">
                  <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: '8px' }}>
                    <label className="section-title" style={{ margin: 0 }}>
                      <Car size={16} color="#0f172a" /> {tripType === 'instant' ? '3. Choose Instant Vehicle Class' : '3. Choose Vehicle Class'}
                    </label>
                    {tripType === 'instant' ? (
                      <span style={{ fontSize: '12px', fontWeight: '800', color: '#059669', background: '#ECFDF5', padding: '3px 10px', borderRadius: '8px', border: '1px solid #A7F3D0' }}>
                        Fixed {instantKm} KM Fare
                      </span>
                    ) : tripType === 'custom-trip' ? (
                      <span style={{ fontSize: '12px', fontWeight: '800', color: '#059669', background: '#ECFDF5', padding: '3px 10px', borderRadius: '8px', border: '1px solid #A7F3D0' }}>
                        Per KM Rate System
                      </span>
                    ) : null}
                  </div>

                  {tripType === 'custom-trip' && (
                    <div style={{ background: '#FFFBEB', border: '1.5px solid #FDE68A', borderRadius: '12px', padding: '10px 14px', marginTop: '10px', display: 'flex', alignItems: 'center', gap: '8px', color: '#92400E', fontSize: '13px', fontWeight: '700' }}>
                      <span style={{ fontSize: '15px' }}>ℹ️</span>
                      <span><strong>Important Note:</strong> 1 Day 300 KM fixed minimum. Toll, State Tax & Parking extra!</span>
                    </div>
                  )}

                  {tripType === 'instant' ? (
                    /* INSTANT SHORT TRIP VEHICLE CARDS (SEDAN & SUV) */
                    <div className="vehicle-light-grid mt-2">
                      <div 
                        className={`vehicle-light-card ${instantVehicle === 'sedan' ? 'active' : ''}`}
                        onClick={() => setInstantVehicle('sedan')}
                        style={{ cursor: 'pointer' }}
                      >
                        <img src={sedanShortImg} alt="Sedan Cab" className="vehicle-thumb" />
                        <div className="vehicle-info">
                          <h4 className="m-0 text-sm font-bold">Sedan (Swift / Aura / Dzire)</h4>
                          <small className="text-muted">1-4 Passengers • AC Sedan</small>
                        </div>
                        <div style={{ textAlign: 'right', display: 'flex', flexDirection: 'column', alignItems: 'flex-end', justifyContent: 'center' }}>
                          <span className="vehicle-price" style={{ color: '#059669', fontWeight: '800', fontSize: '1.05rem' }}>
                            ₹{instantPricing.sedan[`km${instantKm}`] || (instantKm === 10 ? 299 : 499)}
                          </span>
                          <span style={{ fontSize: '10px', color: '#059669', background: '#ECFDF5', padding: '1px 6px', borderRadius: '4px', fontWeight: '800' }}>
                            Fixed Package
                          </span>
                        </div>
                      </div>

                      <div 
                        className={`vehicle-light-card ${instantVehicle === 'suv' ? 'active' : ''}`}
                        onClick={() => setInstantVehicle('suv')}
                        style={{ cursor: 'pointer' }}
                      >
                        <img src={suvShortImg} alt="SUV Cab" className="vehicle-thumb" />
                        <div className="vehicle-info">
                          <h4 className="m-0 text-sm font-bold">SUV (Ertiga / XL6)</h4>
                          <small className="text-muted">1-6 Passengers • Spacious 7-Seater</small>
                        </div>
                        <div style={{ textAlign: 'right', display: 'flex', flexDirection: 'column', alignItems: 'flex-end', justifyContent: 'center' }}>
                          <span className="vehicle-price" style={{ color: '#059669', fontWeight: '800', fontSize: '1.05rem' }}>
                            ₹{instantPricing.suv[`km${instantKm}`] || (instantKm === 10 ? 449 : 699)}
                          </span>
                          <span style={{ fontSize: '10px', color: '#059669', background: '#ECFDF5', padding: '1px 6px', borderRadius: '4px', fontWeight: '800' }}>
                            Fixed Package
                          </span>
                        </div>
                      </div>
                    </div>
                  ) : displayedVehicles.length === 0 ? (
                    /* EMPTY STATE IF NO VEHICLES HAVE CONFIGURED PRICING FOR ROUTE */
                    <div style={{ textAlign: 'center', padding: '24px 16px', background: '#f8fafc', borderRadius: '14px', border: '1.5px dashed #cbd5e1', marginTop: '10px' }}>
                      <Car size={26} color="#94a3b8" style={{ marginBottom: '6px' }} />
                      <p style={{ margin: 0, fontSize: '14px', fontWeight: '700', color: '#475569' }}>
                        No vehicles currently configured with pricing for this direct route.
                      </p>
                      <p style={{ margin: '4px 0 0', fontSize: '12px', color: '#94a3b8' }}>
                        Please select another route or switch to Round Trip above.
                      </p>
                    </div>
                  ) : (
                    /* DYNAMIC FLEET VEHICLES: STRICTLY ONLY SHOWS CARS WITH ENTERED AMOUNT */
                    <div className="vehicle-light-grid mt-2">
                      {displayedVehicles.map(v => {
                        const fareInfo = getVehicleFare(v);
                        const isAvail = fareInfo.available;
                        const isCustomMode = tripType === 'custom-trip';
                        return (
                          <div 
                            key={v.id} 
                            className={`vehicle-light-card ${selectedVehicleId === v.id ? 'active' : ''}`}
                            style={{ opacity: isAvail ? 1 : 0.6, cursor: isAvail ? 'pointer' : 'not-allowed' }}
                            onClick={() => {
                              if (isAvail) setSelectedVehicleId(v.id);
                            }}
                          >
                            <img src={v.image} alt={v.name} className="vehicle-thumb" />
                            <div className="vehicle-info">
                              <h4 className="m-0 text-sm font-bold">{v.name}</h4>
                              <small className="text-muted">{v.passengers}</small>
                            </div>
                            <div style={{ textAlign: 'right', display: 'flex', flexDirection: 'column', alignItems: 'flex-end', justifyContent: 'center' }}>
                              {fareInfo.isFixed ? (
                                <>
                                  <span className="vehicle-price" style={{ color: '#059669', fontWeight: '800', fontSize: '1.05rem' }}>
                                    ₹{Math.round(Number(fareInfo.fare))}
                                  </span>
                                  <span style={{ fontSize: '10px', color: '#059669', background: '#ECFDF5', padding: '1px 6px', borderRadius: '4px', fontWeight: '800' }}>
                                    Fixed Total
                                  </span>
                                </>
                              ) : isCustomMode ? (
                                <>
                                  <span className="vehicle-price" style={{ color: '#0F172A', fontWeight: '800', fontSize: '1.05rem' }}>
                                    ₹{v.rate} <span style={{ fontSize: '12px', fontWeight: '600', color: '#64748B' }}>/ KM</span>
                                  </span>
                                  <span style={{ fontSize: '10px', color: '#047857', background: '#ECFDF5', padding: '1px 6px', borderRadius: '4px', fontWeight: '800' }}>
                                    Per KM Rate
                                  </span>
                                </>
                              ) : (
                                <span style={{ fontSize: '11px', color: '#94a3b8', fontWeight: '700' }}>Price Not Set</span>
                              )}
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  )}
                </div>

                {/* STEP 4: CONTACT & SCHEDULE */}
                <div className="form-section mt-3">
                  <label className="section-title">
                    <User size={16} color="#0f172a" /> {tripType === 'instant' ? '4. Passenger Details & Timing' : '4. Contact & Schedule'}
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
                        placeholder="+91 72268 44108"
                        value={customerPhone}
                        onChange={e => setCustomerPhone(e.target.value)}
                        required
                      />
                    </div>

                    {tripType === 'instant' ? (
                      <>
                        <div className="field-group">
                          <span className="field-label">Dispatch Timing</span>
                          <select 
                            className="light-select"
                            value={instantScheduleType}
                            onChange={e => setInstantScheduleType(e.target.value)}
                          >
                            <option value="instant">Instant (Reaching in 10-15 Mins)</option>
                            <option value="scheduled">Schedule for Later Today</option>
                          </select>
                        </div>

                        {instantScheduleType === 'scheduled' ? (
                          <div className="field-group">
                            <span className="field-label">Pickup Time</span>
                            <input 
                              type="time" 
                              className="light-input"
                              value={pickupTime}
                              onChange={e => setPickupTime(e.target.value)}
                              required
                            />
                          </div>
                        ) : (
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
                        )}
                      </>
                    ) : (
                      <>
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
                      </>
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
                        <strong>
                          {tripType === 'instant' ? (
                            instantPickup.trim() || 'Your Current / Pickup Address in Bhavnagar'
                          ) : exactPickupAddress.trim() ? (
                            `${exactPickupAddress.trim()} (${tripType === 'custom-trip' ? (pickupCity || 'Bhavnagar') : pickupLocation})`
                          ) : (
                            tripType === 'custom-trip' ? `${pickupCity || 'Bhavnagar'}, Gujarat` : pickupLocation
                          )}
                        </strong>
                      </div>
                    </div>

                    <div className="timeline-line"></div>

                    <div className="timeline-item">
                      <span className="timeline-dot red"></span>
                      <div>
                        <small>DROP-OFF DESTINATION</small>
                        <strong>
                          {tripType === 'instant' ? (
                            instantDropoff.trim() || 'Destination Address in Bhavnagar'
                          ) : exactDropoffAddress.trim() ? (
                            `${exactDropoffAddress.trim()} (${tripType === 'custom-trip' ? (dropoffCity || 'Ahmedabad') : dropoffDestination})`
                          ) : (
                            tripType === 'custom-trip' ? `${dropoffCity || 'Ahmedabad'}, Main Spot` : dropoffDestination
                          )}
                        </strong>
                      </div>
                    </div>
                  </div>

                  <div className="summary-list mt-3">
                    <div className="summary-row">
                      <span>Trip Type:</span>
                      <strong style={{ color: '#0f172a' }}>
                        {tripType === 'instant' 
                          ? `Instant Short Trip (${instantKm} KM Package)`
                          : tripType === 'custom-trip' 
                          ? `Round Trip (${noOfDays} Day${noOfDays > 1 ? 's' : ''})` 
                          : 'One Way Trip'}
                      </strong>
                    </div>

                    {tripType === 'instant' && (
                      <div className="summary-row">
                        <span>Included Package:</span>
                        <strong>{instantKm} KM Fixed Package</strong>
                      </div>
                    )}

                    {tripType === 'one-way' && (
                      <div className="summary-row">
                        <span>{fixedPrice ? 'Route Pricing:' : 'Total Distance:'}</span>
                        <strong>{fixedPrice ? `Fixed ₹${calculatedFare}` : `${effectiveDistanceKm} KM`}</strong>
                      </div>
                    )}

                    <div className="summary-row">
                      <span>Vehicle Class:</span>
                      <strong>
                        {tripType === 'instant' 
                          ? (instantVehicle === 'suv' ? 'SUV (Ertiga / XL6 - 6 Seater)' : 'Sedan (Swift / Aura - 4 Seater)')
                          : currentVehicle.name}
                      </strong>
                    </div>

                    <div className="summary-row">
                      <span>Rate Structure:</span>
                      <strong style={{ color: '#0f172a' }}>
                        {tripType === 'instant' 
                          ? `Fixed ₹${instantFare} (Includes ${instantKm} KM)`
                          : tripType === 'custom-trip' 
                          ? `₹${currentVehicle.rate} / KM (1 Day 300 KM fix)` 
                          : (fixedPrice ? 'Fixed Route Fare' : `₹${currentVehicle.rate} / km`)}
                      </strong>
                    </div>
                  </div>

                  <div className="fare-big-box mt-3">
                    <div className="fare-label">
                      {tripType === 'instant' 
                        ? 'Total Instant Package Fare' 
                        : tripType === 'custom-trip' 
                        ? 'Billing Rate (Per KM as per Fleet Car)' 
                        : 'Estimated Total Fare'}
                    </div>
                    <div className="fare-price">
                      {tripType === 'instant' 
                        ? `₹${instantFare}` 
                        : tripType === 'custom-trip' 
                        ? `₹${currentVehicle.rate} / KM` 
                        : `₹${calculatedFare}`}
                    </div>
                    {tripType === 'instant' ? (
                      <small className="fare-note" style={{ color: '#059669', fontWeight: '700', fontSize: '11px', lineHeight: '1.4' }}>
                        * Fixed transparent fare includes {instantKm} KM. Extra distance billed at ₹{instantExtraKmRate}/KM. Arriving within 10-15 mins.
                      </small>
                    ) : tripType === 'custom-trip' ? (
                      <small className="fare-note" style={{ color: '#b45309', fontWeight: '700', fontSize: '11px', lineHeight: '1.4' }}>
                        * Rate is per KM as per selected fleet vehicle ({currentVehicle.name}). Minimum 300 KM/day. Toll, State Tax & Parking extra as per actual receipts.
                      </small>
                    ) : (
                      <small className="fare-note">
                        Fixed transparent pricing with zero surge
                      </small>
                    )}
                  </div>

                  <div className="trust-badge mt-3">
                    <ShieldCheck size={18} color="#64748b" style={{ flexShrink: 0, display: 'block' }} />
                    <span style={{ fontSize: '13px', fontWeight: '600', color: '#475569', lineHeight: '1.2' }}>
                      {tripType === 'instant' 
                        ? 'Instant driver dispatch • Live status updates in portal.' 
                        : 'Instant confirmation & driver dispatch.'}
                    </span>
                  </div>
                </div>

                {/* FINAL ACTION BUTTON (VERY LAST AT THE BOTTOM) */}
                <button type="submit" className="light-submit-btn mt-3">
                  {tripType === 'instant' ? 'Book Instant Ride Now' : 'Book Ride Now'} <ChevronRight size={18} />
                </button>
              </form>
            </div>

          </div>
        )}
      </div>
    </div>
  );
}
