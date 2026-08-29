// Firebase client init (Auth only — room/chat data lives in Firestore but is
// written/read by the backend via firebase-admin, not directly from the
// browser, so no Firestore client SDK is needed here).
//
// All values come from REACT_APP_FIREBASE_* env vars (see .env.example).
// These are safe to expose in the client bundle — Firebase web config is not
// a secret, access is controlled by Firebase Auth + security rules on the
// backend/service-account side.
import { initializeApp } from 'firebase/app';
import { getAuth, GoogleAuthProvider } from 'firebase/auth';

const firebaseConfig = {
    apiKey: process.env.REACT_APP_FIREBASE_API_KEY,
    authDomain: process.env.REACT_APP_FIREBASE_AUTH_DOMAIN,
    projectId: process.env.REACT_APP_FIREBASE_PROJECT_ID,
    storageBucket: process.env.REACT_APP_FIREBASE_STORAGE_BUCKET,
    messagingSenderId: process.env.REACT_APP_FIREBASE_MESSAGING_SENDER_ID,
    appId: process.env.REACT_APP_FIREBASE_APP_ID,
};

const app = initializeApp(firebaseConfig);
export const auth = getAuth(app);
export const googleProvider = new GoogleAuthProvider();
export default app;
