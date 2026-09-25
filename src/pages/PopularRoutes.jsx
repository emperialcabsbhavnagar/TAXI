import React, { useState, useEffect, useMemo } from 'react';
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
  }, []);

  // Strictly display only routes configured by Admin in MySQL with valid positive pricing
  const allRoutesList = dbRoutes
    .filter(r => {
      if (!r || !r.pickup || !r.dropoff) return false;
      const baseP = Number(r.price) || 0;
      if (baseP > 0) return true;
      if (r.car_prices && typeof r.car_prices === 'object') {
        return Object.values(r.car_prices).some(v => Number(v) > 0);
      }
      return false;
    })
    .map(r => {
      const baseP = Number(r.price) || 0;
      let carPriceVals = [];
      if (r.car_prices && typeof r.car_prices === 'object') {
        carPriceVals = Object.values(r.car_prices).map(Number).filter(v => v > 0);
      }
      const startingFare = baseP > 0 ? (carPriceVals.length > 0 ? Math.min(baseP, ...carPriceVals) : baseP) : (carPriceVals.length > 0 ? Math.min(...carPriceVals) : 0);

      return {
        from: r.pickup,
        to: r.dropoff,
        distanceKm: r.distanceKm ? Number(r.distanceKm) : 0,
        duration: r.duration || '',
        highway: r.highway || 'Direct Route',
        baseFare: startingFare,
        badge: 'Direct Route'
      };
    });

  // Derive only cities that have active routes configured in MySQL
  const activeCitiesList = useMemo(() => {
    const cityMap = new Map();
    allRoutesList.forEach(r => {
      [r.from, r.to].forEach(cName => {
        if (cName && typeof cName === 'string') {
          const s = slugify(cName);
          if (!cityMap.has(s)) {
            const foundObj = GUJARAT_PRIMARY_CITIES.find(g => slugify(g.name) === s || g.slug === s);
            cityMap.set(s, {
              name: cName,
              slug: s,
              district: foundObj ? foundObj.district : 'Service Hub',
              hub: foundObj ? foundObj.hub : 'Direct Fleet Hub'
            });
          }
        }
      });
    });
    return Array.from(cityMap.values()).sort((a, b) => a.name.localeCompare(b.name));
  }, [allRoutesList]);

  // Filter routes based on user search query
  const filteredRoutes = allRoutesList.filter(r => {
    if (!searchQuery.trim()) return true;
    const q = searchQuery.toLowerCase().trim();
    return r.from.toLowerCase().includes(q) || r.to.toLowerCase().includes(q);
  });

  const [visibleCount, setVisibleCount] = useState(24);
  const visibleRoutes = filteredRoutes.slice(0, visibleCount);

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
                onChange={(e) => {
                  setSearchQuery(e.target.value);
                  setVisibleCount(24);
                }}
              />
              {searchQuery && (
                <button className="btn-clear-search" onClick={() => { setSearchQuery(''); setVisibleCount(24); }}>✕</button>
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
            <h2>Popular City-to-City Taxi Connections ({filteredRoutes.length} Available)</h2>
            <p className="section-desc">
              Instant one-way and round-trip bookings with guaranteed on-time driver arrival.
            </p>
          </div>

          {visibleRoutes.length === 0 ? (
            <div style={{ textAlign: 'center', padding: '48px 24px', background: '#F8FAFC', borderRadius: '16px', border: '1.5px dashed #CBD5E1' }}>
              <Navigation size={32} color="#94A3B8" style={{ marginBottom: '12px' }} />
              <h3 style={{ fontSize: '18px', fontWeight: '700', color: '#1E293B', marginBottom: '8px' }}>
                {searchQuery ? `No routes found matching "${searchQuery}"` : "No direct routes currently configured"}
              </h3>
              <p style={{ fontSize: '14px', color: '#64748B', maxWidth: '480px', margin: '0 auto 20px' }}>
                {searchQuery ? "Try searching for a different city or location name." : "Direct routes configured by the administrator in the Admin Portal will appear here."}
              </p>
              <Link to="/book-ride" className="btn-city-primary" style={{ display: 'inline-flex', alignItems: 'center', gap: '8px', padding: '10px 20px', borderRadius: '10px', background: '#0F172A', color: '#FFF', textDecoration: 'none', fontWeight: '600', fontSize: '14px' }}>
                <span>Book Custom Route</span>
                <ArrowRight size={16} />
              </Link>
            </div>
          ) : (
            <div className="directory-cards-grid">
              {visibleRoutes.map((route, idx) => {
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
          )}

          {visibleCount < filteredRoutes.length && (
            <div style={{ textAlign: 'center', marginTop: '2.5rem' }}>
              <button 
                type="button"
                style={{
                  padding: '0.85rem 2.2rem',
                  fontSize: '0.95rem',
                  fontWeight: 600,
                  color: '#ffffff',
                  background: '#111827',
                  border: '1px solid #374151',
                  borderRadius: '10px',
                  cursor: 'pointer',
                  transition: 'all 0.2s ease',
                  boxShadow: '0 4px 12px rgba(0,0,0,0.1)'
                }}
                onClick={() => setVisibleCount(prev => prev + 24)}
              >
                Load More Routes ({filteredRoutes.length - visibleCount} more)
              </button>
            </div>
          )}
        </div>
      </section>

      {/* GUJARAT CITY HUBS (LOCAL TAXI DIRECTORY - DYNAMICALLY TIED TO ACTIVE ROUTES) */}
      <section className="section city-directory-section">
        <div className="container">
          <div className="section-header text-center">
            <span className="section-badge">Regional Coverage</span>
            <h2>Explore Taxi Services by Active City Hubs</h2>
            <p className="section-desc">
              Dedicated 24/7 cab operations and verified fleet hubs across our active route network.
            </p>
          </div>

          {activeCitiesList.length === 0 ? (
            <div style={{ textAlign: 'center', padding: '36px 16px', background: '#F8FAFC', borderRadius: '16px', border: '1.5px dashed #CBD5E1', maxWidth: '580px', margin: '0 auto' }}>
              <MapPin size={28} color="#94A3B8" style={{ marginBottom: '8px' }} />
              <h3 style={{ fontSize: '16px', fontWeight: '700', color: '#1E293B', marginBottom: '6px' }}>
                City Hubs Synchronized to Active Routes
              </h3>
              <p style={{ fontSize: '13px', color: '#64748B', margin: 0 }}>
                Regional service hubs are automatically displayed here as direct routes are scheduled by the dispatch administrator.
              </p>
            </div>
          ) : (
            <div className="cities-directory-grid">
              {activeCitiesList.map((city, i) => (
                <Link key={i} to={`/taxi-service-in-${city.slug}`} className="city-directory-pill">
                  <div className="city-pill-icon"><MapPin size={16} /></div>
                  <div className="city-pill-text">
                    <strong>Taxi in {city.name}</strong>
                    <small>{city.district} • {city.hub}</small>
                  </div>
                  <ChevronRight size={16} className="city-arrow" />
                </Link>
              ))}
            </div>
          )}
        </div>
      </section>
    </div>
  );
}
