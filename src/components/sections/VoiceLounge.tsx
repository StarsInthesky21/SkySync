import { useCallback } from "react";
import { Pressable, StyleSheet, Text, View } from "react-native";
import { useSkySync } from "@/providers/SkySyncProvider";
import { colors, fontSize, radius, spacing } from "@/theme/colors";

type Props = {
  onStatus: (msg: string) => void;
};

function ParticipantBadge({ username }: { username: string }) {
  return (
    <View style={styles.participantBadge}>
      <View style={styles.participantDot} />
      <Text style={styles.participantName}>{username}</Text>
    </View>
  );
}

export function VoiceLounge({ onStatus }: Props) {
  const { currentRoom, participants, callActive, setCallActive } = useSkySync();

  const handleToggle = useCallback(() => {
    if (!currentRoom) {
      onStatus("Join a room first to coordinate a voice session");
      return;
    }
    setCallActive(!callActive);
    onStatus(!callActive ? "Room marked voice-ready" : "Voice-ready flag cleared");
  }, [currentRoom, callActive, setCallActive, onStatus]);

  return (
    <View style={styles.card}>
      <View style={styles.header}>
        <Text style={styles.title}>Voice Lounge Preview</Text>
        <View style={[styles.statusDot, callActive && styles.statusDotLive]} />
      </View>

      <View style={styles.previewBanner}>
        <Text style={styles.previewTitle}>Live in-room voice is not enabled in this build.</Text>
        <Text style={styles.previewBody}>
          Use Sky Rooms to coordinate the session, then jump to your preferred call app while the native voice stack stays in beta.
        </Text>
      </View>

      {participants.length > 0 && (
        <View style={styles.participantList}>
          {participants.map((participant) => (
            <ParticipantBadge key={participant} username={participant} />
          ))}
        </View>
      )}

      <View style={styles.controls}>
        <Pressable
          style={({ pressed }) => [
            styles.toggleBtn,
            callActive ? styles.activeBtn : styles.joinBtn,
            pressed && styles.btnPressed,
          ]}
          onPress={handleToggle}
          accessibilityRole="button"
          accessibilityLabel={callActive ? "Clear voice-ready flag" : "Mark room voice-ready"}
        >
          <Text style={styles.toggleText}>{callActive ? "Voice-Ready" : "Mark Voice-Ready"}</Text>
        </Pressable>
      </View>

      <Text style={styles.hint}>
        {currentRoom
          ? "SkySync keeps the room in sync while voice calling is prepared for a future production release."
          : "Join a room first to coordinate a shared voice session."}
      </Text>
    </View>
  );
}

const styles = StyleSheet.create({
  card: {
    borderRadius: radius.xl, padding: spacing.lg, backgroundColor: colors.card,
    borderWidth: 1, borderColor: colors.border,
    shadowColor: "#000", shadowOffset: { width: 0, height: 4 }, shadowOpacity: 0.3, shadowRadius: 12, elevation: 6,
  },
  header: { flexDirection: "row", justifyContent: "space-between", alignItems: "center", marginBottom: 8 },
  title: { color: colors.text, fontSize: fontSize.md, fontWeight: "800" },
  statusDot: { width: 10, height: 10, borderRadius: radius.pill, backgroundColor: colors.textDim },
  statusDotLive: { backgroundColor: colors.accentSuccess, shadowColor: colors.accentSuccess, shadowOpacity: 0.8, shadowRadius: 6 },
  previewBanner: { borderRadius: radius.md, padding: 12, backgroundColor: "rgba(100,181,246,0.08)", borderWidth: 1, borderColor: "rgba(100,181,246,0.2)", marginBottom: 12 },
  previewTitle: { color: colors.accentInfo, fontSize: fontSize.sm, fontWeight: "700" },
  previewBody: { color: colors.textDim, fontSize: fontSize.xs, lineHeight: 18, marginTop: 4 },
  participantList: { flexDirection: "row", flexWrap: "wrap", gap: 8, marginBottom: 12 },
  participantBadge: {
    flexDirection: "row", alignItems: "center", gap: 6,
    borderRadius: radius.pill, paddingHorizontal: 12, paddingVertical: 6,
    backgroundColor: "rgba(255,255,255,0.06)", borderWidth: 1, borderColor: "rgba(255,255,255,0.08)",
  },
  participantDot: { width: 8, height: 8, borderRadius: radius.pill, backgroundColor: colors.accentSuccess },
  participantName: { color: colors.text, fontSize: fontSize.xs, fontWeight: "700" },
  controls: { flexDirection: "row", gap: 8 },
  toggleBtn: { flex: 1, borderRadius: radius.md, paddingVertical: 12, alignItems: "center" },
  joinBtn: { backgroundColor: colors.accent },
  activeBtn: { backgroundColor: colors.accentWarm },
  btnPressed: { opacity: 0.8 },
  toggleText: { color: colors.onAccent, fontWeight: "800", fontSize: fontSize.sm },
  hint: { color: colors.textDim, fontSize: fontSize.xs, marginTop: 8, textAlign: "center" },
});
