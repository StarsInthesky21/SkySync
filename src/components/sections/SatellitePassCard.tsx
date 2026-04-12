import { useEffect, useState } from "react";
import { FlatList, StyleSheet, Text, View } from "react-native";
import {
  FEATURED_SAT_NAMES,
  fetchTles,
  nextVisiblePass,
  type TleRecord,
} from "@/services/astronomy/satelliteTracking";
import { colors, fontSize, radius, spacing } from "@/theme/colors";

type Row = {
  id: string;
  name: string;
  startLabel: string;
  maxAltitudeDeg: number;
};

type Props = {
  latitudeDeg: number;
  longitudeDeg: number;
  date: Date;
};

function matchesFeatured(name: string): boolean {
  const up = name.toUpperCase();
  return FEATURED_SAT_NAMES.some((n) => up.includes(n));
}

export function SatellitePassCard({ latitudeDeg, longitudeDeg, date }: Props) {
  const [rows, setRows] = useState<Row[] | null>(null);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      const tles: TleRecord[] = await fetchTles();
      if (cancelled) return;
      const out: Row[] = [];
      for (const tle of tles) {
        if (!matchesFeatured(tle.name)) continue;
        const pass = nextVisiblePass(tle, { latitudeDeg, longitudeDeg }, date, 24);
        if (!pass) continue;
        out.push({
          id: tle.name,
          name: tle.name,
          startLabel: pass.start.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" }),
          maxAltitudeDeg: pass.maxAltitudeDeg,
        });
        if (out.length >= 4) break;
      }
      if (!cancelled) setRows(out);
    })();
    return () => {
      cancelled = true;
    };
  }, [latitudeDeg, longitudeDeg, date]);

  if (rows === null) return null;
  if (rows.length === 0) {
    return (
      <View style={styles.card}>
        <Text style={styles.title}>Next satellite passes</Text>
        <Text style={styles.empty}>No bright passes in the next 24 hours.</Text>
      </View>
    );
  }

  return (
    <View style={styles.card}>
      <Text style={styles.title}>Next satellite passes</Text>
      <FlatList
        data={rows}
        scrollEnabled={false}
        keyExtractor={(r) => r.id}
        ItemSeparatorComponent={() => <View style={styles.sep} />}
        renderItem={({ item }) => (
          <View style={styles.row}>
            <View style={styles.nameCell}>
              <Text style={styles.name}>{item.name}</Text>
            </View>
            <Text style={styles.time}>{item.startLabel}</Text>
            <Text style={styles.alt}>{`${Math.round(item.maxAltitudeDeg)}\u00B0`}</Text>
          </View>
        )}
      />
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
  title: { color: colors.text, fontSize: fontSize.md, fontWeight: "800" },
  empty: { color: colors.textDim, fontSize: fontSize.xs, marginTop: 2 },
  row: { flexDirection: "row", alignItems: "center", gap: 8 },
  nameCell: { flex: 1 },
  name: { color: colors.textMuted, fontSize: fontSize.sm, fontWeight: "700" },
  time: { color: colors.accent, fontSize: fontSize.sm, fontWeight: "700" },
  alt: { color: colors.textDim, fontSize: fontSize.xs, width: 40, textAlign: "right" },
  sep: { height: 1, backgroundColor: colors.border, marginVertical: 6 },
});
