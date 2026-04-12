import { useEffect, useState } from "react";
import { Platform, StyleSheet, View } from "react-native";

let Camera: any = null;
let requestPermissionAsync: (() => Promise<{ granted: boolean }>) | null = null;
try {
  const mod = require("expo-camera");
  Camera = mod.CameraView ?? mod.Camera;
  requestPermissionAsync = async () => {
    if (mod.Camera?.requestCameraPermissionsAsync) {
      return mod.Camera.requestCameraPermissionsAsync();
    }
    if (mod.requestCameraPermissionsAsync) {
      return mod.requestCameraPermissionsAsync();
    }
    return { granted: false };
  };
} catch {
  Camera = null;
}

export function CameraBackground() {
  const [permitted, setPermitted] = useState<boolean | null>(null);

  useEffect(() => {
    if (!Camera || Platform.OS === "web") {
      setPermitted(false);
      return;
    }
    requestPermissionAsync?.()
      .then((res) => setPermitted(!!res.granted))
      .catch(() => setPermitted(false));
  }, []);

  if (!Camera || !permitted) {
    return <View style={styles.fallback} />;
  }

  return <Camera style={StyleSheet.absoluteFill} facing="back" />;
}

const styles = StyleSheet.create({
  fallback: { ...StyleSheet.absoluteFillObject, backgroundColor: "#000204" },
});
