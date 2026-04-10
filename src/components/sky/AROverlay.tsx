/**
 * AR-lite overlay that uses compass + accelerometer to show
 * which direction the user is pointing and what celestial objects
 * are in that part of the sky.
 */
import { useEffect, useMemo, useRef } from "react";
import { Animated, Easing, Platform, Pressable, StyleSheet, Text, View } from "react-native";
// Dynamic import to avoid crash if native module isn't available
let Haptics: any = null;
try { Haptics = require("expo-haptics"); } catch {}
import { DeviceOrientation } from "@/hooks/useDeviceSensors";
import { colors, fontSize, radius, spacing } from "@/theme/colors";
import { RenderedSkyObject } from "@/types/sky";

type Props = {
  orientation: DeviceOrientation;
  objects: RenderedSkyObject[];
  arActive: boolean;
  onToggleAr: () => void;
  onSelectObject: (objectId: string) => void;
  onSyncRotation: (heading: number) => void;
};

const COMPASS_LABELS = [
  { deg: 0, label: "N" },
  { deg: 45, label: "NE" },
  { deg: 90, label: "E" },
  { deg: 135, label: "SE" },
  { deg: 180, label: "S" },
  { deg: 225, label: "SW" },
  { deg: 270, label: "W" },
  { deg: 315, label: "NW" },
];

export function AROverlay({ orientation, objects, arActive, onToggleAr, onSelectObject, onSyncRotation }: Props) {
  const pulseAnim = useRef(new Animated.Value(1)).current;

  // Pulse animation for AR button when not active
  useEffect(() => {
    if (arActive) return;
    const anim = Animated.loop(
      Animated.sequence([
        Animated.timing(pulseAnim, { toValue: 1.08, duration: 1500, easing: Easing.inOut(Easing.ease), useNativeDriver: true }),
        Animated.timing(pulseAnim, { toValue: 1, duration: 1500, easing: Easing.inOut(Easing.ease), useNativeDriver: true }),
      ]),
    );
    anim.start();
    return () => anim.stop();
  }, [arActive, pulseAnim]);

  // Sync sky rotation with compass heading when AR is active
  useEffect(() => {
    if (!arActive) return;
    onSyncRotation(orientation.heading);
  }, [arActive, orientation.heading, onSyncRotation]);

  // Find objects near the current pointing direction
  const nearbyObjects = useMemo(() => {
    if (!arActive) return [];
    // Convert heading to approximate x position in the sky view (0-1 range)
    const headingNorm = orientation.heading / 360;
    return objects
      .filter((o) => {
        if (!o.isVisible) return false;
        // Check if object is within ~30 degrees of pointing direction
        const dx = Math.abs(o.x - headingNorm);
        const wrappedDx = Math.min(dx, 1 - dx);
        return wrappedDx < 0.08 && o.kind !== "star"; // Only show planets/satellites in AR callout
      })
      .slice(0, 3);
  }, [arActive, orientation.heading, objects]);

  // Haptic when object detected
  useEffect(() => {
    if (nearbyObjects.length > 0 && Platform.OS !== "web") {
      try { Haptics?.impactAsync?.(Haptics.ImpactFeedbackStyle.Light); } catch {}
    }
  }, [nearbyObjects.length]);

  if (!orientation.available) {
    return (
      <Animated.View style={[styles.arButton, styles.arButtonDisabled]}>
        <Text style={styles.arButtonText}>{"\u{1F9ED}"} No compass</Text>
      </Animated.View>
    );
  }

  return (
    <View style={styles.container}>
      {/* AR Toggle Button */}
      <Pressable
        onPress={() => {
          if (Platform.OS !== "web") {
            try { Haptics?.impactAsync?.(Haptics.ImpactFeedbackStyle.Medium); } catch {}
          }
          onToggleAr();
        }}
        accessibilityRole="button"
        accessibilityLabel={arActive ? "Disable compass mode" : "Enable compass mode"}
      >
        <Animated.View style={[styles.arButton, arActive && styles.arButtonActive, !arActive && { transform: [{ scale: pulseAnim }] }]}>
          <Text style={styles.arButtonText}>{arActive ? "\u{1F9ED} COMPASS ON" : "\u{1F9ED} Point at Sky"}</Text>
        </Animated.View>
      </Pressable>

      {/* AR HUD - only show when active */}
      {arActive && (
        <View style={styles.arHud}>
          {/* Compass strip */}
          <View style={styles.compassStrip}>
            {COMPASS_LABELS.map((item) => {
              const offset = ((item.deg - orientation.heading + 540) % 360) - 180;
              if (Math.abs(offset) > 60) return null;
              const x = (offset / 60) * 50; // percentage from center
              return (
                <Text
                  key={item.label}
                  style={[
                    styles.compassLabel,
                    { left: `${50 + x}%` },
                    item.label === "N" && styles.compassNorth,
                  ]}
                >
                  {item.label}
                </Text>
              );
            })}
            <View style={styles.compassPointer} />
          </View>

          {/* Heading readout */}
          <View style={styles.headingRow}>
            <Text style={styles.headingText}>{Math.round(orientation.heading)}\u00B0</Text>
            <Text style={styles.pitchText}>
              {orientation.isPointingAtSky ? "\u2B06 Pointing at sky" : "\u2194 Tilt phone upward"}
            </Text>
          </View>

          {/* Nearby objects callout */}
          {nearbyObjects.length > 0 && (
            <View style={styles.nearbyContainer}>
              <Text style={styles.nearbyTitle}>Nearby:</Text>
              {nearbyObjects.map((obj) => (
                <Pressable
                  key={obj.id}
                  style={({ pressed }) => [styles.nearbyChip, pressed && { opacity: 0.7 }]}
                  onPress={() => onSelectObject(obj.id)}
                >
                  <View style={[styles.nearbyDot, { backgroundColor: obj.color }]} />
                  <Text style={styles.nearbyName}>{obj.name}</Text>
                  <Text style={styles.nearbyKind}>{obj.kind}</Text>
                </Pressable>
              ))}
            </View>
          )}

          {!orientation.isPointingAtSky && (
            <View style={styles.tiltHint}>
              <Text style={styles.tiltHintText}>Tilt your phone upward to see the sky above you</Text>
            </View>
          )}
        </View>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    gap: 8,
  },
  arButton: {
    borderRadius: radius.pill,
    paddingHorizontal: 16,
    paddingVertical: 10,
    backgroundColor: "rgba(115,251,211,0.12)",
    borderWidth: 1,
    borderColor: "rgba(115,251,211,0.2)",
    alignSelf: "flex-start",
  },
  arButtonActive: {
    backgroundColor: "rgba(115,251,211,0.25)",
    borderColor: colors.accent,
  },
  arButtonDisabled: {
    backgroundColor: "rgba(255,255,255,0.04)",
    borderColor: colors.border,
  },
  arButtonText: {
    color: colors.accent,
    fontWeight: "700",
    fontSize: fontSize.sm,
  },
  arHud: {
    borderRadius: radius.lg,
    padding: spacing.md,
    backgroundColor: "rgba(4,17,31,0.92)",
    borderWidth: 1,
    borderColor: "rgba(115,251,211,0.15)",
    gap: 8,
  },
  // Compass strip
  compassStrip: {
    height: 28,
    position: "relative",
    overflow: "hidden",
    borderRadius: radius.sm,
    backgroundColor: "rgba(255,255,255,0.03)",
  },
  compassLabel: {
    position: "absolute",
    color: colors.textDim,
    fontSize: fontSize.xs,
    fontWeight: "700",
    top: 6,
    marginLeft: -8,
  },
  compassNorth: {
    color: colors.accentDanger,
    fontWeight: "800",
  },
  compassPointer: {
    position: "absolute",
    left: "50%",
    top: 0,
    width: 2,
    height: "100%",
    backgroundColor: colors.accent,
    marginLeft: -1,
  },
  headingRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
  },
  headingText: {
    color: colors.accent,
    fontSize: fontSize.md,
    fontWeight: "800",
  },
  pitchText: {
    color: colors.textDim,
    fontSize: fontSize.xs,
    fontWeight: "600",
  },
  // Nearby objects
  nearbyContainer: {
    flexDirection: "row",
    alignItems: "center",
    flexWrap: "wrap",
    gap: 6,
  },
  nearbyTitle: {
    color: colors.textDim,
    fontSize: fontSize.xs,
    fontWeight: "600",
  },
  nearbyChip: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
    borderRadius: radius.pill,
    paddingHorizontal: 10,
    paddingVertical: 4,
    backgroundColor: "rgba(255,255,255,0.06)",
  },
  nearbyDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
  },
  nearbyName: {
    color: colors.text,
    fontSize: fontSize.xs,
    fontWeight: "700",
  },
  nearbyKind: {
    color: colors.textDim,
    fontSize: 10,
    textTransform: "capitalize",
  },
  tiltHint: {
    borderRadius: radius.sm,
    padding: 8,
    backgroundColor: "rgba(255,177,95,0.08)",
    alignItems: "center",
  },
  tiltHintText: {
    color: colors.accentWarm,
    fontSize: fontSize.xs,
    fontWeight: "600",
  },
});
