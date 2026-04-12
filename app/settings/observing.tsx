import { useEffect, useState } from "react";
import { Pressable, ScrollView, StyleSheet, Text, TextInput, View } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { Stack, useRouter } from "expo-router";
import { storage } from "@/services/storage";
import { colors, fontSize, radius, spacing } from "@/theme/colors";

export default function ObservingSettingsScreen() {
  const router = useRouter();
  const [lat, setLat] = useState("");
  const [lon, setLon] = useState("");
  const [saved, setSaved] = useState(false);

  useEffect(() => {
    storage.getSettings().then((s) => {
      if (s.latitude !== undefined) setLat(String(s.latitude));
      if (s.longitude !== undefined) setLon(String(s.longitude));
    });
  }, []);

  const handleSave = async () => {
    const latNum = parseFloat(lat);
    const lonNum = parseFloat(lon);
    const patch: Record<string, number | undefined> = {};
    if (!Number.isNaN(latNum) && latNum >= -90 && latNum <= 90) patch.latitude = latNum;
    if (!Number.isNaN(lonNum) && lonNum >= -180 && lonNum <= 180) patch.longitude = lonNum;
    if (Object.keys(patch).length === 0) {
      setSaved(false);
      return;
    }
    await storage.updateSettings(patch);
    setSaved(true);
  };

  return (
    <SafeAreaView style={styles.container} edges={["top"]}>
      <Stack.Screen options={{ title: "Observing location" }} />
      <View style={styles.header}>
        <Pressable onPress={() => router.back()}>
          <Text style={styles.back}>Back</Text>
        </Pressable>
        <Text style={styles.title}>Observing location</Text>
        <View style={{ width: 40 }} />
      </View>
      <ScrollView contentContainerStyle={styles.body}>
        <Text style={styles.hint}>
          Set your latitude and longitude so the sky renders, rise/set times, and observing conditions match
          where you are. The default is San Francisco.
        </Text>
        <Text style={styles.label}>Latitude (-90 to 90)</Text>
        <TextInput
          value={lat}
          onChangeText={setLat}
          placeholder="37.7749"
          placeholderTextColor={colors.textDim}
          keyboardType="numbers-and-punctuation"
          style={styles.input}
        />
        <Text style={styles.label}>Longitude (-180 to 180)</Text>
        <TextInput
          value={lon}
          onChangeText={setLon}
          placeholder="-122.4194"
          placeholderTextColor={colors.textDim}
          keyboardType="numbers-and-punctuation"
          style={styles.input}
        />
        <Pressable style={styles.saveBtn} onPress={handleSave}>
          <Text style={styles.saveText}>Save</Text>
        </Pressable>
        {saved && <Text style={styles.saved}>Saved.</Text>}
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.bg },
  header: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.md,
  },
  back: { color: colors.accentInfo, fontWeight: "700" },
  title: { color: colors.text, fontSize: fontSize.md, fontWeight: "800" },
  body: { padding: spacing.lg, gap: spacing.md },
  hint: { color: colors.textDim, fontSize: fontSize.sm, lineHeight: 20 },
  label: {
    color: colors.accent,
    fontSize: fontSize.xs,
    fontWeight: "800",
    textTransform: "uppercase",
    letterSpacing: 1,
  },
  input: {
    backgroundColor: colors.card,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: radius.md,
    padding: 12,
    color: colors.text,
    fontSize: fontSize.base,
  },
  saveBtn: {
    marginTop: 12,
    backgroundColor: colors.accent,
    paddingVertical: 14,
    borderRadius: radius.md,
    alignItems: "center",
  },
  saveText: { color: colors.onAccent, fontWeight: "800", fontSize: fontSize.base },
  saved: { color: colors.accentSuccess, marginTop: 8, textAlign: "center" },
});
