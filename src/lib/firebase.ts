import { initializeApp, getApps, getApp } from 'firebase/app';
import { getAuth } from 'firebase/auth';
import { getFirestore } from 'firebase/firestore';
import { getStorage } from 'firebase/storage';

// Configuration from firebase-applet-config.json
export const firebaseConfig = {
  projectId: "gen-lang-client-0556432197",
  appId: "1:854129268637:web:3c80fdaacc496691260174",
  apiKey: "AIzaSyBjm8fmBoMcpHOea1pGSsaNrU47Wuve0B8",
  authDomain: "gen-lang-client-0556432197.firebaseapp.com",
  firestoreDatabaseId: "ai-studio-aulaviva-b9c4568f-d917-4903-805b-edf24bbb6c62",
  storageBucket: "gen-lang-client-0556432197.firebasestorage.app",
  messagingSenderId: "854129268637",
};

// Initialize Firebase App
export const app = !getApps().length ? initializeApp(firebaseConfig) : getApp();

// Initialize Firebase Auth
export const auth = getAuth(app);

// Initialize Cloud Firestore with dedicated Database ID
export const db = getFirestore(
  app,
  firebaseConfig.firestoreDatabaseId || '(default)'
);

// Initialize Cloud Storage (evidence uploads)
export const storage = getStorage(app, `gs://${firebaseConfig.storageBucket}`);

export const isFirebaseConfigured = Boolean(
  firebaseConfig.projectId && firebaseConfig.apiKey
);
