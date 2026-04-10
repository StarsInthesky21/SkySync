/**
 * Hook for device compass (magnetometer) and accelerometer data.
 * Used for AR-lite "point at sky" mode.
 * Returns heading (compass bearing) and device tilt (pitch).
 */
import { useEffect, useRef, useState } from "react";
import { Platform } from "react-native";

// Dynamic import to avoid crash if expo-sensors native module isn't linked
let Magnetometer: any = null;
let Accelerometer: any = null;
try {
  const sensors = require("expo-sensors");
  Magnetometer = sensors.Magnetometer;
  Accelerometer = sensors.Accelerometer;
} catch {
  // expo-sensors not available - AR features will be disabled
}

export type DeviceOrientation = {
  /** Compass heading in degrees (0 = North, 90 = East, 180 = South, 270 = West) */
  heading: number;
  /** Device pitch in degrees (-90 = pointing straight up, 0 = flat, 90 = pointing down) */
  pitch: number;
  /** Whether the device is pointing upward enough to be stargazing */
  isPointingAtSky: boolean;
  /** Whether sensors are available */
  available: boolean;
  /** Whether AR mode is active */
  active: boolean;
};

const INITIAL: DeviceOrientation = {
  heading: 0,
  pitch: 0,
  isPointingAtSky: false,
  available: false,
  active: false,
};

// Low-pass filter for smoothing sensor data
function lowPass(prev: number, next: number, alpha: number): number {
  return prev + alpha * (next - prev);
}

// Normalize angle to 0-360
function normalizeAngle(angle: number): number {
  return ((angle % 360) + 360) % 360;
}

export function useDeviceSensors() {
  const [orientation, setOrientation] = useState<DeviceOrientation>(INITIAL);
  const [arActive, setArActive] = useState(false);
  const headingRef = useRef(0);
  const pitchRef = useRef(0);
  const availableRef = useRef(false);

  useEffect(() => {
    if (Platform.OS === "web" || !Magnetometer || !Accelerometer) return;

    async function setup() {
      const [magAvail, accAvail] = await Promise.all([
        Magnetometer.isAvailableAsync().catch(() => false),
        Accelerometer.isAvailableAsync().catch(() => false),
      ]);

      availableRef.current = magAvail && accAvail;

      if (!magAvail || !accAvail) {
        setOrientation((prev) => ({ ...prev, available: false }));
        return;
      }

      setOrientation((prev) => ({ ...prev, available: true }));
    }

    setup();
  }, []);

  // Start/stop sensor subscriptions based on AR mode
  useEffect(() => {
    if (Platform.OS === "web" || !arActive || !Magnetometer || !Accelerometer) {
      setOrientation((prev) => ({ ...prev, active: false }));
      return;
    }

    Magnetometer.setUpdateInterval(100);
    Accelerometer.setUpdateInterval(100);

    const magSub = Magnetometer.addListener((data: { x: number; y: number; z: number }) => {
      // Calculate compass heading from magnetometer
      // atan2(y, x) gives angle from magnetic north
      let angle = Math.atan2(data.y, data.x) * (180 / Math.PI);
      angle = normalizeAngle(90 - angle); // Convert to compass bearing
      headingRef.current = lowPass(headingRef.current, angle, 0.15);
    });

    const accSub = Accelerometer.addListener((data: { x: number; y: number; z: number }) => {
      // Calculate pitch from accelerometer
      // When phone points straight up: z ≈ 0, y ≈ -1
      // When phone is flat: z ≈ -1, y ≈ 0
      const pitch = Math.atan2(-data.y, -data.z) * (180 / Math.PI);
      pitchRef.current = lowPass(pitchRef.current, pitch, 0.15);
    });

    // Update state at 10Hz
    const interval = setInterval(() => {
      const heading = normalizeAngle(headingRef.current);
      const pitch = pitchRef.current;
      const isPointingAtSky = pitch < -20; // Tilted more than 20° upward

      setOrientation({
        heading,
        pitch,
        isPointingAtSky,
        available: true,
        active: true,
      });
    }, 100);

    return () => {
      magSub.remove();
      accSub.remove();
      clearInterval(interval);
    };
  }, [arActive]);

  const toggleAr = () => setArActive((prev) => !prev);

  return {
    orientation,
    arActive,
    toggleAr,
    setArActive,
  };
}
