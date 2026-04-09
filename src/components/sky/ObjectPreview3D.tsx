import { useEffect, useRef } from "react";
import { Animated, Easing, StyleSheet, Text, View } from "react-native";
import { colors } from "@/theme/colors";

export function ObjectPreview3D({
  color,
  title,
  description,
}: {
  color: string;
  title?: string;
  description?: string;
}) {
  const spin = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    const animation = Animated.loop(
      Animated.timing(spin, {
        toValue: 1,
        duration: 6000,
        easing: Easing.linear,
        useNativeDriver: true,
      }),
    );
    animation.start();
    return () => animation.stop();
  }, [spin]);

  const rotateY = spin.interpolate({
    inputRange: [0, 1],
    outputRange: ["0deg", "360deg"],
  });

  return (
    <View style={styles.card}>
      <Animated.View style={[styles.previewWrap, { transform: [{ rotateY }] }]}>
        <View style={[styles.orb, { backgroundColor: color }]} />
        <View style={styles.ring} />
      </Animated.View>
      <Text style={styles.title}>{title ?? "3D Focus Preview"}</Text>
      <Text style={styles.description}>{description ?? "A simplified 3D-style rotating preview for the selected object."}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  card: {
    borderRadius: 18,
    padding: 14,
    backgroundColor: colors.cardSoft,
    marginTop: 14,
  },
  previewWrap: {
    alignItems: "center",
    justifyContent: "center",
    height: 130,
  },
  orb: {
    width: 76,
    height: 76,
    borderRadius: 999,
    shadowColor: "#ffffff",
    shadowOpacity: 0.35,
    shadowRadius: 16,
  },
  ring: {
    position: "absolute",
    width: 112,
    height: 28,
    borderRadius: 999,
    borderWidth: 2,
    borderColor: "rgba(255,255,255,0.35)",
    transform: [{ rotate: "-12deg" }],
  },
  title: {
    color: colors.text,
    fontWeight: "700",
  },
  description: {
    color: colors.textMuted,
    lineHeight: 19,
    marginTop: 8,
  },
});
