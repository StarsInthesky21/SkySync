import { SafeAreaView, StyleSheet } from "react-native";
import { useRouter } from "expo-router";
import { SettingsScreen } from "@/components/SettingsScreen";
import { useAppState } from "@/hooks/useAppState";
import { colors } from "@/theme/colors";

export default function SettingsRoute() {
  const app = useAppState();
  const router = useRouter();

  return (
    <SafeAreaView style={styles.safe}>
      <SettingsScreen
        onClose={() => router.back()}
        voiceGuideEnabled={app.voiceGuideEnabled}
        setVoiceGuideEnabled={app.setVoiceGuideEnabled}
      />
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: colors.bg },
});
