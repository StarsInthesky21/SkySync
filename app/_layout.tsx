import { useCallback, useEffect, useRef, useState } from "react";
import { ActivityIndicator, View, Text, StyleSheet } from "react-native";
import { Stack } from "expo-router";
import { StatusBar } from "expo-status-bar";
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

const ONBOARDING_KEY = "@skysync/onboarding_complete";

export default function RootLayout() {
  const [showOnboarding, setShowOnboarding] = useState<boolean | null>(null);
  const notificationsInitialized = useRef(false);

  // Set up push notification handler on mount
  useEffect(() => {
    if (notificationsInitialized.current) return;
    notificationsInitialized.current = true;

    // Configure how foreground notifications are displayed
    notificationService.setupNotificationHandler();

    // Initialize notification channels + push token registration
    notificationService.init().catch((err) => {
      console.warn("[SkySync] Notification init failed:", err);
    });

    // Set up foreground notification listener
    let listenerSub: { remove: () => void } | undefined;
    (async () => {
      try {
        const expoNotifications = require("expo-notifications");
        listenerSub = expoNotifications.addNotificationReceivedListener(
          (notification: any) => {
            notificationService.handleNotificationReceived(notification);
          },
        );
      } catch {
        // expo-notifications not available
      }
    })();

    return () => {
      listenerSub?.remove();
    };
  }, []);

  useEffect(() => {
    AsyncStorage.getItem(ONBOARDING_KEY).then((value) => {
      setShowOnboarding(value !== "true");
    }).catch(() => {
      setShowOnboarding(true);
    });
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
