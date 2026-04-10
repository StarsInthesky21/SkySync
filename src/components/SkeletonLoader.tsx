import { useEffect, useRef } from "react";
import { Animated, Easing, StyleSheet, View } from "react-native";
import { colors, radius, spacing } from "@/theme/colors";

function ShimmerBlock({ width, height, style }: { width: number | string; height: number; style?: object }) {
  const shimmer = useRef(new Animated.Value(0.3)).current;

  useEffect(() => {
    const anim = Animated.loop(
      Animated.sequence([
        Animated.timing(shimmer, { toValue: 0.7, duration: 1000, easing: Easing.inOut(Easing.ease), useNativeDriver: true }),
        Animated.timing(shimmer, { toValue: 0.3, duration: 1000, easing: Easing.inOut(Easing.ease), useNativeDriver: true }),
      ]),
    );
    anim.start();
    return () => anim.stop();
  }, [shimmer]);

  return (
    <Animated.View
      style={[
        styles.block,
        { width: width as number, height, opacity: shimmer },
        style,
      ]}
    />
  );
}

export function SkyViewSkeleton() {
  return (
    <View style={styles.skyContainer}>
      <ShimmerBlock width="100%" height={440} style={{ borderRadius: radius.xl }} />
    </View>
  );
}

export function CardSkeleton() {
  return (
    <View style={styles.card}>
      <ShimmerBlock width={120} height={14} />
      <ShimmerBlock width="80%" height={12} style={{ marginTop: 10 }} />
      <ShimmerBlock width="60%" height={12} style={{ marginTop: 6 }} />
      <View style={styles.row}>
        <ShimmerBlock width="45%" height={40} style={{ borderRadius: radius.md }} />
        <ShimmerBlock width="45%" height={40} style={{ borderRadius: radius.md }} />
      </View>
    </View>
  );
}

export function ProfileSkeleton() {
  return (
    <View style={styles.card}>
      <View style={styles.profileRow}>
        <ShimmerBlock width={48} height={48} style={{ borderRadius: 999 }} />
        <View style={{ flex: 1, gap: 6 }}>
          <ShimmerBlock width={100} height={14} />
          <ShimmerBlock width={160} height={10} />
        </View>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  skyContainer: {
    overflow: "hidden",
    borderRadius: radius.xl,
  },
  card: {
    borderRadius: radius.xl,
    padding: spacing.lg,
    backgroundColor: colors.card,
    borderWidth: 1,
    borderColor: colors.border,
    gap: 4,
  },
  block: {
    backgroundColor: "rgba(255,255,255,0.06)",
    borderRadius: radius.sm,
  },
  row: {
    flexDirection: "row",
    gap: 8,
    marginTop: 12,
  },
  profileRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
  },
});
