/* =============================================================
   IEEE Sports Tournament 2026 — Draw System
   Firebase configuration

   This is what connects everyone's device to the SAME live draw.
   You must fill this in with your own free Firebase project's
   settings before the system will sync live across devices.

   Full step-by-step instructions are in SETUP-GUIDE.md.
   ============================================================= */

// 1) Paste your Firebase project's config object here
//    (Firebase Console → Project settings → General → Your apps → Web app → SDK setup)
const FIREBASE_CONFIG = {
  apiKey: "PASTE_YOUR_API_KEY",
  authDomain: "PASTE_YOUR_PROJECT.firebaseapp.com",
  databaseURL: "https://PASTE_YOUR_PROJECT-default-rtdb.firebaseio.com",
  projectId: "PASTE_YOUR_PROJECT",
  storageBucket: "PASTE_YOUR_PROJECT.appspot.com",
  messagingSenderId: "PASTE_YOUR_SENDER_ID",
  appId: "PASTE_YOUR_APP_ID"
};

// 2) Set the password only YOU (the draw admin) should know.
//    Anyone who enters this correctly on the 🛡 icon gets control
//    of the draw on their device. Change it to something of your own.
const ADMIN_PASSWORD = "ieee2026-change-me";
