// Hostinger Remote MySQL Database Service Engine for EMPERIAL CABS Ecosystem
// Host: srv1671.hstgr.io | Database: u889282535_taxi | Central Backend API: taxii-yth5.vercel.app

const getApiEndpoints = () => {
  const primaryApi = 'https://emperialcabs.com/api/db.php';
  const secondaryApi = 'https://emperialcabs.com/api/db';

  // On native Capacitor app (Android/iOS APK), ALWAYS use absolute URLs.
  // The embedded WebView serves static files — relative paths like /api/db.php
  // resolve to capacitor://localhost/api/db.php (a static file, not a PHP server).
  if (typeof window !== 'undefined') {
    const isNative = (
      window.Capacitor?.isNativePlatform?.() ||
      window.Capacitor?.isNative ||
      window.Capacitor?.platform === 'android' ||
      window.Capacitor?.platform === 'ios' ||
      window.location?.protocol === 'capacitor:' ||
      window.location?.protocol === 'ionic:'
    );
    if (isNative) {
      return [primaryApi, secondaryApi];
    }

    // On the live domain (emperialcabs.com), prefer relative paths (same-origin, faster)
    const host = window.location?.hostname?.toLowerCase() || '';
    if (host.includes('emperialcabs.com')) {
      return ['/api/db.php', '/api/db', primaryApi];
    }

    // Local dev (localhost / 127.0.0.1) — must use Vite proxy '/api/db'
    if (host.includes('localhost') || host.includes('127.0.0.1')) {
      return ['/api/db', primaryApi];
    }
  }

  return [primaryApi, secondaryApi];
};

const sendRequest = async (action, data = {}) => {
  const endpoints = getApiEndpoints();
  let lastError = null;

  for (const endpoint of endpoints) {
    try {
      const res = await fetch(endpoint, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({ action, data })
      });

      const contentType = res.headers.get('content-type') || '';
      if (contentType.includes('application/json')) {
        const json = await res.json();
        if (json && json.success) {
          return json;
        }
        if (json && json.error) {
          lastError = json.error;
        }
      }
    } catch (err) {
      lastError = err;
    }
  }

  // Seamless Local Storage Fallback if Hostinger Database is rate-limited or unreachable
  if (action === 'getInquiries') {
    try {
      const saved = localStorage.getItem('cabsy_inquiries');
      if (saved) {
        return { success: true, inquiries: JSON.parse(saved), fallback: true };
      }
    } catch (e) {}
  } else if (action === 'getCustomers') {
    try {
      const saved = localStorage.getItem('cabsy_user_profile');
      if (saved) {
        return { success: true, customers: [JSON.parse(saved)], fallback: true };
      }
    } catch (e) {}
  }

  return { success: false, error: lastError ? (lastError.message || String(lastError)) : 'Database offline' };
};

/**
 * Initialize Hostinger MySQL Database Tables & Schema
 */
export const initMySQLTables = async () => {
  return await sendRequest('init');
};

/**
 * Save an inquiry to Hostinger MySQL database
 */
export const saveInquiryToMySQL = async (inquiry) => {
  if (!inquiry) return null;
  const res = await sendRequest('saveInquiry', inquiry);
  return res.success;
};

/**
 * Load all inquiries from Hostinger MySQL database
 */
export const loadAllInquiriesFromMySQL = async () => {
  const res = await sendRequest('getInquiries');
  return res.success && Array.isArray(res.inquiries) ? res.inquiries : [];
};

/**
 * Save customer profile to Hostinger MySQL database
 */
export const saveCustomerToMySQL = async (customer) => {
  if (!customer || (!customer.name && !customer.phone && !customer.email)) return null;
  const cleanCustomer = {
    ...customer,
    totalRides: (Number.isNaN(Number(customer.totalRides)) || !customer.totalRides) ? 0 : Number(customer.totalRides),
    totalSpent: (Number.isNaN(Number(customer.totalSpent)) || !customer.totalSpent) ? 0 : Number(customer.totalSpent)
  };
  const res = await sendRequest('saveCustomer', cleanCustomer);
  return res.success;
};

/**
 * Load all customers from Hostinger MySQL database
 */
export const loadAllCustomersFromMySQL = async () => {
  const res = await sendRequest('getCustomers');
  return res.success && Array.isArray(res.customers) ? res.customers : [];
};

/**
 * Update inquiry status in Hostinger MySQL database
 */
export const updateInquiryStatusInMySQL = async (inquiryId, status, driverName, vehicleName, fare, rewardIssued, rewardAmount) => {
  if (!inquiryId) return false;
  const res = await sendRequest('updateInquiryStatus', {
    id: inquiryId,
    status,
    driver: driverName,
    vehicle: vehicleName,
    fare,
    rewardIssued,
    rewardAmount
  });
  return res.success;
};

/**
 * Update inquiry reward status in Hostinger MySQL database
 */
export const updateInquiryRewardInMySQL = async (inquiryId, rewardIssued, rewardAmount) => {
  if (!inquiryId) return false;
  const res = await sendRequest('updateInquiryReward', {
    id: inquiryId,
    rewardIssued: rewardIssued ? 1 : 0,
    rewardAmount: Number(rewardAmount || 0)
  });
  return res.success;
};

/**
 * Save customer wallet to Hostinger MySQL database
 */
export const saveWalletToMySQL = async (phone, balance, transactions) => {
  if (!phone) return false;
  const res = await sendRequest('saveWallet', { phone, balance, transactions });
  return res.success;
};

/**
 * Load customer wallet from Hostinger MySQL database
 */
export const loadWalletFromMySQL = async (phone) => {
  if (!phone) return { balance: 0, transactions: [] };
  const res = await sendRequest('getWallet', { phone });
  return res.success && res.wallet ? res.wallet : { balance: 0, transactions: [] };
};

/**
 * Delete inquiry from Hostinger MySQL database
 */
export const deleteInquiryFromMySQL = async (inquiryId) => {
  if (!inquiryId) return false;
  const res = await sendRequest('deleteInquiry', { id: inquiryId });
  return res.success;
};

/**
 * Delete customer profile from Hostinger MySQL database
 */
export const deleteCustomerFromMySQL = async (customerId) => {
  if (!customerId) return false;
  const res = await sendRequest('deleteCustomer', { id: customerId });
  return res.success;
};

/**
 * Purge demo data from Hostinger MySQL database
 */
export const purgeDemoDataFromMySQL = async () => {
  const res = await sendRequest('purgeDemoData');
  return res.success;
};

/**
 * Purge ALL inquiries and customers from Hostinger MySQL database
 */
export const purgeAllDataFromMySQL = async () => {
  const res = await sendRequest('purgeAllData');
  return res.success;
};

/**
 * Load all fleet vehicles from Hostinger MySQL database
 */
export const loadAllVehiclesFromMySQL = async () => {
  const res = await sendRequest('getVehicles');
  return res && res.success && Array.isArray(res.vehicles) ? res.vehicles : [];
};

/**
 * Save / Update a vehicle in Hostinger MySQL database
 */
export const saveVehicleToMySQL = async (vehicle) => {
  if (!vehicle) return false;
  const res = await sendRequest('saveVehicle', vehicle);
  return res && res.success;
};

/**
 * Delete a vehicle from Hostinger MySQL database
 */
export const deleteVehicleFromMySQL = async (vehicleId) => {
  if (!vehicleId) return false;
  const res = await sendRequest('deleteVehicle', { id: vehicleId });
  return res && res.success;
};

/**
 * Places Management
 */
export const loadAllPlacesFromMySQL = async () => {
  const res = await sendRequest('getPlaces');
  return res && res.success && Array.isArray(res.places) ? res.places : [];
};

export const savePlaceToMySQL = async (name) => {
  if (!name) return false;
  const res = await sendRequest('savePlace', { name });
  return res && res.success;
};

export const deletePlaceFromMySQL = async (name) => {
  if (!name) return false;
  const res = await sendRequest('deletePlace', { name });
  return res && res.success;
};

export const seedGujaratPlacesToMySQL = async () => {
  const res = await sendRequest('seedGujaratPlaces');
  return res && res.success;
};

// High-Scale In-Memory Route & Storage Cache
const routeMemoryCache = new Map();
const inMemoryStore = new Map();

/**
 * Safe LocalStorage setter that never throws QuotaExceededError
 * and keeps an in-memory backup for high-scale datasets (10K+ routes, 5K+ cars).
 */
export const safeStorageSetItem = (key, data, maxSlice = 100) => {
  if (typeof window === 'undefined') return;
  try {
    inMemoryStore.set(key, data);
    
    // For large arrays (like 10,000 routes or 5,000 vehicles), only store a compact slice in localStorage to prevent 5MB overflow
    let payload = data;
    if (Array.isArray(data) && data.length > maxSlice) {
      payload = data.slice(0, maxSlice);
    }
    const str = JSON.stringify(payload);
    // If serialized string is over 1MB, avoid storing in localStorage to protect quota
    if (str.length < 1000000) {
      localStorage.setItem(key, str);
    }
  } catch (e) {
    // Graceful fallback to in-memory store
  }
};

export const safeStorageGetItem = (key) => {
  if (inMemoryStore.has(key)) {
    return inMemoryStore.get(key);
  }
  if (typeof window === 'undefined') return null;
  try {
    const raw = localStorage.getItem(key);
    return raw ? JSON.parse(raw) : null;
  } catch (e) {
    return null;
  }
};

/**
 * Routes / Destinations Management
 */
export const loadAllRoutesFromMySQL = async () => {
  const res = await sendRequest('getRoutes');
  if (res && res.success && Array.isArray(res.routes)) {
    return res.routes.map(r => {
      let carPricesObj = {};
      if (r.car_prices) {
        if (typeof r.car_prices === 'object' && r.car_prices !== null) {
          carPricesObj = r.car_prices;
        } else if (typeof r.car_prices === 'string') {
          try {
            carPricesObj = JSON.parse(r.car_prices);
          } catch (e) {
            carPricesObj = {};
          }
        }
      }
      const item = {
        ...r,
        price: Number(r.price) || 0,
        car_prices: carPricesObj
      };
      if (r.pickup && r.dropoff) {
        const k1 = `${String(r.pickup).trim().toLowerCase()}_${String(r.dropoff).trim().toLowerCase()}`;
        const k2 = `${String(r.dropoff).trim().toLowerCase()}_${String(r.pickup).trim().toLowerCase()}`;
        routeMemoryCache.set(k1, item);
        routeMemoryCache.set(k2, item);
      }
      return item;
    });
  }
  return null;
};

/**
 * High-performance targeted single-route lookup by pickup and dropoff.
 * Executes in < 1ms via MySQL composite B-Tree index.
 * Results are cached in memory for sub-millisecond repeated queries.
 */
export const getRoutePriceFromMySQL = async (pickup, dropoff) => {
  if (!pickup || !dropoff) return null;
  const p = String(pickup).trim().toLowerCase();
  const d = String(dropoff).trim().toLowerCase();
  const cacheKey = `${p}_${d}`;
  const reverseKey = `${d}_${p}`;

  if (routeMemoryCache.has(cacheKey)) {
    return routeMemoryCache.get(cacheKey);
  }
  if (routeMemoryCache.has(reverseKey)) {
    return routeMemoryCache.get(reverseKey);
  }

  const res = await sendRequest('getRoutePrice', { pickup, dropoff });
  if (res && res.success && res.route) {
    const r = res.route;
    let carPricesObj = {};
    if (r.car_prices) {
      if (typeof r.car_prices === 'object' && r.car_prices !== null) {
        carPricesObj = r.car_prices;
      } else if (typeof r.car_prices === 'string') {
        try {
          carPricesObj = JSON.parse(r.car_prices);
        } catch (e) {
          carPricesObj = {};
        }
      }
    }
    const parsed = {
      ...r,
      price: Number(r.price) || 0,
      car_prices: carPricesObj
    };
    routeMemoryCache.set(cacheKey, parsed);
    routeMemoryCache.set(reverseKey, parsed);
    return parsed;
  }
  return null;
};

export const saveRouteToMySQL = async (route) => {
  if (!route) return false;
  const res = await sendRequest('saveRoute', route);
  if (res && res.success && route.pickup && route.dropoff) {
    const k1 = `${String(route.pickup).trim().toLowerCase()}_${String(route.dropoff).trim().toLowerCase()}`;
    const k2 = `${String(route.dropoff).trim().toLowerCase()}_${String(route.pickup).trim().toLowerCase()}`;
    routeMemoryCache.set(k1, route);
    routeMemoryCache.set(k2, route);
  }
  return res && res.success;
};

export const saveRoutesBatchToMySQL = async (routes) => {
  if (!Array.isArray(routes) || routes.length === 0) return false;
  const res = await sendRequest('saveRoutesBatch', { routes });
  if (res && res.success) {
    routes.forEach(route => {
      if (route.pickup && route.dropoff) {
        const k1 = `${String(route.pickup).trim().toLowerCase()}_${String(route.dropoff).trim().toLowerCase()}`;
        const k2 = `${String(route.dropoff).trim().toLowerCase()}_${String(route.pickup).trim().toLowerCase()}`;
        routeMemoryCache.set(k1, route);
        routeMemoryCache.set(k2, route);
      }
    });
  }
  return res && res.success;
};

export const deleteRouteFromMySQL = async (routeIdOrPickup, dropoff) => {
  let payload = {};
  if (dropoff) {
    payload = { pickup: routeIdOrPickup, dropoff };
  } else {
    payload = { id: routeIdOrPickup };
  }
  routeMemoryCache.clear();
  const res = await sendRequest('deleteRoute', payload);
  return res && res.success;
};

export const clearAllRoutesFromMySQL = async () => {
  routeMemoryCache.clear();
  const res = await sendRequest('clearAllRoutes');
  return res && res.success;
};

/**
 * Drivers Management
 */
export const loadAllDriversFromMySQL = async () => {
  const res = await sendRequest('getDrivers');
  return res && res.success && Array.isArray(res.drivers) ? res.drivers : [];
};

export const saveDriverToMySQL = async (driver) => {
  if (!driver) return false;
  const res = await sendRequest('saveDriver', driver);
  return res && res.success;
};

export const deleteDriverFromMySQL = async (driverId) => {
  if (!driverId) return false;
  const res = await sendRequest('deleteDriver', { id: driverId });
  return res && res.success;
};

/**
 * Contact Messages Management
 */
export const loadAllContactMessagesFromMySQL = async () => {
  const res = await sendRequest('getContactMessages');
  return res && res.success && Array.isArray(res.messages) ? res.messages : [];
};

export const saveContactMessageToMySQL = async (message) => {
  if (!message) return false;
  const res = await sendRequest('saveContactMessage', message);
  return res && res.success;
};

export const deleteContactMessageFromMySQL = async (messageId) => {
  if (!messageId) return false;
  const res = await sendRequest('deleteContactMessage', { id: messageId });
  return res && res.success;
};

export const updateContactMessageStatusInMySQL = async (messageId, status) => {
  if (!messageId) return false;
  const res = await sendRequest('updateContactMessageStatus', { id: messageId, status });
  return res && res.success;
};

/**
 * Settings & CMS Management
 */
export const loadSettingsFromMySQL = async () => {
  const res = await sendRequest('getSettings');
  return res && res.success && res.settings ? res.settings : null;
};

export const saveSettingToMySQL = async (key, value) => {
  if (!key) return false;
  const res = await sendRequest('saveSettings', { key, value });
  return res && res.success;
};


