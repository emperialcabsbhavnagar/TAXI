import React, { useState } from 'react';
import { Link } from 'react-router-dom';
import { ChevronDown, ChevronUp, MapPin, Phone, Mail, Eye, Target, ShieldCheck, Award, Users, Car, Clock } from 'lucide-react';
import './Pages.css';

export default function About({ onOpenBooking }) {
  const [openAccordion, setOpenAccordion] = useState(0);

  const toggleAccordion = (index) => {
    setOpenAccordion(openAccordion === index ? -1 : index);
  };

  const safetyItems = [
    {
      title: "Background-Verified & Professional Chauffeurs",
      content: "Every Emperial Cabs driver undergoes mandatory criminal background checks, license verification, defensive driving certification, and hospitality training to ensure your safety and comfort."
    },
    {
      title: "Real-Time 24/7 GPS Tracking & SOS Security",
      content: "All rides are monitored in real time by our Central Safety Hub. Passengers can share live trip status with family or trigger instant emergency SOS assistance with a single tap."
    },
    {
      title: "Meticulously Inspected & Sanitized Fleet",
      content: "Our vehicles undergo 50-point technical health audits every morning, comprehensive sanitization after every ride, and periodic safety servicing to prevent unexpected breakdowns."
    },
    {
      title: "Round-the-Clock Dedicated Customer Support",
      content: "Our customer care team is active 24 hours a day, 7 days a week to assist with instant bookings, itinerary modifications, invoice requests, or lost item recovery."
    }
  ];

  return (
    <div className="page-about">
      {/* PAGE BANNER */}
      <section className="page-banner">
        <div className="container">
          <div className="banner-card">
            <div className="banner-overlay"></div>
            <div className="banner-content">
              <div className="breadcrumb">
                <Link to="/">Home</Link> &gt; <span>About</span>
              </div>
              <h1 className="banner-title">Our Story of Service & Mobility Excellence</h1>
            </div>
          </div>
        </div>
      </section>

      {/* STORY BEHIND EMPERIAL CABS */}
      <section className="section story-section">
        <div className="container">
          <div className="grid-2-cols align-center">
            <div className="story-text">
              <h2>Fueling Connections — The Story Behind Emperial Cabs</h2>
              <p>
                Founded with a vision to elevate urban and intercity travel across India, Emperial Cabs has grown into one of the country's most trusted executive ride platforms. We bridge cutting-edge dispatch technology with uncompromised comfort to deliver exceptional journeys every single day.
              </p>
              <p>
                From rapid airport transfers to luxurious outstation tours, our fleet of modern Sedans, spacious SUVs, and zero-emission Electric Vehicles operates round-the-clock. With transparent pricing, verified chauffeurs, and zero last-minute cancellations, we redefine what premium transportation feels like.
              </p>

              <div className="stats-counters flex-counters">
                <div className="stat-box">
                  <div className="stat-num">15 +</div>
                  <div className="stat-lbl">Years of Excellence</div>
                </div>
                <div className="stat-box">
                  <div className="stat-num">2,500 +</div>
                  <div className="stat-lbl">Verified Chauffeurs</div>
                </div>
                <div className="stat-box">
                  <div className="stat-num">500k +</div>
                  <div className="stat-lbl">Happy Passengers</div>
                </div>
              </div>
            </div>

            <div className="story-media">
              <img 
                src="/assets/images/steps_tourist_cab_hd.png" 
                alt="Emperial Cabs Premium Fleet & Chauffeur" 
                className="rounded-img"
              />
            </div>
          </div>
        </div>
      </section>

      {/* REDEFINING TRANSPORTATION - VISION, MISSION & METRICS */}
      <section className="section section-mint vision-section">
        <div className="container">
          <div className="section-header">
            <h2>Redefining Transportation for a Connected India</h2>
            <p>Setting new benchmarks in punctuality, passenger safety, zero-emission green mobility, and corporate travel convenience.</p>
          </div>

          <div className="grid-3-cols vision-grid">
            <div className="card vision-card">
              <div className="icon-box">
                <Eye size={26} />
              </div>
              <h3>Our Vision</h3>
              <p>To be India's most trusted, sustainable, and technology-driven executive cab ecosystem, pioneering electric fleets and effortless one-tap transit for every traveler.</p>
            </div>

            <div className="card vision-card">
              <div className="icon-box">
                <Target size={26} />
              </div>
              <h3>Our Mission</h3>
              <p>To deliver safe, transparently priced, and impeccably clean rides supported by 24/7 live GPS monitoring, courteous chauffeurs, and customer-first care.</p>
            </div>

            <div className="card progress-metrics-card">
              <div className="progress-item">
                <div className="progress-label">
                  <span>Passenger Safety Standard</span>
                  <span>99%</span>
                </div>
                <div className="progress-bar-bg">
                  <div className="progress-bar-fill" style={{ width: '99%' }}></div>
                </div>
              </div>

              <div className="progress-item">
                <div className="progress-label">
                  <span>On-Time Arrival Guarantee</span>
                  <span>98%</span>
                </div>
                <div className="progress-bar-bg">
                  <div className="progress-bar-fill" style={{ width: '98%' }}></div>
                </div>
              </div>

              <div className="progress-item">
                <div className="progress-label">
                  <span>Customer Satisfaction Rating</span>
                  <span>96%</span>
                </div>
                <div className="progress-bar-bg">
                  <div className="progress-bar-fill" style={{ width: '96%' }}></div>
                </div>
              </div>

              <div className="progress-item">
                <div className="progress-label">
                  <span>Transparent Fixed Pricing</span>
                  <span>100%</span>
                </div>
                <div className="progress-bar-bg">
                  <div className="progress-bar-fill" style={{ width: '100%' }}></div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* STRINGENT SAFETY MEASURES ACCORDION */}
      <section className="section safety-accordion-section">
        <div className="container">
          <div className="grid-2-cols align-center">
            <div className="safety-acc-media">
              <img 
                src="/assets/images/safety_comfort_spotlight.png" 
                alt="Executive passengers experiencing safe Emperial Cabs ride" 
                className="rounded-img"
              />
            </div>

            <div className="safety-acc-content">
              <h2>Stringent Safety Measures for Complete Peace of Mind</h2>
              <p className="section-desc">
                Your security is our highest priority. Every Emperial Cabs journey is protected by rigorous safety protocols and multi-layered quality control.
              </p>

              <div className="accordion-list">
                {safetyItems.map((item, index) => (
                  <div key={index} className={`accordion-item ${openAccordion === index ? 'active' : ''}`}>
                    <div className="accordion-header" onClick={() => toggleAccordion(index)}>
                      <span>{item.title}</span>
                      {openAccordion === index ? <ChevronUp size={20} className="text-green" /> : <ChevronDown size={20} />}
                    </div>
                    {openAccordion === index && (
                      <div className="accordion-body">
                        <p>{item.content}</p>
                      </div>
                    )}
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* CONTACT PREVIEW SECTION */}
      <section className="section contact-preview-section">
        <div className="container">
          <div className="grid-2-cols align-center">
            <div className="contact-prev-text">
              <h2>Contact Us for Inquiries, Corporate Accounts & Bookings</h2>
              <p className="section-desc">
                Whether you need custom outstation packages, corporate account setup, or instant ride assistance, our team is ready to assist you 24/7.
              </p>

              <div className="grid-2-cols info-cards">
                <div className="card info-mini-card">
                  <div className="icon-box">
                    <MapPin size={22} />
                  </div>
                  <h4>Head Office</h4>
                  <p className="small-text">EMPERIAL CABS Hub, Waghawadi Road, Bhavnagar, Gujarat 364001, India</p>
                </div>

                <div className="card info-mini-card">
                  <div className="icon-box">
                    <Phone size={22} />
                  </div>
                  <h4>24/7 Helpline</h4>
                  <p className="small-text">+91 98765 43210<br />support@emperialcabs.com</p>
                </div>
              </div>
            </div>

            <div className="contact-prev-media">
              <img 
                src="/assets/images/cab_driver_view.jpg" 
                alt="Emperial Cabs 24/7 Customer Care and Support" 
                className="rounded-img"
              />
            </div>
          </div>
        </div>
      </section>
    </div>
  );
}

