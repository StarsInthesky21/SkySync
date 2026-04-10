import { initializeApp, getApps, getApp } from "firebase/app";
import { getAuth, initializeAuth, Auth } from "firebase/auth";
//@ts-expect-error - React Native persistence is in a subpath not reflected in base types
import { getReactNativePersistence } from "firebase/auth/react-native";
import { initializeFirestore, getFirestore, persistentLocalCache, persistentSingleTabManager, Firestore } from "firebase/firestore";
import AsyncStorage from "@react-native-async-storage/async-storage";
import Constants from "expo-constants";
import { Platform } from "react-native";

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

const app = getApps().length === 0 ? initializeApp(firebaseConfig) : getApp();

function createAuth(): Auth {
  if (Platform.OS === "web") {
    return getAuth(app);
  }
  try {
    return initializeAuth(app, {
      persistence: getReactNativePersistence(AsyncStorage),
    });
  } catch {
    return getAuth(app);
  }
}

function createFirestore(): Firestore {
  try {
    return initializeFirestore(app, {
      localCache: persistentLocalCache({ tabManager: persistentSingleTabManager(undefined) }),
    });
  } catch {
    return getFirestore(app);
  }
}

const auth: Auth = createAuth();
const db: Firestore = createFirestore();

export { app, auth, db };
