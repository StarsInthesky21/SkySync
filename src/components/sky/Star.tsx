import { memo, useCallback, useEffect, useRef } from "react";
import { Animated, Easing, Platform, Pressable, StyleSheet, Text, View } from "react-native";
let Haptics: any = null;
try { Haptics = require("expo-haptics"); } catch {}
import { colors } from "@/theme/colors";
import { RenderedSkyObject } from "@/types/sky";

type StarProps = {
  object: RenderedSkyObject;
  selected: boolean;
  highlighted: boolean;
  onPress: (objectId: string) => void;
};

function StarComponent({ object, selected, highlighted, onPress }: StarProps) {
  const handlePress = useCallback(() => {
    try {
      if (Platform.OS !== "web" && Haptics) {
        Haptics.impactAsync(
          object.kind === "planet" ? Haptics.ImpactFeedbackStyle.Medium : Haptics.ImpactFeedbackStyle.Light,
        );
      }
    } catch {}
    onPress(object.id);
  }, [onPress, object.id, object.kind]);
  const twinkle = useRef(new Animated.Value(1)).current;
  const pulseScale = useRef(new Animated.Value(1)).current;

  // Twinkling effect for stars
  useEffect(() => {
    if (!object.isVisible || object.kind !== "star") return;

    // Each star gets a unique-feeling twinkle based on its magnitude
    const baseDuration = 1500 + (object.magnitude ?? 1) * 400;
    const minOpacity = 0.5 + Math.random() * 0.25;

    const anim = Animated.loop(
      Animated.sequence([
        Animated.timing(twinkle, {
          toValue: minOpacity,
          duration: baseDuration + Math.random() * 800,
          easing: Easing.inOut(Easing.sin),
          useNativeDriver: true,
        }),
        Animated.timing(twinkle, {
          toValue: 1,
          duration: baseDuration + Math.random() * 600,
          easing: Easing.inOut(Easing.sin),
          useNativeDriver: true,
        }),
      ]),
    );
    // Stagger start so stars don't all twinkle in sync
    const delay = Math.random() * 2000;
    const timeout = setTimeout(() => anim.start(), delay);
    return () => {
      clearTimeout(timeout);
      anim.stop();
    };
  }, [object.isVisible, object.kind, object.magnitude, twinkle]);

  // Subtle pulse for planets and satellites
  useEffect(() => {
    if (!object.isVisible || object.kind === "star") return;

    const anim = Animated.loop(
      Animated.sequence([
        Animated.timing(pulseScale, {
          toValue: 1.15,
          duration: 2000,
          easing: Easing.inOut(Easing.ease),
          useNativeDriver: true,
        }),
        Animated.timing(pulseScale, {
          toValue: 1,
          duration: 2000,
          easing: Easing.inOut(Easing.ease),
          useNativeDriver: true,
        }),
      ]),
    );
    anim.start();
    return () => anim.stop();
  }, [object.isVisible, object.kind, pulseScale]);

  if (!object.isVisible) {
    return null;
  }

  const showLabel = selected || highlighted || object.kind === "planet" || object.kind === "satellite";
  const isPlanetOrSatellite = object.kind === "planet" || object.kind === "satellite";

  return (
    <Pressable
      onPress={handlePress}
      accessibilityRole="button"
      accessibilityLabel={`${object.name}, ${object.kind}${selected ? ", selected" : ""}${highlighted ? ", highlighted" : ""}`}
      accessibilityHint={`Tap to view details about ${object.name}`}
      style={[
        styles.wrapper,
        {
          left: `${object.x * 100}%`,
          top: `${object.y * 100}%`,
        },
      ]}
    >
      <Animated.View
        style={[
          styles.dot,
          {
            width: object.size,
            height: object.size,
            backgroundColor: object.color,
            shadowColor: object.color,
            opacity: object.kind === "star" ? twinkle : 1,
            transform: isPlanetOrSatellite ? [{ scale: pulseScale }] : [],
          },
          selected && styles.selected,
          highlighted && styles.highlighted,
          isPlanetOrSatellite && styles.planetDot,
        ]}
      />
      {/* Glow halo for brighter objects */}
      {(object.size >= 6 || selected || highlighted) && (
        <Animated.View
          style={[
            styles.glow,
            {
              width: object.size * 3.5,
              height: object.size * 3.5,
              backgroundColor: object.color,
              opacity: object.kind === "star"
                ? Animated.multiply(twinkle, new Animated.Value(0.12))
                : 0.15,
            },
          ]}
        />
      )}
      {showLabel && (
        <Text style={[styles.label, selected && styles.labelSelected]} accessibilityElementsHidden>
          {object.name}
        </Text>
      )}
    </Pressable>
  );
}

export const Star = memo(StarComponent, (prev, next) => {
  return (
    prev.object.id === next.object.id &&
    prev.object.x === next.object.x &&
    prev.object.y === next.object.y &&
    prev.object.isVisible === next.object.isVisible &&
    prev.object.size === next.object.size &&
    prev.selected === next.selected &&
    prev.highlighted === next.highlighted &&
    prev.onPress === next.onPress
  );
});

const styles = StyleSheet.create({
  wrapper: {
    position: "absolute",
    alignItems: "center",
    marginLeft: -20,
    marginTop: -20,
    width: 40,
  },
  dot: {
    borderRadius: 999,
    shadowOpacity: 0.7,
    shadowRadius: 8,
    elevation: 4,
  },
  planetDot: {
    shadowOpacity: 0.9,
    shadowRadius: 12,
    elevation: 8,
  },
  glow: {
    position: "absolute",
    borderRadius: 999,
    top: "50%",
    left: "50%",
    transform: [{ translateX: -20 }, { translateY: -20 }],
  },
  selected: {
    borderWidth: 2,
    borderColor: colors.accent,
    transform: [{ scale: 1.3 }],
    shadowColor: colors.accent,
    shadowOpacity: 1,
    shadowRadius: 14,
  },
  highlighted: {
    borderWidth: 2,
    borderColor: colors.accentWarm,
    shadowColor: colors.accentWarm,
    shadowOpacity: 0.8,
    shadowRadius: 12,
  },
  label: {
    marginTop: 6,
    color: colors.text,
    fontSize: 10,
    fontWeight: "700",
    textAlign: "center",
    textShadowColor: "rgba(0,0,0,0.8)",
    textShadowOffset: { width: 0, height: 1 },
    textShadowRadius: 4,
  },
  labelSelected: {
    color: colors.accent,
    fontSize: 11,
    fontWeight: "800",
  },
});
