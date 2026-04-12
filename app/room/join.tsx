import { useState } from "react";
import { ActivityIndicator, Pressable, StyleSheet, Text, TextInput, View } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { Stack, useRouter } from "expo-router";
import { useSkySync } from "@/providers/SkySyncProvider";
import { colors, fontSize, radius, spacing } from "@/theme/colors";

export default function RoomJoinScreen() {
  const router = useRouter();
  const { joinRoom } = useSkySync();
  const [code, setCode] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleJoin = async () => {
    if (!code.trim() || busy) return;
    setBusy(true);
    setError(null);
    try {
      const trimmed = code.trim().toUpperCase();
      await joinRoom(trimmed);
      router.replace(`/room/${trimmed}`);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Could not join room");
    } finally {
      setBusy(false);
    }
  };

  return (
    <SafeAreaView style={styles.container} edges={["top"]}>
      <Stack.Screen options={{ title: "Join Sky Room" }} />
      <View style={styles.header}>
        <Pressable onPress={() => router.back()}>
          <Text style={styles.cancel}>Cancel</Text>
        </Pressable>
        <Text style={styles.title}>Join room</Text>
        <View style={{ width: 60 }} />
      </View>

      <View style={styles.body}>
        <Text style={styles.label}>Room code</Text>
        <TextInput
          autoFocus
          autoCapitalize="characters"
          value={code}
          onChangeText={setCode}
          placeholder="ABC123"
          placeholderTextColor={colors.textDim}
          style={styles.input}
          maxLength={10}
        />
        <Text style={styles.hint}>
          Ask the host for the 6-character code, or scan the share sheet they sent.
        </Text>

        {error && <Text style={styles.error}>{error}</Text>}

        <Pressable
          style={[styles.primaryBtn, (!code.trim() || busy) && styles.primaryDisabled]}
          disabled={!code.trim() || busy}
          onPress={handleJoin}
          accessibilityRole="button"
          accessibilityLabel="Submit join code"
        >
          {busy ? (
            <ActivityIndicator color={colors.onAccent} />
          ) : (
            <Text style={styles.primaryText}>Join room</Text>
          )}
        </Pressable>
      </View>
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
  cancel: { color: colors.accentInfo, fontWeight: "700" },
  title: { color: colors.text, fontSize: fontSize.md, fontWeight: "800" },
  body: { padding: spacing.lg, gap: spacing.md },
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
    fontSize: fontSize.lg,
    letterSpacing: 4,
    textAlign: "center",
  },
  hint: { color: colors.textDim, fontSize: fontSize.sm, lineHeight: 20 },
  error: { color: colors.accentDanger, fontSize: fontSize.sm },
  primaryBtn: {
    marginTop: spacing.md,
    backgroundColor: colors.accent,
    borderRadius: radius.md,
    paddingVertical: 14,
    alignItems: "center",
  },
  primaryDisabled: { opacity: 0.5 },
  primaryText: { color: colors.onAccent, fontSize: fontSize.base, fontWeight: "800" },
});
