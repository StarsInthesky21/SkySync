import { StyleSheet, Text, View } from "react-native";
import { colors, fontSize, radius } from "@/theme/colors";
import type { VoiceParticipant } from "@/services/voice/livekitService";

type Props = { participant: VoiceParticipant };

export function ParticipantTile({ participant }: Props) {
  const initial = (participant.name || "?").slice(0, 1).toUpperCase();
  const levelBars = Math.max(0, Math.min(5, Math.round(participant.audioLevel * 5)));
  return (
    <View
      style={[
        styles.tile,
        participant.speaking && !participant.muted ? styles.tileActive : null,
        participant.isLocal ? styles.tileLocal : null,
      ]}
    >
      <View style={styles.avatar}>
        <Text style={styles.avatarText}>{initial}</Text>
        {participant.muted && (
          <View style={styles.mutedBadge}>
            <Text style={styles.mutedBadgeText}>MUTED</Text>
          </View>
        )}
      </View>
      <Text style={styles.name} numberOfLines={1}>
        {participant.name}
      </Text>
      <View style={styles.levelRow}>
        {Array.from({ length: 5 }).map((_, i) => (
          <View
            key={i}
            style={[
              styles.levelBar,
              { height: 3 + i * 1.5 },
              i < levelBars && !participant.muted ? styles.levelBarOn : styles.levelBarOff,
            ]}
          />
        ))}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  tile: {
    alignItems: "center",
    gap: 6,
    padding: 10,
    borderRadius: radius.md,
    backgroundColor: colors.card,
    borderWidth: 1,
    borderColor: colors.border,
    minWidth: 96,
  },
  tileActive: { borderColor: colors.accentSuccess, backgroundColor: "rgba(136,189,160,0.08)" },
  tileLocal: { borderColor: colors.accent },
  avatar: {
    width: 40,
    height: 40,
    borderRadius: radius.pill,
    backgroundColor: colors.cardSoft,
    borderWidth: 1,
    borderColor: colors.border,
    alignItems: "center",
    justifyContent: "center",
  },
  avatarText: { color: colors.text, fontWeight: "800", fontSize: fontSize.md },
  mutedBadge: {
    position: "absolute",
    bottom: -6,
    paddingHorizontal: 4,
    paddingVertical: 1,
    backgroundColor: colors.accentDanger,
    borderRadius: radius.pill,
  },
  mutedBadgeText: { color: colors.onAccent, fontSize: 8, fontWeight: "800", letterSpacing: 1 },
  name: { color: colors.text, fontSize: fontSize.xs, fontWeight: "700", maxWidth: 80 },
  levelRow: { flexDirection: "row", gap: 2, alignItems: "flex-end", height: 12 },
  levelBar: { width: 3, borderRadius: 1 },
  levelBarOn: { backgroundColor: colors.accentSuccess },
  levelBarOff: { backgroundColor: colors.border },
});
