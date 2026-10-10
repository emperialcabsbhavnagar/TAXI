// Empire Cab Admin Portal v1.0.4 - Live Trip Tracking & Chronological Inquiries Engine
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
  Gift
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

// Clean Database Initialization (Demo Data Removed)
const INITIAL_DRIVERS = [];

const INITIAL_INQUIRIES = [];

const INITIAL_CUSTOMERS = [];

const INITIAL_DESTINATIONS = [
  { id: 'DEST-101', name: 'Bhavnagar → Railway Station', pickup: 'Bhavnagar, Gujarat', dropoff: 'Bhavnagar Railway Station', distanceKm: 18 },
  { id: 'DEST-102', name: 'Bhavnagar → Ahmedabad Airport (AMD)', pickup: 'Bhavnagar, Gujarat', dropoff: 'Ahmedabad Airport (AMD)', distanceKm: 175 },
  { id: 'DEST-103', name: 'Bhavnagar → Vadodara Central Station', pickup: 'Bhavnagar, Gujarat', dropoff: 'Vadodara Central Railway Station', distanceKm: 110 },
  { id: 'DEST-104', name: 'Bhavnagar → SG Highway IT Park', pickup: 'Bhavnagar, Gujarat', dropoff: 'SG Highway IT Park', distanceKm: 180 },
  { id: 'DEST-105', name: 'Bhavnagar → Alkapuri Hub', pickup: 'Bhavnagar, Gujarat', dropoff: 'Alkapuri Commercial Hub', distanceKm: 112 },
  { id: 'DEST-106', name: 'Bhavnagar → Ghogha Circle & Beach', pickup: 'Bhavnagar, Gujarat', dropoff: 'Ghogha Circle & Beach', distanceKm: 12 },
  { id: 'DEST-107', name: 'Bhavnagar → Mumbai Central Airport', pickup: 'Bhavnagar, Gujarat', dropoff: 'Mumbai Central Airport (BOM)', distanceKm: 540 }
];

const INITIAL_PLACES = [
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
  
  // State — start empty, Firestore will populate on mount
  const [inquiries, setInquiries] = useState([]);
  const [firestoreLoading, setFirestoreLoading] = useState(true);
  const [customers, setCustomers] = useState([]);

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
      return inquiries.indexOf(b) - inquiries.indexOf(a);
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
  const [companyShare, setCompanyShare] = useState(() => {
    const saved = localStorage.getItem('cabsy_company_share');
    return saved ? Number(saved) : 20;
  });
  const driverShare = 100 - companyShare;
  const [commissionModal, setCommissionModal] = useState(false);

  const handleIssueRewardSubmit = () => {
    if (!rewardModal.inquiry) return;
    const inq = rewardModal.inquiry;
    const rewardAmount = Number(rewardModal.amount) || 100;

    // 1. Add reward to customer wallet in dbService
    db.addRewardToCustomer(inq.customerPhone, rewardAmount, inq.id, inq.pickup, inq.dropoff);

    // 2. Update inquiry state & localStorage
    setInquiries(prev => prev.map(item => {
      if (item.id === inq.id) {
        return { ...item, rewardIssued: 1, rewardAmount: rewardAmount };
      }
      return item;
    }));

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
      body: `Congratulations! You received ₹${rewardAmount} wallet reward credit from Empire Cab for trip ${inq.id}!`,
      customerPhone: inq.customerPhone,
      customerEmail: inq.customerEmail
    });

    window.dispatchEvent(new Event('storage'));
    alert(`Successfully credited ₹${rewardAmount} reward to ${inq.customerName}'s wallet!`);
    setRewardModal({ open: false, inquiry: null, amount: 100 });
  };

  // Notification System State
  const [notifications, setNotifications] = useState(() => {
    const list = getAdminNotifications();
    if (list && list.length > 0) return list;
    return [
      { id: 1, type: 'inquiry', title: 'New Ride Inquiry INQ-9012', desc: 'Downtown Terminal to Airport T3 (₹65.00)', time: '2 mins ago', read: false },
      { id: 2, type: 'driver', title: 'Fleet Driver Active', desc: 'Alex Morgan status changed to On Duty', time: '12 mins ago', read: false }
    ];
  });
  const [showNotifDropdown, setShowNotifDropdown] = useState(false);

  // Notification & Live MySQL Data Sync Engine
  useEffect(() => {
    requestNotificationPermission();

    const fetchAllData = async () => {
      try {
        setFirestoreLoading(true);

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
        setInquiries(mergedInquiries);

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
        setCustomers(Array.from(custMap.values()));
      } catch (e) {
        console.warn('MySQL Fetch Exception in AdminPortal:', e);
      } finally {
        setFirestoreLoading(false);
      }
    };

    fetchAllData();

    // Sync admin notifications
    const syncAdminNotifs = () => {
      const fresh = getAdminNotifications();
      if (fresh && fresh.length > 0) {
        setNotifications(fresh);
      }
      fetchAllData();
    };

    window.addEventListener('taxigo_admin_notif', syncAdminNotifs);
    window.addEventListener('taxigo_db_sync', syncAdminNotifs);
    window.addEventListener('storage', syncAdminNotifs);
    
    // Poll Hostinger MySQL every 1.5s for instant minor-second live cross-device trip updates
    const interval = setInterval(fetchAllData, 1500);

    return () => {
      window.removeEventListener('taxigo_admin_notif', syncAdminNotifs);
      window.removeEventListener('taxigo_db_sync', syncAdminNotifs);
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
    window.addEventListener('taxigo_db_sync', handleSyncEvent);

    return () => {
      clearInterval(pollInterval);
      window.removeEventListener('storage', handleSyncEvent);
      window.removeEventListener('taxigo_db_sync', handleSyncEvent);
    };
  }, []);

  useEffect(() => {
    if (inquiries && Array.isArray(inquiries)) {
      localStorage.setItem('cabsy_inquiries', JSON.stringify(inquiries));
      try {
        if ('BroadcastChannel' in window) {
          const bc = new BroadcastChannel('taxigo_realtime_sync');
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
    window.dispatchEvent(new CustomEvent('taxigo_vehicles_updated', { detail: vehicles }));
  }, [vehicles]);

  useEffect(() => {
    localStorage.setItem('cabsy_destinations', JSON.stringify(destinations));
  }, [destinations]);

  useEffect(() => {
    localStorage.setItem('cabsy_places', JSON.stringify(places));
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

  // Calculations
  const confirmedInquiries = inquiries.filter(i => i.status === 'Confirmed');
  const totalRevenue = confirmedInquiries.reduce((sum, item) => sum + Number(item.fare || 0), 0);
  const activeDriversCount = drivers.filter(d => d.status !== 'Off Duty').length;

  // Confirm inquiry & add money to report
  const handleConfirmInquiry = () => {
    if (!assignModal.inquiry) return;
    const driverObj = drivers.find(d => d.id === selectedDriverId) || drivers[0];

    const updatedInquiries = inquiries.map(inq => {
      if (inq.id === assignModal.inquiry.id) {
        return {
          ...inq,
          status: 'Confirmed',
          driver: driverObj.name
        };
      }
      return inq;
    });

    setInquiries(updatedInquiries);

    // Sync status to Hostinger MySQL
    if (assignModal.inquiry.id) {
      updateInquiryStatusInMySQL(
        assignModal.inquiry.id,
        'Confirmed',
        driverObj.name
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

    autoSyncCustomer(assignModal.inquiry.customerName, assignModal.inquiry.customerPhone, assignModal.inquiry.fare);
    
    // Direct notification to customer for booking confirmation & driver assignment
    notifyCustomer({
      type: 'confirmed',
      title: '✅ Ride Booking Confirmed!',
      body: `Your booking for ${assignModal.inquiry.pickup} → ${assignModal.inquiry.dropoff} is confirmed! Driver: ${driverObj.name} (${driverObj.plate})`,
      customerPhone: assignModal.inquiry.customerPhone,
      customerEmail: assignModal.inquiry.customerEmail
    });

    setAssignModal({ open: false, inquiry: null });
  };

  const handleStartTrip = (inquiryId) => {
    if (!inquiryId) return;
    setInquiries(prev => prev.map(inq => {
      if (inq.id === inquiryId) {
        return { ...inq, status: 'In Progress' };
      }
      return inq;
    }));

    const targetInq = inquiries.find(i => i.id === inquiryId);
    if (targetInq) {
      updateInquiryStatusInMySQL(inquiryId, 'In Progress', targetInq.driver || 'Assigned Driver').catch(() => {});
      try {
        db.saveInquiry({ ...targetInq, status: 'In Progress' });
      } catch (e) {}

      // Direct notification to customer on trip start
      notifyCustomer({
        type: 'trip_started',
        title: '▶ Your Ride Has Started!',
        body: `Driver ${targetInq.driver || 'Empire Cab'} has started your trip to ${targetInq.dropoff}. Live map tracking is now active!`,
        customerPhone: targetInq.customerPhone,
        customerEmail: targetInq.customerEmail
      });
    }
    window.dispatchEvent(new Event('storage'));
    window.dispatchEvent(new CustomEvent('taxigo_trip_started', { detail: { id: inquiryId } }));
  };

  const handleCompleteTrip = (inquiryId) => {
    if (!inquiryId) return;
    let completedInq = null;

    setInquiries(prev => {
      const updated = prev.map(inq => {
        if (inq.id === inquiryId) {
          completedInq = { ...inq, status: 'Completed' };
          return completedInq;
        }
        return inq;
      });
      localStorage.setItem('cabsy_inquiries', JSON.stringify(updated));
      return updated;
    });

    const targetInq = completedInq || inquiries.find(i => i.id === inquiryId);
    if (targetInq) {
      const fullCompleted = { ...targetInq, status: 'Completed' };
      localStorage.setItem('taxigo_last_completed_trip', JSON.stringify(fullCompleted));
      updateInquiryStatusInMySQL(inquiryId, 'Completed', targetInq.driver || 'Assigned Driver').catch(() => {});
      try {
        db.saveInquiry(fullCompleted);
      } catch (e) {}

      // Direct notification to customer on trip completion
      notifyCustomer({
        type: 'trip_completed',
        title: '🏁 Trip Completed!',
        body: `Thank you for riding with Empire Cab! We hope you enjoyed your ride to ${targetInq.dropoff}.`,
        customerPhone: targetInq.customerPhone,
        customerEmail: targetInq.customerEmail
      });

      // Post real-time cross-tab BroadcastChannel message
      try {
        if ('BroadcastChannel' in window) {
          const bc = new BroadcastChannel('taxigo_realtime_sync');
          bc.postMessage({ type: 'TRIP_COMPLETED', data: fullCompleted, timestamp: Date.now() });
          bc.close();
        }
      } catch (e) {}

      window.dispatchEvent(new Event('storage'));
      window.dispatchEvent(new CustomEvent('taxigo_trip_completed', { detail: fullCompleted }));
    }
  };

  const handleCancelInquiry = (inquiryId) => {
    setInquiries(prev => {
      const target = prev.find(i => i.id === inquiryId);
      if (target && target.id) {
        updateInquiryStatusInMySQL(target.id, 'Cancelled').catch(() => {});
        notifyCustomer({
          type: 'cancelled',
          title: '❌ Booking Cancelled',
          body: `Your booking request for ${target.pickup} → ${target.dropoff} was cancelled by Empire Cab dispatch.`,
          customerPhone: target.customerPhone,
          customerEmail: target.customerEmail
        });
      }
      return prev.map(i => i.id === inquiryId ? { ...i, status: 'Cancelled' } : i);
    });
  };

  const handleDeleteInquiry = (inquiryId) => {
    if (!inquiryId) return;
    if (window.confirm("Are you sure you want to delete this inquiry record permanently?")) {
      deleteInquiryFromMySQL(inquiryId).catch(() => {});
      setInquiries(prev => prev.filter(i => i.id !== inquiryId));
      try {
        const saved = localStorage.getItem('cabsy_inquiries');
        if (saved) {
          const parsed = JSON.parse(saved);
          const filtered = parsed.filter(i => i.id !== inquiryId);
          localStorage.setItem('cabsy_inquiries', JSON.stringify(filtered));
        }
      } catch (e) {}
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

  // Add Manual Inquiry
  const handleAddInquirySubmit = (e) => {
    e.preventDefault();
    if (!newInquiryForm.customerName || !newInquiryForm.pickup) return;
    const createdInquiry = {
      id: 'INQ-' + Math.floor(1000 + Math.random() * 8999),
      customerName: newInquiryForm.customerName,
      customerPhone: newInquiryForm.customerPhone || '+1 (555) 777-0099',
      pickup: newInquiryForm.pickup,
      dropoff: newInquiryForm.dropoff,
      vehicle: newInquiryForm.vehicle,
      fare: Number(newInquiryForm.fare || 35),
      status: 'Pending',
      driver: '-',
      date: new Date().toLocaleString().slice(0, 16)
    };
    setInquiries([createdInquiry, ...inquiries]);
    autoSyncCustomer(createdInquiry.customerName, createdInquiry.customerPhone, 0);
    setNewInquiryForm({ customerName: '', customerPhone: '', pickup: '', dropoff: '', vehicle: 'Empire Regular', fare: 35.00 });
    setAddInquiryModal(false);
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
    if (window.confirm("⚠️ DANGER: Are you sure you want to PERMANENTLY PURGE ALL inquiries and customer profiles from Hostinger Remote MySQL database? This will clear all booking data.")) {
      try {
        await purgeAllDataFromMySQL();
        localStorage.removeItem('cabsy_inquiries');
        localStorage.removeItem('cabsy_customers');
        setInquiries([]);
        setCustomers([]);
        alert("All inquiries and customer directory records have been completely purged from Hostinger Remote MySQL Database.");
      } catch (err) {
        alert("Failed to purge database data: " + err.message);
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
            <h2>Empire Cab Admin Security</h2>
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
      {/* LEFT SIDEBAR NAVIGATION */}
      <aside className="admin-sidebar">
        <div className="admin-brand flex align-center gap-2">
          <div className="brand-badge">
            <span>C</span>
          </div>
          <div>
            <h3>Empire Cab Admin</h3>
            <small className="text-green flex align-center gap-1">
              <span className="dot"></span> Authorized Portal
            </small>
          </div>
        </div>

        <nav className="admin-nav-menu">
          <button 
            className={`admin-nav-link ${activeTab === 'dashboard' ? 'active' : ''}`}
            onClick={() => setActiveTab('dashboard')}
          >
            <LayoutDashboard size={19} />
            <span>Dashboard</span>
          </button>

          <button 
            className={`admin-nav-link ${activeTab === 'inquiries' ? 'active' : ''}`}
            onClick={() => setActiveTab('inquiries')}
          >
            <Inbox size={19} />
            <span>All Inquiries</span>
            {inquiries.filter(i => i.status === 'Pending').length > 0 && (
              <span className="badge-pending">{inquiries.filter(i => i.status === 'Pending').length}</span>
            )}
          </button>

          <button 
            className={`admin-nav-link ${activeTab === 'final_trips' ? 'active' : ''}`}
            onClick={() => setActiveTab('final_trips')}
          >
            <Navigation size={19} />
            <span>Final Trips</span>
            {inquiries.filter(i => i.status === 'Confirmed' || i.status === 'In Progress' || i.status === 'On Ride' || (i.status === 'Completed' && !i.rewardIssued)).length > 0 && (
              <span className="badge-pending" style={{ background: '#3b82f6' }}>
                {inquiries.filter(i => i.status === 'Confirmed' || i.status === 'In Progress' || i.status === 'On Ride' || (i.status === 'Completed' && !i.rewardIssued)).length}
              </span>
            )}
          </button>

          <button 
            className={`admin-nav-link ${activeTab === 'success_trips' ? 'active' : ''}`}
            onClick={() => setActiveTab('success_trips')}
          >
            <Award size={19} />
            <span>Success Trips</span>
            {inquiries.filter(i => i.status === 'Completed').length > 0 && (
              <span className="badge-pending" style={{ background: '#10b981' }}>
                {inquiries.filter(i => i.status === 'Completed').length}
              </span>
            )}
          </button>

          <button 
            className={`admin-nav-link ${activeTab === 'vehicles' ? 'active' : ''}`}
            onClick={() => setActiveTab('vehicles')}
          >
            <Car size={19} />
            <span>Fleet Vehicles</span>
          </button>

          <button 
            className={`admin-nav-link ${activeTab === 'destinations' ? 'active' : ''}`}
            onClick={() => setActiveTab('destinations')}
          >
            <MapPin size={19} />
            <span>Destinations & KM</span>
          </button>

          <button 
            className={`admin-nav-link ${activeTab === 'drivers' ? 'active' : ''}`}
            onClick={() => setActiveTab('drivers')}
          >
            <UserCheck size={19} />
            <span>Drivers</span>
          </button>

          <button 
            className={`admin-nav-link ${activeTab === 'customers' ? 'active' : ''}`}
            onClick={() => setActiveTab('customers')}
          >
            <Users size={19} />
            <span>Customers</span>
          </button>

          <button 
            className={`admin-nav-link ${activeTab === 'reports' ? 'active' : ''}`}
            onClick={() => setActiveTab('reports')}
          >
            <BarChart3 size={19} />
            <span>Trips & Reports</span>
          </button>

          <button 
            className={`admin-nav-link ${activeTab === 'settings' ? 'active' : ''}`}
            onClick={() => setActiveTab('settings')}
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
        {/* HEADER BAR */}
        <header className="admin-topbar">
          <div className="topbar-search flex align-center gap-2">
            <Search size={18} className="muted-icon" />
            <input type="text" placeholder="Search inquiries, drivers, customers..." />
            <span className="search-shortcut">⌘K</span>
          </div>

          <div className="topbar-actions flex align-center gap-3">
            <div className="notif-wrapper" style={{ position: 'relative' }}>
              <div className="topbar-notif-btn" onClick={() => setShowNotifDropdown(!showNotifDropdown)} title="Notifications & Alerts">
                <Bell size={19} />
                {unreadCount > 0 && <span className="notif-badge">{unreadCount}</span>}
              </div>

              {showNotifDropdown && (
                <div className="notif-dropdown-card">
                  <div className="notif-header flex justify-between align-center">
                    <h4 className="m-0">Notifications & Alerts</h4>
                    {unreadCount > 0 && (
                      <button className="btn-text-sm text-green" onClick={handleMarkAllRead}>
                        Mark all read
                      </button>
                    )}
                  </div>

                  <div className="notif-list">
                    {notifications.length === 0 ? (
                      <div className="notif-empty">No active notifications</div>
                    ) : (
                      notifications.map(n => (
                        <div key={n.id} className={`notif-item ${!n.read ? 'unread' : ''}`}>
                          <div className="notif-item-header flex justify-between align-center">
                            <strong className="notif-title">{n.title}</strong>
                            <span className="notif-time">{n.time}</span>
                          </div>
                          <p className="notif-desc">{n.desc}</p>
                          <div className="notif-actions flex justify-between align-center mt-1">
                            {n.type === 'inquiry' && (
                              <button className="btn-notif-act" onClick={() => { setActiveTab('inquiries'); setShowNotifDropdown(false); }}>
                                View Inquiry →
                              </button>
                            )}
                            <button className="btn-notif-dismiss" onClick={() => handleClearNotif(n.id)}>Dismiss</button>
                          </div>
                        </div>
                      ))
                    )}
                  </div>
                </div>
              )}
            </div>

            <div className="admin-profile flex align-center gap-2">
              <div className="avatar">A</div>
              <div className="admin-profile-info">
                <span className="profile-name">Super Admin</span>
                <span className="profile-role">Dispatcher</span>
              </div>
            </div>
          </div>
        </header>

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
                          <td><strong>{inq.id}</strong></td>
                          <td>{resolveCustomerName(inq)}<br /><small className="text-muted">{inq.customerPhone}</small></td>
                          <td className="route-cell">
                            <span className="text-green">●</span> {inq.pickup}<br />
                            <span className="text-red">●</span> {inq.dropoff}
                          </td>
                          <td><strong>₹{Number(inq.fare).toFixed(2)}</strong></td>
                          <td>
                            <span className={`status-tag status-${inq.status.toLowerCase()}`}>
                              {inq.status}
                            </span>
                          </td>
                          <td>
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
                    {sortedInquiries.map(inq => (
                      <tr key={inq.id}>
                        <td><strong>{inq.id}</strong><br /><small className="text-muted">{inq.date}</small></td>
                        <td>
                          <strong>{resolveCustomerName(inq)}</strong>
                          <div className="text-muted text-xs"><Phone size={11} className="inline-icon" /> {inq.customerPhone}</div>
                        </td>
                        <td style={{ maxWidth: '170px', wordBreak: 'break-word', whiteSpace: 'normal' }}><MapPin size={13} className="text-green inline-icon" /> {inq.pickup}</td>
                        <td style={{ maxWidth: '170px', wordBreak: 'break-word', whiteSpace: 'normal' }}><MapPin size={13} className="text-red inline-icon" /> {inq.dropoff}</td>
                        <td><span className="pill-badge-sm" style={{ whiteSpace: 'nowrap', fontWeight: '700' }}>{inq.vehicle}</span></td>
                        <td>
                          <strong className="text-green">₹{Number(inq.fare).toFixed(2)}</strong>
                          {inq.walletDiscountUsed > 0 && (
                            <div style={{ fontSize: '11px', color: '#059669', fontWeight: '800', marginTop: '2px', background: '#F0FDF4', padding: '2px 6px', borderRadius: '6px', border: '1px solid #BBF7D0', display: 'inline-block' }}>
                              🎁 Coupon Used: -₹{Number(inq.walletDiscountUsed).toFixed(2)}
                            </div>
                          )}
                          {inq.originalFare && inq.walletDiscountUsed > 0 && (
                            <div className="text-xs text-muted" style={{ textDecoration: 'line-through' }}>
                              Base: ₹{Number(inq.originalFare).toFixed(2)}
                            </div>
                          )}
                        </td>
                        <td>
                          {inq.driver && inq.driver !== '-' ? (
                            <span className="font-bold flex align-center gap-1"><UserCheck size={14} className="text-green" /> {inq.driver}</span>
                          ) : (
                            <span className="text-muted italic">Unassigned</span>
                          )}
                        </td>
                        <td>
                          <span className={`status-tag status-${inq.status.toLowerCase()}`}>
                            {inq.status}
                          </span>
                        </td>
                        <td style={{ whiteSpace: 'nowrap', minWidth: '340px' }}>
                          <div style={{ display: 'flex', alignItems: 'center', gap: '6px', flexWrap: 'nowrap' }}>
                            <button 
                              className="btn-action-view"
                              title="View Detailed Trip Receipt & Coupon Info"
                              style={{
                                background: '#EFF6FF',
                                color: '#1D4ED8',
                                border: '1px solid #BFDBFE',
                                padding: '6px 12px',
                                borderRadius: '16px',
                                fontSize: '12px',
                                fontWeight: '800',
                                cursor: 'pointer',
                                display: 'inline-flex',
                                alignItems: 'center',
                                gap: '4px',
                                whiteSpace: 'nowrap'
                              }}
                              onClick={() => setReceiptModal({ open: true, inquiry: inq })}
                            >
                              <Eye size={13} /> View Receipt
                            </button>
                            {inq.status === 'Pending' && (
                              <button 
                                className="btn-action-assign"
                                title="Confirm & Assign Driver"
                                style={{ whiteSpace: 'nowrap', display: 'inline-flex', alignItems: 'center', gap: '4px', padding: '6px 12px' }}
                                onClick={() => setAssignModal({ open: true, inquiry: inq })}
                              >
                                <UserCheck size={14} /> Assign Driver
                              </button>
                            )}

                            {inq.status !== 'Cancelled' && (
                              <button 
                                className="btn-action-cancel"
                                title="Cancel Booking"
                                style={{ whiteSpace: 'nowrap', display: 'inline-flex', alignItems: 'center', gap: '4px', padding: '6px 12px' }}
                                onClick={() => handleCancelInquiry(inq.id)}
                              >
                                <XCircle size={14} /> Cancel
                              </button>
                            )}
                            <button 
                              className="btn-action-delete"
                              title="Delete Inquiry Permanently"
                              style={{ whiteSpace: 'nowrap', display: 'inline-flex', alignItems: 'center', gap: '4px', padding: '6px 12px' }}
                              onClick={() => handleDeleteInquiry(inq.id)}
                            >
                              <Trash2 size={14} /> Delete
                            </button>
                          </div>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          </div>
        )}

        {/* TAB: FINAL TRIPS (Active Ride Pipeline & Reward Workflow) */}
        {activeTab === 'final_trips' && (
          <div className="tab-pane">
            <div className="pane-header flex justify-between align-center">
              <div>
                <h2>Final Trips Command Center</h2>
                <p>Manage live ongoing rides. Start trip, complete ride upon arrival, and assign rewards to customers.</p>
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
                      i.status === 'Confirmed' || 
                      i.status === 'In Progress' || 
                      i.status === 'On Ride' || 
                      (i.status === 'Completed' && !i.rewardIssued)
                    ).map((inq) => {
                      const isConfirmed = inq.status === 'Confirmed';
                      const isInProgress = inq.status === 'In Progress' || inq.status === 'On Ride';
                      const isCompletedPendingReward = inq.status === 'Completed' && !inq.rewardIssued;

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
                            {isCompletedPendingReward && <span className="status-tag status-active" style={{ padding: '6px 14px', borderRadius: '20px', fontWeight: '700', fontSize: '0.8rem', whiteSpace: 'nowrap' }}>Ride Finished</span>}
                          </td>
                          <td className="text-right" style={{ whiteSpace: 'nowrap', minWidth: '280px' }}>
                            <div style={{ display: 'flex', gap: '6px', justifyContent: 'flex-end', alignItems: 'center', flexWrap: 'nowrap' }}>
                              {/* 1. START TRIP BUTTON */}
                              {isConfirmed && (
                                <button 
                                  className="btn-action-start"
                                  onClick={() => handleStartTrip(inq.id)}
                                  title="Admin Start Ride"
                                  style={{ display: 'inline-flex', alignItems: 'center', gap: '6px', padding: '7px 14px', borderRadius: '16px', fontWeight: '800', fontSize: '0.82rem', whiteSpace: 'nowrap' }}
                                >
                                  <Play size={14} /> Start Trip
                                </button>
                              )}

                              {/* 2. COMPLETE TRIP BUTTON */}
                              {isInProgress && (
                                <button 
                                  className="btn-action-complete"
                                  onClick={() => handleCompleteTrip(inq.id)}
                                  title="Admin Complete Ride"
                                  style={{ display: 'inline-flex', alignItems: 'center', gap: '6px', padding: '7px 14px', borderRadius: '16px', fontWeight: '800', fontSize: '0.82rem', whiteSpace: 'nowrap' }}
                                >
                                  <CheckCircle size={14} /> Complete Trip
                                </button>
                              )}

                              {/* 3. ASSIGN REWARD BUTTON */}
                              {isCompletedPendingReward && (
                                <button 
                                  className="btn-action-reward"
                                  onClick={() => setRewardModal({ open: true, inquiry: inq, amount: 100 })}
                                  title="Assign Wallet Reward to Customer"
                                  style={{ display: 'inline-flex', alignItems: 'center', gap: '6px', padding: '7px 14px', borderRadius: '16px', fontWeight: '800', fontSize: '0.82rem', whiteSpace: 'nowrap' }}
                                >
                                  <Gift size={14} /> Assign Reward
                                </button>
                              )}

                              <button 
                                className="btn-action-view"
                                onClick={() => setReceiptModal({ open: true, inquiry: inq })}
                                title="View Trip Details"
                                style={{ display: 'inline-flex', alignItems: 'center', gap: '6px', padding: '7px 12px', borderRadius: '16px', fontWeight: '800', fontSize: '0.82rem', whiteSpace: 'nowrap' }}
                              >
                                <Eye size={14} /> View
                              </button>
                            </div>
                          </td>
                        </tr>
                      );
                    })}

                    {sortedInquiries.filter(i => 
                      i.status === 'Confirmed' || 
                      i.status === 'In Progress' || 
                      i.status === 'On Ride' || 
                      (i.status === 'Completed' && !i.rewardIssued)
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
                    {sortedInquiries.filter(i => i.status === 'Completed').map((inq) => (
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
                          {inq.rewardIssued ? (
                            <span className="status-tag status-confirmed" style={{ whiteSpace: 'nowrap' }}>✓ ₹{inq.rewardAmount || 100} Credited</span>
                          ) : (
                            <span className="status-tag status-pending" style={{ whiteSpace: 'nowrap' }}>Reward Pending</span>
                          )}
                        </td>
                        <td className="text-right" style={{ whiteSpace: 'nowrap', minWidth: '220px' }}>
                          <div style={{ display: 'flex', gap: '6px', justifyContent: 'flex-end', alignItems: 'center', flexWrap: 'nowrap' }}>
                            {(!inq.rewardIssued || Number(inq.rewardIssued) !== 1) && (
                              <button 
                                className="btn-action-reward"
                                onClick={() => setRewardModal({ open: true, inquiry: inq, amount: 100 })}
                                title="Assign Wallet Reward to Customer"
                                style={{ display: 'inline-flex', alignItems: 'center', gap: '6px', padding: '6px 12px', borderRadius: '16px', fontWeight: '800', fontSize: '0.82rem', whiteSpace: 'nowrap' }}
                              >
                                🎁 Reward
                              </button>
                            )}
                            <button 
                              className="btn-action-view"
                              onClick={() => setReceiptModal({ open: true, inquiry: inq })}
                              title="View Full Trip Details & Receipt"
                              style={{ display: 'inline-flex', alignItems: 'center', gap: '6px', padding: '6px 12px', borderRadius: '16px', fontWeight: '800', fontSize: '0.82rem', whiteSpace: 'nowrap' }}
                            >
                              <Eye size={14} /> View Details
                            </button>
                          </div>
                        </td>
                      </tr>
                    ))}

                    {sortedInquiries.filter(i => i.status === 'Completed').length === 0 && (
                      <tr>
                        <td colSpan={7} className="text-center text-muted p-4">
                          No completed success trips in database history yet.
                        </td>
                      </tr>
                    )}
                  </tbody>
                </table>
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
                <p className="text-muted text-sm mb-3">Purge demo records or completely reset all inquiries and customer data stored in Hostinger Remote MySQL Database.</p>
                <div className="flex gap-3 flex-wrap">
                  <button type="button" className="btn btn-outline" onClick={handlePurgeDemoDatabaseData}>
                    <RefreshCw size={16} /> Purge Demo & Test Records
                  </button>
                  <button type="button" className="btn btn-danger" style={{ backgroundColor: '#ef4444', color: '#fff', border: 'none' }} onClick={handlePurgeAllDatabaseData}>
                    <Trash2 size={16} /> Wipe All System Data
                  </button>
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
              <select value={selectedDriverId} onChange={e => setSelectedDriverId(e.target.value)}>
                <option value="">-- Choose Driver --</option>
                {drivers.map(d => (
                  <option key={d.id} value={d.id}>
                    {d.name} ({d.vehicle}) - [{d.status}]
                  </option>
                ))}
              </select>
            </div>

            <div className="modal-actions-flex mt-4">
              <button className="btn btn-outline" onClick={() => setAssignModal({ open: false, inquiry: null })}>Cancel</button>
              <button className="btn btn-primary" onClick={handleConfirmInquiry}>Confirm & Dispatch Money to Report</button>
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
                style={{ background: 'linear-gradient(135deg, #34D399 0%, #10B981 100%)', border: 'none', fontFamily: 'League Spartan', fontSize: '15px', fontWeight: '800' }} 
                onClick={handleIssueRewardSubmit}
              >
                🎁 Credit ₹{rewardModal.amount || 0} Reward
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
                <button type="submit" className="btn btn-primary">Create Booking Inquiry</button>
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
                  <h3 style={{ margin: 0, fontSize: '18px', fontWeight: '800' }}>Empire Cab - Detailed Trip Receipt</h3>
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

            {/* Admin Reward Status & Profit Split */}
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px', marginBottom: '24px' }}>
              <div style={{ background: '#EEF2FF', padding: '12px', borderRadius: '12px', border: '1px solid #C7D2FE' }}>
                <small style={{ color: '#4338CA', fontWeight: '800', fontSize: '11px', display: 'block' }}>Admin Reward Status</small>
                <div style={{ fontSize: '13px', fontWeight: '800', color: '#3730A3', marginTop: '2px' }}>
                  {(receiptModal.inquiry.rewardIssued == 1 || receiptModal.inquiry.rewardIssued === true) ? (
                    `✓ ₹${receiptModal.inquiry.rewardAmount || 100} Reward Issued`
                  ) : (
                    'Pending Award'
                  )}
                </div>
              </div>

              <div style={{ background: '#F5F3FF', padding: '12px', borderRadius: '12px', border: '1px solid #DDD6FE' }}>
                <small style={{ color: '#6D28D9', fontWeight: '800', fontSize: '11px', display: 'block' }}>Commission Split</small>
                <div style={{ fontSize: '12px', color: '#5B21B6', marginTop: '2px', fontWeight: '700' }}>
                  Driver ({driverShare}%): ₹{(Number(receiptModal.inquiry.fare) * (driverShare / 100)).toFixed(2)}<br />
                  Company ({companyShare}%): ₹{(Number(receiptModal.inquiry.fare) * (companyShare / 100)).toFixed(2)}
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
    </div>
  );
}
