import { initializeApp, getApps, getApp } from "firebase/app";
import { getAuth, initializeAuth, browserLocalPersistence, Auth } from "firebase/auth";
import { initializeFirestore, getFirestore, persistentLocalCache, persistentSingleTabManager, Firestore } from "firebase/firestore";
import AsyncStorage from "@react-native-async-storage/async-storage";
import Constants from "expo-constants";
import { Platform } from "react-native";

// Firebase v11 moved React Native persistence into the main auth module
let getReactNativePersistence: any = null;
try {
  const authModule = require("firebase/auth");
  getReactNativePersistence = authModule.getReactNativePersistence;
} catch {
  // Not available — will fall back to getAuth()
}

const extra = Constants.expoConfig?.extra ?? {};

// Firebase config is read from app.json extra fields.
// For production builds, populate these via eas.json env -> app.config.js.
// NEVER commit real API keys to source control.
const firebaseConfig = {
  apiKey: extra.firebaseApiKey ?? "",
  authDomain: extra.firebaseAuthDomain ?? "",
  projectId: extra.firebaseProjectId ?? "",
  storageBucket: extra.firebaseStorageBucket ?? "",
  messagingSenderId: extra.firebaseMessagingSenderId ?? "",
  appId: extra.firebaseAppId ?? "",
};

// Guard: only initialize Firebase if we have real credentials.
// Empty strings from app.json defaults will cause initializeApp to throw or hang.
const hasValidConfig = Boolean(firebaseConfig.apiKey && firebaseConfig.projectId);

let app: ReturnType<typeof initializeApp> | null = null;
let auth: Auth | null = null;
let db: Firestore | null = null;

if (hasValidConfig) {
  try {
    app = getApps().length === 0 ? initializeApp(firebaseConfig) : getApp();

    if (Platform.OS === "web") {
      auth = getAuth(app);
    } else if (getReactNativePersistence) {
      try {
        auth = initializeAuth(app, {
          persistence: getReactNativePersistence(AsyncStorage),
        });
      } catch {
        auth = getAuth(app);
      }
    } else {
      auth = getAuth(app);
    }

    try {
      db = initializeFirestore(app, {
        localCache: persistentLocalCache({ tabManager: persistentSingleTabManager(undefined) }),
      });
    } catch {
      db = getFirestore(app);
    }
  } catch (error) {
    console.warn("[SkySync Firebase] Failed to initialize:", error);
    app = null;
    auth = null;
    db = null;
  }
}

export { app, auth, db };
