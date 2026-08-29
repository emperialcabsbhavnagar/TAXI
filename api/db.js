import mysql from 'mysql2/promise';

// Hostinger Remote MySQL Database Connection Pool Configuration
const poolConfig = {
  host: process.env.MYSQL_HOST || 'srv2213.hstgr.io',
  user: process.env.MYSQL_USER || 'u217835086_TAXI',
  password: process.env.MYSQL_PASSWORD || 'Mahadev@0963',
  database: process.env.MYSQL_DATABASE || 'u217835086_TAXI',
  port: Number(process.env.MYSQL_PORT) || 3306,
  waitForConnections: true,
  connectionLimit: 2, // Strictly capped to 2 to prevent hitting Hostinger max_user_connections
  maxIdle: 1,
  idleTimeout: 5000, // Immediately free idle connections back to Hostinger
  queueLimit: 10,
  connectTimeout: 8000,
  enableKeepAlive: true,
  keepAliveInitialDelay: 5000
};

if (!global._mysqlPool) {
  global._mysqlPool = mysql.createPool(poolConfig);
}
let pool = global._mysqlPool;

async function executeQuery(sql, params = []) {
  let retries = 2;
  while (retries >= 0) {
    try {
      return await pool.query(sql, params);
    } catch (err) {
      const errMsg = (err.message || '').toLowerCase();
      const errCode = err.code || '';
      
      const isConnectionLimit = errCode === 'ER_USER_LIMIT_REACHED' || 
                                errMsg.includes('max_user_connections') || 
                                errMsg.includes('too many connections') ||
                                errCode === 'POOL_ENQUEUED';
                                
      const isConnLost = errCode === 'PROTOCOL_CONNECTION_LOST' || 
                         errCode === 'ETIMEDOUT' || 
                         errCode === 'ECONNRESET';

      if ((isConnectionLimit || isConnLost) && retries > 0) {
        retries--;
        // Wait 350ms to allow Hostinger serverless connections to close naturally
        await new Promise(r => setTimeout(r, 350));
        try {
          if (global._mysqlPool) {
            await global._mysqlPool.end().catch(() => {});
          }
        } catch (e) {}
        global._mysqlPool = mysql.createPool(poolConfig);
        pool = global._mysqlPool;
      } else {
        throw err;
      }
    }
  }
}

function getStandardCustomerId(email, phone) {
  const cleanEmail = (email || '').toLowerCase().trim();
  const cleanPhone = (phone || '').replace(/\D/g, '');
  if (cleanEmail && !cleanEmail.endsWith('@empirecab.in')) {
    return `CUST-${cleanEmail.replace(/[^a-z0-9]/g, '_')}`;
  }
  if (cleanPhone) {
    return `CUST-${cleanPhone}`;
  }
  if (cleanEmail) {
    return `CUST-${cleanEmail.replace(/[^a-z0-9]/g, '_')}`;
  }
  return `CUST-guest_${Date.now()}`;
}

// Table Schema Initializer - Cached per lambda warm instance
let tablesEnsured = false;
async function ensureTablesExist() {
  if (tablesEnsured) return;
  try {
    await executeQuery(`
      CREATE TABLE IF NOT EXISTS inquiries (
        id VARCHAR(64) PRIMARY KEY,
        customerName VARCHAR(255),
        customerPhone VARCHAR(64),
        customerEmail VARCHAR(255),
        pickup TEXT,
        dropoff TEXT,
        vehicle VARCHAR(100),
        fare DECIMAL(10,2) DEFAULT 0.00,
        originalFare DECIMAL(10,2) DEFAULT 0.00,
        walletDiscountUsed DECIMAL(10,2) DEFAULT 0.00,
        tripType VARCHAR(100),
        scheduledDate VARCHAR(100),
        scheduledTime VARCHAR(100),
        driver VARCHAR(255) DEFAULT 'Unassigned',
        status VARCHAR(64) DEFAULT 'Pending',
        rewardIssued INT DEFAULT 0,
        rewardAmount DECIMAL(10,2) DEFAULT 0.00,
        paymentMethod VARCHAR(100) DEFAULT 'Cash',
        notes TEXT,
        timestamp VARCHAR(100),
        date VARCHAR(100),
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
      );
    `);

    await executeQuery(`ALTER TABLE inquiries ADD COLUMN IF NOT EXISTS rewardIssued INT DEFAULT 0;`).catch(() => {});
    await executeQuery(`ALTER TABLE inquiries ADD COLUMN IF NOT EXISTS rewardAmount DECIMAL(10,2) DEFAULT 0.00;`).catch(() => {});
    await executeQuery(`ALTER TABLE inquiries ADD COLUMN IF NOT EXISTS originalFare DECIMAL(10,2) DEFAULT 0.00;`).catch(() => {});
    await executeQuery(`ALTER TABLE inquiries ADD COLUMN IF NOT EXISTS walletDiscountUsed DECIMAL(10,2) DEFAULT 0.00;`).catch(() => {});
    await executeQuery(`ALTER TABLE inquiries ADD COLUMN IF NOT EXISTS paymentMethod VARCHAR(100) DEFAULT 'Cash';`).catch(() => {});
    await executeQuery(`ALTER TABLE inquiries ADD COLUMN IF NOT EXISTS notes TEXT;`).catch(() => {});

    await executeQuery(`
      CREATE TABLE IF NOT EXISTS customers (
        id VARCHAR(64) PRIMARY KEY,
        name VARCHAR(255),
        phone VARCHAR(64),
        email VARCHAR(255),
        photoURL TEXT,
        profession VARCHAR(100),
        area VARCHAR(255),
        totalRides INT DEFAULT 0,
        totalSpent DECIMAL(10,2) DEFAULT 0.00,
        registeredAt VARCHAR(64),
        lastLogin VARCHAR(100),
        status VARCHAR(64) DEFAULT 'Active',
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
      );
    `);

    await executeQuery(`
      CREATE TABLE IF NOT EXISTS customer_wallets (
        phone VARCHAR(64) PRIMARY KEY,
        balance DECIMAL(10,2) DEFAULT 0.00,
        transactions LONGTEXT,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
      );
    `);
    tablesEnsured = true;
  } catch (err) {
    console.warn('ensureTablesExist warning:', err);
  }
}

export async function handleMySQLRequest(action, data = {}) {
  try {
    await ensureTablesExist();

    switch (action) {
      case 'init': {
        return { success: true, message: 'Hostinger MySQL database initialized successfully.' };
      }

      case 'getInquiries': {
        const [rows] = await executeQuery('SELECT * FROM inquiries ORDER BY created_at DESC');
        return { success: true, inquiries: rows };
      }

      case 'saveInquiry': {
        const { id, customerName, customerPhone, customerEmail, pickup, dropoff, vehicle, fare, originalFare, walletDiscountUsed, tripType, scheduledDate, scheduledTime, driver, status, rewardIssued, rewardAmount, paymentMethod, notes, timestamp, date } = data;
        const sql = `
          INSERT INTO inquiries (id, customerName, customerPhone, customerEmail, pickup, dropoff, vehicle, fare, originalFare, walletDiscountUsed, tripType, scheduledDate, scheduledTime, driver, status, rewardIssued, rewardAmount, paymentMethod, notes, timestamp, date)
          VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
          ON DUPLICATE KEY UPDATE
            customerName = VALUES(customerName),
            customerPhone = VALUES(customerPhone),
            customerEmail = VALUES(customerEmail),
            pickup = VALUES(pickup),
            dropoff = VALUES(dropoff),
            vehicle = VALUES(vehicle),
            fare = VALUES(fare),
            originalFare = VALUES(originalFare),
            walletDiscountUsed = VALUES(walletDiscountUsed),
            tripType = VALUES(tripType),
            scheduledDate = VALUES(scheduledDate),
            scheduledTime = VALUES(scheduledTime),
            driver = VALUES(driver),
            status = VALUES(status),
            rewardIssued = VALUES(rewardIssued),
            rewardAmount = VALUES(rewardAmount),
            paymentMethod = VALUES(paymentMethod),
            notes = VALUES(notes),
            timestamp = VALUES(timestamp),
            date = VALUES(date);
        `;
        const inqId = id || `INQ-${Date.now()}`;
        const numFare = (Number.isNaN(Number(fare)) || !fare) ? 0 : Number(fare);
        const numOrigFare = (Number.isNaN(Number(originalFare)) || !originalFare) ? numFare : Number(originalFare);
        const numWalletDisc = (Number.isNaN(Number(walletDiscountUsed)) || !walletDiscountUsed) ? 0 : Number(walletDiscountUsed);
        const numRewardAmt = (Number.isNaN(Number(rewardAmount)) || !rewardAmount) ? 0 : Number(rewardAmount);

        const params = [
          inqId,
          customerName || 'Customer',
          customerPhone || '',
          customerEmail || '',
          pickup || '',
          dropoff || '',
          vehicle || 'Standard',
          numFare,
          numOrigFare,
          numWalletDisc,
          tripType || 'One-Way',
          scheduledDate || 'Today',
          scheduledTime || '',
          driver || 'Unassigned',
          status || 'Pending',
          rewardIssued ? 1 : 0,
          numRewardAmt,
          paymentMethod || 'Cash',
          notes || '',
          timestamp || new Date().toISOString(),
          date || new Date().toLocaleDateString('en-US')
        ];
        await executeQuery(sql, params);

        // Auto-register/update customer record whenever an inquiry is submitted
        if (customerName) {
          const custEmail = customerEmail || (customerName.toLowerCase().replace(/\s+/g, '.') + '@empirecab.in');
          const custId = getStandardCustomerId(custEmail, customerPhone);
          const custSql = `
            INSERT INTO customers (id, name, phone, email, totalRides, totalSpent, registeredAt, lastLogin, status)
            VALUES (?, ?, ?, ?, 1, ?, ?, ?, 'Active')
            ON DUPLICATE KEY UPDATE
              name = VALUES(name),
              phone = IF(VALUES(phone) != '', VALUES(phone), phone),
              email = IF(VALUES(email) != '', VALUES(email), email),
              totalRides = totalRides + 1,
              totalSpent = totalSpent + VALUES(totalSpent),
              lastLogin = VALUES(lastLogin);
          `;
          await executeQuery(custSql, [
            custId,
            customerName,
            customerPhone || '',
            custEmail,
            numFare,
            new Date().toLocaleDateString('en-US'),
            new Date().toISOString()
          ]).catch(() => {});
        }

        return { success: true, id: inqId };
      }

      case 'updateInquiryStatus': {
        const { id, status, driver, vehicle, fare, rewardIssued, rewardAmount } = data;
        if (!id) return { success: false, error: 'Missing inquiry ID' };
        
        const updates = ['status = ?'];
        const params = [status];

        if (driver) { updates.push('driver = ?'); params.push(driver); }
        if (vehicle) { updates.push('vehicle = ?'); params.push(vehicle); }
        if (fare !== undefined && fare !== null) { updates.push('fare = ?'); params.push(Number(fare)); }
        if (rewardIssued !== undefined && rewardIssued !== null) { updates.push('rewardIssued = ?'); params.push(rewardIssued ? 1 : 0); }
        if (rewardAmount !== undefined && rewardAmount !== null) { updates.push('rewardAmount = ?'); params.push(Number(rewardAmount)); }

        params.push(id);
        await executeQuery(`UPDATE inquiries SET ${updates.join(', ')} WHERE id = ?`, params);
        return { success: true };
      }

      case 'updateInquiryReward': {
        const { id, rewardIssued, rewardAmount } = data;
        if (!id) return { success: false, error: 'Missing inquiry ID' };
        const numReward = (Number.isNaN(Number(rewardAmount)) || !rewardAmount) ? 0 : Number(rewardAmount);
        await executeQuery('UPDATE inquiries SET rewardIssued = ?, rewardAmount = ? WHERE id = ?', [rewardIssued ? 1 : 0, numReward, id]);
        return { success: true };
      }

      case 'deleteInquiry': {
        const { id } = data;
        if (!id) return { success: false, error: 'Missing inquiry ID' };
        await executeQuery('DELETE FROM inquiries WHERE id = ?', [id]);
        return { success: true };
      }

      case 'getCustomers': {
        const [rows] = await executeQuery('SELECT * FROM customers ORDER BY created_at DESC');
        const map = new Map();
        (rows || []).forEach(row => {
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
        return { success: true, customers: Array.from(map.values()) };
      }

      case 'saveCustomer': {
        const { id, name, phone, email, photoURL, profession, area, totalRides, totalSpent, registeredAt, lastLogin, status } = data;
        if (!name && !phone && !email) return { success: true, message: 'Ignored empty profile sync' };
        
        let custId = id || getStandardCustomerId(email, phone);
        if (email) {
          const [byEmail] = await executeQuery('SELECT id FROM customers WHERE LOWER(email) = ? LIMIT 1', [email.toLowerCase().trim()]).catch(() => [[]]);
          if (byEmail && byEmail.length > 0) custId = byEmail[0].id;
        }

        const numRides = (Number.isNaN(Number(totalRides)) || !totalRides) ? 0 : Number(totalRides);
        const numSpent = (Number.isNaN(Number(totalSpent)) || !totalSpent) ? 0 : Number(totalSpent);
        
        const sql = `
          INSERT INTO customers (id, name, phone, email, photoURL, profession, area, totalRides, totalSpent, registeredAt, lastLogin, status)
          VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
          ON DUPLICATE KEY UPDATE
            name = VALUES(name),
            phone = IF(VALUES(phone) != '', VALUES(phone), phone),
            email = IF(VALUES(email) != '', VALUES(email), email),
            photoURL = IF(VALUES(photoURL) IS NOT NULL, VALUES(photoURL), photoURL),
            profession = VALUES(profession),
            area = VALUES(area),
            registeredAt = VALUES(registeredAt),
            lastLogin = VALUES(lastLogin),
            status = VALUES(status);
        `;
        const params = [
          custId,
          name || 'Rider',
          phone || '',
          email || '',
          photoURL || null,
          profession || 'Rider',
          area || 'Gujarat, India',
          numRides,
          numSpent,
          registeredAt || new Date().toISOString().split('T')[0],
          lastLogin || new Date().toISOString(),
          status || 'Active'
        ];
        await executeQuery(sql, params);
        return { success: true, id: custId };
      }

      case 'deleteCustomer': {
        const { id } = data;
        if (!id) return { success: false, error: 'Missing customer ID' };
        await executeQuery('DELETE FROM customers WHERE id = ? OR email = ? OR phone = ?', [id, id, id]);
        return { success: true };
      }

      case 'purgeDemoData': {
        await executeQuery("DELETE FROM customers WHERE email LIKE '%@customer.com' OR email LIKE '%@client.com' OR email LIKE '%test%' OR name IN ('Ankit Mehta', 'Bhavin Patel', 'Website Guest', 'John Doe', 'Test Google Rider');");
        await executeQuery("DELETE FROM inquiries WHERE customerName IN ('Ankit Mehta', 'Bhavin Patel', 'Website Guest', 'John Doe', 'Test Google Rider') OR customerEmail LIKE '%@customer.com' OR customerEmail LIKE '%test%';");
        return { success: true };
      }

      case 'purgeAllData': {
        await executeQuery('TRUNCATE TABLE inquiries;');
        await executeQuery('TRUNCATE TABLE customers;');
        return { success: true };
      }

      case 'saveWallet': {
        const { phone, balance, transactions } = data;
        const cleanPhone = phone ? String(phone).replace(/\D/g, '').slice(-10) : '';
        if (!cleanPhone) return { success: false, error: 'Missing phone' };
        const txnStr = typeof transactions === 'string' ? transactions : JSON.stringify(transactions || []);
        const sql = `
          INSERT INTO customer_wallets (phone, balance, transactions)
          VALUES (?, ?, ?)
          ON DUPLICATE KEY UPDATE
            balance = VALUES(balance),
            transactions = VALUES(transactions);
        `;
        await executeQuery(sql, [cleanPhone, Number(balance || 0), txnStr]);
        return { success: true };
      }

      case 'getWallet': {
        const { phone } = data;
        const cleanPhone = phone ? String(phone).replace(/\D/g, '').slice(-10) : '';
        if (!cleanPhone) return { success: false, error: 'Missing phone' };
        const [rows] = await executeQuery('SELECT * FROM customer_wallets WHERE phone = ?', [cleanPhone]);
        if (rows && rows.length > 0) {
          let txns = [];
          try { txns = JSON.parse(rows[0].transactions || '[]'); } catch (e) {}
          return { success: true, wallet: { balance: Number(rows[0].balance || 0), transactions: txns } };
        }
        return { success: true, wallet: { balance: 0, transactions: [] } };
      }

      default:
        return { success: false, error: `Unknown action: ${action}` };
    }
  } catch (err) {
    console.error('Hostinger MySQL Error:', err);
    return { success: false, error: err.message || String(err) };
  }
}

// Vercel Serverless Function Handler
export default async function handler(req, res) {
  // CORS Headers
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization, X-Requested-With');

  if (req.method === 'OPTIONS') {
    return res.status(200).end();
  }

  try {
    const body = req.body || {};
    const query = req.query || {};
    const action = body.action || query.action || 'init';
    const data = body.data || body;

    const result = await handleMySQLRequest(action, data);
    return res.status(200).json(result);
  } catch (error) {
    return res.status(200).json({ success: false, fallback: true, error: error.message || String(error) });
  }
}
