<?php
// EMPERIAL CABS Standalone Native PHP Apple APNs & Google FCM WebPush Dispatcher
// RFC 8291 (Message Encryption for Web Push) & RFC 8292 (VAPID for Web Push)
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
foreach ($db_configs as $cfg) {
    try {
        $dsn = "mysql:host={$cfg['host']};port={$cfg['port']};dbname={$cfg['name']};charset=utf8mb4";
        $pdo = new PDO($dsn, $cfg['user'], $cfg['pass'], [
            PDO::ATTR_ERRMODE => PDO::ERRMODE_EXCEPTION,
            PDO::ATTR_DEFAULT_FETCH_MODE => PDO::FETCH_ASSOC
        ]);
        if ($pdo) break;
    } catch (Exception $e) {}
}

if (!$pdo) {
    echo json_encode(['success' => false, 'error' => 'Database connection failed']);
    exit();
}

// Ensure push_subscriptions table exists
try {
    $pdo->exec("CREATE TABLE IF NOT EXISTS push_subscriptions (
        id INT AUTO_INCREMENT PRIMARY KEY,
        user_type VARCHAR(50) DEFAULT 'admin',
        endpoint TEXT NOT NULL,
        p256dh VARCHAR(255) NOT NULL,
        auth VARCHAR(255) NOT NULL,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
        UNIQUE KEY unique_endpoint (endpoint(191))
    )");
} catch (Exception $e) {}

$input = json_decode(file_get_contents('php://input'), true) ?: $_POST;
$title = trim($input['title'] ?? 'EMPERIAL CABS Dispatch Alert');
$body = trim($input['body'] ?? ($input['message'] ?? 'New booking dispatch alert'));
$url = trim($input['url'] ?? '/admin?tab=inquiries');
$tag = trim($input['tag'] ?? ('disp-' . round(microtime(true) * 1000)));
$userType = trim($input['userType'] ?? ($input['user_type'] ?? 'admin'));

// Deduplication Gate: Prevent multiple push dispatches for same tag/inquiry within 45 seconds
$dedupKey = substr(($tag ?: md5($title . '|' . $body)), 0, 100);
try {
    $pdo->exec("CREATE TABLE IF NOT EXISTS push_dispatch_log (
        dispatch_key VARCHAR(100) PRIMARY KEY,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
    )");
    $pdo->exec("DELETE FROM push_dispatch_log WHERE created_at < NOW() - INTERVAL 1 HOUR");

    $checkStmt = $pdo->prepare("SELECT dispatch_key FROM push_dispatch_log WHERE dispatch_key = ? AND created_at >= NOW() - INTERVAL 45 SECOND");
    $checkStmt->execute([$dedupKey]);
    if ($checkStmt->fetch()) {
        echo json_encode(['success' => true, 'sentCount' => 0, 'deduplicated' => true, 'message' => 'Duplicate push suppressed']);
        exit();
    }
    $logStmt = $pdo->prepare("INSERT INTO push_dispatch_log (dispatch_key) VALUES (?) ON DUPLICATE KEY UPDATE created_at = NOW()");
    $logStmt->execute([$dedupKey]);
} catch (Exception $e) {}

// Clean duplicate subscriptions for same physical device
try {
    $pdo->exec("DELETE s1 FROM push_subscriptions s1
                INNER JOIN push_subscriptions s2 
                WHERE s1.id < s2.id AND (s1.endpoint = s2.endpoint OR s1.p256dh = s2.p256dh)");
} catch (Exception $e) {}

// Fetch active subscriptions deduplicated by device key (p256dh)
$stmt = $pdo->prepare("SELECT id, endpoint, p256dh, auth FROM push_subscriptions WHERE user_type = :ut GROUP BY p256dh ORDER BY id DESC LIMIT 50");
$stmt->execute([':ut' => $userType]);
$subs = $stmt->fetchAll();

if (empty($subs)) {
    echo json_encode([
        'success' => true,
        'sentCount' => 0,
        'totalSubs' => 0,
        'message' => 'No push subscriptions currently registered for ' . $userType
    ]);
    exit();
}

// VAPID Credentials
$vapidPublicB64u = 'BNjJ7GWaU-7KXkdkyyxoTyNGCRFSztK8KNtPQW9BWDycOZyVpSJZB7PZJ74JfL0ZSS9DZtrgHPe-cE9U9qi23CY';
$vapidPrivateB64u = 'yt0dGxUuTDPcsFg9ekfwuBBI8Ab7-Tt4Biy9TRtsE74';
$vapidSubject = 'mailto:emperialcabsbhavnagar@gmail.com';

function base64url_encode($data) {
    return rtrim(strtr(base64_encode($data), '+/', '-_'), '=');
}

function base64url_decode($data) {
    return base64_decode(strtr($data, '-_', '+/') . str_repeat('=', 3 - (3 + strlen($data)) % 4));
}

function derToRawSignature($der) {
    $offset = 2;
    if (ord($der[1]) & 0x80) {
        $offset += (ord($der[1]) & 0x7f);
    }
    $offset += 1;
    $rLen = ord($der[$offset++]);
    $r = substr($der, $offset, $rLen);
    $offset += $rLen;

    $offset += 1;
    $sLen = ord($der[$offset++]);
    $s = substr($der, $offset, $sLen);

    $r = str_pad(ltrim($r, "\x00"), 32, "\x00", STR_PAD_LEFT);
    $s = str_pad(ltrim($s, "\x00"), 32, "\x00", STR_PAD_LEFT);
    return $r . $s;
}

function hkdf_extract($salt, $ikm) {
    return hash_hmac('sha256', $ikm, $salt, true);
}

function hkdf_expand($prk, $info, $length) {
    $t = '';
    $last = '';
    $i = 1;
    while (strlen($t) < $length) {
        $last = hash_hmac('sha256', $last . $info . chr($i), $prk, true);
        $t .= $last;
        $i++;
    }
    return substr($t, 0, $length);
}

// Convert VAPID private key to PEM format
$privRaw = base64url_decode($vapidPrivateB64u);
$pubRaw = base64url_decode($vapidPublicB64u);
$derVapidPriv = hex2bin('30770201010420') . $privRaw . hex2bin('a00a06082a8648ce3d030107a144034200') . $pubRaw;
$vapidPrivPem = "-----BEGIN EC PRIVATE KEY-----\n" . chunk_split(base64_encode($derVapidPriv), 64, "\n") . "-----END EC PRIVATE KEY-----\n";

$payloadJson = json_encode([
    'title' => $title,
    'body' => $body,
    'url' => $url,
    'tag' => $tag
], JSON_UNESCAPED_SLASHES);

$sentCount = 0;
$expiredIds = [];

foreach ($subs as $sub) {
    $endpoint = $sub['endpoint'];
    $clientP256dhB64u = $sub['p256dh'];
    $clientAuthB64u = $sub['auth'];

    $clientPubRaw = base64url_decode($clientP256dhB64u);
    $clientAuthRaw = base64url_decode($clientAuthB64u);

    if (strlen($clientPubRaw) !== 65 || strlen($clientAuthRaw) < 16) {
        continue;
    }

    try {
        // 1. Generate Ephemeral EC Keypair for ECDH agreement
        $resEphemeral = openssl_pkey_new([
            'curve_name' => 'prime256v1',
            'private_key_type' => OPENSSL_KEYTYPE_EC
        ]);
        if (!$resEphemeral) continue;

        $ephemeralDetails = openssl_pkey_get_details($resEphemeral);
        $localPubRaw = "\x04" . $ephemeralDetails['ec']['x'] . $ephemeralDetails['ec']['y'];

        // 2. Wrap client public key into SPKI PEM
        $clientDerSpki = hex2bin('3059301306072a8648ce3d020106082a8648ce3d030107034200') . $clientPubRaw;
        $clientPubPem = "-----BEGIN PUBLIC KEY-----\n" . chunk_split(base64_encode($clientDerSpki), 64, "\n") . "-----END PUBLIC KEY-----\n";
        $clientPubKeyRes = openssl_pkey_get_public($clientPubPem);
        if (!$clientPubKeyRes) continue;

        // 3. ECDH Shared Secret
        $sharedSecret = openssl_pkey_derive($clientPubKeyRes, $resEphemeral);
        if (!$sharedSecret) continue;

        // 4. RFC 8291 HKDF derivation
        $salt = random_bytes(16);
        $prkKey = hkdf_extract($clientAuthRaw, $sharedSecret);
        $keyInfo = "WebPush: info\0" . $clientPubRaw . $localPubRaw;
        $ikm = hkdf_expand($prkKey, $keyInfo, 32);

        $prk = hkdf_extract($salt, $ikm);
        $cek = hkdf_expand($prk, "Content-Encoding: aes128gcm\0", 16);
        $nonce = hkdf_expand($prk, "Content-Encoding: nonce\0", 12);

        // 5. AES-128-GCM encryption with 0x02 record delimiter
        $padded = $payloadJson . "\x02";
        $tagBin = '';
        $ciphertext = openssl_encrypt($padded, 'aes-128-gcm', $cek, OPENSSL_RAW_DATA, $nonce, $tagBin);

        // 6. RFC 8291 binary frame: salt (16) + record_size (4) + idlen (1) + local_pub (65) + ciphertext + tag (16)
        $recordSize = pack('N', 4096);
        $idLen = chr(strlen($localPubRaw));
        $bodyBinary = $salt . $recordSize . $idLen . $localPubRaw . $ciphertext . $tagBin;

        // 7. VAPID JWT generation (RFC 8292)
        $urlParts = parse_url($endpoint);
        $audience = $urlParts['scheme'] . '://' . $urlParts['host'];

        $jwtHeader = base64url_encode(json_encode(['typ' => 'JWT', 'alg' => 'ES256']));
        $jwtPayload = base64url_encode(json_encode([
            'aud' => $audience,
            'exp' => time() + 86400,
            'sub' => $vapidSubject
        ]));

        $jwtMsg = $jwtHeader . '.' . $jwtPayload;
        $derSig = '';
        openssl_sign($jwtMsg, $derSig, $vapidPrivPem, OPENSSL_ALGO_SHA256);
        $rawSig = derToRawSignature($derSig);
        $jwtToken = $jwtMsg . '.' . base64url_encode($rawSig);

        // 8. Dispatch via cURL HTTP/2 to Apple APNs / Google FCM
        $ch = curl_init($endpoint);
        curl_setopt($ch, CURLOPT_CUSTOMREQUEST, 'POST');
        curl_setopt($ch, CURLOPT_POSTFIELDS, $bodyBinary);
        curl_setopt($ch, CURLOPT_RETURNTRANSFER, true);
        curl_setopt($ch, CURLOPT_TIMEOUT, 6);
        curl_setopt($ch, CURLOPT_CONNECTTIMEOUT, 3);
        $headers = [
            'Content-Type: application/octet-stream',
            'Content-Encoding: aes128gcm',
            'Authorization: vapid t=' . $jwtToken . ', k=' . $vapidPublicB64u,
            'TTL: 86400',
            'Urgency: high'
        ];
        if (stripos($endpoint, 'push.apple.com') !== false) {
            $headers[] = 'apns-push-type: alert';
            $headers[] = 'apns-priority: 10';
            $headers[] = 'apns-expiration: ' . (time() + 86400);
        }
        curl_setopt($ch, CURLOPT_HTTPHEADER, $headers);

        $resp = curl_exec($ch);
        $status = curl_getinfo($ch, CURLINFO_HTTP_CODE);
        curl_close($ch);

        if ($status === 200 || $status === 201) {
            $sentCount++;
        } elseif ($status === 404 || $status === 410) {
            $expiredIds[] = $sub['id'];
        }
    } catch (Exception $ex) {
        // Skip failed device
    }
}

// Clean up expired devices
if (!empty($expiredIds)) {
    try {
        $inClause = implode(',', array_map('intval', $expiredIds));
        $pdo->exec("DELETE FROM push_subscriptions WHERE id IN ($inClause)");
    } catch (Exception $e) {}
}

echo json_encode([
    'success' => true,
    'sentCount' => $sentCount,
    'totalSubs' => count($subs),
    'expiredCount' => count($expiredIds)
]);
