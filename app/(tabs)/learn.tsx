import { Keyboard, Pressable, RefreshControl, ScrollView, StyleSheet, Text, View } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { SectionErrorBoundary } from "@/components/SectionErrorBoundary";
import { SectionHeader } from "@/components/sections/SectionHeader";
import { BadgesAndChallenges } from "@/components/sections/BadgesAndChallenges";
import { ObjectDetailModal } from "@/components/ObjectDetailModal";
import { useAppState } from "@/hooks/useAppState";
import { analytics } from "@/services/analytics";
import { colors, fontSize, radius, spacing } from "@/theme/colors";

export default function LearnScreen() {
  const app = useAppState();

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
          <Text style={styles.tabHeaderIcon}>{"\u{1F4D6}"}</Text>
          <Text style={styles.tabHeaderTitle}>Learn</Text>
          <Text style={styles.tabHeaderSub}>Daily challenges and astronomy knowledge</Text>
        </View>

        <SectionHeader
          title="Daily Challenges"
          subtitle={`${app.challengeProgress.completedIds.length}/${app.dailyChallenges.length} completed today`}
        />
        <SectionErrorBoundary section="Badges">
          <BadgesAndChallenges onStatus={app.setStatusMessage} />
        </SectionErrorBoundary>

        {/* Featured Tonight */}
        {app.visibleTonight.length > 0 && (
          <>
            <SectionHeader title="Featured Tonight" subtitle="Tap to learn about tonight's visible objects" />
            <View style={styles.featuredGrid}>
              {app.visibleTonight.slice(0, 6).map((obj) => (
                <Pressable
                  key={obj.id}
                  style={({ pressed }) => [styles.featuredCard, pressed && { opacity: 0.8 }]}
                  onPress={() => {
                    app.selectObject(obj.id);
                    analytics.objectDiscovered(obj.id, obj.kind, obj.name);
                  }}
                >
                  <View
                    style={[styles.featuredDot, { backgroundColor: obj.color, shadowColor: obj.color }]}
                  />
                  <Text style={styles.featuredName}>{obj.name}</Text>
                  <Text style={styles.featuredKind}>{obj.kind}</Text>
                </Pressable>
              ))}
            </View>
          </>
        )}

        {/* Astronomy Facts */}
        <SectionHeader
          title="Did You Know?"
          subtitle="Tap any object in the sky to discover its mythology and science"
        />
        <View style={styles.card}>
          <View style={styles.factCard}>
            <Text style={styles.factEmoji}>{"\u{1F30C}"}</Text>
            <Text style={styles.factText}>
              The light from Betelgeuse left the star 548 years ago. You're seeing it as it was during the
              Renaissance.
            </Text>
          </View>
          <View style={styles.factCard}>
            <Text style={styles.factEmoji}>{"\u{1F6F0}\uFE0F"}</Text>
            <Text style={styles.factText}>
              The ISS orbits Earth every 92 minutes at 28,000 km/h. You can often see it with the naked eye!
            </Text>
          </View>
          <View style={styles.factCard}>
            <Text style={styles.factEmoji}>{"\u{1FA90}"}</Text>
            <Text style={styles.factText}>
              Saturn's rings are mostly made of ice chunks ranging from tiny grains to pieces the size of a
              house.
            </Text>
          </View>
          <View style={styles.factCard}>
            <Text style={styles.factEmoji}>{"\u2B50"}</Text>
            <Text style={styles.factText}>
              Sirius, the brightest star in the night sky, is actually a binary system - it has a tiny white
              dwarf companion called Sirius B.
            </Text>
          </View>
          <View style={[styles.factCard, { borderBottomWidth: 0 }]}>
            <Text style={styles.factEmoji}>{"\u{1F315}"}</Text>
            <Text style={styles.factText}>
              The same side of the Moon always faces Earth due to tidal locking. We've never seen the far side
              with our naked eyes.
            </Text>
          </View>
        </View>
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
  featuredGrid: { flexDirection: "row", flexWrap: "wrap", gap: 10 },
  featuredCard: {
    flex: 1,
    minWidth: "28%",
    borderRadius: radius.lg,
    padding: 14,
    backgroundColor: colors.card,
    borderWidth: 1,
    borderColor: colors.border,
    alignItems: "center",
    gap: 8,
  },
  featuredDot: { width: 24, height: 24, borderRadius: 12, shadowOpacity: 0.6, shadowRadius: 8, elevation: 4 },
  featuredName: { color: colors.text, fontSize: fontSize.sm, fontWeight: "700", textAlign: "center" },
  featuredKind: { color: colors.textDim, fontSize: fontSize.xs, textTransform: "capitalize" },
  factCard: {
    flexDirection: "row",
    alignItems: "flex-start",
    gap: 12,
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: "rgba(255,255,255,0.04)",
  },
  factEmoji: { fontSize: 24 },
  factText: { color: colors.textMuted, fontSize: fontSize.sm, lineHeight: 20, flex: 1 },
});
