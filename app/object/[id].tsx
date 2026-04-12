import { useMemo } from "react";
import { Pressable, ScrollView, StyleSheet, Text, View } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { Stack, useLocalSearchParams, useRouter } from "expo-router";
import { useSkySync } from "@/providers/SkySyncProvider";
import {
  equatorialToHorizon,
  riseTransitSet,
  sunEquatorial,
  moonEquatorial,
  planetEquatorial,
  PLANET_IDS,
  type PlanetId,
} from "@/services/astronomy/planetEphemeris";
import { colors, fontSize, radius, spacing } from "@/theme/colors";
import { ObjectPreview3D } from "@/components/sky/ObjectPreview3D";

export default function ObjectDetailScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const router = useRouter();
  const { objects, selectObject, toggleHighlight, highlightedIds, focusObject, observerLocation } =
    useSkySync();
  const lat = observerLocation.latitude ?? 37.7;
  const lon = observerLocation.longitude ?? -122.4;

  const object = useMemo(() => objects.find((o) => o.id === id), [objects, id]);

  const riseSet = useMemo(() => {
    if (!object) return null;
    const now = new Date();
    const ephem = ephemerisFor(object.id, now);
    if (!ephem) return null;
    return riseTransitSet((d) => ephemerisFor(object.id, d) ?? ephem, now, lat, lon);
  }, [object, lat, lon]);

  const currentAltitude = useMemo(() => {
    if (!object) return null;
    const ephem = ephemerisFor(object.id, new Date());
    if (!ephem) return null;
    return equatorialToHorizon(ephem, new Date(), lat, lon).altitudeDeg;
  }, [object, lat, lon]);

  if (!object) {
    return (
      <SafeAreaView style={styles.container}>
        <Stack.Screen options={{ title: "Not found" }} />
        <Text style={styles.notFound}>Object not in current catalog.</Text>
        <Pressable style={styles.backBtn} onPress={() => router.back()}>
          <Text style={styles.backText}>Back</Text>
        </Pressable>
      </SafeAreaView>
    );
  }

  const isHighlighted = highlightedIds.includes(object.id);

  return (
    <SafeAreaView style={styles.container} edges={["top"]}>
      <Stack.Screen options={{ title: object.name }} />
      <ScrollView contentContainerStyle={styles.content}>
        <View style={styles.header}>
          <Pressable style={styles.iconBtn} onPress={() => router.back()} accessibilityLabel="Back">
            <Text style={styles.iconBtnText}>{"\u2039"}</Text>
          </Pressable>
          <Text style={styles.title}>{object.name}</Text>
          <View style={styles.iconBtn} />
        </View>

        <View style={styles.previewCard}>
          <ObjectPreview3D
            color={object.color}
            title={object.previewTitle ?? object.name}
            description={object.previewDescription ?? object.description}
            kind={object.kind}
          />
        </View>

        <View style={styles.kindChip}>
          <Text style={styles.kindChipText}>{object.kind}</Text>
          {object.constellationId && <Text style={styles.kindChipSub}>{object.constellationId}</Text>}
        </View>

        <Text style={styles.description}>{object.description}</Text>

        <View style={styles.statsGrid}>
          <Stat label="Distance" value={object.distanceFromEarth} />
          <Stat label="Magnitude" value={object.magnitude.toFixed(2)} />
          {currentAltitude !== null && (
            <Stat
              label="Current altitude"
              value={`${Math.round(currentAltitude)}\u00B0${currentAltitude > 0 ? " \u2191" : " \u2193"}`}
            />
          )}
          {riseSet?.rise && <Stat label="Rises" value={formatTime(riseSet.rise)} />}
          {riseSet?.transit && <Stat label="Transit" value={formatTime(riseSet.transit)} />}
          {riseSet?.set && <Stat label="Sets" value={formatTime(riseSet.set)} />}
        </View>

        <Section title="Why it matters">
          <Text style={styles.paragraph}>{object.mythologyStory}</Text>
        </Section>

        <Section title="Science">
          {object.scientificFacts.map((fact, index) => (
            <Text key={index} style={styles.factLine}>
              {"\u2022"} {fact}
            </Text>
          ))}
        </Section>

        <View style={styles.actionRow}>
          <Pressable
            style={[styles.actionBtn, styles.actionPrimary]}
            onPress={() => {
              focusObject(object.id);
              router.back();
            }}
          >
            <Text style={styles.actionText}>Focus in sky</Text>
          </Pressable>
          <Pressable
            style={[styles.actionBtn, isHighlighted ? styles.actionOn : styles.actionOff]}
            onPress={() => toggleHighlight(object.id)}
          >
            <Text style={[styles.actionText, !isHighlighted && styles.actionTextLight]}>
              {isHighlighted ? "Unhighlight" : "Highlight"}
            </Text>
          </Pressable>
          <Pressable
            style={[styles.actionBtn, styles.actionGhost]}
            onPress={() => {
              selectObject(object.id);
              router.back();
            }}
          >
            <Text style={[styles.actionText, styles.actionTextLight]}>Open card</Text>
          </Pressable>
        </View>

        {object.constellationId && (
          <Pressable
            style={styles.linkRow}
            onPress={() => router.push(`/constellation/${object.constellationId}`)}
          >
            <Text style={styles.linkText}>{"Open constellation \u2192"}</Text>
          </Pressable>
        )}
      </ScrollView>
    </SafeAreaView>
  );
}

function ephemerisFor(id: string, date: Date) {
  if (id === "sun") return sunEquatorial(date);
  if (id === "moon") return moonEquatorial(date);
  if ((PLANET_IDS as readonly string[]).includes(id)) {
    return planetEquatorial(id as PlanetId, date);
  }
  return null;
}

function formatTime(date: Date): string {
  return date.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" });
}

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <View style={styles.section}>
      <Text style={styles.sectionTitle}>{title}</Text>
      {children}
    </View>
  );
}

function Stat({ label, value }: { label: string; value: string }) {
  return (
    <View style={styles.statCell}>
      <Text style={styles.statLabel}>{label}</Text>
      <Text style={styles.statValue}>{value}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.bg },
  content: { padding: spacing.lg, paddingBottom: spacing.xxl, gap: spacing.lg },
  header: { flexDirection: "row", alignItems: "center", justifyContent: "space-between" },
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
  previewCard: {
    borderRadius: radius.xl,
    padding: spacing.md,
    backgroundColor: colors.card,
    borderWidth: 1,
    borderColor: colors.border,
    minHeight: 180,
    alignItems: "center",
    justifyContent: "center",
  },
  kindChip: {
    flexDirection: "row",
    gap: 8,
    alignSelf: "flex-start",
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: radius.pill,
    backgroundColor: colors.cardSoft,
    borderWidth: 1,
    borderColor: colors.border,
  },
  kindChipText: {
    color: colors.accent,
    fontSize: fontSize.xs,
    fontWeight: "800",
    textTransform: "uppercase",
  },
  kindChipSub: { color: colors.textDim, fontSize: fontSize.xs },
  description: { color: colors.text, fontSize: fontSize.base, lineHeight: 22 },
  statsGrid: { flexDirection: "row", flexWrap: "wrap", gap: spacing.sm },
  statCell: {
    flexBasis: "47%",
    flexGrow: 1,
    padding: 10,
    borderRadius: radius.md,
    backgroundColor: colors.card,
    borderWidth: 1,
    borderColor: colors.border,
  },
  statLabel: { color: colors.textDim, fontSize: fontSize.xs, textTransform: "uppercase", letterSpacing: 1 },
  statValue: { color: colors.text, fontSize: fontSize.base, fontWeight: "700", marginTop: 4 },
  section: { gap: 8 },
  sectionTitle: {
    color: colors.accent,
    fontSize: fontSize.sm,
    fontWeight: "800",
    textTransform: "uppercase",
    letterSpacing: 1,
  },
  paragraph: { color: colors.textMuted, fontSize: fontSize.base, lineHeight: 22 },
  factLine: { color: colors.textMuted, fontSize: fontSize.sm, lineHeight: 20 },
  actionRow: { flexDirection: "row", gap: 8, flexWrap: "wrap" },
  actionBtn: {
    flexGrow: 1,
    paddingVertical: 12,
    alignItems: "center",
    borderRadius: radius.md,
    minWidth: 120,
  },
  actionPrimary: { backgroundColor: colors.accent },
  actionOn: { backgroundColor: colors.accentWarm },
  actionOff: { backgroundColor: colors.cardSoft, borderWidth: 1, borderColor: colors.border },
  actionGhost: { backgroundColor: colors.cardSoft, borderWidth: 1, borderColor: colors.border },
  actionText: { color: colors.onAccent, fontWeight: "800", fontSize: fontSize.sm },
  actionTextLight: { color: colors.text },
  linkRow: { padding: 12, alignItems: "center" },
  linkText: { color: colors.accentInfo, fontSize: fontSize.sm, fontWeight: "700" },
  notFound: { color: colors.textDim, textAlign: "center", marginTop: 60 },
  backBtn: {
    marginTop: 20,
    alignSelf: "center",
    paddingHorizontal: 20,
    paddingVertical: 10,
    backgroundColor: colors.cardSoft,
    borderRadius: radius.md,
  },
  backText: { color: colors.text },
});
