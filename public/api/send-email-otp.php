<?php
// Legacy endpoint kept for older app builds.
// It no longer accepts a client-supplied code: it delegates to the secure, server-generated,
// hashed and rate-limited OTP flow in db.php (action "sendEmailOTP").
$_GET['action'] = 'sendEmailOTP';
require __DIR__ . '/db.php';
