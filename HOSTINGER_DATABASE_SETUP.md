# EMPERIAL CABS — Hostinger MySQL Database & Deployment Guide

## 1. Hostinger Database Details (Confirmed from hPanel)
- **Hostinger Domain**: `emperialcabs.com`
- **Database Name**: `u217835086_TAXI`
- **Database User**: `u217835086_TAXI`
- **Database Password**: `Mahadev@0963`
- **Database Port**: `3306`
- **Local Hostname**: `localhost`

---

## 2. Root Cause of Connection Failure (`Access denied`)
When testing `https://emperialcabs.com/api/db.php`, Hostinger returned:
`Database connection failed: SQLSTATE[HY000] [1045] Access denied for user 'u217835086_TAXI'`

This happens for two reasons:
1. **Password Mismatch on Hostinger**: The password for user `u217835086_TAXI` inside Hostinger hPanel might not be set to `Mahadev@0963`.
2. **Old `db.php` on Server**: The `db.php` file currently hosted on Hostinger server needs to be updated with the code below.

---

## 3. How to Fix (2 Quick Steps in Hostinger)

### Step A: Set/Verify Password in Hostinger hPanel
1. Open the **Management | Hostinger** tab (shown in your screenshot).
2. Under **List of Current MySQL Databases And Users**, locate `u217835086_TAXI`.
3. Click the 3 dots menu `⋮` on the right -> Click **Change Password**.
4. Set Password to: `Mahadev@0963`
5. Save changes.

### Step B: Replace `db.php` in Hostinger File Manager
1. Switch to your open tab: `api - Files - Browser` (Hostinger File Manager).
2. Open `public_html/api/db.php`.
3. Replace its entire contents with the official updated code from `public/api/db.php` (shown below).
4. Save the file.

---

## 4. Official Production `db.php` Code
```php
<?php
// Hostinger Native PHP Database Service API for EMPERIAL CABS Ecosystem
header('Access-Control-Allow-Origin: *');
header('Access-Control-Allow-Methods: GET, POST, OPTIONS');
header('Access-Control-Allow-Headers: Content-Type, Authorization, X-Requested-With');
header('Content-Type: application/json; charset=utf-8');

if ($_SERVER['REQUEST_METHOD'] === 'OPTIONS') {
    http_response_code(200);
    exit();
}

$db_configs = [
    ['host' => 'localhost', 'user' => 'u217835086_TAXI', 'pass' => 'Mahadev@0963', 'name' => 'u217835086_TAXI', 'port' => '3306'],
    ['host' => getenv('MYSQL_HOST') ?: 'localhost', 'user' => getenv('MYSQL_USER') ?: 'u889282535_taxi', 'pass' => getenv('MYSQL_PASSWORD') ?: 'Mahadev@0963', 'name' => getenv('MYSQL_DATABASE') ?: 'u889282535_taxi', 'port' => '3306'],
    ['host' => 'srv2213.hstgr.io', 'user' => 'u217835086_TAXI', 'pass' => 'Mahadev@0963', 'name' => 'u217835086_TAXI', 'port' => '3306'],
    ['host' => 'srv1671.hstgr.io', 'user' => 'u889282535_taxi', 'pass' => 'Mahadev@0963', 'name' => 'u889282535_taxi', 'port' => '3306']
];

$pdo = null;
$last_error = null;

foreach ($db_configs as $cfg) {
    try {
        $dsn = "mysql:host={$cfg['host']};port={$cfg['port']};dbname={$cfg['name']};charset=utf8mb4";
        $pdo = new PDO($dsn, $cfg['user'], $cfg['pass'], [
            PDO::ATTR_ERRMODE => PDO::ERRMODE_EXCEPTION,
            PDO::ATTR_DEFAULT_FETCH_MODE => PDO::FETCH_ASSOC,
            PDO::ATTR_EMULATE_PREPARES => false
        ]);
        if ($pdo) break;
    } catch (PDOException $e) {
        $last_error = $e->getMessage();
    }
}

if (!$pdo) {
    echo json_encode(['success' => false, 'error' => 'Database connection failed: ' . $last_error, 'inquiries' => [], 'customers' => []]);
    exit();
}

// Ensure database tables exist automatically
try {
    $pdo->exec("
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
        
        CREATE TABLE IF NOT EXISTS customer_wallets (
            phone VARCHAR(64) PRIMARY KEY,
            balance DECIMAL(10,2) DEFAULT 0.00,
            transactions LONGTEXT,
            created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
        );
    ");
} catch (Exception $e) {}

$input = json_decode(file_get_contents('php://input'), true) ?: [];
$action = $input['action'] ?? ($_GET['action'] ?? 'init');
$data = $input['data'] ?? $input;

switch ($action) {
    case 'init':
        echo json_encode(['success' => true, 'message' => 'Hostinger MySQL PHP API Ready']);
        break;

    case 'getInquiries':
        $stmt = $pdo->query("SELECT * FROM inquiries ORDER BY created_at DESC");
        $rows = $stmt->fetchAll();
        echo json_encode(['success' => true, 'inquiries' => $rows]);
        break;

    case 'saveInquiry':
        $id = !empty($data['id']) ? $data['id'] : ('INQ-' . round(microtime(true) * 1000));
        $fare = is_numeric($data['fare'] ?? null) ? floatval($data['fare']) : 0.00;
        $origFare = is_numeric($data['originalFare'] ?? null) ? floatval($data['originalFare']) : $fare;
        $walletDisc = is_numeric($data['walletDiscountUsed'] ?? null) ? floatval($data['walletDiscountUsed']) : 0.00;
        $rewardAmt = is_numeric($data['rewardAmount'] ?? null) ? floatval($data['rewardAmount']) : 0.00;

        $sql = "INSERT INTO inquiries (id, customerName, customerPhone, customerEmail, pickup, dropoff, vehicle, fare, originalFare, walletDiscountUsed, tripType, scheduledDate, scheduledTime, driver, status, rewardIssued, rewardAmount, paymentMethod, notes, timestamp, date)
                VALUES (:id, :customerName, :customerPhone, :customerEmail, :pickup, :dropoff, :vehicle, :fare, :originalFare, :walletDiscountUsed, :tripType, :scheduledDate, :scheduledTime, :driver, :status, :rewardIssued, :rewardAmount, :paymentMethod, :notes, :timestamp, :date)
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
                    date = VALUES(date)";
        
        $stmt = $pdo->prepare($sql);
        $stmt->execute([
            ':id' => $id,
            ':customerName' => $data['customerName'] ?? 'Customer',
            ':customerPhone' => $data['customerPhone'] ?? '',
            ':customerEmail' => $data['customerEmail'] ?? '',
            ':pickup' => $data['pickup'] ?? '',
            ':dropoff' => $data['dropoff'] ?? '',
            ':vehicle' => $data['vehicle'] ?? 'Standard',
            ':fare' => $fare,
            ':originalFare' => $origFare,
            ':walletDiscountUsed' => $walletDisc,
            ':tripType' => $data['tripType'] ?? 'One-Way',
            ':scheduledDate' => $data['scheduledDate'] ?? 'Today',
            ':scheduledTime' => $data['scheduledTime'] ?? '',
            ':driver' => $data['driver'] ?? 'Unassigned',
            ':status' => $data['status'] ?? 'Pending',
            ':rewardIssued' => !empty($data['rewardIssued']) ? 1 : 0,
            ':rewardAmount' => $rewardAmt,
            ':paymentMethod' => $data['paymentMethod'] ?? 'Cash',
            ':notes' => $data['notes'] ?? '',
            ':timestamp' => $data['timestamp'] ?? date('c'),
            ':date' => $data['date'] ?? date('Y-m-d')
        ]);
        echo json_encode(['success' => true, 'id' => $id]);
        break;

    case 'updateInquiryStatus':
        $id = $data['id'] ?? null;
        if (!$id) { echo json_encode(['success' => false, 'error' => 'Missing inquiry ID']); exit(); }
        $status = $data['status'] ?? 'Pending';
        $driver = $data['driver'] ?? null;
        $vehicle = $data['vehicle'] ?? null;
        
        $updates = ["status = :status"];
        $params = [':status' => $status, ':id' => $id];
        if ($driver !== null) { $updates[] = "driver = :driver"; $params[':driver'] = $driver; }
        if ($vehicle !== null) { $updates[] = "vehicle = :vehicle"; $params[':vehicle'] = $vehicle; }
        
        $sql = "UPDATE inquiries SET " . implode(", ", $updates) . " WHERE id = :id";
        $stmt = $pdo->prepare($sql);
        $stmt->execute($params);
        echo json_encode(['success' => true]);
        break;

    case 'deleteInquiry':
        $id = $data['id'] ?? null;
        if (!$id) { echo json_encode(['success' => false, 'error' => 'Missing inquiry ID']); exit(); }
        $stmt = $pdo->prepare("DELETE FROM inquiries WHERE id = ?");
        $stmt->execute([$id]);
        echo json_encode(['success' => true]);
        break;

    case 'getCustomers':
        $stmt = $pdo->query("SELECT * FROM customers ORDER BY created_at DESC");
        $rows = $stmt->fetchAll();
        echo json_encode(['success' => true, 'customers' => $rows]);
        break;

    case 'saveCustomer':
        $id = !empty($data['id']) ? $data['id'] : ('CUST-' . preg_replace('/[^a-zA-Z0-9]/', '_', strtolower($data['email'] ?? $data['phone'] ?? uniqid())));
        $stmt = $pdo->prepare("INSERT INTO customers (id, name, phone, email, photoURL, profession, area, totalRides, totalSpent, registeredAt, lastLogin, status)
                               VALUES (:id, :name, :phone, :email, :photoURL, :profession, :area, :totalRides, :totalSpent, :registeredAt, :lastLogin, :status)
                               ON DUPLICATE KEY UPDATE
                                   name = VALUES(name),
                                   phone = IF(VALUES(phone) != '', VALUES(phone), phone),
                                   email = IF(VALUES(email) != '', VALUES(email), email),
                                   photoURL = IF(VALUES(photoURL) IS NOT NULL, VALUES(photoURL), photoURL),
                                   profession = VALUES(profession),
                                   area = VALUES(area),
                                   registeredAt = VALUES(registeredAt),
                                   lastLogin = VALUES(lastLogin),
                                   status = VALUES(status)");
        $stmt->execute([
            ':id' => $id,
            ':name' => $data['name'] ?? 'Rider',
            ':phone' => $data['phone'] ?? '',
            ':email' => $data['email'] ?? '',
            ':photoURL' => $data['photoURL'] ?? null,
            ':profession' => $data['profession'] ?? 'Rider',
            ':area' => $data['area'] ?? 'Gujarat, India',
            ':totalRides' => intval($data['totalRides'] ?? 0),
            ':totalSpent' => floatval($data['totalSpent'] ?? 0),
            ':registeredAt' => $data['registeredAt'] ?? date('Y-m-d'),
            ':lastLogin' => $data['lastLogin'] ?? date('c'),
            ':status' => $data['status'] ?? 'Active'
        ]);
        echo json_encode(['success' => true, 'id' => $id]);
        break;

    case 'deleteCustomer':
        $id = $data['id'] ?? null;
        if (!$id) { echo json_encode(['success' => false, 'error' => 'Missing customer ID']); exit(); }
        $stmt = $pdo->prepare("DELETE FROM customers WHERE id = ? OR email = ? OR phone = ?");
        $stmt->execute([$id, $id, $id]);
        echo json_encode(['success' => true]);
        break;

    case 'purgeAllData':
        $pdo->exec("TRUNCATE TABLE inquiries; TRUNCATE TABLE customers;");
        echo json_encode(['success' => true]);
        break;

    case 'getWallet':
        $phone = preg_replace('/\D/', '', $data['phone'] ?? '');
        if (!$phone) { echo json_encode(['success' => false, 'error' => 'Missing phone']); exit(); }
        $stmt = $pdo->prepare("SELECT * FROM customer_wallets WHERE phone = ?");
        $stmt->execute([$phone]);
        $row = $stmt->fetch();
        if ($row) {
            $txns = json_decode($row['transactions'] ?: '[]', true) ?: [];
            echo json_encode(['success' => true, 'wallet' => ['balance' => floatval($row['balance']), 'transactions' => $txns]]);
        } else {
            echo json_encode(['success' => true, 'wallet' => ['balance' => 0, 'transactions' => []]]);
        }
        break;

    case 'saveWallet':
        $phone = preg_replace('/\D/', '', $data['phone'] ?? '');
        if (!$phone) { echo json_encode(['success' => false, 'error' => 'Missing phone']); exit(); }
        $txns = is_array($data['transactions'] ?? null) ? json_encode($data['transactions']) : ($data['transactions'] ?? '[]');
        $stmt = $pdo->prepare("INSERT INTO customer_wallets (phone, balance, transactions) VALUES (?, ?, ?)
                               ON DUPLICATE KEY UPDATE balance = VALUES(balance), transactions = VALUES(transactions)");
        $stmt->execute([$phone, floatval($data['balance'] ?? 0), $txns]);
        echo json_encode(['success' => true]);
        break;

    default:
        echo json_encode(['success' => false, 'error' => 'Unknown action: ' . $action]);
        break;
}
```
