// EMPERIAL CABS Admin Portal v1.0.4 - Live Trip Tracking & Chronological Inquiries Engine
import React, { useState, useEffect } from 'react';
import {
  saveInquiryToMySQL,
  loadAllInquiriesFromMySQL,
  saveCustomerToMySQL,
  loadAllCustomersFromMySQL,
  initMySQLTables,
  purgeDemoDataFromMySQL,
  purgeAllDataFromMySQL,
  deleteCustomerFromMySQL,
  deleteInquiryFromMySQL,
  updateInquiryStatusInMySQL,
  updateInquiryRewardInMySQL,
  saveWalletToMySQL,
} from '../services/mysqlService';
import { 
  notifyAdmin, 
  notifyCustomer, 
  getAdminNotifications, 
  initEcosystemScheduler, 
  requestNotificationPermission 
} from '../services/notificationEngine';
import db from '../services/dbService';
import { 
  LayoutDashboard, 
  Inbox, 
  Car, 
  Users, 
  BarChart3, 
  Settings, 
  Plus, 
  CheckCircle2, 
  XCircle, 
  Trash2, 
  Eye, 
  Search, 
  DollarSign, 
  TrendingUp, 
  UserPlus, 
  UserCheck, 
  Clock, 
  MapPin, 
  Phone, 
  Mail, 
  ShieldAlert, 
  Save, 
  RefreshCw,
  LogOut,
  ChevronRight,
  Lock,
  KeyRound,
  Bell,
  Zap,
  Activity,
  Edit,
  Play,
  CheckCircle,
  Award,
  Navigation,
  Gift,
  Sparkles,
  Menu,
  X
} from 'lucide-react';
import './AdminPortal.css';

export const INITIAL_VEHICLES = [
  {
    id: 'CAR-101',
    name: 'SWIFT',
    passengers: '4 Persons',
    rate: '5.00',
    status: 'Active',
    image: 'https://images.unsplash.com/photo-1549399542-7e3f8b79c341?auto=format&fit=crop&w=600&q=80',
    description: 'Comfortable executive sedan for daily commute and airport transfers.'
  },
  {
    id: 'CAR-102',
    name: 'AURA (CNG)',
    passengers: '4 Persons',
    rate: '3.00',
    status: 'Active',
    image: 'https://images.unsplash.com/photo-1533473359331-0135ef1b58bf?auto=format&fit=crop&w=600&q=80',
    description: 'Spacious 4-seater for family trips and heavy luggage.'
  },
  {
    id: 'CAR-103',
    name: 'EARTICE (PETROL)',
    passengers: '7 Persons',
    rate: '10.00',
    status: 'Active',
    image: 'https://images.unsplash.com/photo-1555215695-3004980ad54e?auto=format&fit=crop&w=600&q=80',
    description: 'Premium class for VIP mobility.'
  },
  {
    id: 'CAR-104',
    name: 'Electric',
    passengers: '7 Persons',
    rate: '3.00',
    status: 'Active',
    image: 'https://images.unsplash.com/photo-1563720223185-11003d516935?auto=format&fit=crop&w=600&q=80',
    description: 'Zero-emission eco-friendly electric ride experience.'
  }
];

// Clean Database Initialization with Default Demo Records
const INITIAL_DRIVERS = [
  { id: 'DRV-101', name: 'Ramesh Patel', phone: '+91 98250 99887', vehicle: 'Emperial XL SUV', plate: 'GJ-04-AB-1234', status: 'Active', rating: 4.9 },
  { id: 'DRV-102', name: 'Suresh Verma', phone: '+91 99099 11223', vehicle: 'Emperial Executive Luxury', plate: 'GJ-04-CD-5678', status: 'Active', rating: 4.8 },
  { id: 'DRV-103', name: 'Amit Singh', phone: '+91 98765 33445', vehicle: 'Emperial Regular Sedan', plate: 'GJ-04-EF-9012', status: 'Active', rating: 4.9 },
  { id: 'DRV-104', name: 'Hardik Joshi', phone: '+91 97234 55667', vehicle: 'Emperial Eco Green EV', plate: 'GJ-04-EV-3456', status: 'Active', rating: 5.0 }
];

const INITIAL_INQUIRIES = [
  {
    id: 'INQ-9801',
    customerName: 'Rajesh Kumar',
    customerPhone: '+91 98250 12345',
    customerEmail: 'rajesh.kumar@gmail.com',
    pickup: 'Bhavnagar, Gujarat',
    dropoff: 'Ahmedabad Airport (AMD)',
    vehicle: 'Emperial XL SUV',
    fare: 2625.00,
    status: 'Completed',
    driver: 'Ramesh Patel',
    date: new Date().toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' }),
    timestamp: new Date(Date.now() - 3600000 * 2).toISOString(),
    rewardIssued: 1,
    rewardAmount: 100
  },
  {
    id: 'INQ-9802',
    customerName: 'Ananya Sharma',
    customerPhone: '+91 99099 87654',
    customerEmail: 'ananya.s@techcorp.in',
    pickup: 'Bhavnagar, Gujarat',
    dropoff: 'Vadodara Central Railway Station',
    vehicle: 'Emperial Executive Luxury',
    fare: 1650.00,
    status: 'Confirmed',
    driver: 'Suresh Verma',
    date: new Date().toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' }),
    timestamp: new Date(Date.now() - 3600000 * 5).toISOString()
  },
  {
    id: 'INQ-9803',
    customerName: 'Vikram Mehta',
    customerPhone: '+91 98765 43210',
    customerEmail: 'vikram.mehta@yahoo.com',
    pickup: 'Bhavnagar, Gujarat',
    dropoff: 'SG Highway IT Park',
    vehicle: 'Emperial Regular Sedan',
    fare: 2160.00,
    status: 'Completed',
    driver: 'Amit Singh',
    date: new Date().toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' }),
    timestamp: new Date(Date.now() - 3600000 * 12).toISOString(),
    rewardIssued: 1,
    rewardAmount: 100
  },
  {
    id: 'INQ-9804',
    customerName: 'Priya Desai',
    customerPhone: '+91 97234 56789',
    customerEmail: 'priya.desai@gmail.com',
    pickup: 'Bhavnagar Railway Station',
    dropoff: 'Alkapuri Commercial Hub',
    vehicle: 'Emperial Eco Green EV',
    fare: 1450.00,
    status: 'Confirmed',
    driver: 'Hardik Joshi',
    date: new Date().toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' }),
    timestamp: new Date(Date.now() - 3600000 * 18).toISOString()
  }
];

const INITIAL_CUSTOMERS = [
  { id: 'CUST-301', name: 'Rajesh Kumar', phone: '+91 98250 12345', email: 'rajesh.kumar@gmail.com', totalRides: 4, totalSpent: 7850, joined: '2026-01-15' },
  { id: 'CUST-302', name: 'Ananya Sharma', phone: '+91 99099 87654', email: 'ananya.s@techcorp.in', totalRides: 2, totalSpent: 3300, joined: '2026-02-10' },
  { id: 'CUST-303', name: 'Vikram Mehta', phone: '+91 98765 43210', email: 'vikram.mehta@yahoo.com', totalRides: 3, totalSpent: 5400, joined: '2026-03-01' },
  { id: 'CUST-304', name: 'Priya Desai', phone: '+91 97234 56789', email: 'priya.desai@gmail.com', totalRides: 1, totalSpent: 1450, joined: '2026-04-20' },
  { id: 'CUST-305', name: 'empire rider', phone: '+91 98765 06393', email: 'batman063939@gmail.com', totalRides: 5, totalSpent: 9200, joined: '2026-05-01' }
];

export const INITIAL_DESTINATIONS = [
  { id: 'DEST-101', name: 'Bhavnagar → Railway Station', pickup: 'Bhavnagar, Gujarat', dropoff: 'Bhavnagar Railway Station', distanceKm: 18 },
  { id: 'DEST-102', name: 'Bhavnagar → Ahmedabad Airport (AMD)', pickup: 'Bhavnagar, Gujarat', dropoff: 'Ahmedabad Airport (AMD)', distanceKm: 175 },
  { id: 'DEST-103', name: 'Bhavnagar → Vadodara Central Station', pickup: 'Bhavnagar, Gujarat', dropoff: 'Vadodara Central Railway Station', distanceKm: 110 },
  { id: 'DEST-104', name: 'Bhavnagar → SG Highway IT Park', pickup: 'Bhavnagar, Gujarat', dropoff: 'SG Highway IT Park', distanceKm: 180 },
  { id: 'DEST-105', name: 'Bhavnagar → Alkapuri Hub', pickup: 'Bhavnagar, Gujarat', dropoff: 'Alkapuri Commercial Hub', distanceKm: 112 },
  { id: 'DEST-106', name: 'Bhavnagar → Ghogha Circle & Beach', pickup: 'Bhavnagar, Gujarat', dropoff: 'Ghogha Circle & Beach', distanceKm: 12 },
  { id: 'DEST-107', name: 'Bhavnagar → Mumbai Central Airport', pickup: 'Bhavnagar, Gujarat', dropoff: 'Mumbai Central Airport (BOM)', distanceKm: 540 }
];

export const INITIAL_PLACES = [
  'Bhavnagar, Gujarat',
  'Bhavnagar Railway Station',
  'Ahmedabad Airport (AMD)',
  'Vadodara Central Railway Station',
  'SG Highway IT Park',
  'Alkapuri Commercial Hub',
  'Ghogha Circle & Beach',
  'Mumbai Central Airport (BOM)'
];

export default function AdminPortal() {
  // Security PIN Auth State
  const [isAuthenticated, setIsAuthenticated] = useState(() => {
    return sessionStorage.getItem('cabsy_admin_authed') === 'true';
  });
  const [pinInput, setPinInput] = useState('');
  const [pinError, setPinError] = useState(false);

  // Full-Page Rich Push Notification Composer Modal State
  const [sendNotifModal, setSendNotifModal] = useState({
    open: false,
    customer: null,
    title: '',
    body: '',
    type: 'reward'
  });

  // PWA Install Prompt State
  const [deferredPrompt, setDeferredPrompt] = useState(null);

  useEffect(() => {
    const handleBeforeInstall = (e) => {
      e.preventDefault();
      setDeferredPrompt(e);
    };
    window.addEventListener('beforeinstallprompt', handleBeforeInstall);
    return () => window.removeEventListener('beforeinstallprompt', handleBeforeInstall);
  }, []);

  const handleInstallApp = async () => {
    if (deferredPrompt) {
      deferredPrompt.prompt();
      const choice = await deferredPrompt.userChoice;
      if (choice.outcome === 'accepted') {
        setDeferredPrompt(null);
      }
    } else {
      alert("To install the Admin App to your Home Screen:\n\n1. Chrome / Edge / PC: Click the 'Install' icon in your browser address bar.\n2. Mobile / Android / iOS: Tap menu (⋮ or Share) ➔ Select 'Add to Home Screen'.");
    }
  };

  const [activeTab, setActiveTab] = useState('dashboard');
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);
  
  // State — initialize with localStorage or empty array (no hardcoded fallback)
  const [inquiries, setInquiries] = useState(() => {
    const saved = localStorage.getItem('cabsy_inquiries') || localStorage.getItem('emperial_cabs_inquiries');
    if (saved !== null) {
      try {
        const parsed = JSON.parse(saved);
        if (Array.isArray(parsed)) return parsed;
      } catch (e) {}
    }
    return [];
  });
  const [firestoreLoading, setFirestoreLoading] = useState(true);
  const [customers, setCustomers] = useState(() => {
    const saved = localStorage.getItem('cabsy_customers') || localStorage.getItem('emperial_cabs_customers');
    if (saved !== null) {
      try {
        const parsed = JSON.parse(saved);
        if (Array.isArray(parsed)) return parsed;
      } catch (e) {}
    }
    return [];
  });

  // Always sort inquiries by newest first (Latest date/timestamp at the top across all 3 tabs)
  const sortedInquiries = React.useMemo(() => {
    return [...inquiries].sort((a, b) => {
      // 1. Compare ISO timestamp / createdAt
      const timeA = new Date(a.timestamp || a.createdAt || 0).getTime();
      const timeB = new Date(b.timestamp || b.createdAt || 0).getTime();
      if (timeA > 0 && timeB > 0 && timeA !== timeB) {
        return timeB - timeA;
      }
      // 2. Parse date string (e.g. "Aug 16, 2026" vs "Aug 15, 2026")
      if (a.date && b.date && a.date !== b.date) {
        const parseA = Date.parse(a.date);
        const parseB = Date.parse(b.date);
        if (!isNaN(parseA) && !isNaN(parseB) && parseA !== parseB) {
          return parseB - parseA;
        }
      }
      // 3. Compare numeric portion of INQ ID as secondary fallback
      const numA = parseInt(String(a.id).replace(/\D/g, '')) || 0;
      const numB = parseInt(String(b.id).replace(/\D/g, '')) || 0;
      if (numA !== numB) return numB - numA;
      // 4. Stable deterministic tie-breaker (never jump or swap order)
      return String(b.id || '').localeCompare(String(a.id || ''));
    });
  }, [inquiries]);

  // Resolve customer name properly: if "Google User", "Rider", or "Web Passenger", check profile/email/phone
  const resolveCustomerName = (inq) => {
    if (!inq) return 'Valued Customer';
    const name = inq.customerName || inq.name || '';
    if (name && name !== 'Google User' && name !== 'Rider' && name !== 'Web Passenger' && name !== 'Guest Customer') {
      return name;
    }
    // Try matching customer profile from customers array by phone or email
    const match = customers.find(c => {
      if (c.phone && inq.customerPhone && c.phone.replace(/\D/g, '').endsWith(inq.customerPhone.replace(/\D/g, '').slice(-8))) return true;
      if (c.email && inq.customerEmail && c.email.toLowerCase() === inq.customerEmail.toLowerCase()) return true;
      return false;
    });
    if (match && match.name && match.name !== 'Google User' && match.name !== 'Rider') {
      return match.name;
    }
    if (inq.customerEmail && inq.customerEmail.includes('@')) {
      const handle = inq.customerEmail.split('@')[0].replace(/[._-]/g, ' ');
      if (handle) return handle.charAt(0).toUpperCase() + handle.slice(1);
    }
    if (inq.customerPhone && inq.customerPhone.length > 5) {
      return `Customer (${inq.customerPhone.slice(-5)})`;
    }
    return 'Empire Passenger';
  };

  const [drivers, setDrivers] = useState(() => {
    const saved = localStorage.getItem('cabsy_drivers');
    return saved ? JSON.parse(saved) : INITIAL_DRIVERS;
  });

  const [vehicles, setVehicles] = useState(() => {
    const saved = localStorage.getItem('cabsy_vehicles');
    return saved ? JSON.parse(saved) : INITIAL_VEHICLES;
  });

  const [destinations, setDestinations] = useState(() => {
    const saved = localStorage.getItem('cabsy_destinations');
    const parsed = saved ? JSON.parse(saved) : INITIAL_DESTINATIONS;
    return parsed.filter(d => d && d.pickup && d.dropoff);
  });

  const [places, setPlaces] = useState(() => {
    const saved = localStorage.getItem('cabsy_places');
    return saved ? JSON.parse(saved) : INITIAL_PLACES;
  });

  const [newPlaceInput, setNewPlaceInput] = useState('');

  const [contactMessages, setContactMessages] = useState(() => {
    const saved = localStorage.getItem('cabsy_contact_messages') || localStorage.getItem('cabsy_messages');
    if (saved !== null) {
      try {
        const parsed = JSON.parse(saved);
        if (Array.isArray(parsed)) return parsed;
      } catch(e){}
    }
    return [];
  });

  const [settings, setSettings] = useState(() => {
    const saved = localStorage.getItem('cabsy_website_settings');
    return saved ? JSON.parse(saved) : {
      heroHeading: 'The Easiest Way to Book Your Ride Download Our App for Instant Access',
      contactPhone: '+62 831-9929-86700',
      contactEmail: 'contact@domain.com',
      officeAddress: 'Jl. Raya Sesetan No.210, Sesetan, Denpasar, Bali',
      baseFareReguler: '2.20',
      baseFareXL: '3.50',
      baseFareLuxury: '4.80',
    };
  });

  // Modal Control States
  const [assignModal, setAssignModal] = useState({ open: false, inquiry: null });
  const [completeModal, setCompleteModal] = useState({ open: false, inquiry: null, finalPrice: '', rewardAmount: '0' });
  const [addDriverModal, setAddDriverModal] = useState(false);
  const [addCustomerModal, setAddCustomerModal] = useState(false);
  const [addInquiryModal, setAddInquiryModal] = useState(false);
  const [addVehicleModal, setAddVehicleModal] = useState(false);
  const [editVehicleModal, setEditVehicleModal] = useState({ open: false, vehicle: null });
  const [addDestModal, setAddDestModal] = useState(false);
  const [editDestModal, setEditDestModal] = useState({ open: false, destination: null });
  const [customerDetailModal, setCustomerDetailModal] = useState({ open: false, customer: null });
  const [rewardModal, setRewardModal] = useState({ open: false, inquiry: null, amount: 100 });
  const [receiptModal, setReceiptModal] = useState({ open: false, inquiry: null });
  const [driverReportModal, setDriverReportModal] = useState({ open: false, driver: null });
  const [viewMessageModal, setViewMessageModal] = useState({ open: false, message: null });
  const [messageCategoryFilter, setMessageCategoryFilter] = useState('All');
  const [messageSearchQuery, setMessageSearchQuery] = useState('');
  const [actionLoadingId, setActionLoadingId] = useState(null);
  const [companyShare, setCompanyShare] = useState(() => {
    const saved = localStorage.getItem('cabsy_company_share');
    return saved ? Number(saved) : 20;
  });
  const driverShare = 100 - companyShare;
  const [commissionModal, setCommissionModal] = useState(false);

  useEffect(() => {
    localStorage.setItem('cabsy_messages', JSON.stringify(contactMessages));
    localStorage.setItem('cabsy_contact_messages', JSON.stringify(contactMessages));
  }, [contactMessages]);

  useEffect(() => {
    const syncContactMessages = () => {
      try {
        const saved = localStorage.getItem('cabsy_messages') || localStorage.getItem('cabsy_contact_messages');
        if (saved) {
          setContactMessages(JSON.parse(saved));
        }
      } catch (e) {}
    };
    window.addEventListener('storage', syncContactMessages);
    window.addEventListener('EMPERIAL CABS_messages_updated', syncContactMessages);
    return () => {
      window.removeEventListener('storage', syncContactMessages);
      window.removeEventListener('EMPERIAL CABS_messages_updated', syncContactMessages);
    };
  }, []);

  const handleMarkMessageRead = (msgId) => {
    setContactMessages(prev => prev.map(m => m.id === msgId ? { ...m, status: m.status === 'Unread' ? 'Read' : m.status } : m));
  };

  const handleToggleMessageStatus = (msgId, newStatus) => {
    setContactMessages(prev => prev.map(m => m.id === msgId ? { ...m, status: newStatus } : m));
  };

  const handleDeleteMessage = (msgId) => {
    if (window.confirm("Are you sure you want to delete this contact message?")) {
      setContactMessages(prev => prev.filter(m => m.id !== msgId));
    }
  };

  const handleIssueRewardSubmit = () => {
    if (!rewardModal.inquiry) return;
    const inq = rewardModal.inquiry;
    const actionKey = 'reward_' + inq.id;
    if (actionLoadingId === actionKey) return;
    setActionLoadingId(actionKey);

    const rewardAmount = Number(rewardModal.amount) || 100;

    // 1. Add reward to customer wallet in dbService
    db.addRewardToCustomer(inq.customerPhone, rewardAmount, inq.id, inq.pickup, inq.dropoff);

    // 2. Update inquiry state & localStorage
    setInquiries(prev => {
      const updated = prev.map(item => {
        if (item.id === inq.id) {
          return { ...item, rewardIssued: 1, rewardAmount: rewardAmount };
        }
        return item;
      });
      localStorage.setItem('cabsy_inquiries', JSON.stringify(updated));
      return updated;
    });

    // 3. Persist to Hostinger MySQL Database
    if (inq.id) {
      updateInquiryRewardInMySQL(inq.id, true, rewardAmount).catch(() => {});
    }

    try {
      const savedInquiries = db.getInquiries();
      const updated = savedInquiries.map(item => {
        if (item.id === inq.id) {
          return { ...item, rewardIssued: 1, rewardAmount: rewardAmount };
        }
        return item;
      });
      localStorage.setItem('cabsy_inquiries', JSON.stringify(updated));
    } catch (e) {}

    // Send Direct Push & App Notification to Customer
    notifyCustomer({
      type: 'reward',
      title: '🎁 Wallet Reward Credited!',
      body: `Congratulations! You received ₹${rewardAmount} wallet reward credit from EMPERIAL CABS for trip ${inq.id}!`,
      customerPhone: inq.customerPhone,
      customerEmail: inq.customerEmail
    });

    window.dispatchEvent(new Event('storage'));
    alert(`Successfully credited ₹${rewardAmount} reward to ${inq.customerName}'s wallet!`);

    setTimeout(() => {
      setActionLoadingId(null);
      setRewardModal({ open: false, inquiry: null, amount: 100 });
    }, 350);
  };

  // Notification System State
  const [notifications, setNotifications] = useState(() => {
    const list = getAdminNotifications();
    if (list !== null && Array.isArray(list)) return list;
    return [];
  });
  const [showNotifDropdown, setShowNotifDropdown] = useState(false);

  // Notification & Live MySQL Data Sync Engine
  useEffect(() => {
    requestNotificationPermission();
    initEcosystemScheduler();

    const fetchAllData = async (isInitial = false) => {
      try {
        if (isInitial) setFirestoreLoading(true);

        // 1. Fetch Inquiries from Hostinger MySQL
        const mysqlInquiries = await loadAllInquiriesFromMySQL();
        const localInquiries = db.getInquiries() || [];
        
        // Merge MySQL + Local Storage inquiries
        const inqMap = new Map();
        [...localInquiries, ...mysqlInquiries].forEach(item => {
          if (item && item.id) {
            inqMap.set(item.id, { ...inqMap.get(item.id), ...item });
          }
        });
        const mergedInquiries = Array.from(inqMap.values());
        
        // Only update state if inquiries data has actually changed (prevents flicker & jump)
        setInquiries(prev => {
          if (JSON.stringify(prev) === JSON.stringify(mergedInquiries)) {
            return prev;
          }
          return mergedInquiries;
        });

        // 2. Fetch Customers from Hostinger MySQL
        const mysqlCustomers = await loadAllCustomersFromMySQL();
        const localCustomers = db.getCustomers() || [];

        const custMap = new Map();
        [...localCustomers, ...mysqlCustomers].forEach(c => {
          const key = (c.email || c.phone || c.id || '').toLowerCase().trim();
          if (key) {
            custMap.set(key, { ...custMap.get(key), ...c });
          }
        });
        const mergedCustomers = Array.from(custMap.values());

        setCustomers(prev => {
          if (JSON.stringify(prev) === JSON.stringify(mergedCustomers)) {
            return prev;
          }
          return mergedCustomers;
        });
      } catch (e) {
        console.warn('MySQL Fetch Exception in AdminPortal:', e);
      } finally {
        if (isInitial) setFirestoreLoading(false);
      }
    };

    fetchAllData(true);

    // Sync admin notifications
    const syncAdminNotifs = () => {
      const fresh = getAdminNotifications();
      if (fresh && fresh.length > 0) {
        setNotifications(fresh);
      }
      fetchAllData(false);
    };

    window.addEventListener('EMPERIAL CABS_admin_notif', syncAdminNotifs);
    window.addEventListener('EMPERIAL CABS_db_sync', syncAdminNotifs);
    window.addEventListener('storage', syncAdminNotifs);
    
    // Poll Hostinger MySQL silently in background every 12s (prevents DB connection exhaustion)
    const interval = setInterval(() => fetchAllData(false), 12000);

    return () => {
      window.removeEventListener('EMPERIAL CABS_admin_notif', syncAdminNotifs);
      window.removeEventListener('EMPERIAL CABS_db_sync', syncAdminNotifs);
      window.removeEventListener('storage', syncAdminNotifs);
      clearInterval(interval);
    };
  }, []);

  const unreadCount = notifications.filter(n => !n.read).length;

  const handleMarkAllRead = () => {
    setNotifications(notifications.map(n => ({ ...n, read: true })));
    try {
      const updated = notifications.map(n => ({ ...n, read: true }));
      localStorage.setItem('cabsy_admin_notifications', JSON.stringify(updated));
    } catch (e) {}
  };

  const handleClearNotif = (id) => {
    setNotifications(notifications.filter(n => n.id !== id));
    try {
      const updated = notifications.filter(n => n.id !== id);
      localStorage.setItem('cabsy_admin_notifications', JSON.stringify(updated));
    } catch (e) {}
  };

  // Form inputs
  const [selectedDriverId, setSelectedDriverId] = useState('');
  const [selectedAssignVehicle, setSelectedAssignVehicle] = useState('');
  const [selectedAssignPlate, setSelectedAssignPlate] = useState('');
  const [newDriverForm, setNewDriverForm] = useState({ name: '', phone: '', vehicle: 'Empire Regular', plate: '' });
  const [newCustomerForm, setNewCustomerForm] = useState({ name: '', phone: '', email: '' });
  const [newInquiryForm, setNewInquiryForm] = useState({ customerName: '', customerPhone: '', pickup: '', dropoff: '', vehicle: 'Empire Regular', fare: 35.00 });
  const [newVehicleForm, setNewVehicleForm] = useState({ name: '', passengers: '4 Persons', rate: '15.00', status: 'Active', image: '', description: '' });
  const [newDestForm, setNewDestForm] = useState({ name: '', pickup: '', dropoff: '', distanceKm: 15 });

  const handleImageFileUpload = (e, isEdit = false) => {
    const file = e.target.files && e.target.files[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onloadend = () => {
      if (isEdit) {
        setEditVehicleModal(prev => ({
          ...prev,
          vehicle: { ...prev.vehicle, image: reader.result }
        }));
      } else {
        setNewVehicleForm(prev => ({
          ...prev,
          image: reader.result
        }));
      }
    };
    reader.readAsDataURL(file);
  };

  // ── Load real data dynamically from Hostinger MySQL Database ──
  useEffect(() => {
    const loadFromCloud = async () => {
      setFirestoreLoading(true);
      try {
        // Auto initialize Hostinger MySQL tables and schema if not present
        initMySQLTables().catch(() => {});

        const [mysqlInquiries, mysqlCustomers] = await Promise.all([
          loadAllInquiriesFromMySQL().catch(() => []),
          loadAllCustomersFromMySQL().catch(() => [])
        ]);

        setInquiries(Array.isArray(mysqlInquiries) ? mysqlInquiries : []);
        const map = new Map();
        (mysqlCustomers || []).forEach(row => {
          const key = (row.email || row.phone || row.id || '').toLowerCase().trim();
          if (!key) return;
          if (!map.has(key)) {
            map.set(key, { ...row });
          } else {
            const existing = map.get(key);
            existing.totalRides = Math.max(Number(existing.totalRides || 0), Number(row.totalRides || 0));
            existing.totalSpent = Math.max(Number(existing.totalSpent || 0), Number(row.totalSpent || 0));
            if (!existing.phone && row.phone) existing.phone = row.phone;
            if (!existing.email && row.email) existing.email = row.email;
          }
        });
        setCustomers(Array.from(map.values()));
      } catch (e) {
        console.warn('Hostinger MySQL load error:', e);
      } finally {
        setFirestoreLoading(false);
      }
    };

    loadFromCloud();
    const pollInterval = setInterval(loadFromCloud, 10000);
    const handleSyncEvent = () => loadFromCloud();

    window.addEventListener('storage', handleSyncEvent);
    window.addEventListener('EMPERIAL CABS_db_sync', handleSyncEvent);

    return () => {
      clearInterval(pollInterval);
      window.removeEventListener('storage', handleSyncEvent);
      window.removeEventListener('EMPERIAL CABS_db_sync', handleSyncEvent);
    };
  }, []);

  useEffect(() => {
    if (inquiries && Array.isArray(inquiries)) {
      localStorage.setItem('cabsy_inquiries', JSON.stringify(inquiries));
      try {
        if ('BroadcastChannel' in window) {
          const bc = new BroadcastChannel('EMPERIAL CABS_realtime_sync');
          bc.postMessage({ type: 'INQUIRIES_UPDATED', inquiries, timestamp: Date.now() });
          bc.close();
        }
      } catch (e) {}
    }
  }, [inquiries]);

  useEffect(() => {
    localStorage.setItem('cabsy_drivers', JSON.stringify(drivers));
  }, [drivers]);

  useEffect(() => {
    localStorage.setItem('cabsy_customers', JSON.stringify(customers));
  }, [customers]);

  useEffect(() => {
    localStorage.setItem('cabsy_vehicles', JSON.stringify(vehicles));
    window.dispatchEvent(new CustomEvent('EMPERIAL CABS_vehicles_updated', { detail: vehicles }));
  }, [vehicles]);

  useEffect(() => {
    localStorage.setItem('cabsy_destinations', JSON.stringify(destinations));
    window.dispatchEvent(new CustomEvent('EMPERIAL CABS_destinations_updated', { detail: destinations }));
    window.dispatchEvent(new Event('storage'));
  }, [destinations]);

  useEffect(() => {
    localStorage.setItem('cabsy_places', JSON.stringify(places));
    window.dispatchEvent(new CustomEvent('EMPERIAL CABS_places_updated', { detail: places }));
    window.dispatchEvent(new Event('storage'));
  }, [places]);

  const handleAddPlace = (e) => {
    e.preventDefault();
    if (!newPlaceInput.trim()) return;
    const trimmed = newPlaceInput.trim();
    if (places.includes(trimmed)) {
      alert("This location place already exists in the system.");
      return;
    }
    setPlaces([...places, trimmed]);
    setNewPlaceInput('');
  };

  const handleDeletePlace = (placeName) => {
    if (window.confirm(`Delete place "${placeName}" from location list?`)) {
      setPlaces(places.filter(p => p !== placeName));
    }
  };

  const handleAddDestSubmit = (e) => {
    e.preventDefault();
    const pickupVal = newDestForm.pickup || places[0] || 'Downtown Terminal';
    const dropoffVal = newDestForm.dropoff || (places[1] ? places[1] : places[0]) || 'International Airport T3';
    
    if (pickupVal === dropoffVal) {
      alert("Pick-up location and drop-off destination cannot be the same place!");
      return;
    }

    const created = {
      id: `DEST-${Math.floor(100 + Math.random() * 900)}`,
      name: `${pickupVal} → ${dropoffVal}`,
      pickup: pickupVal,
      dropoff: dropoffVal,
      distanceKm: Number(newDestForm.distanceKm) || 10
    };
    setDestinations([...destinations.filter(d => d && d.pickup && d.dropoff), created]);
    setNewDestForm({ name: '', pickup: places[0] || '', dropoff: places[1] || '', distanceKm: 15 });
    setAddDestModal(false);
  };

  const handleEditDestSubmit = (e) => {
    e.preventDefault();
    setDestinations(destinations.map(d => d.id === editDestModal.destination.id ? editDestModal.destination : d));
    setEditDestModal({ open: false, destination: null });
  };

  const handleDeleteDest = (id) => {
    if (window.confirm("Are you sure you want to remove this route destination?")) {
      setDestinations(destinations.filter(d => d.id !== id));
    }
  };

  const handleAddVehicleSubmit = (e) => {
    e.preventDefault();
    const created = {
      id: `CAR-${Math.floor(100 + Math.random() * 900)}`,
      name: newVehicleForm.name,
      passengers: newVehicleForm.passengers,
      rate: newVehicleForm.rate,
      status: newVehicleForm.status,
      image: newVehicleForm.image || 'https://images.unsplash.com/photo-1549399542-7e3f8b79c341?auto=format&fit=crop&w=600&q=80',
      description: newVehicleForm.description || 'Executive fleet vehicle.'
    };
    setVehicles([...vehicles, created]);
    setNewVehicleForm({ name: '', passengers: '1 - 4 Passenger', rate: '2.50', status: 'Active', image: '', description: '' });
    setAddVehicleModal(false);
  };

  const handleEditVehicleSubmit = (e) => {
    e.preventDefault();
    setVehicles(vehicles.map(v => v.id === editVehicleModal.vehicle.id ? editVehicleModal.vehicle : v));
    setEditVehicleModal({ open: false, vehicle: null });
  };

  const handleDeleteVehicle = (id) => {
    if (window.confirm("Are you sure you want to remove this car from the fleet roster?")) {
      setVehicles(vehicles.filter(v => v.id !== id));
    }
  };

  useEffect(() => {
    localStorage.setItem('cabsy_website_settings', JSON.stringify(settings));
  }, [settings]);

  // Listen for live new inquiries from BookingModal
  useEffect(() => {
    const handleNewInquiry = (e) => {
      if (e.detail) {
        setInquiries(prev => [e.detail, ...prev]);
        autoSyncCustomer(e.detail.customerName, e.detail.customerPhone, e.detail.fare);
      }
    };
    window.addEventListener('cabsy-new-inquiry', handleNewInquiry);
    return () => window.removeEventListener('cabsy-new-inquiry', handleNewInquiry);
  }, []);

  // ✅ On first mount: backfill customers from localStorage inquiries
  useEffect(() => {
    try {
      const saved = localStorage.getItem('cabsy_inquiries');
      if (saved) {
        const parsed = JSON.parse(saved);
        parsed.forEach(inq => {
          if (inq.customerName) {
            autoSyncCustomer(inq.customerName, inq.customerPhone, inq.status === 'Confirmed' ? inq.fare : 0);
          }
        });
      }
    } catch (e) {}
  }, []);

  // Handle PIN submit
  const handlePinSubmit = (e) => {
    e.preventDefault();
    if (pinInput === '1234' || pinInput === '0000') {
      setIsAuthenticated(true);
      sessionStorage.setItem('cabsy_admin_authed', 'true');
      setPinError(false);
    } else {
      setPinError(true);
    }
  };

  const handleLogout = () => {
    setIsAuthenticated(false);
    sessionStorage.removeItem('cabsy_admin_authed');
    setPinInput('');
  };

  // Helper to auto sync customer
  const autoSyncCustomer = (name, phone, fareAmount) => {
    if (!name) return;
    let targetCustomer = null;
    setCustomers(prev => {
      const existingIndex = prev.findIndex(c => c.name.toLowerCase() === name.toLowerCase() || c.phone === phone);
      if (existingIndex >= 0) {
        const updated = [...prev];
        updated[existingIndex] = {
          ...updated[existingIndex],
          totalRides: (updated[existingIndex].totalRides || 0) + 1,
          totalSpent: (updated[existingIndex].totalSpent || 0) + Number(fareAmount)
        };
        targetCustomer = updated[existingIndex];
        return updated;
      } else {
        const newCust = {
          id: 'CUST-' + Math.floor(300 + Math.random() * 600),
          name: name,
          phone: phone || '+91 98250 ' + Math.floor(10000 + Math.random() * 89999),
          email: name.toLowerCase().replace(/\s+/g, '.') + '@customer.com',
          totalRides: 1,
          totalSpent: Number(fareAmount),
          joined: new Date().toISOString().split('T')[0]
        };
        targetCustomer = newCust;
        return [newCust, ...prev];
      }
    });

    if (targetCustomer) {
      saveCustomerToMySQL(targetCustomer).catch(() => {});
    }

    // Persistent sync to Hostinger MySQL
    try {
      db.saveCustomer({ name, phone });
    } catch (e) {}
  };

  // Calculations (Include Confirmed, Completed, In Progress, On Ride, and Assigned trips)
  const confirmedInquiries = inquiries.filter(i => 
    i.status === 'Confirmed' || 
    i.status === 'Completed' || 
    i.status === 'In Progress' || 
    i.status === 'On Ride' || 
    i.status === 'Assigned'
  );
  const totalRevenue = confirmedInquiries.reduce((sum, item) => sum + Number(item.fare || 0), 0);
  const activeDriversCount = drivers.filter(d => d.status !== 'Off Duty').length;

  // Confirm inquiry & assign driver with double-click protection
  const handleConfirmInquiry = () => {
    if (!assignModal.inquiry) return;
    const inq = assignModal.inquiry;
    const actionKey = 'confirm_' + inq.id;
    if (actionLoadingId === actionKey) return;
    setActionLoadingId(actionKey);

    const driverObj = drivers.find(d => d.id === selectedDriverId) || drivers[0] || { name: 'Assigned Driver', id: 'DRV-DEF', plate: 'CAB-001' };
    const chosenVehicle = selectedAssignVehicle || inq.vehicle || 'SWIFT';
    const chosenPlate = selectedAssignPlate || driverObj.plate || 'GJ-04-AB-1234';

    const updatedInquiries = inquiries.map(item => {
      if (item.id === inq.id) {
        return {
          ...item,
          status: 'Confirmed',
          driver: driverObj.name,
          vehicle: chosenVehicle,
          carName: chosenVehicle,
          selectedCar: chosenVehicle,
          plate: chosenPlate,
          vehiclePlate: chosenPlate,
          carPlate: chosenPlate
        };
      }
      return item;
    });

    setInquiries(updatedInquiries);
    localStorage.setItem('cabsy_inquiries', JSON.stringify(updatedInquiries));

    // Sync status to Hostinger MySQL
    if (inq.id) {
      updateInquiryStatusInMySQL(
        inq.id,
        'Confirmed',
        driverObj.name,
        chosenVehicle
      ).catch(() => {});
    }

    // Update driver status
    setDrivers(prev => prev.map(d => {
      if (d.id === driverObj.id) {
        return {
          ...d,
          status: 'On Ride'
        };
      }
      return d;
    }));

    autoSyncCustomer(inq.customerName, inq.customerPhone, inq.fare);
    
    // Direct notification to customer for booking confirmation & driver assignment
    notifyCustomer({
      type: 'confirmed',
      title: '✅ Ride Booking Confirmed!',
      body: `Your booking for ${inq.pickup} → ${inq.dropoff} is confirmed! Driver: ${driverObj.name} (${driverObj.plate})`,
      customerPhone: inq.customerPhone,
      customerEmail: inq.customerEmail
    });

    window.dispatchEvent(new Event('storage'));

    setTimeout(() => {
      setActionLoadingId(null);
      setAssignModal({ open: false, inquiry: null });
    }, 300);
  };

  const handleStartTrip = (inquiryId) => {
    if (!inquiryId) return;
    const actionKey = 'start_' + inquiryId;
    if (actionLoadingId === actionKey) return;
    setActionLoadingId(actionKey);

    const targetInq = inquiries.find(i => i.id === inquiryId);
    if (!targetInq) return;

    const fullStarted = { ...targetInq, status: 'In Progress' };

    setInquiries(prev => {
      const updated = prev.map(inq => inq.id === inquiryId ? fullStarted : inq);
      localStorage.setItem('cabsy_inquiries', JSON.stringify(updated));
      return updated;
    });

    localStorage.setItem('EMPERIAL CABS_active_trip', JSON.stringify(fullStarted));
    updateInquiryStatusInMySQL(inquiryId, 'In Progress', targetInq.driver || 'Assigned Driver').catch(() => {});
    try {
      db.saveInquiry(fullStarted);
    } catch (e) {}

    // 1. Direct system push notification to customer on trip start
    notifyCustomer({
      type: 'trip_started',
      title: '▶ Your Ride Has Started!',
      body: `Chauffeur ${targetInq.driver || 'EMPERIAL CABS'} has started your trip to ${targetInq.dropoff}. Live map tracking is active now!`,
      customerPhone: targetInq.customerPhone,
      customerEmail: targetInq.customerEmail
    });

    // 2. Real-time cross-tab & cross-window BroadcastChannel message
    try {
      if ('BroadcastChannel' in window) {
        const bc = new BroadcastChannel('EMPERIAL CABS_realtime_sync');
        bc.postMessage({ type: 'TRIP_STARTED', data: fullStarted, timestamp: Date.now() });
        bc.close();
      }
    } catch (e) {}

    // 3. Dispatch DOM Custom Events for instant reactive updates
    window.dispatchEvent(new Event('storage'));
    window.dispatchEvent(new CustomEvent('EMPERIAL CABS_trip_started', { detail: fullStarted }));
    window.dispatchEvent(new CustomEvent('EMPERIAL CABS_db_sync', { detail: fullStarted }));
    window.dispatchEvent(new CustomEvent('cabsy-new-inquiry', { detail: fullStarted }));

    setTimeout(() => {
      setActionLoadingId(null);
    }, 300);
  };

  const triggerCompleteTrip = (inq) => {
    if (!inq) return;
    const initialPrice = inq.fare || inq.totalFareNum || inq.originalFare || '0';
    setCompleteModal({
      open: true,
      inquiry: inq,
      finalPrice: String(initialPrice),
      rewardAmount: String(inq.rewardAmount || '0')
    });
  };

  const handleCompleteTrip = (inquiryId) => {
    if (!inquiryId) return;
    const targetInq = inquiries.find(i => i.id === inquiryId);
    if (targetInq) triggerCompleteTrip(targetInq);
  };

  const handleFinalizeTripCompletion = (e) => {
    if (e) e.preventDefault();
    if (!completeModal.inquiry) return;
    const inq = completeModal.inquiry;
    const finalFare = Math.max(0, Number(completeModal.finalPrice) || 0);
    const rewardVal = Math.max(0, Number(completeModal.rewardAmount) || 0);
    const hasReward = rewardVal > 0;

    const actionKey = 'complete_' + inq.id;
    if (actionLoadingId === actionKey) return;
    setActionLoadingId(actionKey);

    if (hasReward && inq.customerPhone) {
      db.addRewardToCustomer(inq.customerPhone, rewardVal, inq.id, inq.pickup, inq.dropoff);
      updateInquiryRewardInMySQL(inq.id, true, rewardVal).catch(() => {});
    }

    const fullCompleted = { 
      ...inq, 
      status: 'Completed',
      fare: finalFare,
      totalFareNum: finalFare,
      price: `₹${finalFare.toLocaleString('en-IN')}`,
      rewardIssued: hasReward ? 1 : 0,
      rewardAmount: hasReward ? rewardVal : 0
    };

    setInquiries(prev => {
      const updated = prev.map(item => item.id === inq.id ? fullCompleted : item);
      localStorage.setItem('cabsy_inquiries', JSON.stringify(updated));
      return updated;
    });

    localStorage.setItem('EMPERIAL CABS_last_completed_trip', JSON.stringify(fullCompleted));
    localStorage.removeItem('EMPERIAL CABS_active_trip');

    saveInquiryToMySQL(fullCompleted).catch(() => {});
    updateInquiryStatusInMySQL(inq.id, 'Completed', inq.driver || 'Assigned Driver', finalFare, hasReward ? 1 : 0, rewardVal).catch(() => {});
    try {
      db.saveInquiry(fullCompleted);
    } catch (err) {}

    autoSyncCustomer(inq.customerName, inq.customerPhone, finalFare);

    notifyCustomer({
      type: 'trip_completed',
      title: '🏁 Trip Completed Successfully!',
      body: hasReward 
        ? `Your trip (${inq.pickupCity || inq.pickup} → ${inq.dropoffCity || inq.dropoff}) is completed! Total Fare: ₹${finalFare}. You earned ₹${rewardVal} wallet reward credit!`
        : `Your trip (${inq.pickupCity || inq.pickup} → ${inq.dropoffCity || inq.dropoff}) is completed! Total Fare: ₹${finalFare}. Thank you for riding with EMPERIAL CABS!`,
      customerPhone: inq.customerPhone,
      customerEmail: inq.customerEmail
    });

    try {
      if ('BroadcastChannel' in window) {
        const bc = new BroadcastChannel('EMPERIAL CABS_realtime_sync');
        bc.postMessage({ type: 'TRIP_COMPLETED', data: fullCompleted, timestamp: Date.now() });
        bc.close();
      }
    } catch (err) {}

    window.dispatchEvent(new Event('storage'));
    window.dispatchEvent(new CustomEvent('EMPERIAL CABS_trip_completed', { detail: fullCompleted }));
    window.dispatchEvent(new CustomEvent('EMPERIAL CABS_db_sync', { detail: fullCompleted }));

    setCompleteModal({ open: false, inquiry: null, finalPrice: '', rewardAmount: '0' });
    setTimeout(() => {
      setActionLoadingId(null);
    }, 300);
  };

  const handleCancelInquiry = (inquiryId) => {
    if (!inquiryId) return;
    const actionKey = 'cancel_' + inquiryId;
    if (actionLoadingId === actionKey) return;
    setActionLoadingId(actionKey);

    const targetInq = inquiries.find(i => i.id === inquiryId);

    setInquiries(prev => {
      const updated = prev.map(i => i.id === inquiryId ? { ...i, status: 'Cancelled' } : i);
      localStorage.setItem('cabsy_inquiries', JSON.stringify(updated));
      return updated;
    });

    if (targetInq) {
      updateInquiryStatusInMySQL(inquiryId, 'Cancelled').catch(() => {});

      if (Number(targetInq.walletDiscountUsed) > 0 && targetInq.customerPhone) {
        db.refundWalletCoins(targetInq.customerPhone, targetInq.walletDiscountUsed, inquiryId, targetInq.pickup, targetInq.dropoff);
      }

      notifyCustomer({
        type: 'cancelled',
        title: '❌ Booking Cancelled',
        body: `Your booking request for ${targetInq.pickup} → ${targetInq.dropoff} was cancelled by EMPERIAL CABS dispatch.`,
        customerPhone: targetInq.customerPhone,
        customerEmail: targetInq.customerEmail
      });
    }

    window.dispatchEvent(new Event('storage'));

    setTimeout(() => {
      setActionLoadingId(null);
    }, 300);
  };

  const handleDeleteInquiry = (inquiryId) => {
    if (!inquiryId) return;
    const actionKey = 'delete_' + inquiryId;
    if (actionLoadingId === actionKey) return;

    if (window.confirm("Are you sure you want to delete this inquiry record permanently?")) {
      setActionLoadingId(actionKey);

      deleteInquiryFromMySQL(inquiryId).catch(() => {});
      setInquiries(prev => {
        const filtered = prev.filter(i => i.id !== inquiryId);
        localStorage.setItem('cabsy_inquiries', JSON.stringify(filtered));
        return filtered;
      });
      window.dispatchEvent(new Event('storage'));

      setTimeout(() => {
        setActionLoadingId(null);
      }, 300);
    }
  };

  const handleDeleteCustomer = (customerId) => {
    if (!customerId) return;
    if (window.confirm("Are you sure you want to delete this customer profile from directory?")) {
      deleteCustomerFromMySQL(customerId).catch(() => {});
      setCustomers(prev => prev.filter(c => c.id !== customerId && c.email !== customerId && c.phone !== customerId));
      try {
        const saved = localStorage.getItem('cabsy_customers');
        if (saved) {
          const parsed = JSON.parse(saved);
          const filtered = parsed.filter(c => c.id !== customerId && c.email !== customerId && c.phone !== customerId);
          localStorage.setItem('cabsy_customers', JSON.stringify(filtered));
        }
      } catch (e) {}
    }
  };

  // Add Driver
  const handleAddDriverSubmit = (e) => {
    e.preventDefault();
    if (!newDriverForm.name) return;
    const createdDriver = {
      id: 'DRV-' + Math.floor(100 + Math.random() * 899),
      name: newDriverForm.name,
      phone: newDriverForm.phone || '+1 (555) ' + Math.floor(100 + Math.random() * 899) + '-0011',
      vehicle: newDriverForm.vehicle,
      plate: newDriverForm.plate || 'CAB-' + Math.floor(1000 + Math.random() * 8999),
      rating: 5.0,
      status: 'Active',
      trips: 0,
      earnings: 0.00
    };
    setDrivers([createdDriver, ...drivers]);
    setNewDriverForm({ name: '', phone: '', vehicle: 'Empire Regular', plate: '' });
    setAddDriverModal(false);
  };

  // Delete Driver
  const handleDeleteDriver = (driverId) => {
    if (window.confirm('Are you sure you want to remove this driver from the fleet?')) {
      setDrivers(drivers.filter(d => d.id !== driverId));
    }
  };

  // Add Customer
  const handleAddCustomerSubmit = (e) => {
    e.preventDefault();
    if (!newCustomerForm.name) return;
    const createdCustomer = {
      id: 'CUST-' + Math.floor(300 + Math.random() * 600),
      name: newCustomerForm.name,
      phone: newCustomerForm.phone || '+1 (555) 000-1122',
      email: newCustomerForm.email || newCustomerForm.name.toLowerCase().replace(/\s+/g, '.') + '@client.com',
      totalRides: 0,
      totalSpent: 0.00,
      joined: new Date().toISOString().split('T')[0]
    };
    setCustomers([createdCustomer, ...customers]);
    setNewCustomerForm({ name: '', phone: '', email: '' });
    setAddCustomerModal(false);
  };

  // Add Manual Inquiry with protection & MySQL sync
  const handleAddInquirySubmit = (e) => {
    e.preventDefault();
    if (!newInquiryForm.customerName || !newInquiryForm.pickup) return;
    if (actionLoadingId === 'add_inquiry') return;
    setActionLoadingId('add_inquiry');

    const createdInquiry = {
      id: 'INQ-' + Math.floor(1000 + Math.random() * 8999),
      customerName: newInquiryForm.customerName,
      customerPhone: newInquiryForm.customerPhone || '+91 9876543210',
      pickup: newInquiryForm.pickup,
      dropoff: newInquiryForm.dropoff,
      vehicle: newInquiryForm.vehicle || 'EMPERIAL Regular',
      fare: Number(newInquiryForm.fare || 35),
      status: 'Pending',
      driver: '-',
      date: new Date().toLocaleString().slice(0, 16)
    };

    setInquiries(prev => {
      const updated = [createdInquiry, ...prev];
      localStorage.setItem('cabsy_inquiries', JSON.stringify(updated));
      return updated;
    });

    saveInquiryToMySQL(createdInquiry).catch(() => {});
    try {
      db.saveInquiry(createdInquiry);
    } catch (e) {}

    autoSyncCustomer(createdInquiry.customerName, createdInquiry.customerPhone, 0);
    setNewInquiryForm({ customerName: '', customerPhone: '', pickup: '', dropoff: '', vehicle: 'EMPERIAL Regular', fare: 35.00 });
    window.dispatchEvent(new Event('storage'));

    setTimeout(() => {
      setActionLoadingId(null);
      setAddInquiryModal(false);
    }, 300);
  };

  // Save Website Settings
  const handleSaveSettings = (e) => {
    e.preventDefault();
    alert('Website Settings updated successfully! Changes saved to production state.');
  };

  // Database Wipe / Purge Handlers
  const handlePurgeDemoDatabaseData = async () => {
    if (window.confirm("Purge demo and test records from Hostinger Remote MySQL Database?")) {
      try {
        await purgeDemoDataFromMySQL();
        alert("Demo data successfully purged from Hostinger Remote MySQL.");
        window.location.reload();
      } catch (err) {
        alert("Failed to purge demo data: " + err.message);
      }
    }
  };

  const handlePurgeAllDatabaseData = async () => {
    if (window.confirm("⚠️ Reset System Inquiries & Messages?\n\nThis will purge all booking inquiries, contact messages, notifications, and customer logs.\n\nNOTE: Vehicles, Drivers, Destinations, and KM distance matrix will NOT be deleted.")) {
      try {
        await purgeAllDataFromMySQL().catch(() => {});
        localStorage.setItem('cabsy_inquiries', '[]');
        localStorage.setItem('emperial_cabs_inquiries', '[]');
        localStorage.setItem('cabsy_customers', '[]');
        localStorage.setItem('emperial_cabs_customers', '[]');
        localStorage.setItem('emperial_cabs_contact_messages', '[]');
        localStorage.setItem('cabsy_contact_messages', '[]');
        localStorage.setItem('cabsy_messages', '[]');
        localStorage.setItem('emperial_cabs_notifications', '[]');
        localStorage.setItem('cabsy_notifications', '[]');
        localStorage.setItem('cabsy_admin_notifications', '[]');
        localStorage.setItem('cabsy_customer_notifications', '[]');

        setInquiries([]);
        setCustomers([]);
        setContactMessages([]);
        setNotifications([]);
        
        // Dispatch event for multi-window sync
        window.dispatchEvent(new Event('storage'));
        
        alert("✅ System data successfully reset!\n\nAll ride inquiries, customer logs, contact messages, and notifications have been cleared.\n\nFleet Vehicles, Drivers, Destinations, and KM Distance Matrix remain completely safe and intact.");
      } catch (err) {
        alert("Failed to reset system data: " + err.message);
      }
    }
  };

  // IF NOT AUTHENTICATED: RENDER PIN SECURITY UNLOCK SCREEN
  if (!isAuthenticated) {
    return (
      <div className="admin-pin-screen">
        <div className="pin-card card">
          <div className="pin-header text-center">
            <div className="lock-icon-badge">
              <Lock size={32} />
            </div>
            <h2>EMPERIAL CABS Admin Security</h2>
            <p>Enter 4-Digit Security PIN to Access Dispatcher Portal</p>
          </div>

          <form onSubmit={handlePinSubmit} className="pin-form">
            <div className="input-group">
              <label><KeyRound size={16} className="inline-icon text-green" /> Security PIN Code</label>
              <input 
                type="password"
                maxLength={4}
                placeholder="• • • •"
                value={pinInput}
                onChange={(e) => setPinInput(e.target.value)}
                autoFocus
                className={pinError ? 'input-error' : ''}
              />
              {pinError && <small className="text-red mt-1 display-block">Invalid PIN Code! Try default PIN: <strong>1234</strong></small>}
            </div>

            <div className="pin-keypad flex gap-2 justify-center mt-3">
              {['1', '2', '3', '4', '5', '6', '7', '8', '9', '0'].map(num => (
                <button 
                  key={num} 
                  type="button" 
                  className="keypad-btn"
                  onClick={() => pinInput.length < 4 && setPinInput(pinInput + num)}
                >
                  {num}
                </button>
              ))}
            </div>

            <button type="submit" className="btn btn-primary btn-block mt-4">
              Unlock Dispatcher Portal
            </button>
          </form>

          <div className="pin-footer text-center mt-3">
            <button 
              type="button" 
              onClick={handleInstallApp}
              style={{
                width: '100%', marginBottom: '12px', padding: '10px',
                background: '#0F172A', color: '#00B87C', border: '1px solid #00B87C',
                borderRadius: '8px', fontWeight: '700', fontSize: '13px', cursor: 'pointer',
                display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '6px'
              }}
            >
              📱 Install Admin App to Home Screen
            </button>
            <small className="text-muted">Default Demo PIN: <strong>1234</strong></small><br />
            <a href="/" className="btn-exit-portal mt-2">← Back to Public Website</a>
          </div>
        </div>
      </div>
    );
  }

  // AUTHENTICATED: RENDER MAIN ADMIN DASHBOARD
  return (
    <div className="admin-portal-wrapper">
      {/* MOBILE BACKDROP OVERLAY */}
      <div 
        className={`mobile-sidebar-backdrop ${isMobileMenuOpen ? 'show' : ''}`} 
        onClick={() => setIsMobileMenuOpen(false)} 
      />

      {/* MOBILE TOP HEADER BAR WITH 3-LINE HAMBURGER MENU */}
      <header className="admin-mobile-header">
        <div className="mobile-header-left flex align-center gap-2">
          <button 
            className="mobile-hamburger-btn" 
            onClick={() => setIsMobileMenuOpen(!isMobileMenuOpen)} 
            aria-label="Open Section Navigation Menu"
          >
            {isMobileMenuOpen ? <X size={24} /> : <Menu size={24} />}
          </button>
          <img src="/EMPERAL_CABS_Website_Logo_Sharp.svg" alt="EMPERIAL CABS" className="mobile-brand-logo" />
        </div>
        <div className="mobile-header-right flex align-center gap-2">
          <button 
            className="mobile-notif-pill-btn" 
            onClick={() => { setActiveTab('inquiries'); setIsMobileMenuOpen(false); }}
          >
            <Bell size={18} />
            {inquiries.filter(i => i.status === 'Pending').length > 0 && (
              <span className="mobile-notif-badge">{inquiries.filter(i => i.status === 'Pending').length}</span>
            )}
          </button>
        </div>
      </header>

      {/* LEFT SIDEBAR NAVIGATION DRAWER */}
      <aside className={`admin-sidebar ${isMobileMenuOpen ? 'mobile-open' : ''}`}>
        <div className="admin-brand flex align-center justify-between">
          <img src="/EMPERAL_CABS_Website_Logo_Sharp.svg" alt="EMPERIAL CABS" style={{ height: '38px', width: 'auto', display: 'block' }} />
          <button className="mobile-drawer-close-btn" onClick={() => setIsMobileMenuOpen(false)}>
            <X size={20} />
          </button>
        </div>

        <nav className="admin-nav-menu">
          <button 
            className={`admin-nav-link ${activeTab === 'dashboard' ? 'active' : ''}`}
            onClick={() => { setActiveTab('dashboard'); setIsMobileMenuOpen(false); }}
          >
            <LayoutDashboard size={19} />
            <span>Dashboard</span>
          </button>

          <button 
            className={`admin-nav-link ${activeTab === 'inquiries' ? 'active' : ''}`}
            onClick={() => { setActiveTab('inquiries'); setIsMobileMenuOpen(false); }}
          >
            <Inbox size={19} />
            <span>All Inquiries</span>
            {inquiries.filter(i => !i.isCustom && i.tripType !== 'Custom Trip' && i.tripType !== 'custom-trip' && i.status === 'Pending').length > 0 && (
              <span className="badge-pending">{inquiries.filter(i => !i.isCustom && i.tripType !== 'Custom Trip' && i.tripType !== 'custom-trip' && i.status === 'Pending').length}</span>
            )}
          </button>

          <button 
            className={`admin-nav-link ${activeTab === 'final_trips' ? 'active' : ''}`}
            onClick={() => { setActiveTab('final_trips'); setIsMobileMenuOpen(false); }}
          >
            <Navigation size={19} />
            <span>Final Trips</span>
            {inquiries.filter(i => !i.isCustom && i.tripType !== 'Custom Trip' && i.tripType !== 'custom-trip' && (i.status === 'Confirmed' || i.status === 'In Progress' || i.status === 'On Ride')).length > 0 && (
              <span className="badge-pending" style={{ background: '#3b82f6' }}>
                {inquiries.filter(i => !i.isCustom && i.tripType !== 'Custom Trip' && i.tripType !== 'custom-trip' && (i.status === 'Confirmed' || i.status === 'In Progress' || i.status === 'On Ride')).length}
              </span>
            )}
          </button>

          <button 
            className={`admin-nav-link ${activeTab === 'success_trips' ? 'active' : ''}`}
            onClick={() => { setActiveTab('success_trips'); setIsMobileMenuOpen(false); }}
          >
            <Award size={19} />
            <span>Success Trips</span>
            {inquiries.filter(i => !i.isCustom && i.tripType !== 'Custom Trip' && i.tripType !== 'custom-trip' && i.status === 'Completed').length > 0 && (
              <span className="badge-pending" style={{ background: '#10b981' }}>
                {inquiries.filter(i => !i.isCustom && i.tripType !== 'Custom Trip' && i.tripType !== 'custom-trip' && i.status === 'Completed').length}
              </span>
            )}
          </button>

          <button 
            className={`admin-nav-link ${activeTab === 'custom_inquiries' ? 'active' : ''}`}
            onClick={() => { setActiveTab('custom_inquiries'); setIsMobileMenuOpen(false); }}
          >
            <Sparkles size={19} />
            <span>Custom Inquiries</span>
            {inquiries.filter(i => (i.isCustom || i.tripType === 'Custom Trip' || i.tripType === 'custom-trip') && i.status === 'Pending').length > 0 && (
              <span className="badge-pending" style={{ background: '#8b5cf6' }}>
                {inquiries.filter(i => (i.isCustom || i.tripType === 'Custom Trip' || i.tripType === 'custom-trip') && i.status === 'Pending').length}
              </span>
            )}
          </button>

          <button 
            className={`admin-nav-link ${activeTab === 'vehicles' ? 'active' : ''}`}
            onClick={() => { setActiveTab('vehicles'); setIsMobileMenuOpen(false); }}
          >
            <Car size={19} />
            <span>Fleet Vehicles</span>
          </button>

          <button 
            className={`admin-nav-link ${activeTab === 'destinations' ? 'active' : ''}`}
            onClick={() => { setActiveTab('destinations'); setIsMobileMenuOpen(false); }}
          >
            <MapPin size={19} />
            <span>Destinations & KM</span>
          </button>

          <button 
            className={`admin-nav-link ${activeTab === 'drivers' ? 'active' : ''}`}
            onClick={() => { setActiveTab('drivers'); setIsMobileMenuOpen(false); }}
          >
            <UserCheck size={19} />
            <span>Drivers</span>
          </button>

          <button 
            className={`admin-nav-link ${activeTab === 'customers' ? 'active' : ''}`}
            onClick={() => { setActiveTab('customers'); setIsMobileMenuOpen(false); }}
          >
            <Users size={19} />
            <span>Customers</span>
          </button>

          <button 
            className={`admin-nav-link ${activeTab === 'messages' ? 'active' : ''}`}
            onClick={() => { setActiveTab('messages'); setIsMobileMenuOpen(false); }}
          >
            <Mail size={19} />
            <span>Contact Messages</span>
            {contactMessages.filter(m => m.status === 'Unread').length > 0 && (
              <span className="badge-pending" style={{ background: '#ec4899' }}>
                {contactMessages.filter(m => m.status === 'Unread').length}
              </span>
            )}
          </button>

          <button 
            className={`admin-nav-link ${activeTab === 'reports' ? 'active' : ''}`}
            onClick={() => { setActiveTab('reports'); setIsMobileMenuOpen(false); }}
          >
            <BarChart3 size={19} />
            <span>Trips & Reports</span>
          </button>

          <button 
            className={`admin-nav-link ${activeTab === 'settings' ? 'active' : ''}`}
            onClick={() => { setActiveTab('settings'); setIsMobileMenuOpen(false); }}
          >
            <Settings size={19} />
            <span>Website Settings</span>
          </button>
        </nav>

        <div className="sidebar-footer-card">
          <button onClick={handleLogout} className="btn-logout-portal flex align-center gap-2">
            <Lock size={15} /> Lock Admin Portal
          </button>
          <a href="/" className="btn-exit-portal">
            <LogOut size={15} /> Exit to Site
          </a>
        </div>
      </aside>

      {/* RIGHT MAIN DATA CONTENT */}
      <main className="admin-main-content">
        {/* TAB 1: DASHBOARD */}
        {activeTab === 'dashboard' && (
          <div className="tab-pane">
            <div className="pane-header flex justify-between align-center">
              <div>
                <h2>Dispatcher Command Center</h2>
                <p>Real-time fleet operations, ride bookings, revenue analytics, and system performance.</p>
              </div>
              <div className="flex gap-2">
                <button className="btn btn-primary btn-sm flex align-center gap-1" onClick={() => setAddInquiryModal(true)}>
                  <Plus size={16} /> New Inquiry
                </button>
                <button className="btn btn-outline btn-sm flex align-center gap-1" onClick={() => setAddDriverModal(true)}>
                  <UserPlus size={16} /> Add Driver
                </button>
              </div>
            </div>

            {/* METRICS CARDS GRID */}
            <div className="metrics-grid">
              <div className="metric-card">
                <div className="metric-icon-bg green-bg">
                  <DollarSign size={24} />
                </div>
                <div>
                  <small>Total Confirmed Revenue</small>
                  <h3>₹{totalRevenue.toFixed(2)}</h3>
                  <span className="text-green flex align-center gap-1 text-xs">
                    <TrendingUp size={13} /> +18.4% this week
                  </span>
                </div>
              </div>

              <div className="metric-card">
                <div className="metric-icon-bg blue-bg">
                  <Car size={24} />
                </div>
                <div>
                  <small>Active Drivers On Duty</small>
                  <h3>{activeDriversCount} / {drivers.length}</h3>
                  <span className="text-muted text-xs">Full fleet available</span>
                </div>
              </div>

              <div className="metric-card">
                <div className="metric-icon-bg yellow-bg">
                  <Inbox size={24} />
                </div>
                <div>
                  <small>Ride Inquiries</small>
                  <h3>{inquiries.length}</h3>
                  <span className="text-yellow text-xs font-bold">
                    {inquiries.filter(i => i.status === 'Pending').length} Pending Dispatch
                  </span>
                </div>
              </div>

              <div className="metric-card">
                <div className="metric-icon-bg purple-bg">
                  <Users size={24} />
                </div>
                <div>
                  <small>Registered Customers</small>
                  <h3>{customers.length}</h3>
                  <span className="text-purple text-xs">Auto-synced</span>
                </div>
              </div>
            </div>

            {/* TWO COLUMN SUMMARY */}
            <div className="dashboard-columns-grid">
              {/* RECENT INQUIRIES */}
              <div className="card admin-table-card">
                <div className="card-header-flex">
                  <h3>Recent Ride Inquiries</h3>
                  <button className="btn-link-sm" onClick={() => setActiveTab('inquiries')}>View All ({inquiries.length}) &gt;</button>
                </div>
                <div className="table-responsive">
                  <table className="admin-table">
                    <thead>
                      <tr>
                        <th>ID</th>
                        <th>Customer</th>
                        <th>Pickup → Dropoff</th>
                        <th>Fare</th>
                        <th>Status</th>
                        <th>Action</th>
                      </tr>
                    </thead>
                    <tbody>
                      {sortedInquiries.slice(0, 5).map(inq => (
                        <tr key={inq.id}>
                          <td data-label="ID"><strong>{inq.id}</strong></td>
                          <td data-label="Customer">{resolveCustomerName(inq)}<br /><small className="text-muted">{inq.customerPhone}</small></td>
                          <td data-label="Route" className="route-cell">
                            <span className="text-green">●</span> {inq.pickup}<br />
                            <span className="text-red">●</span> {inq.dropoff}
                          </td>
                          <td data-label="Fare"><strong>₹{Number(inq.fare).toFixed(2)}</strong></td>
                          <td data-label="Status">
                            <span className={`status-tag status-${inq.status.toLowerCase()}`}>
                              {inq.status}
                            </span>
                          </td>
                          <td data-label="Action">
                            {inq.status === 'Pending' ? (
                              <button 
                                className="btn btn-sm btn-primary-green"
                                onClick={() => setAssignModal({ open: true, inquiry: inq })}
                              >
                                Confirm
                              </button>
                            ) : (
                              <span className="text-muted text-xs">{inq.driver || 'Done'}</span>
                            )}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>

                {/* HOSTINGER MOBILE CARDS FOR RECENT RIDES */}
                <div className="admin-mobile-card-list">
                  {sortedInquiries.slice(0, 5).map(inq => (
                    <div key={inq.id} className="hostinger-admin-card">
                      <div className="hostinger-card-top">
                        <div className="hostinger-card-id-group">
                          <span className="hostinger-card-id">{inq.id}</span>
                          <span className="hostinger-card-date">• {inq.date}</span>
                        </div>
                        <span className={`status-tag status-${inq.status.toLowerCase()}`}>
                          {inq.status}
                        </span>
                      </div>
                      <div className="hostinger-card-customer">
                        <span className="hostinger-cust-name">{resolveCustomerName(inq)}</span>
                        <span className="hostinger-cust-phone">📞 {inq.customerPhone}</span>
                      </div>
                      <div className="hostinger-card-route">
                        <div className="hostinger-route-item">
                          <span style={{ width: '8px', height: '8px', borderRadius: '50%', background: '#10B981', flexShrink: 0 }}></span>
                          <span>{inq.pickup}</span>
                        </div>
                        <div className="hostinger-route-item">
                          <span style={{ width: '8px', height: '8px', borderRadius: '50%', background: '#EF4444', flexShrink: 0 }}></span>
                          <span>{inq.dropoff}</span>
                        </div>
                      </div>
                      <div className="hostinger-card-footer">
                        <span className="hostinger-vehicle-badge">{inq.vehicle || 'Taxi'}</span>
                        <span className="hostinger-fare-tag">₹{Number(inq.fare).toFixed(2)}</span>
                      </div>
                      <div className="hostinger-card-actions">
                        {inq.status === 'Pending' ? (
                          <button 
                            className="btn btn-sm btn-primary-green"
                            style={{ width: '100%', justifyContent: 'center', padding: '8px 12px', fontSize: '13px', fontWeight: '800' }}
                            onClick={() => setAssignModal({ open: true, inquiry: inq })}
                          >
                            Confirm & Assign Driver
                          </button>
                        ) : (
                          <span className="text-muted text-xs font-semibold">Assigned Driver: {inq.driver || 'Done'}</span>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              </div>

              {/* FLEET DRIVER STATUS */}
              <div className="card admin-table-card">
                <div className="card-header-flex">
                  <h3>Active Fleet Roster</h3>
                  <button className="btn-link-sm" onClick={() => setActiveTab('drivers')}>Manage Drivers &gt;</button>
                </div>
                <div className="driver-mini-list">
                  {drivers.map(drv => {
                    const drvInqs = inquiries.filter(i => i.driver === drv.name && (i.status === 'Confirmed' || i.status === 'Completed'));
                    const tripsCount = drvInqs.length;
                    const earningsTotal = drvInqs.reduce((sum, item) => sum + Number(item.fare || 0), 0);
                    return (
                      <div key={drv.id} className="driver-mini-item flex justify-between align-center">
                        <div className="flex align-center gap-2">
                          <div className="driver-avatar">{drv.name.charAt(0)}</div>
                          <div>
                            <strong>{drv.name}</strong>
                            <small className="display-block text-muted">{drv.vehicle}</small>
                          </div>
                        </div>
                        <div className="text-right">
                          <span className={`status-tag status-${drv.status.toLowerCase().replace(/\s+/g, '-')}`}>
                            {drv.status}
                          </span>
                          <small className="display-block text-muted mt-1">{tripsCount} Trips (₹{earningsTotal.toFixed(0)})</small>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
            </div>
          </div>
        )}

        {/* TAB 2: ALL INQUIRIES */}
        {activeTab === 'inquiries' && (
          <div className="tab-pane">
            <div className="pane-header flex justify-between align-center">
              <div>
                <h2>Ride Inquiries & Booking Studio</h2>
                <p>Review incoming customer ride requests, assign drivers, confirm bookings, and manage fare revenue.</p>
              </div>
              <button className="btn btn-primary btn-lg-action flex align-center gap-2" onClick={() => setAddInquiryModal(true)}>
                <Plus size={18} /> Add Manual Booking
              </button>
            </div>

            <div className="card admin-table-card">
              <div className="table-responsive">
                <table className="admin-table">
                  <thead>
                    <tr>
                      <th>Inquiry ID</th>
                      <th>Customer Details</th>
                      <th>Pick-up Location</th>
                      <th>Destination</th>
                      <th>Vehicle Class</th>
                      <th>Estimated Fare</th>
                      <th>Assigned Driver</th>
                      <th>Status</th>
                      <th>Actions</th>
                    </tr>
                  </thead>
                  <tbody>
                    {sortedInquiries.filter(i => !i.isCustom && i.tripType !== 'Custom Trip' && i.tripType !== 'custom-trip').map(inq => (
                      <tr key={inq.id}>
                        <td data-label="Inquiry ID">
                          <strong style={{ color: '#0F172A' }}>{inq.id}</strong>
                          <div className="text-muted text-xs" style={{ marginTop: '2px' }}>{inq.date}</div>
                        </td>
                        <td data-label="Customer">
                          <strong style={{ color: '#0F172A' }}>{resolveCustomerName(inq)}</strong>
                          <div className="text-muted text-xs" style={{ marginTop: '2px' }}>📞 {inq.customerPhone}</div>
                        </td>
                        <td data-label="Pick-up" style={{ maxWidth: '140px', wordBreak: 'break-word', whiteSpace: 'normal' }}>
                          <span style={{ display: 'inline-block', width: '8px', height: '8px', borderRadius: '50%', background: '#10B981', marginRight: '6px' }}></span>
                          {inq.pickup}
                        </td>
                        <td data-label="Dropoff" style={{ maxWidth: '140px', wordBreak: 'break-word', whiteSpace: 'normal' }}>
                          <span style={{ display: 'inline-block', width: '8px', height: '8px', borderRadius: '50%', background: '#EF4444', marginRight: '6px' }}></span>
                          {inq.dropoff}
                        </td>
                        <td data-label="Vehicle"><span className="pill-badge-sm" style={{ whiteSpace: 'nowrap', fontWeight: '700' }}>{inq.vehicle}</span></td>
                        <td data-label="Fare">
                          <strong className="text-green" style={{ fontSize: '0.95rem' }}>₹{Number(inq.fare).toFixed(2)}</strong>
                          {inq.walletDiscountUsed > 0 && (
                            <div style={{ fontSize: '11px', color: '#059669', fontWeight: '700', marginTop: '2px' }}>
                              🎁 -₹{Number(inq.walletDiscountUsed).toFixed(2)} coupon
                            </div>
                          )}
                        </td>
                        <td data-label="Driver">
                          {inq.driver && inq.driver !== '-' ? (
                            <span className="font-bold flex align-center gap-1" style={{ color: '#059669' }}><UserCheck size={14} /> {inq.driver}</span>
                          ) : (
                            <span className="text-muted italic">Unassigned</span>
                          )}
                        </td>
                        <td data-label="Status">
                          <span className={`status-tag status-${inq.status.toLowerCase()}`}>
                            {inq.status}
                          </span>
                        </td>
                        <td data-label="Actions" style={{ paddingRight: '6px' }}>
                          <div style={{ display: 'flex', alignItems: 'center', gap: '4px', flexWrap: 'wrap', justifyContent: 'flex-start' }}>
                            <button 
                              className="btn-action-view"
                              title="View Detailed Trip Receipt & Coupon Info"
                              disabled={actionLoadingId === 'receipt_' + inq.id}
                              style={{
                                background: '#EFF6FF',
                                color: '#1D4ED8',
                                border: '1px solid #BFDBFE',
                                padding: '5px 7px',
                                borderRadius: '7px',
                                fontSize: '11px',
                                fontWeight: '800',
                                cursor: actionLoadingId ? 'not-allowed' : 'pointer',
                                display: 'inline-flex',
                                alignItems: 'center',
                                gap: '2px',
                                whiteSpace: 'nowrap',
                                opacity: actionLoadingId ? 0.7 : 1
                              }}
                              onClick={() => setReceiptModal({ open: true, inquiry: inq })}
                            >
                              <Eye size={11} /> View Receipt
                            </button>

                            {inq.status === 'Pending' && (
                              <button 
                                className="btn-action-assign"
                                title="Confirm & Assign Driver"
                                disabled={actionLoadingId === 'confirm_' + inq.id}
                                style={{
                                  whiteSpace: 'nowrap',
                                  display: 'inline-flex',
                                  alignItems: 'center',
                                  gap: '2px',
                                  padding: '5px 7px',
                                  fontSize: '11px',
                                  borderRadius: '7px',
                                  opacity: actionLoadingId === 'confirm_' + inq.id ? 0.7 : 1,
                                  cursor: actionLoadingId === 'confirm_' + inq.id ? 'not-allowed' : 'pointer'
                                }}
                                onClick={() => setAssignModal({ open: true, inquiry: inq })}
                              >
                                <UserCheck size={11} /> {actionLoadingId === 'confirm_' + inq.id ? 'Processing...' : 'Assign'}
                              </button>
                            )}

                            {(inq.status === 'Pending' || inq.status === 'Confirmed') && (
                              <button 
                                className="btn-action-cancel"
                                title="Cancel Booking"
                                disabled={actionLoadingId === 'cancel_' + inq.id}
                                style={{
                                  whiteSpace: 'nowrap',
                                  display: 'inline-flex',
                                  alignItems: 'center',
                                  gap: '2px',
                                  padding: '5px 7px',
                                  fontSize: '11px',
                                  borderRadius: '7px',
                                  opacity: actionLoadingId === 'cancel_' + inq.id ? 0.7 : 1,
                                  cursor: actionLoadingId === 'cancel_' + inq.id ? 'not-allowed' : 'pointer'
                                }}
                                onClick={() => handleCancelInquiry(inq.id)}
                              >
                                <XCircle size={11} /> {actionLoadingId === 'cancel_' + inq.id ? 'Cancelling...' : 'Cancel'}
                              </button>
                            )}

                            <button 
                              className="btn-action-delete"
                              title="Delete Booking Record"
                              disabled={actionLoadingId === 'delete_' + inq.id}
                              style={{
                                whiteSpace: 'nowrap',
                                display: 'inline-flex',
                                alignItems: 'center',
                                gap: '2px',
                                padding: '5px 7px',
                                fontSize: '11px',
                                borderRadius: '7px',
                                opacity: actionLoadingId === 'delete_' + inq.id ? 0.7 : 1,
                                cursor: actionLoadingId === 'delete_' + inq.id ? 'not-allowed' : 'pointer'
                              }}
                              onClick={() => handleDeleteInquiry(inq.id)}
                            >
                              <Trash2 size={11} /> {actionLoadingId === 'delete_' + inq.id ? 'Deleting...' : 'Delete'}
                            </button>
                          </div>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>

              {/* HOSTINGER ALIGNED MOBILE CARDS */}
              <div className="admin-mobile-card-list">
                {sortedInquiries.filter(i => !i.isCustom && i.tripType !== 'Custom Trip' && i.tripType !== 'custom-trip').map(inq => (
                  <div key={inq.id} className="hostinger-admin-card">
                    {/* Header Bar */}
                    <div className="hostinger-card-top">
                      <div className="hostinger-card-id-group">
                        <span className="hostinger-card-id">{inq.id}</span>
                        <span className="hostinger-card-date">• {inq.date}</span>
                      </div>
                      <span className={`status-tag status-${inq.status.toLowerCase()}`}>
                        {inq.status}
                      </span>
                    </div>

                    {/* Customer Row */}
                    <div className="hostinger-card-customer">
                      <span className="hostinger-cust-name">{resolveCustomerName(inq)}</span>
                      <span className="hostinger-cust-phone">📞 {inq.customerPhone}</span>
                    </div>

                    {/* Route Box */}
                    <div className="hostinger-card-route">
                      <div className="hostinger-route-item">
                        <span style={{ width: '8px', height: '8px', borderRadius: '50%', background: '#10B981', flexShrink: 0 }}></span>
                        <span>{inq.pickup}</span>
                      </div>
                      <div className="hostinger-route-item">
                        <span style={{ width: '8px', height: '8px', borderRadius: '50%', background: '#EF4444', flexShrink: 0 }}></span>
                        <span>{inq.dropoff}</span>
                      </div>
                    </div>

                    {/* Vehicle & Fare Row */}
                    <div className="hostinger-card-footer">
                      <span className="hostinger-vehicle-badge">{inq.vehicle}</span>
                      <div style={{ textAlign: 'right' }}>
                        <span className="hostinger-fare-tag">₹{Number(inq.fare).toFixed(2)}</span>
                        {inq.walletDiscountUsed > 0 && (
                          <div style={{ fontSize: '11px', color: '#059669', fontWeight: '700' }}>
                            🎁 -₹{Number(inq.walletDiscountUsed).toFixed(2)} coupon
                          </div>
                        )}
                      </div>
                    </div>

                    {/* Driver Assignment Line */}
                    {inq.driver && inq.driver !== '-' && (
                      <div className="hostinger-driver-line">
                        <UserCheck size={13} color="#059669" /> Driver: <strong>{inq.driver}</strong>
                      </div>
                    )}

                    {/* Aligned Action Buttons Bar */}
                    <div className="hostinger-card-actions">
                      <button 
                        className="btn-action-view"
                        disabled={actionLoadingId === 'receipt_' + inq.id}
                        style={{
                          background: '#EFF6FF',
                          color: '#1D4ED8',
                          border: '1px solid #BFDBFE',
                          padding: '6px 10px',
                          borderRadius: '8px',
                          fontSize: '12px',
                          fontWeight: '800',
                          display: 'inline-flex',
                          alignItems: 'center',
                          gap: '4px'
                        }}
                        onClick={() => setReceiptModal({ open: true, inquiry: inq })}
                      >
                        <Eye size={12} /> Receipt
                      </button>

                      {inq.status === 'Pending' && (
                        <button 
                          className="btn-action-assign"
                          disabled={actionLoadingId === 'confirm_' + inq.id}
                          style={{
                            padding: '6px 10px',
                            fontSize: '12px',
                            borderRadius: '8px',
                            display: 'inline-flex',
                            alignItems: 'center',
                            gap: '4px'
                          }}
                          onClick={() => setAssignModal({ open: true, inquiry: inq })}
                        >
                          <UserCheck size={12} /> {actionLoadingId === 'confirm_' + inq.id ? 'Assigning...' : 'Assign Driver'}
                        </button>
                      )}

                      {(inq.status === 'Pending' || inq.status === 'Confirmed') && (
                        <button 
                          className="btn-action-cancel"
                          disabled={actionLoadingId === 'cancel_' + inq.id}
                          style={{
                            padding: '6px 10px',
                            fontSize: '12px',
                            borderRadius: '8px',
                            display: 'inline-flex',
                            alignItems: 'center',
                            gap: '4px'
                          }}
                          onClick={() => handleCancelInquiry(inq.id)}
                        >
                          <XCircle size={12} /> Cancel
                        </button>
                      )}

                      <button 
                        className="btn-action-delete"
                        disabled={actionLoadingId === 'delete_' + inq.id}
                        style={{
                          padding: '6px 10px',
                          fontSize: '12px',
                          borderRadius: '8px',
                          display: 'inline-flex',
                          alignItems: 'center',
                          gap: '4px'
                        }}
                        onClick={() => handleDeleteInquiry(inq.id)}
                      >
                        <Trash2 size={12} /> Delete
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        )}

        {/* TAB: FINAL TRIPS (Active Ride Pipeline) */}
        {activeTab === 'final_trips' && (
          <div className="tab-pane">
            <div className="pane-header flex justify-between align-center">
              <div>
                <h2>Final Trips Command Center</h2>
                <p>Manage live ongoing rides. Start trip and complete ride upon arrival.</p>
              </div>
            </div>

            <div className="admin-table-card mt-3">
              <div className="table-responsive">
                <table className="admin-table">
                  <thead>
                    <tr>
                      <th>Trip ID</th>
                      <th>Customer Details</th>
                      <th>Route (Pickup → Dropoff)</th>
                      <th>Assigned Driver</th>
                      <th>Fare</th>
                      <th>Live Status</th>
                      <th className="text-right">Action Pipeline</th>
                    </tr>
                  </thead>
                  <tbody>
                    {sortedInquiries.filter(i => 
                      !i.isCustom && i.tripType !== 'Custom Trip' && i.tripType !== 'custom-trip' &&
                      (i.status === 'Confirmed' || 
                      i.status === 'In Progress' || 
                      i.status === 'On Ride')
                    ).map((inq) => {
                      const isConfirmed = inq.status === 'Confirmed';
                      const isInProgress = inq.status === 'In Progress' || inq.status === 'On Ride';

                      return (
                        <tr key={inq.id}>
                          <td><strong style={{ color: '#0F172A', fontSize: '0.9rem' }}>{inq.id}</strong></td>
                          <td>
                            <div style={{ display: 'flex', flexDirection: 'column', gap: '3px' }}>
                              <strong style={{ color: '#0F172A', fontSize: '0.9rem' }}>{resolveCustomerName(inq)}</strong>
                              <span style={{ fontSize: '0.8rem', color: '#64748B', display: 'block' }}>{inq.customerPhone}</span>
                            </div>
                          </td>
                          <td className="route-cell" style={{ padding: '12px 16px' }}>
                            <div style={{ display: 'flex', flexDirection: 'column', gap: '6px', minWidth: '240px' }}>
                              <div className="route-place-cell">
                                <span className="dot-indicator green"></span>
                                <span className="place-name-text">{inq.pickup}</span>
                              </div>
                              <div className="route-place-cell">
                                <span className="dot-indicator red"></span>
                                <span className="place-name-text">{inq.dropoff}</span>
                              </div>
                            </div>
                          </td>
                          <td>
                            <span className="plate-badge" style={{ padding: '6px 12px', background: '#F1F5F9', color: '#334155', borderRadius: '8px', fontWeight: '700', fontSize: '0.82rem', display: 'inline-block', whiteSpace: 'nowrap' }}>
                              {inq.driver || 'Assigned Driver'}
                            </span>
                          </td>
                          <td><strong className="text-green" style={{ fontSize: '0.95rem', fontWeight: '800' }}>₹{Number(inq.fare || 0).toFixed(2)}</strong></td>
                          <td>
                            {isConfirmed && <span className="status-tag status-confirmed" style={{ padding: '6px 14px', borderRadius: '20px', fontWeight: '700', fontSize: '0.8rem', whiteSpace: 'nowrap' }}>Confirmed (Ready)</span>}
                            {isInProgress && <span className="status-tag status-on-ride" style={{ padding: '6px 14px', borderRadius: '20px', fontWeight: '700', fontSize: '0.8rem', whiteSpace: 'nowrap' }}>● Live In Progress</span>}
                          </td>
                          <td className="text-right" style={{ whiteSpace: 'nowrap', minWidth: '220px' }}>
                            <div style={{ display: 'flex', gap: '6px', justifyContent: 'flex-end', alignItems: 'center', flexWrap: 'nowrap' }}>
                              {/* 1. START TRIP BUTTON */}
                              {isConfirmed && (
                                <button 
                                  className="btn-action-start"
                                  disabled={actionLoadingId === 'start_' + inq.id}
                                  onClick={() => handleStartTrip(inq.id)}
                                  title="Admin Start Ride"
                                  style={{
                                    display: 'inline-flex',
                                    alignItems: 'center',
                                    gap: '6px',
                                    padding: '7px 14px',
                                    borderRadius: '16px',
                                    fontWeight: '800',
                                    fontSize: '0.82rem',
                                    whiteSpace: 'nowrap',
                                    opacity: actionLoadingId === 'start_' + inq.id ? 0.7 : 1,
                                    cursor: actionLoadingId === 'start_' + inq.id ? 'not-allowed' : 'pointer'
                                  }}
                                >
                                  <Play size={14} /> {actionLoadingId === 'start_' + inq.id ? 'Starting...' : 'Start Trip'}
                                </button>
                              )}

                              {/* 2. COMPLETE TRIP BUTTON */}
                              {isInProgress && (
                                <button 
                                  className="btn-action-complete"
                                  disabled={actionLoadingId === 'complete_' + inq.id}
                                  onClick={() => handleCompleteTrip(inq.id)}
                                  title="Admin Complete Ride"
                                  style={{
                                    display: 'inline-flex',
                                    alignItems: 'center',
                                    gap: '6px',
                                    padding: '7px 14px',
                                    borderRadius: '16px',
                                    fontWeight: '800',
                                    fontSize: '0.82rem',
                                    whiteSpace: 'nowrap',
                                    opacity: actionLoadingId === 'complete_' + inq.id ? 0.7 : 1,
                                    cursor: actionLoadingId === 'complete_' + inq.id ? 'not-allowed' : 'pointer'
                                  }}
                                >
                                  <CheckCircle size={14} /> {actionLoadingId === 'complete_' + inq.id ? 'Completing...' : 'Complete Trip'}
                                </button>
                              )}

                              <button 
                                className="btn-action-view"
                                disabled={!!actionLoadingId}
                                onClick={() => setReceiptModal({ open: true, inquiry: inq })}
                                title="View Trip Details"
                                style={{
                                  display: 'inline-flex',
                                  alignItems: 'center',
                                  gap: '6px',
                                  padding: '7px 12px',
                                  borderRadius: '16px',
                                  fontWeight: '800',
                                  fontSize: '0.82rem',
                                  whiteSpace: 'nowrap',
                                  opacity: actionLoadingId ? 0.7 : 1
                                }}
                              >
                                <Eye size={14} /> View
                              </button>
                            </div>
                          </td>
                        </tr>
                      );
                    })}

                    {sortedInquiries.filter(i => 
                      !i.isCustom && i.tripType !== 'Custom Trip' && i.tripType !== 'custom-trip' &&
                      (i.status === 'Confirmed' || 
                      i.status === 'In Progress' || 
                      i.status === 'On Ride')
                    ).length === 0 && (
                      <tr>
                        <td colSpan={7} className="text-center text-muted p-4">
                          No active final trips currently in progress or awaiting start.
                        </td>
                      </tr>
                    )}
                  </tbody>
                </table>
              </div>

              {/* HOSTINGER ALIGNED MOBILE CARDS FOR FINAL TRIPS */}
              <div className="admin-mobile-card-list">
                {sortedInquiries.filter(i => 
                  !i.isCustom && i.tripType !== 'Custom Trip' && i.tripType !== 'custom-trip' &&
                  (i.status === 'Confirmed' || 
                  i.status === 'In Progress' || 
                  i.status === 'On Ride')
                ).map((inq) => {
                  const isConfirmed = inq.status === 'Confirmed';
                  const isInProgress = inq.status === 'In Progress' || inq.status === 'On Ride';

                  return (
                    <div key={inq.id} className="hostinger-admin-card" style={{ background: isInProgress ? '#ECFDF5' : '#FFFFFF' }}>
                      <div className="hostinger-card-top">
                        <div className="hostinger-card-id-group">
                          <span className="hostinger-card-id">{inq.id}</span>
                          <span className="hostinger-card-date">• {inq.date}</span>
                        </div>
                        {isConfirmed && <span className="status-tag status-confirmed">Confirmed</span>}
                        {isInProgress && <span className="status-tag status-on-ride">● In Progress</span>}
                      </div>
                      <div className="hostinger-card-customer">
                        <span className="hostinger-cust-name">{resolveCustomerName(inq)}</span>
                        <span className="hostinger-cust-phone">📞 {inq.customerPhone}</span>
                      </div>
                      <div className="hostinger-card-route">
                        <div className="hostinger-route-item">
                          <span style={{ width: '8px', height: '8px', borderRadius: '50%', background: '#10B981', flexShrink: 0 }}></span>
                          <span>{inq.pickup}</span>
                        </div>
                        <div className="hostinger-route-item">
                          <span style={{ width: '8px', height: '8px', borderRadius: '50%', background: '#EF4444', flexShrink: 0 }}></span>
                          <span>{inq.dropoff}</span>
                        </div>
                      </div>
                      <div className="hostinger-card-footer">
                        <span className="hostinger-vehicle-badge">{inq.vehicle || 'Taxi'}</span>
                        <span className="hostinger-fare-tag">₹{Number(inq.fare || 0).toFixed(2)}</span>
                      </div>
                      <div className="hostinger-driver-line">
                        <UserCheck size={13} color="#059669" /> Driver: <strong>{inq.driver || 'Assigned Driver'}</strong>
                      </div>
                      <div className="hostinger-card-actions">
                        {isConfirmed && (
                          <button 
                            className="btn-action-start"
                            disabled={actionLoadingId === 'start_' + inq.id}
                            onClick={() => handleStartTrip(inq.id)}
                            style={{ padding: '7px 14px', borderRadius: '10px', fontWeight: '800', fontSize: '13px', display: 'inline-flex', alignItems: 'center', gap: '6px' }}
                          >
                            <Play size={14} /> {actionLoadingId === 'start_' + inq.id ? 'Starting...' : 'Start Trip'}
                          </button>
                        )}
                        {isInProgress && (
                          <button 
                            className="btn-action-complete"
                            disabled={actionLoadingId === 'complete_' + inq.id}
                            onClick={() => handleCompleteTrip(inq.id)}
                            style={{ padding: '7px 14px', borderRadius: '10px', fontWeight: '800', fontSize: '13px', display: 'inline-flex', alignItems: 'center', gap: '6px' }}
                          >
                            <CheckCircle size={14} /> {actionLoadingId === 'complete_' + inq.id ? 'Completing...' : 'Complete Trip'}
                          </button>
                        )}
                        <button 
                          className="btn-action-view"
                          onClick={() => setReceiptModal({ open: true, inquiry: inq })}
                          style={{ padding: '7px 12px', borderRadius: '10px', fontWeight: '800', fontSize: '13px', display: 'inline-flex', alignItems: 'center', gap: '4px' }}
                        >
                          <Eye size={14} /> View
                        </button>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          </div>
        )}

        {/* TAB: SUCCESS TRIPS (Completed Trips History) */}
        {activeTab === 'success_trips' && (
          <div className="tab-pane">
            <div className="pane-header flex justify-between align-center">
              <div>
                <h2>Success Trips Directory</h2>
                <p>History of all successfully completed rides, customer rewards, and trip details.</p>
              </div>
            </div>

            <div className="admin-table-card mt-3">
              <div className="table-responsive">
                <table className="admin-table">
                  <thead>
                    <tr>
                      <th>Trip ID</th>
                      <th>Customer Name</th>
                      <th>Route (Pickup → Dropoff)</th>
                      <th>Driver</th>
                      <th>Fare</th>
                      <th>Reward Status</th>
                      <th className="text-right">Actions</th>
                    </tr>
                  </thead>
                  <tbody>
                    {sortedInquiries.filter(i => !i.isCustom && i.tripType !== 'Custom Trip' && i.tripType !== 'custom-trip' && i.status === 'Completed').map((inq) => (
                      <tr key={inq.id}>
                        <td><strong>{inq.id}</strong></td>
                        <td>
                          <div>
                            <strong>{resolveCustomerName(inq)}</strong>
                            <small className="text-muted display-block">{inq.customerPhone}</small>
                          </div>
                        </td>
                        <td className="route-cell">
                          <div>{inq.pickup} → {inq.dropoff}</div>
                          <small className="text-muted">{inq.date}</small>
                        </td>
                        <td>
                          <span className="plate-badge" style={{ whiteSpace: 'nowrap' }}>{inq.driver || 'Fulfilled'}</span>
                        </td>
                        <td><strong className="text-green">₹{Number(inq.fare || 0).toFixed(2)}</strong></td>
                        <td>
                          {inq.rewardIssued && Number(inq.rewardAmount) > 0 ? (
                            <span className="status-tag status-confirmed" style={{ whiteSpace: 'nowrap' }}>✓ ₹{inq.rewardAmount} Credited</span>
                          ) : (
                            <span className="text-muted" style={{ fontSize: '0.8rem' }}>No Reward</span>
                          )}
                        </td>
                        <td className="text-right" style={{ whiteSpace: 'nowrap', minWidth: '140px' }}>
                          <div style={{ display: 'flex', gap: '6px', justifyContent: 'flex-end', alignItems: 'center', flexWrap: 'nowrap' }}>
                            <button 
                              className="btn-action-view"
                              disabled={!!actionLoadingId}
                              onClick={() => setReceiptModal({ open: true, inquiry: inq })}
                              title="View Full Trip Details & Receipt"
                              style={{ display: 'inline-flex', alignItems: 'center', gap: '6px', padding: '6px 12px', borderRadius: '16px', fontWeight: '800', fontSize: '0.82rem', whiteSpace: 'nowrap', opacity: actionLoadingId ? 0.7 : 1 }}
                            >
                              <Eye size={14} /> View Details
                            </button>
                          </div>
                        </td>
                      </tr>
                    ))}

                    {sortedInquiries.filter(i => !i.isCustom && i.tripType !== 'Custom Trip' && i.tripType !== 'custom-trip' && i.status === 'Completed').length === 0 && (
                      <tr>
                        <td colSpan={7} className="text-center text-muted p-4">
                          No completed success trips in database history yet.
                        </td>
                      </tr>
                    )}
                  </tbody>
                </table>
              </div>

              {/* HOSTINGER ALIGNED MOBILE CARDS FOR SUCCESS TRIPS */}
              <div className="admin-mobile-card-list">
                {sortedInquiries.filter(i => !i.isCustom && i.tripType !== 'Custom Trip' && i.tripType !== 'custom-trip' && i.status === 'Completed').map((inq) => (
                  <div key={inq.id} className="hostinger-admin-card" style={{ background: '#ECFDF5' }}>
                    <div className="hostinger-card-top">
                      <div className="hostinger-card-id-group">
                        <span className="hostinger-card-id">{inq.id}</span>
                        <span className="hostinger-card-date">• {inq.date}</span>
                      </div>
                      <span className="status-tag status-active">✓ Completed</span>
                    </div>
                    <div className="hostinger-card-customer">
                      <span className="hostinger-cust-name">{resolveCustomerName(inq)}</span>
                      <span className="hostinger-cust-phone">📞 {inq.customerPhone}</span>
                    </div>
                    <div className="hostinger-card-route">
                      <div className="hostinger-route-item">
                        <span style={{ width: '8px', height: '8px', borderRadius: '50%', background: '#10B981', flexShrink: 0 }}></span>
                        <span>{inq.pickup}</span>
                      </div>
                      <div className="hostinger-route-item">
                        <span style={{ width: '8px', height: '8px', borderRadius: '50%', background: '#EF4444', flexShrink: 0 }}></span>
                        <span>{inq.dropoff}</span>
                      </div>
                    </div>
                    <div className="hostinger-card-footer">
                      <span className="hostinger-vehicle-badge">{inq.driver || 'Fulfilled'}</span>
                      <span className="hostinger-fare-tag">₹{Number(inq.fare || 0).toFixed(2)}</span>
                    </div>
                    {inq.rewardIssued && Number(inq.rewardAmount) > 0 && (
                      <div style={{ fontSize: '11px', color: '#059669', fontWeight: '800', background: '#D1FAE5', padding: '4px 8px', borderRadius: '6px', width: 'fit-content' }}>
                        🎁 ₹{inq.rewardAmount} Reward Credited
                      </div>
                    )}
                    <div className="hostinger-card-actions">
                      <button 
                        className="btn-action-view"
                        onClick={() => setReceiptModal({ open: true, inquiry: inq })}
                        style={{ padding: '6px 12px', borderRadius: '8px', fontWeight: '800', fontSize: '12px', display: 'inline-flex', alignItems: 'center', gap: '4px' }}
                      >
                        <Eye size={13} /> View Details & Receipt
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        )}

        {/* TAB: CUSTOM INQUIRIES SECTION */}
        {activeTab === 'custom_inquiries' && (
          <div className="tab-pane">
            <div className="pane-header flex justify-between align-center">
              <div>
                <h2>✨ Custom Inquiries Command Center</h2>
                <p>Dedicated section for multi-city, custom trip inquiries. Pending items are prioritized at the top.</p>
              </div>
            </div>

            {/* TOP LIST: PENDING & ACTIVE CUSTOM INQUIRIES */}
            <div className="admin-table-card mt-3">
              <div style={{ padding: '14px 18px', background: '#F5F3FF', borderBottom: '1px solid #DDD6FE', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                <h3 style={{ margin: 0, fontSize: '1rem', fontWeight: '800', color: '#6D28D9', display: 'flex', alignItems: 'center', gap: '8px' }}>
                  <Sparkles size={18} /> PENDING & ACTIVE CUSTOM INQUIRIES ({sortedInquiries.filter(i => (i.isCustom || i.tripType === 'Custom Trip' || i.tripType === 'custom-trip') && (i.status === 'Pending' || i.status === 'Confirmed' || i.status === 'In Progress')).length})
                </h3>
                <span style={{ fontSize: '0.8rem', fontWeight: '700', color: '#7C3AED', background: '#ECE9FE', padding: '4px 10px', borderRadius: '12px' }}>Prioritized Top List</span>
              </div>

              <div className="table-responsive">
                <table className="admin-table">
                  <thead>
                    <tr>
                      <th>ID</th>
                      <th>Customer Details</th>
                      <th>Pickup → Dropoff City</th>
                      <th>Detailed Pickup Location</th>
                      <th>Detailed Dropoff Location</th>
                      <th>Days & Date</th>
                      <th>Selected Fleet Car</th>
                      <th>Status</th>
                      <th className="text-right">Actions</th>
                    </tr>
                  </thead>
                  <tbody>
                    {sortedInquiries.filter(i => 
                      (i.isCustom || i.tripType === 'Custom Trip' || i.tripType === 'custom-trip') && 
                      (i.status === 'Pending' || i.status === 'Confirmed' || i.status === 'In Progress')
                    ).map((inq) => {
                      const isPending = inq.status === 'Pending';
                      const isConfirmed = inq.status === 'Confirmed' || inq.status === 'In Progress';

                      return (
                        <tr key={inq.id} style={{ background: isPending ? '#FFFBEB' : '#F0FDF4' }}>
                          <td><strong style={{ color: '#0F172A' }}>{inq.id}</strong></td>
                          <td>
                            <div>
                              <strong style={{ color: '#0F172A' }}>{resolveCustomerName(inq)}</strong>
                              <span style={{ fontSize: '0.8rem', color: '#64748B', display: 'block' }}>📞 {inq.customerPhone}</span>
                            </div>
                          </td>
                          <td>
                            <span style={{ fontWeight: '800', color: '#6D28D9', fontSize: '0.9rem' }}>
                              {inq.pickupCity || inq.pickup} → {inq.dropoffCity || inq.dropoff}
                            </span>
                          </td>
                          <td>
                            <div style={{ fontSize: '0.83rem', color: '#334155', maxWidth: '180px', wordBreak: 'break-word' }}>{inq.pickup}</div>
                          </td>
                          <td>
                            <div style={{ fontSize: '0.83rem', color: '#334155', maxWidth: '180px', wordBreak: 'break-word' }}>{inq.dropoff}</div>
                          </td>
                          <td>
                            <div style={{ fontSize: '0.85rem', fontWeight: '700', color: '#0F172A' }}>{inq.noOfDays || 1} Day(s)</div>
                            <small style={{ color: '#64748B' }}>{inq.scheduledDate || inq.date}</small>
                          </td>
                          <td>
                            <span style={{ padding: '4px 10px', background: '#EDE9FE', color: '#5B21B6', borderRadius: '8px', fontWeight: '800', fontSize: '0.8rem', whiteSpace: 'nowrap' }}>
                              {inq.vehicle || 'Selected Car'}
                            </span>
                          </td>
                          <td>
                            {isPending && <span className="status-tag status-pending">Pending Approval</span>}
                            {isConfirmed && <span className="status-tag status-confirmed">Confirmed Active</span>}
                          </td>
                          <td className="text-right" style={{ whiteSpace: 'nowrap' }}>
                            <div style={{ display: 'flex', gap: '6px', justifyContent: 'flex-end', alignItems: 'center' }}>
                              {/* PENDING ACTIONS: CONFIRM & REJECT */}
                              {isPending && (
                                <>
                                  <button
                                    className="btn-action-confirm"
                                    disabled={!!actionLoadingId}
                                    onClick={() => {
                                      setActionLoadingId('confirm_' + inq.id);
                                      updateInquiryStatusInMySQL(inq.id, 'Confirmed').catch(() => {});
                                      setInquiries(prev => prev.map(item => item.id === inq.id ? { ...item, status: 'Confirmed' } : item));
                                      notifyCustomer({
                                        type: 'confirmed',
                                        title: '✅ Custom Trip Confirmed!',
                                        body: `Your custom trip inquiry for ${inq.pickupCity || inq.pickup} → ${inq.dropoffCity || inq.dropoff} has been confirmed by EMPERIAL CABS!`,
                                        customerPhone: inq.customerPhone,
                                        customerEmail: inq.customerEmail
                                      });
                                      window.dispatchEvent(new Event('storage'));
                                      setTimeout(() => setActionLoadingId(null), 300);
                                    }}
                                    style={{ padding: '6px 12px', borderRadius: '12px', background: '#10B981', color: '#FFF', fontWeight: '800', fontSize: '0.8rem', border: 'none', cursor: 'pointer' }}
                                  >
                                    Confirm
                                  </button>
                                  <button
                                    className="btn-action-cancel"
                                    disabled={!!actionLoadingId}
                                    onClick={() => {
                                      setActionLoadingId('cancel_' + inq.id);
                                      updateInquiryStatusInMySQL(inq.id, 'Rejected').catch(() => {});
                                      setInquiries(prev => prev.map(item => item.id === inq.id ? { ...item, status: 'Rejected' } : item));
                                      window.dispatchEvent(new Event('storage'));
                                      setTimeout(() => setActionLoadingId(null), 300);
                                    }}
                                    style={{ padding: '6px 12px', borderRadius: '12px', background: '#EF4444', color: '#FFF', fontWeight: '800', fontSize: '0.8rem', border: 'none', cursor: 'pointer' }}
                                  >
                                    Reject
                                  </button>
                                </>
                              )}

                              {/* CONFIRMED ACTIONS: MARK COMPLETED */}
                              {isConfirmed && (
                                <button
                                  className="btn-action-complete"
                                  disabled={!!actionLoadingId}
                                  onClick={() => triggerCompleteTrip(inq)}
                                  style={{ padding: '6px 12px', borderRadius: '12px', background: '#059669', color: '#FFF', fontWeight: '800', fontSize: '0.8rem', border: 'none', cursor: 'pointer' }}
                                >
                                  Complete Trip
                                </button>
                              )}

                              <button
                                className="btn-action-view"
                                onClick={() => setReceiptModal({ open: true, inquiry: inq })}
                                style={{ padding: '6px 10px', borderRadius: '12px', background: '#F1F5F9', color: '#0F172A', fontWeight: '800', fontSize: '0.8rem', border: 'none', cursor: 'pointer' }}
                              >
                                <Eye size={14} />
                              </button>
                            </div>
                          </td>
                        </tr>
                      );
                    })}

                    {sortedInquiries.filter(i => 
                      (i.isCustom || i.tripType === 'Custom Trip' || i.tripType === 'custom-trip') && 
                      (i.status === 'Pending' || i.status === 'Confirmed' || i.status === 'In Progress')
                    ).length === 0 && (
                      <tr>
                        <td colSpan={9} className="text-center text-muted p-4">
                          No pending or active custom inquiries. All custom inquiries are up to date!
                        </td>
                      </tr>
                    )}
                  </tbody>
                </table>
              </div>

              {/* HOSTINGER ALIGNED MOBILE CARDS FOR CUSTOM INQUIRIES */}
              <div className="admin-mobile-card-list">
                {sortedInquiries.filter(i => 
                  (i.isCustom || i.tripType === 'Custom Trip' || i.tripType === 'custom-trip') && 
                  (i.status === 'Pending' || i.status === 'Confirmed' || i.status === 'In Progress')
                ).map(inq => {
                  const isPending = inq.status === 'Pending';
                  const isConfirmed = inq.status === 'Confirmed' || inq.status === 'In Progress';

                  return (
                    <div key={inq.id} className="hostinger-admin-card" style={{ background: isPending ? '#FFFBEB' : '#F0FDF4' }}>
                      <div className="hostinger-card-top">
                        <div className="hostinger-card-id-group">
                          <span className="hostinger-card-id">{inq.id}</span>
                          <span className="hostinger-card-date">• {inq.noOfDays || 1} Day(s)</span>
                        </div>
                        <span className={`status-tag status-${inq.status.toLowerCase()}`}>
                          {inq.status}
                        </span>
                      </div>
                      <div className="hostinger-card-customer">
                        <span className="hostinger-cust-name">{resolveCustomerName(inq)}</span>
                        <span className="hostinger-cust-phone">📞 {inq.customerPhone}</span>
                      </div>
                      <div className="hostinger-card-route">
                        <div className="hostinger-route-item">
                          <span style={{ width: '8px', height: '8px', borderRadius: '50%', background: '#10B981', flexShrink: 0 }}></span>
                          <span>Pickup: {inq.pickup}</span>
                        </div>
                        <div className="hostinger-route-item">
                          <span style={{ width: '8px', height: '8px', borderRadius: '50%', background: '#EF4444', flexShrink: 0 }}></span>
                          <span>Dropoff: {inq.dropoff}</span>
                        </div>
                      </div>
                      <div className="hostinger-card-footer">
                        <span className="hostinger-vehicle-badge">{inq.vehicle || 'Selected Car'}</span>
                        <span className="hostinger-fare-tag">₹{Number(inq.fare || 0).toFixed(2)}</span>
                      </div>
                      <div className="hostinger-card-actions">
                        {isPending && (
                          <>
                            <button
                              className="btn-action-confirm"
                              disabled={!!actionLoadingId}
                              onClick={() => {
                                setActionLoadingId('confirm_' + inq.id);
                                updateInquiryStatusInMySQL(inq.id, 'Confirmed').catch(() => {});
                                setInquiries(prev => prev.map(item => item.id === inq.id ? { ...item, status: 'Confirmed' } : item));
                                notifyCustomer({
                                  type: 'confirmed',
                                  title: '✅ Custom Trip Confirmed!',
                                  body: `Your custom trip inquiry for ${inq.pickupCity || inq.pickup} → ${inq.dropoffCity || inq.dropoff} has been confirmed by EMPERIAL CABS!`,
                                  customerPhone: inq.customerPhone,
                                  customerEmail: inq.customerEmail
                                });
                                window.dispatchEvent(new Event('storage'));
                                setTimeout(() => setActionLoadingId(null), 300);
                              }}
                              style={{ padding: '6px 12px', borderRadius: '8px', background: '#10B981', color: '#FFF', fontWeight: '800', fontSize: '0.8rem', border: 'none', cursor: 'pointer' }}
                            >
                              Confirm
                            </button>
                            <button
                              className="btn-action-cancel"
                              disabled={!!actionLoadingId}
                              onClick={() => {
                                setActionLoadingId('cancel_' + inq.id);
                                updateInquiryStatusInMySQL(inq.id, 'Rejected').catch(() => {});
                                setInquiries(prev => prev.map(item => item.id === inq.id ? { ...item, status: 'Rejected' } : item));
                                window.dispatchEvent(new Event('storage'));
                                setTimeout(() => setActionLoadingId(null), 300);
                              }}
                              style={{ padding: '6px 12px', borderRadius: '8px', background: '#EF4444', color: '#FFF', fontWeight: '800', fontSize: '0.8rem', border: 'none', cursor: 'pointer' }}
                            >
                              Reject
                            </button>
                          </>
                        )}
                        {isConfirmed && (
                          <button
                            className="btn-action-complete"
                            disabled={!!actionLoadingId}
                            onClick={() => triggerCompleteTrip(inq)}
                            style={{ padding: '6px 12px', borderRadius: '8px', background: '#059669', color: '#FFF', fontWeight: '800', fontSize: '0.8rem', border: 'none', cursor: 'pointer' }}
                          >
                            Complete Trip
                          </button>
                        )}
                        <button
                          className="btn-action-view"
                          onClick={() => setReceiptModal({ open: true, inquiry: inq })}
                          style={{ padding: '6px 10px', borderRadius: '8px', background: '#F1F5F9', color: '#0F172A', fontWeight: '800', fontSize: '0.8rem', border: 'none', cursor: 'pointer' }}
                        >
                          <Eye size={14} /> View
                        </button>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>

            {/* BOTTOM LIST: COMPLETED & REJECTED CUSTOM INQUIRIES */}
            <div className="admin-table-card mt-4">
              <div style={{ padding: '14px 18px', background: '#F8FAFC', borderBottom: '1px solid #E2E8F0', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                <h3 style={{ margin: 0, fontSize: '0.95rem', fontWeight: '800', color: '#475569' }}>
                  ARCHIVED COMPLETED & REJECTED CUSTOM TRIPS ({sortedInquiries.filter(i => (i.isCustom || i.tripType === 'Custom Trip' || i.tripType === 'custom-trip') && (i.status === 'Completed' || i.status === 'Rejected' || i.status === 'Cancelled')).length})
                </h3>
                <span style={{ fontSize: '0.78rem', fontWeight: '700', color: '#64748B' }}>Completed History (At Bottom)</span>
              </div>

              <div className="table-responsive">
                <table className="admin-table">
                  <thead>
                    <tr>
                      <th>ID</th>
                      <th>Customer Name</th>
                      <th>Route (Cities & Detailed Addresses)</th>
                      <th>Days & Date</th>
                      <th>Car</th>
                      <th>Status</th>
                      <th className="text-right">Action</th>
                    </tr>
                  </thead>
                  <tbody>
                    {sortedInquiries.filter(i => 
                      (i.isCustom || i.tripType === 'Custom Trip' || i.tripType === 'custom-trip') && 
                      (i.status === 'Completed' || i.status === 'Rejected' || i.status === 'Cancelled')
                    ).map((inq) => (
                      <tr key={inq.id} style={{ opacity: 0.85 }}>
                        <td><strong>{inq.id}</strong></td>
                        <td>
                          <strong>{resolveCustomerName(inq)}</strong>
                          <small className="text-muted display-block">📞 {inq.customerPhone}</small>
                        </td>
                        <td>
                          <div style={{ fontWeight: '700', color: '#334155' }}>
                            {inq.pickupCity || inq.pickup} → {inq.dropoffCity || inq.dropoff}
                          </div>
                          <div style={{ fontSize: '0.78rem', color: '#64748B' }}>
                            Pickup: {inq.pickup} | Dropoff: {inq.dropoff}
                          </div>
                        </td>
                        <td>
                          <div>{inq.noOfDays || 1} Day(s)</div>
                          <small className="text-muted">{inq.scheduledDate || inq.date}</small>
                        </td>
                        <td><span className="plate-badge">{inq.vehicle || 'Selected Car'}</span></td>
                        <td>
                          {inq.status === 'Completed' && <span className="status-tag status-confirmed">Completed</span>}
                          {(inq.status === 'Rejected' || inq.status === 'Cancelled') && <span className="status-tag status-pending" style={{ background: '#FEE2E2', color: '#DC2626' }}>{inq.status}</span>}
                        </td>
                        <td className="text-right">
                          <button
                            className="btn-action-view"
                            onClick={() => setReceiptModal({ open: true, inquiry: inq })}
                            style={{ padding: '5px 10px', borderRadius: '10px', background: '#F1F5F9', color: '#0F172A', fontWeight: '700', fontSize: '0.78rem', border: 'none', cursor: 'pointer' }}
                          >
                            View
                          </button>
                        </td>
                      </tr>
                    ))}

                    {sortedInquiries.filter(i => 
                      (i.isCustom || i.tripType === 'Custom Trip' || i.tripType === 'custom-trip') && 
                      (i.status === 'Completed' || i.status === 'Rejected' || i.status === 'Cancelled')
                    ).length === 0 && (
                      <tr>
                        <td colSpan={7} className="text-center text-muted p-4">
                          No completed or rejected custom inquiries yet.
                        </td>
                      </tr>
                    )}
                  </tbody>
                </table>
              </div>

              {/* HOSTINGER ALIGNED MOBILE CARDS FOR ARCHIVED CUSTOM TRIPS */}
              <div className="admin-mobile-card-list">
                {sortedInquiries.filter(i => 
                  (i.isCustom || i.tripType === 'Custom Trip' || i.tripType === 'custom-trip') && 
                  (i.status === 'Completed' || i.status === 'Rejected' || i.status === 'Cancelled')
                ).map((inq) => (
                  <div key={inq.id} className="hostinger-admin-card" style={{ opacity: 0.9 }}>
                    <div className="hostinger-card-top">
                      <div className="hostinger-card-id-group">
                        <span className="hostinger-card-id">{inq.id}</span>
                        <span className="hostinger-card-date">• {inq.noOfDays || 1} Day(s)</span>
                      </div>
                      {inq.status === 'Completed' && <span className="status-tag status-confirmed">Completed</span>}
                      {(inq.status === 'Rejected' || inq.status === 'Cancelled') && <span className="status-tag status-pending" style={{ background: '#FEE2E2', color: '#DC2626' }}>{inq.status}</span>}
                    </div>
                    <div className="hostinger-card-customer">
                      <span className="hostinger-cust-name">{resolveCustomerName(inq)}</span>
                      <span className="hostinger-cust-phone">📞 {inq.customerPhone}</span>
                    </div>
                    <div className="hostinger-card-route">
                      <div className="hostinger-route-item">
                        <span style={{ width: '8px', height: '8px', borderRadius: '50%', background: '#10B981', flexShrink: 0 }}></span>
                        <span>{inq.pickupCity || inq.pickup}</span>
                      </div>
                      <div className="hostinger-route-item">
                        <span style={{ width: '8px', height: '8px', borderRadius: '50%', background: '#EF4444', flexShrink: 0 }}></span>
                        <span>{inq.dropoffCity || inq.dropoff}</span>
                      </div>
                    </div>
                    <div className="hostinger-card-footer">
                      <span className="hostinger-vehicle-badge">{inq.vehicle || 'Selected Car'}</span>
                      <span className="hostinger-fare-tag">₹{Number(inq.fare || 0).toFixed(2)}</span>
                    </div>
                    <div className="hostinger-card-actions">
                      <button
                        className="btn-action-view"
                        onClick={() => setReceiptModal({ open: true, inquiry: inq })}
                        style={{ padding: '6px 12px', borderRadius: '8px', background: '#F1F5F9', color: '#0F172A', fontWeight: '800', fontSize: '0.8rem', border: 'none', cursor: 'pointer' }}
                      >
                        <Eye size={14} /> View Details
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        )}

        {/* TAB: FLEET VEHICLES & RATE MANAGEMENT */}
        {activeTab === 'vehicles' && (
          <div className="tab-pane">
            <div className="pane-header flex justify-between align-center">
              <div>
                <h2>Fleet Vehicles & Rate Management</h2>
                <p>Manage vehicle roster, set base rate fares per kilometer, edit passenger capacities, and set showcase photos.</p>
              </div>
              <button className="btn btn-primary btn-lg-action flex align-center gap-2" onClick={() => setAddVehicleModal(true)}>
                <Plus size={18} /> Add New Car
              </button>
            </div>

            <div className="vehicles-cards-grid">
              {vehicles.map(car => (
                <div key={car.id} className="vehicle-card-full card">
                  <div className="vehicle-card-image-wrap">
                    <img src={car.image} alt={car.name} className="vehicle-card-img" />
                    <span className={`status-badge status-${car.status.toLowerCase()}`}>{car.status}</span>
                  </div>

                  <div className="vehicle-card-body mt-3">
                    <div className="flex justify-between align-center">
                      <h3 className="vehicle-title m-0">{car.name}</h3>
                      <span className="vehicle-rate-tag">₹{car.rate} / km</span>
                    </div>

                    <span className="vehicle-capacity-badge mt-2">{car.passengers}</span>
                    <p className="vehicle-desc-text mt-2">{car.description}</p>

                    <div className="driver-card-actions mt-3">
                      <button 
                        className="btn btn-outline flex-1 flex align-center justify-center gap-1"
                        onClick={() => setEditVehicleModal({ open: true, vehicle: { ...car } })}
                      >
                        <Edit size={15} /> Edit Details & Price
                      </button>
                      <button 
                        className="btn-danger-icon" 
                        title="Remove Car from Fleet"
                        onClick={() => handleDeleteVehicle(car.id)}
                      >
                        <Trash2 size={16} />
                      </button>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* TAB: DESTINATIONS & KM MANAGEMENT */}
        {activeTab === 'destinations' && (
          <div className="tab-pane">
            <div className="pane-header flex justify-between align-center mb-4">
              <div>
                <h2>Locations & Route Distance (KM) Management</h2>
                <p>Add city places/locations and configure exact distance in KM between any origin and destination pair.</p>
              </div>
              <button className="btn btn-primary btn-lg-action flex align-center gap-2" onClick={() => setAddDestModal(true)}>
                <Plus size={18} /> Set Route KM Distance
              </button>
            </div>

            {/* SECTION 1: PLACES ROSTER CARD */}
            <div className="places-manager-card">
              <div className="flex align-center gap-2 mb-1">
                <MapPin className="text-green" size={22} />
                <h3 className="m-0 text-xl font-bold">1. Available Location Places ({places.length})</h3>
              </div>
              <p className="text-muted text-sm mb-4">
                These location places will appear directly in the customer pickup and drop-off dropdown lists.
              </p>

              {/* Input Form Bar */}
              <form onSubmit={handleAddPlace} className="places-add-bar">
                <input 
                  type="text" 
                  className="form-control" 
                  placeholder="Type new place name (e.g. Airport Terminal 3, Ubud Market...)"
                  value={newPlaceInput}
                  onChange={e => setNewPlaceInput(e.target.value)}
                  required
                />
                <button type="submit" className="places-add-btn">
                  <Plus size={18} /> Add Place
                </button>
              </form>

              {/* Places Badges Grid */}
              <div className="places-tags-grid">
                {places.map((place, idx) => (
                  <div key={idx} className="place-chip-tag">
                    <MapPin size={14} className="pin-icon" />
                    <span>{place}</span>
                    <button 
                      type="button" 
                      className="place-chip-del"
                      title={`Delete ${place}`}
                      onClick={() => handleDeletePlace(place)}
                    >
                      <XCircle size={16} />
                    </button>
                  </div>
                ))}
              </div>
            </div>

            {/* SECTION 2: CONFIGURED DISTANCE MATRIX */}
            <div className="card admin-table-card">
              <div className="p-4 border-b flex justify-between align-center">
                <div>
                  <h3 className="m-0 text-lg font-bold">2. Configured Distance Matrix (KM Between Places)</h3>
                  <p className="text-muted text-xs m-0 mt-1">Exact route distance definitions used to calculate dynamic customer fares.</p>
                </div>
                <span className="pill-badge-sm font-bold">{destinations.length} Active Routes</span>
              </div>
              
              <div className="table-responsive">
                <table className="admin-table">
                  <thead>
                    <tr>
                      <th>Route ID</th>
                      <th>Pick-up Location (From)</th>
                      <th>Drop-off Destination (To)</th>
                      <th>Distance (KM)</th>
                      <th>Est. Travel Time / Total Time</th>
                      <th>Est. Reguler Fare</th>
                      <th>Actions</th>
                    </tr>
                  </thead>
                  <tbody>
                    {destinations.map(dest => (
                      <tr key={dest.id}>
                        <td><strong>{dest.id}</strong></td>
                        <td>
                          <div className="route-place-cell">
                            <span className="dot-indicator green"></span>
                            <span className="place-name-text">{dest.pickup}</span>
                          </div>
                        </td>
                        <td>
                          <div className="route-place-cell">
                            <span className="dot-indicator red"></span>
                            <span className="place-name-text">{dest.dropoff}</span>
                          </div>
                        </td>
                        <td>
                          <span className="pill-badge-sm font-bold">{dest.distanceKm} KM</span>
                        </td>
                        <td>
                          <span className="pill-badge-sm font-bold" style={{ background: '#EFF6FF', color: '#1D4ED8', border: '1px solid #93C5FD' }}>
                            ⏱️ {dest.duration || (Number(dest.distanceKm) === 175 ? '3 hr 15 min' : (Number(dest.distanceKm) === 18 ? '35 min' : `${Math.floor(Number(dest.distanceKm) / 55) > 0 ? Math.floor(Number(dest.distanceKm) / 55) + ' hr ' : ''}${Math.round(((Number(dest.distanceKm) % 55) / 55) * 60) || 25} min`))}
                          </span>
                        </td>
                        <td>
                          <strong className="text-green text-base">₹{(dest.distanceKm * 15).toFixed(2)}</strong>
                          <small className="text-muted block text-xs">(₹15.00 / km)</small>
                        </td>
                        <td>
                          <div className="flex gap-2 align-center">
                            <button 
                              className="btn btn-outline btn-sm flex align-center gap-1"
                              onClick={() => setEditDestModal({ open: true, destination: { ...dest } })}
                            >
                              <Edit size={14} /> Edit KM
                            </button>
                            <button 
                              className="btn-icon btn-icon-danger"
                              title="Delete Route"
                              onClick={() => handleDeleteDest(dest.id)}
                            >
                              <Trash2 size={16} />
                            </button>
                          </div>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>

              {/* HOSTINGER ALIGNED MOBILE CARDS FOR DESTINATIONS & KM MATRIX */}
              <div className="admin-mobile-card-list">
                {destinations.map(dest => (
                  <div key={dest.id} className="hostinger-admin-card">
                    <div className="hostinger-card-top">
                      <div className="hostinger-card-id-group">
                        <span className="hostinger-card-id">{dest.id}</span>
                        <span className="hostinger-card-date">• {dest.distanceKm} KM</span>
                      </div>
                      <span className="pill-badge-sm font-bold" style={{ background: '#EFF6FF', color: '#1D4ED8', border: '1px solid #93C5FD' }}>
                        ⏱️ {dest.duration || 'Dynamic Route'}
                      </span>
                    </div>
                    <div className="hostinger-card-route">
                      <div className="hostinger-route-item">
                        <span style={{ width: '8px', height: '8px', borderRadius: '50%', background: '#10B981', flexShrink: 0 }}></span>
                        <span>From: {dest.pickup}</span>
                      </div>
                      <div className="hostinger-route-item">
                        <span style={{ width: '8px', height: '8px', borderRadius: '50%', background: '#EF4444', flexShrink: 0 }}></span>
                        <span>To: {dest.dropoff}</span>
                      </div>
                    </div>
                    <div className="hostinger-card-footer">
                      <span className="hostinger-vehicle-badge">₹15.00 / km</span>
                      <span className="hostinger-fare-tag">₹{(dest.distanceKm * 15).toFixed(2)}</span>
                    </div>
                    <div className="hostinger-card-actions">
                      <button 
                        className="btn btn-outline btn-sm flex align-center justify-center gap-1"
                        style={{ padding: '6px 12px', borderRadius: '8px', fontSize: '13px', fontWeight: '800' }}
                        onClick={() => setEditDestModal({ open: true, destination: { ...dest } })}
                      >
                        <Edit size={14} /> Edit KM Distance
                      </button>
                      <button 
                        className="btn-icon btn-icon-danger"
                        title="Delete Route"
                        onClick={() => handleDeleteDest(dest.id)}
                        style={{ padding: '6px 10px', borderRadius: '8px' }}
                      >
                        <Trash2 size={16} />
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        )}

        {/* TAB 3: DRIVERS */}
        {activeTab === 'drivers' && (
          <div className="tab-pane">
            <div className="pane-header flex justify-between align-center">
              <div>
                <h2>Fleet Drivers Management</h2>
                <p>Register new drivers, monitor active status, track individual earnings, and view driver trip reports.</p>
              </div>
              <button className="btn btn-primary btn-sm flex align-center gap-1" onClick={() => setAddDriverModal(true)}>
                <UserPlus size={16} /> Register New Driver
              </button>
            </div>

            <div className="drivers-cards-grid">
              {drivers.map(drv => {
                const drvInqs = inquiries.filter(i => i.driver === drv.name && (i.status === 'Confirmed' || i.status === 'Completed'));
                const tripsCount = drvInqs.length;
                const earningsTotal = drvInqs.reduce((sum, item) => sum + Number(item.fare || 0), 0);
                return (
                  <div key={drv.id} className="card driver-card-full">
                    <div className="driver-card-header flex justify-between align-center">
                      <div className="flex align-center gap-2">
                        <div className="driver-avatar-lg">{drv.name.charAt(0)}</div>
                        <div>
                          <h3>{drv.name}</h3>
                          <small className="text-muted">ID: {drv.id}</small>
                        </div>
                      </div>
                      <span className={`status-tag status-${drv.status.toLowerCase().replace(/\s+/g, '-')}`}>
                        {drv.status}
                      </span>
                    </div>

                    <div className="driver-details-list">
                      <div className="detail-row">
                        <span className="text-muted">Phone:</span>
                        <strong>{drv.phone}</strong>
                      </div>
                      <div className="detail-row">
                        <span className="text-muted">Rating:</span>
                        <strong className="text-yellow">★ {drv.rating}</strong>
                      </div>
                    </div>

                    <div className="driver-stats-footer flex justify-between align-center">
                      <div className="stat-col">
                        <span className="stat-label">Completed Trips</span>
                        <span className="stat-value">{tripsCount} {tripsCount === 1 ? 'Ride' : 'Rides'}</span>
                      </div>
                      <div className="stat-col text-right">
                        <span className="stat-label">Total Earnings</span>
                        <span className="stat-value text-green">₹{earningsTotal.toFixed(2)}</span>
                      </div>
                    </div>

                    <div className="driver-card-actions flex gap-2 align-center">
                      <button 
                        className="btn btn-outline btn-sm flex-1 flex align-center justify-center gap-1"
                        onClick={() => setDriverReportModal({ open: true, driver: drv })}
                      >
                        <Eye size={14} /> Performance Report
                      </button>
                      <button 
                        className="btn btn-danger-icon btn-sm flex align-center justify-center"
                        title="Delete Driver"
                        onClick={() => handleDeleteDriver(drv.id)}
                      >
                        <Trash2 size={14} />
                      </button>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        )}

        {/* TAB 4: CUSTOMERS */}
        {activeTab === 'customers' && (
          <div className="tab-pane">
            <div className="pane-header flex justify-between align-center">
              <div>
                <h2>Customer Directory</h2>
                <p>Automatic customer profile creation from ride inquiries with complete trip history and billing logs.</p>
              </div>
              <button className="btn btn-primary btn-sm flex align-center gap-1" onClick={() => setAddCustomerModal(true)}>
                <UserPlus size={16} /> Add Customer
              </button>
            </div>

            <div className="card admin-table-card">
              <div className="table-responsive">
                <table className="admin-table">
                  <thead>
                    <tr>
                      <th>Customer ID</th>
                      <th>Name</th>
                <th>Phone Number</th>
                      <th>Email Address</th>
                      <th>Total Rides</th>
                      <th>Total Revenue Spent</th>
                      <th>Member Since</th>
                      <th>Actions</th>
                    </tr>
                  </thead>
                  <tbody>
                    {customers.length === 0 ? (
                      <tr>
                        <td colSpan={8} style={{ textAlign: 'center', padding: '48px 24px', color: '#64748B' }}>
                          <div style={{ fontSize: '36px', marginBottom: '12px' }}>👤</div>
                          <strong style={{ display: 'block', marginBottom: '6px' }}>No Customers Yet</strong>
                          <small>Customers are auto-created when a ride inquiry is submitted via the mobile app.<br />You can also add one manually using the <strong>Add Customer</strong> button above.</small>
                        </td>
                      </tr>
                    ) : customers.map(cust => (
                      <tr key={cust.id}>
                        <td><strong>{cust.id}</strong></td>
                        <td><strong>{cust.name}</strong></td>
                        <td><Phone size={12} className="inline-icon text-muted" /> {cust.phone}</td>
                        <td><Mail size={12} className="inline-icon text-muted" /> {cust.email}</td>
                        <td><span className="pill-badge-sm">{cust.totalRides} Rides</span></td>
                        <td><strong className="text-green">₹{Number(cust.totalSpent).toFixed(2)}</strong></td>
                        <td><small className="text-muted">{cust.joined}</small></td>
                        <td>
                          <div className="flex gap-2 align-center" style={{ whiteSpace: 'nowrap', display: 'flex', alignItems: 'center', flexWrap: 'nowrap' }}>
                            <button 
                              className="btn btn-sm flex align-center gap-1"
                              style={{ backgroundColor: '#10b981', color: '#ffffff', border: 'none', padding: '8px 14px', borderRadius: '8px', cursor: 'pointer', fontWeight: '800', fontSize: '13px', whiteSpace: 'nowrap', boxShadow: '0 3px 10px rgba(16, 185, 129, 0.25)' }}
                              onClick={() => {
                                setSendNotifModal({
                                  open: true,
                                  customer: cust,
                                  title: `🎉 Special Offer for ${cust.name}!`,
                                  body: `Hello ${cust.name}, enjoy 15% discount on your next ride with EMPERIAL CABS!`,
                                  type: 'reward'
                                });
                              }}
                              title="Send Full-Page Push Notification to Customer"
                            >
                              <Bell size={14} /> Send Notif
                            </button>

                            <button 
                              className="btn btn-sm btn-outline flex align-center gap-1"
                              style={{ whiteSpace: 'nowrap' }}
                              onClick={() => setCustomerDetailModal({ open: true, customer: cust })}
                            >
                              <Eye size={13} /> View Profile & Trips
                            </button>
                            <button 
                              className="btn btn-sm flex align-center gap-1"
                              style={{ backgroundColor: '#ef4444', color: '#ffffff', border: 'none', padding: '6px 10px', borderRadius: '6px', cursor: 'pointer', fontWeight: '600', fontSize: '12px', whiteSpace: 'nowrap' }}
                              onClick={() => handleDeleteCustomer(cust.id || cust.email)}
                              title="Delete Customer Profile"
                            >
                              <Trash2 size={13} /> Delete
                            </button>
                          </div>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>

              {/* HOSTINGER ALIGNED MOBILE CARDS FOR CUSTOMERS */}
              <div className="admin-mobile-card-list">
                {customers.map(cust => (
                  <div key={cust.id} className="hostinger-admin-card">
                    <div className="hostinger-card-top">
                      <div className="hostinger-card-id-group">
                        <span className="hostinger-card-id">{cust.id}</span>
                        <span className="hostinger-card-date">• {cust.joined}</span>
                      </div>
                      <span className="pill-badge-sm" style={{ background: '#ECFDF5', color: '#059669', fontWeight: '800' }}>
                        {cust.totalRides} Rides
                      </span>
                    </div>
                    <div className="hostinger-card-customer">
                      <span className="hostinger-cust-name">{cust.name}</span>
                      <span className="hostinger-cust-phone">📞 {cust.phone}</span>
                    </div>
                    <div style={{ fontSize: '0.82rem', color: '#475569', background: '#F8FAFC', padding: '8px 12px', borderRadius: '8px', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                      <span>✉️ {cust.email}</span>
                      <strong style={{ color: '#059669', fontSize: '0.95rem' }}>₹{Number(cust.totalSpent).toFixed(2)}</strong>
                    </div>
                    <div className="hostinger-card-actions">
                      <button 
                        className="btn btn-sm flex align-center gap-1"
                        style={{ backgroundColor: '#10b981', color: '#ffffff', border: 'none', padding: '6px 12px', borderRadius: '8px', cursor: 'pointer', fontWeight: '800', fontSize: '12px' }}
                        onClick={() => {
                          setSendNotifModal({
                            open: true,
                            customer: cust,
                            title: `🎉 Special Offer for ${cust.name}!`,
                            body: `Hello ${cust.name}, enjoy 15% discount on your next ride with EMPERIAL CABS!`,
                            type: 'reward'
                          });
                        }}
                      >
                        <Bell size={13} /> Send Notif
                      </button>

                      <button 
                        className="btn btn-sm btn-outline flex align-center gap-1"
                        style={{ padding: '6px 10px', fontSize: '12px', borderRadius: '8px' }}
                        onClick={() => setCustomerDetailModal({ open: true, customer: cust })}
                      >
                        <Eye size={13} /> Profile
                      </button>

                      <button 
                        className="btn btn-sm flex align-center gap-1"
                        style={{ backgroundColor: '#ef4444', color: '#ffffff', border: 'none', padding: '6px 10px', borderRadius: '8px', cursor: 'pointer', fontWeight: '600', fontSize: '12px' }}
                        onClick={() => handleDeleteCustomer(cust.id || cust.email)}
                      >
                        <Trash2 size={13} /> Delete
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        )}

        {/* TAB: CONTACT MESSAGES */}
        {activeTab === 'messages' && (
          <div className="tab-pane">
            <div className="pane-header flex justify-between align-center">
              <div>
                <h2>Customer Contact Messages</h2>
                <p>Manage and reply to inquiries, partnership requests, and support messages sent from the Contact page.</p>
              </div>
              <div className="flex align-center gap-2">
                <span className="pill-badge" style={{ background: '#FCE7F3', color: '#DB2777', border: '1px solid #FBCFE8', fontWeight: '800' }}>
                  📬 {contactMessages.filter(m => m.status === 'Unread').length} Unread
                </span>
                <span className="pill-badge" style={{ background: '#ECFDF5', color: '#059669', border: '1px solid #A7F3D0', fontWeight: '800' }}>
                  Total: {contactMessages.length} Messages
                </span>
              </div>
            </div>

            {/* Metric Summary Cards */}
            <div className="reports-summary-grid mb-4">
              <div className="card summary-stat-box">
                <small className="text-muted display-block">Total Messages Received</small>
                <h3 className="text-purple">{contactMessages.length}</h3>
                <small className="text-xs text-muted">All contact form entries</small>
              </div>

              <div className="card summary-stat-box">
                <small className="text-muted display-block">Unread Messages</small>
                <h3 style={{ color: '#EC4899' }}>{contactMessages.filter(m => m.status === 'Unread').length}</h3>
                <small className="text-xs text-muted">Requires admin review</small>
              </div>

              <div className="card summary-stat-box">
                <small className="text-muted display-block">Read / Reviewed</small>
                <h3 className="text-blue">{contactMessages.filter(m => m.status === 'Read').length}</h3>
                <small className="text-xs text-muted">Processed messages</small>
              </div>

              <div className="card summary-stat-box">
                <small className="text-muted display-block">Replied & Closed</small>
                <h3 className="text-green">{contactMessages.filter(m => m.status === 'Replied').length}</h3>
                <small className="text-xs text-muted">Customer responded</small>
              </div>
            </div>

            {/* Filter Controls */}
            <div className="card mb-3 p-3 flex justify-between align-center flex-wrap gap-3" style={{ background: '#F8FAFC', border: '1px solid #E2E8F0' }}>
              <div className="flex align-center gap-2 flex-wrap">
                <span style={{ fontSize: '13px', fontWeight: '700', color: '#64748B' }}>Filter by Category:</span>
                {['All', 'Taxi Booking Inquiry', 'Corporate Account', 'Driver Partnership', 'Other Support'].map(cat => (
                  <button
                    key={cat}
                    className={`btn btn-sm ${messageCategoryFilter === cat ? 'btn-primary' : 'btn-outline'}`}
                    onClick={() => setMessageCategoryFilter(cat)}
                    style={{ borderRadius: '20px', fontSize: '12px', padding: '5px 12px' }}
                  >
                    {cat}
                  </button>
                ))}
              </div>
            </div>

            {/* Messages Table */}
            <div className="card admin-table-card">
              <div className="table-responsive">
                <table className="admin-table">
                  <thead>
                    <tr>
                      <th>Message ID</th>
                      <th>Date / Time</th>
                      <th>Sender Name</th>
                      <th>Email Address</th>
                      <th>Category</th>
                      <th>Message Preview</th>
                      <th>Status</th>
                      <th>Actions</th>
                    </tr>
                  </thead>
                  <tbody>
                    {(() => {
                      const filtered = contactMessages.filter(m => {
                        const matchesCat = messageCategoryFilter === 'All' || m.category === messageCategoryFilter;
                        const query = messageSearchQuery.toLowerCase();
                        const matchesSearch = !query || 
                          m.name?.toLowerCase().includes(query) || 
                          m.email?.toLowerCase().includes(query) || 
                          m.message?.toLowerCase().includes(query) ||
                          m.id?.toLowerCase().includes(query);
                        return matchesCat && matchesSearch;
                      });

                      if (filtered.length === 0) {
                        return (
                          <tr>
                            <td colSpan="8" style={{ textAlign: 'center', padding: '3.5rem 1rem', color: '#64748B' }}>
                              <div style={{ fontSize: '36px', marginBottom: '10px' }}>📬</div>
                              <strong style={{ display: 'block', fontSize: '16px', color: '#0F172A', marginBottom: '4px' }}>No Contact Messages Found</strong>
                              <span style={{ fontSize: '13px' }}>There are currently no customer contact form submissions matching this view.</span>
                            </td>
                          </tr>
                        );
                      }

                      return filtered.map(msg => (
                        <tr key={msg.id} style={{ background: msg.status === 'Unread' ? '#FFF5F5' : 'transparent' }}>
                          <td><strong>{msg.id}</strong></td>
                          <td><small className="text-muted">{msg.date}</small></td>
                          <td><strong>{msg.name}</strong></td>
                          <td>
                            <a href={`mailto:${msg.email}`} style={{ color: '#2563EB', textDecoration: 'none', fontWeight: '600' }}>
                              {msg.email}
                            </a>
                          </td>
                          <td>
                            <span className="pill-badge-sm" style={{ background: '#F1F5F9', color: '#475569', border: '1px solid #E2E8F0' }}>
                              {msg.category || 'Support'}
                            </span>
                          </td>
                          <td style={{ maxWidth: '280px', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                            <span style={{ color: '#334155', fontSize: '13px' }}>{msg.message}</span>
                          </td>
                          <td>
                            <span className={`status-pill ${
                              msg.status === 'Unread' ? 'status-pending' : 
                              msg.status === 'Replied' ? 'status-active' : 'status-assigned'
                            }`}>
                              {msg.status}
                            </span>
                          </td>
                          <td>
                            <div className="action-buttons-flex">
                              <button 
                                className="btn btn-sm btn-outline flex align-center gap-1"
                                onClick={() => {
                                  handleMarkMessageRead(msg.id);
                                  setViewMessageModal({ open: true, message: msg });
                                }}
                                title="View Message Details"
                              >
                                <Eye size={14} /> View
                              </button>

                              {msg.status !== 'Replied' ? (
                                <button 
                                  className="btn btn-sm btn-outline text-green flex align-center gap-1"
                                  onClick={() => handleToggleMessageStatus(msg.id, 'Replied')}
                                  title="Mark as Replied"
                                >
                                  <CheckCircle2 size={14} /> Reply
                                </button>
                              ) : (
                                <button 
                                  className="btn btn-sm btn-outline flex align-center gap-1"
                                  onClick={() => handleToggleMessageStatus(msg.id, 'Read')}
                                  title="Mark as Read"
                                >
                                  Mark Read
                                </button>
                              )}

                              <button 
                                className="btn btn-danger-icon btn-sm"
                                onClick={() => handleDeleteMessage(msg.id)}
                                title="Delete Message"
                              >
                                <Trash2 size={14} />
                              </button>
                            </div>
                          </td>
                        </tr>
                      ));
                    })()}
                  </tbody>
                </table>
              </div>

              {/* HOSTINGER ALIGNED MOBILE CARDS FOR MESSAGES */}
              <div className="admin-mobile-card-list">
                {(() => {
                  const filtered = contactMessages.filter(m => {
                    const matchesCat = messageCategoryFilter === 'All' || m.category === messageCategoryFilter;
                    const query = messageSearchQuery.toLowerCase();
                    const matchesSearch = !query || 
                      m.name?.toLowerCase().includes(query) || 
                      m.email?.toLowerCase().includes(query) || 
                      m.message?.toLowerCase().includes(query) ||
                      m.id?.toLowerCase().includes(query);
                    return matchesCat && matchesSearch;
                  });

                  if (filtered.length === 0) {
                    return (
                      <div className="card text-center p-4 text-muted">
                        No contact messages found.
                      </div>
                    );
                  }

                  return filtered.map(msg => (
                    <div key={msg.id} className="hostinger-admin-card" style={{ background: msg.status === 'Unread' ? '#FFF5F5' : '#FFFFFF' }}>
                      <div className="hostinger-card-top">
                        <div className="hostinger-card-id-group">
                          <span className="hostinger-card-id">{msg.id}</span>
                          <span className="hostinger-card-date">• {msg.date}</span>
                        </div>
                        <span className={`status-pill ${
                          msg.status === 'Unread' ? 'status-pending' : 
                          msg.status === 'Replied' ? 'status-active' : 'status-assigned'
                        }`}>
                          {msg.status}
                        </span>
                      </div>
                      <div className="hostinger-card-customer">
                        <span className="hostinger-cust-name">{msg.name}</span>
                        <span className="hostinger-cust-phone">{msg.email}</span>
                      </div>
                      <div style={{ background: '#F8FAFC', borderRadius: '10px', padding: '10px 12px', fontSize: '13px', color: '#334155' }}>
                        <strong style={{ display: 'block', color: '#475569', fontSize: '11px', textTransform: 'uppercase', marginBottom: '4px' }}>
                          Category: {msg.category || 'Support'}
                        </strong>
                        {msg.message}
                      </div>
                      <div className="hostinger-card-actions">
                        <button 
                          className="btn btn-sm btn-outline flex align-center gap-1"
                          style={{ borderRadius: '8px', padding: '6px 12px', fontSize: '12px', fontWeight: '700' }}
                          onClick={() => {
                            handleMarkMessageRead(msg.id);
                            setViewMessageModal({ open: true, message: msg });
                          }}
                        >
                          <Eye size={13} /> View Message
                        </button>
                        {msg.status !== 'Replied' ? (
                          <button 
                            className="btn btn-sm btn-outline text-green flex align-center gap-1"
                            style={{ borderRadius: '8px', padding: '6px 12px', fontSize: '12px', fontWeight: '700' }}
                            onClick={() => handleToggleMessageStatus(msg.id, 'Replied')}
                          >
                            <CheckCircle2 size={13} /> Mark Replied
                          </button>
                        ) : (
                          <button 
                            className="btn btn-sm btn-outline flex align-center gap-1"
                            style={{ borderRadius: '8px', padding: '6px 12px', fontSize: '12px', fontWeight: '700' }}
                            onClick={() => handleToggleMessageStatus(msg.id, 'Read')}
                          >
                            Mark Read
                          </button>
                        )}
                        <button 
                          className="btn btn-danger-icon btn-sm"
                          style={{ borderRadius: '8px', padding: '6px 10px' }}
                          onClick={() => handleDeleteMessage(msg.id)}
                        >
                          <Trash2 size={13} />
                        </button>
                      </div>
                    </div>
                  ));
                })()}
              </div>
            </div>
          </div>
        )}

        {/* TAB 5: REPORTS & TRIPS */}
        {activeTab === 'reports' && (
          <div className="tab-pane">
            <div className="pane-header flex justify-between align-center">
              <div>
                <h2>Financial & Trip Audit Reports</h2>
                <p>Comprehensive earnings log, driver payouts ({driverShare}%), company commission ({companyShare}%), and completed ride manifests.</p>
              </div>
              <div className="flex align-center gap-2">
                <button 
                  className="btn btn-primary btn-sm flex align-center gap-1"
                  style={{ background: 'linear-gradient(135deg, #6366F1 0%, #4F46E5 100%)', color: '#FFFFFF', border: 'none', padding: '8px 16px', borderRadius: '12px', fontWeight: '800', cursor: 'pointer', boxShadow: '0 4px 14px rgba(99, 102, 241, 0.3)' }}
                  onClick={() => setCommissionModal(true)}
                >
                  <Settings size={15} /> ⚙️ Set Profit % (Company: {companyShare}%, Driver: {driverShare}%)
                </button>
                <div className="pill-badge flex align-center gap-1">
                  <DollarSign size={15} /> Total Revenue: <strong>₹{totalRevenue.toFixed(2)}</strong>
                </div>
              </div>
            </div>

            <div className="reports-summary-grid">
              <div className="card summary-stat-box">
                <small className="text-muted display-block">Gross Fare Revenue</small>
                <h3 className="text-green">₹{totalRevenue.toFixed(2)}</h3>
                <small className="text-xs text-muted">All confirmed bookings</small>
              </div>

              <div className="card summary-stat-box">
                <small className="text-muted display-block">Company Platform Fee ({companyShare}%)</small>
                <h3 className="text-purple">₹{(totalRevenue * (companyShare / 100)).toFixed(2)}</h3>
                <small className="text-xs text-muted">Net platform profit</small>
              </div>

              <div className="card summary-stat-box">
                <small className="text-muted display-block">Driver Payouts ({driverShare}%)</small>
                <h3>₹{(totalRevenue * (driverShare / 100)).toFixed(2)}</h3>
                <small className="text-xs text-muted">Distributed to drivers</small>
              </div>

              <div className="card summary-stat-box">
                <small className="text-muted display-block">Completed Trips Count</small>
                <h3 className="text-yellow">{confirmedInquiries.length}</h3>
                <small className="text-xs text-muted">Success rate 100%</small>
              </div>
            </div>

            <div className="card admin-table-card mt-3">
              <div className="card-header-flex">
                <h3>Confirmed Trip Manifest</h3>
                <button 
                  className="btn btn-outline btn-sm flex align-center gap-1"
                  onClick={() => setCommissionModal(true)}
                  style={{ fontSize: '12px', fontWeight: '700' }}
                >
                  <Settings size={13} /> Adjust Commission Split ({companyShare}% / {driverShare}%)
                </button>
              </div>
              <div className="table-responsive">
                <table className="admin-table">
                  <thead>
                    <tr>
                      <th>Booking ID</th>
                      <th>Date / Time</th>
                      <th>Customer</th>
                      <th>Assigned Driver</th>
                      <th>Vehicle Class</th>
                      <th>Gross Fare</th>
                      <th>Driver Payout ({driverShare}%)</th>
                      <th>Company Net ({companyShare}%)</th>
                      <th>Actions</th>
                    </tr>
                  </thead>
                  <tbody>
                    {confirmedInquiries.map(item => (
                      <tr key={item.id}>
                        <td><strong>{item.id}</strong></td>
                        <td><small className="text-muted">{item.date}</small></td>
                        <td><strong>{item.customerName}</strong></td>
                        <td><span className="text-green font-bold">{item.driver}</span></td>
                        <td><span className="pill-badge-sm">{item.vehicle}</span></td>
                        <td><strong>₹{Number(item.fare).toFixed(2)}</strong></td>
                        <td>₹{(Number(item.fare) * (driverShare / 100)).toFixed(2)}</td>
                        <td><strong className="text-purple">₹{(Number(item.fare) * (companyShare / 100)).toFixed(2)}</strong></td>
                        <td>
                          <button 
                            className="btn btn-sm btn-outline flex align-center gap-1" 
                            style={{ padding: '4px 8px', fontSize: '12px' }}
                            onClick={() => setReceiptModal({ open: true, inquiry: item })}
                          >
                            <Eye size={13} /> View Receipt
                          </button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          </div>
        )}

        {/* TAB 6: WEBSITE SETTINGS (CMS) */}
        {activeTab === 'settings' && (
          <div className="tab-pane">
            <div className="pane-header flex justify-between align-center">
              <div>
                <h2>Website Content & CMS Settings</h2>
                <p>Dynamically modify website text copy, company contact details, and base vehicle fare rates in real-time.</p>
              </div>
              <button className="btn btn-primary btn-sm flex align-center gap-1" onClick={handleSaveSettings}>
                <Save size={16} /> Save Changes
              </button>
            </div>

            <form onSubmit={handleSaveSettings} className="card settings-form-card">
              <h3>Live Website Content Configuration</h3>

              <div className="form-grid-2">
                <div className="input-group span-full">
                  <label>Home Hero Heading Banner Copy</label>
                  <input 
                    type="text" 
                    value={settings.heroHeading} 
                    onChange={(e) => setSettings({ ...settings, heroHeading: e.target.value })}
                  />
                </div>

                <div className="input-group">
                  <label>Official Contact Phone</label>
                  <input 
                    type="text" 
                    value={settings.contactPhone} 
                    onChange={(e) => setSettings({ ...settings, contactPhone: e.target.value })}
                  />
                </div>

                <div className="input-group">
                  <label>Official Contact Email</label>
                  <input 
                    type="text" 
                    value={settings.contactEmail} 
                    onChange={(e) => setSettings({ ...settings, contactEmail: e.target.value })}
                  />
                </div>

                <div className="input-group span-full">
                  <label>Company Office Address</label>
                  <input 
                    type="text" 
                    value={settings.officeAddress} 
                    onChange={(e) => setSettings({ ...settings, officeAddress: e.target.value })}
                  />
                </div>
              </div>



              <div className="form-actions mt-4">
                <button type="submit" className="btn btn-primary">
                  <Save size={16} /> Save All Website Settings
                </button>
              </div>

              <div className="purge-section mt-5 pt-4" style={{ borderTop: '1px solid rgba(255,255,255,0.1)' }}>
                <h3 style={{ color: '#ef4444' }}>System & Database Maintenance</h3>
                <p className="text-muted text-sm mb-3">Purge demo records or completely reset all inquiries, messages, and customer data stored in Hostinger Remote MySQL Database & local storage.</p>
                <div className="flex gap-3 flex-wrap align-center">
                  <button type="button" className="btn btn-outline" onClick={handlePurgeDemoDatabaseData}>
                    <RefreshCw size={16} /> Purge Demo & Test Records
                  </button>
                  <button type="button" className="btn btn-danger" style={{ backgroundColor: '#ef4444', color: '#fff', border: 'none' }} onClick={handlePurgeAllDatabaseData}>
                    <Trash2 size={16} /> Reset System Data
                  </button>
                </div>
                <div style={{ marginTop: '12px', background: '#F8FAFC', border: '1px solid #E2E8F0', padding: '10px 14px', borderRadius: '10px', fontSize: '12px', color: '#475569', fontWeight: '600', display: 'flex', alignItems: 'center', gap: '8px' }}>
                  <span>🛡️ <strong>Protected Master Data:</strong> Vehicles list, Driver roster, Locations, and KM Distance matrix are safe and will NOT be deleted during reset.</span>
                </div>
              </div>
            </form>
          </div>
        )}
      </main>

      {/* MODAL 1: CONFIRM INQUIRY & ASSIGN DRIVER */}
      {assignModal.open && assignModal.inquiry && (
        <div className="admin-modal-overlay" onClick={() => setAssignModal({ open: false, inquiry: null })}>
          <div className="admin-modal-box card" onClick={e => e.stopPropagation()}>
            <h3>Confirm Booking & Assign Driver</h3>
            <p>Select an available driver for <strong>{assignModal.inquiry.customerName}</strong>'s trip.</p>

            <div className="modal-info-summary">
              <div><strong>Route:</strong> {assignModal.inquiry.pickup} → {assignModal.inquiry.dropoff}</div>
              <div><strong>Vehicle:</strong> {assignModal.inquiry.vehicle}</div>
              <div><strong>Fare:</strong> <span className="text-green font-bold">₹{Number(assignModal.inquiry.fare).toFixed(2)}</span></div>
              {assignModal.inquiry.walletDiscountUsed > 0 && (
                <div style={{ marginTop: '6px', background: '#F0FDF4', border: '1px solid #BBF7D0', padding: '6px 12px', borderRadius: '8px', color: '#047857', fontSize: '13px', fontWeight: '700' }}>
                  🎁 Customer used Wallet Reward Discount: -₹{Number(assignModal.inquiry.walletDiscountUsed).toFixed(2)} (Base Fare: ₹{Number(assignModal.inquiry.originalFare || (assignModal.inquiry.fare + assignModal.inquiry.walletDiscountUsed)).toFixed(2)})
                </div>
              )}
            </div>

            <div className="input-group mt-3">
              <label>Select Driver from Fleet Roster</label>
              <select value={selectedDriverId} onChange={e => {
                setSelectedDriverId(e.target.value);
                const d = drivers.find(drv => drv.id === e.target.value);
                if (d && d.plate && !selectedAssignPlate) {
                  setSelectedAssignPlate(d.plate);
                }
              }}>
                <option value="">-- Choose Driver --</option>
                {drivers.map(d => (
                  <option key={d.id} value={d.id}>
                    {d.name} ({d.plate || d.vehicle || 'Driver'}) - [{d.status}]
                  </option>
                ))}
              </select>
            </div>

            <div className="input-group mt-3">
              <label>Assign Fleet Vehicle (Managed by Admin)</label>
              <select 
                value={selectedAssignVehicle} 
                onChange={e => {
                  const vName = e.target.value;
                  setSelectedAssignVehicle(vName);
                  const matchedVeh = vehicles.find(v => v.name === vName);
                  if (matchedVeh && matchedVeh.plate) {
                    setSelectedAssignPlate(matchedVeh.plate);
                  }
                }}
              >
                <option value="">-- Choose Fleet Car --</option>
                {vehicles.map(v => (
                  <option key={v.id || v.name} value={v.name}>
                    🚗 {v.name} {v.plate ? `[${v.plate}]` : ''} - ₹{v.rate || v.ratePerKm || 5}/km
                  </option>
                ))}
              </select>
            </div>

            <div className="input-group mt-3">
              <label>Vehicle Number Plate (Assigned to Trip)</label>
              <input 
                type="text" 
                placeholder="e.g. GJ-04-AB-1234"
                value={selectedAssignPlate}
                onChange={e => setSelectedAssignPlate(e.target.value.toUpperCase())}
                style={{ fontWeight: '800', fontFamily: 'Space Grotesk', textTransform: 'uppercase', letterSpacing: '1px' }}
              />
            </div>

            <div className="modal-actions-flex mt-4">
              <button className="btn btn-outline" onClick={() => setAssignModal({ open: false, inquiry: null })}>Cancel</button>
              <button 
                className="btn btn-primary" 
                disabled={!!actionLoadingId} 
                onClick={handleConfirmInquiry}
                style={{ opacity: actionLoadingId ? 0.7 : 1, cursor: actionLoadingId ? 'not-allowed' : 'pointer' }}
              >
                {actionLoadingId ? 'Confirming...' : 'Confirm & Dispatch Money to Report'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* MODAL: ISSUE WALLET REWARD TO CUSTOMER */}
      {rewardModal.open && rewardModal.inquiry && (
        <div className="admin-modal-overlay" onClick={() => setRewardModal({ open: false, inquiry: null, amount: 100 })}>
          <div className="admin-modal-box card" onClick={e => e.stopPropagation()}>
            <h3 style={{ color: '#059669', display: 'flex', alignItems: 'center', gap: '8px' }}>
              🎁 Issue Wallet Reward to Customer
            </h3>
            <p>Grant reward credit to customer <strong>{rewardModal.inquiry.customerName}</strong> ({rewardModal.inquiry.customerPhone}) for trip completion.</p>

            <div className="modal-info-summary" style={{ background: '#F0FDF4', border: '1.5px solid #BBF7D0', padding: '14px', borderRadius: '14px', marginBottom: '16px' }}>
              <div><strong>Trip ID:</strong> {rewardModal.inquiry.id}</div>
              <div><strong>Customer Phone:</strong> {rewardModal.inquiry.customerPhone}</div>
              <div><strong>Route:</strong> {rewardModal.inquiry.pickup} → {rewardModal.inquiry.dropoff}</div>
              <div><strong>Net Trip Fare Paid:</strong> ₹{Number(rewardModal.inquiry.fare).toFixed(2)}</div>
            </div>

            <div className="input-group">
              <label style={{ fontSize: '13px', fontWeight: '800', color: '#0F172A' }}>Enter Reward Amount (₹)</label>
              <input 
                type="number" 
                placeholder="e.g. 100"
                value={rewardModal.amount} 
                onChange={e => setRewardModal({ ...rewardModal, amount: e.target.value })}
                required 
                style={{ fontSize: '20px', fontWeight: '800', color: '#059669', padding: '10px 14px', borderRadius: '12px', border: '2px solid #10B981' }}
              />
              <small className="text-muted" style={{ display: 'block', marginTop: '6px' }}>
                This amount will be added directly to the customer's Taxi Wallet and can be redeemed on their next booking!
              </small>
            </div>

            <div className="modal-actions-flex mt-4">
              <button type="button" className="btn btn-outline" onClick={() => setRewardModal({ open: false, inquiry: null, amount: 100 })}>Cancel</button>
              <button 
                type="button" 
                className="btn btn-primary" 
                disabled={!!actionLoadingId}
                style={{ background: 'linear-gradient(135deg, #34D399 0%, #10B981 100%)', border: 'none', fontFamily: 'League Spartan', fontSize: '15px', fontWeight: '800', opacity: actionLoadingId ? 0.7 : 1, cursor: actionLoadingId ? 'not-allowed' : 'pointer' }} 
                onClick={handleIssueRewardSubmit}
              >
                {actionLoadingId ? 'Crediting Reward...' : `🎁 Credit ₹${rewardModal.amount || 0} Reward`}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* MODAL 2: ADD NEW DRIVER */}
      {addDriverModal && (
        <div className="admin-modal-overlay" onClick={() => setAddDriverModal(false)}>
          <div className="admin-modal-box card" onClick={e => e.stopPropagation()}>
            <h3>Register New Driver</h3>
            <form onSubmit={handleAddDriverSubmit}>
              <div className="input-group">
                <label>Full Driver Name</label>
                <input 
                  type="text" 
                  placeholder="e.g. John Doe"
                  value={newDriverForm.name} 
                  onChange={e => setNewDriverForm({ ...newDriverForm, name: e.target.value })}
                  required 
                />
              </div>

              <div className="input-group">
                <label>Phone Number</label>
                <input 
                  type="text" 
                  placeholder="+1 (555) 000-0000"
                  value={newDriverForm.phone} 
                  onChange={e => setNewDriverForm({ ...newDriverForm, phone: e.target.value })}
                />
              </div>



              <div className="modal-actions-flex mt-4">
                <button type="button" className="btn btn-outline" onClick={() => setAddDriverModal(false)}>Cancel</button>
                <button type="submit" className="btn btn-primary">Add Driver to Fleet</button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* MODAL 3: ADD CUSTOMER */}
      {addCustomerModal && (
        <div className="admin-modal-overlay" onClick={() => setAddCustomerModal(false)}>
          <div className="admin-modal-box card" onClick={e => e.stopPropagation()}>
            <h3>Register New Customer</h3>
            <form onSubmit={handleAddCustomerSubmit}>
              <div className="input-group">
                <label>Customer Name</label>
                <input 
                  type="text" 
                  placeholder="Full name"
                  value={newCustomerForm.name} 
                  onChange={e => setNewCustomerForm({ ...newCustomerForm, name: e.target.value })}
                  required 
                />
              </div>

              <div className="input-group">
                <label>Phone Number</label>
                <input 
                  type="text" 
                  placeholder="+1 (555) 000-0000"
                  value={newCustomerForm.phone} 
                  onChange={e => setNewCustomerForm({ ...newCustomerForm, phone: e.target.value })}
                />
              </div>

              <div className="input-group">
                <label>Email Address</label>
                <input 
                  type="email" 
                  placeholder="email@domain.com"
                  value={newCustomerForm.email} 
                  onChange={e => setNewCustomerForm({ ...newCustomerForm, email: e.target.value })}
                />
              </div>

              <div className="modal-actions-flex mt-4">
                <button type="button" className="btn btn-outline" onClick={() => setAddCustomerModal(false)}>Cancel</button>
                <button type="submit" className="btn btn-primary">Save Customer</button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* MODAL 4: ADD INQUIRY */}
      {addInquiryModal && (
        <div className="admin-modal-overlay" onClick={() => setAddInquiryModal(false)}>
          <div className="admin-modal-box card" onClick={e => e.stopPropagation()}>
            <h3>Create Manual Ride Inquiry</h3>
            <form onSubmit={handleAddInquirySubmit}>
              <div className="input-group">
                <label>Select or Enter Customer Name</label>
                <input 
                  type="text" 
                  list="registered-customers-list"
                  placeholder="Type name or select existing customer..."
                  value={newInquiryForm.customerName} 
                  onChange={e => {
                    const val = e.target.value;
                    const matched = customers.find(c => c.name.toLowerCase() === val.toLowerCase() || `${c.name} (${c.phone})` === val);
                    if (matched) {
                      setNewInquiryForm({
                        ...newInquiryForm,
                        customerName: matched.name,
                        customerPhone: matched.phone
                      });
                    } else {
                      setNewInquiryForm({ ...newInquiryForm, customerName: val });
                    }
                  }}
                  required 
                />
                <datalist id="registered-customers-list">
                  {customers.map(c => (
                    <option key={c.id} value={`${c.name} (${c.phone})`}>
                      {c.email ? `${c.email}` : 'Registered Rider'}
                    </option>
                  ))}
                </datalist>
              </div>

              <div className="input-group">
                <label>Customer Phone Number</label>
                <input 
                  type="text" 
                  placeholder="Phone number (+91 ...)"
                  value={newInquiryForm.customerPhone} 
                  onChange={e => setNewInquiryForm({ ...newInquiryForm, customerPhone: e.target.value })}
                />
              </div>

              <div className="input-group">
                <label>Pick-up Location</label>
                <input 
                  type="text" 
                  placeholder="Pick-up address"
                  value={newInquiryForm.pickup} 
                  onChange={e => setNewInquiryForm({ ...newInquiryForm, pickup: e.target.value })}
                  required 
                />
              </div>

              <div className="input-group">
                <label>Drop-off Destination</label>
                <input 
                  type="text" 
                  placeholder="Drop-off address"
                  value={newInquiryForm.dropoff} 
                  onChange={e => setNewInquiryForm({ ...newInquiryForm, dropoff: e.target.value })}
                  required 
                />
              </div>

              <div className="form-grid-2">
                <div className="input-group">
                  <label>Vehicle Class</label>
                  <select value={newInquiryForm.vehicle} onChange={e => setNewInquiryForm({ ...newInquiryForm, vehicle: e.target.value })}>
                    {Array.from(new Set([
                      ...vehicles.map(v => v.name),
                      ...inquiries.map(i => i.vehicle).filter(Boolean)
                    ])).map(vName => (
                      <option key={vName} value={vName}>{vName}</option>
                    ))}
                  </select>
                </div>

                <div className="input-group">
                  <label>Fare (₹)</label>
                  <input 
                    type="number" 
                    value={newInquiryForm.fare} 
                    onChange={e => setNewInquiryForm({ ...newInquiryForm, fare: e.target.value })}
                  />
                </div>
              </div>

              <div className="modal-actions-flex mt-4">
                <button type="button" className="btn btn-outline" onClick={() => setAddInquiryModal(false)}>Cancel</button>
                <button 
                  type="submit" 
                  className="btn btn-primary"
                  disabled={actionLoadingId === 'add_inquiry'}
                  style={{ opacity: actionLoadingId === 'add_inquiry' ? 0.7 : 1, cursor: actionLoadingId === 'add_inquiry' ? 'not-allowed' : 'pointer' }}
                >
                  {actionLoadingId === 'add_inquiry' ? 'Creating...' : 'Create Booking Inquiry'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* MODAL 5: CUSTOMER DETAIL VIEW */}
      {customerDetailModal.open && customerDetailModal.customer && (
        <div className="admin-modal-overlay" onClick={() => setCustomerDetailModal({ open: false, customer: null })}>
          <div className="admin-modal-box card large-modal" onClick={e => e.stopPropagation()}>
            <div className="modal-header-flex">
              <h3>Customer Profile & Trip History</h3>
              <button className="btn-modal-close" onClick={() => setCustomerDetailModal({ open: false, customer: null })}>
                <XCircle size={22} />
              </button>
            </div>

            <div className="customer-profile-card mt-3 flex justify-between align-center">
              <div>
                <h2 className="m-0">{customerDetailModal.customer.name}</h2>
                <div className="customer-meta-row mt-2">
                  <span className="customer-meta-item"><Phone size={13} /> {customerDetailModal.customer.phone}</span>
                  <span className="customer-meta-item"><Mail size={13} /> {customerDetailModal.customer.email}</span>
                  <span className="customer-meta-item">Member Since: {customerDetailModal.customer.joined}</span>
                </div>
              </div>
              <div className="text-right">
                <span className="stat-label">Total Spent Revenue</span>
                <h2 className="text-green m-0">₹{Number(customerDetailModal.customer.totalSpent).toFixed(2)}</h2>
              </div>
            </div>

            <h4 className="mt-4">Trip History Logs</h4>
            <div className="table-responsive mt-2">
              <table className="admin-table">
                <thead>
                  <tr>
                    <th>Inquiry ID</th>
                    <th>Date</th>
                    <th>Route</th>
                    <th>Vehicle</th>
                    <th>Fare</th>
                    <th>Status</th>
                  </tr>
                </thead>
                <tbody>
                  {inquiries.filter(i => i.customerName.toLowerCase() === customerDetailModal.customer.name.toLowerCase()).map(tr => (
                    <tr key={tr.id}>
                      <td><strong>{tr.id}</strong></td>
                      <td><small>{tr.date}</small></td>
                      <td>{tr.pickup} → {tr.dropoff}</td>
                      <td><span className="pill-badge-sm">{tr.vehicle}</span></td>
                      <td><strong className="text-green">₹{Number(tr.fare).toFixed(2)}</strong></td>
                      <td><span className={`status-tag status-${tr.status.toLowerCase()}`}>{tr.status}</span></td>
                    </tr>
                  ))}
                  {inquiries.filter(i => i.customerName.toLowerCase() === customerDetailModal.customer.name.toLowerCase()).length === 0 && (
                    <tr>
                      <td colSpan={6} className="text-center text-muted">No past trips recorded for this customer yet.</td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}

      {/* MODAL 6: DRIVER PERFORMANCE REPORT */}
      {driverReportModal.open && driverReportModal.driver && (() => {
        const drvName = driverReportModal.driver.name;
        const drvInqs = inquiries.filter(i => i.driver === drvName && (i.status === 'Confirmed' || i.status === 'Completed'));
        const calcEarnings = drvInqs.reduce((sum, i) => sum + Number(i.fare || 0), 0);
        return (
          <div className="admin-modal-overlay" onClick={() => setDriverReportModal({ open: false, driver: null })}>
            <div className="admin-modal-box card large-modal" onClick={e => e.stopPropagation()}>
              <div className="modal-header-flex">
                <h3>Driver Audit & Performance Report</h3>
                <button className="btn-modal-close" onClick={() => setDriverReportModal({ open: false, driver: null })}>
                  <XCircle size={22} />
                </button>
              </div>

              <div className="driver-profile-header mt-3 flex justify-between align-center">
                <div>
                  <h2 className="m-0">{driverReportModal.driver.name}</h2>
                  <p className="text-muted mt-1 m-0">{driverReportModal.driver.vehicle}</p>
                </div>
                <div className="text-right">
                  <span className="stat-label">Driver Total Earnings</span>
                  <h2 className="text-green m-0">₹{calcEarnings.toFixed(2)}</h2>
                </div>
              </div>

            <h4 className="mt-4">Assigned Trips & Completed Duties</h4>
            <div className="table-responsive mt-2">
              <table className="admin-table">
                <thead>
                  <tr>
                    <th>Trip ID</th>
                    <th>Customer</th>
                    <th>Pickup → Dropoff</th>
                    <th>Trip Fare</th>
                    <th>Driver Share (80%)</th>
                    <th>Date</th>
                  </tr>
                </thead>
                <tbody>
                  {inquiries.filter(i => i.driver === driverReportModal.driver.name).map(tr => (
                    <tr key={tr.id}>
                      <td><strong>{tr.id}</strong></td>
                      <td>{tr.customerName}</td>
                      <td>{tr.pickup} → {tr.dropoff}</td>
                      <td>₹{Number(tr.fare).toFixed(2)}</td>
                      <td><strong className="text-green">₹{(Number(tr.fare) * 0.80).toFixed(2)}</strong></td>
                      <td><small className="text-muted">{tr.date}</small></td>
                    </tr>
                  ))}
                  {inquiries.filter(i => i.driver === driverReportModal.driver.name).length === 0 && (
                    <tr>
                      <td colSpan={6} className="text-center text-muted">No completed trips assigned to this driver yet.</td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          </div>
        </div>
        );
      })()}

      {/* MODAL 7: ADD NEW VEHICLE / CAR */}
      {addVehicleModal && (
        <div className="admin-modal-overlay" onClick={() => setAddVehicleModal(false)}>
          <div className="admin-modal-box card" onClick={e => e.stopPropagation()}>
            <div className="modal-header-flex">
              <h3>Register New Fleet Vehicle</h3>
              <button className="btn-modal-close" onClick={() => setAddVehicleModal(false)}><XCircle size={22} /></button>
            </div>
            <form onSubmit={handleAddVehicleSubmit}>
              <div className="input-group">
                <label>Car Model Name</label>
                <input 
                  type="text" 
                  placeholder="e.g. Empire Electric (Tesla Model 3)"
                  value={newVehicleForm.name} 
                  onChange={e => setNewVehicleForm({ ...newVehicleForm, name: e.target.value })}
                  required 
                />
              </div>

              <div className="form-grid-2 mt-2">
                <div className="input-group">
                  <label>Max Capacity (Persons)</label>
                  <input 
                    type="text" 
                    placeholder="e.g. 4 Persons"
                    value={newVehicleForm.passengers} 
                    onChange={e => setNewVehicleForm({ ...newVehicleForm, passengers: e.target.value })}
                    required
                  />
                </div>

                <div className="input-group">
                  <label>Base Rate (₹ / km)</label>
                  <input 
                    type="text" 
                    placeholder="e.g. 15.00"
                    value={newVehicleForm.rate} 
                    onChange={e => setNewVehicleForm({ ...newVehicleForm, rate: e.target.value })}
                    required
                  />
                </div>
              </div>

              <div className="input-group mt-2">
                <label>Vehicle Photo</label>
                <div style={{ display: 'flex', gap: '10px', alignItems: 'center', margin: '6px 0' }}>
                  <label style={{ background: '#212B46', color: '#FFAA01', padding: '8px 14px', borderRadius: '8px', fontSize: '13px', fontWeight: '700', cursor: 'pointer', display: 'inline-flex', alignItems: 'center', gap: '6px' }}>
                    🖼️ Select Image from Gallery
                    <input 
                      type="file" 
                      accept="image/*" 
                      style={{ display: 'none' }}
                      onChange={e => handleImageFileUpload(e, false)}
                    />
                  </label>
                  <span style={{ fontSize: '12px', color: '#64748B' }}>or enter image Web URL</span>
                </div>
                <input 
                  type="text" 
                  placeholder="https://images.unsplash.com/... or upload image"
                  value={newVehicleForm.image} 
                  onChange={e => setNewVehicleForm({ ...newVehicleForm, image: e.target.value })}
                />
                {newVehicleForm.image && (
                  <div style={{ marginTop: '8px', display: 'flex', alignItems: 'center', gap: '10px' }}>
                    <img src={newVehicleForm.image} alt="Preview" style={{ width: '60px', height: '40px', objectFit: 'cover', borderRadius: '6px', border: '1px solid #CBD5E1' }} />
                    <span style={{ fontSize: '12px', color: '#166534', fontWeight: 'bold' }}>✓ Photo Ready</span>
                  </div>
                )}
              </div>

              <div className="input-group mt-2">
                <label>Fleet Description</label>
                <input 
                  type="text" 
                  placeholder="Short description of comfort and vehicle class..."
                  value={newVehicleForm.description} 
                  onChange={e => setNewVehicleForm({ ...newVehicleForm, description: e.target.value })}
                />
              </div>

              <div className="modal-actions-flex mt-4">
                <button type="button" className="btn btn-outline" onClick={() => setAddVehicleModal(false)}>Cancel</button>
                <button type="submit" className="btn btn-primary">Add Vehicle to Fleet</button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* MODAL 8: EDIT VEHICLE DETAILS & PRICE */}
      {editVehicleModal.open && editVehicleModal.vehicle && (
        <div className="admin-modal-overlay" onClick={() => setEditVehicleModal({ open: false, vehicle: null })}>
          <div className="admin-modal-box card" onClick={e => e.stopPropagation()}>
            <div className="modal-header-flex">
              <h3>Edit Vehicle Details & Pricing</h3>
              <button className="btn-modal-close" onClick={() => setEditVehicleModal({ open: false, vehicle: null })}><XCircle size={22} /></button>
            </div>
            <form onSubmit={handleEditVehicleSubmit}>
              <div className="input-group">
                <label>Car Model Name</label>
                <input 
                  type="text" 
                  value={editVehicleModal.vehicle.name} 
                  onChange={e => setEditVehicleModal({ 
                    ...editVehicleModal, 
                    vehicle: { ...editVehicleModal.vehicle, name: e.target.value } 
                  })}
                  required 
                />
              </div>

              <div className="input-group mt-2">
                <label>Vehicle Number Plate (e.g. GJ-04-AB-1234)</label>
                <input 
                  type="text" 
                  placeholder="e.g. GJ-04-AB-1234"
                  value={editVehicleModal.vehicle.plate || ''} 
                  onChange={e => setEditVehicleModal({ 
                    ...editVehicleModal, 
                    vehicle: { ...editVehicleModal.vehicle, plate: e.target.value.toUpperCase() } 
                  })}
                  style={{ textTransform: 'uppercase', fontFamily: 'Space Grotesk', fontWeight: '800' }}
                />
              </div>

              <div className="form-grid-2 mt-2">
                <div className="input-group">
                  <label>Max Capacity (Persons)</label>
                  <input 
                    type="text" 
                    value={editVehicleModal.vehicle.passengers} 
                    onChange={e => setEditVehicleModal({ 
                      ...editVehicleModal, 
                      vehicle: { ...editVehicleModal.vehicle, passengers: e.target.value } 
                    })}
                    required
                  />
                </div>

                <div className="input-group">
                  <label>Base Rate (₹ / km)</label>
                  <input 
                    type="text" 
                    value={editVehicleModal.vehicle.rate} 
                    onChange={e => setEditVehicleModal({ 
                      ...editVehicleModal, 
                      vehicle: { ...editVehicleModal.vehicle, rate: e.target.value } 
                    })}
                    required
                  />
                </div>
              </div>

              <div className="input-group mt-2">
                <label>Vehicle Photo</label>
                <div style={{ display: 'flex', gap: '10px', alignItems: 'center', margin: '6px 0' }}>
                  <label style={{ background: '#212B46', color: '#FFAA01', padding: '8px 14px', borderRadius: '8px', fontSize: '13px', fontWeight: '700', cursor: 'pointer', display: 'inline-flex', alignItems: 'center', gap: '6px' }}>
                    🖼️ Select Image from Gallery
                    <input 
                      type="file" 
                      accept="image/*" 
                      style={{ display: 'none' }}
                      onChange={e => handleImageFileUpload(e, true)}
                    />
                  </label>
                  <span style={{ fontSize: '12px', color: '#64748B' }}>or enter image Web URL</span>
                </div>
                <input 
                  type="text" 
                  placeholder="https://images.unsplash.com/... or upload image"
                  value={editVehicleModal.vehicle.image} 
                  onChange={e => setEditVehicleModal({ 
                    ...editVehicleModal, 
                    vehicle: { ...editVehicleModal.vehicle, image: e.target.value } 
                  })}
                />
                {editVehicleModal.vehicle.image && (
                  <div style={{ marginTop: '8px', display: 'flex', alignItems: 'center', gap: '10px' }}>
                    <img src={editVehicleModal.vehicle.image} alt="Preview" style={{ width: '60px', height: '40px', objectFit: 'cover', borderRadius: '6px', border: '1px solid #CBD5E1' }} />
                    <span style={{ fontSize: '12px', color: '#166534', fontWeight: 'bold' }}>✓ Photo Loaded</span>
                  </div>
                )}
              </div>

              <div className="input-group mt-2">
                <label>Fleet Description</label>
                <input 
                  type="text" 
                  value={editVehicleModal.vehicle.description} 
                  onChange={e => setEditVehicleModal({ 
                    ...editVehicleModal, 
                    vehicle: { ...editVehicleModal.vehicle, description: e.target.value } 
                  })}
                />
              </div>

              <div className="input-group mt-2">
                <label>Status</label>
                <select 
                  value={editVehicleModal.vehicle.status} 
                  onChange={e => setEditVehicleModal({ 
                    ...editVehicleModal, 
                    vehicle: { ...editVehicleModal.vehicle, status: e.target.value } 
                  })}
                >
                  <option value="Active">Active in Fleet</option>
                  <option value="Maintenance">In Maintenance</option>
                  <option value="Inactive">Inactive</option>
                </select>
              </div>

              <div className="modal-actions-flex mt-4">
                <button type="button" className="btn btn-outline" onClick={() => setEditVehicleModal({ open: false, vehicle: null })}>Cancel</button>
                <button type="submit" className="btn btn-primary">Save Changes</button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* MODAL 9: ADD NEW DESTINATION & ROUTE KM */}
      {addDestModal && (
        <div className="admin-modal-overlay" onClick={() => setAddDestModal(false)}>
          <div className="admin-modal-box card" onClick={e => e.stopPropagation()}>
            <div className="modal-header-flex">
              <h3>Configure Route KM Distance Between Places</h3>
              <button className="btn-modal-close" onClick={() => setAddDestModal(false)}><XCircle size={22} /></button>
            </div>
            <form onSubmit={handleAddDestSubmit}>
              <div className="form-grid-2 mt-2">
                <div className="input-group">
                  <label>Pick-up Location (From)</label>
                  <select 
                    value={newDestForm.pickup || places[0]} 
                    onChange={e => setNewDestForm({ ...newDestForm, pickup: e.target.value })}
                    required
                  >
                    {places.map((pl, idx) => (
                      <option key={idx} value={pl}>{pl}</option>
                    ))}
                  </select>
                </div>

                <div className="input-group">
                  <label>Drop-off Destination (To)</label>
                  <select 
                    value={newDestForm.dropoff || places[1]} 
                    onChange={e => setNewDestForm({ ...newDestForm, dropoff: e.target.value })}
                    required
                  >
                    {places.map((pl, idx) => (
                      <option key={idx} value={pl}>{pl}</option>
                    ))}
                  </select>
                </div>
              </div>

              <div className="form-grid-2 mt-2">
                <div className="input-group">
                  <label>Exact Distance in KM</label>
                  <input 
                    type="number" 
                    step="0.1"
                    placeholder="e.g. 175"
                    value={newDestForm.distanceKm} 
                    onChange={e => setNewDestForm({ ...newDestForm, distanceKm: e.target.value })}
                    required
                  />
                </div>

                <div className="input-group">
                  <label>Est. Travel Time / Total Time</label>
                  <input 
                    type="text" 
                    placeholder="e.g. 3 hr 15 min"
                    value={newDestForm.duration || ''} 
                    onChange={e => setNewDestForm({ ...newDestForm, duration: e.target.value })}
                  />
                </div>
              </div>

              <div className="modal-actions-flex mt-4">
                <button type="button" className="btn btn-outline" onClick={() => setAddDestModal(false)}>Cancel</button>
                <button type="submit" className="btn btn-primary">Save Route Details</button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* MODAL 10: EDIT DESTINATION & ROUTE KM */}
      {editDestModal.open && editDestModal.destination && (
        <div className="admin-modal-overlay" onClick={() => setEditDestModal({ open: false, destination: null })}>
          <div className="admin-modal-box card" onClick={e => e.stopPropagation()}>
            <div className="modal-header-flex">
              <h3>Edit Route Distance & Est. Travel Time</h3>
              <button className="btn-modal-close" onClick={() => setEditDestModal({ open: false, destination: null })}><XCircle size={22} /></button>
            </div>
            <form onSubmit={handleEditDestSubmit}>
              <div className="form-grid-2 mt-2">
                <div className="input-group">
                  <label>Pick-up Location (From)</label>
                  <select 
                    value={editDestModal.destination.pickup} 
                    onChange={e => setEditDestModal({ 
                      ...editDestModal, 
                      destination: { ...editDestModal.destination, pickup: e.target.value } 
                    })}
                    required
                  >
                    {places.map((pl, idx) => (
                      <option key={idx} value={pl}>{pl}</option>
                    ))}
                  </select>
                </div>

                <div className="input-group">
                  <label>Drop-off Destination (To)</label>
                  <select 
                    value={editDestModal.destination.dropoff} 
                    onChange={e => setEditDestModal({ 
                      ...editDestModal, 
                      destination: { ...editDestModal.destination, dropoff: e.target.value } 
                    })}
                    required
                  >
                    {places.map((pl, idx) => (
                      <option key={idx} value={pl}>{pl}</option>
                    ))}
                  </select>
                </div>
              </div>

              <div className="form-grid-2 mt-2">
                <div className="input-group">
                  <label>Distance in KM</label>
                  <input 
                    type="number" 
                    step="0.1"
                    value={editDestModal.destination.distanceKm} 
                    onChange={e => setEditDestModal({ 
                      ...editDestModal, 
                      destination: { ...editDestModal.destination, distanceKm: Number(e.target.value) } 
                    })}
                    required
                  />
                </div>

                <div className="input-group">
                  <label>Est. Travel Time / Total Time</label>
                  <input 
                    type="text" 
                    placeholder="e.g. 3 hr 15 min"
                    value={editDestModal.destination.duration || ''} 
                    onChange={e => setEditDestModal({ 
                      ...editDestModal, 
                      destination: { ...editDestModal.destination, duration: e.target.value } 
                    })}
                  />
                </div>
              </div>

              <div className="modal-actions-flex mt-4">
                <button type="button" className="btn btn-outline" onClick={() => setEditDestModal({ open: false, destination: null })}>Cancel</button>
                <button type="submit" className="btn btn-primary">Save Changes</button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* MODAL 11: PROFIT SPLIT & COMMISSION SETTINGS */}
      {commissionModal && (
        <div className="admin-modal-overlay" onClick={() => setCommissionModal(false)}>
          <div className="admin-modal-box card" style={{ maxWidth: '520px' }} onClick={e => e.stopPropagation()}>
            <div className="modal-header-flex">
              <h3>⚙️ Configure Profit & Driver Share Split</h3>
              <button className="btn-modal-close" onClick={() => setCommissionModal(false)}><XCircle size={22} /></button>
            </div>
            <div style={{ marginTop: '16px' }}>
              <p style={{ fontSize: '13px', color: '#64748B', marginBottom: '20px' }}>
                Set the company platform commission fee percentage. The driver payout share will automatically be calculated as the remainder.
              </p>

              <div style={{ background: '#F8FAFC', border: '1px solid #E2E8F0', padding: '20px', borderRadius: '16px', marginBottom: '20px' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '10px' }}>
                  <span style={{ fontSize: '14px', fontWeight: '700', color: '#6366F1' }}>🏢 Company Platform Commission</span>
                  <span style={{ fontSize: '18px', fontWeight: '800', color: '#4F46E5' }}>{companyShare}%</span>
                </div>
                <input 
                  type="range" 
                  min="0" 
                  max="50" 
                  step="1"
                  value={companyShare}
                  onChange={(e) => {
                    const val = Number(e.target.value);
                    setCompanyShare(val);
                    localStorage.setItem('cabsy_company_share', val);
                  }}
                  style={{ width: '100%', height: '8px', borderRadius: '4px', cursor: 'pointer', accentColor: '#4F46E5' }}
                />

                <div style={{ display: 'flex', justifyContent: 'space-between', marginTop: '16px' }}>
                  <span style={{ fontSize: '14px', fontWeight: '700', color: '#10B981' }}>🚕 Driver Net Payout Share</span>
                  <span style={{ fontSize: '18px', fontWeight: '800', color: '#059669' }}>{driverShare}%</span>
                </div>
              </div>

              <div style={{ marginBottom: '20px' }}>
                <label style={{ fontSize: '12px', fontWeight: '700', color: '#64748B', textTransform: 'uppercase', display: 'block', marginBottom: '8px' }}>Quick Presets</label>
                <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap' }}>
                  {[
                    { label: '90% Driver / 10% Co.', company: 10 },
                    { label: '85% Driver / 15% Co.', company: 15 },
                    { label: '80% Driver / 20% Co.', company: 20 },
                    { label: '75% Driver / 25% Co.', company: 25 },
                  ].map((preset, idx) => (
                    <button 
                      key={idx}
                      type="button"
                      style={{
                        padding: '6px 12px',
                        borderRadius: '20px',
                        fontSize: '12px',
                        fontWeight: '700',
                        border: companyShare === preset.company ? '2px solid #4F46E5' : '1px solid #CBD5E1',
                        background: companyShare === preset.company ? '#EEF2FF' : '#FFFFFF',
                        color: companyShare === preset.company ? '#4F46E5' : '#475569',
                        cursor: 'pointer'
                      }}
                      onClick={() => {
                        setCompanyShare(preset.company);
                        localStorage.setItem('cabsy_company_share', preset.company);
                      }}
                    >
                      {preset.label}
                    </button>
                  ))}
                </div>
              </div>

              <div className="modal-actions-flex">
                <button type="button" className="btn btn-outline" onClick={() => setCommissionModal(false)}>Close</button>
                <button 
                  type="button" 
                  className="btn btn-primary"
                  style={{ background: 'linear-gradient(135deg, #10B981 0%, #059669 100%)' }}
                  onClick={() => {
                    localStorage.setItem('cabsy_company_share', companyShare);
                    setCommissionModal(false);
                  }}
                >
                  ✓ Save Commission Split
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* MODAL 12: DETAILED TRIP RECEIPT & COUPON BREAKDOWN */}
      {receiptModal.open && receiptModal.inquiry && (
        <div className="admin-modal-overlay" onClick={() => setReceiptModal({ open: false, inquiry: null })}>
          <div className="admin-modal-box card" style={{ maxWidth: '600px', padding: '24px' }} onClick={e => e.stopPropagation()}>
            <div className="modal-header-flex" style={{ borderBottom: '1px solid #E2E8F0', paddingBottom: '16px', marginBottom: '20px' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                <div style={{ background: '#10B981', color: '#FFF', width: '38px', height: '38px', borderRadius: '10px', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '20px' }}>🚕</div>
                <div>
                  <h3 style={{ margin: 0, fontSize: '18px', fontWeight: '800' }}>EMPERIAL CABS - Detailed Trip Receipt</h3>
                  <small style={{ color: '#64748B' }}>Booking Ref: <strong>{receiptModal.inquiry.id}</strong> • {receiptModal.inquiry.date || 'Today'}</small>
                </div>
              </div>
              <button className="btn-modal-close" onClick={() => setReceiptModal({ open: false, inquiry: null })}><XCircle size={22} /></button>
            </div>

            {/* Status & Customer Summary */}
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px', marginBottom: '20px', background: '#F8FAFC', padding: '16px', borderRadius: '14px', border: '1px solid #E2E8F0' }}>
              <div>
                <small style={{ color: '#64748B', fontWeight: '700', textTransform: 'uppercase', fontSize: '11px' }}>Customer Information</small>
                <div style={{ fontWeight: '800', fontSize: '15px', color: '#0F172A', marginTop: '2px' }}>{receiptModal.inquiry.customerName || 'Customer'}</div>
                <div style={{ fontSize: '13px', color: '#475569', marginTop: '2px' }}>📞 {receiptModal.inquiry.customerPhone || 'N/A'}</div>
                {receiptModal.inquiry.customerEmail && <div style={{ fontSize: '12px', color: '#64748B' }}>✉️ {receiptModal.inquiry.customerEmail}</div>}
              </div>
              <div>
                <small style={{ color: '#64748B', fontWeight: '700', textTransform: 'uppercase', fontSize: '11px' }}>Booking Status & Driver</small>
                <div style={{ marginTop: '4px' }}>
                  <span className={`status-tag status-${(receiptModal.inquiry.status || 'pending').toLowerCase()}`}>
                    {receiptModal.inquiry.status || 'Pending'}
                  </span>
                </div>
                <div style={{ fontSize: '13px', color: '#334155', marginTop: '6px', fontWeight: '700' }}>
                  Driver: <span style={{ color: '#059669' }}>{receiptModal.inquiry.driver || 'Unassigned'}</span>
                </div>
                <div style={{ fontSize: '12px', color: '#64748B' }}>Vehicle: <strong>{receiptModal.inquiry.vehicle || 'Standard'}</strong></div>
              </div>
            </div>

            {/* Route Details */}
            <div style={{ marginBottom: '20px', background: '#FFFFFF', padding: '16px', borderRadius: '14px', border: '1px solid #E2E8F0' }}>
              <small style={{ color: '#64748B', fontWeight: '700', textTransform: 'uppercase', fontSize: '11px', display: 'block', marginBottom: '8px' }}>Trip Route</small>
              <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '8px', fontSize: '13px' }}>
                  <span style={{ color: '#10B981', fontWeight: '800' }}>📍 Pick-up:</span>
                  <span style={{ color: '#1E293B', fontWeight: '600' }}>{receiptModal.inquiry.pickup}</span>
                </div>
                <div style={{ display: 'flex', alignItems: 'center', gap: '8px', fontSize: '13px' }}>
                  <span style={{ color: '#EF4444', fontWeight: '800' }}>🏁 Drop-off:</span>
                  <span style={{ color: '#1E293B', fontWeight: '600' }}>{receiptModal.inquiry.dropoff}</span>
                </div>
              </div>
            </div>

            {/* FARE & COUPON DISCOUNT BREAKDOWN */}
            <div style={{ marginBottom: '20px' }}>
              <h4 style={{ margin: '0 0 10px 0', fontSize: '14px', fontWeight: '800', color: '#0F172A' }}>Fare & Coupon Discount Breakdown</h4>
              <div style={{ display: 'flex', flexDirection: 'column', gap: '8px', background: '#FAFAFA', padding: '16px', borderRadius: '14px', border: '1px solid #E5E7EB' }}>
                
                <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '14px', color: '#475569' }}>
                  <span>Base Trip Fare:</span>
                  <span style={{ fontWeight: '700' }}>₹{Number(receiptModal.inquiry.originalFare || receiptModal.inquiry.fare).toFixed(2)}</span>
                </div>

                {/* Coupon Used Highlight */}
                {receiptModal.inquiry.walletDiscountUsed > 0 ? (
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', background: '#F0FDF4', border: '1px solid #BBF7D0', padding: '10px 14px', borderRadius: '10px', color: '#047857' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '6px', fontWeight: '800', fontSize: '13px' }}>
                      <span>🎁 Wallet Coupon Discount Applied</span>
                    </div>
                    <div style={{ fontWeight: '800', fontSize: '15px' }}>
                      -₹{Number(receiptModal.inquiry.walletDiscountUsed).toFixed(2)}
                    </div>
                  </div>
                ) : (
                  <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '13px', color: '#94A3B8' }}>
                    <span>Wallet Coupon / Reward Discount:</span>
                    <span>No coupon applied</span>
                  </div>
                )}

                <div style={{ borderTop: '2px dashed #CBD5E1', paddingTop: '10px', marginTop: '4px', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                  <span style={{ fontSize: '15px', fontWeight: '800', color: '#0F172A' }}>Final Net Amount:</span>
                  <span style={{ fontSize: '22px', fontWeight: '800', color: '#059669', fontFamily: 'League Spartan' }}>₹{Number(receiptModal.inquiry.fare).toFixed(2)}</span>
                </div>
              </div>
            </div>

            {/* Reward Info (Only if rewardAmount > 0) & Commission Split */}
            <div style={{ 
              display: 'grid', 
              gridTemplateColumns: (receiptModal.inquiry.rewardIssued && Number(receiptModal.inquiry.rewardAmount) > 0) ? '1fr 1fr' : '1fr', 
              gap: '12px', 
              marginBottom: '24px' 
            }}>
              {receiptModal.inquiry.rewardIssued && Number(receiptModal.inquiry.rewardAmount) > 0 ? (
                <div style={{ background: '#EEF2FF', padding: '12px', borderRadius: '12px', border: '1px solid #C7D2FE' }}>
                  <small style={{ color: '#4338CA', fontWeight: '800', fontSize: '11px', display: 'block' }}>🎁 Customer Wallet Reward</small>
                  <div style={{ fontSize: '13px', fontWeight: '800', color: '#3730A3', marginTop: '2px' }}>
                    ✓ ₹{receiptModal.inquiry.rewardAmount} Credited to Customer
                  </div>
                </div>
              ) : null}

              <div style={{ background: '#F5F3FF', padding: '12px', borderRadius: '12px', border: '1px solid #DDD6FE' }}>
                <small style={{ color: '#6D28D9', fontWeight: '800', fontSize: '11px', display: 'block' }}>Commission Split</small>
                <div style={{ fontSize: '12px', color: '#5B21B6', marginTop: '2px', fontWeight: '700' }}>
                  Driver ({driverShare}%): ₹{(Number(receiptModal.inquiry.fare) * (driverShare / 100)).toFixed(2)} &nbsp;•&nbsp; Company ({companyShare}%): ₹{(Number(receiptModal.inquiry.fare) * (companyShare / 100)).toFixed(2)}
                </div>
              </div>
            </div>

            <div className="modal-actions-flex">
              <button 
                type="button" 
                className="btn btn-outline" 
                style={{ display: 'inline-flex', alignItems: 'center', gap: '6px' }}
                onClick={() => window.print()}
              >
                🖨️ Print Receipt
              </button>
              <button 
                type="button" 
                className="btn btn-primary"
                onClick={() => setReceiptModal({ open: false, inquiry: null })}
              >
                Close
              </button>
            </div>
          </div>
        </div>
      )}

      {/* MODAL: VIEW CONTACT MESSAGE DETAILS */}
      {viewMessageModal.open && viewMessageModal.message && (
        <div className="admin-modal-overlay" onClick={() => setViewMessageModal({ open: false, message: null })}>
          <div className="admin-modal-box card" style={{ maxWidth: '580px' }} onClick={e => e.stopPropagation()}>
            <div className="flex justify-between align-center mb-3">
              <h3 style={{ margin: 0, display: 'flex', alignItems: 'center', gap: '8px', color: '#0F172A' }}>
                <Mail size={20} className="text-green" /> Contact Message Details
              </h3>
              <span className={`status-pill ${
                viewMessageModal.message.status === 'Unread' ? 'status-pending' : 
                viewMessageModal.message.status === 'Replied' ? 'status-active' : 'status-assigned'
              }`}>
                {viewMessageModal.message.status}
              </span>
            </div>

            <div className="modal-info-summary" style={{ background: '#F8FAFC', border: '1px solid #E2E8F0', padding: '16px', borderRadius: '16px', marginBottom: '16px' }}>
              <div style={{ marginBottom: '8px' }}><strong>Message ID:</strong> {viewMessageModal.message.id}</div>
              <div style={{ marginBottom: '8px' }}><strong>Sender Name:</strong> {viewMessageModal.message.name}</div>
              <div style={{ marginBottom: '8px' }}>
                <strong>Sender Email:</strong> <a href={`mailto:${viewMessageModal.message.email}`} style={{ color: '#2563EB', fontWeight: '700' }}>{viewMessageModal.message.email}</a>
              </div>
              <div style={{ marginBottom: '8px' }}><strong>Category:</strong> {viewMessageModal.message.category || 'General Support'}</div>
              <div><strong>Received Date:</strong> {viewMessageModal.message.date}</div>
            </div>

            <div className="input-group mb-4">
              <label style={{ fontSize: '13px', fontWeight: '800', color: '#475569', marginBottom: '6px', display: 'block' }}>Message Body:</label>
              <div style={{ background: '#FFFFFF', border: '1.5px solid #CBD5E1', padding: '16px', borderRadius: '14px', fontSize: '14px', lineHeight: '1.6', color: '#0F172A', minHeight: '100px', whiteSpace: 'pre-wrap' }}>
                {viewMessageModal.message.message}
              </div>
            </div>

            <div className="modal-actions-flex">
              <a 
                href={`mailto:${viewMessageModal.message.email}?subject=Re: Emperial Cabs ${viewMessageModal.message.category || 'Inquiry'} (${viewMessageModal.message.id})`}
                className="btn btn-primary flex align-center justify-center gap-2"
                style={{ flex: 1, textDecoration: 'none' }}
                onClick={() => handleToggleMessageStatus(viewMessageModal.message.id, 'Replied')}
              >
                <Mail size={16} /> Send Email Reply
              </a>
              <button 
                className="btn btn-outline"
                onClick={() => setViewMessageModal({ open: false, message: null })}
              >
                Close
              </button>
            </div>
          </div>
        </div>
      )}
      {/* FULL PAGE / LARGE PUSH NOTIFICATION COMPOSER MODAL */}
      {sendNotifModal.open && sendNotifModal.customer && (
        <div className="admin-modal-overlay" onClick={() => setSendNotifModal({ open: false, customer: null, title: '', body: '', type: 'reward' })}>
          <div className="admin-modal-box card" style={{ maxWidth: '640px', width: '92%', borderRadius: '24px', padding: '28px' }} onClick={e => e.stopPropagation()}>
            <div className="flex justify-between align-center mb-3" style={{ borderBottom: '1px solid #E2E8F0', paddingBottom: '14px' }}>
              <div>
                <h3 style={{ margin: 0, display: 'flex', alignItems: 'center', gap: '8px', color: '#0F172A', fontSize: '20px', fontFamily: 'League Spartan, sans-serif', fontWeight: '800' }}>
                  <Bell size={22} className="text-green" /> Send Live Push Notification
                </h3>
                <p style={{ margin: '4px 0 0 0', fontSize: '13px', color: '#64748B' }}>
                  Target Recipient: <strong style={{ color: '#0F172A' }}>{sendNotifModal.customer.name}</strong> ({sendNotifModal.customer.email})
                </p>
              </div>
              <button 
                onClick={() => setSendNotifModal({ open: false, customer: null, title: '', body: '', type: 'reward' })}
                style={{ background: '#F1F5F9', border: 'none', width: '36px', height: '36px', borderRadius: '50%', fontSize: '16px', cursor: 'pointer', color: '#0F172A', fontWeight: 'bold' }}
              >✕</button>
            </div>

            {/* Target Recipient Card */}
            <div style={{ background: '#F8FAFC', border: '1.5px solid #E2E8F0', padding: '14px 18px', borderRadius: '16px', marginBottom: '18px', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <div>
                <div style={{ fontSize: '15px', fontWeight: '800', color: '#0F172A' }}>{sendNotifModal.customer.name}</div>
                <div style={{ fontSize: '13px', color: '#64748B', marginTop: '2px' }}>{sendNotifModal.customer.phone} &nbsp;•&nbsp; {sendNotifModal.customer.email}</div>
              </div>
              <span style={{ background: '#ECFDF5', color: '#059669', border: '1px solid #A7F3D0', padding: '4px 12px', borderRadius: '20px', fontSize: '12px', fontWeight: '800' }}>
                {sendNotifModal.customer.totalRides || 0} Rides Completed
              </span>
            </div>

            {/* Quick Templates Buttons */}
            <div style={{ marginBottom: '16px' }}>
              <label style={{ fontSize: '12px', fontWeight: '800', color: '#64748B', textTransform: 'uppercase', letterSpacing: '0.5px', marginBottom: '8px', display: 'block' }}>Quick Notification Presets</label>
              <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap' }}>
                <button
                  type="button"
                  style={{ background: '#F0FDF4', border: '1px solid #BBF7D0', color: '#166534', padding: '8px 12px', borderRadius: '10px', fontSize: '12px', fontWeight: '700', cursor: 'pointer' }}
                  onClick={() => setSendNotifModal(prev => ({
                    ...prev,
                    title: `🎁 Special 15% Discount for ${prev.customer.name}!`,
                    body: `Use promo code EMPIRERIDE on your next cab booking with EMPERIAL CABS to get 15% instant discount!`,
                    type: 'reward'
                  }))}
                >
                  🎁 15% Discount Promo
                </button>

                <button
                  type="button"
                  style={{ background: '#EFF6FF', border: '1px solid #BFDBFE', color: '#1E40AF', padding: '8px 12px', borderRadius: '10px', fontSize: '12px', fontWeight: '700', cursor: 'pointer' }}
                  onClick={() => setSendNotifModal(prev => ({
                    ...prev,
                    title: `🚕 Ride Dispatch Alert`,
                    body: `Your preferred vehicle is ready for dispatch in your area. Book now for instant pickup!`,
                    type: 'inquiry'
                  }))}
                >
                  🚕 Ride Dispatch Alert
                </button>

                <button
                  type="button"
                  style={{ background: '#FAF5FF', border: '1px solid #E9D5FF', color: '#6B21A8', padding: '8px 12px', borderRadius: '10px', fontSize: '12px', fontWeight: '700', cursor: 'pointer' }}
                  onClick={() => setSendNotifModal(prev => ({
                    ...prev,
                    title: `⭐ VIP Empire Status Activated`,
                    body: `Congratulations ${prev.customer.name}! You are now a priority VIP rider with EMPERIAL CABS. Enjoy zero cancellation fees!`,
                    type: 'system'
                  }))}
                >
                  ⭐ VIP Status
                </button>
              </div>
            </div>

            {/* Inputs */}
            <div style={{ marginBottom: '16px' }}>
              <label style={{ fontSize: '13px', fontWeight: '800', color: '#334155', marginBottom: '6px', display: 'block' }}>Notification Title:</label>
              <input 
                type="text"
                value={sendNotifModal.title}
                onChange={(e) => setSendNotifModal(prev => ({ ...prev, title: e.target.value }))}
                placeholder="Enter notification title..."
                style={{ width: '100%', padding: '12px 14px', borderRadius: '12px', border: '1.5px solid #CBD5E1', fontFamily: 'Space Grotesk', fontSize: '15px', fontWeight: '700', outline: 'none', boxSizing: 'border-box' }}
              />
            </div>

            <div style={{ marginBottom: '20px' }}>
              <label style={{ fontSize: '13px', fontWeight: '800', color: '#334155', marginBottom: '6px', display: 'block' }}>Notification Body Message:</label>
              <textarea 
                rows={3}
                value={sendNotifModal.body}
                onChange={(e) => setSendNotifModal(prev => ({ ...prev, body: e.target.value }))}
                placeholder="Enter detailed notification body message..."
                style={{ width: '100%', padding: '12px 14px', borderRadius: '12px', border: '1.5px solid #CBD5E1', fontFamily: 'Space Grotesk', fontSize: '14px', outline: 'none', resize: 'vertical', boxSizing: 'border-box' }}
              />
            </div>

            {/* Live Phone Banner Preview */}
            <div style={{ background: '#0F172A', color: '#FFFFFF', padding: '14px 16px', borderRadius: '16px', marginBottom: '24px' }}>
              <small style={{ color: '#94A3B8', fontWeight: '700', fontSize: '11px', textTransform: 'uppercase', letterSpacing: '0.5px', display: 'block', marginBottom: '6px' }}>
                📱 Phone Lock Screen Notification Preview
              </small>
              <div style={{ display: 'flex', gap: '10px', alignItems: 'flex-start' }}>
                <div style={{ width: '32px', height: '32px', borderRadius: '8px', background: '#10B981', display: 'flex', alignItems: 'center', justifyContent: 'center', fontWeight: 'bold', fontSize: '16px', color: '#FFFFFF', flexShrink: 0 }}>🚖</div>
                <div>
                  <div style={{ fontSize: '14px', fontWeight: '800', color: '#FFFFFF' }}>{sendNotifModal.title || 'Notification Title'}</div>
                  <div style={{ fontSize: '12px', color: '#CBD5E1', marginTop: '2px', lineHeight: '1.4' }}>{sendNotifModal.body || 'Notification body text preview will appear here...'}</div>
                </div>
              </div>
            </div>

            <div className="modal-actions-flex" style={{ display: 'flex', gap: '12px' }}>
              <button 
                type="button" 
                className="btn btn-outline" 
                style={{ flex: 1, padding: '14px' }}
                onClick={() => setSendNotifModal({ open: false, customer: null, title: '', body: '', type: 'reward' })}
              >
                Cancel
              </button>
              <button 
                type="button" 
                className="btn btn-primary"
                style={{ flex: 2, padding: '14px', backgroundColor: '#10B981', borderColor: '#10B981', color: '#FFFFFF', fontWeight: '800', fontSize: '15px', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '8px', boxShadow: '0 8px 20px rgba(16,185,129,0.35)' }}
                onClick={() => {
                  if (!sendNotifModal.title || !sendNotifModal.body) {
                    alert('Please enter both title and body for the notification.');
                    return;
                  }

                  notifyCustomer({
                    type: sendNotifModal.type || 'reward',
                    title: sendNotifModal.title,
                    body: sendNotifModal.body,
                    customerEmail: sendNotifModal.customer.email,
                    customerPhone: sendNotifModal.customer.phone
                  });

                  alert(`✅ Push Notification Sent!\n\nTarget: ${sendNotifModal.customer.name} (${sendNotifModal.customer.email})\nTitle: ${sendNotifModal.title}`);
                  setSendNotifModal({ open: false, customer: null, title: '', body: '', type: 'reward' });
                }}
              >
                🚀 Dispatch Push Notification Now
              </button>
            </div>
          </div>
        </div>
      )}

      {/* TRIP COMPLETION & E-RECEIPT FINALIZATION MODAL */}
      {completeModal.open && completeModal.inquiry && (
        <div className="modal-backdrop" style={{ position: 'fixed', top: 0, left: 0, right: 0, bottom: 0, backgroundColor: 'rgba(15, 23, 42, 0.65)', backdropFilter: 'blur(6px)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 99999, padding: '20px' }}>
          <div className="modal-card" style={{ maxWidth: '480px', width: '100%', borderRadius: '24px', overflow: 'hidden', background: '#FFFFFF', boxShadow: '0 25px 50px -12px rgba(0,0,0,0.25)' }}>
            <div style={{ background: 'linear-gradient(135deg, #059669 0%, #10B981 100%)', padding: '20px 24px', color: '#FFFFFF' }}>
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                  <div style={{ width: '38px', height: '38px', borderRadius: '12px', background: 'rgba(255,255,255,0.2)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                    <CheckCircle size={22} color="#FFF" />
                  </div>
                  <div>
                    <h3 style={{ margin: 0, fontSize: '18px', fontWeight: '800', fontFamily: 'League Spartan' }}>Complete Trip & Issue Receipt</h3>
                    <p style={{ margin: 0, fontSize: '12px', opacity: 0.9 }}>Ref: {completeModal.inquiry.id}</p>
                  </div>
                </div>
                <button 
                  onClick={() => setCompleteModal({ open: false, inquiry: null, finalPrice: '', rewardAmount: '0' })}
                  style={{ background: 'none', border: 'none', color: '#FFF', cursor: 'pointer', opacity: 0.8 }}
                >
                  <XCircle size={22} />
                </button>
              </div>
            </div>

            <form onSubmit={handleFinalizeTripCompletion} style={{ padding: '24px' }}>
              {/* Customer & Route Card */}
              <div style={{ background: '#F8FAFC', border: '1px solid #E2E8F0', borderRadius: '16px', padding: '14px 16px', marginBottom: '20px' }}>
                <div style={{ fontSize: '14px', fontWeight: '800', color: '#0F172A', marginBottom: '4px' }}>
                  👤 {resolveCustomerName(completeModal.inquiry)} ({completeModal.inquiry.customerPhone})
                </div>
                <div style={{ fontSize: '13px', fontWeight: '700', color: '#059669' }}>
                  📍 {completeModal.inquiry.pickupCity || completeModal.inquiry.pickup} ➔ {completeModal.inquiry.dropoffCity || completeModal.inquiry.dropoff}
                </div>
                {completeModal.inquiry.vehicle && (
                  <div style={{ fontSize: '12px', color: '#64748B', marginTop: '4px' }}>
                    🚘 Vehicle: <strong>{completeModal.inquiry.vehicle}</strong>
                  </div>
                )}
              </div>

              {/* Total Final Price Input */}
              <div style={{ marginBottom: '18px' }}>
                <label style={{ display: 'block', fontSize: '13px', fontWeight: '800', color: '#0F172A', marginBottom: '6px' }}>
                  1. ENTER TOTAL TRIP PRICE (₹) <span style={{ color: '#EF4444' }}>*</span>
                </label>
                <div style={{ position: 'relative' }}>
                  <span style={{ position: 'absolute', left: '14px', top: '50%', transform: 'translateY(-50%)', fontWeight: '800', color: '#059669', fontSize: '16px' }}>₹</span>
                  <input 
                    type="number"
                    step="0.01"
                    required
                    placeholder="e.g. 2500"
                    value={completeModal.finalPrice}
                    onChange={(e) => setCompleteModal(prev => ({ ...prev, finalPrice: e.target.value }))}
                    style={{
                      width: '100%',
                      padding: '12px 14px 12px 34px',
                      borderRadius: '14px',
                      border: '2px solid #10B981',
                      fontSize: '16px',
                      fontWeight: '800',
                      color: '#0F172A',
                      outline: 'none',
                      boxSizing: 'border-box'
                    }}
                  />
                </div>
                <small style={{ color: '#64748B', fontSize: '11px', marginTop: '4px', display: 'block' }}>
                  This total price will be printed on the customer's official E-Receipt.
                </small>
              </div>

              {/* Customer Reward Input */}
              <div style={{ marginBottom: '24px' }}>
                <label style={{ display: 'block', fontSize: '13px', fontWeight: '800', color: '#0F172A', marginBottom: '6px' }}>
                  2. WALLET REWARD / CASHBACK (₹) <span style={{ color: '#64748B', fontWeight: '600' }}>(Optional)</span>
                </label>
                <div style={{ position: 'relative' }}>
                  <span style={{ position: 'absolute', left: '14px', top: '50%', transform: 'translateY(-50%)', fontWeight: '800', color: '#7C3AED', fontSize: '16px' }}>₹</span>
                  <input 
                    type="number"
                    step="0.01"
                    placeholder="0.00"
                    value={completeModal.rewardAmount}
                    onChange={(e) => setCompleteModal(prev => ({ ...prev, rewardAmount: e.target.value }))}
                    style={{
                      width: '100%',
                      padding: '12px 14px 12px 34px',
                      borderRadius: '14px',
                      border: '1.5px solid #CBD5E1',
                      fontSize: '15px',
                      fontWeight: '700',
                      color: '#0F172A',
                      outline: 'none',
                      boxSizing: 'border-box'
                    }}
                  />
                </div>
                <small style={{ color: '#64748B', fontSize: '11px', marginTop: '4px', display: 'block' }}>
                  Entered amount will be instantly credited to the customer's wallet balance.
                </small>
              </div>

              {/* Action Buttons */}
              <div style={{ display: 'flex', gap: '12px', justifyContent: 'flex-end' }}>
                <button 
                  type="button"
                  className="btn btn-outline"
                  onClick={() => setCompleteModal({ open: false, inquiry: null, finalPrice: '', rewardAmount: '0' })}
                  style={{ borderRadius: '14px', padding: '10px 18px', fontWeight: '700' }}
                >
                  Cancel
                </button>
                <button 
                  type="submit"
                  style={{
                    background: 'linear-gradient(135deg, #059669 0%, #10B981 100%)',
                    color: '#FFFFFF',
                    border: 'none',
                    borderRadius: '14px',
                    padding: '10px 22px',
                    fontFamily: 'League Spartan',
                    fontSize: '15px',
                    fontWeight: '800',
                    cursor: 'pointer',
                    boxShadow: '0 4px 14px rgba(16,185,129,0.35)',
                    display: 'flex',
                    alignItems: 'center',
                    gap: '6px'
                  }}
                >
                  <CheckCircle size={16} /> Complete & Generate Receipt
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
      {/* MOBILE BOTTOM APP DOCK FOR ONE-TOUCH NAVIGATION */}
      <nav className="admin-mobile-bottom-dock">
        <button 
          className={`dock-item ${activeTab === 'dashboard' ? 'active' : ''}`} 
          onClick={() => { setActiveTab('dashboard'); setIsMobileMenuOpen(false); }}
        >
          <LayoutDashboard size={20} />
          <span>Overview</span>
        </button>

        <button 
          className={`dock-item ${activeTab === 'inquiries' ? 'active' : ''}`} 
          onClick={() => { setActiveTab('inquiries'); setIsMobileMenuOpen(false); }}
        >
          <div className="dock-icon-wrapper">
            <Inbox size={20} />
            {inquiries.filter(i => !i.isCustom && i.tripType !== 'Custom Trip' && i.status === 'Pending').length > 0 && (
              <span className="dock-badge">
                {inquiries.filter(i => !i.isCustom && i.tripType !== 'Custom Trip' && i.status === 'Pending').length}
              </span>
            )}
          </div>
          <span>Inquiries</span>
        </button>

        <button 
          className={`dock-item ${activeTab === 'final_trips' ? 'active' : ''}`} 
          onClick={() => { setActiveTab('final_trips'); setIsMobileMenuOpen(false); }}
        >
          <div className="dock-icon-wrapper">
            <Navigation size={20} />
            {inquiries.filter(i => (i.status === 'Confirmed' || i.status === 'In Progress' || i.status === 'On Ride')).length > 0 && (
              <span className="dock-badge blue">
                {inquiries.filter(i => (i.status === 'Confirmed' || i.status === 'In Progress' || i.status === 'On Ride')).length}
              </span>
            )}
          </div>
          <span>Trips</span>
        </button>

        <button 
          className={`dock-item ${activeTab === 'drivers' ? 'active' : ''}`} 
          onClick={() => { setActiveTab('drivers'); setIsMobileMenuOpen(false); }}
        >
          <UserCheck size={20} />
          <span>Drivers</span>
        </button>

        <button 
          className={`dock-item ${isMobileMenuOpen ? 'active' : ''}`} 
          onClick={() => setIsMobileMenuOpen(!isMobileMenuOpen)}
        >
          <Menu size={20} />
          <span>Sections</span>
        </button>
      </nav>
    </div>
  );
}
