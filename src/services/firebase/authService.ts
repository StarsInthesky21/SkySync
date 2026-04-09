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
import { auth } from "./config";

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
    return mapUser(result.user)!;
  },

  async signInWithEmail(email: string, password: string): Promise<AuthUser> {
    const result = await signInWithEmailAndPassword(auth, email, password);
    return mapUser(result.user)!;
  },

  async createAccount(email: string, password: string): Promise<AuthUser> {
    const result = await createUserWithEmailAndPassword(auth, email, password);
    return mapUser(result.user)!;
  },

  async upgradeAnonymousToEmail(email: string, password: string): Promise<AuthUser> {
    const currentUser = auth.currentUser;
    if (!currentUser || !currentUser.isAnonymous) {
      throw new Error("No anonymous user to upgrade");
    }
    const credential = EmailAuthProvider.credential(email, password);
    const result = await linkWithCredential(currentUser, credential);
    return mapUser(result.user)!;
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
