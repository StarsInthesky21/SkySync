import { useState } from "react";
import { Pressable, StyleSheet, Switch, Text, TextInput, View } from "react-native";
import { useSkySync } from "@/providers/SkySyncProvider";
import { colors, fontSize, radius, spacing } from "@/theme/colors";

type Props = {
  drawModeEnabled: boolean;
  setDrawModeEnabled: (v: boolean) => void;
  onStatus: (msg: string) => void;
};

export function DrawConstellations({ drawModeEnabled, setDrawModeEnabled, onStatus }: Props) {
  const { draftConstellationIds, clearDraftConstellation, saveDraftConstellation } = useSkySync();
  const [titleInput, setTitleInput] = useState("Custom Pattern");

  return (
    <View style={styles.card}>
      <View style={styles.header}>
        <Text style={styles.label}>Draw mode</Text>
        <Switch value={drawModeEnabled} onValueChange={(v) => { setDrawModeEnabled(v); onStatus(v ? "Tap stars to draw" : "Draw mode off"); }}
          thumbColor={drawModeEnabled ? colors.accent : "#aaa"} trackColor={{ false: "rgba(255,255,255,0.15)", true: colors.glow }} />
      </View>
      <Text style={styles.caption}>{draftConstellationIds.length} stars selected</Text>
      <TextInput value={titleInput} onChangeText={setTitleInput} style={styles.input} placeholder="Constellation name" placeholderTextColor={colors.textDim} maxLength={40} />
      <View style={styles.buttonRow}>
        <Pressable style={({ pressed }) => [styles.secondary, pressed && styles.secondaryPressed]} onPress={clearDraftConstellation}>
          <Text style={styles.secondaryText}>Clear</Text>
        </Pressable>
        <Pressable
          style={({ pressed }) => [styles.primary, draftConstellationIds.length < 2 && styles.disabled, pressed && styles.primaryPressed]}
          onPress={() => {
            if (draftConstellationIds.length < 2) { onStatus("Select at least 2 stars"); return; }
            saveDraftConstellation(titleInput);
            onStatus("Constellation saved!");
          }}
        >
          <Text style={styles.primaryText}>Save</Text>
        </Pressable>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  card: { borderRadius: radius.xl, padding: spacing.lg, backgroundColor: colors.card, borderWidth: 1, borderColor: colors.border, shadowColor: "#000", shadowOffset: { width: 0, height: 4 }, shadowOpacity: 0.3, shadowRadius: 12, elevation: 6 },
  header: { flexDirection: "row", justifyContent: "space-between", alignItems: "center", marginBottom: 8 },
  label: { color: colors.textMuted, fontWeight: "600", fontSize: fontSize.sm },
  caption: { color: colors.textDim, marginTop: 6, fontSize: fontSize.xs },
  input: { borderRadius: radius.md, backgroundColor: "rgba(255,255,255,0.03)", borderWidth: 1, borderColor: colors.border, paddingHorizontal: 14, paddingVertical: 11, color: colors.text, fontSize: fontSize.sm, marginTop: 8 },
  buttonRow: { flexDirection: "row", gap: 8, marginTop: 10 },
  primary: { flex: 1, borderRadius: radius.md, paddingVertical: 12, backgroundColor: colors.accent, alignItems: "center" },
  primaryPressed: { backgroundColor: colors.pressedPrimary },
  primaryText: { color: colors.onAccent, fontWeight: "800", fontSize: fontSize.sm },
  secondary: { flex: 1, borderRadius: radius.md, paddingVertical: 12, backgroundColor: colors.cardSoft, alignItems: "center" },
  secondaryPressed: { backgroundColor: colors.pressedSecondary },
  secondaryText: { color: colors.text, fontWeight: "700", fontSize: fontSize.sm },
  disabled: { opacity: 0.4 },
});
