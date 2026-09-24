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
    ['host' => 'srv2213.hstgr.io', 'user' => 'u217835086_TAXI', 'pass' => 'Mahadev@0963', 'name' => 'u217835086_TAXI', 'port' => '3306']
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

// Read raw POST body
$input = json_decode(file_get_contents('php://input'), true) ?: [];
$action = $input['action'] ?? ($_GET['action'] ?? 'init');
$data = $input['data'] ?? $input;

switch ($action) {
    case 'init':
        // Ensure database tables exist ONLY on explicit init call
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

                CREATE TABLE IF NOT EXISTS vehicles (
                    id VARCHAR(64) PRIMARY KEY,
                    name VARCHAR(150),
                    passengers VARCHAR(50) DEFAULT '4 Persons',
                    rate DECIMAL(10,2) DEFAULT 15.00,
                    status VARCHAR(50) DEFAULT 'Active',
                    image LONGTEXT,
                    description TEXT,
                    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
                );

                CREATE TABLE IF NOT EXISTS places (
                    id INT AUTO_INCREMENT PRIMARY KEY,
                    name VARCHAR(150) NOT NULL UNIQUE,
                    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
                );

                CREATE TABLE IF NOT EXISTS routes (
                    id VARCHAR(64) PRIMARY KEY,
                    pickup VARCHAR(150) NOT NULL,
                    dropoff VARCHAR(150) NOT NULL,
                    price DECIMAL(10,2) NOT NULL DEFAULT 0.00,
                    duration VARCHAR(100) DEFAULT '',
                    car_prices LONGTEXT,
                    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
                    UNIQUE KEY unique_route_pair (pickup, dropoff)
                );

                CREATE TABLE IF NOT EXISTS drivers (
                    id VARCHAR(64) PRIMARY KEY,
                    name VARCHAR(255) NOT NULL,
                    phone VARCHAR(64) NOT NULL,
                    vehicle VARCHAR(100) DEFAULT NULL,
                    plate VARCHAR(64) DEFAULT NULL,
                    status VARCHAR(64) DEFAULT 'Active',
                    rating DECIMAL(3,2) DEFAULT 5.00,
                    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
                );

                CREATE TABLE IF NOT EXISTS contact_messages (
                    id VARCHAR(64) PRIMARY KEY,
                    name VARCHAR(255) NOT NULL,
                    email VARCHAR(255) NOT NULL,
                    category VARCHAR(100) DEFAULT 'Support',
                    message TEXT NOT NULL,
                    date VARCHAR(100) DEFAULT NULL,
                    timestamp BIGINT DEFAULT NULL,
                    status VARCHAR(64) DEFAULT 'Unread',
                    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
                );

                CREATE TABLE IF NOT EXISTS settings (
                    key_name VARCHAR(100) PRIMARY KEY,
                    key_value LONGTEXT NOT NULL,
                    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
                );
            ");

            try {
                $pdo->exec("ALTER TABLE routes ADD COLUMN car_prices LONGTEXT");
            } catch (Exception $e) {}
            try {
                $pdo->exec("ALTER TABLE routes ADD INDEX idx_routes_pickup (pickup)");
            } catch (Exception $e) {}
            try {
                $pdo->exec("ALTER TABLE routes ADD INDEX idx_routes_dropoff (dropoff)");
            } catch (Exception $e) {}
            try {
                $pdo->exec("ALTER TABLE vehicles ADD INDEX idx_vehicles_status (status)");
            } catch (Exception $e) {}
            try {
                $pdo->exec("ALTER TABLE vehicles ADD INDEX idx_vehicles_name (name)");
            } catch (Exception $e) {}
        } catch (Exception $e) {}

        echo json_encode(['success' => true, 'message' => 'Hostinger MySQL PHP API Ready']);
        break;

    case 'getInquiries':
        $stmt = $pdo->query("SELECT * FROM inquiries ORDER BY created_at DESC");
        $rows = $stmt->fetchAll();
        echo json_encode(['success' => true, 'inquiries' => $rows]);
        break;

    case 'saveInquiry':
        if (empty($data['id'])) {
            try {
                $maxStmt = $pdo->query("SELECT MAX(CAST(SUBSTRING(id, 5) AS UNSIGNED)) as max_id FROM inquiries WHERE id LIKE 'INQ-%'");
                $maxRow = $maxStmt->fetch();
                $nextNum = intval($maxRow['max_id'] ?? 0) + 1;
                $id = 'INQ-' . $nextNum;
            } catch (Exception $e) {
                $id = 'INQ-' . round(microtime(true) * 1000);
            }
        } else {
            $id = $data['id'];
        }
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

    case 'getVehicles':
        $stmt = $pdo->query("SELECT * FROM vehicles ORDER BY id ASC");
        $rows = $stmt->fetchAll();
        echo json_encode(['success' => true, 'vehicles' => $rows]);
        break;

    case 'saveVehicle':
        $id = !empty($data['id']) ? $data['id'] : ('CAR-' . round(microtime(true) * 1000));
        $name = $data['name'] ?? 'Car';
        $passengers = $data['passengers'] ?? '4 Persons';
        $rate = is_numeric($data['rate'] ?? null) ? floatval($data['rate']) : 15.00;
        $status = $data['status'] ?? 'Active';
        $image = $data['image'] ?? null;
        $description = $data['description'] ?? '';

        $stmt = $pdo->prepare("INSERT INTO vehicles (id, name, passengers, rate, status, image, description)
                               VALUES (:id, :name, :passengers, :rate, :status, :image, :description)
                               ON DUPLICATE KEY UPDATE
                                   name = VALUES(name),
                                   passengers = VALUES(passengers),
                                   rate = VALUES(rate),
                                   status = VALUES(status),
                                   image = IF(VALUES(image) IS NOT NULL AND VALUES(image) != '', VALUES(image), image),
                                   description = VALUES(description)");
        $stmt->execute([
            ':id' => $id,
            ':name' => $name,
            ':passengers' => $passengers,
            ':rate' => $rate,
            ':status' => $status,
            ':image' => $image,
            ':description' => $description
        ]);
        echo json_encode(['success' => true, 'id' => $id]);
        break;

    case 'deleteVehicle':
        $id = $data['id'] ?? null;
        if (!$id) { echo json_encode(['success' => false, 'error' => 'Missing vehicle ID']); exit(); }
        $stmt = $pdo->prepare("DELETE FROM vehicles WHERE id = ?");
        $stmt->execute([$id]);
        echo json_encode(['success' => true]);
        break;

    case 'getPlaces':
        $stmt = $pdo->query("SELECT name FROM places ORDER BY name ASC");
        $rows = $stmt->fetchAll(PDO::FETCH_COLUMN);
        if (empty($rows)) {
            $gujaratCities = [
                'Ahmedabad', 'Surat', 'Vadodara (Baroda)', 'Rajkot', 'Bhavnagar',
                'Jamnagar', 'Junagadh', 'Gandhinagar', 'Anand', 'Bharuch',
                'Navsari', 'Morbi', 'Surendranagar', 'Gandhidham', 'Nadiad',
                'Porbandar', 'Mehsana', 'Bhuj', 'Veraval', 'Vapi',
                'Valsad', 'Godhra', 'Palanpur', 'Patan', 'Botad',
                'Amreli', 'Gondal', 'Dahod', 'Himmatnagar', 'Ankleshwar'
            ];
            $ins = $pdo->prepare("INSERT IGNORE INTO places (name) VALUES (?)");
            foreach ($gujaratCities as $city) {
                $ins->execute([$city]);
            }
            $rows = $gujaratCities;
        }
        echo json_encode(['success' => true, 'places' => $rows]);
        break;

    case 'savePlace':
        $name = trim($data['name'] ?? '');
        if (!$name) { echo json_encode(['success' => false, 'error' => 'Missing place name']); exit(); }
        $stmt = $pdo->prepare("INSERT IGNORE INTO places (name) VALUES (?)");
        $stmt->execute([$name]);
        echo json_encode(['success' => true]);
        break;

    case 'deletePlace':
        $name = trim($data['name'] ?? '');
        if (!$name) { echo json_encode(['success' => false, 'error' => 'Missing place name']); exit(); }
        $stmt = $pdo->prepare("DELETE FROM places WHERE name = ?");
        $stmt->execute([$name]);
        echo json_encode(['success' => true]);
        break;

    case 'getRoutes':
        $stmt = $pdo->query("SELECT * FROM routes ORDER BY pickup ASC, dropoff ASC");
        $rows = $stmt->fetchAll();
        echo json_encode(['success' => true, 'routes' => $rows]);
        break;

    case 'getRoute':
    case 'getRoutePrice':
        $pickup = trim($data['pickup'] ?? '');
        $dropoff = trim($data['dropoff'] ?? '');
        if (!$pickup || !$dropoff) {
            echo json_encode(['success' => false, 'error' => 'Pickup and dropoff are required']);
            exit();
        }
        $stmt = $pdo->prepare("SELECT * FROM routes WHERE (pickup = :p1 AND dropoff = :d1) OR (pickup = :d2 AND dropoff = :p2) LIMIT 1");
        $stmt->execute([
            ':p1' => $pickup,
            ':d1' => $dropoff,
            ':d2' => $pickup,
            ':p2' => $dropoff
        ]);
        $route = $stmt->fetch();
        echo json_encode(['success' => true, 'route' => $route ?: null]);
        break;

    case 'saveRoute':
        $id = !empty($data['id']) ? $data['id'] : ('DEST-' . round(microtime(true) * 1000));
        $pickup = trim($data['pickup'] ?? '');
        $dropoff = trim($data['dropoff'] ?? '');
        $price = is_numeric($data['price'] ?? null) ? floatval($data['price']) : 0.00;
        $duration = trim($data['duration'] ?? '');
        $car_prices = isset($data['car_prices']) ? (is_array($data['car_prices']) ? json_encode($data['car_prices']) : $data['car_prices']) : null;
        if (!$pickup || !$dropoff) { echo json_encode(['success' => false, 'error' => 'Pickup and dropoff are required']); exit(); }

        $stmt = $pdo->prepare("INSERT INTO routes (id, pickup, dropoff, price, duration, car_prices)
                               VALUES (:id, :pickup, :dropoff, :price, :duration, :car_prices)
                               ON DUPLICATE KEY UPDATE
                                   price = VALUES(price),
                                   duration = VALUES(duration),
                                   car_prices = VALUES(car_prices)");
        $stmt->execute([
            ':id' => $id,
            ':pickup' => $pickup,
            ':dropoff' => $dropoff,
            ':price' => $price,
            ':duration' => $duration,
            ':car_prices' => $car_prices
        ]);
        echo json_encode(['success' => true, 'id' => $id]);
        break;

    case 'saveRoutesBatch':
        $routes = $data['routes'] ?? [];
        if (!is_array($routes)) { echo json_encode(['success' => false, 'error' => 'Invalid routes data']); exit(); }
        
        $count = 0;
        try {
            $pdo->beginTransaction();
            $stmt = $pdo->prepare("INSERT INTO routes (id, pickup, dropoff, price, duration, car_prices)
                                   VALUES (:id, :pickup, :dropoff, :price, :duration, :car_prices)
                                   ON DUPLICATE KEY UPDATE
                                       price = VALUES(price),
                                       duration = VALUES(duration),
                                       car_prices = VALUES(car_prices)");
            foreach ($routes as $r) {
                if (!empty($r['pickup']) && !empty($r['dropoff'])) {
                    $id = !empty($r['id']) ? $r['id'] : ('DEST-' . round(microtime(true) * 1000) . '-' . $count);
                    $car_prices = isset($r['car_prices']) ? (is_array($r['car_prices']) ? json_encode($r['car_prices']) : $r['car_prices']) : null;
                    $stmt->execute([
                        ':id' => $id,
                        ':pickup' => trim($r['pickup']),
                        ':dropoff' => trim($r['dropoff']),
                        ':price' => floatval($r['price'] ?? 0),
                        ':duration' => trim($r['duration'] ?? ''),
                        ':car_prices' => $car_prices
                    ]);
                    $count++;
                }
            }
            $pdo->commit();
            echo json_encode(['success' => true, 'count' => $count]);
        } catch (Exception $e) {
            if ($pdo->inTransaction()) {
                $pdo->rollBack();
            }
            echo json_encode(['success' => false, 'error' => $e->getMessage()]);
        }
        break;

    case 'deleteRoute':
        $id = $data['id'] ?? null;
        $pickup = $data['pickup'] ?? null;
        $dropoff = $data['dropoff'] ?? null;
        if ($id) {
            $stmt = $pdo->prepare("DELETE FROM routes WHERE id = ?");
            $stmt->execute([$id]);
        } else if ($pickup && $dropoff) {
            $stmt = $pdo->prepare("DELETE FROM routes WHERE pickup = ? AND dropoff = ?");
            $stmt->execute([$pickup, $dropoff]);
        } else {
            echo json_encode(['success' => false, 'error' => 'Missing route identification']);
            exit();
        }
        echo json_encode(['success' => true]);
        break;

    case 'getDrivers':
        $stmt = $pdo->query("SELECT * FROM drivers ORDER BY id ASC");
        $rows = $stmt->fetchAll();
        echo json_encode(['success' => true, 'drivers' => $rows]);
        break;

    case 'saveDriver':
        $id = !empty($data['id']) ? $data['id'] : ('DRV-' . round(microtime(true) * 1000));
        $name = trim($data['name'] ?? 'Driver');
        $phone = trim($data['phone'] ?? '');
        $vehicle = $data['vehicle'] ?? ($data['vehicleModel'] ?? '');
        $plate = $data['plate'] ?? ($data['vehicleNo'] ?? '');
        $status = $data['status'] ?? 'Active';
        $rating = is_numeric($data['rating'] ?? null) ? floatval($data['rating']) : 5.00;

        $stmt = $pdo->prepare("INSERT INTO drivers (id, name, phone, vehicle, plate, status, rating)
                               VALUES (:id, :name, :phone, :vehicle, :plate, :status, :rating)
                               ON DUPLICATE KEY UPDATE
                                   name = VALUES(name),
                                   phone = VALUES(phone),
                                   vehicle = VALUES(vehicle),
                                   plate = VALUES(plate),
                                   status = VALUES(status),
                                   rating = VALUES(rating)");
        $stmt->execute([
            ':id' => $id,
            ':name' => $name,
            ':phone' => $phone,
            ':vehicle' => $vehicle,
            ':plate' => $plate,
            ':status' => $status,
            ':rating' => $rating
        ]);
        echo json_encode(['success' => true, 'id' => $id]);
        break;

    case 'deleteDriver':
        $id = $data['id'] ?? null;
        if (!$id) { echo json_encode(['success' => false, 'error' => 'Missing driver ID']); exit(); }
        $stmt = $pdo->prepare("DELETE FROM drivers WHERE id = ?");
        $stmt->execute([$id]);
        echo json_encode(['success' => true]);
        break;

    case 'getContactMessages':
        $stmt = $pdo->query("SELECT * FROM contact_messages ORDER BY timestamp DESC, created_at DESC");
        $rows = $stmt->fetchAll();
        echo json_encode(['success' => true, 'messages' => $rows]);
        break;

    case 'saveContactMessage':
        $id = !empty($data['id']) ? $data['id'] : ('MSG-' . round(microtime(true) * 1000));
        $name = trim($data['name'] ?? '');
        $email = trim($data['email'] ?? '');
        $category = trim($data['category'] ?? 'Support');
        $message = trim($data['message'] ?? '');
        $date = $data['date'] ?? date('M j, Y, g:i A');
        $timestamp = is_numeric($data['timestamp'] ?? null) ? intval($data['timestamp']) : round(microtime(true) * 1000);
        $status = $data['status'] ?? 'Unread';

        $stmt = $pdo->prepare("INSERT INTO contact_messages (id, name, email, category, message, date, timestamp, status)
                               VALUES (:id, :name, :email, :category, :message, :date, :timestamp, :status)
                               ON DUPLICATE KEY UPDATE status = VALUES(status)");
        $stmt->execute([
            ':id' => $id,
            ':name' => $name,
            ':email' => $email,
            ':category' => $category,
            ':message' => $message,
            ':date' => $date,
            ':timestamp' => $timestamp,
            ':status' => $status
        ]);
        echo json_encode(['success' => true, 'id' => $id]);
        break;

    case 'deleteContactMessage':
        $id = $data['id'] ?? null;
        if (!$id) { echo json_encode(['success' => false, 'error' => 'Missing message ID']); exit(); }
        $stmt = $pdo->prepare("DELETE FROM contact_messages WHERE id = ?");
        $stmt->execute([$id]);
        echo json_encode(['success' => true]);
        break;

    case 'updateContactMessageStatus':
        $id = $data['id'] ?? null;
        $status = $data['status'] ?? 'Read';
        if (!$id) { echo json_encode(['success' => false, 'error' => 'Missing message ID']); exit(); }
        $stmt = $pdo->prepare("UPDATE contact_messages SET status = ? WHERE id = ?");
        $stmt->execute([$status, $id]);
        echo json_encode(['success' => true]);
        break;

    case 'getSettings':
        $stmt = $pdo->query("SELECT key_name, key_value FROM settings");
        $rows = $stmt->fetchAll();
        $settings = [];
        foreach ($rows as $r) {
            $val = $r['key_value'];
            $decoded = json_decode($val, true);
            $settings[$r['key_name']] = ($decoded !== null && (is_array($decoded) || is_numeric($decoded))) ? $decoded : $val;
        }
        echo json_encode(['success' => true, 'settings' => $settings]);
        break;

    case 'saveSettings':
        $key = trim($data['key'] ?? ($data['key_name'] ?? ''));
        $value = $data['value'] ?? ($data['key_value'] ?? '');
        if (!$key) { echo json_encode(['success' => false, 'error' => 'Missing setting key']); exit(); }
        $valStr = is_string($value) ? $value : json_encode($value);
        $stmt = $pdo->prepare("INSERT INTO settings (key_name, key_value) VALUES (?, ?)
                               ON DUPLICATE KEY UPDATE key_value = VALUES(key_value)");
        $stmt->execute([$key, $valStr]);
        echo json_encode(['success' => true]);
        break;

    default:
        echo json_encode(['success' => false, 'error' => 'Unknown action: ' . $action]);
        break;
}
