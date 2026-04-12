import { useEffect, useMemo, useRef } from "react";
import { Animated, Easing, PanResponder, StyleProp, StyleSheet, Text, View, ViewStyle } from "react-native";
import Svg, { Circle, Defs, Ellipse, G, RadialGradient, Rect, Stop } from "react-native-svg";
import { Star } from "@/components/sky/Star";
import { Constellation } from "@/components/sky/Constellation";
import { colors, fontSize, radius } from "@/theme/colors";
import { RenderedSkyObject } from "@/types/sky";

type GestureRef = {
  startRotation: number;
  startZoom: number;
  startDistance: number | null;
};

type ParallaxOffset = {
  x: number;
  y: number;
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
  immersive?: boolean;
  parallax?: ParallaxOffset;
  style?: StyleProp<ViewStyle>;
};

type FieldStar = {
  id: string;
  x: number;
  y: number;
  radius: number;
  opacity: number;
  color: string;
};

const ORBITS = [
  { rx: 18, ry: 4.4, cy: 53, rotate: -11, opacity: 0.12 },
  { rx: 27, ry: 6.6, cy: 55, rotate: -11, opacity: 0.11 },
  { rx: 37, ry: 8.8, cy: 57, rotate: -11, opacity: 0.1 },
  { rx: 48, ry: 11.3, cy: 59, rotate: -11, opacity: 0.085 },
  { rx: 60, ry: 14.1, cy: 61, rotate: -11, opacity: 0.07 },
];

function getDistance(touches: readonly { pageX: number; pageY: number }[]) {
  if (touches.length < 2) {
    return null;
  }
  const [first, second] = touches;
  const dx = second.pageX - first.pageX;
  const dy = second.pageY - first.pageY;
  return Math.sqrt(dx * dx + dy * dy);
}

function clamp(value: number, min: number, max: number) {
  return Math.max(min, Math.min(max, value));
}

function seeded(index: number, salt: number) {
  const value = Math.sin(index * 12.9898 + salt * 78.233) * 43758.5453;
  return value - Math.floor(value);
}

function createStarField(count: number): FieldStar[] {
  return Array.from({ length: count }, (_, index) => {
    const brightness = seeded(index, 4);
    const warm = seeded(index, 8);
    const color = warm > 0.94 ? "#f6dfc5" : warm < 0.08 ? "#dceaff" : "#f7fbff";
    const radius = brightness > 0.975 ? 0.62 : brightness > 0.86 ? 0.42 : 0.24;

    return {
      id: `field-${index}`,
      x: seeded(index, 1) * 100,
      y: seeded(index, 2) * 100,
      radius,
      opacity: 0.18 + seeded(index, 3) * 0.58,
      color,
    };
  });
}

/**
 * Performance optimization: Only render stars that are currently visible.
 * For dim stars (magnitude > 4.5), only render them when zoomed in.
 */
function useVisibleObjects(objects: RenderedSkyObject[], zoom: number) {
  return useMemo(() => {
    const magLimit = zoom > 1.5 ? 7.0 : zoom > 1.2 ? 6.0 : 5.0;

    return objects.filter((object) => {
      if (!object.isVisible) return false;
      if (object.kind !== "star") return true;
      if (!object.id.startsWith("hyg-")) return true;
      return object.magnitude <= magLimit;
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
  immersive = false,
  parallax,
  style,
}: SkyViewProps) {
  // Use refs for current values so PanResponder callbacks never read stale closures
  const rotationRef = useRef(rotation);
  rotationRef.current = rotation;
  const zoomRef = useRef(zoom);
  zoomRef.current = zoom;
  const onRotateRef = useRef(onRotate);
  onRotateRef.current = onRotate;
  const onZoomRef = useRef(onZoom);
  onZoomRef.current = onZoom;

  const gesture = useRef<GestureRef>({
    startRotation: rotation,
    startZoom: zoom,
    startDistance: null,
  });
  const cameraDrift = useRef(new Animated.Value(0)).current;
  const fieldStars = useMemo(() => createStarField(220), []);
  const visibleObjects = useVisibleObjects(objects, zoom);
  const visibleCount = visibleObjects.length;

  useEffect(() => {
    const anim = Animated.loop(
      Animated.sequence([
        Animated.timing(cameraDrift, {
          toValue: 1,
          duration: 18000,
          easing: Easing.inOut(Easing.sin),
          useNativeDriver: true,
        }),
        Animated.timing(cameraDrift, {
          toValue: 0,
          duration: 18000,
          easing: Easing.inOut(Easing.sin),
          useNativeDriver: true,
        }),
      ]),
    );
    anim.start();
    return () => anim.stop();
  }, [cameraDrift]);

  const driftScale = cameraDrift.interpolate({
    inputRange: [0, 1],
    outputRange: [1, 1.026],
  });
  const driftX = cameraDrift.interpolate({
    inputRange: [0, 1],
    outputRange: [-2, 2],
  });
  const driftY = cameraDrift.interpolate({
    inputRange: [0, 1],
    outputRange: [1, -2],
  });

  const parallaxX = clamp(parallax?.x ?? 0, -1, 1) * 8;
  const parallaxY = clamp(parallax?.y ?? 0, -1, 1) * 6;

  const panResponder = useRef(
    PanResponder.create({
      onMoveShouldSetPanResponder: () => true,
      onPanResponderGrant: (event) => {
        gesture.current.startRotation = rotationRef.current;
        gesture.current.startZoom = zoomRef.current;
        gesture.current.startDistance = getDistance(event.nativeEvent.touches);
      },
      onPanResponderMove: (event, gestureState) => {
        const pinchDistance = getDistance(event.nativeEvent.touches);
        if (pinchDistance && gesture.current.startDistance) {
          const nextZoom = gesture.current.startZoom * (pinchDistance / gesture.current.startDistance);
          onZoomRef.current(nextZoom);
          return;
        }
        onRotateRef.current(gesture.current.startRotation - gestureState.dx * 0.25);
      },
      onPanResponderRelease: () => {
        gesture.current.startDistance = null;
      },
      onPanResponderTerminationRequest: () => false,
    }),
  ).current;

  return (
    <View
      style={[styles.frame, immersive && styles.immersiveFrame, style]}
      {...panResponder.panHandlers}
      accessibilityRole="image"
      accessibilityLabel={`Interactive space view showing ${visibleCount} celestial objects. Drag to rotate, pinch to zoom.`}
    >
      <Animated.View
        style={[
          styles.scene,
          {
            transform: [
              { translateX: driftX },
              { translateY: driftY },
              { translateX: parallaxX },
              { translateY: parallaxY },
              { scale: driftScale },
            ],
          },
        ]}
      >
        <Svg
          width="100%"
          height="100%"
          viewBox="0 0 100 100"
          preserveAspectRatio="none"
          style={StyleSheet.absoluteFillObject}
        >
          <Defs>
            <RadialGradient id="space-blue" cx="30%" cy="24%" r="80%">
              <Stop offset="0%" stopColor="#0d1a2d" stopOpacity="0.82" />
              <Stop offset="42%" stopColor="#030814" stopOpacity="0.58" />
              <Stop offset="100%" stopColor="#000207" stopOpacity="1" />
            </RadialGradient>
            <RadialGradient id="space-amber" cx="82%" cy="66%" r="58%">
              <Stop offset="0%" stopColor="#312014" stopOpacity="0.42" />
              <Stop offset="54%" stopColor="#080711" stopOpacity="0.14" />
              <Stop offset="100%" stopColor="#000207" stopOpacity="0" />
            </RadialGradient>
          </Defs>
          <Rect x="0" y="0" width="100" height="100" fill="#000207" />
          <Rect x="0" y="0" width="100" height="100" fill="url(#space-blue)" />
          <Rect x="0" y="0" width="100" height="100" fill="url(#space-amber)" />

          <G opacity="0.96">
            {fieldStars.map((star) => (
              <Circle
                key={star.id}
                cx={star.x}
                cy={star.y}
                r={star.radius}
                fill={star.color}
                opacity={star.opacity}
              />
            ))}
          </G>

          <G>
            {ORBITS.map((orbit, index) => (
              <Ellipse
                key={`orbit-${index}`}
                cx="50"
                cy={orbit.cy}
                rx={orbit.rx}
                ry={orbit.ry}
                fill="none"
                stroke="rgba(170,194,224,0.42)"
                strokeWidth="0.12"
                opacity={orbit.opacity}
                transform={`rotate(${orbit.rotate} 50 ${orbit.cy})`}
              />
            ))}
          </G>
        </Svg>

        <Svg width="100%" height="100%" style={StyleSheet.absoluteFillObject} pointerEvents="none">
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
      </Animated.View>

      {!immersive && (
        <>
          <View style={styles.hud} accessibilityRole="summary">
            <View style={styles.hudRow}>
              <Text style={styles.hudBrand}>SkySync</Text>
              <View style={styles.hudPills}>
                <View style={[styles.hudPill, liveMode && styles.hudPillLive]}>
                  <Text style={styles.hudPillText}>{liveMode ? "LIVE" : "TIME"}</Text>
                </View>
                {roomCode && (
                  <View style={styles.hudPill}>
                    <Text style={styles.hudPillText}>{roomCode}</Text>
                  </View>
                )}
                {callActive && (
                  <View style={styles.hudPill}>
                    <Text style={styles.hudPillText}>CALL</Text>
                  </View>
                )}
              </View>
            </View>
            <Text style={styles.hudMeta}>
              {viewpointLabel} | {dateLabel} | {visibleCount} objects | {zoom.toFixed(1)}x
            </Text>
          </View>

          <View style={styles.instructionBadge} accessibilityElementsHidden>
            <Text style={styles.instructionText}>Drag to rotate | Pinch to zoom</Text>
          </View>
        </>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  frame: {
    height: 480,
    borderRadius: radius.xl,
    overflow: "hidden",
    backgroundColor: "#000207",
    borderWidth: 1,
    borderColor: "rgba(226,238,255,0.08)",
    position: "relative",
    shadowColor: colors.shadowMedium,
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 1,
    shadowRadius: 24,
    elevation: 12,
  },
  immersiveFrame: {
    flex: 1,
    height: undefined,
    borderRadius: 0,
    borderWidth: 0,
    shadowOpacity: 0,
    elevation: 0,
  },
  scene: {
    ...StyleSheet.absoluteFillObject,
  },
  hud: {
    position: "absolute",
    left: 12,
    right: 12,
    bottom: 12,
    borderRadius: radius.md,
    paddingHorizontal: 14,
    paddingVertical: 10,
    backgroundColor: "rgba(4,9,16,0.68)",
    borderWidth: 1,
    borderColor: "rgba(226,238,255,0.12)",
  },
  hudRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
  },
  hudBrand: {
    color: colors.text,
    fontWeight: "800",
    fontSize: fontSize.sm,
    letterSpacing: 1,
  },
  hudPills: {
    flexDirection: "row",
    gap: 6,
  },
  hudPill: {
    borderRadius: radius.md,
    paddingHorizontal: 8,
    paddingVertical: 3,
    backgroundColor: "rgba(255,255,255,0.07)",
  },
  hudPillLive: {
    backgroundColor: "rgba(158,183,214,0.16)",
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
    borderRadius: radius.md,
    paddingHorizontal: 12,
    paddingVertical: 5,
    backgroundColor: "rgba(4,9,16,0.52)",
    borderWidth: 1,
    borderColor: "rgba(226,238,255,0.08)",
  },
  instructionText: {
    color: colors.textDim,
    fontSize: fontSize.xs,
    fontWeight: "600",
  },
});
