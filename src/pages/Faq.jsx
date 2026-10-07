import React, { useState } from 'react';
import { Link } from 'react-router-dom';
import { ChevronDown, ChevronUp, MessageSquare, Star } from 'lucide-react';
import './Pages.css';

export default function Faq({ onOpenBooking }) {
  const [activePopular, setActivePopular] = useState(0);
  const [activePayments, setActivePayments] = useState(0);
  const [activeSafety, setActiveSafety] = useState(0);

  const popularFaqs = [
    {
      q: "Do you offer airport transportation services?",
      a: "Lorem ipsum dolor sit amet, consectetur adipiscing elit. Aenean commodo ligula eget dolor. Aenean massa. Cum sociis natoque penatibus et magnis dis parturient montes, nascetur ridiculus mus. Donec quam felis, ultricies nec, pellentesque eu, pretium quis, sem."
    },
    {
      q: "How can I estimate the fare for my ride?",
      a: "You can easily estimate your fare using our online Booking Studio modal or via the Empire Cab mobile app. Simply input your pickup and drop-off locations to view instant upfront fare calculations."
    },
    {
      q: "Can I schedule a ride in advance?",
      a: "Yes! Empire Cab allows you to schedule rides up to 30 days in advance. Select your preferred date and time, and our drivers will arrive on time."
    }
  ];

  const paymentFaqs = [
    {
      q: "What are the payment options available?",
      a: "Lorem ipsum dolor sit amet, consectetur adipiscing elit. Aenean commodo ligula eget dolor. Aenean massa. Cum sociis natoque penatibus et magnis dis parturient montes, nascetur ridiculus mus. Donec quam felis, ultricies nec, pellentesque eu, pretium quis, sem."
    },
    {
      q: "How can I estimate the fare for my ride?",
      a: "Upfront pricing ensures you know the exact price before confirming your trip with no hidden surcharge fees."
    },
    {
      q: "Are your drivers licensed and experienced?",
      a: "Every Empire Cab driver undergoes complete background checks, professional driving verification, and safety training."
    }
  ];

  const safetyFaqs = [
    {
      q: "Are your drivers licensed and experienced?",
      a: "Yes, all EMPERIAL CABS drivers hold valid commercial driving licenses, verified background checks, and extensive professional route driving experience across Gujarat."
    },
    {
      q: "How can I report any safety concerns or incidents?",
      a: "Our 24/7 support team can be reached directly through the app or by calling our hotline (+91 7226844108) or emailing emperialcabsbhavnagar@gmail.com."
    },
    {
      q: "Are your drivers background checked?",
      a: "Yes, 100% of our drivers undergo criminal background checks, DMV record audits, and vehicle safety inspections."
    }
  ];

  return (
    <div className="page-faq">
      {/* PAGE BANNER */}
      <section className="page-banner">
        <div className="container">
          <div className="banner-card">
            <div className="banner-overlay"></div>
            <div className="banner-content">
              <div className="breadcrumb">
                <Link to="/">Home</Link> &gt; <span>FAQ</span>
              </div>
              <h1 className="banner-title">Answers to Common Questions about Our Services and Policies</h1>
            </div>
          </div>
        </div>
      </section>

      {/* FAQ CONTENT GRID */}
      <section className="section faq-main-section">
        <div className="container">
          <div className="grid-faq-layout">
            <div className="faq-acc-column">
              {/* Popular Questions */}
              <div className="faq-category-block">
                <h2>Popular Questions</h2>
                <div className="accordion-list">
                  {popularFaqs.map((item, idx) => (
                    <div key={idx} className={`accordion-item ${activePopular === idx ? 'active' : ''}`}>
                      <div className="accordion-header" onClick={() => setActivePopular(activePopular === idx ? -1 : idx)}>
                        <span>{item.q}</span>
                        {activePopular === idx ? <ChevronUp size={20} className="text-green" /> : <ChevronDown size={20} />}
                      </div>
                      {activePopular === idx && (
                        <div className="accordion-body"><p>{item.a}</p></div>
                      )}
                    </div>
                  ))}
                </div>
              </div>

              {/* Payments Questions */}
              <div className="faq-category-block">
                <h2>Payments Questions</h2>
                <div className="accordion-list">
                  {paymentFaqs.map((item, idx) => (
                    <div key={idx} className={`accordion-item ${activePayments === idx ? 'active' : ''}`}>
                      <div className="accordion-header" onClick={() => setActivePayments(activePayments === idx ? -1 : idx)}>
                        <span>{item.q}</span>
                        {activePayments === idx ? <ChevronUp size={20} className="text-green" /> : <ChevronDown size={20} />}
                      </div>
                      {activePayments === idx && (
                        <div className="accordion-body"><p>{item.a}</p></div>
                      )}
                    </div>
                  ))}
                </div>
              </div>

              {/* Safety & Security */}
              <div className="faq-category-block">
                <h2>Safety and Security</h2>
                <div className="accordion-list">
                  {safetyFaqs.map((item, idx) => (
                    <div key={idx} className={`accordion-item ${activeSafety === idx ? 'active' : ''}`}>
                      <div className="accordion-header" onClick={() => setActiveSafety(activeSafety === idx ? -1 : idx)}>
                        <span>{item.q}</span>
                        {activeSafety === idx ? <ChevronUp size={20} className="text-green" /> : <ChevronDown size={20} />}
                      </div>
                      {activeSafety === idx && (
                        <div className="accordion-body"><p>{item.a}</p></div>
                      )}
                    </div>
                  ))}
                </div>
              </div>
            </div>

            {/* Sidebar Support Box */}
            <div className="faq-sidebar-column">
              <div className="card faq-support-card">
                <div className="icon-box">
                  <MessageSquare size={26} />
                </div>
                <h3>You have different question?</h3>
                <p>Reach out to our customer support team for prompt and reliable assistance.</p>
                <Link to="/contact" className="btn btn-primary" style={{ width: '100%', marginTop: '1rem' }}>
                  Contact Support
                </Link>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* DOWNLOAD BANNER */}
      <section className="section download-banner-section">
        <div className="container">
          <div className="download-card">
            <div className="download-content">
              <h2>The Easiest Way to Book Your Ride Download Our App for Instant Access</h2>
              <p>Ut enim ad minima veniam, quis nostrum exercitationem ullam laboriosam, nisi ut aliquid ex ea commodi consequatur</p>

              <div className="store-badges dark-badges">
                <a href="#download" className="store-badge google-play">
                  <div className="badge-icon">▶</div>
                  <div className="badge-text">
                    <small>GET IT ON</small>
                    <span>Google Play</span>
                  </div>
                </a>

                <a href="#download" className="store-badge app-store">
                  <div className="badge-icon"></div>
                  <div className="badge-text">
                    <small>Download on the</small>
                    <span>App Store</span>
                  </div>
                </a>
              </div>
            </div>

            <div className="download-image-wrap">
              <img 
                src="https://images.unsplash.com/photo-1580489944761-15a19d654956?w=600&auto=format&fit=crop&q=80" 
                alt="Woman using mobile app" 
                className="cta-person-img"
              />
            </div>
          </div>
        </div>
      </section>
    </div>
  );
}
