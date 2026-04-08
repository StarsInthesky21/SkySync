import { StyleSheet, Text, View } from "react-native";
import { GlassCard } from "@/components/cards/GlassCard";
import { colors } from "@/theme/colors";
import { SpaceEvent } from "@/types/sky";

export function EventFeedCard({ events }: { events: SpaceEvent[] }) {
  return (
    <GlassCard>
      <Text style={styles.title}>Space events feed</Text>
      {events.map((event) => (
        <View key={event.id} style={styles.row}>
          <View style={styles.dot} />
          <View style={styles.content}>
            <Text style={styles.eventTitle}>{event.title}</Text>
            <Text style={styles.window}>{event.window}</Text>
            <Text style={styles.detail}>{event.detail}</Text>
          </View>
        </View>
      ))}
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
  row: {
    flexDirection: "row",
    gap: 12,
    marginBottom: 12,
  },
  dot: {
    width: 10,
    height: 10,
    borderRadius: 999,
    backgroundColor: colors.accentWarm,
    marginTop: 6,
  },
  content: {
    flex: 1,
  },
  eventTitle: {
    color: colors.text,
    fontWeight: "700",
  },
  window: {
    color: colors.accent,
    marginTop: 2,
  },
  detail: {
    color: colors.textMuted,
    marginTop: 4,
    lineHeight: 20,
  },
});
