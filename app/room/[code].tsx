import { useEffect, useMemo } from "react";
import { Pressable, ScrollView, Share, StyleSheet, Text, View } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { Stack, useLocalSearchParams, useRouter } from "expo-router";
import { useSkySync } from "@/providers/SkySyncProvider";
import { VoiceLounge } from "@/components/sections/VoiceLounge";
import { ChatSection } from "@/components/sections/ChatSection";
import { colors, fontSize, radius, spacing } from "@/theme/colors";

export default function RoomScreen() {
  const { code } = useLocalSearchParams<{ code: string }>();
  const router = useRouter();
  const { currentRoom, joinRoom, participants, sendRoomMessage, roomChat, userProfile } = useSkySync();

  useEffect(() => {
    if (code && (!currentRoom || currentRoom.roomCode !== code)) {
      joinRoom(code).catch(() => {
        // Failure leaves the banner below
      });
    }
  }, [code, currentRoom, joinRoom]);

  const room = currentRoom && currentRoom.roomCode === code ? currentRoom : null;
  const title = room?.name ?? "Sky Room";

  const highlightSummary = useMemo(() => {
    if (!room) return "No highlights yet";
    const count = room.state.highlightedObjectIds.length;
    return count === 0 ? "No highlights yet" : `${count} object${count === 1 ? "" : "s"} highlighted`;
  }, [room]);

  const handleShare = async () => {
    if (!code) return;
    try {
      await Share.share({
        title: `Join my SkySync room`,
        message: `Join me in SkySync room ${code}: skysync://room/${code}`,
      });
    } catch {
      // ignore
    }
  };

  if (!code) {
    return (
      <SafeAreaView style={styles.container}>
        <Text style={styles.empty}>Missing room code.</Text>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.container} edges={["top"]}>
      <Stack.Screen options={{ title }} />
      <View style={styles.header}>
        <Pressable style={styles.iconBtn} onPress={() => router.back()}>
          <Text style={styles.iconBtnText}>{"\u2039"}</Text>
        </Pressable>
        <View style={styles.titleBlock}>
          <Text style={styles.title}>{title}</Text>
          <Text style={styles.subtitle}>Code {code}</Text>
        </View>
        <Pressable style={styles.iconBtn} onPress={handleShare} accessibilityLabel="Share room">
          <Text style={styles.shareIcon}>{"\u21AA"}</Text>
        </Pressable>
      </View>

      <ScrollView contentContainerStyle={styles.content}>
        <View style={styles.statCard}>
          <View style={styles.statCell}>
            <Text style={styles.statLabel}>Participants</Text>
            <Text style={styles.statValue}>{participants.length}</Text>
          </View>
          <View style={styles.statCell}>
            <Text style={styles.statLabel}>Highlights</Text>
            <Text style={styles.statValue}>{highlightSummary}</Text>
          </View>
        </View>

        <View style={styles.card}>
          <Text style={styles.sectionTitle}>Voice</Text>
          <VoiceLounge onStatus={() => {}} />
        </View>

        <View style={styles.card}>
          <Text style={styles.sectionTitle}>Chat</Text>
          <ChatSection
            title={title}
            messages={roomChat}
            currentUsername={userProfile?.username ?? "You"}
            onSend={async (text) => {
              await sendRoomMessage(text);
            }}
            placeholder="Share a star you see..."
          />
        </View>
      </ScrollView>
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
  iconBtn: {
    width: 36,
    height: 36,
    borderRadius: radius.pill,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: colors.cardSoft,
    borderWidth: 1,
    borderColor: colors.border,
  },
  iconBtnText: { color: colors.text, fontSize: fontSize.lg, fontWeight: "700" },
  shareIcon: { color: colors.accent, fontSize: fontSize.md, fontWeight: "800" },
  titleBlock: { alignItems: "center" },
  title: { color: colors.text, fontSize: fontSize.lg, fontWeight: "800" },
  subtitle: { color: colors.textDim, fontSize: fontSize.xs, letterSpacing: 2 },
  content: { padding: spacing.lg, gap: spacing.md, paddingBottom: spacing.xxl },
  statCard: {
    flexDirection: "row",
    gap: spacing.sm,
  },
  statCell: {
    flex: 1,
    padding: 12,
    borderRadius: radius.md,
    backgroundColor: colors.card,
    borderWidth: 1,
    borderColor: colors.border,
  },
  statLabel: { color: colors.textDim, fontSize: fontSize.xs, textTransform: "uppercase", letterSpacing: 1 },
  statValue: { color: colors.text, fontSize: fontSize.base, fontWeight: "700", marginTop: 4 },
  card: {
    padding: spacing.md,
    borderRadius: radius.xl,
    backgroundColor: colors.cardSoft,
    borderWidth: 1,
    borderColor: colors.border,
    gap: 8,
  },
  sectionTitle: {
    color: colors.accent,
    fontSize: fontSize.xs,
    fontWeight: "800",
    textTransform: "uppercase",
    letterSpacing: 1,
  },
  empty: { color: colors.textDim, textAlign: "center", marginTop: 60 },
});
