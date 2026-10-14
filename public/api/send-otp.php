<?php
header('Access-Control-Allow-Origin: *');
header('Access-Control-Allow-Methods: POST, GET, OPTIONS');
header('Access-Control-Allow-Headers: Content-Type, Authorization, X-Requested-With');
header('Content-Type: application/json; charset=UTF-8');

if ($_SERVER['REQUEST_METHOD'] === 'OPTIONS') {
    http_response_code(200);
    exit;
}

$input = json_decode(file_get_contents('php://input'), true);
$phone = $input['phone'] ?? $_POST['phone'] ?? $_GET['phone'] ?? '';
$code = $input['code'] ?? $_POST['code'] ?? $_GET['code'] ?? '';

if (empty($phone) || empty($code)) {
    echo json_encode(['success' => false, 'error' => 'Phone and code are required']);
    exit;
}

$cleanDigits = substr(preg_replace('/\D/', '', $phone), -10);
if (strlen($cleanDigits) !== 10) {
    echo json_encode(['success' => false, 'error' => 'Invalid 10-digit Indian phone number']);
    exit;
}

// Fast2SMS API Key
$apiKey = getenv('FAST2SMS_API_KEY') ?: '5S9P6LKf8qzDT0tRkhu7HbGUcBX2rVOFjpAnodmEegCaNI3MwZckRFTr8SAhdOMwEt1CPlaugnUqZmX4';

// Fast2SMS Official Cheap OTP Route (route=otp, ~₹0.20 per SMS) - No GST / No DLT required
$url = "https://www.fast2sms.com/dev/bulkV2?authorization=" . urlencode($apiKey) . "&route=otp&variables_values=" . urlencode($code) . "&flash=0&numbers=" . urlencode($cleanDigits);

$ch = curl_init();
curl_setopt($ch, CURLOPT_URL, $url);
curl_setopt($ch, CURLOPT_RETURNTRANSFER, true);
curl_setopt($ch, CURLOPT_TIMEOUT, 15);
curl_setopt($ch, CURLOPT_SSL_VERIFYPEER, false);
$response = curl_exec($ch);
$httpCode = curl_getinfo($ch, CURLINFO_HTTP_CODE);
curl_close($ch);

$data = json_decode($response, true);
if ($data && (!empty($data['return']) || !empty($data['request_id']))) {
    echo json_encode([
        'success' => true,
        'via' => 'fast2sms_otp',
        'rate' => '~₹0.20/SMS',
        'phone' => $cleanDigits
    ]);
} else {
    echo json_encode([
        'success' => false,
        'error' => $data['message'][0] ?? ($data['message'] ?? 'SMS dispatch failed'),
        'details' => $data
    ]);
}
