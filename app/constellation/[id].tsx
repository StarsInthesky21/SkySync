import { useMemo } from "react";
import { FlatList, Pressable, StyleSheet, Text, View } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { Stack, useLocalSearchParams, useRouter } from "expo-router";
import { useSkySync } from "@/providers/SkySyncProvider";
import { getConstellations, getStoryForConstellation } from "@/services/skyEngine";
import { colors, fontSize, radius, spacing } from "@/theme/colors";

export default function ConstellationScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const router = useRouter();
  const { objects } = useSkySync();

  const constellation = useMemo(() => getConstellations().find((c) => c.id === id), [id]);
  const story = useMemo(() => getStoryForConstellation(id), [id]);

  const stars = useMemo(() => {
    if (!constellation) return [];
    return constellation.starIds
      .map((sid) => objects.find((o) => o.id === sid))
      .filter((o): o is NonNullable<typeof o> => !!o);
  }, [constellation, objects]);

  if (!constellation) {
    return (
      <SafeAreaView style={styles.container}>
        <Stack.Screen options={{ title: "Not found" }} />
        <Text style={styles.notFound}>Constellation not found.</Text>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.container} edges={["top"]}>
      <Stack.Screen options={{ title: constellation.name }} />

      <View style={styles.header}>
        <Pressable style={styles.iconBtn} onPress={() => router.back()}>
          <Text style={styles.iconBtnText}>{"\u2039"}</Text>
        </Pressable>
        <Text style={styles.title}>{constellation.name}</Text>
        <View style={styles.iconBtn} />
      </View>

      <FlatList
        data={stars}
        keyExtractor={(item) => item.id}
        contentContainerStyle={styles.listContent}
        ListHeaderComponent={
          <View style={{ gap: spacing.md }}>
            {story && (
              <View style={styles.storyCard}>
                <Text style={styles.storyTitle}>{story.title}</Text>
                {story.frames.map((frame, i) => (
                  <Text key={i} style={styles.storyLine}>
                    {i + 1}. {frame}
                  </Text>
                ))}
              </View>
            )}
            <Text style={styles.sectionHeader}>Stars in {constellation.name}</Text>
          </View>
        }
        renderItem={({ item }) => (
          <Pressable style={styles.starRow} onPress={() => router.push(`/object/${item.id}`)}>
            <View style={[styles.starDot, { backgroundColor: item.color }]} />
            <View style={{ flex: 1 }}>
              <Text style={styles.starName}>{item.name}</Text>
              <Text style={styles.starSub}>
                {`mag ${item.magnitude.toFixed(2)} \u00B7 ${item.distanceFromEarth}`}
              </Text>
            </View>
            <Text style={styles.starArrow}>{"\u203A"}</Text>
          </Pressable>
        )}
        ItemSeparatorComponent={() => <View style={styles.separator} />}
      />
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
  title: { color: colors.text, fontSize: fontSize.xl, fontWeight: "800" },
  listContent: { padding: spacing.lg, paddingBottom: spacing.xxl, gap: spacing.xs },
  storyCard: {
    padding: spacing.md,
    borderRadius: radius.xl,
    backgroundColor: colors.card,
    borderWidth: 1,
    borderColor: colors.border,
    gap: 6,
  },
  storyTitle: { color: colors.text, fontSize: fontSize.md, fontWeight: "800" },
  storyLine: { color: colors.textMuted, fontSize: fontSize.sm, lineHeight: 20 },
  sectionHeader: {
    color: colors.accent,
    fontSize: fontSize.sm,
    fontWeight: "800",
    textTransform: "uppercase",
    letterSpacing: 1,
    marginTop: spacing.md,
  },
  starRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
    padding: 12,
    backgroundColor: colors.card,
    borderRadius: radius.md,
    borderWidth: 1,
    borderColor: colors.border,
  },
  starDot: { width: 12, height: 12, borderRadius: radius.pill },
  starName: { color: colors.text, fontSize: fontSize.base, fontWeight: "700" },
  starSub: { color: colors.textDim, fontSize: fontSize.xs, marginTop: 2 },
  starArrow: { color: colors.textDim, fontSize: fontSize.lg },
  separator: { height: 6 },
  notFound: { color: colors.textDim, textAlign: "center", marginTop: 60 },
});
