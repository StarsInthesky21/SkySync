import { useMemo, useState } from "react";
import { FlatList, Pressable, StyleSheet, Text, TextInput, View } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { Stack, useRouter } from "expo-router";
import { useSkySync } from "@/providers/SkySyncProvider";
import { getConstellations } from "@/services/skyEngine";
import { colors, fontSize, radius, spacing } from "@/theme/colors";

type Hit =
  | { type: "object"; id: string; title: string; subtitle: string; color?: string }
  | { type: "constellation"; id: string; title: string; subtitle: string };

function scoreMatch(query: string, text: string): number {
  const q = query.toLowerCase();
  const t = text.toLowerCase();
  if (!q) return 0;
  if (t === q) return 100;
  if (t.startsWith(q)) return 80;
  if (t.includes(q)) return 60;
  let qi = 0;
  let hits = 0;
  for (let i = 0; i < t.length && qi < q.length; i += 1) {
    if (t[i] === q[qi]) {
      hits += 1;
      qi += 1;
    }
  }
  return qi === q.length ? 30 + hits : 0;
}

export default function SearchScreen() {
  const router = useRouter();
  const [query, setQuery] = useState("");
  const { objects } = useSkySync();
  const constellations = useMemo(() => getConstellations(), []);

  const hits: Hit[] = useMemo(() => {
    if (query.trim().length < 1) return [];
    const scored: { hit: Hit; score: number }[] = [];
    for (const o of objects) {
      const score = Math.max(
        scoreMatch(query, o.name),
        o.constellationId ? scoreMatch(query, o.constellationId) * 0.6 : 0,
      );
      if (score > 0) {
        scored.push({
          hit: {
            type: "object",
            id: o.id,
            title: o.name,
            subtitle: `${o.kind} \u00B7 mag ${o.magnitude.toFixed(2)}`,
            color: o.color,
          },
          score,
        });
      }
    }
    for (const c of constellations) {
      const score = scoreMatch(query, c.name) * 1.2;
      if (score > 0) {
        scored.push({
          hit: {
            type: "constellation",
            id: c.id,
            title: c.name,
            subtitle: `${c.starIds.length} stars`,
          },
          score,
        });
      }
    }
    return scored
      .sort((a, b) => b.score - a.score)
      .slice(0, 50)
      .map((h) => h.hit);
  }, [query, objects, constellations]);

  return (
    <SafeAreaView style={styles.container} edges={["top"]}>
      <Stack.Screen options={{ title: "Search" }} />
      <View style={styles.header}>
        <Pressable style={styles.closeBtn} onPress={() => router.back()}>
          <Text style={styles.closeText}>Cancel</Text>
        </Pressable>
        <TextInput
          autoFocus
          value={query}
          onChangeText={setQuery}
          placeholder="Search stars, planets, constellations"
          placeholderTextColor={colors.textDim}
          style={styles.input}
          returnKeyType="search"
        />
      </View>
      <FlatList
        data={hits}
        keyExtractor={(item) => `${item.type}-${item.id}`}
        contentContainerStyle={styles.listContent}
        ListEmptyComponent={
          query.length > 0 ? (
            <Text style={styles.empty}>No matches.</Text>
          ) : (
            <Text style={styles.hint}>Start typing to find objects and constellations.</Text>
          )
        }
        renderItem={({ item }) => (
          <Pressable
            style={styles.row}
            onPress={() => {
              const path = item.type === "object" ? `/object/${item.id}` : `/constellation/${item.id}`;
              router.replace(path);
            }}
          >
            <View
              style={[
                styles.dot,
                {
                  backgroundColor: item.type === "object" ? (item.color ?? colors.accent) : colors.accentInfo,
                },
              ]}
            />
            <View style={{ flex: 1 }}>
              <Text style={styles.rowTitle}>{item.title}</Text>
              <Text style={styles.rowSub}>{item.subtitle}</Text>
            </View>
            <Text style={styles.rowArrow}>{"\u203A"}</Text>
          </Pressable>
        )}
      />
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.bg },
  header: { padding: spacing.lg, gap: spacing.sm, flexDirection: "column" },
  closeBtn: { alignSelf: "flex-end", paddingHorizontal: 8, paddingVertical: 6 },
  closeText: { color: colors.accentInfo, fontWeight: "700" },
  input: {
    backgroundColor: colors.card,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: radius.md,
    padding: 12,
    color: colors.text,
    fontSize: fontSize.base,
  },
  listContent: { padding: spacing.lg, gap: 6 },
  row: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
    padding: 12,
    backgroundColor: colors.card,
    borderRadius: radius.md,
    borderWidth: 1,
    borderColor: colors.border,
  },
  dot: { width: 10, height: 10, borderRadius: radius.pill },
  rowTitle: { color: colors.text, fontSize: fontSize.base, fontWeight: "700" },
  rowSub: { color: colors.textDim, fontSize: fontSize.xs, marginTop: 2 },
  rowArrow: { color: colors.textDim, fontSize: fontSize.lg },
  empty: { color: colors.textDim, textAlign: "center", paddingVertical: 30 },
  hint: { color: colors.textDim, textAlign: "center", paddingVertical: 30 },
});
