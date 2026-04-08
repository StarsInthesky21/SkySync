import { StyleSheet, Text, View } from "react-native";
import { GlassCard } from "@/components/cards/GlassCard";
import { colors } from "@/theme/colors";

export function AstroPhotoCard() {
  return (
    <GlassCard>
      <Text style={styles.title}>Astrophotography mode</Text>
      <Text style={styles.tip}>Suggestion: stabilize the phone, reduce exposure by 0.7, and tilt 12 deg upward for the cleanest Mars frame.</Text>
      <View style={styles.row}>
        <View style={styles.metric}>
          <Text style={styles.metricLabel}>Object detect</Text>
          <Text style={styles.metricValue}>Mars locked</Text>
        </View>
        <View style={styles.metric}>
          <Text style={styles.metricLabel}>Capture hint</Text>
          <Text style={styles.metricValue}>Tripod preferred</Text>
        </View>
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
  tip: {
    color: colors.textMuted,
    lineHeight: 20,
  },
  row: {
    flexDirection: "row",
    gap: 12,
    marginTop: 14,
  },
  metric: {
    flex: 1,
    borderRadius: 18,
    padding: 12,
    backgroundColor: colors.cardSoft,
  },
  metricLabel: {
    color: colors.textMuted,
    fontSize: 12,
  },
  metricValue: {
    color: colors.text,
    fontWeight: "700",
    marginTop: 6,
  },
});
