import { memo, useCallback } from "react";
import { FlatList, Pressable, ScrollView, StyleSheet, Text, View } from "react-native";
import { useSkySync } from "@/providers/SkySyncProvider";
import { colors, fontSize, radius, spacing } from "@/theme/colors";
import { Badge, DailyChallenge } from "@/types/sky";

type Props = {
  onStatus: (msg: string) => void;
};

const BadgeCard = memo(function BadgeCard({ badge }: { badge: Badge }) {
  const done = badge.progressLabel.startsWith("Completed");
  return (
    <View style={[styles.miniCard, done && styles.miniCardDone]}>
      <Text style={styles.miniTitle}>{badge.title}</Text>
      <Text style={styles.miniBody}>{badge.description}</Text>
      <Text style={[styles.miniMeta, done && styles.miniMetaDone]}>{badge.progressLabel}</Text>
    </View>
  );
});

export function BadgesAndChallenges({ onStatus }: Props) {
  const { badges, dailyChallenges, challengeProgress, focusObject } = useSkySync();

  const renderBadge = useCallback(({ item }: { item: Badge }) => <BadgeCard badge={item} />, []);
  const badgeKey = useCallback((item: Badge) => item.id, []);

  return (
    <View style={styles.card}>
      <FlatList
        data={badges}
        renderItem={renderBadge}
        keyExtractor={badgeKey}
        horizontal
        showsHorizontalScrollIndicator={false}
        contentContainerStyle={styles.badgeRow}
      />
      {dailyChallenges.map((challenge) => {
        const done = challengeProgress.completedIds.includes(challenge.id);
        return (
          <View key={challenge.id} style={[styles.listItem, done && styles.listItemDone]}>
            <View style={styles.challengeRow}>
              <View style={[styles.dot, done && styles.dotDone]} />
              <View style={{ flex: 1 }}>
                <Text style={[styles.listTitle, done && styles.listTitleDone]}>{challenge.title}</Text>
                <Text style={styles.listBody}>{challenge.reward}</Text>
              </View>
              {!done && challenge.objectId && (
                <Pressable
                  style={({ pressed }) => [styles.goChip, pressed && styles.goChipPressed]}
                  onPress={() => { focusObject(challenge.objectId!); onStatus(`Go find: ${challenge.title}`); }}
                >
                  <Text style={styles.goText}>Go</Text>
                </Pressable>
              )}
            </View>
          </View>
        );
      })}
      <View style={styles.xpBar}>
        <Text style={styles.xpText}>{challengeProgress.totalXpEarned} XP earned</Text>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  card: { borderRadius: radius.xl, padding: spacing.lg, backgroundColor: colors.card, borderWidth: 1, borderColor: colors.border, shadowColor: "#000", shadowOffset: { width: 0, height: 4 }, shadowOpacity: 0.3, shadowRadius: 12, elevation: 6 },
  badgeRow: { gap: 10, paddingVertical: 4 },
  miniCard: { width: 180, borderRadius: radius.lg, padding: 14, backgroundColor: colors.cardSoft },
  miniCardDone: { backgroundColor: "rgba(115,251,211,0.08)", borderWidth: 1, borderColor: "rgba(115,251,211,0.2)" },
  miniTitle: { color: colors.text, fontWeight: "700", fontSize: fontSize.sm },
  miniBody: { color: colors.textDim, lineHeight: 18, marginTop: 6, fontSize: fontSize.xs },
  miniMeta: { color: colors.accentWarm, marginTop: 8, fontWeight: "700", fontSize: fontSize.xs },
  miniMetaDone: { color: colors.accent },
  listItem: { borderRadius: radius.lg, padding: 14, backgroundColor: colors.cardSoft, marginTop: 8 },
  listItemDone: { backgroundColor: "rgba(115,251,211,0.06)", borderWidth: 1, borderColor: "rgba(115,251,211,0.15)" },
  listTitle: { color: colors.text, fontWeight: "700", fontSize: fontSize.sm },
  listTitleDone: { color: colors.accent },
  listBody: { color: colors.textDim, lineHeight: 19, marginTop: 4, fontSize: fontSize.xs },
  challengeRow: { flexDirection: "row", alignItems: "center", gap: 10 },
  dot: { width: 10, height: 10, borderRadius: radius.pill, borderWidth: 2, borderColor: colors.textDim },
  dotDone: { backgroundColor: colors.accent, borderColor: colors.accent },
  goChip: { borderRadius: radius.pill, paddingHorizontal: 12, paddingVertical: 5, backgroundColor: "rgba(255,255,255,0.08)" },
  goChipPressed: { opacity: 0.7 },
  goText: { color: colors.accent, fontWeight: "700", fontSize: fontSize.xs },
  xpBar: { borderRadius: radius.sm, padding: 10, marginTop: 10, backgroundColor: "rgba(255,177,95,0.08)", alignItems: "center" },
  xpText: { color: colors.accentWarm, fontWeight: "800", fontSize: fontSize.sm },
});
