import React from 'react';

export default function BottomNavBar({ activeTab, setActiveTab }) {
  return (
    <div className="emperial-cabs-bottom-nav">
      <button 
        className={`nav-tab-item ${activeTab === 'home' ? 'active' : ''}`} 
        onClick={() => setActiveTab('home')}
      >
        <svg className="nav-tab-svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
          <path d="M3 9l9-7 9 7v11a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z"></path>
          <polyline points="9 22 9 12 15 12 15 22"></polyline>
        </svg>
        <span>Home</span>
      </button>

      <button 
        className={`nav-tab-item ${activeTab === 'rides' ? 'active' : ''}`} 
        onClick={() => setActiveTab('rides')}
      >
        <svg className="nav-tab-svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
          <rect x="2" y="7" width="20" height="11" rx="3"></rect>
          <path d="M6 7l2-4h8l2 4"></path>
          <circle cx="7" cy="15" r="1.5"></circle>
          <circle cx="17" cy="15" r="1.5"></circle>
        </svg>
        <span>Rides</span>
      </button>

      {/* CENTER TAB: Instant */}
      <button 
        className={`nav-tab-item nav-tab-center-short-trip ${activeTab === 'shortTrip' ? 'active' : ''}`} 
        onClick={() => setActiveTab('shortTrip')}
      >
        <div className="nav-short-trip-icon-wrapper">
          <svg className="nav-tab-svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.3" strokeLinecap="round" strokeLinejoin="round">
            <polygon points="13 2 3 14 12 14 11 22 21 10 12 10 13 2"></polygon>
          </svg>
        </div>
        <span>Instant</span>
      </button>

      <button 
        className={`nav-tab-item ${activeTab === 'wallet' ? 'active' : ''}`} 
        onClick={() => setActiveTab('wallet')}
      >
        <svg className="nav-tab-svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
          <rect x="1" y="4" width="22" height="16" rx="3" ry="3"></rect>
          <line x1="1" y1="9" x2="23" y2="9"></line>
          <line x1="15" y1="15" x2="19" y2="15"></line>
        </svg>
        <span>Wallet</span>
      </button>

      <button 
        className={`nav-tab-item ${activeTab === 'account' ? 'active' : ''}`} 
        onClick={() => setActiveTab('account')}
      >
        <svg className="nav-tab-svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
          <path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2"></path>
          <circle cx="12" cy="7" r="4"></circle>
        </svg>
        <span>Account</span>
      </button>
    </div>
  );
}
