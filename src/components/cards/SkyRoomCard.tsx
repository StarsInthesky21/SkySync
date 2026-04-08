import { StyleSheet, Text, View } from "react-native";
import { GlassCard } from "@/components/cards/GlassCard";
import { PillButton } from "@/components/controls/PillButton";
import { colors } from "@/theme/colors";
import { SkyRoom } from "@/types/rooms";

type SkyRoomCardProps = {
  room?: SkyRoom;
  onCreate: () => void;
  onJoin: () => void;
  onPin: () => void;
};

export function SkyRoomCard({ room, onCreate, onJoin, onPin }: SkyRoomCardProps) {
  return (
    <GlassCard>
      <Text style={styles.title}>Sky Rooms</Text>
      {room ? (
        <View style={styles.infoBlock}>
          <Text style={styles.roomName}>{room.name}</Text>
          <Text style={styles.meta}>
            Invite {room.inviteCode} | {room.participants.length} explorers | {room.voiceEnabled ? "Voice live" : "Voice off"}
          </Text>
          <Text style={styles.detail}>Shared markers: {room.markers.length} | Live pointers: {room.pointers.length}</Text>
        </View>
      ) : (
        <Text style={styles.detail}>Create a room to sync sky orientation, shared notes, and live event watch parties.</Text>
      )}
      <View style={styles.actions}>
        <PillButton label="Create room" onPress={onCreate} />
        <PillButton label="Join demo" onPress={onJoin} />
        <PillButton label="Drop pin" active onPress={onPin} />
      </View>
    </GlassCard>
  );
}

const styles = StyleSheet.create({
  title: {
    color: colors.text,
    fontSize: 18,
    fontWeight: "700",
    marginBottom: 12,
  },
  infoBlock: {
    marginBottom: 14,
  },
  roomName: {
    color: colors.text,
    fontSize: 20,
    fontWeight: "700",
  },
  meta: {
    marginTop: 6,
    color: colors.textMuted,
  },
  detail: {
    marginTop: 8,
    color: colors.text,
    lineHeight: 20,
  },
  actions: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 10,
  },
});
