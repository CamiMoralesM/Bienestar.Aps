// Configuración de Firebase
import { initializeApp } from "https://www.gstatic.com/firebasejs/10.7.1/firebase-app.js";
import { getAuth } from "https://www.gstatic.com/firebasejs/10.7.1/firebase-auth.js";
import { getFirestore } from "https://www.gstatic.com/firebasejs/10.7.1/firebase-firestore.js";
import { getAnalytics } from "https://www.gstatic.com/firebasejs/10.7.1/firebase-analytics.js";

// Configuración de tu proyecto Firebase
const firebaseConfig = {
  apiKey: "AIzaSyA9nXi619VOgT6mUYmYfu2jja8TRAj9QJE",
  authDomain: "bienestaraps-c87f0.firebaseapp.com",
  projectId: "bienestaraps-c87f0",
  storageBucket: "bienestaraps-c87f0.firebasestorage.app",
  messagingSenderId: "471175424877",
  appId: "1:471175424877:web:7e1a44f77362d13f78c864",
  measurementId: "G-G1MGN967WT"
};

// Inicializar Firebase
const app = initializeApp(firebaseConfig);
const auth = getAuth(app);
const db = getFirestore(app);
const analytics = getAnalytics(app);

export { app, auth, db, analytics };
