import { useEffect, useState } from "react";
import { StyleSheet, Text, View } from "react-native";
import {
  assessObservingConditions,
  type ObservingAssessment,
} from "@/services/astronomy/observingConditions";
import { fetchObservingWeather, type ObservingWeather } from "@/services/astronomy/weatherService";
import { colors, fontSize, radius, spacing } from "@/theme/colors";

type Props = {
  latitudeDeg: number;
  longitudeDeg: number;
  date: Date;
};

export function ObservingCard({ latitudeDeg, longitudeDeg, date }: Props) {
  const [weather, setWeather] = useState<ObservingWeather | null>(null);
  const [assessment, setAssessment] = useState<ObservingAssessment | null>(null);

  useEffect(() => {
    let cancelled = false;
    fetchObservingWeather(latitudeDeg, longitudeDeg).then((w) => {
      if (!cancelled) setWeather(w);
    });
    return () => {
      cancelled = true;
    };
  }, [latitudeDeg, longitudeDeg]);

  useEffect(() => {
    setAssessment(assessObservingConditions({ date, latitudeDeg, longitudeDeg, weather }));
  }, [date, latitudeDeg, longitudeDeg, weather]);

  if (!assessment) return null;

  const ratingColor =
    assessment.rating === "excellent"
      ? colors.accentSuccess
      : assessment.rating === "good"
        ? colors.accent
        : assessment.rating === "fair"
          ? colors.accentWarm
          : colors.accentDanger;

  return (
    <View style={styles.card}>
      <View style={styles.header}>
        <Text style={styles.title}>Tonight</Text>
        <View style={[styles.ratingPill, { backgroundColor: ratingColor }]}>
          <Text style={styles.ratingText}>{String(assessment.score).padStart(2, "0")}</Text>
        </View>
      </View>
      <Text style={styles.headline}>{assessment.headline}</Text>
      {assessment.details.slice(0, 3).map((d, i) => (
        <Text key={i} style={styles.detailLine}>
          {"\u2022"} {d}
        </Text>
      ))}
      <View style={styles.footer}>
        <Text style={styles.footerItem}>{`Moon ${Math.round(assessment.moonIllumination * 100)}%`}</Text>
        {weather && (
          <Text style={styles.footerItem}>
            {`Clouds ${Math.round(weather.cloudCoverPct)}% \u00B7 ${Math.round(weather.temperatureC)}\u00B0C`}
          </Text>
        )}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  card: {
    padding: spacing.md,
    borderRadius: radius.xl,
    backgroundColor: colors.card,
    borderWidth: 1,
    borderColor: colors.border,
    gap: 6,
  },
  header: { flexDirection: "row", justifyContent: "space-between", alignItems: "center" },
  title: { color: colors.text, fontSize: fontSize.md, fontWeight: "800" },
  ratingPill: {
    paddingHorizontal: 12,
    paddingVertical: 4,
    borderRadius: radius.pill,
    minWidth: 48,
    alignItems: "center",
  },
  ratingText: { color: colors.onAccent, fontWeight: "800", fontSize: fontSize.sm },
  headline: { color: colors.accent, fontSize: fontSize.sm, fontWeight: "700" },
  detailLine: { color: colors.textMuted, fontSize: fontSize.xs, lineHeight: 18 },
  footer: { flexDirection: "row", gap: 12, marginTop: 4, flexWrap: "wrap" },
  footerItem: { color: colors.textDim, fontSize: fontSize.xs, fontWeight: "600" },
});
