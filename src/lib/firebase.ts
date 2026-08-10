import { initializeApp, getApps, getApp } from 'firebase/app';
import { getFirestore } from 'firebase/firestore';
import { getStorage } from 'firebase/storage';
import { getAuth } from 'firebase/auth';

const getEnvValue = (val: string | undefined, fallback: string): string => {
  if (!val || val.includes('YOUR_') || val === '') {
    return fallback;
  }
  return val;
};

const firebaseConfig = {
  apiKey: getEnvValue(process.env.NEXT_PUBLIC_FIREBASE_API_KEY, 'AIzaSyDummyKeyForBuildTimePrerendering'),
  authDomain: getEnvValue(process.env.NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN, 'specimen-manager-dummy.firebaseapp.com'),
  projectId: getEnvValue(process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID, 'specimen-manager-dummy'),
  storageBucket: getEnvValue(process.env.NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET, 'specimen-manager-dummy.appspot.com'),
  messagingSenderId: getEnvValue(process.env.NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID, '1234567890'),
  appId: getEnvValue(process.env.NEXT_PUBLIC_FIREBASE_APP_ID, '1:1234567890:web:1234567890abcdef'),
};

// Initialize Firebase app only once
const app = getApps().length > 0 ? getApp() : initializeApp(firebaseConfig);

export const db = getFirestore(app);
export const storage = getStorage(app);
export const auth = getAuth(app);
export default app;
