import { useEffect, useRef } from "react";
import { Platform, StyleSheet, View } from "react-native";
import type { SkyObject } from "@/types/sky";
import { initGLScene, type GLSkyHandles } from "@/services/sky/glSkyRenderer";
import type { AttitudeState } from "@/hooks/useAttitudeQuaternion";

type Props = {
  objects: SkyObject[];
  attitude: AttitudeState;
  observerLatDeg: number;
  observerLonDeg: number;
  localSiderealDeg: number;
  fovYDeg?: number;
};

let GLView: any = null;
try {
  GLView = require("expo-gl").GLView;
} catch {
  GLView = null;
}

export function GLSkyScene(props: Props) {
  const handles = useRef<GLSkyHandles | null>(null);
  const rafRef = useRef<number | null>(null);
  const propsRef = useRef(props);
  propsRef.current = props;

  useEffect(
    () => () => {
      if (rafRef.current !== null) cancelAnimationFrame(rafRef.current);
      handles.current?.destroy();
    },
    [],
  );

  if (!GLView || Platform.OS === "web") {
    return <View style={styles.fallback} accessibilityLabel="GL sky fallback" />;
  }

  const onContextCreate = async (gl: WebGLRenderingContext & { endFrameEXP?: () => void }) => {
    handles.current = initGLScene(gl, propsRef.current.objects);
    const tick = () => {
      const p = propsRef.current;
      handles.current?.drawFrame({
        quaternion: p.attitude.quaternion,
        observerLatDeg: p.observerLatDeg,
        localSiderealDeg: p.localSiderealDeg,
        fovYDeg: p.fovYDeg ?? 60,
      });
      gl.endFrameEXP?.();
      rafRef.current = requestAnimationFrame(tick);
    };
    tick();
  };

  return <GLView style={StyleSheet.absoluteFill} onContextCreate={onContextCreate} />;
}

const styles = StyleSheet.create({
  fallback: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: "#000",
  },
});
