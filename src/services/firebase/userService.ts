import {
  doc,
  getDoc,
  setDoc,
  onSnapshot,
  serverTimestamp,
  Timestamp,
} from "firebase/firestore";
import { db } from "./config";
import { UserProfile, BadgeProgress, ChallengeProgress, AppSettings } from "../storage";

function userDocRef(userId: string) {
  return doc(db, "users", userId);
}

function challengeDocRef(userId: string) {
  return doc(db, "users", userId, "private", "challengeProgress");
}

function settingsDocRef(userId: string) {
  return doc(db, "users", userId, "private", "settings");
}

export const userService = {
  async getUserProfile(userId: string): Promise<UserProfile | null> {
    try {
      const snap = await getDoc(userDocRef(userId));
      if (!snap.exists()) return null;
      return snap.data() as UserProfile;
    } catch (error) {
      console.warn("[SkySync Firebase] Failed to get user profile:", error);
      return null;
    }
  },

  async saveUserProfile(userId: string, profile: UserProfile): Promise<void> {
    try {
      await setDoc(userDocRef(userId), {
        ...profile,
        lastModified: serverTimestamp(),
      }, { merge: true });
    } catch (error) {
      console.warn("[SkySync Firebase] Failed to save user profile:", error);
    }
  },

  async getChallengeProgress(userId: string): Promise<ChallengeProgress | null> {
    try {
      const snap = await getDoc(challengeDocRef(userId));
      if (!snap.exists()) return null;
      return snap.data() as ChallengeProgress;
    } catch (error) {
      console.warn("[SkySync Firebase] Failed to get challenge progress:", error);
      return null;
    }
  },

  async saveChallengeProgress(userId: string, progress: ChallengeProgress): Promise<void> {
    try {
      await setDoc(challengeDocRef(userId), progress, { merge: true });
    } catch (error) {
      console.warn("[SkySync Firebase] Failed to save challenge progress:", error);
    }
  },

  async getSettings(userId: string): Promise<AppSettings | null> {
    try {
      const snap = await getDoc(settingsDocRef(userId));
      if (!snap.exists()) return null;
      return snap.data() as AppSettings;
    } catch (error) {
      console.warn("[SkySync Firebase] Failed to get settings:", error);
      return null;
    }
  },

  async saveSettings(userId: string, settings: AppSettings): Promise<void> {
    try {
      await setDoc(settingsDocRef(userId), settings, { merge: true });
    } catch (error) {
      console.warn("[SkySync Firebase] Failed to save settings:", error);
    }
  },

  subscribeUserProfile(userId: string, listener: (profile: UserProfile | null) => void): () => void {
    return onSnapshot(userDocRef(userId), (snap) => {
      listener(snap.exists() ? (snap.data() as UserProfile) : null);
    }, (error) => {
      console.warn("[SkySync Firebase] Profile listener error:", error);
    });
  },
};
