import { useState } from "react";
import { Pressable, StyleSheet, Switch, Text, TextInput, View } from "react-native";
import { useSkySync } from "@/providers/SkySyncProvider";
import { colors, fontSize, radius, spacing } from "@/theme/colors";

type Props = {
  onStatus: (msg: string) => void;
};

export function RoomSection({ onStatus }: Props) {
  const { rooms, currentRoom, participants, callActive, userProfile, createRoom, joinRoom, setCallActive } = useSkySync();
  const [roomNameInput, setRoomNameInput] = useState("Orbit Club");
  const [roomCodeInput, setRoomCodeInput] = useState("");
  const username = userProfile?.username ?? "You";

  function handleJoin() {
    if (!roomCodeInput.trim()) { onStatus("Please enter a room code"); return; }
    onStatus(joinRoom(roomCodeInput.trim()));
  }

  function handleCreate() {
    const code = createRoom(roomNameInput.trim() || "Orbit Club");
    setRoomCodeInput(code);
    onStatus(`Created room ${code}`);
  }

  return (
    <View style={styles.card}>
      <View style={styles.header}>
        <Text style={styles.label}>Voice lounge</Text>
        <Switch value={callActive} onValueChange={(v) => { setCallActive(v); onStatus(v ? "Voice lounge live" : "Voice lounge ended"); }}
          thumbColor={callActive ? colors.accentWarm : "#aaa"} trackColor={{ false: "rgba(255,255,255,0.15)", true: colors.glowWarm }} />
      </View>
      {callActive && (
        <View style={styles.banner}>
          <Text style={styles.bannerText}>You're marked as available for voice chat</Text>
        </View>
      )}
      <Text style={styles.caption}>Participants: {participants.join(", ") || username}</Text>
      <TextInput value={roomNameInput} onChangeText={setRoomNameInput} style={styles.input} placeholder="Room name" placeholderTextColor={colors.textDim} maxLength={40} />
      <TextInput value={roomCodeInput} onChangeText={setRoomCodeInput} style={styles.input} placeholder="Room code (e.g. SKY-A3B4K7)" placeholderTextColor={colors.textDim} autoCapitalize="characters" maxLength={12} />
      <View style={styles.buttonRow}>
        <Pressable style={({ pressed }) => [styles.secondary, pressed && styles.secondaryPressed]} onPress={handleJoin}>
          <Text style={styles.secondaryText}>Join</Text>
        </Pressable>
        <Pressable style={({ pressed }) => [styles.primary, pressed && styles.primaryPressed]} onPress={handleCreate}>
          <Text style={styles.primaryText}>Create Room</Text>
        </Pressable>
      </View>
      {rooms.length > 0 && <Text style={styles.caption}>Rooms: {rooms.map((r) => r.roomCode).join(", ")}</Text>}
    </View>
  );
}

const styles = StyleSheet.create({
  card: { borderRadius: radius.xl, padding: spacing.lg, backgroundColor: colors.card, borderWidth: 1, borderColor: colors.border, shadowColor: "#000", shadowOffset: { width: 0, height: 4 }, shadowOpacity: 0.3, shadowRadius: 12, elevation: 6 },
  header: { flexDirection: "row", justifyContent: "space-between", alignItems: "center", marginBottom: 8 },
  label: { color: colors.textMuted, fontWeight: "600", fontSize: fontSize.sm },
  banner: { borderRadius: radius.sm, padding: 8, marginBottom: 6, backgroundColor: "rgba(255,177,95,0.08)" },
  bannerText: { color: colors.accentWarm, fontWeight: "600", fontSize: fontSize.xs, textAlign: "center" },
  caption: { color: colors.textDim, marginTop: 6, fontSize: fontSize.xs },
  input: { borderRadius: radius.md, backgroundColor: "rgba(255,255,255,0.03)", borderWidth: 1, borderColor: colors.border, paddingHorizontal: 14, paddingVertical: 11, color: colors.text, fontSize: fontSize.sm, marginTop: 8 },
  buttonRow: { flexDirection: "row", gap: 8, marginTop: 10 },
  primary: { flex: 1, borderRadius: radius.md, paddingVertical: 12, backgroundColor: colors.accent, alignItems: "center" },
  primaryPressed: { backgroundColor: colors.pressedPrimary },
  primaryText: { color: colors.onAccent, fontWeight: "800", fontSize: fontSize.sm },
  secondary: { flex: 1, borderRadius: radius.md, paddingVertical: 12, backgroundColor: colors.cardSoft, alignItems: "center" },
  secondaryPressed: { backgroundColor: colors.pressedSecondary },
  secondaryText: { color: colors.text, fontWeight: "700", fontSize: fontSize.sm },
});
