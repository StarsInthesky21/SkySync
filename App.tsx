import { useCallback, useEffect, useState } from "react";
import { StatusBar } from "expo-status-bar";
import { ActivityIndicator, View, Text, StyleSheet } from "react-native";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { SafeAreaProvider } from "react-native-safe-area-context";
import { ErrorBoundary } from "@/components/ErrorBoundary";
import { Onboarding } from "@/components/Onboarding";
import { ToastProvider } from "@/components/Toast";
import { AuthProvider } from "@/providers/AuthProvider";
import { SkySyncProvider } from "@/providers/SkySyncProvider";
import { SkySyncHomeScreen } from "@/screens/SkySyncHomeScreen";
import { colors, fontSize } from "@/theme/colors";

const ONBOARDING_KEY = "@skysync/onboarding_complete";

export default function App() {
  const [showOnboarding, setShowOnboarding] = useState<boolean | null>(null);

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

  return (
    <SafeAreaProvider>
      <ErrorBoundary>
        <ToastProvider>
          <AuthProvider>
            <SkySyncProvider>
              <StatusBar style="light" />
              {showOnboarding ? (
                <Onboarding onComplete={handleOnboardingComplete} />
              ) : (
                <SkySyncHomeScreen />
              )}
            </SkySyncProvider>
          </AuthProvider>
        </ToastProvider>
      </ErrorBoundary>
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
