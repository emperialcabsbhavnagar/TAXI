import React, { useState } from 'react';
import { Link } from 'react-router-dom';
import { MapPin, Phone, Mail, Facebook, Twitter, Instagram, Youtube, CheckCircle } from 'lucide-react';
import { notifyAdmin } from '../services/notificationEngine';
import { saveContactMessageToMySQL } from '../services/mysqlService';
import './Pages.css';

export default function Contact() {
  const [submitted, setSubmitted] = useState(false);
  const [formData, setFormData] = useState({
    name: '',
    email: '',
    category: 'booking',
    message: ''
  });

  const handleSubmit = (e) => {
    e.preventDefault();
    if (!formData.name || !formData.email || !formData.message) return;

    const newMessage = {
      id: `MSG-${Math.floor(1000 + Math.random() * 9000)}`,
      name: formData.name,
      email: formData.email,
      category: formData.category || 'Support',
      message: formData.message,
      date: new Date().toLocaleString('en-IN', { dateStyle: 'medium', timeStyle: 'short' }),
      timestamp: Date.now(),
      status: 'Unread'
    };

    // Save directly to Hostinger MySQL Database
    saveContactMessageToMySQL(newMessage).catch(() => {});

    // Save to localStorage cabsy_messages as fast local preview
    try {
      const existing = JSON.parse(localStorage.getItem('cabsy_messages') || '[]');
      const updated = [newMessage, ...existing];
      localStorage.setItem('cabsy_messages', JSON.stringify(updated));
      localStorage.setItem('cabsy_contact_messages', JSON.stringify(updated));
      window.dispatchEvent(new CustomEvent('EMPERIAL CABS_messages_updated', { detail: updated }));
      window.dispatchEvent(new Event('storage'));
    } catch (err) {}

    // Send push / notification to Admin
    notifyAdmin({
      type: 'message',
      title: 'New Contact Message Received',
      body: `Message from ${formData.name} (${formData.email}): "${formData.message.slice(0, 50)}..."`
    });

    setSubmitted(true);
  };

  return (
    <div className="page-contact">
      {/* PAGE BANNER */}
      <section className="page-banner">
        <div className="container">
          <div className="banner-card">
            <div className="banner-overlay"></div>
            <div className="banner-content">
              <div className="breadcrumb">
                <Link to="/">Home</Link> &gt; <span>Contact</span>
              </div>
              <h1 className="banner-title">Contact Us</h1>
              <p style={{ color: 'rgba(255, 255, 255, 0.9)', fontSize: '1.15rem', marginTop: '0.5rem', fontWeight: '500', maxWidth: '650px' }}>
                Connect with Us for Any Questions, Ride Bookings or Support Concerns
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* GET IN TOUCH & MESSAGE FORM */}
      <section className="section contact-main-section">
        <div className="container">
          <div className="grid-2-cols align-start">
            {/* Get In Touch Info */}
            <div className="contact-info-side">
              <h2>Get In Touch With Us</h2>
              <p className="section-desc">
                Have questions regarding our executive cab services, fleet bookings, or corporate accounts? Reach out to our 24/7 support team.
              </p>

              <div className="grid-2-cols info-cards" style={{ margin: '2rem 0' }}>
                <div className="card info-mini-card">
                  <div className="icon-box"><MapPin size={22} /></div>
                  <h4>Our Office</h4>
                  <p className="small-text">Emperial Cabs Hub, Outer Ring Road, Connaught Place, New Delhi 110001</p>
                </div>

                <div className="card info-mini-card">
                  <div className="icon-box"><Phone size={22} /></div>
                  <h4>Contact Info</h4>
                  <p className="small-text">+91 98765 43210<br />support@emperialcabs.com</p>
                </div>
              </div>

              <div className="social-links-block">
                <h4>Our Social Media :</h4>
                <div className="social-icons-list">
                  <a href="#social" className="social-btn"><Facebook size={18} /></a>
                  <a href="#social" className="social-btn"><Twitter size={18} /></a>
                  <a href="#social" className="social-btn"><Instagram size={18} /></a>
                  <a href="#social" className="social-btn"><Youtube size={18} /></a>
                </div>
              </div>
            </div>

            {/* Leave Us A Message Form */}
            <div className="contact-form-side">
              <div className="card contact-form-card section-mint">
                <h3>Leave Us A Message</h3>
                
                {!submitted ? (
                  <form onSubmit={handleSubmit} className="contact-form">
                    <div className="input-group">
                      <input 
                        type="text" 
                        placeholder="Your name here" 
                        value={formData.name}
                        onChange={e => setFormData({ ...formData, name: e.target.value })}
                        required 
                      />
                    </div>

                    <div className="grid-2-cols">
                      <div className="input-group">
                        <input 
                          type="email" 
                          placeholder="Add email" 
                          value={formData.email}
                          onChange={e => setFormData({ ...formData, email: e.target.value })}
                          required 
                        />
                      </div>
                      <div className="input-group">
                        <select 
                          value={formData.category}
                          onChange={e => setFormData({ ...formData, category: e.target.value })}
                          required
                        >
                          <option value="Taxi Booking Inquiry">Taxi Booking Inquiry</option>
                          <option value="Corporate Account">Corporate Account</option>
                          <option value="Driver Partnership">Driver Partnership</option>
                          <option value="Other Support">Other Support</option>
                        </select>
                      </div>
                    </div>

                    <div className="input-group">
                      <textarea 
                        rows="5" 
                        placeholder="Comments or question details..." 
                        value={formData.message}
                        onChange={e => setFormData({ ...formData, message: e.target.value })}
                        required
                      ></textarea>
                    </div>

                    <button type="submit" className="btn btn-primary" style={{ alignSelf: 'flex-start', marginTop: '0.5rem' }}>
                      Send Message
                    </button>
                  </form>
                ) : (
                  <div className="text-center" style={{ padding: '2rem 0' }}>
                    <CheckCircle size={48} className="text-green" style={{ marginBottom: '1rem' }} />
                    <h4>Message Sent Successfully!</h4>
                    <p>Thank you for contacting Emperial Cabs. Our team will review your message and reply to your email shortly.</p>
                    <button 
                      onClick={() => { setSubmitted(false); setFormData({ name: '', email: '', category: 'Taxi Booking Inquiry', message: '' }); }}
                      className="btn btn-outline" 
                      style={{ marginTop: '1rem' }}
                    >
                      Send Another Message
                    </button>
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>
      </section>
    </div>
  );
}
