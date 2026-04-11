/**
 * Hook for device compass (magnetometer) and accelerometer data.
 * Used for AR-lite "point at sky" mode and gentle space-scene parallax.
 */
import { useEffect, useRef, useState } from "react";
import { Platform } from "react-native";

let Magnetometer: any = null;
let Accelerometer: any = null;
try {
  const sensors = require("expo-sensors");
  Magnetometer = sensors.Magnetometer;
  Accelerometer = sensors.Accelerometer;
} catch {
  // expo-sensors not available - AR features will be disabled.
}

export type DeviceOrientation = {
  /** Compass heading in degrees (0 = North, 90 = East, 180 = South, 270 = West). */
  heading: number;
  /** Device pitch in degrees (-90 = pointing straight up, 0 = flat, 90 = pointing down). */
  pitch: number;
  /** Device roll in degrees, useful for subtle parallax. */
  roll: number;
  /** Whether the device is pointing upward enough to be stargazing. */
  isPointingAtSky: boolean;
  /** Whether sensors are available. */
  available: boolean;
  /** Whether compass/AR mode is active. */
  active: boolean;
};

const INITIAL: DeviceOrientation = {
  heading: 0,
  pitch: 0,
  roll: 0,
  isPointingAtSky: false,
  available: false,
  active: false,
};

function lowPass(prev: number, next: number, alpha: number): number {
  return prev + alpha * (next - prev);
}

function normalizeAngle(angle: number): number {
  return ((angle % 360) + 360) % 360;
}

export function useDeviceSensors() {
  const [orientation, setOrientation] = useState<DeviceOrientation>(INITIAL);
  const [arActive, setArActive] = useState(false);
  const [sensorsAvailable, setSensorsAvailable] = useState(false);
  const headingRef = useRef(0);
  const pitchRef = useRef(0);
  const rollRef = useRef(0);

  useEffect(() => {
    if (Platform.OS === "web" || !Magnetometer || !Accelerometer) return;

    let mounted = true;
    async function setup() {
      const [magAvail, accAvail] = await Promise.all([
        Magnetometer.isAvailableAsync().catch(() => false),
        Accelerometer.isAvailableAsync().catch(() => false),
      ]);

      if (!mounted) return;
      const available = magAvail && accAvail;
      setSensorsAvailable(available);
      setOrientation((prev) => ({ ...prev, available }));
    }

    setup();
    return () => {
      mounted = false;
    };
  }, []);

  useEffect(() => {
    if (Platform.OS === "web" || !sensorsAvailable || !Magnetometer || !Accelerometer) {
      setOrientation((prev) => ({ ...prev, active: false, available: sensorsAvailable }));
      return;
    }

    Magnetometer.setUpdateInterval(140);
    Accelerometer.setUpdateInterval(140);

    const magSub = Magnetometer.addListener((data: { x: number; y: number; z: number }) => {
      let angle = Math.atan2(data.y, data.x) * (180 / Math.PI);
      angle = normalizeAngle(90 - angle);
      headingRef.current = lowPass(headingRef.current, angle, 0.15);
    });

    const accSub = Accelerometer.addListener((data: { x: number; y: number; z: number }) => {
      const pitch = Math.atan2(-data.y, -data.z) * (180 / Math.PI);
      const roll = Math.atan2(data.x, -data.z) * (180 / Math.PI);
      pitchRef.current = lowPass(pitchRef.current, pitch, 0.15);
      rollRef.current = lowPass(rollRef.current, roll, 0.15);
    });

    const interval = setInterval(() => {
      const pitch = pitchRef.current;
      setOrientation({
        heading: normalizeAngle(headingRef.current),
        pitch,
        roll: rollRef.current,
        isPointingAtSky: pitch < -20,
        available: true,
        active: arActive,
      });
    }, 140);

    return () => {
      magSub.remove();
      accSub.remove();
      clearInterval(interval);
    };
  }, [arActive, sensorsAvailable]);

  const toggleAr = () => setArActive((prev) => !prev);

  return {
    orientation,
    arActive,
    toggleAr,
    setArActive,
  };
}
