import { useState } from "react";
import { FlatList, Pressable, StyleSheet, Switch, Text, TextInput, View } from "react-native";
import { useSkySync } from "@/providers/SkySyncProvider";
import { colors, fontSize, radius, spacing } from "@/theme/colors";
import { SkyRoom } from "@/types/rooms";

type Props = {
  onStatus: (msg: string) => void;
};

export function RoomSection({ onStatus }: Props) {
  const { rooms, currentRoom, participants, callActive, userProfile, createRoom, joinRoom, setCallActive } =
    useSkySync();
  const [roomNameInput, setRoomNameInput] = useState("Orbit Club");
  const [roomCodeInput, setRoomCodeInput] = useState("");
  const [showBrowser, setShowBrowser] = useState(false);
  const username = userProfile?.username ?? "You";

  async function handleJoin() {
    if (!roomCodeInput.trim()) {
      onStatus("Please enter a room code");
      return;
    }
    onStatus(await joinRoom(roomCodeInput.trim()));
  }

  async function handleCreate() {
    const code = await createRoom(roomNameInput.trim() || "Orbit Club");
    setRoomCodeInput(code);
    onStatus(`Created room ${code}`);
  }

  async function handleJoinFromBrowser(roomCode: string) {
    const result = await joinRoom(roomCode);
    onStatus(result);
    setShowBrowser(false);
  }

  return (
    <View style={styles.card}>
      {/* Room Discovery Header */}
      <View style={styles.header}>
        <Text style={styles.sectionTitle}>Sky Rooms</Text>
        <Pressable
          style={({ pressed }) => [styles.browseBtn, pressed && { opacity: 0.7 }]}
          onPress={() => setShowBrowser(!showBrowser)}
          accessibilityRole="button"
          accessibilityLabel={showBrowser ? "Hide public rooms" : "Browse public rooms"}
        >
          <Text style={styles.browseBtnText}>{showBrowser ? "Hide" : "\u{1F30D} Browse"}</Text>
        </Pressable>
      </View>

      {/* Public Room Browser */}
      {showBrowser && (
        <View style={styles.browserSection}>
          <Text style={styles.browserTitle}>Public Rooms</Text>
          {rooms.length === 0 ? (
            <View style={styles.emptyBrowser}>
              <Text style={styles.emptyBrowserText}>
                No public rooms available. Create one to get started!
              </Text>
            </View>
          ) : (
            <FlatList
              data={rooms}
              keyExtractor={(r) => r.id}
              scrollEnabled={false}
              renderItem={({ item }: { item: SkyRoom }) => {
                const isCurrentRoom = currentRoom?.id === item.id;
                const participantCount = item.state.participants?.length ?? 0;
                return (
                  <Pressable
                    style={({ pressed }) => [
                      styles.roomCard,
                      isCurrentRoom && styles.roomCardActive,
                      pressed && { opacity: 0.8 },
                    ]}
                    onPress={() => !isCurrentRoom && handleJoinFromBrowser(item.roomCode)}
                    accessibilityRole="button"
                    accessibilityLabel={`Room ${item.name}, ${participantCount} participants${isCurrentRoom ? ", currently joined" : ""}`}
                  >
                    <View style={styles.roomCardTop}>
                      <Text style={styles.roomName}>{item.name || "Unnamed Room"}</Text>
                      <View style={[styles.roomBadge, isCurrentRoom && styles.roomBadgeActive]}>
                        <Text style={styles.roomBadgeText}>{isCurrentRoom ? "JOINED" : item.roomCode}</Text>
                      </View>
                    </View>
                    <View style={styles.roomMeta}>
                      <Text style={styles.roomMetaText}>
                        {participantCount} stargazer{participantCount !== 1 ? "s" : ""}
                      </Text>
                      {item.state.callActive && (
                        <View style={styles.voiceIndicator}>
                          <Text style={styles.voiceIndicatorText}>{"\u{1F3A4}"} Voice active</Text>
                        </View>
                      )}
                      {item.state.highlightedObjectIds.length > 0 && (
                        <Text style={styles.roomMetaText}>
                          {item.state.highlightedObjectIds.length} highlighted
                        </Text>
                      )}
                    </View>
                  </Pressable>
                );
              }}
            />
          )}
        </View>
      )}

      {/* Current room info */}
      {currentRoom && (
        <View style={styles.currentRoom}>
          <Text style={styles.currentRoomLabel}>Current Room</Text>
          <Text style={styles.currentRoomCode}>{currentRoom.roomCode}</Text>
          <Text style={styles.caption}>Participants: {participants.join(", ") || username}</Text>
        </View>
      )}

      {/* Voice ready toggle */}
      <View style={styles.voiceRow} accessibilityRole="switch">
        <Text style={styles.label}>Voice-ready room</Text>
        <Switch
          value={callActive}
          onValueChange={(v) => {
            setCallActive(v);
            onStatus(v ? "Room marked voice-ready" : "Voice-ready flag cleared");
          }}
          thumbColor={callActive ? colors.accentWarm : "#aaa"}
          trackColor={{ false: "rgba(255,255,255,0.15)", true: colors.glowWarm }}
          accessibilityLabel="Toggle voice-ready mode"
        />
      </View>

      {callActive && (
        <View style={styles.banner} accessibilityRole="alert">
          <Text style={styles.bannerText}>This room is marked as ready for a shared voice session</Text>
        </View>
      )}

      {/* Create / Join */}
      <TextInput
        value={roomNameInput}
        onChangeText={setRoomNameInput}
        style={styles.input}
        placeholder="Room name"
        placeholderTextColor={colors.textDim}
        maxLength={40}
        accessibilityLabel="Room name"
      />
      <TextInput
        value={roomCodeInput}
        onChangeText={setRoomCodeInput}
        style={styles.input}
        placeholder="Room code (e.g. SKY-A3B4K7)"
        placeholderTextColor={colors.textDim}
        autoCapitalize="characters"
        maxLength={12}
        accessibilityLabel="Room code to join"
      />
      <View style={styles.buttonRow}>
        <Pressable
          style={({ pressed }) => [styles.secondary, pressed && styles.secondaryPressed]}
          onPress={handleJoin}
          accessibilityRole="button"
        >
          <Text style={styles.secondaryText}>Join</Text>
        </Pressable>
        <Pressable
          style={({ pressed }) => [styles.primary, pressed && styles.primaryPressed]}
          onPress={handleCreate}
          accessibilityRole="button"
        >
          <Text style={styles.primaryText}>Create Room</Text>
        </Pressable>
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
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 12,
    elevation: 6,
  },
  header: { flexDirection: "row", justifyContent: "space-between", alignItems: "center", marginBottom: 10 },
  sectionTitle: { color: colors.text, fontSize: fontSize.md, fontWeight: "800" },
  browseBtn: {
    borderRadius: radius.pill,
    paddingHorizontal: 12,
    paddingVertical: 6,
    backgroundColor: "rgba(115,251,211,0.1)",
    borderWidth: 1,
    borderColor: "rgba(115,251,211,0.2)",
  },
  browseBtnText: { color: colors.accent, fontWeight: "700", fontSize: fontSize.xs },
  // Room browser
  browserSection: { marginBottom: 12, gap: 8 },
  browserTitle: {
    color: colors.textMuted,
    fontSize: fontSize.xs,
    fontWeight: "600",
    textTransform: "uppercase",
    letterSpacing: 1,
  },
  emptyBrowser: {
    borderRadius: radius.md,
    padding: 16,
    backgroundColor: "rgba(255,255,255,0.02)",
    alignItems: "center",
  },
  emptyBrowserText: { color: colors.textDim, fontSize: fontSize.xs, textAlign: "center" },
  roomCard: {
    borderRadius: radius.lg,
    padding: 12,
    backgroundColor: "rgba(255,255,255,0.03)",
    marginTop: 6,
    borderWidth: 1,
    borderColor: "rgba(255,255,255,0.04)",
  },
  roomCardActive: { borderColor: colors.accent, backgroundColor: "rgba(115,251,211,0.05)" },
  roomCardTop: { flexDirection: "row", justifyContent: "space-between", alignItems: "center" },
  roomName: { color: colors.text, fontWeight: "700", fontSize: fontSize.sm, flex: 1 },
  roomBadge: {
    borderRadius: radius.pill,
    paddingHorizontal: 8,
    paddingVertical: 3,
    backgroundColor: "rgba(255,255,255,0.06)",
  },
  roomBadgeActive: { backgroundColor: "rgba(115,251,211,0.15)" },
  roomBadgeText: { color: colors.textMuted, fontSize: 10, fontWeight: "700" },
  roomMeta: { flexDirection: "row", alignItems: "center", gap: 8, marginTop: 4 },
  roomMetaText: { color: colors.textDim, fontSize: fontSize.xs },
  voiceIndicator: {
    borderRadius: radius.pill,
    paddingHorizontal: 6,
    paddingVertical: 2,
    backgroundColor: "rgba(255,177,95,0.1)",
  },
  voiceIndicatorText: { color: colors.accentWarm, fontSize: 10, fontWeight: "600" },
  // Current room
  currentRoom: {
    borderRadius: radius.md,
    padding: 10,
    backgroundColor: "rgba(115,251,211,0.05)",
    borderWidth: 1,
    borderColor: "rgba(115,251,211,0.1)",
    marginBottom: 8,
  },
  currentRoomLabel: { color: colors.textDim, fontSize: fontSize.xs, fontWeight: "600" },
  currentRoomCode: { color: colors.accent, fontSize: fontSize.md, fontWeight: "800", marginTop: 2 },
  // Controls
  voiceRow: { flexDirection: "row", justifyContent: "space-between", alignItems: "center", marginBottom: 8 },
  label: { color: colors.textMuted, fontWeight: "600", fontSize: fontSize.sm },
  banner: { borderRadius: radius.sm, padding: 8, marginBottom: 6, backgroundColor: "rgba(255,177,95,0.08)" },
  bannerText: { color: colors.accentWarm, fontWeight: "600", fontSize: fontSize.xs, textAlign: "center" },
  caption: { color: colors.textDim, marginTop: 4, fontSize: fontSize.xs },
  input: {
    borderRadius: radius.md,
    backgroundColor: "rgba(255,255,255,0.03)",
    borderWidth: 1,
    borderColor: colors.border,
    paddingHorizontal: 14,
    paddingVertical: 11,
    color: colors.text,
    fontSize: fontSize.sm,
    marginTop: 8,
  },
  buttonRow: { flexDirection: "row", gap: 8, marginTop: 10 },
  primary: {
    flex: 1,
    borderRadius: radius.md,
    paddingVertical: 12,
    backgroundColor: colors.accent,
    alignItems: "center",
  },
  primaryPressed: { backgroundColor: colors.pressedPrimary },
  primaryText: { color: colors.onAccent, fontWeight: "800", fontSize: fontSize.sm },
  secondary: {
    flex: 1,
    borderRadius: radius.md,
    paddingVertical: 12,
    backgroundColor: colors.cardSoft,
    alignItems: "center",
  },
  secondaryPressed: { backgroundColor: colors.pressedSecondary },
  secondaryText: { color: colors.text, fontWeight: "700", fontSize: fontSize.sm },
});
