import { ScrollView, StyleSheet, Text, View } from "react-native";
import { GlassCard } from "@/components/cards/GlassCard";
import { colors } from "@/theme/colors";
import { DiscoverySuggestion } from "@/types/sky";

export function SuggestionsCard({ suggestions }: { suggestions: DiscoverySuggestion[] }) {
  return (
    <GlassCard>
      <Text style={styles.title}>Guided discovery</Text>
      <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.row}>
        {suggestions.map((suggestion) => (
          <View key={suggestion.id} style={styles.item}>
            <Text style={styles.urgency}>{suggestion.urgency ?? "watch"}</Text>
            <Text style={styles.itemTitle}>{suggestion.title}</Text>
            <Text style={styles.itemDetail}>{suggestion.detail}</Text>
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
  item: {
    width: 230,
    padding: 14,
    borderRadius: 18,
    backgroundColor: colors.cardSoft,
  },
  urgency: {
    color: colors.accent,
    fontSize: 11,
    fontWeight: "800",
    textTransform: "uppercase",
    letterSpacing: 1,
    marginBottom: 10,
  },
  itemTitle: {
    color: colors.text,
    fontWeight: "700",
    marginBottom: 8,
  },
  itemDetail: {
    color: colors.textMuted,
    lineHeight: 20,
  },
});
