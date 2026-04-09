import { useCallback, useEffect, useState } from "react";
import { Pressable, StyleSheet, Text, View } from "react-native";
import { useSkySync } from "@/providers/SkySyncProvider";
import { useAuth } from "@/providers/AuthProvider";
import { voipService, VoipState, VoipParticipant } from "@/services/voip/VoipService";
import { colors, fontSize, radius, spacing } from "@/theme/colors";

type Props = {
  onStatus: (msg: string) => void;
};

function ParticipantBadge({ participant }: { participant: VoipParticipant }) {
  return (
    <View style={[styles.participantBadge, participant.isSpeaking && styles.participantSpeaking]}>
      <View style={[styles.participantDot, participant.isMuted && styles.participantMuted]} />
      <Text style={styles.participantName}>{participant.username}</Text>
      {participant.isMuted && <Text style={styles.mutedLabel}>muted</Text>}
      {participant.isSpeaking && <Text style={styles.speakingLabel}>speaking</Text>}
    </View>
  );
}

export function VoiceLounge({ onStatus }: Props) {
  const { currentRoom } = useSkySync();
  const { user } = useAuth();
  const [voipState, setVoipState] = useState<VoipState>(voipService.getState());

  useEffect(() => {
    return voipService.subscribe(setVoipState);
  }, []);

  const handleToggle = useCallback(async () => {
    if (voipState.isConnected) {
      await voipService.leaveLounge();
      onStatus("Left voice lounge");
    } else if (currentRoom) {
      await voipService.joinLounge(
        currentRoom.id,
        user?.uid ?? "local",
        user?.email ?? "You",
      );
      onStatus("Joined voice lounge");
    } else {
      onStatus("Join a room first to use voice lounge");
    }
  }, [voipState.isConnected, currentRoom, user, onStatus]);

  const handleMute = useCallback(() => {
    voipService.toggleMute();
    onStatus(voipState.isMuted ? "Unmuted" : "Muted");
  }, [voipState.isMuted, onStatus]);

  return (
    <View style={styles.card}>
      <View style={styles.header}>
        <Text style={styles.title}>Voice Lounge</Text>
        <View style={[styles.statusDot, voipState.isConnected && styles.statusDotLive]} />
      </View>

      {voipState.isConnecting && (
        <Text style={styles.connecting}>Connecting to voice lounge...</Text>
      )}

      {voipState.error && (
        <View style={styles.errorBanner}>
          <Text style={styles.errorText}>{voipState.error}</Text>
        </View>
      )}

      {voipState.isConnected && (
        <View style={styles.participantList}>
          {voipState.participants.map((p) => (
            <ParticipantBadge key={p.userId} participant={p} />
          ))}
        </View>
      )}

      <View style={styles.controls}>
        <Pressable
          style={({ pressed }) => [
            styles.toggleBtn,
            voipState.isConnected ? styles.leaveBtn : styles.joinBtn,
            pressed && styles.btnPressed,
          ]}
          onPress={handleToggle}
          accessibilityRole="button"
          accessibilityLabel={voipState.isConnected ? "Leave voice lounge" : "Join voice lounge"}
        >
          <Text style={[styles.toggleText, voipState.isConnected && styles.leaveText]}>
            {voipState.isConnecting ? "Connecting..." : voipState.isConnected ? "Leave Lounge" : "Join Lounge"}
          </Text>
        </Pressable>

        {voipState.isConnected && (
          <Pressable
            style={({ pressed }) => [styles.muteBtn, voipState.isMuted && styles.mutedBtn, pressed && styles.btnPressed]}
            onPress={handleMute}
            accessibilityRole="button"
            accessibilityLabel={voipState.isMuted ? "Unmute microphone" : "Mute microphone"}
          >
            <Text style={styles.muteText}>{voipState.isMuted ? "Unmute" : "Mute"}</Text>
          </Pressable>
        )}
      </View>

      {!voipState.isConnected && !voipState.isConnecting && (
        <Text style={styles.hint}>
          {currentRoom ? "Tap Join Lounge to start voice chatting with room participants" : "Join a room first to use voice lounge"}
        </Text>
      )}
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
  connecting: { color: colors.accentWarm, fontSize: fontSize.xs, fontStyle: "italic", marginBottom: 8 },
  errorBanner: { borderRadius: radius.sm, padding: 8, backgroundColor: "rgba(255,111,97,0.1)", marginBottom: 8 },
  errorText: { color: colors.accentDanger, fontSize: fontSize.xs, textAlign: "center" },
  participantList: { flexDirection: "row", flexWrap: "wrap", gap: 8, marginBottom: 12 },
  participantBadge: {
    flexDirection: "row", alignItems: "center", gap: 6,
    borderRadius: radius.pill, paddingHorizontal: 12, paddingVertical: 6,
    backgroundColor: "rgba(255,255,255,0.06)", borderWidth: 1, borderColor: "rgba(255,255,255,0.08)",
  },
  participantSpeaking: { borderColor: colors.accent, backgroundColor: "rgba(115,251,211,0.06)" },
  participantDot: { width: 8, height: 8, borderRadius: radius.pill, backgroundColor: colors.accentSuccess },
  participantMuted: { backgroundColor: colors.accentDanger },
  participantName: { color: colors.text, fontSize: fontSize.xs, fontWeight: "700" },
  mutedLabel: { color: colors.accentDanger, fontSize: 10, fontWeight: "600" },
  speakingLabel: { color: colors.accent, fontSize: 10, fontWeight: "600" },
  controls: { flexDirection: "row", gap: 8 },
  toggleBtn: { flex: 1, borderRadius: radius.md, paddingVertical: 12, alignItems: "center" },
  joinBtn: { backgroundColor: colors.accent },
  leaveBtn: { backgroundColor: colors.accentDanger },
  btnPressed: { opacity: 0.8 },
  toggleText: { color: colors.onAccent, fontWeight: "800", fontSize: fontSize.sm },
  leaveText: { color: colors.text },
  muteBtn: { borderRadius: radius.md, paddingVertical: 12, paddingHorizontal: 20, backgroundColor: colors.cardSoft, alignItems: "center" },
  mutedBtn: { backgroundColor: "rgba(255,111,97,0.15)" },
  muteText: { color: colors.text, fontWeight: "700", fontSize: fontSize.sm },
  hint: { color: colors.textDim, fontSize: fontSize.xs, marginTop: 8, textAlign: "center" },
});
