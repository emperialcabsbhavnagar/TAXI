import React, { useState } from 'react';
import { BrowserRouter as Router, Routes, Route, useLocation } from 'react-router-dom';
import Header from './components/Header';
import Footer from './components/Footer';
import BookingModal from './components/BookingModal';

import Home from './pages/Home';
import About from './pages/About';
import Services from './pages/Services';
import Faq from './pages/Faq';
import Contact from './pages/Contact';
import BookRide from './pages/BookRide';
import AdminPortal from './pages/AdminPortal';
import MobileAppView from './pages/MobileAppView';
import NotFound from './pages/NotFound';

function ScrollToTop() {
  const { pathname } = useLocation();
  React.useEffect(() => {
    window.scrollTo(0, 0);
  }, [pathname]);
  return null;
}

function MainLayout({ handleOpenBooking, isBookingOpen, handleCloseBooking }) {
  const location = useLocation();
  const hostname = typeof window !== 'undefined' ? window.location.hostname.toLowerCase() : '';

  const isAdmin = location.pathname === '/admin' || location.pathname.startsWith('/admin');
  const isWebSite = location.pathname === '/web' || location.pathname.startsWith('/web');
  const isMobilePath = location.pathname === '/app' || location.pathname === '/mobile' || location.pathname.startsWith('/app') || location.pathname.startsWith('/mobile');
  
  // Dedicated Mobile Subdomains Only (e.g., m.empirecab.com, app.empirecab.com)
  const isMobileDomain = hostname.startsWith('m.') || hostname.startsWith('app.') || hostname.startsWith('mobile.');
  
  // Robust Native Capacitor Check (Only active inside built Android APK or iOS IPA container)
  const isCapacitorNative = typeof window !== 'undefined' && (
    window.location.protocol === 'file:' ||
    window.location.protocol === 'capacitor:' ||
    Boolean(window.Capacitor?.isNativePlatform?.())
  );

  const appMode = (import.meta.env.VITE_APP_MODE || '').toLowerCase();
  const searchParams = new URLSearchParams(location.search);
  const isMobileQuery = searchParams.has('app') || searchParams.has('mobile') || searchParams.has('android') || searchParams.get('mode') === 'app' || searchParams.get('mode') === 'mobile' || searchParams.get('mode') === 'android';

  // 1. Mobile App Mode (Triggered strictly by Native Capacitor APK, explicit mode=app, VITE_APP_MODE=android, or /app route)
  if (!isWebSite && (isCapacitorNative || appMode === 'android' || appMode === 'app' || appMode === 'mobile' || isMobileDomain || isMobilePath || isMobileQuery)) {
    return <MobileAppView platform={appMode || 'android'} />;
  }

  // 2. Admin Portal Route
  if (isAdmin) {
    return <AdminPortal />;
  }

  // 3. Desktop Website (Default layout for main domain & web routes)
  return (
    <div className="app-container">
      <Header onOpenBooking={handleOpenBooking} />
      
      <main className="app-main-content">
        <Routes>
          <Route path="/" element={<Home onOpenBooking={handleOpenBooking} />} />
          <Route path="/web" element={<Home onOpenBooking={handleOpenBooking} />} />
          <Route path="/about" element={<About onOpenBooking={handleOpenBooking} />} />
          <Route path="/services" element={<Services onOpenBooking={handleOpenBooking} />} />
          <Route path="/book-ride" element={<BookRide />} />
          <Route path="/faq" element={<Faq onOpenBooking={handleOpenBooking} />} />
          <Route path="/contact" element={<Contact />} />
          <Route path="/admin" element={<AdminPortal />} />
          <Route path="*" element={<NotFound />} />
        </Routes>
      </main>

      <Footer />
      <BookingModal isOpen={isBookingOpen} onClose={handleCloseBooking} />
    </div>
  );
}

class ErrorBoundary extends React.Component {
  constructor(props) {
    super(props);
    this.state = { hasError: false, error: null };
  }

  static getDerivedStateFromError(error) {
    return { hasError: true, error };
  }

  componentDidCatch(error, errorInfo) {
    console.error("App Render Error Caught:", error, errorInfo);
  }

  handleReload = () => {
    this.setState({ hasError: false, error: null });
    try {
      window.location.reload();
    } catch (e) {}
  };

  render() {
    if (this.state.hasError) {
      return (
        <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', minHeight: '100vh', padding: '24px', background: '#F8FAFC', color: '#0F172A', fontFamily: 'system-ui, sans-serif', textAlign: 'center' }}>
          <div style={{ fontSize: '54px', marginBottom: '16px' }}>🚖</div>
          <h2 style={{ fontSize: '24px', fontWeight: '800', margin: '0 0 8px 0' }}>EMPERIAL CABS Application</h2>
          <p style={{ color: '#64748B', maxWidth: '360px', margin: '0 0 20px 0', fontSize: '15px' }}>
            Application view updated. Tap below to reload fresh session.
          </p>
          {this.state.error?.message && (
            <p style={{ color: '#EF4444', fontSize: '13px', background: '#FEF2F2', padding: '8px 14px', borderRadius: '8px', marginBottom: '16px', maxWidth: '400px', wordBreak: 'break-word' }}>
              {this.state.error.message}
            </p>
          )}
          <button 
            onClick={this.handleReload} 
            style={{ background: '#10B981', color: '#FFFFFF', border: 'none', padding: '14px 28px', borderRadius: '14px', fontWeight: '700', fontSize: '16px', cursor: 'pointer', boxShadow: '0 4px 14px rgba(16, 185, 129, 0.35)' }}
          >
            Reload Empire App
          </button>
        </div>
      );
    }
    return this.props.children;
  }
}

export default function App() {
  const [isBookingOpen, setIsBookingOpen] = useState(false);

  const handleOpenBooking = () => {
    setIsBookingOpen(true);
  };

  const handleCloseBooking = () => {
    setIsBookingOpen(false);
  };

  return (
    <ErrorBoundary>
      <Router>
        <ScrollToTop />
        <MainLayout 
          handleOpenBooking={handleOpenBooking}
          isBookingOpen={isBookingOpen}
          handleCloseBooking={handleCloseBooking}
        />
      </Router>
    </ErrorBoundary>
  );
}
