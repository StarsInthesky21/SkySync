import { useMemo } from "react";
import { Dimensions, Pressable, StyleSheet, Text, View } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { Stack, useRouter } from "expo-router";
import Svg, { Circle, G, Line } from "react-native-svg";
import { useSkySync } from "@/providers/SkySyncProvider";
import { useAttitudeQuaternion } from "@/hooks/useAttitudeQuaternion";
import { celestialToLocal, equatorialToVector, projectToScreen } from "@/services/sky/skyProjection";
import { localSiderealDegrees } from "@/services/astronomy/planetEphemeris";
import { GLSkyScene } from "@/components/sky/GLSkyScene";
import { CameraBackground } from "@/components/sky/CameraBackground";
import { colors, fontSize, radius, spacing } from "@/theme/colors";

const FOV_Y = 60;

export default function ARScreen() {
  const router = useRouter();
  const attitude = useAttitudeQuaternion(30);
  const { objects, selectObject, observerLocation } = useSkySync();
  const { width, height } = Dimensions.get("window");
  const aspect = width / height;
  const halfW = width / 2;
  const halfH = height / 2;

  const latitudeDeg = observerLocation.latitude ?? 37.7749;
  const longitudeDeg = observerLocation.longitude ?? -122.4194;

  const now = new Date();
  const lstDeg = localSiderealDegrees(now, longitudeDeg);

  // SVG overlay draws labels for the brightest objects near the reticle —
  // GL handles the full star field, SVG handles the text.
  const labeled = useMemo(() => {
    const out: {
      id: string;
      name: string;
      color: string;
      x: number;
      y: number;
      kind: string;
      distance: number;
    }[] = [];
    for (const obj of objects) {
      if (obj.magnitude > 3) continue; // labels only for bright objects
      const v = equatorialToVector(obj.longitude, obj.latitude);
      const vLocal = celestialToLocal(v, latitudeDeg, lstDeg);
      const projection = projectToScreen(vLocal, attitude.quaternion, FOV_Y, aspect);
      if (!projection) continue;
      const px = halfW + projection.x * halfW;
      const py = halfH + projection.y * halfH;
      const dx = px - halfW;
      const dy = py - halfH;
      const d = Math.sqrt(dx * dx + dy * dy);
      out.push({ id: obj.id, name: obj.name, color: obj.color, x: px, y: py, kind: obj.kind, distance: d });
    }
    return out.sort((a, b) => a.distance - b.distance).slice(0, 12);
  }, [objects, attitude.quaternion, lstDeg, halfW, halfH, aspect, latitudeDeg]);

  const centered = labeled[0] && labeled[0].distance < 110 ? labeled[0] : null;

  return (
    <View style={styles.container}>
      <Stack.Screen options={{ title: "Sky AR", headerShown: false }} />

      <CameraBackground />

      <GLSkyScene
        objects={objects}
        attitude={attitude}
        observerLatDeg={latitudeDeg}
        observerLonDeg={longitudeDeg}
        localSiderealDeg={lstDeg}
        fovYDeg={FOV_Y}
      />

      <Svg width={width} height={height} style={StyleSheet.absoluteFill} pointerEvents="box-none">
        <G>
          <Circle
            cx={halfW}
            cy={halfH}
            r={28}
            stroke={colors.accent}
            strokeWidth={1.5}
            fill="none"
            opacity={0.5}
          />
          <Circle cx={halfW} cy={halfH} r={2} fill={colors.accent} />
          <Line
            x1={halfW - 44}
            y1={halfH}
            x2={halfW - 30}
            y2={halfH}
            stroke={colors.accent}
            strokeWidth={1}
            opacity={0.5}
          />
          <Line
            x1={halfW + 30}
            y1={halfH}
            x2={halfW + 44}
            y2={halfH}
            stroke={colors.accent}
            strokeWidth={1}
            opacity={0.5}
          />
          <Line
            x1={halfW}
            y1={halfH - 44}
            x2={halfW}
            y2={halfH - 30}
            stroke={colors.accent}
            strokeWidth={1}
            opacity={0.5}
          />
          <Line
            x1={halfW}
            y1={halfH + 30}
            x2={halfW}
            y2={halfH + 44}
            stroke={colors.accent}
            strokeWidth={1}
            opacity={0.5}
          />
        </G>
      </Svg>

      <SafeAreaView style={styles.uiOverlay} pointerEvents="box-none">
        <View style={styles.topRow}>
          <Pressable style={styles.closeBtn} onPress={() => router.back()} accessibilityLabel="Close AR">
            <Text style={styles.closeIcon}>{"\u00D7"}</Text>
          </Pressable>
          <View style={styles.statusPill}>
            <View
              style={[
                styles.dot,
                { backgroundColor: attitude.available ? colors.accentSuccess : colors.accentDanger },
              ]}
            />
            <Text style={styles.statusText}>
              {attitude.available
                ? `${Math.round(attitude.headingDeg)}\u00B0 | ${Math.round(attitude.pitchDeg)}\u00B0`
                : "NO SENSORS"}
            </Text>
          </View>
        </View>

        <View style={{ flex: 1 }} />

        {centered && (
          <Pressable
            style={styles.infoCard}
            onPress={() => {
              selectObject(centered.id);
              router.push(`/object/${centered.id}`);
            }}
          >
            <View style={[styles.infoSwatch, { backgroundColor: centered.color }]} />
            <View style={{ flex: 1 }}>
              <Text style={styles.infoName}>{centered.name}</Text>
              <Text style={styles.infoKind}>{centered.kind.toUpperCase()}</Text>
            </View>
            <Text style={styles.infoArrow}>{"\u203A"}</Text>
          </Pressable>
        )}

        {!attitude.available && (
          <View style={styles.hintBanner}>
            <Text style={styles.hintTitle}>AR needs device sensors</Text>
            <Text style={styles.hintBody}>
              Your device doesn&apos;t expose orientation sensors — stars render in a fixed 3D frame instead.
            </Text>
          </View>
        )}

        <View style={styles.bottomHint}>
          <Text style={styles.hintText}>
            Point your phone at the sky. Center an object to open its details.
          </Text>
        </View>
      </SafeAreaView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: "#000" },
  uiOverlay: { ...StyleSheet.absoluteFillObject, padding: spacing.lg },
  topRow: { flexDirection: "row", alignItems: "center", justifyContent: "space-between" },
  closeBtn: {
    width: 44,
    height: 44,
    borderRadius: radius.pill,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: "rgba(8,17,31,0.8)",
    borderWidth: 1,
    borderColor: colors.border,
  },
  closeIcon: { color: colors.text, fontSize: fontSize.lg, fontWeight: "800" },
  statusPill: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderRadius: radius.pill,
    backgroundColor: "rgba(8,17,31,0.8)",
    borderWidth: 1,
    borderColor: colors.border,
  },
  dot: { width: 8, height: 8, borderRadius: radius.pill },
  statusText: { color: colors.text, fontSize: fontSize.xs, fontWeight: "800", letterSpacing: 1 },
  infoCard: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
    padding: 14,
    borderRadius: radius.lg,
    backgroundColor: "rgba(8,17,31,0.94)",
    borderWidth: 1,
    borderColor: colors.borderFocus,
    marginBottom: spacing.md,
  },
  infoSwatch: { width: 18, height: 18, borderRadius: radius.pill },
  infoName: { color: colors.text, fontSize: fontSize.md, fontWeight: "800" },
  infoKind: { color: colors.textDim, fontSize: fontSize.xs, letterSpacing: 1, marginTop: 2 },
  infoArrow: { color: colors.accent, fontSize: fontSize.xl, fontWeight: "800" },
  hintBanner: {
    padding: 14,
    borderRadius: radius.lg,
    backgroundColor: "rgba(215,114,95,0.15)",
    borderWidth: 1,
    borderColor: colors.accentWarm,
    marginBottom: spacing.md,
  },
  hintTitle: { color: colors.accentWarm, fontWeight: "800", fontSize: fontSize.sm },
  hintBody: { color: colors.text, fontSize: fontSize.sm, marginTop: 4, lineHeight: 20 },
  bottomHint: {
    padding: 10,
    borderRadius: radius.md,
    backgroundColor: "rgba(8,17,31,0.6)",
    borderWidth: 1,
    borderColor: colors.border,
  },
  hintText: { color: colors.textMuted, fontSize: fontSize.xs, textAlign: "center" },
});
