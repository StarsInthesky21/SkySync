import { useEffect, useRef } from "react";
import { Animated, Easing, StyleSheet, Text, View } from "react-native";
import { colors, fontSize, radius } from "@/theme/colors";

export function ObjectPreview3D({
  color,
  title,
  description,
  kind,
}: {
  color: string;
  title?: string;
  description?: string;
  kind?: string;
}) {
  const spin = useRef(new Animated.Value(0)).current;
  const pulse = useRef(new Animated.Value(1)).current;

  useEffect(() => {
    const spinAnim = Animated.loop(
      Animated.timing(spin, {
        toValue: 1,
        duration: 8000,
        easing: Easing.linear,
        useNativeDriver: true,
      }),
    );
    const pulseAnim = Animated.loop(
      Animated.sequence([
        Animated.timing(pulse, { toValue: 1.08, duration: 2000, easing: Easing.inOut(Easing.ease), useNativeDriver: true }),
        Animated.timing(pulse, { toValue: 1, duration: 2000, easing: Easing.inOut(Easing.ease), useNativeDriver: true }),
      ]),
    );
    spinAnim.start();
    pulseAnim.start();
    return () => { spinAnim.stop(); pulseAnim.stop(); };
  }, [spin, pulse]);

  const rotateY = spin.interpolate({
    inputRange: [0, 1],
    outputRange: ["0deg", "360deg"],
  });

  const showRing = kind === "planet";
  const orbSize = kind === "satellite" ? 48 : kind === "meteor" ? 40 : 72;

  return (
    <View style={styles.card}>
      <Animated.View style={[styles.previewWrap, { transform: [{ scale: pulse }] }]}>
        <Animated.View style={{ transform: [{ rotateY }] }}>
          <View style={[styles.orb, { backgroundColor: color, width: orbSize, height: orbSize }]}>
            <View style={[styles.orbGlow, { backgroundColor: color }]} />
          </View>
        </Animated.View>
        {showRing && <View style={styles.ring} />}
      </Animated.View>
      <Text style={styles.title}>{title ?? "Object Preview"}</Text>
      <Text style={styles.description}>{description ?? "A simplified preview of the selected celestial object."}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  card: {
    borderRadius: radius.lg,
    padding: 16,
    backgroundColor: "rgba(11,29,51,0.6)",
    marginTop: 14,
    borderWidth: 1,
    borderColor: "rgba(255,255,255,0.04)",
  },
  previewWrap: {
    alignItems: "center",
    justifyContent: "center",
    height: 140,
  },
  orb: {
    borderRadius: radius.pill,
    shadowColor: "#ffffff",
    shadowOpacity: 0.4,
    shadowRadius: 20,
    elevation: 8,
  },
  orbGlow: {
    position: "absolute",
    top: -8,
    left: -8,
    right: -8,
    bottom: -8,
    borderRadius: radius.pill,
    opacity: 0.15,
  },
  ring: {
    position: "absolute",
    width: 120,
    height: 30,
    borderRadius: radius.pill,
    borderWidth: 2,
    borderColor: "rgba(255,255,255,0.25)",
    transform: [{ rotate: "-15deg" }, { scaleY: 0.35 }],
  },
  title: {
    color: colors.text,
    fontWeight: "700",
    fontSize: fontSize.base,
    marginTop: 4,
  },
  description: {
    color: colors.textMuted,
    lineHeight: 20,
    marginTop: 6,
    fontSize: fontSize.sm,
  },
});
