import { memo, useCallback, useEffect, useMemo, useRef } from "react";
import { Animated, Easing, Platform, Pressable, StyleSheet, Text, View } from "react-native";
import Svg, {
  Circle,
  ClipPath,
  Defs,
  Ellipse,
  G,
  LinearGradient,
  Path,
  Rect,
  Stop,
} from "react-native-svg";
let Haptics: any = null;
try { Haptics = require("expo-haptics"); } catch {}
import { colors, fontSize, radius } from "@/theme/colors";
import { RenderedSkyObject } from "@/types/sky";

type StarProps = {
  object: RenderedSkyObject;
  selected: boolean;
  highlighted: boolean;
  onPress: (objectId: string) => void;
};

function clamp(value: number, min: number, max: number) {
  return Math.max(min, Math.min(max, value));
}

function hashString(value: string) {
  let hash = 0;
  for (let index = 0; index < value.length; index += 1) {
    hash = (hash * 31 + value.charCodeAt(index)) >>> 0;
  }
  return hash;
}

function sanitizeId(value: string) {
  return value.replace(/[^a-zA-Z0-9_-]/g, "-");
}

function hexToRgba(hex: string, alpha: number) {
  const normalized = hex.replace("#", "");
  if (normalized.length !== 6) return `rgba(238,244,251,${alpha})`;
  const r = parseInt(normalized.slice(0, 2), 16);
  const g = parseInt(normalized.slice(2, 4), 16);
  const b = parseInt(normalized.slice(4, 6), 16);
  return `rgba(${r},${g},${b},${alpha})`;
}

function getStarSize(object: RenderedSkyObject) {
  const magnitude = object.magnitude ?? 4;
  const catalogStar = object.id.startsWith("hyg-");
  const base = catalogStar ? 1.05 : 1.3;
  const boost = clamp(2.7 - magnitude, 0, 3.2) * (catalogStar ? 0.28 : 0.44);
  return clamp(base + boost, 0.9, catalogStar ? 2.1 : 3.4);
}

function getPlanetSize(object: RenderedSkyObject) {
  const known: Record<string, number> = {
    mercury: 18,
    venus: 34,
    mars: 28,
    jupiter: 38,
    saturn: 31,
    neptune: 23,
  };
  return known[object.id] ?? clamp(object.size * 3, 18, 34);
}

function getVisualMetrics(object: RenderedSkyObject) {
  if (object.kind === "planet") {
    const size = getPlanetSize(object);
    if (object.id === "saturn") {
      return { width: size * 2.28, height: size * 1.34, core: size };
    }
    return { width: size, height: size, core: size };
  }

  if (object.kind === "satellite") {
    return { width: 18, height: 12, core: 12 };
  }

  if (object.kind === "meteor") {
    return { width: 34, height: 7, core: 9 };
  }

  const size = getStarSize(object);
  return { width: size, height: size, core: size };
}

function planetPalette(object: RenderedSkyObject) {
  const palettes: Record<string, { light: string; mid: string; dark: string; atmosphere: string }> = {
    mercury: { light: "#d8cfbd", mid: "#9b907f", dark: "#3b3835", atmosphere: "#d8cfbd" },
    venus: { light: "#fff1cf", mid: "#d5b890", dark: "#5b4a35", atmosphere: "#f5d6ad" },
    mars: { light: "#e89a74", mid: "#a84f35", dark: "#351a17", atmosphere: "#d98a67" },
    jupiter: { light: "#f8dfbb", mid: "#c99664", dark: "#4f3424", atmosphere: "#e6c9a0" },
    saturn: { light: "#f3e5c5", mid: "#cbb37e", dark: "#51442f", atmosphere: "#e8d6a8" },
    neptune: { light: "#9fb7ff", mid: "#536faf", dark: "#152447", atmosphere: "#879ddb" },
  };
  return palettes[object.id] ?? {
    light: "#f6f0df",
    mid: object.color,
    dark: "#20242c",
    atmosphere: object.color,
  };
}

function PlanetTexture({ object, clipId }: { object: RenderedSkyObject; clipId: string }) {
  if (object.id === "jupiter") {
    return (
      <G clipPath={`url(#${clipId})`}>
        <Rect x="0" y="12" width="100" height="13" fill="#e8cfaa" opacity="0.55" />
        <Path d="M0 28 C16 24 28 33 43 28 C60 22 78 30 100 25 L100 39 C80 43 62 35 45 40 C28 45 13 38 0 42 Z" fill="#9c6642" opacity="0.48" />
        <Path d="M0 48 C19 44 32 50 48 47 C64 43 80 48 100 45 L100 57 C78 60 64 54 47 58 C28 62 14 56 0 59 Z" fill="#f0d8b8" opacity="0.58" />
        <Path d="M0 64 C18 60 34 68 53 63 C70 58 84 64 100 61 L100 74 C78 78 64 69 47 75 C28 81 14 72 0 76 Z" fill="#7b4b34" opacity="0.34" />
        <Ellipse cx="69" cy="58" rx="10" ry="5.6" fill="#a35a3c" opacity="0.72" />
      </G>
    );
  }

  if (object.id === "mars") {
    return (
      <G clipPath={`url(#${clipId})`}>
        <Path d="M8 34 C25 25 39 36 55 30 C70 24 82 31 94 25 L99 45 C82 43 69 52 52 47 C34 42 19 49 4 43 Z" fill="#6b2c23" opacity="0.42" />
        <Path d="M4 62 C20 54 36 65 50 58 C67 49 83 59 98 54 L98 77 C77 75 65 68 48 75 C28 83 14 72 4 78 Z" fill="#51261f" opacity="0.3" />
        <Circle cx="30" cy="48" r="4" fill="#2d1917" opacity="0.18" />
        <Circle cx="73" cy="39" r="3" fill="#2d1917" opacity="0.16" />
        <Path d="M36 9 C45 4 56 4 64 10 C56 14 46 14 36 9 Z" fill="#f4d8c5" opacity="0.45" />
      </G>
    );
  }

  if (object.id === "venus") {
    return (
      <G clipPath={`url(#${clipId})`}>
        <Path d="M0 31 C18 22 35 36 52 28 C70 20 85 30 100 24 L100 39 C79 45 66 34 50 41 C31 49 17 37 0 44 Z" fill="#fff6d9" opacity="0.34" />
        <Path d="M0 53 C19 46 34 58 52 50 C69 43 83 50 100 47 L100 63 C81 67 65 59 49 65 C30 72 16 62 0 67 Z" fill="#f7dfb4" opacity="0.4" />
        <Path d="M10 73 C28 66 44 75 59 69 C73 63 86 70 98 66 L98 80 C79 84 65 78 47 83 C31 87 19 80 10 84 Z" fill="#b68e61" opacity="0.22" />
      </G>
    );
  }

  if (object.id === "neptune") {
    return (
      <G clipPath={`url(#${clipId})`}>
        <Path d="M0 36 C20 31 38 39 56 35 C72 31 87 35 100 32 L100 42 C80 46 64 39 48 44 C31 49 15 42 0 47 Z" fill="#b8c8ff" opacity="0.22" />
        <Path d="M18 59 C35 54 52 62 68 57 C82 53 92 57 100 55 L100 66 C83 68 68 63 54 68 C38 73 26 66 18 70 Z" fill="#203660" opacity="0.26" />
        <Ellipse cx="66" cy="38" rx="7" ry="3" fill="#18264a" opacity="0.28" />
      </G>
    );
  }

  if (object.id === "mercury") {
    return (
      <G clipPath={`url(#${clipId})`}>
        <Circle cx="32" cy="35" r="6" fill="#2e2d2b" opacity="0.18" />
        <Circle cx="61" cy="47" r="4" fill="#2e2d2b" opacity="0.16" />
        <Circle cx="43" cy="67" r="5" fill="#2e2d2b" opacity="0.13" />
        <Path d="M8 58 C26 51 37 60 54 54 C70 48 84 54 96 50 L96 65 C78 68 62 61 48 67 C30 74 17 66 8 70 Z" fill="#5b554c" opacity="0.19" />
      </G>
    );
  }

  return (
    <G clipPath={`url(#${clipId})`}>
      <Path d="M4 42 C22 33 40 47 58 39 C74 32 88 38 98 35 L98 51 C77 55 64 48 48 54 C29 61 15 51 4 56 Z" fill="#ffffff" opacity="0.12" />
      <Path d="M7 62 C24 56 38 66 55 60 C72 54 86 60 97 57 L97 72 C78 75 63 69 46 74 C30 79 18 70 7 75 Z" fill="#000000" opacity="0.12" />
    </G>
  );
}

function PlanetDisc({ object, size }: { object: RenderedSkyObject; size: number }) {
  const id = sanitizeId(object.id);
  const clipId = `${id}-clip`;
  const palette = planetPalette(object);

  if (object.id === "saturn") {
    return (
      <Svg width={size * 2.28} height={size * 1.34} viewBox="0 0 120 72">
        <Defs>
          <LinearGradient id={`${id}-ring`} x1="0%" y1="36%" x2="100%" y2="64%">
            <Stop offset="0%" stopColor="#6d624c" stopOpacity="0.05" />
            <Stop offset="32%" stopColor="#e8d6a8" stopOpacity="0.42" />
            <Stop offset="62%" stopColor="#b7a47a" stopOpacity="0.3" />
            <Stop offset="100%" stopColor="#2d281f" stopOpacity="0.08" />
          </LinearGradient>
          <LinearGradient id={`${id}-body`} x1="22%" y1="14%" x2="88%" y2="84%">
            <Stop offset="0%" stopColor={palette.light} />
            <Stop offset="48%" stopColor={palette.mid} />
            <Stop offset="100%" stopColor={palette.dark} />
          </LinearGradient>
          <LinearGradient id={`${id}-shade`} x1="16%" y1="12%" x2="100%" y2="86%">
            <Stop offset="0%" stopColor="#ffffff" stopOpacity="0" />
            <Stop offset="58%" stopColor="#05070b" stopOpacity="0.08" />
            <Stop offset="100%" stopColor="#000000" stopOpacity="0.66" />
          </LinearGradient>
          <ClipPath id={clipId}>
            <Circle cx="60" cy="36" r="18" />
          </ClipPath>
        </Defs>
        <Ellipse cx="60" cy="38" rx="53" ry="10" fill="none" stroke={`url(#${id}-ring)`} strokeWidth="4.4" transform="rotate(-12 60 38)" />
        <Circle cx="60" cy="36" r="18" fill={`url(#${id}-body)`} />
        <G clipPath={`url(#${clipId})`}>
          <Rect x="38" y="25" width="44" height="5" fill="#f5e5bd" opacity="0.28" />
          <Rect x="38" y="36" width="44" height="4" fill="#8c7753" opacity="0.18" />
          <Rect x="38" y="44" width="44" height="4" fill="#f1dcad" opacity="0.18" />
        </G>
        <Circle cx="60" cy="36" r="18" fill={`url(#${id}-shade)`} />
        <Ellipse cx="60" cy="38" rx="53" ry="10" fill="none" stroke="rgba(238,231,210,0.26)" strokeWidth="1" transform="rotate(-12 60 38)" />
      </Svg>
    );
  }

  return (
    <Svg width={size} height={size} viewBox="0 0 100 100">
      <Defs>
        <LinearGradient id={`${id}-body`} x1="18%" y1="12%" x2="92%" y2="88%">
          <Stop offset="0%" stopColor={palette.light} />
          <Stop offset="46%" stopColor={palette.mid} />
          <Stop offset="100%" stopColor={palette.dark} />
        </LinearGradient>
        <LinearGradient id={`${id}-shade`} x1="20%" y1="12%" x2="100%" y2="86%">
          <Stop offset="0%" stopColor="#ffffff" stopOpacity="0.08" />
          <Stop offset="56%" stopColor="#05070b" stopOpacity="0.04" />
          <Stop offset="100%" stopColor="#000000" stopOpacity="0.68" />
        </LinearGradient>
        <ClipPath id={clipId}>
          <Circle cx="50" cy="50" r="47" />
        </ClipPath>
      </Defs>
      <Circle cx="50" cy="50" r="47" fill={`url(#${id}-body)`} />
      <PlanetTexture object={object} clipId={clipId} />
      <Circle cx="50" cy="50" r="47" fill={`url(#${id}-shade)`} />
      <Circle cx="50" cy="50" r="47" fill="none" stroke={hexToRgba(palette.atmosphere, 0.36)} strokeWidth="1" />
    </Svg>
  );
}

function SatelliteGlyph({ color }: { color: string }) {
  return (
    <View style={styles.satelliteWrap}>
      <View style={[styles.satellitePanel, { borderColor: hexToRgba(color, 0.55) }]} />
      <View style={[styles.satelliteCore, { backgroundColor: color }]} />
      <View style={[styles.satellitePanel, { borderColor: hexToRgba(color, 0.55) }]} />
    </View>
  );
}

function MeteorGlyph({ color }: { color: string }) {
  return (
    <View style={styles.meteorWrap}>
      <View style={[styles.meteorHead, { backgroundColor: color }]} />
      <View style={[styles.meteorTrail, { backgroundColor: hexToRgba(color, 0.38) }]} />
    </View>
  );
}

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
  const planetScale = useRef(new Animated.Value(1)).current;
  const haloScale = useRef(new Animated.Value(1)).current;
  const metrics = useMemo(() => getVisualMetrics(object), [object.id, object.kind, object.magnitude, object.size]);

  const twinkleConfig = useMemo(() => {
    const seed = hashString(object.id);
    return {
      duration: 4200 + (seed % 2600),
      minOpacity: 0.72 + ((seed % 19) / 100),
      delay: seed % 1800,
    };
  }, [object.id]);

  useEffect(() => {
    if (!object.isVisible || object.kind !== "star") return;

    const anim = Animated.loop(
      Animated.sequence([
        Animated.timing(twinkle, {
          toValue: twinkleConfig.minOpacity,
          duration: twinkleConfig.duration,
          easing: Easing.inOut(Easing.sin),
          useNativeDriver: true,
        }),
        Animated.timing(twinkle, {
          toValue: 1,
          duration: twinkleConfig.duration + 600,
          easing: Easing.inOut(Easing.sin),
          useNativeDriver: true,
        }),
      ]),
    );
    const timeout = setTimeout(() => anim.start(), twinkleConfig.delay);
    return () => {
      clearTimeout(timeout);
      anim.stop();
    };
  }, [object.isVisible, object.kind, twinkle, twinkleConfig]);

  useEffect(() => {
    if (!object.isVisible || object.kind !== "planet") return;

    const anim = Animated.loop(
      Animated.sequence([
        Animated.timing(planetScale, {
          toValue: 1.025,
          duration: 7600,
          easing: Easing.inOut(Easing.ease),
          useNativeDriver: true,
        }),
        Animated.timing(planetScale, {
          toValue: 1,
          duration: 7600,
          easing: Easing.inOut(Easing.ease),
          useNativeDriver: true,
        }),
      ]),
    );
    anim.start();
    return () => anim.stop();
  }, [object.isVisible, object.kind, planetScale]);

  useEffect(() => {
    if (!selected && !highlighted) {
      haloScale.setValue(1);
      return;
    }

    const anim = Animated.loop(
      Animated.sequence([
        Animated.timing(haloScale, {
          toValue: 1.08,
          duration: 2200,
          easing: Easing.inOut(Easing.ease),
          useNativeDriver: true,
        }),
        Animated.timing(haloScale, {
          toValue: 1,
          duration: 2200,
          easing: Easing.inOut(Easing.ease),
          useNativeDriver: true,
        }),
      ]),
    );
    anim.start();
    return () => anim.stop();
  }, [haloScale, highlighted, selected]);

  if (!object.isVisible) {
    return null;
  }

  const hitSize = Math.max(44, metrics.width + 18, metrics.height + 18);
  const haloSize = Math.max(metrics.width, metrics.height) + (object.kind === "planet" ? 18 : 12);
  const showHalo = selected || highlighted;
  const showLabel = selected || highlighted;
  const starOpacity = clamp(1.06 - (object.magnitude ?? 3) * 0.1, 0.38, 0.95);
  const starShadow = (object.magnitude ?? 6) < 1.25 ? 0.24 : 0.05;

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
          width: hitSize,
          height: hitSize,
          marginLeft: -hitSize / 2,
          marginTop: -hitSize / 2,
        },
      ]}
    >
      {showHalo && (
        <Animated.View
          style={[
            styles.selectionHalo,
            {
              width: haloSize,
              height: haloSize,
              borderRadius: haloSize / 2,
              borderColor: selected ? hexToRgba(object.color, 0.48) : hexToRgba(colors.accentWarm, 0.34),
              marginLeft: -haloSize / 2,
              marginTop: -haloSize / 2,
              transform: [{ scale: haloScale }],
            },
          ]}
        />
      )}

      <Animated.View
        style={[
          styles.visual,
          {
            width: metrics.width,
            height: metrics.height,
            marginLeft: -metrics.width / 2,
            marginTop: -metrics.height / 2,
            opacity: object.kind === "star" ? Animated.multiply(twinkle, starOpacity) : 1,
            transform: object.kind === "planet" ? [{ scale: planetScale }] : [],
          },
        ]}
      >
        {object.kind === "planet" ? (
          <PlanetDisc object={object} size={metrics.core} />
        ) : object.kind === "satellite" ? (
          <SatelliteGlyph color={object.color} />
        ) : object.kind === "meteor" ? (
          <MeteorGlyph color={object.color} />
        ) : (
          <View
            style={[
              styles.starPoint,
              {
                width: metrics.core,
                height: metrics.core,
                borderRadius: metrics.core / 2,
                backgroundColor: object.color,
                shadowColor: object.color,
                shadowOpacity: starShadow,
              },
            ]}
          />
        )}
      </Animated.View>

      {showLabel && (
        <Text
          numberOfLines={1}
          style={[
            styles.label,
            {
              top: hitSize / 2 + metrics.height / 2 + 5,
              color: selected ? colors.text : colors.accentWarm,
            },
          ]}
          accessibilityElementsHidden
        >
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
    prev.object.color === next.object.color &&
    prev.object.magnitude === next.object.magnitude &&
    prev.selected === next.selected &&
    prev.highlighted === next.highlighted &&
    prev.onPress === next.onPress
  );
});

const styles = StyleSheet.create({
  wrapper: {
    position: "absolute",
    alignItems: "center",
    justifyContent: "center",
  },
  selectionHalo: {
    position: "absolute",
    left: "50%",
    top: "50%",
    borderWidth: 1,
    backgroundColor: "rgba(255,255,255,0.018)",
  },
  visual: {
    position: "absolute",
    left: "50%",
    top: "50%",
    alignItems: "center",
    justifyContent: "center",
  },
  starPoint: {
    shadowRadius: 1.8,
    elevation: 1,
  },
  satelliteWrap: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 2,
    transform: [{ rotate: "-12deg" }],
  },
  satellitePanel: {
    width: 6,
    height: 4,
    borderWidth: 0.8,
    backgroundColor: "rgba(220,232,246,0.06)",
  },
  satelliteCore: {
    width: 4,
    height: 4,
    borderRadius: 2,
  },
  meteorWrap: {
    width: 34,
    height: 7,
    alignItems: "flex-end",
    justifyContent: "center",
    transform: [{ rotate: "-18deg" }],
  },
  meteorHead: {
    width: 4,
    height: 4,
    borderRadius: 2,
  },
  meteorTrail: {
    position: "absolute",
    right: 4,
    width: 28,
    height: 1,
    borderRadius: radius.sm,
  },
  label: {
    position: "absolute",
    maxWidth: 96,
    color: colors.text,
    fontSize: fontSize.xs,
    fontWeight: "700",
    textAlign: "center",
    textShadowColor: "rgba(0,0,0,0.86)",
    textShadowOffset: { width: 0, height: 1 },
    textShadowRadius: 4,
  },
});
