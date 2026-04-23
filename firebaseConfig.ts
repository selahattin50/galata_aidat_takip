import { initializeApp } from 'firebase/app';
import { getDatabase } from 'firebase/database';
import { getAuth } from 'firebase/auth';

// Firebase yapılandırması
// Firebase Console'dan aldığınız bilgiler
const firebaseConfig = {
  apiKey: "AIzaSyDMignWuOM30mKdDmEp1fUN5FLjWcrAN98",
  authDomain: "galata-aidat-takip.firebaseapp.com",
  databaseURL: "https://galata-aidat-takip-default-rtdb.europe-west1.firebasedatabase.app",
  projectId: "galata-aidat-takip",
  storageBucket: "galata-aidat-takip.firebasestorage.app",
  messagingSenderId: "1028329548543",
  appId: "1:1028329548543:web:025650cb9bed20a6b2baca",
  measurementId: "G-G532MV7SSY"
};

// Firebase'i başlat
const app = initializeApp(firebaseConfig);

// Database ve Auth referansları
export const database = getDatabase(app);
export const auth = getAuth(app);
export default app;
