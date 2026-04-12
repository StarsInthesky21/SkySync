import { useCallback } from "react";
import { ActivityIndicator, Pressable, ScrollView, StyleSheet, Text, View } from "react-native";
import { useSkySync } from "@/providers/SkySyncProvider";
import { useVoice } from "@/providers/VoiceProvider";
import { ParticipantTile } from "@/components/voice/ParticipantTile";
import { colors, fontSize, radius, spacing } from "@/theme/colors";

type Props = {
  onStatus: (msg: string) => void;
};

export function VoiceLounge({ onStatus }: Props) {
  const {
    currentRoom,
    userProfile,
    participants: roomParticipants,
    setCallActive,
    callActive,
  } = useSkySync();
  const voice = useVoice();

  const handleConnect = useCallback(async () => {
    if (!currentRoom) {
      onStatus("Join a room first to start a voice session");
      return;
    }
    try {
      await voice.connect({
        roomId: currentRoom.id,
        userId: userProfile?.username ?? "guest",
        displayName: userProfile?.username ?? "Guest",
      });
      setCallActive(true);
      onStatus("Voice connected");
    } catch (err) {
      const message = err instanceof Error ? err.message : "Voice connect failed";
      if (message === "VOICE_UNAVAILABLE") {
        onStatus("Voice requires a dev build — see README");
      } else if (message === "VOICE_NOT_CONFIGURED") {
        onStatus("Voice backend not configured (EXPO_PUBLIC_LIVEKIT_TOKEN_URL)");
      } else {
        onStatus(`Voice: ${message}`);
      }
    }
  }, [currentRoom, userProfile, voice, setCallActive, onStatus]);

  const handleLeave = useCallback(async () => {
    await voice.leave();
    setCallActive(false);
    onStatus("Left voice");
  }, [voice, setCallActive, onStatus]);

  const qualityColor =
    voice.quality === "excellent"
      ? colors.accentSuccess
      : voice.quality === "good"
        ? colors.accent
        : voice.quality === "poor"
          ? colors.accentDanger
          : colors.textDim;

  const participantsToRender = voice.connected
    ? voice.participants
    : roomParticipants.map((name) => ({
        id: name,
        name,
        speaking: false,
        muted: false,
        audioLevel: 0,
        isLocal: false,
      }));

  return (
    <View style={styles.card}>
      <View style={styles.header}>
        <Text style={styles.title}>Voice Lounge</Text>
        <View style={styles.statusRow}>
          <View
            style={[
              styles.statusDot,
              {
                backgroundColor: voice.connected
                  ? colors.accentSuccess
                  : callActive
                    ? colors.accentWarm
                    : colors.textDim,
              },
            ]}
          />
          <Text style={styles.statusLabel}>
            {voice.connected ? `LIVE \u00B7 ${voice.quality.toUpperCase()}` : callActive ? "READY" : "IDLE"}
          </Text>
          {voice.connected && <View style={[styles.qualityPip, { backgroundColor: qualityColor }]} />}
        </View>
      </View>

      {voice.error && (
        <View style={styles.errorBanner}>
          <Text style={styles.errorText}>{voice.error}</Text>
        </View>
      )}

      {!voice.available && (
        <View style={styles.previewBanner}>
          <Text style={styles.previewTitle}>Native voice isn&apos;t available in this build.</Text>
          <Text style={styles.previewBody}>
            Expo Go doesn&apos;t include LiveKit&apos;s WebRTC module. Run a dev build to enable live voice.
          </Text>
        </View>
      )}

      {participantsToRender.length > 0 && (
        <ScrollView
          horizontal
          showsHorizontalScrollIndicator={false}
          contentContainerStyle={styles.participantList}
        >
          {participantsToRender.map((p) => (
            <ParticipantTile key={p.id} participant={p as any} />
          ))}
        </ScrollView>
      )}

      <View style={styles.controls}>
        {!voice.connected ? (
          <Pressable
            style={[styles.btn, styles.joinBtn, !voice.available && styles.btnDisabled]}
            onPress={handleConnect}
            disabled={!voice.available || voice.connecting}
          >
            {voice.connecting ? (
              <ActivityIndicator color={colors.onAccent} />
            ) : (
              <Text style={styles.btnText}>Join voice</Text>
            )}
          </Pressable>
        ) : (
          <>
            <Pressable
              style={[styles.btn, voice.localMuted ? styles.mutedBtn : styles.liveBtn]}
              onPress={voice.toggleMute}
            >
              <Text style={styles.btnText}>{voice.localMuted ? "Unmute" : "Mute"}</Text>
            </Pressable>
            <Pressable
              style={[styles.btn, styles.leaveBtn]}
              onLongPress={async () => {
                await voice.setPushToTalk(true);
              }}
              onPressOut={async () => {
                if (voice.connected && !voice.localMuted) {
                  await voice.setPushToTalk(false);
                }
              }}
            >
              <Text style={[styles.btnText, styles.pttText]}>Hold to talk</Text>
            </Pressable>
            <Pressable style={[styles.btn, styles.leaveBtn]} onPress={handleLeave}>
              <Text style={[styles.btnText, styles.leaveText]}>Leave</Text>
            </Pressable>
          </>
        )}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  card: {
    borderRadius: radius.xl,
    padding: spacing.lg,
    backgroundColor: colors.card,
    borderWidth: 1,
    borderColor: colors.border,
    gap: spacing.sm,
  },
  header: { flexDirection: "row", justifyContent: "space-between", alignItems: "center" },
  title: { color: colors.text, fontSize: fontSize.md, fontWeight: "800" },
  statusRow: { flexDirection: "row", alignItems: "center", gap: 6 },
  statusDot: { width: 10, height: 10, borderRadius: radius.pill },
  statusLabel: { color: colors.textDim, fontSize: fontSize.xs, fontWeight: "800", letterSpacing: 1 },
  qualityPip: { width: 6, height: 6, borderRadius: radius.pill, marginLeft: 4 },
  previewBanner: {
    borderRadius: radius.md,
    padding: 12,
    backgroundColor: "rgba(216,146,95,0.08)",
    borderWidth: 1,
    borderColor: "rgba(216,146,95,0.2)",
  },
  previewTitle: { color: colors.accentWarm, fontSize: fontSize.sm, fontWeight: "700" },
  previewBody: { color: colors.textDim, fontSize: fontSize.xs, lineHeight: 18, marginTop: 4 },
  errorBanner: {
    borderRadius: radius.md,
    padding: 10,
    backgroundColor: "rgba(214,111,99,0.12)",
    borderWidth: 1,
    borderColor: colors.accentDanger,
  },
  errorText: { color: colors.accentDanger, fontSize: fontSize.xs, fontWeight: "700" },
  participantList: { gap: 8, paddingVertical: 4 },
  controls: { flexDirection: "row", gap: 8, marginTop: 4 },
  btn: { flex: 1, borderRadius: radius.md, paddingVertical: 12, alignItems: "center" },
  joinBtn: { backgroundColor: colors.accent },
  liveBtn: { backgroundColor: colors.accentSuccess },
  mutedBtn: { backgroundColor: colors.accentWarm },
  leaveBtn: { backgroundColor: colors.cardSoft, borderWidth: 1, borderColor: colors.border },
  btnDisabled: { opacity: 0.5 },
  btnText: { color: colors.onAccent, fontWeight: "800", fontSize: fontSize.sm },
  pttText: { color: colors.text },
  leaveText: { color: colors.accentDanger },
});
