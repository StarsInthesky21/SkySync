import { useEffect, useState } from "react";
import { FlatList, Pressable, StyleSheet, Text, View } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { Stack, useRouter } from "expo-router";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { colors, fontSize, radius, spacing } from "@/theme/colors";

type NotificationItem = {
  id: string;
  kind: "pass" | "challenge" | "room" | "system";
  title: string;
  body: string;
  timestamp: number;
  read: boolean;
};

const STORAGE_KEY = "@skysync/notifications";

async function loadInbox(): Promise<NotificationItem[]> {
  try {
    const raw = await AsyncStorage.getItem(STORAGE_KEY);
    return raw ? (JSON.parse(raw) as NotificationItem[]) : seedInbox();
  } catch {
    return seedInbox();
  }
}

async function saveInbox(items: NotificationItem[]) {
  try {
    await AsyncStorage.setItem(STORAGE_KEY, JSON.stringify(items));
  } catch {
    // ignore
  }
}

function seedInbox(): NotificationItem[] {
  const now = Date.now();
  return [
    {
      id: "welcome",
      kind: "system",
      title: "Welcome to SkySync",
      body: "Pin objects from the Sky tab to get rise-time reminders.",
      timestamp: now - 60_000,
      read: false,
    },
    {
      id: "daily-challenge",
      kind: "challenge",
      title: "Daily challenge ready",
      body: "Three new challenges are waiting in the Profile tab.",
      timestamp: now - 5 * 60_000,
      read: false,
    },
  ];
}

function formatAgo(ts: number): string {
  const diff = Date.now() - ts;
  const mins = Math.floor(diff / 60_000);
  if (mins < 1) return "just now";
  if (mins < 60) return `${mins}m ago`;
  const hrs = Math.floor(mins / 60);
  if (hrs < 24) return `${hrs}h ago`;
  return `${Math.floor(hrs / 24)}d ago`;
}

export default function NotificationsScreen() {
  const router = useRouter();
  const [items, setItems] = useState<NotificationItem[]>([]);

  useEffect(() => {
    loadInbox().then(setItems);
  }, []);

  const markAllRead = async () => {
    const next = items.map((n) => ({ ...n, read: true }));
    setItems(next);
    await saveInbox(next);
  };

  return (
    <SafeAreaView style={styles.container} edges={["top"]}>
      <Stack.Screen options={{ title: "Notifications" }} />
      <View style={styles.header}>
        <Pressable style={styles.iconBtn} onPress={() => router.back()}>
          <Text style={styles.iconBtnText}>{"\u2039"}</Text>
        </Pressable>
        <Text style={styles.title}>Notifications</Text>
        <Pressable onPress={markAllRead}>
          <Text style={styles.actionLink}>Mark all read</Text>
        </Pressable>
      </View>
      <FlatList
        data={items.sort((a, b) => b.timestamp - a.timestamp)}
        keyExtractor={(n) => n.id}
        contentContainerStyle={styles.listContent}
        ListEmptyComponent={<Text style={styles.empty}>Nothing to read.</Text>}
        renderItem={({ item }) => (
          <View style={[styles.row, !item.read && styles.rowUnread]}>
            <View style={styles.kindChip}>
              <Text style={styles.kindChipText}>{kindLabel(item.kind)}</Text>
            </View>
            <View style={{ flex: 1 }}>
              <Text style={styles.rowTitle}>{item.title}</Text>
              <Text style={styles.rowBody}>{item.body}</Text>
              <Text style={styles.rowTime}>{formatAgo(item.timestamp)}</Text>
            </View>
          </View>
        )}
      />
    </SafeAreaView>
  );
}

function kindLabel(k: NotificationItem["kind"]): string {
  switch (k) {
    case "pass":
      return "PASS";
    case "challenge":
      return "XP";
    case "room":
      return "ROOM";
    case "system":
      return "INFO";
  }
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
  title: { color: colors.text, fontSize: fontSize.lg, fontWeight: "800" },
  actionLink: { color: colors.accentInfo, fontWeight: "700", fontSize: fontSize.sm },
  listContent: { padding: spacing.lg, gap: 8 },
  row: {
    flexDirection: "row",
    gap: 12,
    padding: 12,
    borderRadius: radius.md,
    backgroundColor: colors.card,
    borderWidth: 1,
    borderColor: colors.border,
  },
  rowUnread: { borderColor: colors.borderFocus, backgroundColor: colors.cardSoft },
  kindChip: {
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: radius.pill,
    backgroundColor: colors.cardSoft,
    alignSelf: "flex-start",
  },
  kindChipText: { color: colors.accent, fontSize: 10, fontWeight: "800", letterSpacing: 1 },
  rowTitle: { color: colors.text, fontWeight: "700", fontSize: fontSize.sm },
  rowBody: { color: colors.textMuted, fontSize: fontSize.sm, marginTop: 2, lineHeight: 20 },
  rowTime: { color: colors.textDim, fontSize: fontSize.xs, marginTop: 6 },
  empty: { color: colors.textDim, textAlign: "center", paddingVertical: 40 },
});
