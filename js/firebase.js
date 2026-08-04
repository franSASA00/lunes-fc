// Firebase initialization — shared app/auth/db instances used across all modules.
import { initializeApp } from "https://www.gstatic.com/firebasejs/10.12.0/firebase-app.js";
import { getAuth } from "https://www.gstatic.com/firebasejs/10.12.0/firebase-auth.js";
import { getFirestore } from "https://www.gstatic.com/firebasejs/10.12.0/firebase-firestore.js";

/* ── CONFIG ── */
const firebaseConfig = {
  apiKey: "AIzaSyAW4bJNXEiffWr3Ha746eL1pp6D6Ib2bv4",
  authDomain: "applunesfc.firebaseapp.com",
  projectId: "applunesfc",
  storageBucket: "applunesfc.firebasestorage.app",
  messagingSenderId: "412960951744",
  appId: "1:412960951744:web:47a0022d90845551290c25",
  measurementId: "G-G8NBK410JL"
};

export const app  = initializeApp(firebaseConfig);
export const auth = getAuth(app);
export const db   = getFirestore(app);
