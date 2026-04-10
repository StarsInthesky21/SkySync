import { useCallback, useMemo, useState } from "react";
import {
  Keyboard,
  Pressable,
  RefreshControl,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { SectionErrorBoundary } from "@/components/SectionErrorBoundary";
import { SkyView } from "@/components/sky/SkyView";
import { AROverlay } from "@/components/sky/AROverlay";
import { SearchBar } from "@/components/SearchBar";
import { TimeControls } from "@/components/sections/TimeControls";
import { DrawConstellations } from "@/components/sections/DrawConstellations";
import { ObjectDetailModal } from "@/components/ObjectDetailModal";
import { useAppState } from "@/hooks/useAppState";
import { useDeviceSensors } from "@/hooks/useDeviceSensors";
import { analytics } from "@/services/analytics";
import { colors, fontSize, radius, spacing } from "@/theme/colors";
import { Viewpoint } from "@/types/sky";

export default function SkyScreen() {
  const app = useAppState();
  const { orientation, arActive, toggleAr } = useDeviceSensors();

  const formatDate = (d: Date) => d.toISOString().slice(0, 10);
  const formatTime = (d: Date) => d.toISOString().slice(11, 16);

  const visibleText = useMemo(
    () => app.visibleTonight.map((o) => o.name).join(", "),
    [app.visibleTonight],
  );

  const handleSearchSelect = useCallback((objectId: string) => {
    app.focusObject(objectId);
    app.toast.show(`Focused on ${app.objects.find((o) => o.id === objectId)?.name ?? objectId}`, "info");
  }, [app.focusObject, app.objects, app.toast]);

  const handleArSyncRotation = useCallback((heading: number) => {
    app.setRotation(heading);
  }, [app.setRotation]);

  return (
    <SafeAreaView style={styles.safe} edges={["top"]}>
      <ScrollView
        contentContainerStyle={styles.content}
        showsVerticalScrollIndicator={false}
        keyboardShouldPersistTaps="handled"
        onScrollBeginDrag={Keyboard.dismiss}
        refreshControl={<RefreshControl refreshing={app.refreshing} onRefresh={app.handleRefresh} tintColor={colors.accent} />}
      >
        {!app.network.isConnected && (
          <View style={styles.offlineBanner} accessibilityRole="alert">
            <Text style={styles.offlineText}>
              Offline mode{app.pendingQueueCount > 0 ? ` \u2022 ${app.pendingQueueCount} queued` : ""}
            </Text>
          </View>
        )}

        {/* Compact Hero */}
        <View style={styles.hero}>
          <View style={styles.heroRow}>
            <View style={{ flex: 1 }}>
              <Text style={styles.brand}>SkySync</Text>
              <Text style={styles.heroSub}>
                {visibleText ? `Tonight: ${visibleText}` : "Explore the night sky together"}
              </Text>
            </View>
            <View style={styles.heroActions}>
              {app.streak && app.streak.currentStreak > 0 && (
                <View style={[styles.pill, styles.pillStreak]}>
                  <Text style={styles.pillText}>{"\u{1F525}"} {app.streak.currentStreak}</Text>
                </View>
              )}
            </View>
          </View>
          <View style={styles.pillRow}>
            <View style={styles.pill}><Text style={styles.pillText}>{app.currentRoom?.roomCode ?? "SOLO"}</Text></View>
            <View style={[styles.pill, app.liveMode && styles.pillLive]}><Text style={styles.pillText}>{app.liveMode ? "LIVE" : "TIME TRAVEL"}</Text></View>
            {app.streak && <View style={styles.pill}><Text style={styles.pillText}>Lv. {app.streak.level}</Text></View>}
          </View>
        </View>

        {/* Search */}
        <SearchBar objects={app.objects} onSelect={handleSearchSelect} />

        {/* Viewpoints + AR toggle */}
        <View style={styles.controlsRow}>
          <View style={styles.chipRow} accessibilityRole="radiogroup">
            {app.availableViewpoints.map((item) => (
              <Pressable
                key={item.id}
                onPress={() => { app.setViewpoint(item.id as Viewpoint); app.toast.show(`Viewing from ${item.label}`, "info"); }}
                style={({ pressed }) => [styles.chip, app.viewpoint === item.id && styles.chipActive, pressed && styles.chipPressed]}
                accessibilityRole="radio"
                accessibilityState={{ selected: app.viewpoint === item.id }}
              >
                <Text style={[styles.chipText, app.viewpoint === item.id && styles.chipTextActive]}>{item.label}</Text>
              </Pressable>
            ))}
          </View>
        </View>

        {/* AR Compass Overlay */}
        <AROverlay
          orientation={orientation}
          objects={app.objects}
          arActive={arActive}
          onToggleAr={toggleAr}
          onSelectObject={app.handleSelectObject}
          onSyncRotation={handleArSyncRotation}
        />

        {/* Sky View */}
        <SectionErrorBoundary section="Sky Viewer">
          <SkyView
            objects={app.objects}
            segments={app.segments}
            customSegments={app.customSegments}
            draftSegments={app.draftSegments}
            selectedObjectId={app.object?.id}
            highlightedIds={app.highlightedIds}
            roomCode={app.currentRoom?.roomCode}
            liveMode={app.liveMode}
            viewpointLabel={app.viewpoint.toUpperCase()}
            dateLabel={`${formatDate(app.selectedDate)} ${formatTime(app.selectedDate)}`}
            callActive={false}
            rotation={app.rotation}
            zoom={app.zoom}
            onSelectObject={app.handleSelectObject}
            onRotate={app.setRotation}
            onZoom={app.setZoom}
          />
        </SectionErrorBoundary>

        {/* Time Controls */}
        <SectionErrorBoundary section="Time Controls">
          <TimeControls
            voiceGuideEnabled={app.voiceGuideEnabled}
            setVoiceGuideEnabled={app.setVoiceGuideEnabled}
            onStatus={app.setStatusMessage}
          />
        </SectionErrorBoundary>

        {/* Draw Constellations */}
        <SectionErrorBoundary section="Draw">
          <DrawConstellations
            drawModeEnabled={app.drawModeEnabled}
            setDrawModeEnabled={app.setDrawModeEnabled}
            onStatus={app.setStatusMessage}
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
        onFocus={() => { if (app.object) app.focusObject(app.object.id); app.selectObject(undefined); }}
      />
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: colors.bg },
  content: { padding: spacing.lg, paddingBottom: 16, gap: 14 },
  offlineBanner: { borderRadius: radius.sm, padding: 10, backgroundColor: "rgba(255,111,97,0.12)", alignItems: "center", flexDirection: "row", justifyContent: "center", gap: 6 },
  offlineText: { color: colors.accentDanger, fontWeight: "700", fontSize: fontSize.xs },
  hero: { borderRadius: radius.xl, padding: spacing.lg, backgroundColor: colors.bgRaised, borderWidth: 1, borderColor: colors.border },
  heroRow: { flexDirection: "row", justifyContent: "space-between", alignItems: "center" },
  heroActions: { flexDirection: "row", alignItems: "center", gap: 8 },
  brand: { color: colors.accent, fontSize: fontSize.sm, fontWeight: "800", letterSpacing: 2, textTransform: "uppercase" },
  heroSub: { color: colors.textMuted, marginTop: 4, fontSize: fontSize.xs, lineHeight: 18 },
  pillRow: { flexDirection: "row", flexWrap: "wrap", gap: 8, marginTop: 10 },
  pill: { borderRadius: radius.pill, paddingHorizontal: 12, paddingVertical: 6, backgroundColor: "rgba(255,255,255,0.06)" },
  pillLive: { backgroundColor: "rgba(115,251,211,0.12)" },
  pillStreak: { backgroundColor: "rgba(255,177,95,0.12)" },
  pillText: { color: colors.text, fontWeight: "700", fontSize: fontSize.xs },
  controlsRow: { flexDirection: "row", justifyContent: "space-between", alignItems: "center" },
  chipRow: { flexDirection: "row", flexWrap: "wrap", gap: 8 },
  chip: { borderRadius: radius.pill, paddingHorizontal: 14, paddingVertical: 8, backgroundColor: colors.cardSoft },
  chipActive: { backgroundColor: colors.accent },
  chipPressed: { opacity: 0.7 },
  chipText: { color: colors.text, fontWeight: "700", fontSize: fontSize.sm },
  chipTextActive: { color: colors.onAccent },
});
