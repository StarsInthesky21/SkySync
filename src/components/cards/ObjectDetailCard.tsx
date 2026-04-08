import { StyleSheet, Text, View } from "react-native";
import { GlassCard } from "@/components/cards/GlassCard";
import { colors } from "@/theme/colors";
import { CelestialObject } from "@/types/sky";

export function ObjectDetailCard({ object }: { object?: CelestialObject }) {
  if (!object) {
    return (
      <GlassCard>
        <Text style={styles.title}>Tap a star, planet, or satellite</Text>
        <Text style={styles.body}>SkySync will open instant facts, mythology, and distance details here.</Text>
      </GlassCard>
    );
  }

  return (
    <GlassCard>
      <View style={styles.header}>
        <View>
          <Text style={styles.title}>{object.name}</Text>
          <Text style={styles.meta}>{object.kind} | {object.distance}</Text>
        </View>
        <View style={[styles.kindBadge, { borderColor: object.color }]}>
          <Text style={styles.kindText}>{object.label ?? object.kind}</Text>
        </View>
      </View>
      <Text style={styles.body}>{object.mythology}</Text>
      {object.facts.map((fact) => (
        <Text key={fact} style={styles.fact}>- {fact}</Text>
      ))}
    </GlassCard>
  );
}

const styles = StyleSheet.create({
  header: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 12,
    gap: 12,
  },
  title: {
    color: colors.text,
    fontSize: 20,
    fontWeight: "700",
  },
  meta: {
    color: colors.textMuted,
    marginTop: 4,
  },
  kindBadge: {
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 999,
    borderWidth: 1,
    backgroundColor: "rgba(255,255,255,0.03)",
  },
  kindText: {
    color: colors.text,
    fontSize: 12,
    fontWeight: "700",
  },
  body: {
    color: colors.text,
    lineHeight: 22,
  },
  fact: {
    color: colors.textMuted,
    marginTop: 8,
    lineHeight: 20,
  },
});
