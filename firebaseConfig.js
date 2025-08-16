import { initializeApp, getApps } from "firebase/app";
import { initializeAuth, getReactNativePersistence, getAuth } from "firebase/auth";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { getFirestore } from "firebase/firestore";

const firebaseConfig = {
  apiKey: "AIzaSyASzxYvZUrtpBoMza3iT__p9Qkq7GYXkt4",
  authDomain: "quickhelp-eb705.firebaseapp.com",
  projectId: "quickhelp-eb705",
  storageBucket: "quickhelp-eb705.firebasestorage.app",
  messagingSenderId: "465564746658",
  appId: "1:465564746658:web:e4cf2bf105ac2876a728fb"
};

let app;
if (getApps().length === 0) {
  app = initializeApp(firebaseConfig);
} else {
  app = getApps()[0];
}

// 👇 Correct way for React Native auth initialization
let auth;
try {
  auth = initializeAuth(app, {
    persistence: getReactNativePersistence(AsyncStorage),
  });
} catch (e) {
  // If already initialized (e.g., hot reload), fallback to getAuth
  auth = getAuth(app);
}

const db = getFirestore(app);

export { auth, db };
export default app;
