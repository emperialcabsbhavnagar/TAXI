// Hostinger Remote MySQL Central Database Sync Engine for EMPERIAL CABS Ecosystem (Website, Android, iPhone)
// Host: srv1671.hstgr.io | DB: u889282535_taxi

import {
  saveInquiryToMySQL,
  saveCustomerToMySQL,
  loadAllInquiriesFromMySQL,
  loadAllCustomersFromMySQL,
  saveWalletToMySQL,
  loadWalletFromMySQL
} from './mysqlService';

import {
  saveInquiryToFirestore,
  saveCustomerToFirestore
} from './firebaseService';

// Local cache keys
const STORAGE_KEYS = {
  INQUIRIES: 'cabsy_inquiries',
  DESTINATIONS: 'cabsy_destinations',
  VEHICLES: 'cabsy_vehicles',
  DRIVERS: 'cabsy_drivers',
  CUSTOMERS: 'cabsy_customers',
  OWNER: 'cabsy_owner_info'
};

class DatabaseService {
  constructor() {
    this.initDatabase();
  }

  initDatabase() {
    // Background sync from Hostinger MySQL
    this.syncFromCloud();
  }

  async syncFromCloud() {
    try {
      const [cloudInquiries, cloudCustomers] = await Promise.all([
        loadAllInquiriesFromMySQL().catch(() => []),
        loadAllCustomersFromMySQL().catch(() => [])
      ]);

      if (Array.isArray(cloudInquiries) && cloudInquiries.length > 0) {
        localStorage.setItem(STORAGE_KEYS.INQUIRIES, JSON.stringify(cloudInquiries));
      }
      if (Array.isArray(cloudCustomers) && cloudCustomers.length > 0) {
        localStorage.setItem(STORAGE_KEYS.CUSTOMERS, JSON.stringify(cloudCustomers));
      }
    } catch (e) {
      console.warn('MySQL cloud sync warning:', e);
    }
  }

  // Inquiries / Bookings API
  getInquiries() {
    try {
      const data = localStorage.getItem(STORAGE_KEYS.INQUIRIES);
      const list = data ? JSON.parse(data) : [];
      return Array.isArray(list) ? list.filter(i => i.id !== 'INQ-3376' && i.id !== 3376) : [];
    } catch (e) {
      return [];
    }
  }

  saveInquiry(inquiry) {
    const inquiries = this.getInquiries();
    const existingIdx = inquiries.findIndex(i => i.id && inquiry.id && i.id === inquiry.id);
    const newInquiry = {
      id: inquiry.id || ('INQ-' + Math.floor(1000 + Math.random() * 9000)),
      timestamp: new Date().toISOString(),
      date: new Date().toLocaleString('en-IN', { timeZone: 'Asia/Kolkata' }),
      status: 'Pending',
      ...inquiry
    };
    if (existingIdx >= 0) {
      inquiries[existingIdx] = newInquiry;
    } else {
      inquiries.unshift(newInquiry);
    }
    localStorage.setItem(STORAGE_KEYS.INQUIRIES, JSON.stringify(inquiries));
    
    // Auto sync customer in Hostinger MySQL central database
    if (newInquiry.customerName || newInquiry.customerPhone) {
      this.saveCustomer({
        name: newInquiry.customerName,
        phone: newInquiry.customerPhone,
        email: newInquiry.customerEmail
      });
    }

    // Auto sync inquiry to Hostinger MySQL Database & Firestore
    saveInquiryToMySQL(newInquiry).catch(() => {});
    saveInquiryToFirestore(newInquiry).catch(() => {});

    // Dispatch real-time cross-platform event
    window.dispatchEvent(new CustomEvent('EMPERIAL CABS_db_sync', { detail: { type: 'INQUIRY_ADDED', data: newInquiry } }));
    return newInquiry;
  }

  deleteInquiry(id) {
    const inquiries = this.getInquiries().filter(i => i.id !== id);
    localStorage.setItem(STORAGE_KEYS.INQUIRIES, JSON.stringify(inquiries));
    window.dispatchEvent(new CustomEvent('EMPERIAL CABS_db_sync', { detail: { type: 'INQUIRY_DELETED', id } }));
  }

  // Customers API
  getCustomers() {
    try {
      const data = localStorage.getItem(STORAGE_KEYS.CUSTOMERS);
      return data ? JSON.parse(data) : [];
    } catch (e) {
      return [];
    }
  }

  getCustomerByPhone(phone) {
    if (!phone) return null;
    const cleanPhone = String(phone).replace(/\D/g, '').slice(-10);
    if (!cleanPhone) return null;
    try {
      // Check phone-indexed cache first
      const phoneCached = localStorage.getItem(`cabsy_user_profile_${cleanPhone}`);
      if (phoneCached) {
        const parsed = JSON.parse(phoneCached);
        if (parsed && parsed.name) return parsed;
      }
      // Fall back to customer registry
      const customers = this.getCustomers();
      return customers.find(c => {
        const cPhone = (c.phone || '').replace(/\D/g, '').slice(-10);
        return cPhone && cPhone === cleanPhone;
      }) || null;
    } catch (e) {
      return null;
    }
  }

  getCustomerByEmail(email) {
    if (!email) return null;
    const cleanEmail = email.toLowerCase().trim();
    try {
      const emailCached = localStorage.getItem(`cabsy_user_profile_email_${cleanEmail}`);
      if (emailCached) {
        const parsed = JSON.parse(emailCached);
        if (parsed && parsed.name) return parsed;
      }
      const customers = this.getCustomers();
      return customers.find(c => {
        const cEmail = (c.email || '').toLowerCase().trim();
        return cEmail && cEmail === cleanEmail;
      }) || null;
    } catch (e) {
      return null;
    }
  }

  saveCustomer(customerProfile) {
    if (!customerProfile || (!customerProfile.name && !customerProfile.phone && !customerProfile.email)) return null;
    
    const customers = this.getCustomers();
    const phoneKey = customerProfile.phone ? String(customerProfile.phone).replace(/\D/g, '') : '';
    const emailKey = customerProfile.email ? String(customerProfile.email).toLowerCase().trim() : '';

    const existingIdx = Array.isArray(customers) ? customers.findIndex(c => {
      if (!c) return false;
      const cPhone = c.phone ? String(c.phone).replace(/\D/g, '') : '';
      const cEmail = c.email ? String(c.email).toLowerCase().trim() : '';
      return (phoneKey && cPhone && phoneKey === cPhone) || (emailKey && cEmail && emailKey === cEmail);
    }) : -1;

    const inquiries = this.getInquiries();
    const customerInquiries = Array.isArray(inquiries) ? inquiries.filter(i => {
      if (!i) return false;
      const iPhone = i.customerPhone ? String(i.customerPhone).replace(/\D/g, '') : '';
      const iEmail = i.customerEmail ? String(i.customerEmail).toLowerCase().trim() : '';
      return (phoneKey && iPhone && phoneKey === iPhone) || (emailKey && iEmail && emailKey === iEmail);
    }) : [];

    const totalRides = customerInquiries.length;
    const totalSpent = customerInquiries.reduce((sum, i) => sum + (parseFloat(i.fare) || 0), 0);

    const updatedCustomer = {
      id: existingIdx >= 0 ? customers[existingIdx].id : 'CUST-' + Math.floor(10000 + Math.random() * 90000),
      name: customerProfile.name || 'Rider',
      email: customerProfile.email || 'user@empirecab.in',
      phone: customerProfile.phone || '+91 98765 43210',
      photoURL: customerProfile.photoURL || null,
      registeredAt: existingIdx >= 0 ? customers[existingIdx].registeredAt : new Date().toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' }),
      totalRides,
      totalSpent: `₹${totalSpent.toLocaleString('en-IN')}`,
      totalSpentNum: totalSpent,
      status: 'Active',
      lastLogin: new Date().toISOString()
    };

    if (existingIdx >= 0) {
      customers[existingIdx] = { ...customers[existingIdx], ...updatedCustomer };
    } else {
      customers.unshift(updatedCustomer);
    }

    localStorage.setItem(STORAGE_KEYS.CUSTOMERS, JSON.stringify(customers));
    if (updatedCustomer.email) {
      try {
        localStorage.setItem(`cabsy_user_profile_email_${updatedCustomer.email.toLowerCase().trim()}`, JSON.stringify(updatedCustomer));
      } catch (e) {}
    }
    
    // Auto-sync customer profile to Hostinger MySQL Database & Firestore
    saveCustomerToMySQL(updatedCustomer).catch(() => {});
    saveCustomerToFirestore(updatedCustomer).catch(() => {});

    window.dispatchEvent(new CustomEvent('EMPERIAL CABS_db_sync', { detail: { type: 'CUSTOMER_UPDATED', data: updatedCustomer } }));
    return updatedCustomer;
  }

  // Customer Wallet & Reward Engine
  getCustomerWallet(phone) {
    const cleanPhone = phone ? String(phone).replace(/\D/g, '').slice(-10) : 'default';
    const key = `cabsy_wallet_${cleanPhone}`;
    try {
      const saved = localStorage.getItem(key);
      if (saved) {
        return JSON.parse(saved);
      }
    } catch (e) {}

    // Initial wallet balance for customer (Zero demo/hardcoded data)
    const initialWallet = {
      balance: 0,
      transactions: []
    };
    try {
      localStorage.setItem(key, JSON.stringify(initialWallet));
    } catch (e) {}
    return initialWallet;
  }

  saveCustomerWallet(phone, walletData) {
    const cleanPhone = phone ? String(phone).replace(/\D/g, '').slice(-10) : 'default';
    const key = `cabsy_wallet_${cleanPhone}`;
    try {
      localStorage.setItem(key, JSON.stringify(walletData));
      window.dispatchEvent(new Event('storage'));
      window.dispatchEvent(new CustomEvent('EMPERIAL CABS_wallet_updated', { detail: walletData }));
    } catch (e) {}

    // Auto-sync wallet to Hostinger MySQL Database
    if (cleanPhone && cleanPhone !== 'default') {
      saveWalletToMySQL(cleanPhone, walletData.balance, walletData.transactions).catch(() => {});
    }
  }

  addRewardToCustomer(phone, rewardAmount, inquiryId, pickup, dropoff) {
    const wallet = this.getCustomerWallet(phone);
    const amountNum = Number(rewardAmount) || 0;
    wallet.balance += amountNum;
    
    let title = 'Trip Reward';
    if (pickup && dropoff) {
      const p = pickup.split(',')[0].trim();
      const d = dropoff.split(',')[0].trim();
      title = `Trip Reward (${p} → ${d})`;
    }

    wallet.transactions.unshift({
      title,
      date: new Date().toLocaleDateString('en-IN'),
      amount: `+₹${amountNum.toFixed(2)}`,
      type: 'credit',
      inquiryId
    });
    this.saveCustomerWallet(phone, wallet);
    return wallet;
  }

  deductWalletBalance(phone, amountToDeduct, inquiryId) {
    const wallet = this.getCustomerWallet(phone);
    const amountNum = Number(amountToDeduct) || 0;
    wallet.balance = Math.max(0, wallet.balance - amountNum);
    wallet.transactions.unshift({
      title: `Booking Reward Used`,
      date: new Date().toLocaleDateString('en-IN'),
      amount: `-₹${amountNum.toFixed(2)}`,
      type: 'debit',
      inquiryId
    });
    this.saveCustomerWallet(phone, wallet);
    return wallet;
  }

  refundWalletCoins(phone, amountToRefund, inquiryId, pickup, dropoff) {
    const amountNum = Number(amountToRefund) || 0;
    if (amountNum <= 0) return null;

    const wallet = this.getCustomerWallet(phone);

    // Guard against duplicate refunds for the same inquiry
    const alreadyRefunded = wallet.transactions && wallet.transactions.some(t => 
      t.inquiryId === inquiryId && (t.title.includes('Cancelled') || t.title.includes('Refund'))
    );
    if (alreadyRefunded) return wallet;

    wallet.balance += amountNum;

    let title = 'Trip Cancelled - Coins Refunded';
    if (pickup && dropoff) {
      const p = pickup.split(',')[0].trim();
      const d = dropoff.split(',')[0].trim();
      title = `Cancelled Refund (${p} → ${d})`;
    }

    if (!wallet.transactions) wallet.transactions = [];
    wallet.transactions.unshift({
      title,
      date: new Date().toLocaleDateString('en-IN'),
      amount: `+₹${amountNum.toFixed(2)}`,
      type: 'credit',
      inquiryId
    });

    this.saveCustomerWallet(phone, wallet);
    return wallet;
  }

  async reconcileCustomerWallet(phone) {
    const cleanPhone = phone ? String(phone).replace(/\D/g, '').slice(-10) : '';
    if (!cleanPhone) return this.getCustomerWallet(phone);

    // 1. Fetch current wallet (local or cloud)
    let wallet = this.getCustomerWallet(phone);
    try {
      const cloudW = await loadWalletFromMySQL(cleanPhone);
      if (cloudW && (cloudW.balance > 0 || (cloudW.transactions && cloudW.transactions.length > 0))) {
        wallet = cloudW;
      }
    } catch (e) {}

    // 2. Fetch all inquiries to check if any inquiry with rewardIssued = 1 is missing from transactions
    let allInquiries = [];
    try {
      allInquiries = await loadAllInquiriesFromMySQL();
    } catch (e) {}
    if (!allInquiries || allInquiries.length === 0) {
      allInquiries = this.getInquiries();
    }

    const customerInquiries = allInquiries.filter(inq => {
      const p = inq.customerPhone ? String(inq.customerPhone).replace(/\D/g, '').slice(-10) : '';
      return p === cleanPhone && (inq.rewardIssued == 1 || inq.rewardIssued === true);
    });

    let updated = false;
    for (const inq of customerInquiries) {
      const exists = wallet.transactions.some(t => t.inquiryId === inq.id || (t.title && t.title.includes(inq.id)));
      if (!exists) {
        const rewardAmt = Number(inq.rewardAmount) || 100;
        wallet.balance += rewardAmt;
        
        let title = 'Trip Reward';
        if (inq.pickup && inq.dropoff) {
          const p = inq.pickup.split(',')[0].trim();
          const d = inq.dropoff.split(',')[0].trim();
          title = `Trip Reward (${p} → ${d})`;
        }

        wallet.transactions.unshift({
          title,
          date: inq.date || new Date().toLocaleDateString('en-IN'),
          amount: `+₹${rewardAmt.toFixed(2)}`,
          type: 'credit',
          inquiryId: inq.id
        });
        updated = true;
      }
    }

    // 3. Audit for cancelled trips that used coupon/wallet coins and haven't been refunded yet
    const cancelledInquiriesWithDiscount = allInquiries.filter(inq => {
      const p = inq.customerPhone ? String(inq.customerPhone).replace(/\D/g, '').slice(-10) : '';
      const inqStatus = (inq.status || '').toLowerCase();
      const hasDiscount = Number(inq.walletDiscountUsed) > 0;
      return p === cleanPhone && (inqStatus.includes('cancel') || inqStatus.includes('reject')) && hasDiscount;
    });

    for (const inq of cancelledInquiriesWithDiscount) {
      const alreadyRefunded = wallet.transactions && wallet.transactions.some(t => 
        t.inquiryId === inq.id && (t.title.includes('Cancelled') || t.title.includes('Refund'))
      );
      if (!alreadyRefunded) {
        const refundAmt = Number(inq.walletDiscountUsed) || 0;
        wallet.balance += refundAmt;
        let title = 'Trip Cancelled - Coins Refunded';
        if (inq.pickup && inq.dropoff) {
          const p = inq.pickup.split(',')[0].trim();
          const d = inq.dropoff.split(',')[0].trim();
          title = `Cancelled Refund (${p} → ${d})`;
        }
        if (!wallet.transactions) wallet.transactions = [];
        wallet.transactions.unshift({
          title,
          date: inq.date || new Date().toLocaleDateString('en-IN'),
          amount: `+₹${refundAmt.toFixed(2)}`,
          type: 'credit',
          inquiryId: inq.id
        });
        updated = true;
      }
    }

    // Clean any old transaction titles that had inquiry code (INQ-xxxx) in them
    let cleanedOld = false;
    if (wallet.transactions && wallet.transactions.length > 0) {
      wallet.transactions = wallet.transactions.map(t => {
        if (t.title && (t.title.includes('INQ-') || t.title.includes('('))) {
          const newTitle = t.title.replace(/\s*\(INQ-[^)]+\)/gi, '').replace(/\s*INQ-\d+/gi, '');
          if (newTitle !== t.title) cleanedOld = true;
          return { ...t, title: newTitle };
        }
        return t;
      });
    }

    if (updated || cleanedOld) {
      this.saveCustomerWallet(phone, wallet);
    } else {
      const key = `cabsy_wallet_${cleanPhone}`;
      try { localStorage.setItem(key, JSON.stringify(wallet)); } catch (e) {}
    }
    return wallet;
  }

  clearAllDemoData() {
    localStorage.setItem(STORAGE_KEYS.INQUIRIES, JSON.stringify([]));
    localStorage.setItem(STORAGE_KEYS.DRIVERS, JSON.stringify([]));
    localStorage.setItem(STORAGE_KEYS.CUSTOMERS, JSON.stringify([]));
    window.dispatchEvent(new CustomEvent('EMPERIAL CABS_db_sync', { detail: { type: 'DEMO_DATA_CLEARED' } }));
  }
}

export const db = new DatabaseService();
export default db;
