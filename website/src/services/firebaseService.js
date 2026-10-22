/** EMPERIAL CABS — Service Engine v1.0.5 [2026-08-17] */
import { initializeApp } from 'firebase/app';
import { getAuth, GoogleAuthProvider, signInWithPopup, signInWithRedirect, getRedirectResult, RecaptchaVerifier, signInWithPhoneNumber } from 'firebase/auth';
import { Capacitor, CapacitorHttp } from '@capacitor/core';
import { GoogleAuth } from '@codetrix-studio/capacitor-google-auth';
import {
  getFirestore,
  doc,
  setDoc,
  getDoc,
  collection,
  addDoc,
  getDocs,
  query,
  where,
  orderBy,
  updateDoc,
  deleteDoc,
  onSnapshot,
  serverTimestamp
} from 'firebase/firestore';

// Firebase Credentials matching android/app/google-services.json (Project: taxibhavnagar)
export const firebaseConfig = {
  apiKey: "AIzaSyCBdaPXLUsaxtYRXXv8_EKQ5K-BKIlqguQ",
  authDomain: "taxibhavnagar.firebaseapp.com",
  projectId: "taxibhavnagar",
  storageBucket: "taxibhavnagar.firebasestorage.app",
  messagingSenderId: "555496247847",
  appId: "1:555496247847:android:9dfc9a7a7595b7ddb8b402"
};

// Initialize Firebase App & Auth Services
export const app = initializeApp(firebaseConfig);
export const auth = getAuth(app);
export const googleProvider = new GoogleAuthProvider();

let firestoreInstance = null;
try {
  firestoreInstance = getFirestore(app);
} catch (e) {
  console.warn('Firestore database initialization warning:', e);
}
export const db = firestoreInstance;

const isNativeApp = () => {
  if (typeof window === 'undefined') return false;
  return (
    Capacitor.isNativePlatform() ||
    Boolean(window.Capacitor?.isNative) ||
    window.Capacitor?.platform === 'android' ||
    window.Capacitor?.platform === 'ios'
  );
};

// ─────────────────────────────────────────────────────────────────────────────
// GOOGLE SIGN-IN — Production-grade native flow
// ─────────────────────────────────────────────────────────────────────────────

/**
 * Attempt native Google Sign-In on Android/iOS.
 * Returns { name, email, photoURL, uid } or null if cancelled/failed.
 * On native: triggers Android system account picker (real phone accounts).
 */
let isGoogleAuthReady = false;

export const ensureGoogleAuthInitialized = async () => {
  if (typeof window === 'undefined' || !isNativeApp()) return;
  try {
    await GoogleAuth.initialize({
      clientId: '555496247847-mhki7n17mv041nogm83nd51qqldp9vbl.apps.googleusercontent.com',
      serverClientId: '555496247847-mhki7n17mv041nogm83nd51qqldp9vbl.apps.googleusercontent.com',
      scopes: ['profile', 'email'],
      grantOfflineAccess: false
    });
    isGoogleAuthReady = true;
  } catch (e) {
    console.warn('[GoogleAuth] Native init notice:', e);
  }
};

// Initial trigger on script evaluation
if (typeof window !== 'undefined' && isNativeApp()) {
  ensureGoogleAuthInitialized().catch(() => {});
}

export const signInWithGoogle = async () => {
  // ── 1. Native Android/iOS: Native Google Account sheet (In-App) ──
  if (isNativeApp()) {
    try {
      if (!isGoogleAuthReady) {
        await ensureGoogleAuthInitialized();
      }

      // Triggers native Android Google Account picker sheet
      const googleUser = await GoogleAuth.signIn();

      if (googleUser) {
        let email = googleUser.email || googleUser.authentication?.email || '';
        let name = googleUser.displayName || googleUser.name || (googleUser.givenName ? `${googleUser.givenName} ${googleUser.familyName || ''}`.trim() : '');
        let photoURL = googleUser.imageUrl || googleUser.photoUrl || null;
        let uid = googleUser.id || googleUser.userId || null;

        // Decode JWT idToken if present to extract verified Google profile fields
        const idToken = googleUser.authentication?.idToken || googleUser.idToken;
        if (idToken && typeof idToken === 'string') {
          try {
            const parts = idToken.split('.');
            if (parts.length === 3) {
              const base64Url = parts[1];
              const base64 = base64Url.replace(/-/g, '+').replace(/_/g, '/');
              const jsonPayload = decodeURIComponent(atob(base64).split('').map(c => '%' + ('00' + c.charCodeAt(0).toString(16)).slice(-2)).join(''));
              const decoded = JSON.parse(jsonPayload);
              if (decoded.email && !email) email = decoded.email;
              if (decoded.name && !name) name = decoded.name;
              if (decoded.picture && !photoURL) photoURL = decoded.picture;
              if (decoded.sub && !uid) uid = decoded.sub;
            }
          } catch (jwtErr) {
            console.log('[GoogleAuth] idToken decode note:', jwtErr);
          }
        }

        // Final fallback if email is still missing but account selected
        if (!email) {
          const rawId = uid || googleUser.id || Date.now();
          email = `user_${String(rawId).slice(-6)}@gmail.com`;
        }
        if (!name) {
          name = email.split('@')[0];
        }
        if (!uid) {
          uid = 'goog_' + Date.now();
        }

        return { name: name || 'Empire Rider', email, photoURL, uid };
      }
    } catch (nativeErr) {
      console.warn('[GoogleAuth] Native sign-in error:', nativeErr?.message || nativeErr);
      const errMsg = String(nativeErr?.message || nativeErr || '');

      // User closed/cancelled the Google sheet
      if (errMsg.includes('12501') || errMsg.toLowerCase().includes('cancel') || errMsg.toLowerCase().includes('closed')) {
        return { cancelled: true };
      }

      // Fallback: If native Play Services rejected with code 10 or developer error, attempt web popup OAuth
      try {
        const webResult = await signInWithPopup(auth, googleProvider);
        if (webResult && webResult.user) {
          const u = webResult.user;
          return {
            name: u.displayName || (u.email ? u.email.split('@')[0] : 'Empire Rider'),
            email: u.email || '',
            photoURL: u.photoURL || null,
            uid: u.uid || ('goog_' + Date.now())
          };
        }
      } catch (webFallbackErr) {
        console.warn('[GoogleAuth] Web popup fallback error:', webFallbackErr?.message || webFallbackErr);
      }

      return { error: errMsg || 'GoogleAuthFailed' };
    }

    return null;
  }

  // ── 2. Web Browser: Firebase Web OAuth Popup ──
  try {
    const result = await signInWithPopup(auth, googleProvider);
    if (result && result.user) {
      const user = result.user;
      return {
        name: user.displayName || (user.email ? user.email.split('@')[0] : 'Google User'),
        email: user.email || '',
        photoURL: user.photoURL || null,
        uid: user.uid || ('goog_' + Date.now())
      };
    }
  } catch (webAuthErr) {
    console.warn('[GoogleAuth] Web popup sign-in error:', webAuthErr?.message || webAuthErr);
    if (webAuthErr?.code === 'auth/popup-closed-by-user') {
      return { cancelled: true };
    }
    return { error: webAuthErr?.message || String(webAuthErr) };
  }

  return null;
};

/**
 * No-op: redirect result handler disabled (we don't use web redirects)
 */
export const handleGoogleRedirectResult = async () => {
  return null;
};

// ─────────────────────────────────────────────────────────────────────────────
// CUSTOMER PROFILE — Save & Load from Firestore
// ─────────────────────────────────────────────────────────────────────────────

/**
 * Save (or merge-update) a customer profile to Firestore.
 * Document ID is the user's email (normalized) for stable cross-device lookup.
 */
export const saveCustomerToFirestore = async (profile) => {
  if (!profile || (!profile.email && !profile.phone)) return null;

  // Dual-write: save customer profile to TiDB Cloud SQL database as well
  import('./tidbService.js').then(m => {
    if (m.saveCustomerToTiDB) {
      m.saveCustomerToTiDB(profile).catch(() => {});
    }
  }).catch(() => {});

  try {
    const payload = {
      ...profile,
      updatedAt: serverTimestamp(),
      lastLogin: new Date().toISOString()
    };

    const keys = [];
    if (profile.email) {
      keys.push(profile.email.toLowerCase().replace(/[^a-z0-9]/g, '_'));
    }
    if (profile.phone) {
      const cleanPhone = String(profile.phone).replace(/\D/g, '').slice(-10);
      if (cleanPhone) keys.push(cleanPhone);
    }

    await Promise.all(keys.map(k => {
      const ref = doc(db, 'cabsy_customers', k);
      return setDoc(ref, payload, { merge: true });
    }));

    return keys[0] || null;
  } catch (e) {
    console.warn('Firestore saveCustomer failed (offline?):', e);
    return null;
  }
};

/**
 * Load a customer profile from Firestore by email or phone.
 * Returns the profile object, or null if not found.
 */
export const loadCustomerFromFirestore = async (email, phone) => {
  if (!email && !phone) return null;
  try {
    const keysToCheck = [];
    if (email) keysToCheck.push(email.toLowerCase().replace(/[^a-z0-9]/g, '_'));
    if (phone) {
      const cleanPhone = String(phone).replace(/\D/g, '').slice(-10);
      if (cleanPhone) keysToCheck.push(cleanPhone);
    }

    for (const key of keysToCheck) {
      const ref = doc(db, 'cabsy_customers', key);
      const snap = await getDoc(ref);
      if (snap.exists()) return { id: snap.id, ...snap.data() };
    }
    return null;
  } catch (e) {
    console.warn('Firestore loadCustomer failed (offline?):', e);
    return null;
  }
};

// ─────────────────────────────────────────────────────────────────────────────
// RIDE INQUIRIES — Save & Load from Firestore
// ─────────────────────────────────────────────────────────────────────────────

/**
 * Save a new ride inquiry to Firestore under the global `cabsy_inquiries` collection.
 * Also stores a copy under the user's sub-collection for fast per-user history lookup.
 */
export const saveInquiryToFirestore = async (inquiry) => {
  if (!inquiry || !db) return null;
  try {
    const inqId = String(inquiry.id || ('INQ-' + Math.floor(1000 + Math.random() * 9000)));
    // 1. Global admin collection
    const globalRef = collection(db, 'cabsy_inquiries');
    const docRef = doc(globalRef, inqId);
    await setDoc(docRef, {
      ...inquiry,
      id: inqId,
      updatedAt: serverTimestamp()
    }, { merge: true });

    // 2. Per-user sub-collection (keyed by phone or email)
    const userKey = inquiry.customerPhone || inquiry.customerEmail || inquiry.customerName;
    if (userKey) {
      const userDocId = String(userKey).toLowerCase().replace(/[^a-z0-9]/g, '_');
      const userInqRef = doc(db, 'cabsy_customers', userDocId, 'inquiries', inqId);
      await setDoc(userInqRef, { ...inquiry, id: inqId, firestoreId: inqId }, { merge: true });
    }

    return inqId;
  } catch (e) {
    console.warn('Firestore saveInquiry failed (offline?):', e);
    return null;
  }
};

/**
 * Load all ride inquiries from Firestore (admin view).
 */
export const loadAllInquiriesFromFirestore = async () => {
  try {
    const ref = collection(db, 'cabsy_inquiries');
    const snapshot = await getDocs(ref);
    return snapshot.docs.map(d => ({ firestoreId: d.id, ...d.data() }));
  } catch (e) {
    console.warn('Firestore loadAllInquiries failed:', e);
    return [];
  }
};

export const subscribeToInquiriesFirestore = (onUpdate) => {
  if (!db) return () => {};
  try {
    const ref = collection(db, 'cabsy_inquiries');
    return onSnapshot(ref, (snapshot) => {
      const list = snapshot.docs.map(d => ({ firestoreId: d.id, ...d.data() }));
      onUpdate(list);
    }, (err) => console.warn('Firestore onSnapshot error:', err));
  } catch (e) {
    console.warn('Firestore subscribe failed:', e);
    return () => {};
  }
};

/**
 * Load ride inquiries for a specific user from their sub-collection.
 */
export const loadUserInquiriesFromFirestore = async (email, phone) => {
  if (!email && !phone) return [];
  try {
    const userDocId = (email || phone).toLowerCase().replace(/[^a-z0-9]/g, '_');
    const ref = collection(db, 'cabsy_customers', userDocId, 'inquiries');
    const snapshot = await getDocs(ref);
    return snapshot.docs.map(d => ({ firestoreId: d.id, ...d.data() }));
  } catch (e) {
    console.warn('Firestore loadUserInquiries failed:', e);
    return [];
  }
};

/**
 * Update a ride inquiry's status (e.g., Confirmed, In Progress, Completed).
 */
export const updateInquiryStatus = async (firestoreId, newStatus) => {
  if (!firestoreId) return;
  try {
    const ref = doc(db, 'cabsy_inquiries', firestoreId);
    await updateDoc(ref, { status: newStatus, updatedAt: serverTimestamp() });
  } catch (e) {
    console.warn('Firestore updateInquiryStatus failed:', e);
  }
};

/**
 * Delete a ride inquiry from Firestore.
 */
export const deleteInquiryFromFirestore = async (firestoreId) => {
  if (!firestoreId) return;
  try {
    const ref = doc(db, 'cabsy_inquiries', firestoreId);
    await deleteDoc(ref);
  } catch (e) {
    console.warn('Firestore deleteInquiry failed:', e);
  }
};

// ─────────────────────────────────────────────────────────────────────────────
// PHONE OTP — Firebase Phone Authentication (Real SMS)
// ─────────────────────────────────────────────────────────────────────────────

/**
 * DEPRECATED: Phone SMS OTP has been removed to avoid telecom SMS charges and DLT dependencies.
 * Authentication is powered by Google Sign-In, WhatsApp (+91 72268 44108), and Email OTP.
 */
export const setupRecaptcha = () => null;

export const sendFast2SMSOTP = async () => ({
  success: false,
  error: 'Phone SMS OTP has been deprecated in favor of WhatsApp and Email OTP.'
});

export const sendPhoneOTP = async () => ({
  success: false,
  error: 'Phone SMS OTP has been deprecated. Please log in using Google, WhatsApp, or Email.'
});

export const verifyPhoneOTP = async () => ({
  success: false,
  error: 'Phone SMS OTP has been deprecated.'
});

// ─────────────────────────────────────────────────────────────────────────────
// EMAIL OTP — Client-side 6-digit code generation & verification
// Uses sessionStorage for code storage. For production email delivery,
// integrate EmailJS, Resend, or a backend API.
// ─────────────────────────────────────────────────────────────────────────────

/**
 * Generate a 6-digit OTP for email verification.
/**
 * Secure Server-Side Email OTP Service
 * Sends an email containing a 6-digit verification code generated, hashed, and managed by db.php.
 * The code is never exposed to the client response.
 */
export const sendEmailOTP = async (email) => {
  if (!email || !email.includes('@')) {
    return { success: false, error: 'Please enter a valid email address.' };
  }
  const cleanEmail = email.toLowerCase().trim();
  const endpoint = 'https://emperialcabs.com/api/db.php?action=sendEmailOTP';

  try {
    let data = null;
    if (typeof window !== 'undefined' && Capacitor.isNativePlatform()) {
      try {
        const nativeRes = await CapacitorHttp.request({
          url: endpoint,
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Accept': 'application/json'
          },
          data: { action: 'sendEmailOTP', data: { email: cleanEmail } }
        });
        let payload = nativeRes?.data;
        if (typeof payload === 'string') {
          try { payload = JSON.parse(payload); } catch (e) {}
        }
        data = payload;
      } catch (nativeErr) {
        console.warn('[CapacitorHttp sendEmailOTP error]', nativeErr);
      }
    }

    if (!data) {
      const res = await fetch(endpoint, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Accept': 'application/json'
        },
        body: JSON.stringify({ action: 'sendEmailOTP', data: { email: cleanEmail } })
      });
      data = await res.json().catch(() => null);
    }

    if (data && data.success) {
      return {
        success: true,
        email: cleanEmail,
        resendIn: data.resendIn || 30,
        expiresIn: data.expiresIn || 300
      };
    }
    return {
      success: false,
      error: data?.error || 'Unable to deliver verification code. Please check your email or try again shortly.',
      retryAfter: data?.retryAfter
    };
  } catch (err) {
    console.warn('[sendEmailOTP] Network error:', err);
    return {
      success: false,
      error: 'Network connection issue. Please check your internet and try again.'
    };
  }
};

/**
 * Verify a 6-digit OTP code against the server-side bcrypt hash in db.php.
 * Returns { success, error?, attemptsLeft? }
 */
export const verifyEmailOTP = async (email, inputCode) => {
  const cleanEmail = String(email || '').toLowerCase().trim();
  const cleanCode = String(inputCode || '').replace(/\D/g, '').trim();

  if (!cleanEmail || !cleanEmail.includes('@')) {
    return { success: false, error: 'Email address is missing or invalid.' };
  }
  if (cleanCode.length !== 6) {
    return { success: false, error: 'Please enter the complete 6-digit code.' };
  }

  const endpoint = 'https://emperialcabs.com/api/db.php?action=verifyEmailOTP';

  try {
    let data = null;
    if (typeof window !== 'undefined' && Capacitor.isNativePlatform()) {
      try {
        const nativeRes = await CapacitorHttp.request({
          url: endpoint,
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Accept': 'application/json'
          },
          data: {
            action: 'verifyEmailOTP',
            data: { email: cleanEmail, code: cleanCode }
          }
        });
        let payload = nativeRes?.data;
        if (typeof payload === 'string') {
          try { payload = JSON.parse(payload); } catch (e) {}
        }
        data = payload;
      } catch (nativeErr) {
        console.warn('[CapacitorHttp verifyEmailOTP error]', nativeErr);
      }
    }

    if (!data) {
      const res = await fetch(endpoint, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Accept': 'application/json'
        },
        body: JSON.stringify({
          action: 'verifyEmailOTP',
          data: { email: cleanEmail, code: cleanCode }
        })
      });
      data = await res.json().catch(() => null);
    }

    if (data && data.success) {
      return { success: true, email: cleanEmail };
    }
    return {
      success: false,
      error: data?.error || 'Invalid verification code. Please try again.',
      attemptsLeft: data?.attemptsLeft,
      errorCode: data?.errorCode
    };
  } catch (err) {
    console.warn('[verifyEmailOTP] Network error:', err);
    return {
      success: false,
      error: 'Unable to connect to verification server. Please try again.'
    };
  }
};
