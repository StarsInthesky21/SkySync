import { useCallback } from "react";
import {
  FlatList,
  Keyboard,
  Pressable,
  RefreshControl,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from "react-native";
import { useRouter } from "expo-router";
import { SafeAreaView } from "react-native-safe-area-context";
import { SectionErrorBoundary } from "@/components/SectionErrorBoundary";
import { SectionHeader } from "@/components/sections/SectionHeader";
import { AstronomyPanel } from "@/components/sections/AstronomyPanel";
import { ObjectDetailModal } from "@/components/ObjectDetailModal";
import { useAppState } from "@/hooks/useAppState";
import { colors, fontSize, radius, spacing } from "@/theme/colors";
import { GuidedTarget } from "@/types/sky";

export default function ExploreScreen() {
  const app = useAppState();
  const router = useRouter();

  const renderGuided = useCallback(
    ({ item }: { item: GuidedTarget }) => (
      <Pressable
        style={({ pressed }) => [styles.listItem, pressed && styles.listItemPressed]}
        onPress={() => {
          app.focusObject(item.objectId);
          app.toast.show(`Centered on ${item.title}`, "info");
          router.navigate("/(tabs)");
        }}
        accessibilityRole="button"
      >
        <Text style={styles.listTitle}>{item.title}</Text>
        <Text style={styles.listBody}>{item.subtitle}</Text>
      </Pressable>
    ),
    [app, router],
  );

  return (
    <SafeAreaView style={styles.safe} edges={["top"]}>
      <ScrollView
        contentContainerStyle={styles.content}
        showsVerticalScrollIndicator={false}
        keyboardShouldPersistTaps="handled"
        onScrollBeginDrag={Keyboard.dismiss}
        refreshControl={
          <RefreshControl
            refreshing={app.refreshing}
            onRefresh={app.handleRefresh}
            tintColor={colors.accent}
          />
        }
      >
        <View style={styles.tabHeader}>
          <Text style={styles.tabHeaderIcon}>{"\u{1F52D}"}</Text>
          <Text style={styles.tabHeaderTitle}>Explore</Text>
          <Text style={styles.tabHeaderSub}>Discover what's in the sky right now</Text>
        </View>

        <SectionHeader title="Tonight's Highlights" subtitle="Tap to center on recommended objects" />
        <SectionErrorBoundary section="Guided Mode">
          <View style={styles.card}>
            <FlatList
              data={app.guidedTargets}
              renderItem={renderGuided}
              keyExtractor={(i) => i.id}
              scrollEnabled={false}
            />
          </View>
        </SectionErrorBoundary>

        <SectionHeader
          title="Live Astronomy Data"
          subtitle="Real-time planetary positions, moon phase, and upcoming events"
        />
        <SectionErrorBoundary section="Astronomy">
          <AstronomyPanel
            selectedDate={app.selectedDate}
            onFocusPlanet={(name) => {
              const obj = app.objects.find((o) => o.name.toLowerCase() === name);
              if (obj) {
                app.focusObject(obj.id);
                app.toast.show(`Focused on ${obj.name}`, "info");
                router.navigate("/(tabs)");
              }
            }}
          />
        </SectionErrorBoundary>
      </ScrollView>

      {/* Object Detail Modal */}
      <ObjectDetailModal
        selectedObject={app.object}
        constellationName={app.constellationName}
        story={app.story}
        highlightedIds={app.highlightedIds}
        selectedObjectNotes={app.selectedObjectNotes}
        noteInput={app.noteInput}
        setNoteInput={app.setNoteInput}
        onClose={() => app.selectObject(undefined)}
        onShare={app.handleShare}
        onToggleHighlight={app.handleToggleHighlight}
        onAddNote={app.handleAddNote}
        onFocus={() => {
          if (app.object) app.focusObject(app.object.id);
          app.selectObject(undefined);
          router.navigate("/(tabs)");
        }}
      />
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: colors.bg },
  content: { padding: spacing.lg, paddingBottom: 16, gap: 14 },
  tabHeader: { alignItems: "center", paddingVertical: 8, gap: 4 },
  tabHeaderIcon: { fontSize: 32 },
  tabHeaderTitle: { color: colors.text, fontSize: fontSize.xl, fontWeight: "800" },
  tabHeaderSub: { color: colors.textDim, fontSize: fontSize.sm, textAlign: "center" },
  card: {
    borderRadius: radius.xl,
    padding: spacing.lg,
    backgroundColor: colors.card,
    borderWidth: 1,
    borderColor: colors.border,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 12,
    elevation: 6,
  },
  listItem: { borderRadius: radius.lg, padding: 14, backgroundColor: colors.cardSoft, marginTop: 8 },
  listItemPressed: { backgroundColor: colors.pressedSecondary },
  listTitle: { color: colors.text, fontWeight: "700", fontSize: fontSize.sm },
  listBody: { color: colors.textDim, lineHeight: 19, marginTop: 4, fontSize: fontSize.xs },
});
