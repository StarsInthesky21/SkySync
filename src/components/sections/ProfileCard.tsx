import { useState, useEffect } from "react";
import { Pressable, StyleSheet, Text, TextInput, View } from "react-native";
import { useSkySync } from "@/providers/SkySyncProvider";
import { colors, fontSize, radius, spacing } from "@/theme/colors";

type Props = {
  onStatus: (msg: string) => void;
};

export function ProfileCard({ onStatus }: Props) {
  const { userProfile, updateUsername } = useSkySync();
  const [showEditor, setShowEditor] = useState(false);
  const [usernameInput, setUsernameInput] = useState("");

  const username = userProfile?.username ?? "Stargazer";

  useEffect(() => {
    if (userProfile) setUsernameInput(userProfile.username);
  }, [userProfile?.username]);

  function handleSave() {
    if (usernameInput.trim()) {
      updateUsername(usernameInput.trim());
      setShowEditor(false);
      onStatus(`Username updated to ${usernameInput.trim()}`);
    }
  }

  return (
    <View style={styles.card} accessibilityRole="summary">
      <View style={styles.row}>
        <View style={styles.avatar}>
          <Text style={styles.avatarText}>{username[0].toUpperCase()}</Text>
        </View>
        <View style={styles.info}>
          <Text style={styles.name}>{username}</Text>
          <Text style={styles.stat}>
            {userProfile?.xp ?? 0} XP | {userProfile?.planetsDiscovered.length ?? 0} planets | {userProfile?.totalStarsViewed ?? 0} viewed
          </Text>
        </View>
        <Pressable
          style={({ pressed }) => [styles.editChip, pressed && styles.pressed]}
          onPress={() => setShowEditor(!showEditor)}
          accessibilityRole="button"
          accessibilityLabel="Edit profile"
        >
          <Text style={styles.editText}>{showEditor ? "Close" : "Edit"}</Text>
        </Pressable>
      </View>
      {showEditor && (
        <View style={styles.editor}>
          <TextInput
            value={usernameInput}
            onChangeText={setUsernameInput}
            style={styles.input}
            placeholder="Enter username"
            placeholderTextColor={colors.textDim}
            maxLength={20}
          />
          <Pressable style={({ pressed }) => [styles.saveBtn, pressed && styles.saveBtnPressed]} onPress={handleSave}>
            <Text style={styles.saveBtnText}>Save</Text>
          </Pressable>
        </View>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  card: { borderRadius: radius.xl, padding: spacing.lg, backgroundColor: colors.card, borderWidth: 1, borderColor: colors.border, shadowColor: "#000", shadowOffset: { width: 0, height: 4 }, shadowOpacity: 0.3, shadowRadius: 12, elevation: 6 },
  row: { flexDirection: "row", alignItems: "center", gap: 12 },
  avatar: { width: 48, height: 48, borderRadius: radius.pill, backgroundColor: colors.accent, alignItems: "center", justifyContent: "center" },
  avatarText: { color: colors.onAccent, fontSize: fontSize.lg, fontWeight: "800" },
  info: { flex: 1 },
  name: { color: colors.text, fontSize: fontSize.base, fontWeight: "800" },
  stat: { color: colors.textDim, fontSize: fontSize.xs, marginTop: 2 },
  editChip: { borderRadius: radius.pill, paddingHorizontal: 12, paddingVertical: 5, backgroundColor: "rgba(255,255,255,0.08)" },
  editText: { color: colors.accent, fontWeight: "700", fontSize: fontSize.xs },
  pressed: { opacity: 0.7 },
  editor: { marginTop: spacing.md, gap: 8 },
  input: { borderRadius: radius.md, backgroundColor: "rgba(255,255,255,0.03)", borderWidth: 1, borderColor: colors.border, paddingHorizontal: 14, paddingVertical: 11, color: colors.text, fontSize: fontSize.sm },
  saveBtn: { borderRadius: radius.md, paddingVertical: 12, backgroundColor: colors.accent, alignItems: "center" },
  saveBtnPressed: { backgroundColor: colors.pressedPrimary },
  saveBtnText: { color: colors.onAccent, fontWeight: "800", fontSize: fontSize.sm },
});
