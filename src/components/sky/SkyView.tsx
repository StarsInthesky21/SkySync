import { useMemo, useRef } from "react";
import { PanResponder, StyleSheet, Text, View } from "react-native";
import Svg from "react-native-svg";
import { Star } from "@/components/sky/Star";
import { Constellation } from "@/components/sky/Constellation";
import { colors, fontSize, radius } from "@/theme/colors";
import { RenderedSkyObject } from "@/types/sky";

type GestureRef = {
  startRotation: number;
  startZoom: number;
  startDistance: number | null;
};

type SkyViewProps = {
  objects: RenderedSkyObject[];
  segments: { id: string; from: RenderedSkyObject; to: RenderedSkyObject; color?: string }[];
  customSegments: { id: string; from: RenderedSkyObject; to: RenderedSkyObject; color?: string }[];
  draftSegments: { id: string; from: RenderedSkyObject; to: RenderedSkyObject; color?: string }[];
  selectedObjectId?: string;
  highlightedIds: string[];
  roomCode?: string;
  liveMode: boolean;
  viewpointLabel: string;
  dateLabel: string;
  callActive: boolean;
  onSelectObject: (objectId: string) => void;
  onRotate: (rotation: number) => void;
  onZoom: (zoom: number) => void;
  rotation: number;
  zoom: number;
};

function getDistance(touches: readonly { pageX: number; pageY: number }[]) {
  if (touches.length < 2) {
    return null;
  }
  const [first, second] = touches;
  const dx = second.pageX - first.pageX;
  const dy = second.pageY - first.pageY;
  return Math.sqrt(dx * dx + dy * dy);
}

/**
 * Performance optimization: Only render stars that are currently visible.
 * For dim stars (magnitude > 4.5), only render them when zoomed in.
 * This keeps the render count manageable on low-end devices.
 */
function useVisibleObjects(objects: RenderedSkyObject[], zoom: number) {
  return useMemo(() => {
    // At default zoom, skip very dim stars
    const magLimit = zoom > 1.5 ? 7.0 : zoom > 1.2 ? 6.0 : 5.0;

    return objects.filter((o) => {
      if (!o.isVisible) return false;
      // Always show planets, satellites, meteors, selected/highlighted
      if (o.kind !== "star") return true;
      // Show all named stars (not field/catalog stars)
      if (!o.id.startsWith("field-star-") && !o.id.startsWith("hyg-")) return true;
      // For catalog stars, filter by magnitude based on zoom level
      return o.magnitude <= magLimit;
    });
  }, [objects, zoom]);
}

export function SkyView({
  objects,
  segments,
  customSegments,
  draftSegments,
  selectedObjectId,
  highlightedIds,
  roomCode,
  liveMode,
  viewpointLabel,
  dateLabel,
  callActive,
  onSelectObject,
  onRotate,
  onZoom,
  rotation,
  zoom,
}: SkyViewProps) {
  const gesture = useRef<GestureRef>({
    startRotation: rotation,
    startZoom: zoom,
    startDistance: null,
  });

  const visibleObjects = useVisibleObjects(objects, zoom);
  const visibleCount = visibleObjects.length;

  const panResponder = useRef(
    PanResponder.create({
      onMoveShouldSetPanResponder: () => true,
      onPanResponderGrant: (event) => {
        gesture.current.startRotation = rotation;
        gesture.current.startZoom = zoom;
        gesture.current.startDistance = getDistance(event.nativeEvent.touches);
      },
      onPanResponderMove: (event, gestureState) => {
        const pinchDistance = getDistance(event.nativeEvent.touches);
        if (pinchDistance && gesture.current.startDistance) {
          const nextZoom = gesture.current.startZoom * (pinchDistance / gesture.current.startDistance);
          onZoom(nextZoom);
          return;
        }
        onRotate(gesture.current.startRotation - gestureState.dx * 0.25);
      },
      onPanResponderRelease: () => {
        gesture.current.startDistance = null;
      },
      onPanResponderTerminationRequest: () => false,
    }),
  ).current;

  return (
    <View
      style={styles.frame}
      {...panResponder.panHandlers}
      accessibilityRole="image"
      accessibilityLabel={`Interactive sky view showing ${visibleCount} celestial objects. Drag to rotate, pinch to zoom.`}
    >
      <Svg width="100%" height="100%" style={StyleSheet.absoluteFillObject}>
        {segments.map((segment) => (
          <Constellation key={segment.id} from={segment.from} to={segment.to} color={segment.color} />
        ))}
        {customSegments.map((segment) => (
          <Constellation key={segment.id} from={segment.from} to={segment.to} color={segment.color} />
        ))}
        {draftSegments.map((segment) => (
          <Constellation key={segment.id} from={segment.from} to={segment.to} color={segment.color} />
        ))}
      </Svg>

      {visibleObjects.map((object) => (
        <Star
          key={object.id}
          object={object}
          selected={selectedObjectId === object.id}
          highlighted={highlightedIds.includes(object.id)}
          onPress={onSelectObject}
        />
      ))}

      {/* Compact HUD overlay */}
      <View style={styles.hud} accessibilityRole="summary">
        <View style={styles.hudRow}>
          <Text style={styles.hudBrand}>SkySync</Text>
          <View style={styles.hudPills}>
            <View style={[styles.hudPill, liveMode && styles.hudPillLive]}>
              <Text style={styles.hudPillText}>{liveMode ? "LIVE" : "TIME TRAVEL"}</Text>
            </View>
            {roomCode && (
              <View style={styles.hudPill}>
                <Text style={styles.hudPillText}>{roomCode}</Text>
              </View>
            )}
          </View>
        </View>
        <Text style={styles.hudMeta}>
          {viewpointLabel} | {dateLabel} | {visibleCount} objects | {zoom.toFixed(1)}x
        </Text>
      </View>

      {/* Subtle instruction overlay at top */}
      <View style={styles.instructionBadge} accessibilityElementsHidden>
        <Text style={styles.instructionText}>Drag to rotate | Pinch to zoom</Text>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  frame: {
    height: 480,
    borderRadius: radius.xl,
    overflow: "hidden",
    backgroundColor: "#010510",
    borderWidth: 1,
    borderColor: colors.border,
    position: "relative",
    shadowColor: colors.shadowMedium,
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 1,
    shadowRadius: 24,
    elevation: 12,
  },
  hud: {
    position: "absolute",
    left: 12,
    right: 12,
    bottom: 12,
    borderRadius: radius.md,
    paddingHorizontal: 14,
    paddingVertical: 10,
    backgroundColor: "rgba(4,17,31,0.88)",
    borderWidth: 1,
    borderColor: "rgba(115,251,211,0.1)",
  },
  hudRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
  },
  hudBrand: {
    color: colors.accent,
    fontWeight: "800",
    fontSize: fontSize.sm,
    letterSpacing: 1,
  },
  hudPills: {
    flexDirection: "row",
    gap: 6,
  },
  hudPill: {
    borderRadius: radius.pill,
    paddingHorizontal: 8,
    paddingVertical: 3,
    backgroundColor: "rgba(255,255,255,0.08)",
  },
  hudPillLive: {
    backgroundColor: "rgba(115,251,211,0.15)",
  },
  hudPillText: {
    color: colors.text,
    fontSize: fontSize.xs,
    fontWeight: "700",
  },
  hudMeta: {
    color: colors.textDim,
    fontSize: fontSize.xs,
    marginTop: 4,
  },
  instructionBadge: {
    position: "absolute",
    top: 12,
    alignSelf: "center",
    borderRadius: radius.pill,
    paddingHorizontal: 14,
    paddingVertical: 5,
    backgroundColor: "rgba(4,17,31,0.7)",
  },
  instructionText: {
    color: colors.textDim,
    fontSize: fontSize.xs,
    fontWeight: "600",
  },
});
