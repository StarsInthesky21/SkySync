import {
  signInAnonymously,
  signInWithEmailAndPassword,
  createUserWithEmailAndPassword,
  linkWithCredential,
  EmailAuthProvider,
  onAuthStateChanged as firebaseOnAuthStateChanged,
  signOut as firebaseSignOut,
  User,
} from "firebase/auth";
import { auth as _auth } from "./config";

// Firebase services are only dynamically imported when isFirebaseEnabled=true,
// which means auth is guaranteed to be non-null here.
// If somehow reached without valid config, throw early with a clear message.
function getAuth() {
  if (!_auth) throw new Error("[SkySync] Firebase auth not initialized. Check your Firebase config.");
  return _auth;
}
const auth = getAuth();

export type AuthUser = {
  uid: string;
  isAnonymous: boolean;
  email: string | null;
};

function mapUser(user: User | null): AuthUser | null {
  if (!user) return null;
  return {
    uid: user.uid,
    isAnonymous: user.isAnonymous,
    email: user.email,
  };
}

export const authService = {
  async signInAnonymous(): Promise<AuthUser> {
    const result = await signInAnonymously(auth);
    const user = mapUser(result.user);
    if (!user) throw new Error("Anonymous sign-in returned no user");
    return user;
  },

  async signInWithEmail(email: string, password: string): Promise<AuthUser> {
    const result = await signInWithEmailAndPassword(auth, email, password);
    const user = mapUser(result.user);
    if (!user) throw new Error("Email sign-in returned no user");
    return user;
  },

  async createAccount(email: string, password: string): Promise<AuthUser> {
    const result = await createUserWithEmailAndPassword(auth, email, password);
    const user = mapUser(result.user);
    if (!user) throw new Error("Account creation returned no user");
    return user;
  },

  async upgradeAnonymousToEmail(email: string, password: string): Promise<AuthUser> {
    const currentUser = auth.currentUser;
    if (!currentUser || !currentUser.isAnonymous) {
      throw new Error("No anonymous user to upgrade");
    }
    const credential = EmailAuthProvider.credential(email, password);
    const result = await linkWithCredential(currentUser, credential);
    const user = mapUser(result.user);
    if (!user) throw new Error("Account upgrade returned no user");
    return user;
  },

  async signOut(): Promise<void> {
    await firebaseSignOut(auth);
  },

  onAuthStateChanged(callback: (user: AuthUser | null) => void): () => void {
    return firebaseOnAuthStateChanged(auth, (user) => {
      callback(mapUser(user));
    });
  },

  getCurrentUser(): AuthUser | null {
    return mapUser(auth.currentUser);
  },

  getCurrentUserId(): string | null {
    return auth.currentUser?.uid ?? null;
  },
};
