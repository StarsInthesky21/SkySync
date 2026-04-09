import { StatusBar } from "expo-status-bar";
import { SafeAreaProvider } from "react-native-safe-area-context";
import { ErrorBoundary } from "@/components/ErrorBoundary";
import { AuthProvider } from "@/providers/AuthProvider";
import { SkySyncProvider } from "@/providers/SkySyncProvider";
import { SkySyncHomeScreen } from "@/screens/SkySyncHomeScreen";

export default function App() {
  return (
    <SafeAreaProvider>
      <ErrorBoundary>
        <AuthProvider>
          <SkySyncProvider>
            <StatusBar style="light" />
            <SkySyncHomeScreen />
          </SkySyncProvider>
        </AuthProvider>
      </ErrorBoundary>
    </SafeAreaProvider>
  );
}
