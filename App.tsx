import { StatusBar } from "expo-status-bar";
import { SafeAreaProvider } from "react-native-safe-area-context";
import { SkySyncProvider } from "@/providers/SkySyncProvider";
import { SkySyncHomeScreen } from "@/screens/SkySyncHomeScreen";

export default function App() {
  return (
    <SafeAreaProvider>
      <SkySyncProvider>
        <StatusBar style="light" />
        <SkySyncHomeScreen />
      </SkySyncProvider>
    </SafeAreaProvider>
  );
}
