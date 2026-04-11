import { useCallback, useEffect, useMemo, useState } from "react";
import {
  Keyboard,
  Pressable,
  StyleSheet,
  Text,
  View,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { SectionErrorBoundary } from "@/components/SectionErrorBoundary";
import { SkyView } from "@/components/sky/SkyView";
import { SearchBar } from "@/components/SearchBar";
import { useAppState } from "@/hooks/useAppState";
import { useDeviceSensors } from "@/hooks/useDeviceSensors";
import { colors, fontSize, radius, spacing } from "@/theme/colors";
import { RenderedSkyObject, Viewpoint } from "@/types/sky";

type IconButtonProps = {
  label: string;
  onPress: () => void;
  active?: boolean;
  accessibilityLabel: string;
};

function IconButton({ label, onPress, active, accessibilityLabel }: IconButtonProps) {
  return (
    <Pressable
      onPress={onPress}
      style={({ pressed }) => [
        styles.iconButton,
        active && styles.iconButtonActive,
        pressed && styles.pressed,
      ]}
      accessibilityRole="button"
      accessibilityLabel={accessibilityLabel}
    >
      <Text style={[styles.iconButtonText, active && styles.iconButtonTextActive]}>{label}</Text>
    </Pressable>
  );
}

function SelectedObjectPanel({
  object,
  constellationName,
  onClose,
  onFocus,
}: {
  object?: RenderedSkyObject;
  constellationName?: string;
  onClose: () => void;
  onFocus: () => void;
}) {
  if (!object) return null;

  const meta = [
    object.kind,
    constellationName,
    object.distanceFromEarth,
  ].filter(Boolean).join(" | ");
  const fact = object.scientificFacts[0];

  return (
    <View style={styles.selectionPanel} accessibilityRole="summary">
      <View style={styles.panelHandle} />
      <View style={styles.panelHeader}>
        <View style={styles.panelTitleRow}>
          <View style={[styles.objectSwatch, { backgroundColor: object.color }]} />
          <View style={styles.panelTitleCopy}>
            <Text style={styles.panelTitle} numberOfLines={1}>{object.name}</Text>
            <Text style={styles.panelMeta} numberOfLines={1}>{meta}</Text>
          </View>
        </View>
        <Pressable
          onPress={onClose}
          style={({ pressed }) => [styles.panelClose, pressed && styles.pressed]}
          accessibilityRole="button"
          accessibilityLabel="Close selected object panel"
        >
          <Text style={styles.panelCloseText}>Close</Text>
        </Pressable>
      </View>

      <Text style={styles.panelBody} numberOfLines={3}>{object.description}</Text>
      {fact && <Text style={styles.panelFact} numberOfLines={2}>{fact}</Text>}

      <View style={styles.panelActions}>
        <Pressable
          onPress={onFocus}
          style={({ pressed }) => [styles.panelAction, pressed && styles.pressed]}
          accessibilityRole="button"
          accessibilityLabel={`Focus camera on ${object.name}`}
        >
          <Text style={styles.panelActionText}>Focus</Text>
        </Pressable>
        <View style={styles.panelDataPill}>
          <Text style={styles.panelDataText}>{object.magnitude.toFixed(1)} mag</Text>
        </View>
      </View>
    </View>
  );
}

export default function SkyScreen() {
  const app = useAppState();
  const { orientation, arActive, toggleAr } = useDeviceSensors();
  const [searchOpen, setSearchOpen] = useState(false);

  const formatDate = (d: Date) => d.toISOString().slice(0, 10);
  const formatTime = (d: Date) => d.toISOString().slice(11, 16);

  const activeViewpoint = useMemo(
    () => app.availableViewpoints.find((item) => item.id === app.viewpoint)?.label ?? app.viewpoint,
    [app.availableViewpoints, app.viewpoint],
  );

  const parallax = useMemo(() => {
    if (!orientation.available) return { x: 0, y: 0 };
    return {
      x: Math.max(-1, Math.min(1, orientation.roll / 32)),
      y: Math.max(-1, Math.min(1, orientation.pitch / 62)),
    };
  }, [orientation.available, orientation.pitch, orientation.roll]);

  useEffect(() => {
    if (!arActive || !orientation.available) return;
    app.setRotation(orientation.heading);
  }, [app.setRotation, arActive, orientation.available, orientation.heading]);

  const handleSearchSelect = useCallback((objectId: string) => {
    app.focusObject(objectId);
    setSearchOpen(false);
    Keyboard.dismiss();
    app.toast.show(`Focused on ${app.objects.find((o) => o.id === objectId)?.name ?? objectId}`, "info");
  }, [app.focusObject, app.objects, app.toast]);

  const cycleViewpoint = useCallback(() => {
    const index = app.availableViewpoints.findIndex((item) => item.id === app.viewpoint);
    const next = app.availableViewpoints[(index + 1 + app.availableViewpoints.length) % app.availableViewpoints.length];
    app.setViewpoint(next.id as Viewpoint);
    app.toast.show(`Viewing from ${next.label}`, "info");
  }, [app]);

  const returnToLive = useCallback(() => {
    app.setSelectedDate(new Date());
    app.setLiveMode(true);
    app.toast.show("Real-time sky", "info");
  }, [app]);

  const focusSelectedObject = useCallback(() => {
    if (!app.object) return;
    app.focusObject(app.object.id);
  }, [app]);

  return (
    <SafeAreaView style={styles.safe} edges={["top"]}>
      <View style={styles.viewport}>
        <SectionErrorBoundary section="Space Viewer">
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
            immersive
            parallax={parallax}
          />
        </SectionErrorBoundary>

        <View style={styles.topLayer} pointerEvents="box-none">
          <View style={styles.statusGlass}>
            <Text style={styles.brand}>SKYSYNC</Text>
            <Text style={styles.statusText} numberOfLines={1}>
              {activeViewpoint.toUpperCase()} | {app.liveMode ? "LIVE" : formatTime(app.selectedDate)} | {app.zoom.toFixed(1)}x
            </Text>
          </View>

          <View style={styles.topActions}>
            <IconButton
              label="Search"
              onPress={() => setSearchOpen((open) => !open)}
              active={searchOpen}
              accessibilityLabel={searchOpen ? "Hide search" : "Search celestial objects"}
            />
            <IconButton
              label="AR"
              onPress={toggleAr}
              active={arActive}
              accessibilityLabel={arActive ? "Disable compass tracking" : "Enable compass tracking"}
            />
          </View>
        </View>

        {searchOpen && (
          <View style={styles.searchGlass}>
            <SearchBar objects={app.objects} onSelect={handleSearchSelect} />
          </View>
        )}

        {!app.network.isConnected && (
          <View style={styles.offlineGlass} accessibilityRole="alert">
            <Text style={styles.offlineText}>
              Offline{app.pendingQueueCount > 0 ? ` | ${app.pendingQueueCount} queued` : ""}
            </Text>
          </View>
        )}

        <View style={styles.sideControls} pointerEvents="box-none">
          <IconButton
            label="+"
            onPress={() => app.setZoom(app.zoom + 0.16)}
            accessibilityLabel="Zoom in"
          />
          <IconButton
            label="-"
            onPress={() => app.setZoom(app.zoom - 0.16)}
            accessibilityLabel="Zoom out"
          />
          <IconButton
            label={app.viewpoint.slice(0, 1).toUpperCase()}
            onPress={cycleViewpoint}
            accessibilityLabel="Change viewpoint"
          />
          <IconButton
            label="Now"
            onPress={returnToLive}
            active={app.liveMode}
            accessibilityLabel="Return to real-time sky"
          />
        </View>

        {arActive && (
          <View style={styles.compassGlass} pointerEvents="none">
            <Text style={styles.compassText}>
              {orientation.available ? `${Math.round(orientation.heading)} deg` : "Compass unavailable"}
            </Text>
          </View>
        )}

        <SelectedObjectPanel
          object={app.object}
          constellationName={app.constellationName}
          onClose={() => app.selectObject(undefined)}
          onFocus={focusSelectedObject}
        />
      </View>
    </SafeAreaView>
  );
}

const glassBase = {
  backgroundColor: "rgba(4,9,16,0.52)",
  borderWidth: 1,
  borderColor: "rgba(226,238,255,0.12)",
} as const;

const styles = StyleSheet.create({
  safe: {
    flex: 1,
    backgroundColor: colors.bg,
  },
  viewport: {
    flex: 1,
    backgroundColor: colors.bg,
  },
  topLayer: {
    position: "absolute",
    top: spacing.md,
    left: spacing.md,
    right: spacing.md,
    flexDirection: "row",
    alignItems: "flex-start",
    justifyContent: "space-between",
    gap: 10,
  },
  statusGlass: {
    ...glassBase,
    flex: 1,
    borderRadius: radius.md,
    paddingHorizontal: 12,
    paddingVertical: 9,
  },
  brand: {
    color: colors.text,
    fontSize: fontSize.xs,
    fontWeight: "800",
    letterSpacing: 2,
  },
  statusText: {
    color: colors.textDim,
    fontSize: fontSize.xs,
    fontWeight: "600",
    marginTop: 3,
  },
  topActions: {
    flexDirection: "row",
    gap: 8,
  },
  iconButton: {
    ...glassBase,
    minWidth: 42,
    height: 38,
    borderRadius: radius.md,
    alignItems: "center",
    justifyContent: "center",
    paddingHorizontal: 10,
  },
  iconButtonActive: {
    backgroundColor: "rgba(158,183,214,0.2)",
    borderColor: "rgba(226,238,255,0.24)",
  },
  iconButtonText: {
    color: colors.textMuted,
    fontSize: fontSize.xs,
    fontWeight: "800",
  },
  iconButtonTextActive: {
    color: colors.text,
  },
  pressed: {
    opacity: 0.72,
  },
  searchGlass: {
    position: "absolute",
    top: 70,
    left: spacing.md,
    right: spacing.md,
    zIndex: 10,
  },
  offlineGlass: {
    ...glassBase,
    position: "absolute",
    top: 116,
    alignSelf: "center",
    borderRadius: radius.md,
    paddingHorizontal: 12,
    paddingVertical: 7,
    backgroundColor: "rgba(54,24,20,0.58)",
  },
  offlineText: {
    color: "#efb0a7",
    fontSize: fontSize.xs,
    fontWeight: "700",
  },
  sideControls: {
    position: "absolute",
    right: spacing.md,
    top: 130,
    gap: 8,
    alignItems: "flex-end",
  },
  compassGlass: {
    ...glassBase,
    position: "absolute",
    left: spacing.md,
    top: 92,
    borderRadius: radius.md,
    paddingHorizontal: 10,
    paddingVertical: 6,
  },
  compassText: {
    color: colors.textMuted,
    fontSize: fontSize.xs,
    fontWeight: "700",
  },
  selectionPanel: {
    ...glassBase,
    position: "absolute",
    left: spacing.md,
    right: spacing.md,
    bottom: spacing.md,
    borderRadius: radius.md,
    padding: spacing.md,
    backgroundColor: "rgba(4,9,16,0.7)",
  },
  panelHandle: {
    width: 34,
    height: 3,
    borderRadius: 2,
    backgroundColor: "rgba(238,244,251,0.22)",
    alignSelf: "center",
    marginBottom: 10,
  },
  panelHeader: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    gap: 10,
  },
  panelTitleRow: {
    flex: 1,
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
  },
  objectSwatch: {
    width: 10,
    height: 10,
    borderRadius: 5,
  },
  panelTitleCopy: {
    flex: 1,
  },
  panelTitle: {
    color: colors.text,
    fontSize: fontSize.md,
    fontWeight: "800",
  },
  panelMeta: {
    color: colors.accentWarm,
    fontSize: fontSize.xs,
    marginTop: 3,
    textTransform: "capitalize",
  },
  panelClose: {
    borderRadius: radius.md,
    paddingHorizontal: 10,
    paddingVertical: 6,
    backgroundColor: "rgba(255,255,255,0.06)",
  },
  panelCloseText: {
    color: colors.textMuted,
    fontSize: fontSize.xs,
    fontWeight: "700",
  },
  panelBody: {
    color: colors.textMuted,
    fontSize: fontSize.sm,
    lineHeight: 20,
    marginTop: 10,
  },
  panelFact: {
    color: colors.text,
    fontSize: fontSize.xs,
    lineHeight: 18,
    marginTop: 8,
  },
  panelActions: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    marginTop: 12,
    gap: 8,
  },
  panelAction: {
    borderRadius: radius.md,
    paddingHorizontal: 14,
    paddingVertical: 8,
    backgroundColor: "rgba(158,183,214,0.18)",
    borderWidth: 1,
    borderColor: "rgba(226,238,255,0.12)",
  },
  panelActionText: {
    color: colors.text,
    fontSize: fontSize.xs,
    fontWeight: "800",
  },
  panelDataPill: {
    borderRadius: radius.md,
    paddingHorizontal: 10,
    paddingVertical: 7,
    backgroundColor: "rgba(255,255,255,0.05)",
  },
  panelDataText: {
    color: colors.textDim,
    fontSize: fontSize.xs,
    fontWeight: "700",
  },
});
