import React, { useState, useEffect } from 'react';
import { useParams, Link, useNavigate } from 'react-router-dom';
import { 
  parseRouteSlug, 
  calculateRouteEstimate, 
  generateRouteKeywords, 
  GUJARAT_PRIMARY_CITIES,
  slugify 
} from '../data/seoKeywordsData';
import { loadAllRoutesFromMySQL, loadAllVehiclesFromMySQL, getRoutePriceFromMySQL } from '../services/mysqlService';
import { 
  Car, 
  MapPin, 
  Clock, 
  ShieldCheck, 
  Phone, 
  CheckCircle2, 
  ChevronRight, 
  ArrowRight, 
  HelpCircle, 
  ChevronDown, 
  ChevronUp, 
  Award, 
  Calendar,
  Sparkles,
  Users
} from 'lucide-react';
import './RouteLandingPage.css';

export default function RouteLandingPage({ onOpenBooking }) {
  const { routeSlug } = useParams();
  const navigate = useNavigate();

  const parsed = parseRouteSlug(routeSlug) || { from: 'Bhavnagar', to: 'Ahmedabad' };
  const { from, to } = parsed;

  const [customRoutes, setCustomRoutes] = useState([]);
  const [openFaqIndex, setOpenFaqIndex] = useState(0);

  useEffect(() => {
    // Fast O(1) single-route live lookup
    if (from && to) {
      getRoutePriceFromMySQL(from, to).then(liveRoute => {
        if (liveRoute) {
          setCustomRoutes(prev => [liveRoute, ...prev.filter(r => r.id !== liveRoute.id)]);
        }
      }).catch(() => {});
    }

    loadAllRoutesFromMySQL().then(routes => {
      if (Array.isArray(routes) && routes.length > 0) {
        setCustomRoutes(routes);
      }
    }).catch(() => {});
  }, [from, to]);

  const routeDetails = calculateRouteEstimate(from, to, customRoutes);
  const isDirect = !!routeDetails;
  const { distanceKm = 0, duration = '', baseFare = null, highway = 'Direct Highway Corridor', car_prices = {} } = routeDetails || {};

  // Exact fixed fares for specific car categories if configured by Admin
  const sedanFare = isDirect ? Number(car_prices['CAR-101'] ?? car_prices['Swift Dzire'] ?? car_prices['Sedan'] ?? baseFare) : null;
  const suvFare = isDirect ? Number(car_prices['CAR-102'] ?? car_prices['Maruti Ertiga'] ?? car_prices['Ertiga'] ?? Math.round(baseFare * 1.35)) : null;
  const luxuryFare = isDirect ? Number(car_prices['CAR-103'] ?? car_prices['Innova Crysta'] ?? car_prices['Toyota Innova Crysta'] ?? Math.round(baseFare * 1.75)) : null;

  // Dynamic SEO Title, Description, Robots Meta and Structured Data
  useEffect(() => {
    let robotsMeta = document.querySelector('meta[name="robots"]');
    if (!robotsMeta) {
      robotsMeta = document.createElement('meta');
      robotsMeta.setAttribute('name', 'robots');
      document.head.appendChild(robotsMeta);
    }

    if (!isDirect) {
      // If route does not exist in MySQL or was deleted by Admin: tell Google to immediately DE-INDEX
      document.title = `${from} to ${to} Route Not Available | EMPERIAL CABS`;
      robotsMeta.setAttribute('content', 'noindex, nofollow');
      const el = document.getElementById('route-json-ld');
      if (el) el.remove();
      return () => {
        robotsMeta.setAttribute('content', 'index, follow');
      };
    }

    // Active route: allow Google indexing
    robotsMeta.setAttribute('content', 'index, follow');

    const pageTitle = `${from} to ${to} Taxi Service | Book One-Way & Round Trip Cab — EMPERIAL CABS`;
    const pageDesc = baseFare
      ? `Book verified AC cab from ${from} to ${to} starting at ₹${baseFare}. Zero hidden charges, clean cars & 24/7 doorstep pickup across Gujarat.`
      : `Book verified AC cab from ${from} to ${to}. Zero hidden charges, clean cars & 24/7 doorstep pickup across Gujarat.`;
    
    document.title = pageTitle;

    const metaDesc = document.querySelector('meta[name="description"]');
    if (metaDesc) metaDesc.setAttribute('content', pageDesc);

    // Dynamic Canonical Link
    let canonical = document.querySelector('link[rel="canonical"]');
    if (!canonical) {
      canonical = document.createElement('link');
      canonical.setAttribute('rel', 'canonical');
      document.head.appendChild(canonical);
    }
    canonical.setAttribute('href', `https://emperialcabs.com/taxi/${routeSlug}`);

    // Dynamic JSON-LD Structured Data
    const schemaScriptId = 'route-json-ld';
    let scriptTag = document.getElementById(schemaScriptId);
    if (!scriptTag) {
      scriptTag = document.createElement('script');
      scriptTag.id = schemaScriptId;
      scriptTag.type = 'application/ld+json';
      document.head.appendChild(scriptTag);
    }

    const structuredData = {
      "@context": "https://schema.org",
      "@graph": [
        {
          "@type": "TaxiService",
          "@id": `https://emperialcabs.com/taxi/${routeSlug}#service`,
          "name": `EMPERIAL CABS - ${from} to ${to} Taxi Service`,
          "url": `https://emperialcabs.com/taxi/${routeSlug}`,
          "serviceType": "Outstation Taxi & One-Way Cab",
          "provider": {
            "@type": "LocalBusiness",
            "name": "EMPERIAL CABS",
            "telephone": "+91-9876543210",
            "url": "https://emperialcabs.com"
          },
          "areaServed": [
            { "@type": "City", "name": from },
            { "@type": "City", "name": to },
            { "@type": "State", "name": "Gujarat" }
          ],
          "offers": {
            "@type": "Offer",
            "price": String(baseFare || 0),
            "priceCurrency": "INR",
            "availability": "https://schema.org/InStock",
            "validFrom": "2026-01-01"
          }
        },
        {
          "@type": "BreadcrumbList",
          "itemListElement": [
            { "@type": "ListItem", "position": 1, "name": "Home", "item": "https://emperialcabs.com/" },
            { "@type": "ListItem", "position": 2, "name": "Gujarat Taxi Routes", "item": "https://emperialcabs.com/routes" },
            { "@type": "ListItem", "position": 3, "name": `${from} to ${to} Taxi`, "item": `https://emperialcabs.com/taxi/${routeSlug}` }
          ]
        },
        {
          "@type": "FAQPage",
          "mainEntity": [
            {
              "@type": "Question",
              "name": `What is the taxi fare from ${from} to ${to}?`,
              "acceptedAnswer": {
                "@type": "Answer",
                "text": `One-way taxi fare from ${from} to ${to} with EMPERIAL CABS starts at ₹${baseFare} for an executive AC sedan (Swift/Aura) and ₹${suvFare} for a spacious 7-seater SUV (Ertiga).`
              }
            },
            {
              "@type": "Question",
              "name": `How much time does it take to travel from ${from} to ${to} by cab?`,
              "acceptedAnswer": {
                "@type": "Answer",
                "text": `The road distance between ${from} and ${to} is approximately ${distanceKm} km. A private cab trip typically takes about ${duration} via ${highway}.`
              }
            },
            {
              "@type": "Question",
              "name": `Can I book a one-way cab from ${from} to ${to}?`,
              "acceptedAnswer": {
                "@type": "Answer",
                "text": `Yes, EMPERIAL CABS specializes in verified one-way outstation cabs from ${from} to ${to}. You only pay for the distance travelled without paying round-trip return fare.`
              }
            },
            {
              "@type": "Question",
              "name": `How do I book a taxi from ${from} to ${to}?`,
              "acceptedAnswer": {
                "@type": "Answer",
                "text": `You can book instantly online on our website, through our mobile app, or by calling our 24/7 dispatch helpline at +91 98765 43210.`
              }
            }
          ]
        }
      ]
    };

    scriptTag.textContent = JSON.stringify(structuredData);

    return () => {
      const el = document.getElementById(schemaScriptId);
      if (el) el.remove();
      robotsMeta.setAttribute('content', 'index, follow');
    };
  }, [routeSlug, from, to, isDirect, baseFare, distanceKm, duration, highway, suvFare]);

  // Direct 1-Click Booking
  const handleBookNow = () => {
    if (onOpenBooking) {
      onOpenBooking({ pickup: `${from}, Gujarat`, dropoff: `${to}, Gujarat` });
    } else {
      navigate(`/book-ride?from=${encodeURIComponent(from)}&to=${encodeURIComponent(to)}`);
    }
  };

  // If route is not configured in MySQL or was deleted by Admin, render clean professional Unavailable state
  if (!isDirect) {
    return (
      <div className="route-landing-page">
        <section className="route-hero" style={{ padding: '60px 0 80px 0', minHeight: '60vh', display: 'flex', alignItems: 'center' }}>
          <div className="container" style={{ textAlign: 'center', maxWidth: '700px', margin: '0 auto' }}>
            <div className="route-breadcrumb" style={{ justifyContent: 'center', marginBottom: '20px' }}>
              <Link to="/">Home</Link>
              <ChevronRight size={14} />
              <Link to="/routes">Gujarat Taxi Routes</Link>
              <ChevronRight size={14} />
              <span>{from} to {to}</span>
            </div>

            <div style={{ background: '#FFFFFF', padding: '40px 24px', borderRadius: '24px', border: '1px solid #E2E8F0', boxShadow: '0 4px 20px rgba(0,0,0,0.04)' }}>
              <div style={{ width: '60px', height: '60px', borderRadius: '50%', background: '#FEF3C7', color: '#D97706', display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '0 auto 16px' }}>
                <MapPin size={30} />
              </div>
              <h1 style={{ fontSize: '24px', fontWeight: '800', color: '#0F172A', marginBottom: '10px' }}>
                {from} to {to} Route Not Currently Scheduled
              </h1>
              <p style={{ fontSize: '15px', color: '#64748B', lineHeight: '1.6', marginBottom: '26px' }}>
                This direct route is currently not an active fixed route in our fleet schedule. You can explore all currently active direct routes, or book a custom round-trip journey with 24/7 doorstep pickup.
              </p>

              <div style={{ display: 'flex', gap: '12px', justifyContent: 'center', flexWrap: 'wrap' }}>
                <Link to="/routes" className="btn-route-primary" style={{ textDecoration: 'none', display: 'inline-flex', alignItems: 'center', gap: '8px', padding: '12px 24px' }}>
                  <span>Explore Active Routes</span>
                  <ArrowRight size={16} />
                </Link>
                <Link to="/book-ride" className="btn-route-secondary" style={{ textDecoration: 'none', display: 'inline-flex', alignItems: 'center', gap: '8px', padding: '12px 24px' }}>
                  <Sparkles size={16} />
                  <span>Book Custom Journey</span>
                </Link>
              </div>

              <div style={{ marginTop: '28px', paddingTop: '18px', borderTop: '1px solid #F1F5F9', fontSize: '13px', color: '#64748B' }}>
                Have questions or need assistance? Call 24/7 Helpline: <a href="tel:+919876543210" style={{ color: '#0F172A', fontWeight: '700' }}>+91 98765 43210</a>
              </div>
            </div>
          </div>
        </section>
      </div>
    );
  }

  const faqs = [
    {
      q: `What is the taxi fare from ${from} to ${to}?`,
      a: `One-way cab fare from ${from} to ${to} starts at ₹${baseFare} for an executive sedan (Swift Dzire / Aura), ₹${suvFare} for an Ertiga 7-seater, and ₹${luxuryFare} for Innova Crysta. All rates are all-inclusive with zero hidden costs.`
    },
    {
      q: `How long does the journey take from ${from} to ${to}?`,
      a: `The approximate driving distance is ${distanceKm} km, and travel time is usually around ${duration} depending on traffic and route conditions via ${highway}.`
    },
    {
      q: `Are toll taxes and driver allowances included?`,
      a: `Yes! EMPERIAL CABS ensures full billing transparency. Our dispatchers provide clean breakdown invoices covering vehicle fare, highway tolls, and professional driver allowances.`
    },
    {
      q: `Can I schedule a night or early morning pickup?`,
      a: `Absolutely. We operate 24 hours a day, 7 days a week. You can book doorstep pickup in ${from} for airport flights, business meetings, or family trips at any hour.`
    },
    {
      q: `What types of vehicles are available on this route?`,
      a: `We maintain a modern, commercial-permitted fleet including 4-seater executive sedans, spacious 6–7 seater SUVs (Ertiga / Innova), and green eco electric vehicles.`
    }
  ];

  // Related nearby routes for internal link building & SEO crawl depth
  const otherDestinations = GUJARAT_PRIMARY_CITIES
    .filter(c => c.name.toLowerCase() !== from.toLowerCase() && c.name.toLowerCase() !== to.toLowerCase())
    .slice(0, 8);

  return (
    <div className="route-landing-page">
      {/* ROUTE HERO SECTION */}
      <section className="route-hero">
        <div className="container">
          <div className="route-breadcrumb">
            <Link to="/">Home</Link>
            <ChevronRight size={14} />
            <Link to="/routes">Gujarat Taxi Routes</Link>
            <ChevronRight size={14} />
            <span>{from} to {to}</span>
          </div>

          <div className="route-hero-grid">
            <div className="route-hero-content">
              <div className="route-badge">
                <ShieldCheck size={16} />
                <span>Verified Direct Highway Cab Service</span>
              </div>
              <h1 className="route-title">
                {from} to {to} Taxi Service
              </h1>
              <p className="route-subtitle">
                Book verified one-way and round-trip outstation cabs with EMPERIAL CABS. 
                Guaranteed on-time doorstep pickup, sanitized clean vehicles, and professional chauffeurs across Gujarat.
              </p>

              <div className="route-key-metrics">
                <div className="metric-item">
                  <span className="metric-label">{isDirect ? 'Distance' : 'Service Type'}</span>
                  <span className="metric-value">{isDirect ? `${distanceKm} km` : 'Door-to-Door'}</span>
                </div>
                <div className="metric-divider"></div>
                <div className="metric-item">
                  <span className="metric-label">{isDirect ? 'Travel Time' : 'Availability'}</span>
                  <span className="metric-value">{isDirect && duration ? duration : '24/7 On Demand'}</span>
                </div>
                <div className="metric-divider"></div>
                <div className="metric-item">
                  <span className="metric-label">Starting Fare</span>
                  <span className="metric-value text-green">{isDirect && baseFare ? `₹${baseFare}` : '₹15 / km'}</span>
                </div>
              </div>

              <div className="route-cta-group">
                <button onClick={handleBookNow} className="btn-route-primary">
                  <span>Book {from} to {to} Cab</span>
                  <ArrowRight size={18} />
                </button>
                <a href="tel:+919876543210" className="btn-route-secondary">
                  <Phone size={18} />
                  <span>Call 24/7 Helpline</span>
                </a>
              </div>
            </div>

            {/* QUICK BOOKING SUMMARY CARD */}
            <div className="route-hero-card">
              <div className="quick-booking-box">
                <div className="box-header">
                  <h3>Instant Fare Summary</h3>
                  <span className="badge-guaranteed">Best Rate Guaranteed</span>
                </div>

                <div className="route-itinerary">
                  <div className="itinerary-stop">
                    <div className="stop-dot pickup-dot"></div>
                    <div>
                      <small>Pick-up Location</small>
                      <h4>{from}, Gujarat</h4>
                    </div>
                  </div>
                  <div className="itinerary-line"></div>
                  <div className="itinerary-stop">
                    <div className="stop-dot dropoff-dot"></div>
                    <div>
                      <small>Drop-off Destination</small>
                      <h4>{to}, Gujarat</h4>
                    </div>
                  </div>
                </div>

                <div className="fare-highlight-box">
                  <div className="fare-row">
                    <span>Sedan (Swift / Aura)</span>
                    <strong>{isDirect && sedanFare ? `₹${sedanFare}` : '₹15 / km'}</strong>
                  </div>
                  <div className="fare-row">
                    <span>SUV (Ertiga 7-Seater)</span>
                    <strong>{isDirect && suvFare ? `₹${suvFare}` : '₹22 / km'}</strong>
                  </div>
                  <div className="fare-row">
                    <span>Trip Type</span>
                    <span className="tag-oneway">One-Way / Round Trip</span>
                  </div>
                </div>

                <div className="route-perks-list">
                  <div className="perk-item"><CheckCircle2 size={16} /> Doorstep pickup anywhere in {from}</div>
                  <div className="perk-item"><CheckCircle2 size={16} /> Transparent fixed pricing with zero surge</div>
                  <div className="perk-item"><CheckCircle2 size={16} /> 24x7 emergency and trip support</div>
                </div>

                <button onClick={handleBookNow} className="btn-book-full">
                  Instant Online Booking
                </button>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* VEHICLE TIER COMPARISON */}
      <section className="section vehicle-tier-section">
        <div className="container">
          <div className="section-header text-center">
            <span className="section-badge">Fleet Options</span>
            <h2>Select Your Preferred Vehicle for {from} to {to}</h2>
            <p className="section-desc">
              Choose from our well-maintained, commercially insured fleet tailored for executive travel, family holidays, and airport runs.
            </p>
          </div>

          <div className="vehicles-pricing-grid">
            {/* Sedan */}
            <div className="veh-card">
              <div className="veh-header">
                <h3>Executive Sedan</h3>
                <span className="veh-model">Maruti Swift Dzire / Hyundai Aura</span>
              </div>
              <div className="veh-capacity">
                <Users size={16} /> 4 Passengers + Luggage
              </div>
              <div className="veh-price-block">
                <span className="currency">₹</span>
                <span className="amount">{sedanFare}</span>
                <span className="period">All-Inclusive Fixed Fare</span>
              </div>
              <ul className="veh-features">
                <li><CheckCircle2 size={15} /> Air Conditioned throughout</li>
                <li><CheckCircle2 size={15} /> Generous boot space for bags</li>
                <li><CheckCircle2 size={15} /> Highly fuel-efficient & smooth</li>
              </ul>
              <button onClick={handleBookNow} className="btn-veh-select">Select Sedan</button>
            </div>

            {/* SUV */}
            <div className="veh-card featured-card">
              <div className="popular-badge">Most Popular for Families</div>
              <div className="veh-header">
                <h3>Spacious 7-Seater SUV</h3>
                <span className="veh-model">Maruti Suzuki Ertiga</span>
              </div>
              <div className="veh-capacity">
                <Users size={16} /> 6–7 Passengers + Luggage
              </div>
              <div className="veh-price-block">
                <span className="currency">₹</span>
                <span className="amount">{suvFare}</span>
                <span className="period">All-Inclusive Fixed Fare</span>
              </div>
              <ul className="veh-features">
                <li><CheckCircle2 size={15} /> Extra legroom for long highway trips</li>
                <li><CheckCircle2 size={15} /> Rear AC vents for passenger comfort</li>
                <li><CheckCircle2 size={15} /> Ideal for outstation family travel</li>
              </ul>
              <button onClick={handleBookNow} className="btn-veh-select btn-featured">Select 7-Seater</button>
            </div>

            {/* Luxury */}
            <div className="veh-card">
              <div className="veh-header">
                <h3>Executive Luxury</h3>
                <span className="veh-model">Toyota Innova Crysta</span>
              </div>
              <div className="veh-capacity">
                <Users size={16} /> 7 Passengers + Heavy Luggage
              </div>
              <div className="veh-price-block">
                <span className="currency">₹</span>
                <span className="amount">{luxuryFare}</span>
                <span className="period">All-Inclusive Fixed Fare</span>
              </div>
              <ul className="veh-features">
                <li><CheckCircle2 size={15} /> Plush captain seats & cabin luxury</li>
                <li><CheckCircle2 size={15} /> Maximum safety & suspension quality</li>
                <li><CheckCircle2 size={15} /> Premier VIP mobility experience</li>
              </ul>
              <button onClick={handleBookNow} className="btn-veh-select">Select Luxury</button>
            </div>
          </div>
        </div>
      </section>

      {/* ROUTE TRAVEL GUIDE & ROAD HIGHLIGHTS */}
      <section className="section route-guide-section">
        <div className="container">
          <div className="grid-2-cols align-start">
            <div>
              <span className="section-badge">Trip Overview</span>
              <h2>About Traveling from {from} to {to}</h2>
              <p className="guide-text">
                The road journey from <strong>{from}</strong> to <strong>{to}</strong> spans approximately <strong>{distanceKm} km</strong> and takes around <strong>{duration}</strong> via {highway}.
              </p>
              <p className="guide-text">
                Choosing a private taxi with EMPERIAL CABS ensures you travel on your own schedule without waiting for bus timetables or crowded public transit. Whether you are traveling for corporate meetings, academic visits, airport transfers, or leisure, our chauffeurs ensure a smooth ride.
              </p>

              <div className="route-highlights-box">
                <h4>Trip Highlights:</h4>
                <div className="highlight-pill-list">
                  <span className="pill">Doorstep Pick-up in {from}</span>
                  <span className="pill">Direct Express Highway</span>
                  <span className="pill">Flexible Refreshment Stops</span>
                  <span className="pill">Airport / Station Drop-off in {to}</span>
                  <span className="pill">GPS Monitored Rides</span>
                </div>
              </div>
            </div>

            <div className="guide-info-card">
              <h3>Why Riders Trust EMPERIAL CABS</h3>
              <div className="trust-points">
                <div className="point-item">
                  <div className="point-icon"><ShieldCheck size={20} /></div>
                  <div>
                    <h5>Verified Chauffeurs</h5>
                    <p>All drivers undergo background checks and carry complete commercial licensing with deep knowledge of Gujarat highways.</p>
                  </div>
                </div>
                <div className="point-item">
                  <div className="point-icon"><Clock size={20} /></div>
                  <div>
                    <h5>Guaranteed Punctuality</h5>
                    <p>Your cab arrives 15 minutes before the scheduled departure time, keeping your airport and meeting timelines secure.</p>
                  </div>
                </div>
                <div className="point-item">
                  <div className="point-icon"><Award size={20} /></div>
                  <div>
                    <h5>Clean & Sanitized Vehicles</h5>
                    <p>Every vehicle is thoroughly vacuumed, washed, and sanitized prior to every dispatch.</p>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* FREQUENTLY ASKED QUESTIONS (FAQ RICH SNIPPET) */}
      <section className="section route-faq-section">
        <div className="container">
          <div className="section-header text-center">
            <span className="section-badge">Answers to Common Questions</span>
            <h2>{from} to {to} Taxi Booking FAQs</h2>
          </div>

          <div className="faq-accordion-box">
            {faqs.map((faq, idx) => {
              const isOpen = openFaqIndex === idx;
              return (
                <div key={idx} className={`faq-card ${isOpen ? 'open' : ''}`}>
                  <button 
                    className="faq-question-btn" 
                    onClick={() => setOpenFaqIndex(isOpen ? -1 : idx)}
                  >
                    <span>{faq.q}</span>
                    {isOpen ? <ChevronUp size={20} /> : <ChevronDown size={20} />}
                  </button>
                  {isOpen && (
                    <div className="faq-answer-content">
                      <p>{faq.a}</p>
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        </div>
      </section>

      {/* RELATED POPULAR GUJARAT ROUTES (SEO INTERNAL LINKING) */}
      <section className="section other-routes-section">
        <div className="container">
          <div className="section-header">
            <h3>Other Popular Outstation Taxi Routes from {from}</h3>
            <p className="small-desc">Explore direct one-way and round-trip routes across Gujarat with fixed fares.</p>
          </div>

          <div className="related-routes-grid">
            {otherDestinations.map((dest, i) => {
              const slug = `${slugify(from)}-to-${dest.slug}`;
              return (
                <Link key={i} to={`/taxi/${slug}`} className="related-route-card">
                  <div className="route-arrow-title">
                    <span>{from}</span>
                    <ArrowRight size={14} />
                    <span>{dest.name}</span>
                  </div>
                  <span className="route-view-link">View Fares & Schedule &rarr;</span>
                </Link>
              );
            })}
          </div>
        </div>
      </section>

      {/* STICKY BOTTOM MOBILE ACTION BAR */}
      <div className="sticky-mobile-route-bar">
        <div className="bar-info">
          <span className="bar-sub">{from} &rarr; {to}</span>
          <span className="bar-price">From ₹{baseFare}</span>
        </div>
        <button onClick={handleBookNow} className="btn-mobile-book">
          Book Cab
        </button>
      </div>
    </div>
  );
}
