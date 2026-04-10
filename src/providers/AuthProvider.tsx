import { createContext, ReactNode, useContext, useEffect, useState } from "react";
import { isFirebaseEnabled } from "@/services/roomSyncService";

type AuthUser = {
  uid: string;
  isAnonymous: boolean;
  email: string | null;
};

type AuthContextValue = {
  user: AuthUser | null;
  isLoading: boolean;
  isFirebase: boolean;
  signOut: () => Promise<void>;
  signInWithEmail: (email: string, password: string) => Promise<void>;
  createAccount: (email: string, password: string) => Promise<void>;
  upgradeToEmail: (email: string, password: string) => Promise<void>;
};

const AuthContext = createContext<AuthContextValue | undefined>(undefined);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<AuthUser | null>(null);
  const [isLoading, setIsLoading] = useState(isFirebaseEnabled);

  useEffect(() => {
    if (!isFirebaseEnabled) {
      // Mock mode: create a fake local user immediately
      setUser({ uid: "local-user", isAnonymous: false, email: null });
      setIsLoading(false);
      return;
    }

    // Firebase mode: listen for auth state and sign in anonymously
    let unsubscribe: (() => void) | undefined;

    async function initAuth() {
      try {
        const { authService } = await import("@/services/firebase/authService");

        unsubscribe = authService.onAuthStateChanged((authUser) => {
          setUser(authUser);
          setIsLoading(false);
        });

        // If no user is signed in, sign in anonymously
        if (!authService.getCurrentUser()) {
          await authService.signInAnonymous();
        }
      } catch (error) {
        console.warn("[SkySync Auth] Failed to initialize:", error);
        // Fall back to local user on auth failure
        setUser({ uid: "local-user", isAnonymous: true, email: null });
        setIsLoading(false);
      }
    }

    initAuth();
    return () => { unsubscribe?.(); };
  }, []);

  const value: AuthContextValue = {
    user,
    isLoading,
    isFirebase: isFirebaseEnabled,
    signOut: async () => {
      if (!isFirebaseEnabled) return;
      try {
        const { authService } = await import("@/services/firebase/authService");
        await authService.signOut();
      } catch (error) {
        console.warn("[SkySync Auth] Sign out failed:", error);
      }
    },
    signInWithEmail: async (email: string, password: string) => {
      if (!isFirebaseEnabled) return;
      try {
        const { authService } = await import("@/services/firebase/authService");
        const signedIn = await authService.signInWithEmail(email, password);
        setUser(signedIn);
      } catch (error) {
        console.warn("[SkySync Auth] Sign in failed:", error);
        throw error;
      }
    },
    createAccount: async (email: string, password: string) => {
      if (!isFirebaseEnabled) return;
      try {
        const { authService } = await import("@/services/firebase/authService");
        const created = await authService.createAccount(email, password);
        setUser(created);
      } catch (error) {
        console.warn("[SkySync Auth] Create account failed:", error);
        throw error;
      }
    },
    upgradeToEmail: async (email: string, password: string) => {
      if (!isFirebaseEnabled) return;
      try {
        const { authService } = await import("@/services/firebase/authService");
        const upgraded = await authService.upgradeAnonymousToEmail(email, password);
        setUser(upgraded);
      } catch (error) {
        console.warn("[SkySync Auth] Upgrade failed:", error);
        throw error;
      }
    },
  };

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error("useAuth must be used inside AuthProvider");
  }
  return context;
}
