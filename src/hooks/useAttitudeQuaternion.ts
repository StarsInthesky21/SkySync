import { useEffect, useRef, useState } from "react";
import { Platform } from "react-native";
import { eulerToQuaternion, slerpQ, type Quaternion } from "@/services/sky/skyProjection";

let DeviceMotion: any = null;
try {
  DeviceMotion = require("expo-sensors").DeviceMotion;
} catch {
  // sensors not available
}

export type AttitudeState = {
  quaternion: Quaternion;
  headingDeg: number;
  pitchDeg: number;
  rollDeg: number;
  available: boolean;
};

const INITIAL: AttitudeState = {
  quaternion: [0, 0, 0, 1],
  headingDeg: 0,
  pitchDeg: 0,
  rollDeg: 0,
  available: false,
};

export function useAttitudeQuaternion(updateHz = 30): AttitudeState {
  const [state, setState] = useState<AttitudeState>(INITIAL);
  const latestQ = useRef<Quaternion>([0, 0, 0, 1]);

  useEffect(() => {
    if (Platform.OS === "web" || !DeviceMotion) return;

    let cancelled = false;
    let sub: { remove: () => void } | undefined;

    const setup = async () => {
      try {
        const ok = await DeviceMotion.isAvailableAsync?.();
        if (!ok || cancelled) return;
        DeviceMotion.setUpdateInterval(1000 / updateHz);
        sub = DeviceMotion.addListener((data: any) => {
          if (!data?.rotation) return;
          const { alpha = 0, beta = 0, gamma = 0 } = data.rotation;
          const yawDeg = (alpha * 180) / Math.PI;
          const pitchDeg = (beta * 180) / Math.PI;
          const rollDeg = (gamma * 180) / Math.PI;
          const target = eulerToQuaternion(yawDeg, pitchDeg, rollDeg);
          const smoothed = slerpQ(latestQ.current, target, 0.25);
          latestQ.current = smoothed;
          setState({
            quaternion: smoothed,
            headingDeg: (360 - yawDeg + 360) % 360,
            pitchDeg,
            rollDeg,
            available: true,
          });
        });
      } catch {
        // ignore
      }
    };

    setup();
    return () => {
      cancelled = true;
      try {
        sub?.remove();
      } catch {
        /* ignore */
      }
    };
  }, [updateHz]);

  return state;
}
