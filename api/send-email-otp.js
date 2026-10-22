// Deprecated: this serverless endpoint emailed a client-supplied OTP code (open relay) and
// reported success even when nothing was sent. Email OTP is now generated, stored (hashed),
// rate-limited and verified server-side in public/api/db.php (actions: sendEmailOTP / verifyEmailOTP).
export default async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET,OPTIONS,POST');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

  if (req.method === 'OPTIONS') {
    return res.status(200).end();
  }

  return res.status(410).json({
    success: false,
    errorCode: 'endpoint_retired',
    error: 'This endpoint has been retired. Use https://emperialcabs.com/api/db.php?action=sendEmailOTP'
  });
}
