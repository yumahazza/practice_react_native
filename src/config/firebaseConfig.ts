import { initializeApp, getApps, getApp } from "firebase/app";
import type { FirebaseApp } from "firebase/app";
import { getAuth, initializeAuth, type Auth } from "firebase/auth";
import { getFirestore, type Firestore } from "firebase/firestore";
import { Platform } from "react-native";
import AsyncStorage from "@react-native-async-storage/async-storage";

export const firebaseConfig = {
  apiKey: process.env.EXPO_PUBLIC_FIREBASE_API_KEY || "AIzaSyBiql1D01ndW5njPVgfNLQks5aLxV_vU3I",
  authDomain: process.env.EXPO_PUBLIC_FIREBASE_AUTH_DOMAIN || "project-ppk-9522b.firebaseapp.com",
  projectId: process.env.EXPO_PUBLIC_FIREBASE_PROJECT_ID || "project-ppk-9522b",
  storageBucket: process.env.EXPO_PUBLIC_FIREBASE_STORAGE_BUCKET || "project-ppk-9522b.firebasestorage.app",
  messagingSenderId: process.env.EXPO_PUBLIC_FIREBASE_MESSAGING_SENDER_ID || "1074631714089",
  appId: process.env.EXPO_PUBLIC_FIREBASE_APP_ID || "1:1074631714089:web:4be059fb87416d3e3c8338",
};

// Inisialisasi Firebase App secara Singleton (mencegah error duplikasi instance)
let app: FirebaseApp;
if (getApps().length === 0) {
  app = initializeApp(firebaseConfig);
} else {
  app = getApp();
}

// Inisialisasi Auth
function createAuth(): Auth {
  if (Platform.OS === "web") {
    return getAuth(app);
  }

  try {
    // eslint-disable-next-line @typescript-eslint/no-require-imports
    const authModule = require("firebase/auth");
    if (typeof authModule.getReactNativePersistence === "function") {
      return initializeAuth(app, {
        persistence: authModule.getReactNativePersistence(AsyncStorage),
      });
    }
  } catch (_) {
    // Abaikan jika sudah terinisialisasi
  }

  return getAuth(app);
}

export const auth: Auth = createAuth();
export const db: Firestore = getFirestore(app);

export const isFirebaseConfigured = (): boolean => {
  return Boolean(firebaseConfig.apiKey && firebaseConfig.projectId);
};

export default app;
