import { useCallback, useEffect, useRef, useState } from "react";
import { ActivityIndicator, View, Text, StyleSheet } from "react-native";
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
import { notificationService } from "@/services/notifications";
import { colors, fontSize } from "@/theme/colors";

// Keep splash screen visible while we check onboarding state.
// Safety: if anything goes wrong, force-hide after 5 seconds so the app isn't stuck.
SplashScreen.preventAutoHideAsync().catch(() => {});
setTimeout(() => { SplashScreen.hideAsync().catch(() => {}); }, 5000);

const ONBOARDING_KEY = "@skysync/onboarding_complete";

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
        await notificationService.setupNotificationHandler();
      } catch {
        // Notifications not available on this platform
      }

      try {
        await notificationService.init();
      } catch {
        // Notification init failed - not critical
      }

      try {
        const expoNotifications = require("expo-notifications");
        if (expoNotifications?.addNotificationReceivedListener) {
          listenerSub = expoNotifications.addNotificationReceivedListener(
            (notification: any) => {
              try {
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
    };

    // Run with a timeout guard so it never blocks the app
    Promise.race([
      initNotifications(),
      new Promise((resolve) => setTimeout(resolve, 3000)),
    ]).catch(() => {});

    return () => {
      try { listenerSub?.remove(); } catch {}
    };
  }, []);

  useEffect(() => {
    let mounted = true;

    const fallbackTimer = setTimeout(() => {
      if (!mounted) return;
      setShowOnboarding((current) => current ?? true);
      SplashScreen.hideAsync().catch(() => {});
    }, 4000);

    AsyncStorage.getItem(ONBOARDING_KEY).then((value) => {
      if (!mounted) return;
      setShowOnboarding(value !== "true");
    }).catch(() => {
      if (!mounted) return;
      setShowOnboarding(true);
    }).finally(() => {
      clearTimeout(fallbackTimer);
      // Hide splash screen once we know the onboarding state
      SplashScreen.hideAsync().catch(() => {});
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
