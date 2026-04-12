import { useCallback, useEffect, useRef, useState } from "react";
import { ActivityIndicator, Platform, View, Text, StyleSheet } from "react-native";
import { Stack } from "expo-router";
import { StatusBar } from "expo-status-bar";
import * as SplashScreen from "expo-splash-screen";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { SafeAreaProvider } from "react-native-safe-area-context";
import { GestureHandlerRootView } from "react-native-gesture-handler";
import { ErrorBoundary } from "@/components/ErrorBoundary";
import { Onboarding } from "@/components/Onboarding";
import { ToastProvider } from "@/components/Toast";
import { AuthProvider } from "@/providers/AuthProvider";
import { SkySyncProvider } from "@/providers/SkySyncProvider";
import { colors, fontSize } from "@/theme/colors";

// Keep splash screen visible while we check onboarding state.
SplashScreen.preventAutoHideAsync().catch(() => {});

// Safety: force-hide splash after 3 seconds on Android (where it's most likely to stick),
// 5 seconds on other platforms.
const SPLASH_SAFETY_MS = Platform.OS === "android" ? 3000 : 5000;
setTimeout(() => { SplashScreen.hideAsync().catch(() => {}); }, SPLASH_SAFETY_MS);

const ONBOARDING_KEY = "@skysync/onboarding_complete";

// Aggressively hide the splash screen — call from every path that resolves the UI state.
function hideSplash() {
  try { SplashScreen.hideAsync().catch(() => {}); } catch {}
}

export default function RootLayout() {
  const [showOnboarding, setShowOnboarding] = useState<boolean | null>(null);
  const notificationsInitialized = useRef(false);

  // Set up push notification handler on mount (non-blocking, fully wrapped in try/catch).
  // This entire block is fire-and-forget - it must NEVER block app launch.
  useEffect(() => {
    if (notificationsInitialized.current) return;
    notificationsInitialized.current = true;

    let listenerSub: { remove: () => void } | undefined;

    const initNotifications = async () => {
      try {
        const { notificationService } = await import("@/services/notifications");
        await notificationService.setupNotificationHandler();
      } catch {
        // Notifications not available on this platform
      }
    };

    // Run with a short timeout guard so it never blocks the app
    Promise.race([
      initNotifications(),
      new Promise((resolve) => setTimeout(resolve, 2000)),
    ]).catch(() => {});

    // Set up notification listener separately
    try {
      const expoNotifications = require("expo-notifications");
      if (expoNotifications?.addNotificationReceivedListener) {
        listenerSub = expoNotifications.addNotificationReceivedListener(
          (notification: any) => {
            try {
              const { notificationService } = require("@/services/notifications");
              notificationService.handleNotificationReceived(notification);
            } catch {
              // ignore
            }
          },
        );
      }
    } catch {
      // expo-notifications not available
    }

    return () => {
      try { listenerSub?.remove(); } catch {}
    };
  }, []);

  useEffect(() => {
    let mounted = true;

    // Shorter fallback for Android (2s) — AsyncStorage is fast
    const fallbackMs = Platform.OS === "android" ? 2000 : 4000;
    const fallbackTimer = setTimeout(() => {
      if (!mounted) return;
      setShowOnboarding((current) => current ?? true);
      hideSplash();
    }, fallbackMs);

    AsyncStorage.getItem(ONBOARDING_KEY).then((value) => {
      if (!mounted) return;
      setShowOnboarding(value !== "true");
    }).catch(() => {
      if (!mounted) return;
      setShowOnboarding(true);
    }).finally(() => {
      clearTimeout(fallbackTimer);
      hideSplash();
    });

    return () => {
      mounted = false;
      clearTimeout(fallbackTimer);
    };
  }, []);

  const handleOnboardingComplete = useCallback(async () => {
    await AsyncStorage.setItem(ONBOARDING_KEY, "true");
    setShowOnboarding(false);
  }, []);

  if (showOnboarding === null) {
    return (
      <SafeAreaProvider>
        <View style={styles.loadingScreen}>
          <Text style={styles.brand}>SkySync</Text>
          <ActivityIndicator size="large" color={colors.accent} />
        </View>
      </SafeAreaProvider>
    );
  }

  if (showOnboarding) {
    return (
      <SafeAreaProvider>
        <GestureHandlerRootView style={{ flex: 1 }}>
          <ErrorBoundary>
            <ToastProvider>
              <AuthProvider>
                <SkySyncProvider>
                  <StatusBar style="light" />
                  <Onboarding onComplete={handleOnboardingComplete} />
                </SkySyncProvider>
              </AuthProvider>
            </ToastProvider>
          </ErrorBoundary>
        </GestureHandlerRootView>
      </SafeAreaProvider>
    );
  }

  return (
    <SafeAreaProvider>
      <GestureHandlerRootView style={{ flex: 1 }}>
        <ErrorBoundary>
          <ToastProvider>
            <AuthProvider>
              <SkySyncProvider>
                <StatusBar style="light" />
                <Stack
                  screenOptions={{
                    headerShown: false,
                    contentStyle: { backgroundColor: colors.bg },
                    animation: "fade",
                  }}
                >
                  <Stack.Screen name="(tabs)" options={{ animation: "none" }} />
                  <Stack.Screen name="settings" options={{ presentation: "modal", animation: "slide_from_bottom" }} />
                </Stack>
              </SkySyncProvider>
            </AuthProvider>
          </ToastProvider>
        </ErrorBoundary>
      </GestureHandlerRootView>
    </SafeAreaProvider>
  );
}

const styles = StyleSheet.create({
  loadingScreen: {
    flex: 1,
    backgroundColor: colors.bg,
    alignItems: "center",
    justifyContent: "center",
    gap: 16,
  },
  brand: {
    color: colors.accent,
    fontSize: fontSize.hero,
    fontWeight: "800",
    letterSpacing: 2,
  },
});
