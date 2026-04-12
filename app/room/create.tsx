import { useState } from "react";
import { ActivityIndicator, Pressable, StyleSheet, Text, TextInput, View } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { Stack, useRouter } from "expo-router";
import { useSkySync } from "@/providers/SkySyncProvider";
import { colors, fontSize, radius, spacing } from "@/theme/colors";

export default function RoomCreateScreen() {
  const router = useRouter();
  const { createRoom } = useSkySync();
  const [name, setName] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleCreate = async () => {
    if (!name.trim() || busy) return;
    setBusy(true);
    setError(null);
    try {
      const code = await createRoom(name.trim());
      router.replace(`/room/${code}`);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Could not create room");
    } finally {
      setBusy(false);
    }
  };

  return (
    <SafeAreaView style={styles.container} edges={["top"]}>
      <Stack.Screen options={{ title: "Create Sky Room" }} />
      <View style={styles.header}>
        <Pressable onPress={() => router.back()}>
          <Text style={styles.cancel}>Cancel</Text>
        </Pressable>
        <Text style={styles.title}>New room</Text>
        <View style={{ width: 60 }} />
      </View>

      <View style={styles.body}>
        <Text style={styles.label}>Room name</Text>
        <TextInput
          autoFocus
          value={name}
          onChangeText={setName}
          placeholder="Winter Orion session"
          placeholderTextColor={colors.textDim}
          style={styles.input}
          maxLength={40}
        />
        <Text style={styles.hint}>
          Anyone with the room code can join and see your shared sky, highlights, and chat in real time.
        </Text>

        {error && <Text style={styles.error}>{error}</Text>}

        <Pressable
          style={[styles.primaryBtn, (!name.trim() || busy) && styles.primaryDisabled]}
          disabled={!name.trim() || busy}
          onPress={handleCreate}
        >
          {busy ? (
            <ActivityIndicator color={colors.onAccent} />
          ) : (
            <Text style={styles.primaryText}>Create room</Text>
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
    fontSize: fontSize.md,
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
