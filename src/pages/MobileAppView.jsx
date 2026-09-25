// EMPERIAL CABS Mobile User Experience & Navigation Engine v1.0.8
import React, { useState, useEffect } from 'react';
import './MobileAppView.css';
import { db } from '../services/dbService';
import { saveInquiryToMySQL, saveCustomerToMySQL, loadAllCustomersFromMySQL, loadAllInquiriesFromMySQL, fetchNotificationsFromMySQL, markNotificationDeliveredInMySQL } from '../services/mysqlService';
import { notifyAdmin, notifyCustomer, sendSystemPushNotification, requestNotificationPermission } from '../services/notificationEngine';

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

  // Enforce Clean Light Mode Throughout App (Dark mode removed)
  useEffect(() => {
    try {
      document.body.classList.remove('dark-mode');
      localStorage.removeItem('cabsy_theme_mode');
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
          const activeStatuses = ['In Progress', 'On Ride', 'Started'];
          const activeRide = list.find(i => {
            if (!i) return false;
            const iPhone = i.customerPhone ? String(i.customerPhone).replace(/\D/g, '') : '';
            const iEmail = i.customerEmail ? String(i.customerEmail).toLowerCase().trim() : '';
            const isMatch = (uPhone && iPhone && uPhone.slice(-10) === iPhone.slice(-10)) ||
                            (uEmail && iEmail && uEmail === iEmail);
            const statusStr = String(i.status || '');
            return isMatch && activeStatuses.some(s => statusStr.toLowerCase() === s.toLowerCase());
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
      const isCompleted = localStorage.getItem('EMPERIAL CABS_profile_completed') === 'true';
      if (savedProfile && isCompleted) {
        const parsed = JSON.parse(savedProfile);
        const hasName = Boolean(parsed && parsed.name && parsed.name.trim() !== '');
        const hasContact = Boolean(parsed && (parsed.phone || parsed.email));
        return Boolean(hasName && hasContact);
      }
      return false;
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

            const activeStatuses = ['In Progress', 'On Ride', 'Started'];
            inProgressRide = list.find(i => {
              if (!i) return false;
              const iPhone = i.customerPhone ? String(i.customerPhone).replace(/\D/g, '') : '';
              const iEmail = i.customerEmail ? String(i.customerEmail).toLowerCase().trim() : '';
              const isMatch = (uPhone && iPhone && uPhone.slice(-10) === iPhone.slice(-10)) ||
                              (uEmail && iEmail && uEmail === iEmail);
              const statusStr = String(i.status || '');
              return isMatch && activeStatuses.some(s => statusStr.toLowerCase() === s.toLowerCase());
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

  // Helper to restore trip history from MySQL for returning users
  const restoreTrips = async (profile) => {
    try {
      const mysqlInquiries = await loadAllInquiriesFromMySQL().catch(() => []);
      const userPhone = (profile.phone || '').replace(/\D/g, '');
      const userEmail = (profile.email || '').toLowerCase().trim();

      const userTrips = (mysqlInquiries || []).filter(i => {
        if (!i) return false;
        const iPhone = (i.customerPhone || '').replace(/\D/g, '');
        const iEmail = (i.customerEmail || '').toLowerCase().trim();
        return (userPhone && iPhone && userPhone.slice(-10) === iPhone.slice(-10)) ||
               (userEmail && iEmail && userEmail === iEmail);
      });

      if (userTrips.length > 0) {
        const localRaw = localStorage.getItem('cabsy_inquiries');
        const localList = localRaw ? JSON.parse(localRaw) : [];
        const existingIds = new Set(localList.map(i => i.id).filter(Boolean));
        const fresh = userTrips.filter(i => !existingIds.has(i.id));
        const merged = [...fresh, ...localList];
        localStorage.setItem('cabsy_inquiries', JSON.stringify(merged));
        window.dispatchEvent(new Event('storage'));
      }
    } catch (e) {
      console.warn('[Auth] Trip restore warning:', e);
    }
  };

  // Live watcher for driver assignment updates and cloud push notifications: triggers native notification panel on phone
  useEffect(() => {
    let isCancelled = false;
    const checkDriverAssignedNotifs = async () => {
      try {
        const savedPhone = localStorage.getItem('cabsy_user_phone') || phoneNumber || '';
        const savedProfile = localStorage.getItem('cabsy_user_profile');
        const userProf = savedProfile ? JSON.parse(savedProfile) : null;
        const uPhone = (userProf?.phone || savedPhone || '').replace(/\D/g, '');
        const uEmail = (userProf?.email || authEmail || '').toLowerCase().trim();

        // 1. Get all local inquiries on this device
        let localInqs = [];
        try {
          const raw = localStorage.getItem('cabsy_inquiries');
          if (raw) localInqs = JSON.parse(raw);
        } catch (e) {}
        const localInqIds = new Set(localInqs.map(i => i.id).filter(Boolean));
        const localPhones = new Set(localInqs.map(i => (i.customerPhone || '').replace(/\D/g, '')).filter(Boolean));
        if (uPhone) localPhones.add(uPhone);

        // 2. Poll MySQL inquiries for driver assignment
        const remoteInqs = await loadAllInquiriesFromMySQL().catch(() => []);
        if (!isCancelled && Array.isArray(remoteInqs) && remoteInqs.length > 0) {
          for (const inq of remoteInqs) {
            if (!inq) continue;
            const iPhone = (inq.customerPhone || '').replace(/\D/g, '');
            const iEmail = (inq.customerEmail || '').toLowerCase().trim();

            const isUserMatch = localInqIds.has(inq.id) ||
                                (iPhone && Array.from(localPhones).some(p => p.slice(-10) === iPhone.slice(-10))) ||
                                (uEmail && iEmail && uEmail === iEmail);

            if (!isUserMatch) continue;

            // If driver is assigned and status is Confirmed, Assigned, or In Progress
            const hasDriver = inq.driver && inq.driver !== 'Unassigned' && inq.driver !== '-';
            if (hasDriver) {
              const notifKey = `cabsy_driver_assigned_notified_${inq.id}_${inq.driver}_${inq.plate || ''}`;
              if (!localStorage.getItem(notifKey)) {
                localStorage.setItem(notifKey, 'true');
                
                const carName = inq.vehicle || inq.selectedCar || inq.carName || 'SWIFT';
                const plateNo = inq.plate || inq.vehiclePlate || inq.carPlate || 'GJ-04-AB-1234';
                const driverName = inq.driver;
                const driverContact = inq.driverPhone || inq.driverNumber || '+91 98250 99887';

                notifyCustomer({
                  type: 'driver_assigned',
                  title: 'Booking Confirmed - Driver Assigned!',
                  body: `Car: ${carName} | Plate: ${plateNo} | Driver: ${driverName} (${driverContact})`,
                  customerPhone: inq.customerPhone,
                  customerEmail: inq.customerEmail,
                  extraData: {
                    driver: driverName,
                    driverPhone: driverContact,
                    vehicle: carName,
                    plate: plateNo
                  }
                });
              }
            }
          }
        }

        // 3. Poll MySQL cloud push notifications dispatched by Admin (e.g. from Customer Directory)
        const checkPhones = Array.from(localPhones);
        const searchPhone = checkPhones[0] || uPhone || '';
        const cloudNotifs = await fetchNotificationsFromMySQL(searchPhone, uEmail).catch(() => []);
        if (!isCancelled && Array.isArray(cloudNotifs) && cloudNotifs.length > 0) {
          for (const cn of cloudNotifs) {
            const cnKey = `cabsy_cloud_notif_delivered_${cn.id}`;
            if (!localStorage.getItem(cnKey)) {
              localStorage.setItem(cnKey, 'true');
              sendSystemPushNotification(cn.title, cn.body, 'cloud-' + cn.id);
              markNotificationDeliveredInMySQL(cn.id).catch(() => {});
            }
          }
        }
      } catch (e) {}
    };

    const interval = setInterval(checkDriverAssignedNotifs, 3000);
    checkDriverAssignedNotifs();
    return () => {
      isCancelled = true;
      clearInterval(interval);
    };
  }, [phoneNumber, authEmail]);

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

    setAppStage('APP_HOME');
  };

  // Dynamic Authentication Resolution: Check if user exists in Database or local storage
  const proceedAfterAuth = async (authInfo = {}) => {
    const currentMethod = authInfo.authMethod || (selectedGoogleAccount ? 'google' : (authInfo.phone ? 'phone' : (phoneNumber ? 'phone' : 'email')));
    const isPhoneAuth = currentMethod === 'phone' || Boolean(authInfo.phone);
    const activePhone = isPhoneAuth ? (authInfo.phone || phoneNumber || '') : (authInfo.phone || '');
    const cleanPhone = activePhone.replace(/\D/g, '').slice(-10);
    const activeEmail = (authInfo.email || (currentMethod === 'email' ? authEmail : '') || '').toLowerCase().trim();
    const activeName = (authInfo.name || selectedGoogleAccount?.displayName || selectedGoogleAccount?.name || '').trim();

    try {
      localStorage.setItem('cabsy_auth_method', currentMethod);
      if (currentMethod === 'phone' && cleanPhone) {
        localStorage.setItem('cabsy_user_phone_verified', 'true');
        const formatted = activePhone.startsWith('+') ? activePhone : `+91 ${cleanPhone}`;
        localStorage.setItem('cabsy_user_phone', formatted);
      }
      if ((currentMethod === 'google' || currentMethod === 'email') && activeEmail) {
        localStorage.setItem('cabsy_user_email_verified', 'true');
        localStorage.setItem('cabsy_user_email_otp_target', activeEmail);
      }
      localStorage.setItem('EMPERIAL CABS_onboarded', 'true');

      let foundProfile = null;

      // 1. Check local profile by user key
      try {
        if (cleanPhone) {
          const phoneCached = localStorage.getItem(`cabsy_user_profile_${cleanPhone}`);
          if (phoneCached) {
            const parsed = JSON.parse(phoneCached);
            if (parsed && parsed.name && parsed.name.trim() !== '') {
              foundProfile = parsed;
            }
          }
        }
        if (!foundProfile && activeEmail) {
          const emailCached = localStorage.getItem(`cabsy_user_profile_email_${activeEmail}`);
          if (emailCached) {
            const parsed = JSON.parse(emailCached);
            if (parsed && parsed.name && parsed.name.trim() !== '') {
              foundProfile = parsed;
            }
          }
        }
        if (!foundProfile) {
          const savedUserProf = localStorage.getItem('cabsy_user_profile');
          if (savedUserProf) {
            const parsed = JSON.parse(savedUserProf);
            if (parsed && parsed.name && parsed.name.trim() !== '') {
              const pPhone = (parsed.phone || '').replace(/\D/g, '').slice(-10);
              const pEmail = (parsed.email || '').toLowerCase().trim();
              if ((cleanPhone && pPhone === cleanPhone) || (activeEmail && pEmail === activeEmail)) {
                foundProfile = parsed;
              }
            }
          }
        }
      } catch (e) {}

      // 2. Check local dbService customer database
      if (!foundProfile) {
        try {
          if (cleanPhone) {
            const match = db.getCustomerByPhone(cleanPhone);
            if (match && match.name && match.name.trim() !== '') foundProfile = match;
          }
          if (!foundProfile && activeEmail) {
            const match = db.getCustomerByEmail(activeEmail);
            if (match && match.name && match.name.trim() !== '') foundProfile = match;
          }
        } catch (e) {}
      }

      // Helper for quick remote timeout (2 seconds max for instant UX)
      const withTimeout = (promise, ms = 2000) => {
        return Promise.race([
          promise,
          new Promise(resolve => setTimeout(() => resolve(null), ms))
        ]);
      };

      // 3. Check Hostinger MySQL database customers
      if (!foundProfile) {
        try {
          const mysqlCustomers = await withTimeout(loadAllCustomersFromMySQL().catch(() => []), 2000);

          if (mysqlCustomers && Array.isArray(mysqlCustomers)) {
            const match = mysqlCustomers.find(c => {
              const cPhone = c.phone ? String(c.phone).replace(/\D/g, '').slice(-10) : '';
              const cEmail = (c.email || c.customerEmail || '').toLowerCase().trim();
              const phoneMatch = cleanPhone && cPhone && cleanPhone === cPhone;
              const emailMatch = activeEmail && cEmail && activeEmail === cEmail;
              return (phoneMatch || emailMatch) && (c.name || c.customerName);
            });
            if (match) {
              foundProfile = {
                id: match.id || ('CUST-' + Math.floor(10000 + Math.random() * 89999)),
                name: match.name || match.customerName,
                email: match.email || match.customerEmail || activeEmail,
                phone: match.phone || match.customerPhone || (cleanPhone ? `+91 ${cleanPhone}` : ''),
                photoURL: match.photoURL || null,
                profession: match.profession || '',
                area: match.area || '',
                age: match.age || '',
                status: 'Active'
              };
            }
          }
        } catch (e) {}
      }

      // ─── DECISION: Returning Existing Customer vs New Customer ─────────────────
      const foundPhoneDigits = (foundProfile?.phone || '').replace(/\D/g, '');
      const isExistingCompletedCustomer = Boolean(
        foundProfile &&
        foundProfile.name &&
        foundProfile.name.trim() !== '' &&
        foundPhoneDigits.length >= 10 &&
        (localStorage.getItem('EMPERIAL CABS_profile_completed') === 'true' || foundProfile.status === 'Active')
      );

      if (isExistingCompletedCustomer) {
        // User ALREADY exists in database with completed profile! Save profile & shift directly to Home Screen
        const finalProfile = {
          ...foundProfile,
          phone: foundProfile.phone.startsWith('+') ? foundProfile.phone : `+91 ${foundPhoneDigits.slice(-10)}`,
          email: foundProfile.email || activeEmail || '',
          lastLogin: new Date().toISOString()
        };

        localStorage.setItem('cabsy_user_profile', JSON.stringify(finalProfile));
        localStorage.setItem('EMPERIAL CABS_profile_completed', 'true');
        const finalClean = finalProfile.phone.replace(/\D/g, '').slice(-10);
        if (finalClean) {
          localStorage.setItem(`cabsy_user_profile_${finalClean}`, JSON.stringify(finalProfile));
          localStorage.setItem('cabsy_user_phone', finalProfile.phone);
        }
        if (finalProfile.email) {
          localStorage.setItem(`cabsy_user_profile_email_${finalProfile.email.toLowerCase().trim()}`, JSON.stringify(finalProfile));
          localStorage.setItem('cabsy_user_email_otp_target', finalProfile.email.toLowerCase().trim());
        }

        db.saveCustomer(finalProfile);
        saveCustomerToMySQL(finalProfile).catch(() => {});

        restoreTrips(finalProfile);
        window.dispatchEvent(new Event('storage'));

        // Direct inside to Home (no profile creation needed)
        setAppStage('APP_HOME');
        return;
      }
    } catch (e) {
      console.warn('[proceedAfterAuth] Error:', e);
    }

    // ─── NEW / FIRST TIME USER (All login methods: Google, Phone OTP, Email OTP) ───
    // Route to Create/Complete Profile screen!
    const displayName = activeName || (authInfo.email ? authInfo.email.split('@')[0] : '');
    const draftProfile = {
      id: 'CUST-' + Math.floor(10000 + Math.random() * 89999),
      name: displayName || '',
      phone: cleanPhone.length >= 10 ? (activePhone.startsWith('+') ? activePhone : `+91 ${cleanPhone}`) : '',
      email: (authInfo.email || activeEmail || '').toLowerCase().trim(),
      photoURL: authInfo.photoURL || selectedGoogleAccount?.photoURL || null,
      registeredAt: new Date().toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' }),
      status: 'Active'
    };
    try {
      localStorage.setItem('cabsy_user_profile', JSON.stringify(draftProfile));
      localStorage.removeItem('EMPERIAL CABS_profile_completed');
      if (draftProfile.phone) localStorage.setItem('cabsy_user_phone', draftProfile.phone);
      else localStorage.removeItem('cabsy_user_phone');
      if (draftProfile.email) localStorage.setItem('cabsy_user_email_otp_target', draftProfile.email);
    } catch (e) {}

    // Shift to Complete Profile screen for all first-time / new users
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

    const newInquiryId = db.getNextInquiryId();
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

    // 3. Save directly to Hostinger MySQL Database
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
          onGoToCreateAccount={() => {
            const draft = {
              name: '',
              phone: phoneNumber || '',
              email: authEmail || ''
            };
            try {
              localStorage.setItem('cabsy_user_profile', JSON.stringify(draft));
              localStorage.removeItem('EMPERIAL CABS_profile_completed');
            } catch (e) {}
            setAppStage('CREATE_PROFILE');
          }}
          onGoogleSignIn={(googleUser) => {
            if (googleUser) {
              setSelectedGoogleAccount(googleUser);
              proceedAfterAuth({
                email: googleUser.email,
                name: googleUser.name,
                photoURL: googleUser.photoURL,
                uid: googleUser.uid,
                authMethod: googleUser.authMethod || 'google'
              });
            }
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
          onNext={(authResult) => proceedAfterAuth(authResult)}
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
              restoreTrips(updatedProfile);
              window.dispatchEvent(new Event('storage'));
              window.dispatchEvent(new CustomEvent('EMPERIAL CABS_db_sync', { detail: { type: 'CUSTOMER_UPDATED', data: updatedProfile } }));
            }
            setAppStage('APP_HOME');
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
