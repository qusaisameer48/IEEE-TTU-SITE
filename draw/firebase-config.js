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
const firebaseConfig = {
  apiKey: "AIzaSyBCm0XIV_GH3IMKd3FZXuo1IPbek7IiJE4",
  authDomain: "ieee-sports-draw-2026.firebaseapp.com",
  databaseURL: "https://ieee-sports-draw-2026-default-rtdb.firebaseio.com",
  projectId: "ieee-sports-draw-2026",
  storageBucket: "ieee-sports-draw-2026.firebasestorage.app",
  messagingSenderId: "176178791923",
  appId: "1:176178791923:web:6ffc91fd35c0993fda7e86",
  measurementId: "G-VW00Y915N5"
};

// 2) Set the password only YOU (the draw admin) should know.
//    Anyone who enters this correctly on the 🛡 icon gets control
//    of the draw on their device. Change it to something of your own.
const ADMIN_PASSWORD = "Myplaystation";