// Hostinger Remote MySQL Database Service Engine for EMPERIAL CABS Ecosystem
// Host: srv1671.hstgr.io | Database: u889282535_taxi | Central Backend API: taxii-yth5.vercel.app

const getApiEndpoints = () => {
  const primaryApi = 'https://emperialcabs.com/api/db.php';
  const secondaryApi = 'https://emperialcabs.com/api/db';
  if (typeof window !== 'undefined' && window.location) {
    const host = window.location.hostname.toLowerCase();
    if (host.includes('emperialcabs.com') || host.includes('localhost') || host.includes('127.0.0.1')) {
      return ['/api/db.php', '/api/db', primaryApi];
    }
  }
  return [primaryApi, secondaryApi, '/api/db.php'];
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

