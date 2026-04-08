import { ScrollView, StyleSheet, Text, View } from "react-native";
import { GlassCard } from "@/components/cards/GlassCard";
import { colors } from "@/theme/colors";
import { Achievement } from "@/types/rooms";

export function AchievementCard({ items }: { items: Achievement[] }) {
  return (
    <GlassCard>
      <Text style={styles.title}>Gamification</Text>
      <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.row}>
        {items.map((item) => (
          <View key={item.id} style={styles.badge}>
            <Text style={styles.badgeTitle}>{item.title}</Text>
            <Text style={styles.badgeMeta}>{item.progressLabel}</Text>
          </View>
        ))}
      </ScrollView>
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
    gap: 12,
  },
  badge: {
    width: 180,
    padding: 14,
    borderRadius: 18,
    backgroundColor: colors.cardSoft,
  },
  badgeTitle: {
    color: colors.text,
    fontWeight: "700",
    marginBottom: 6,
  },
  badgeMeta: {
    color: colors.textMuted,
  },
});
