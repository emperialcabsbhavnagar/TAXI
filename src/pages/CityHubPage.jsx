import React, { useState, useEffect } from 'react';
import { useParams, Link, useNavigate } from 'react-router-dom';
import { 
  findCityBySlug, 
  GUJARAT_PRIMARY_CITIES, 
  slugify,
  generateCityKeywords 
} from '../data/seoKeywordsData';
import { 
  MapPin, 
  Car, 
  ShieldCheck, 
  Phone, 
  Clock, 
  ArrowRight, 
  CheckCircle2, 
  ChevronRight, 
  ChevronDown, 
  ChevronUp, 
  Users, 
  Star 
} from 'lucide-react';
import './CityHubPage.css';

export default function CityHubPage({ onOpenBooking }) {
  const { citySlug } = useParams();
  const navigate = useNavigate();

  const cityObj = findCityBySlug(citySlug) || { 
    name: citySlug ? citySlug.replace(/-/g, ' ').replace(/\b\w/g, l => l.toUpperCase()) : 'Bhavnagar',
    district: 'Gujarat',
    hub: 'City Center'
  };
  const cityName = cityObj.name;

  const [openFaqIndex, setOpenFaqIndex] = useState(0);

  // Dynamic SEO Title and Metadata
  useEffect(() => {
    const pageTitle = `Taxi Service in ${cityName} | #1 Cab Booking & Outstation Taxi — EMPERIAL CABS`;
    const pageDesc = `Looking for the best taxi service in ${cityName}? Book 24/7 verified one-way cabs, local rentals & outstation airport transfers with EMPERIAL CABS at lowest rates.`;

    document.title = pageTitle;

    const metaDesc = document.querySelector('meta[name="description"]');
    if (metaDesc) metaDesc.setAttribute('content', pageDesc);

    // Canonical Link
    let canonical = document.querySelector('link[rel="canonical"]');
    if (!canonical) {
      canonical = document.createElement('link');
      canonical.setAttribute('rel', 'canonical');
      document.head.appendChild(canonical);
    }
    canonical.setAttribute('href', `https://emperialcabs.com/taxi-service-in-${citySlug}`);

    // Schema.org JSON-LD
    const schemaScriptId = 'city-json-ld';
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
          "name": `EMPERIAL CABS - Taxi Service in ${cityName}`,
          "url": `https://emperialcabs.com/taxi-service-in-${citySlug}`,
          "telephone": "+91-9876543210",
          "areaServed": {
            "@type": "City",
            "name": cityName
          },
          "provider": {
            "@type": "LocalBusiness",
            "name": "EMPERIAL CABS",
            "address": {
              "@type": "PostalAddress",
              "addressLocality": cityName,
              "addressRegion": "Gujarat",
              "addressCountry": "IN"
            }
          }
        },
        {
          "@type": "FAQPage",
          "mainEntity": [
            {
              "@type": "Question",
              "name": `How can I book a cab in ${cityName}?`,
              "acceptedAnswer": {
                "@type": "Answer",
                "text": `You can book instantly through our website at emperialcabs.com, download our mobile app, or call our 24/7 hotline at +91 98765 43210.`
              }
            },
            {
              "@type": "Question",
              "name": `Are one-way outstation cabs available from ${cityName}?`,
              "acceptedAnswer": {
                "@type": "Answer",
                "text": `Yes, EMPERIAL CABS provides verified one-way cabs from ${cityName} to Ahmedabad, Vadodara, Surat, Rajkot, Mumbai and all other Gujarat cities with zero return fare.`
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
    };
  }, [citySlug, cityName]);

  const handleBookNow = (dropoffCity = 'Ahmedabad') => {
    if (onOpenBooking) {
      onOpenBooking({ pickup: `${cityName}, Gujarat`, dropoff: `${dropoffCity}, Gujarat` });
    } else {
      navigate(`/book-ride?from=${encodeURIComponent(cityName)}&to=${encodeURIComponent(dropoffCity)}`);
    }
  };

  const topOutboundDestinations = GUJARAT_PRIMARY_CITIES
    .filter(c => c.name.toLowerCase() !== cityName.toLowerCase())
    .slice(0, 12);

  const cityFaqs = [
    {
      q: `What types of cab services are available in ${cityName}?`,
      a: `We provide one-way outstation cabs, round-trip intercity taxis, local 8hr/80km full-day packages, airport transfers, and corporate fleet bookings throughout ${cityName} and surrounding districts.`
    },
    {
      q: `How quickly can a cab arrive for doorstep pickup in ${cityName}?`,
      a: `Our standard on-demand response time is within 15–25 minutes across major areas in ${cityName}. For scheduled outstation trips, our chauffeur arrives 15 minutes before the booked time.`
    },
    {
      q: `Can I book an outstation taxi from ${cityName} to Ahmedabad Airport?`,
      a: `Yes! Daily airport drop-offs and pick-ups to and from Sardar Vallabhbhai Patel International Airport (AMD) are one of our highest-rated specialty services with zero surge pricing.`
    },
    {
      q: `What payment options are accepted?`,
      a: `We accept Cash, UPI (Google Pay, PhonePe, Paytm), Net Banking, and major Debit/Credit Cards. You receive an instant digital invoice via SMS/WhatsApp.`
    }
  ];

  return (
    <div className="city-hub-page">
      {/* CITY HERO BANNER */}
      <section className="city-hero">
        <div className="container">
          <div className="city-breadcrumb">
            <Link to="/">Home</Link>
            <ChevronRight size={14} />
            <Link to="/routes">Gujarat Cities</Link>
            <ChevronRight size={14} />
            <span>Taxi Service in {cityName}</span>
          </div>

          <div className="city-hero-header">
            <span className="city-badge">
              <MapPin size={16} />
              <span>Gujarat 24/7 Taxi Network</span>
            </span>
            <h1 className="city-title">
              Top Rated Taxi Service in {cityName}
            </h1>
            <p className="city-subtitle">
              Book clean, comfortable, and sanitized AC cabs in {cityName} for local travel, outstation trips, and airport transfers. Verified drivers, guaranteed transparent pricing, and instant dispatch.
            </p>

            <div className="city-cta-buttons">
              <button onClick={() => handleBookNow()} className="btn-city-primary">
                <span>Book a Cab in {cityName}</span>
                <ArrowRight size={18} />
              </button>
              <a href="tel:+919876543210" className="btn-city-secondary">
                <Phone size={18} />
                <span>Call Helpline (+91 98765 43210)</span>
              </a>
            </div>
          </div>
        </div>
      </section>

      {/* TOP OUTBOUND ROUTES FROM THIS CITY */}
      <section className="section outbound-routes-section">
        <div className="container">
          <div className="section-header text-center">
            <span className="section-badge">Direct Highway Connect</span>
            <h2>Popular Outstation Cab Routes from {cityName}</h2>
            <p className="section-desc">
              Choose your destination below to view fixed rates, route travel times, and book verified one-way taxis.
            </p>
          </div>

          <div className="outbound-grid">
            {topOutboundDestinations.map((dest, idx) => {
              const routeSlug = `${slugify(cityName)}-to-${dest.slug}`;
              return (
                <div key={idx} className="outbound-card">
                  <div className="outbound-header">
                    <h4>{cityName} &rarr; {dest.name}</h4>
                    <span className="dest-hub">{dest.hub}</span>
                  </div>
                  <p className="outbound-info">
                    One-way & round trip taxi service with doorstep pickup across {cityName}.
                  </p>
                  <div className="outbound-actions">
                    <Link to={`/taxi/${routeSlug}`} className="link-view-route">
                      View Fares & Info &rarr;
                    </Link>
                    <button onClick={() => handleBookNow(dest.name)} className="btn-quick-book">
                      Book Now
                    </button>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      </section>

      {/* SERVICE PILLARS IN THIS CITY */}
      <section className="section city-pillars-section">
        <div className="container">
          <div className="section-header text-center">
            <span className="section-badge">Why Choose Us</span>
            <h2>The EMPERIAL CABS Advantage in {cityName}</h2>
          </div>

          <div className="pillars-grid">
            <div className="pillar-card">
              <div className="pillar-icon"><ShieldCheck size={24} /></div>
              <h3>100% Commercial Permits</h3>
              <p>Every vehicle in our fleet carries yellow-plate commercial insurance and government safety clearance.</p>
            </div>
            <div className="pillar-card">
              <div className="pillar-icon"><Clock size={24} /></div>
              <h3>Punctual Doorstep Pickup</h3>
              <p>Chauffeurs arrive at your exact residential or commercial address in {cityName} on schedule.</p>
            </div>
            <div className="pillar-card">
              <div className="pillar-icon"><Car size={24} /></div>
              <h3>Diverse Fleet Options</h3>
              <p>From fuel-efficient sedans (Swift/Aura) to spacious 7-seater Ertiga & Innova Crysta for outstation families.</p>
            </div>
          </div>
        </div>
      </section>

      {/* CITY FAQ ACCORDION */}
      <section className="section city-faq-section">
        <div className="container">
          <div className="section-header text-center">
            <span className="section-badge">Help & Support</span>
            <h2>Frequently Asked Questions in {cityName}</h2>
          </div>

          <div className="city-faq-box">
            {cityFaqs.map((faq, i) => {
              const isOpen = openFaqIndex === i;
              return (
                <div key={i} className={`faq-card ${isOpen ? 'open' : ''}`}>
                  <button 
                    className="faq-question-btn" 
                    onClick={() => setOpenFaqIndex(isOpen ? -1 : i)}
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
    </div>
  );
}
