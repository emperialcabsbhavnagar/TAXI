import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { 
  GUJARAT_PRIMARY_CITIES, 
  POPULAR_FEATURED_ROUTES, 
  slugify 
} from '../data/seoKeywordsData';
import { loadAllRoutesFromMySQL, loadAllPlacesFromMySQL } from '../services/mysqlService';
import { 
  MapPin, 
  Search, 
  ArrowRight, 
  ChevronRight, 
  Navigation, 
  ShieldCheck, 
  Sparkles, 
  Car 
} from 'lucide-react';
import './PopularRoutes.css';

export default function PopularRoutes() {
  const [searchQuery, setSearchQuery] = useState('');
  const [dbRoutes, setDbRoutes] = useState([]);
  const [allCities, setAllCities] = useState(GUJARAT_PRIMARY_CITIES);

  useEffect(() => {
    document.title = "Gujarat Taxi Routes & Fares Directory | EMPERIAL CABS — Outstation Cab Booking";
    const metaDesc = document.querySelector('meta[name="description"]');
    if (metaDesc) {
      metaDesc.setAttribute('content', 'Explore all direct outstation taxi routes, fixed fares, and travel times across Bhavnagar, Ahmedabad, Vadodara, Surat, Rajkot, and all Gujarat cities with EMPERIAL CABS.');
    }

    // Load custom routes from MySQL
    loadAllRoutesFromMySQL().then(routes => {
      if (Array.isArray(routes) && routes.length > 0) {
        setDbRoutes(routes);
      }
    }).catch(() => {});

    // Load places from MySQL and merge any new cities added by admin
    loadAllPlacesFromMySQL().then(places => {
      if (Array.isArray(places) && places.length > 0) {
        const existingSlugs = new Set(GUJARAT_PRIMARY_CITIES.map(c => c.slug));
        const customCities = places
          .filter(p => p && typeof p === 'string' && !existingSlugs.has(slugify(p)))
          .map(p => ({
            name: p,
            slug: slugify(p),
            district: 'Service Hub',
            hub: 'Direct Fleet Coverage'
          }));
        if (customCities.length > 0) {
          setAllCities(prev => [...prev, ...customCities]);
        }
      }
    }).catch(() => {});
  }, []);

  // Combine static featured routes with any custom routes and prices configured in MySQL
  const allRoutesList = [
    ...POPULAR_FEATURED_ROUTES.map(featured => {
      const dbMatch = dbRoutes.find(r => 
        r && r.pickup && r.dropoff &&
        (r.pickup.toLowerCase().trim() === featured.from.toLowerCase().trim() || featured.from.toLowerCase().includes(r.pickup.toLowerCase().trim())) &&
        (r.dropoff.toLowerCase().trim() === featured.to.toLowerCase().trim() || featured.to.toLowerCase().includes(r.dropoff.toLowerCase().trim()))
      );
      if (dbMatch && dbMatch.price) {
        return {
          ...featured,
          baseFare: Number(dbMatch.price),
          distanceKm: dbMatch.distanceKm ? Number(dbMatch.distanceKm) : featured.distanceKm,
          duration: dbMatch.duration || featured.duration
        };
      }
      return featured;
    }),
    ...dbRoutes
      .filter(r => r && r.pickup && r.dropoff)
      .filter(r => !POPULAR_FEATURED_ROUTES.some(p => 
        p.from.toLowerCase().trim() === r.pickup.toLowerCase().trim() && 
        p.to.toLowerCase().trim() === r.dropoff.toLowerCase().trim()
      ))
      .map(r => ({
        from: r.pickup,
        to: r.dropoff,
        distanceKm: r.distanceKm ? Number(r.distanceKm) : 180,
        duration: r.duration || '3 hr 30 min',
        highway: 'Direct Highway Corridor',
        baseFare: Number(r.price) || 2500,
        badge: 'Direct Route'
      }))
  ];

  // Filter routes based on user search query
  const filteredRoutes = allRoutesList.filter(r => {
    if (!searchQuery.trim()) return true;
    const q = searchQuery.toLowerCase().trim();
    return r.from.toLowerCase().includes(q) || r.to.toLowerCase().includes(q);
  });

  return (
    <div className="popular-routes-page">
      {/* DIRECTORY HERO BANNER */}
      <section className="directory-hero">
        <div className="container">
          <div className="directory-breadcrumb">
            <Link to="/">Home</Link>
            <ChevronRight size={14} />
            <span>Gujarat Taxi Routes & Directory</span>
          </div>

          <div className="directory-hero-content text-center">
            <span className="directory-badge">
              <Navigation size={15} />
              <span>Full Gujarat Coverage</span>
            </span>
            <h1 className="directory-title">
              Gujarat Outstation Taxi Routes & Fixed Fares
            </h1>
            <p className="directory-subtitle">
              Browse direct city-to-city cab routes across Bhavnagar, Ahmedabad, Surat, Vadodara, Rajkot, and over 30+ destinations. Verified one-way pricing, zero hidden surge, and 24/7 doorstep pickup.
            </p>

            {/* Quick Route Search Bar */}
            <div className="directory-search-bar">
              <Search size={20} className="search-icon" />
              <input 
                type="text" 
                placeholder="Search any route (e.g. Bhavnagar, Ahmedabad, Surat, Rajkot)..." 
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
              />
              {searchQuery && (
                <button className="btn-clear-search" onClick={() => setSearchQuery('')}>✕</button>
              )}
            </div>
          </div>
        </div>
      </section>

      {/* FEATURED / POPULAR ROUTES GRID */}
      <section className="section routes-grid-section">
        <div className="container">
          <div className="section-header">
            <span className="section-badge">Top In-Demand Routes</span>
            <h2>Popular City-to-City Taxi Connections</h2>
            <p className="section-desc">
              Instant one-way and round-trip bookings with guaranteed on-time driver arrival.
            </p>
          </div>

          <div className="directory-cards-grid">
            {filteredRoutes.map((route, idx) => {
              const routeSlug = `${slugify(route.from)}-to-${slugify(route.to)}`;
              return (
                <div key={idx} className="directory-route-card">
                  <div className="d-route-header">
                    <div className="d-route-name">
                      <h3>{route.from} &rarr; {route.to}</h3>
                      <span className="d-highway-tag">{route.highway}</span>
                    </div>
                    <div className="d-price-badge">
                      <small>From</small>
                      <strong>₹{route.baseFare}</strong>
                    </div>
                  </div>

                  <div className="d-route-specs">
                    <span><Navigation size={14} /> {route.distanceKm} km</span>
                    <span className="spec-dot">•</span>
                    <span><Car size={14} /> ~{route.duration}</span>
                    <span className="spec-dot">•</span>
                    <span className="spec-oneway">One-Way / Round Trip</span>
                  </div>

                  <div className="d-card-footer">
                    <Link to={`/taxi/${routeSlug}`} className="d-btn-view">
                      View Fares & Schedule
                      <ArrowRight size={15} />
                    </Link>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      </section>

      {/* GUJARAT CITY HUBS (LOCAL TAXI DIRECTORY) */}
      <section className="section city-directory-section">
        <div className="container">
          <div className="section-header text-center">
            <span className="section-badge">Regional Coverage</span>
            <h2>Explore Taxi Services by Gujarat City & District</h2>
            <p className="section-desc">
              Dedicated 24/7 cab operations and local fleet dispatch centers across Gujarat.
            </p>
          </div>

          <div className="cities-directory-grid">
            {allCities.map((city, i) => {
              return (
                <Link key={i} to={`/taxi-service-in-${city.slug}`} className="city-directory-pill">
                  <div className="city-pill-icon"><MapPin size={16} /></div>
                  <div className="city-pill-text">
                    <strong>Taxi in {city.name}</strong>
                    <small>{city.district} • {city.hub}</small>
                  </div>
                  <ChevronRight size={16} className="city-arrow" />
                </Link>
              );
            })}
          </div>
        </div>
      </section>
    </div>
  );
}
