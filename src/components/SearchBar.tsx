import { useCallback, useMemo, useState } from "react";
import { FlatList, Pressable, StyleSheet, Text, TextInput, View } from "react-native";
import { colors, fontSize, radius, spacing } from "@/theme/colors";
import { RenderedSkyObject } from "@/types/sky";

type Props = {
  objects: RenderedSkyObject[];
  onSelect: (objectId: string) => void;
};

export function SearchBar({ objects, onSelect }: Props) {
  const [query, setQuery] = useState("");
  const [focused, setFocused] = useState(false);

  const results = useMemo(() => {
    if (!query.trim()) return [];
    const lower = query.toLowerCase();
    return objects
      .filter((o) => o.name.toLowerCase().includes(lower) || o.kind.toLowerCase().includes(lower) || (o.constellationId ?? "").toLowerCase().includes(lower))
      .slice(0, 8);
  }, [query, objects]);

  const handleSelect = useCallback((objectId: string) => {
    onSelect(objectId);
    setQuery("");
    setFocused(false);
  }, [onSelect]);

  const showResults = focused && query.trim().length > 0;

  return (
    <View style={styles.wrapper}>
      <View style={[styles.inputContainer, focused && styles.inputFocused]}>
        <Text style={styles.searchIcon}>{"\u{1F50D}"}</Text>
        <TextInput
          value={query}
          onChangeText={setQuery}
          onFocus={() => setFocused(true)}
          onBlur={() => setTimeout(() => setFocused(false), 200)}
          style={styles.input}
          placeholder="Search stars, planets, satellites..."
          placeholderTextColor={colors.textDim}
          returnKeyType="search"
          autoCorrect={false}
          accessibilityLabel="Search celestial objects"
          accessibilityHint="Type to search for stars, planets, or satellites"
        />
        {query.length > 0 && (
          <Pressable onPress={() => { setQuery(""); }} style={styles.clearBtn} accessibilityRole="button" accessibilityLabel="Clear search">
            <Text style={styles.clearText}>{"\u2715"}</Text>
          </Pressable>
        )}
      </View>
      {showResults && (
        <View style={styles.dropdown}>
          {results.length === 0 ? (
            <Text style={styles.noResults}>No objects found</Text>
          ) : (
            results.map((item) => (
              <Pressable
                key={item.id}
                style={({ pressed }) => [styles.resultItem, pressed && styles.resultPressed]}
                onPress={() => handleSelect(item.id)}
                accessibilityRole="button"
                accessibilityLabel={`${item.name}, ${item.kind}${item.distanceFromEarth ? `, ${item.distanceFromEarth}` : ""}`}
              >
                <View style={[styles.kindDot, { backgroundColor: item.color }]} />
                <View style={styles.resultInfo}>
                  <Text style={styles.resultName}>{item.name}</Text>
                  <Text style={styles.resultKind}>{item.kind}{item.distanceFromEarth ? ` \u2022 ${item.distanceFromEarth}` : ""}</Text>
                </View>
                <Text style={styles.goArrow}>{"\u2192"}</Text>
              </Pressable>
            ))
          )}
        </View>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  wrapper: {
    position: "relative",
    zIndex: 100,
  },
  inputContainer: {
    flexDirection: "row",
    alignItems: "center",
    borderRadius: radius.md,
    backgroundColor: colors.card,
    borderWidth: 1,
    borderColor: colors.border,
    paddingHorizontal: 14,
    gap: 8,
  },
  inputFocused: {
    borderColor: colors.borderFocus,
    shadowColor: colors.accent,
    shadowOpacity: 0.15,
    shadowRadius: 8,
    elevation: 4,
  },
  searchIcon: {
    fontSize: fontSize.sm,
  },
  input: {
    flex: 1,
    paddingVertical: 12,
    color: colors.text,
    fontSize: fontSize.sm,
  },
  clearBtn: {
    padding: 4,
  },
  clearText: {
    color: colors.textDim,
    fontSize: fontSize.sm,
  },
  dropdown: {
    position: "absolute",
    top: "100%",
    left: 0,
    right: 0,
    marginTop: 4,
    borderRadius: radius.md,
    backgroundColor: colors.card,
    borderWidth: 1,
    borderColor: colors.border,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.4,
    shadowRadius: 16,
    elevation: 12,
    maxHeight: 320,
  },
  noResults: {
    color: colors.textDim,
    fontSize: fontSize.sm,
    textAlign: "center",
    paddingVertical: 16,
  },
  resultItem: {
    flexDirection: "row",
    alignItems: "center",
    padding: 12,
    gap: 10,
    borderBottomWidth: 1,
    borderBottomColor: "rgba(255,255,255,0.04)",
  },
  resultPressed: {
    backgroundColor: "rgba(255,255,255,0.04)",
  },
  kindDot: {
    width: 10,
    height: 10,
    borderRadius: radius.pill,
  },
  resultInfo: {
    flex: 1,
  },
  resultName: {
    color: colors.text,
    fontWeight: "700",
    fontSize: fontSize.sm,
  },
  resultKind: {
    color: colors.textDim,
    fontSize: fontSize.xs,
    marginTop: 2,
    textTransform: "capitalize",
  },
  goArrow: {
    color: colors.accent,
    fontSize: fontSize.base,
    fontWeight: "700",
  },
});
