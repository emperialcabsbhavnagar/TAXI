// EMPERIAL CABS Mobile User Experience & Navigation Engine v1.0.8
import React, { useState, useEffect } from 'react';
import './MobileAppView.css';
import { db } from '../services/dbService';
import { saveInquiryToMySQL, saveCustomerToMySQL } from '../services/mysqlService';
import { saveInquiryToFirestore, saveCustomerToFirestore } from '../services/firebaseService';
import { notifyAdmin, notifyCustomer, requestNotificationPermission } from '../services/notificationEngine';

// Import Modular Mobile Screen Components
import PreloaderScreen from './mobile/PreloaderScreen';
import SplashScreen from './mobile/SplashScreen';
import OnboardingScreen from './mobile/OnboardingScreen';
import LetsYouInScreen from './mobile/LetsYouInScreen';
import OtpVerifyScreen from './mobile/OtpVerifyScreen';
import NotificationOptScreen from './mobile/NotificationOptScreen';
import PreferredLangScreen from './mobile/PreferredLangScreen';
import LocationPermScreen from './mobile/LocationPermScreen';
import AccountCreatedScreen from './mobile/AccountCreatedScreen';
import HomeScreen from './mobile/HomeScreen';
import RidesTabScreen from './mobile/RidesTabScreen';
import WalletTabScreen from './mobile/WalletTabScreen';
import AccountTabScreen from './mobile/AccountTabScreen';
import AccountDetailScreen from './mobile/AccountDetailScreen';
import SelectLocationScreen from './mobile/SelectLocationScreen';
import SeatScheduleScreen from './mobile/SeatScheduleScreen';
import SelectCarScreen from './mobile/SelectCarScreen';
import SelectPaymentScreen from './mobile/SelectPaymentScreen';
import ProcessingScreen from './mobile/ProcessingScreen';
import DriverFoundScreen from './mobile/DriverFoundScreen';
import TripTrackingScreen from './mobile/TripTrackingScreen';
import TripReceiptScreen from './mobile/TripReceiptScreen';
import InquirySubmittedScreen from './mobile/InquirySubmittedScreen';

export default function MobileAppView() {

  // Navigation Flow State Machine - Always start at PRELOADER for 2-second splash
  const [appStage, setAppStage] = useState('PRELOADER');

  // User Input & Booking States
  const [selectedGoogleAccount, setSelectedGoogleAccount] = useState(null);
  const [phoneNumber, setPhoneNumber] = useState('');
  const [otpCode, setOtpCode] = useState(['', '', '', '', '', '']);
  const [authMethod, setAuthMethod] = useState('phone'); // 'phone' | 'email'
  const [authEmail, setAuthEmail] = useState('');
  const [selectedLang, setSelectedLang] = useState('English');
  const [userCoords, setUserCoords] = useState({ lat: 21.7645, lng: 72.1519 });
  const [pickupLoc, setPickupLoc] = useState('Bhavnagar, Gujarat');
  const [dropoffLoc, setDropoffLoc] = useState('Ahmedabad Airport (AMD)');
  const [pickupCity, setPickupCity] = useState('Bhavnagar');
  const [dropoffCity, setDropoffCity] = useState('Ahmedabad');
  const [noOfDays, setNoOfDays] = useState(1);
  const [isCustom, setIsCustom] = useState(false);
  const [tripType, setTripType] = useState('one-way'); // 'one-way' | 'round-trip' | 'custom-trip'
  const [scheduledDate, setScheduledDate] = useState('Today, 10 Aug 2026');
  const [scheduledTime, setScheduledTime] = useState('03:30 PM');
  const [returnDate, setReturnDate] = useState('Tomorrow, 11 Aug 2026');
  const [selectedCar, setSelectedCar] = useState('CAR-101');
  const [selectedPayment, setSelectedPayment] = useState('wallet');
  const [promoCode, setPromoCode] = useState('');
  const [activeTab, setActiveTab] = useState('home');
  const [lastCreatedInquiry, setLastCreatedInquiry] = useState(null);

  // Initialize theme mode on startup (Defaults to Auto: Light in day, Dark at night)
  useEffect(() => {
    try {
      const themeMode = localStorage.getItem('cabsy_theme_mode') || 'auto';
      let isDark = false;
      if (themeMode === 'dark') {
        isDark = true;
      } else if (themeMode === 'light') {
        isDark = false;
      } else {
        // Auto mode: Light in day (6 AM - 7 PM), Dark at night (7 PM - 6 AM)
        const prefersDark = window.matchMedia && window.matchMedia('(prefers-color-scheme: dark)').matches;
        const hour = new Date().getHours();
        const isNight = hour >= 19 || hour < 6;
        isDark = prefersDark || isNight;
      }

      if (isDark) {
        document.body.classList.add('dark-mode');
      } else {
        document.body.classList.remove('dark-mode');
      }
    } catch (e) {}
  }, []);

  // Request notification permission and ensure active ride stage on mount
  useEffect(() => {
    requestNotificationPermission().catch(() => {});

    const syncActiveRideStage = () => {
      try {
        const savedProfile = localStorage.getItem('cabsy_user_profile');
        const savedPhone = localStorage.getItem('cabsy_user_phone');
        const userProf = savedProfile ? JSON.parse(savedProfile) : null;
        const uPhone = (userProf?.phone || savedPhone || '').replace(/\D/g, '');
        const uEmail = (userProf?.email || '').toLowerCase().trim();

        // If user is not logged in or has no phone/email, do not auto-route to protected screens
        if (!uPhone && !uEmail) return;

        const savedInquiries = localStorage.getItem('cabsy_inquiries');
        if (savedInquiries) {
          const list = JSON.parse(savedInquiries);
          const activeRide = list.find(i => {
            if (!i) return false;
            const iPhone = i.customerPhone ? String(i.customerPhone).replace(/\D/g, '') : '';
            const iEmail = i.customerEmail ? String(i.customerEmail).toLowerCase().trim() : '';
            const isMatch = (uPhone && iPhone && uPhone.slice(-10) === iPhone.slice(-10)) ||
                            (uEmail && iEmail && uEmail === iEmail);
            return isMatch && (i.status === 'In Progress' || i.status === 'On Ride');
          });

          if (activeRide) {
            setAppStage('TRACKING');
          }
        }
      } catch (e) {}
    };

    syncActiveRideStage();

    let bc = null;
    try {
      if ('BroadcastChannel' in window) {
        bc = new BroadcastChannel('EMPERIAL CABS_realtime_sync');
        bc.onmessage = (msg) => {
          if (msg.data?.type === 'TRIP_STARTED') {
            const savedProf = localStorage.getItem('cabsy_user_profile');
            if (savedProf) setAppStage('TRACKING');
          } else if (msg.data?.type === 'TRIP_COMPLETED') {
            const savedProf = localStorage.getItem('cabsy_user_profile');
            if (savedProf) setAppStage('RECEIPT');
          } else {
            syncActiveRideStage();
          }
        };
      }
    } catch (e) {}

    const handleTripStarted = () => {
      const savedProf = localStorage.getItem('cabsy_user_profile');
      if (savedProf) setAppStage('TRACKING');
    };
    const handleTripCompleted = () => {
      const savedProf = localStorage.getItem('cabsy_user_profile');
      if (savedProf) setAppStage('RECEIPT');
    };

    window.addEventListener('storage', syncActiveRideStage);
    window.addEventListener('EMPERIAL CABS_trip_started', handleTripStarted);
    window.addEventListener('EMPERIAL CABS_trip_completed', handleTripCompleted);
    window.addEventListener('EMPERIAL CABS_db_sync', syncActiveRideStage);
    
    return () => {
      if (bc) bc.close();
      window.removeEventListener('storage', syncActiveRideStage);
      window.removeEventListener('EMPERIAL CABS_trip_started', handleTripStarted);
      window.removeEventListener('EMPERIAL CABS_trip_completed', handleTripCompleted);
      window.removeEventListener('EMPERIAL CABS_db_sync', syncActiveRideStage);
    };
  }, []);

  // Utility: Validate authenticated session state
  const isSessionValid = () => {
    try {
      const savedProfile = localStorage.getItem('cabsy_user_profile');
      const savedPhone = localStorage.getItem('cabsy_user_phone');
      if (savedProfile) {
        const parsed = JSON.parse(savedProfile);
        return Boolean(parsed && (parsed.name || parsed.phone || parsed.email));
      }
      return Boolean(savedPhone);
    } catch (e) {
      return false;
    }
  };

  // ─── Dynamic Startup Router Executed After Preloader Splash ─────────────────
  const handlePreloaderFinish = () => {
    try {
      const isOnboarded = localStorage.getItem('EMPERIAL CABS_onboarded') === 'true';
      const validSession = isSessionValid();

      if (validSession) {
        // Check if user has a ride currently active & in progress
        const savedInquiries = localStorage.getItem('cabsy_inquiries');
        let inProgressRide = null;
        if (savedInquiries) {
          try {
            const list = JSON.parse(savedInquiries);
            const savedProfile = localStorage.getItem('cabsy_user_profile');
            const savedPhone = localStorage.getItem('cabsy_user_phone');
            const userProf = savedProfile ? JSON.parse(savedProfile) : null;
            const uPhone = (userProf?.phone || savedPhone || '').replace(/\D/g, '');
            const uEmail = (userProf?.email || '').toLowerCase().trim();

            inProgressRide = list.find(i => {
              if (!i) return false;
              const iPhone = i.customerPhone ? String(i.customerPhone).replace(/\D/g, '') : '';
              const iEmail = i.customerEmail ? String(i.customerEmail).toLowerCase().trim() : '';
              const isMatch = (uPhone && iPhone && uPhone.slice(-10) === iPhone.slice(-10)) ||
                              (uEmail && iEmail && uEmail === iEmail);
              return isMatch && (i.status === 'In Progress' || i.status === 'On Ride');
            });
          } catch(e) {}
        }

        if (inProgressRide) {
          setAppStage('TRACKING');
        } else {
          setAppStage('APP_HOME');
        }
      } else if (isOnboarded) {
        // Returning Logged-Out User -> Navigate to Login Screen
        setAppStage('LETS_YOU_IN');
      } else {
        // First Launch / New User -> Proceed to Intro Splash & Onboarding Flow
        setAppStage('SPLASH');
      }
    } catch (e) {
      setAppStage('LETS_YOU_IN');
    }
  };

  // ─── Protected Routes Guarding ──────────────────────────────────────────────
  useEffect(() => {
    const protectedStages = [
      'APP_HOME', 'ACCOUNT_DETAILS', 'SELECT_LOCATION_LIST',
      'GOING_SEAT_SCHEDULE', 'SELECT_CAR', 'SELECT_PAYMENT',
      'RADAR', 'MATCHED', 'TRACKING', 'RECEIPT', 'INQUIRY_SUBMITTED'
    ];

    // Exclude PRELOADER, SPLASH, ONBOARDING, LETS_YOU_IN, OTP_VERIFY from guards
    if (protectedStages.includes(appStage)) {
      if (!isSessionValid()) {
        console.warn(`[AuthGuard] Unauthenticated access attempt to '${appStage}' -> Redirecting to Login`);
        setAppStage('LETS_YOU_IN');
      }
    }
  }, [appStage]);

  // ─── Native Hardware Back Button Handler (Capacitor Android APK) ─────────────
  useEffect(() => {
    let backListener = null;
    const setupHardwareBack = async () => {
      try {
        if (typeof window !== 'undefined' && (Boolean(window.Capacitor?.isNativePlatform?.()) || window.location.protocol === 'file:' || window.location.protocol === 'capacitor:')) {
          const { App } = await import('@capacitor/app');
          backListener = await App.addListener('backButton', () => {
            setAppStage((currentStage) => {
              // Root stages minimize app instead of breaking navigation
              if (currentStage === 'APP_HOME' || currentStage === 'LETS_YOU_IN' || currentStage === 'PRELOADER' || currentStage === 'SPLASH') {
                App.minimizeApp();
                return currentStage;
              }
              if (currentStage === 'OTP_VERIFY') return 'LETS_YOU_IN';
              if (currentStage === 'SELECT_LOCATION_LIST' || currentStage === 'ACCOUNT_DETAILS') return 'APP_HOME';
              if (currentStage === 'GOING_SEAT_SCHEDULE') return 'SELECT_LOCATION_LIST';
              if (currentStage === 'SELECT_CAR') return 'GOING_SEAT_SCHEDULE';
              if (currentStage === 'ONBOARDING') return 'SPLASH';
              return 'APP_HOME';
            });
          });
        }
      } catch (e) {}
    };

    setupHardwareBack();
    return () => {
      if (backListener && typeof backListener.remove === 'function') {
        backListener.remove();
      }
    };
  }, []);

  // Helper to complete onboarding & store persistent user profile
  const completeOnboarding = (customProfile) => {
    try {
      localStorage.setItem('EMPERIAL CABS_onboarded', 'true');
      localStorage.setItem('EMPERIAL CABS_profile_completed', 'true');
      const activePhone = phoneNumber || localStorage.getItem('cabsy_user_phone') || '+91 98765 43210';
      const cleanPhone = activePhone.replace(/\D/g, '');
      localStorage.setItem('cabsy_user_phone', activePhone);

      const activeEmail = authEmail || localStorage.getItem('cabsy_user_email_otp_target') || 'user@empirecab.in';

      const finalProfile = customProfile || {
        name: selectedGoogleAccount?.displayName || 'Empire Rider',
        phone: activePhone,
        email: selectedGoogleAccount?.email || activeEmail,
        totalRides: 0,
        totalSpent: 0
      };

      localStorage.setItem('cabsy_user_profile', JSON.stringify(finalProfile));
      if (cleanPhone) {
        localStorage.setItem(`cabsy_user_profile_${cleanPhone}`, JSON.stringify(finalProfile));
      }
      db.saveCustomer(finalProfile);
      saveCustomerToMySQL(finalProfile).catch(() => {});
    } catch (e) { }

    const asked = localStorage.getItem('EMPERIAL CABS_permissions_asked') === 'true';
    if (!asked) {
      setAppStage('NOTIFICATION_OPT');
    } else {
      setAppStage('APP_HOME');
    }
  };

  // Dynamic Authentication Resolution: Check if user exists in Database or local storage
  const proceedAfterAuth = async () => {
    try {
      const activePhone = phoneNumber || localStorage.getItem('cabsy_user_phone') || '';
      const cleanPhone = activePhone.replace(/\D/g, '').slice(-10);

      if (activePhone) {
        localStorage.setItem('cabsy_user_phone', activePhone);
      }
      localStorage.setItem('EMPERIAL CABS_onboarded', 'true');

      let foundProfile = null;

      // 1. Check local profile by user key
      const userKey = cleanPhone ? `cabsy_user_profile_${cleanPhone}` : 'cabsy_user_profile';
      const savedUserProf = localStorage.getItem(userKey) || localStorage.getItem('cabsy_user_profile');

      if (savedUserProf) {
        try {
          const parsed = JSON.parse(savedUserProf);
          if (parsed && (parsed.name || parsed.phone)) {
            foundProfile = parsed;
          }
        } catch (e) {}
      }

      // 2. Check local dbService customer database
      if (!foundProfile && cleanPhone) {
        const localCustomers = db.getCustomers();
        const match = localCustomers.find(c => {
          const p = c.phone ? String(c.phone).replace(/\D/g, '').slice(-10) : '';
          return p === cleanPhone && (c.name || c.email);
        });
        if (match) foundProfile = match;
      }

      // 3. Check Hostinger MySQL database customers
      if (!foundProfile && cleanPhone) {
        try {
          const mysqlCustomers = await loadAllCustomersFromMySQL();
          const match = mysqlCustomers.find(c => {
            const p = c.phone ? String(c.phone).replace(/\D/g, '').slice(-10) : '';
            return p === cleanPhone && (c.name || c.email);
          });
          if (match) foundProfile = match;
        } catch (e) {}
      }

      if (foundProfile) {
        // User ALREADY exists in database! Save profile & shift directly to Home Screen or Permissions
        localStorage.setItem('cabsy_user_profile', JSON.stringify(foundProfile));
        localStorage.setItem('EMPERIAL CABS_profile_completed', 'true');
        if (cleanPhone) {
          localStorage.setItem(`cabsy_user_profile_${cleanPhone}`, JSON.stringify(foundProfile));
        }

        const asked = localStorage.getItem('EMPERIAL CABS_permissions_asked') === 'true';
        if (!asked) {
          setAppStage('NOTIFICATION_OPT');
        } else {
          setAppStage('APP_HOME');
        }
        return;
      }
    } catch (e) {}

    // NEW USER: User not found in database -> Shift to Create Account Profile
    setAppStage('CREATE_PROFILE');
  };

  const handleLogout = () => {
    try {
      localStorage.removeItem('cabsy_user_profile');
      localStorage.removeItem('EMPERIAL CABS_profile_completed');
      localStorage.removeItem('cabsy_user_phone');
      localStorage.removeItem('cabsy_user_email_otp_target');
    } catch (e) { }
    setSelectedGoogleAccount(null);
    setPhoneNumber('');
    setActiveTab('home');
    setAppStage('LETS_YOU_IN');
  };

  // Dispatch Admin Notification & Save to Central DB when Ride is Requested
  const handleRequestRide = (carObj) => {
    try {
      const savedInquiries = localStorage.getItem('cabsy_inquiries');
      const savedProfile = localStorage.getItem('cabsy_user_profile');
      const userProf = savedProfile ? JSON.parse(savedProfile) : null;
      const uPhone = (userProf?.phone || localStorage.getItem('cabsy_user_phone') || '').replace(/\D/g, '');
      const uEmail = (userProf?.email || '').toLowerCase().trim();

      if (savedInquiries) {
        const list = JSON.parse(savedInquiries);
        const ongoing = list.find(i => {
          if (!i) return false;
          const iPhone = i.customerPhone ? String(i.customerPhone).replace(/\D/g, '') : '';
          const iEmail = i.customerEmail ? String(i.customerEmail).toLowerCase().trim() : '';
          const isMatch = (uPhone && iPhone && uPhone.slice(-10) === iPhone.slice(-10)) ||
                          (uEmail && iEmail && uEmail === iEmail);
          return isMatch && (i.status === 'Confirmed' || i.status === 'In Progress' || i.status === 'On Ride');
        });
        if (ongoing) {
          alert(`You currently have an active ride (${ongoing.status}) heading to ${ongoing.dropoff}. Cannot book a second ride while a trip is active!`);
          setAppStage('TRACKING');
          return;
        }
      }
    } catch (e) {}

    let userProf = { name: 'Rider', phone: '+91 98765 43210', email: 'spiderman757506@gmail.com' };
    try {
      const savedProf = localStorage.getItem('cabsy_user_profile');
      if (savedProf) {
        const p = JSON.parse(savedProf);
        if (p.name) userProf.name = p.name;
        if (p.phone) userProf.phone = p.phone;
        if (p.email) userProf.email = p.email;
      }
    } catch (e) { }

    const selectedVehicleName = carObj?.name || 'SWIFT';
    const totalFareNum = carObj?.totalFareNum || 770;

    const newInquiryId = `INQ-${Math.floor(1000 + Math.random() * 9000)}`;
    const walletDiscountUsed = carObj?.walletDiscountUsed || 0;
    const originalFare = carObj?.originalFare || totalFareNum;
    const couponUsed = carObj?.couponUsed || (walletDiscountUsed > 0 ? `Wallet Reward (-₹${walletDiscountUsed})` : null);

    const isCustomTrip = isCustom || carObj?.isCustom || tripType === 'custom-trip' || carObj?.tripType === 'Custom Trip';
    const newInquiry = {
      id: newInquiryId,
      date: new Date().toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' }),
      customerName: userProf.name,
      customerPhone: userProf.phone,
      customerEmail: userProf.email || '',
      pickup: carObj?.pickup || pickupLoc || 'Bhavnagar, Gujarat',
      dropoff: carObj?.dropoff || dropoffLoc || 'Ahmedabad Airport (AMD)',
      pickupCity: carObj?.pickupCity || pickupCity || 'Bhavnagar',
      dropoffCity: carObj?.dropoffCity || dropoffCity || 'Ahmedabad',
      noOfDays: carObj?.noOfDays || noOfDays || 1,
      isCustom: isCustomTrip,
      vehicle: selectedVehicleName,
      fare: totalFareNum,
      originalFare,
      walletDiscountUsed,
      couponUsed,
      tripType: isCustomTrip ? 'Custom Trip' : (carObj?.tripType || (tripType === 'round-trip' ? 'Round Trip (Return)' : 'One-Way')),
      scheduledDate,
      scheduledTime,
      driver: 'Unassigned',
      status: 'Pending',
      timestamp: new Date().toISOString()
    };

    if (walletDiscountUsed > 0) {
      db.deductWalletBalance(userProf.phone, walletDiscountUsed, newInquiryId);
    }

    // 1. Save into dbService (single source of truth for localStorage inquiries)
    db.saveInquiry(newInquiry);

    // 2. Trigger System Push & Notifications
    notifyAdmin({
      type: 'inquiry',
      title: `🚖 New Ride Inquiry ${newInquiryId}`,
      body: `Customer ${userProf.name} requested ${newInquiry.pickup} → ${newInquiry.dropoff} (₹${totalFareNum})`,
      extraData: { inquiryId: newInquiryId }
    });

    notifyCustomer({
      type: 'inquiry',
      title: '🚖 Booking Request Received!',
      body: `Your booking for ${newInquiry.pickup} → ${newInquiry.dropoff} is submitted. Driver assignment in progress!`,
      customerPhone: userProf.phone,
      customerEmail: userProf.email
    });

    // 3. Dual-write directly to Firestore & Hostinger MySQL Database
    saveInquiryToFirestore(newInquiry).catch(e => console.warn('Firestore inquiry save failed:', e));
    saveCustomerToFirestore(userProf).catch(e => console.warn('Firestore customer save failed:', e));
    saveInquiryToMySQL(newInquiry).catch(e => console.warn('MySQL inquiry save failed:', e));
    saveCustomerToMySQL(userProf).catch(e => console.warn('MySQL customer save failed:', e));

    // 5. Dispatch events to notify Admin Portal in real time
    window.dispatchEvent(new Event('storage'));
    window.dispatchEvent(new CustomEvent('EMPERIAL CABS_ride_booked', { detail: newInquiry }));

    setLastCreatedInquiry(newInquiry);
    setAppStage('INQUIRY_SUBMITTED');
  };

  // Tab Switcher Router in App Home - Persistent GPU-Accelerated Tab Mounting (Zero Blink / 60FPS)
  useEffect(() => {
    if (activeTab === 'home') {
      // Trigger map resize event when home tab becomes active to prevent Leaflet map blink
      const timer = setTimeout(() => {
        window.dispatchEvent(new Event('resize'));
      }, 50);
      return () => clearTimeout(timer);
    }
  }, [activeTab]);

  const renderTabContent = () => {
    return (
      <div className="mobile-tabs-keep-alive-wrapper" style={{ width: '100%', height: '100%', position: 'relative', overflow: 'hidden', background: '#F8FAFC' }}>
        {/* Tab 1: Home Screen with Live Map */}
        <div style={{ position: 'absolute', inset: 0, display: activeTab === 'home' ? 'flex' : 'none', flexDirection: 'column', zIndex: activeTab === 'home' ? 2 : 1 }}>
          <HomeScreen
            activeTab={activeTab}
            setActiveTab={setActiveTab}
            onStartBooking={() => setAppStage('SELECT_LOCATION_LIST')}
            onOpenTracking={() => setAppStage('TRACKING')}
          />
        </div>

        {/* Tab 2: My Rides / Bookings */}
        <div style={{ position: 'absolute', inset: 0, display: activeTab === 'rides' ? 'flex' : 'none', flexDirection: 'column', zIndex: activeTab === 'rides' ? 2 : 1 }}>
          <RidesTabScreen
            activeTab={activeTab}
            setActiveTab={setActiveTab}
            onBookNewRide={() => {
              setActiveTab('home');
              setAppStage('SELECT_LOCATION_LIST');
            }}
          />
        </div>

        {/* Tab 3: Empire Wallet & Rewards */}
        <div style={{ position: 'absolute', inset: 0, display: activeTab === 'wallet' ? 'flex' : 'none', flexDirection: 'column', zIndex: activeTab === 'wallet' ? 2 : 1 }}>
          <WalletTabScreen
            activeTab={activeTab}
            setActiveTab={setActiveTab}
          />
        </div>

        {/* Tab 4: Account & Rider Profile */}
        <div style={{ position: 'absolute', inset: 0, display: activeTab === 'account' ? 'flex' : 'none', flexDirection: 'column', zIndex: activeTab === 'account' ? 2 : 1 }}>
          <AccountTabScreen
            activeTab={activeTab}
            setActiveTab={setActiveTab}
            onLogout={handleLogout}
            onNavigateScreen={(target) => {
              if (target === 'letsyouin') setAppStage('LETS_YOU_IN');
              if (target === 'accountdetail') setAppStage('ACCOUNT_DETAILS');
              if (target === 'lang') setAppStage('PREFERRED_LANG');
              if (target === 'notification') setAppStage('NOTIFICATION_OPT');
            }}
          />
        </div>
      </div>
    );
  };

  // Modular View Orchestrator — wrapped in a fixed-height root container
  // so that all child screens with height:100% resolve correctly on iOS/Android
  const renderStage = () => { switch (appStage) {
    case 'PRELOADER':
      return <PreloaderScreen onFinish={handlePreloaderFinish} />;

    case 'SPLASH':
      return <SplashScreen onNext={() => setAppStage('ONBOARDING')} />;

    case 'ONBOARDING':
      return (
        <OnboardingScreen
          onSkip={() => {
            try { localStorage.setItem('EMPERIAL CABS_onboarded', 'true'); } catch (e) {}
            setAppStage('LETS_YOU_IN');
          }}
          onFinish={() => {
            try { localStorage.setItem('EMPERIAL CABS_onboarded', 'true'); } catch (e) {}
            setAppStage('LETS_YOU_IN');
          }}
        />
      );

    case 'LETS_YOU_IN':
      return (
        <LetsYouInScreen
          selectedGoogleAccount={selectedGoogleAccount}
          setSelectedGoogleAccount={setSelectedGoogleAccount}
          phoneNumber={phoneNumber}
          setPhoneNumber={setPhoneNumber}
          setAuthMethod={setAuthMethod}
          setAuthEmail={setAuthEmail}
          onNext={() => setAppStage('OTP_VERIFY')}
          onGoToCreateAccount={() => setAppStage('CREATE_PROFILE')}
          onGoogleSignIn={(returningUserProfile) => {
            // Called ONLY for returning users who already have a completed profile in DB
            if (returningUserProfile) setSelectedGoogleAccount(returningUserProfile);
            completeOnboarding(returningUserProfile);
          }}
          onBack={() => setAppStage('ONBOARDING')}
        />
      );

    case 'OTP_VERIFY':
      return (
        <OtpVerifyScreen
          phoneNumber={phoneNumber}
          otpCode={otpCode}
          setOtpCode={setOtpCode}
          authMethod={authMethod}
          authEmail={authEmail}
          onNext={() => proceedAfterAuth()}
          onBack={() => setAppStage('LETS_YOU_IN')}
        />
      );

    case 'NOTIFICATION_OPT':
      return (
        <NotificationOptScreen
          onNext={() => setAppStage('LOCATION_PERM')}
          onBack={() => {
            localStorage.setItem('EMPERIAL CABS_permissions_asked', 'true');
            setAppStage('APP_HOME');
          }}
        />
      );

    case 'PREFERRED_LANG':
      return (
        <PreferredLangScreen
          selectedLang={selectedLang}
          setSelectedLang={setSelectedLang}
          onNext={() => setAppStage('LOCATION_PERM')}
          onBack={() => setAppStage('NOTIFICATION_OPT')}
        />
      );

    case 'LOCATION_PERM':
      return (
        <LocationPermScreen
          onNext={() => {
            localStorage.setItem('EMPERIAL CABS_permissions_asked', 'true');
            setAppStage('APP_HOME');
          }}
          onBack={() => {
            localStorage.setItem('EMPERIAL CABS_permissions_asked', 'true');
            setAppStage('APP_HOME');
          }}
        />
      );

    case 'CREATE_PROFILE':
      return (
        <AccountDetailScreen
          isCreateMode={true}
          googleData={selectedGoogleAccount}
          onBack={() => setAppStage('LETS_YOU_IN')}
          onSave={(updatedProfile) => {
            if (updatedProfile) {
              saveCustomerToMySQL(updatedProfile).catch(() => {});
              window.dispatchEvent(new Event('storage'));
              window.dispatchEvent(new CustomEvent('EMPERIAL CABS_db_sync', { detail: { type: 'CUSTOMER_UPDATED', data: updatedProfile } }));
            }
            setAppStage('ACCOUNT_CREATED');
          }}
        />
      );

    case 'ACCOUNT_CREATED':
      return (
        <AccountCreatedScreen
          onNext={() => {
            localStorage.setItem('EMPERIAL CABS_onboarded', 'true');
            localStorage.setItem('EMPERIAL CABS_profile_completed', 'true');
            setAppStage('APP_HOME');
          }}
          onBack={() => {
            localStorage.setItem('EMPERIAL CABS_onboarded', 'true');
            localStorage.setItem('EMPERIAL CABS_profile_completed', 'true');
            setAppStage('APP_HOME');
          }}
        />
      );

    case 'APP_HOME':
      return renderTabContent();

    case 'ACCOUNT_DETAILS':
      return <AccountDetailScreen onBack={() => setAppStage('APP_HOME')} onSave={() => setAppStage('APP_HOME')} />;

    case 'SELECT_LOCATION_LIST':
      return (
        <SelectLocationScreen
          pickupLoc={pickupLoc}
          setPickupLoc={setPickupLoc}
          dropoffLoc={dropoffLoc}
          setDropoffLoc={setDropoffLoc}
          pickupCity={pickupCity}
          setPickupCity={setPickupCity}
          dropoffCity={dropoffCity}
          setDropoffCity={setDropoffCity}
          noOfDays={noOfDays}
          setNoOfDays={setNoOfDays}
          isCustom={isCustom}
          setIsCustom={setIsCustom}
          tripType={tripType}
          setTripType={setTripType}
          onSelectLocation={() => setAppStage('GOING_SEAT_SCHEDULE')}
          onBack={() => setAppStage('APP_HOME')}
        />
      );

    case 'GOING_SEAT_SCHEDULE':
      return (
        <SeatScheduleScreen
          userCoords={userCoords}
          pickupLoc={pickupLoc}
          dropoffLoc={dropoffLoc}
          pickupCity={pickupCity}
          dropoffCity={dropoffCity}
          noOfDays={noOfDays}
          isCustom={isCustom}
          tripType={tripType}
          setTripType={setTripType}
          scheduledDate={scheduledDate}
          setScheduledDate={setScheduledDate}
          scheduledTime={scheduledTime}
          setScheduledTime={setScheduledTime}
          returnDate={returnDate}
          setReturnDate={setReturnDate}
          selectedCar={selectedCar}
          setSelectedCar={setSelectedCar}
          onNext={(carObj) => handleRequestRide(carObj)}
          onBack={() => setAppStage('SELECT_LOCATION_LIST')}
        />
      );

    case 'SELECT_CAR':
      return (
        <SelectCarScreen
          userCoords={userCoords}
          pickupLoc={pickupLoc}
          dropoffLoc={dropoffLoc}
          tripType={tripType}
          selectedCar={selectedCar}
          setSelectedCar={setSelectedCar}
          onNext={(carObj) => handleRequestRide(carObj)}
          onBack={() => setAppStage('GOING_SEAT_SCHEDULE')}
        />
      );

    case 'INQUIRY_SUBMITTED':
      return (
        <InquirySubmittedScreen
          inquiry={lastCreatedInquiry}
          onGoHome={() => setAppStage('APP_HOME')}
          onViewRides={() => {
            setActiveTab('rides');
            setAppStage('APP_HOME');
          }}
        />
      );

    case 'SELECT_PAYMENT':
      return (
        <SelectPaymentScreen
          userCoords={userCoords}
          pickupLoc={pickupLoc}
          dropoffLoc={dropoffLoc}
          selectedPayment={selectedPayment}
          setSelectedPayment={setSelectedPayment}
          promoCode={promoCode}
          setPromoCode={setPromoCode}
          onRequestRide={handleRequestRide}
          onBack={() => setAppStage('SELECT_CAR')}
        />
      );

    case 'RADAR':
      return (
        <ProcessingScreen
          onCancel={() => setAppStage('SELECT_PAYMENT')}
          onMatched={() => setAppStage('MATCHED')}
        />
      );

    case 'MATCHED':
      return (
        <DriverFoundScreen
          userCoords={userCoords}
          pickupLoc={pickupLoc}
          dropoffLoc={dropoffLoc}
          onStartRide={() => setAppStage('TRACKING')}
        />
      );

    case 'TRACKING':
      return (
        <TripTrackingScreen
          userCoords={userCoords}
          pickupLoc={pickupLoc}
          dropoffLoc={dropoffLoc}
          activeTab={activeTab}
          setActiveTab={setActiveTab}
          onNavigateTab={(tab) => {
            setActiveTab(tab);
            setAppStage('APP_HOME');
          }}
          onCompleteRide={() => setAppStage('RECEIPT')}
        />
      );

    case 'RECEIPT':
      return <TripReceiptScreen onDone={() => setAppStage('APP_HOME')} />;

    default:
      return renderTabContent();
  } };

  return (
    <div
      id="EMPERIAL CABS-app-root"
      style={{
        width: '100%',
        height: '100vh',
        minHeight: '100vh',
        maxHeight: '100vh',
        display: 'flex',
        flexDirection: 'column',
        overflow: 'hidden',
        position: 'relative',
        background: '#F8FAFC'
      }}
    >
      {renderStage()}
    </div>
  );
}
