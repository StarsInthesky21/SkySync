jest.mock("@react-native-async-storage/async-storage", () => {
  const mockStore = new Map();
  return {
    __esModule: true,
    default: {
      getItem: jest.fn((key) => Promise.resolve(mockStore.get(key) ?? null)),
      setItem: jest.fn((key, value) => {
        mockStore.set(key, String(value));
        return Promise.resolve();
      }),
      removeItem: jest.fn((key) => {
        mockStore.delete(key);
        return Promise.resolve();
      }),
      clear: jest.fn(() => {
        mockStore.clear();
        return Promise.resolve();
      }),
      multiGet: jest.fn((keys) => Promise.resolve(keys.map((k) => [k, mockStore.get(k) ?? null]))),
      multiSet: jest.fn((pairs) => {
        for (const [k, v] of pairs) mockStore.set(k, String(v));
        return Promise.resolve();
      }),
      getAllKeys: jest.fn(() => Promise.resolve(Array.from(mockStore.keys()))),
    },
  };
});

jest.mock("expo-haptics", () => ({
  impactAsync: jest.fn(),
  ImpactFeedbackStyle: { Light: "light", Medium: "medium", Heavy: "heavy" },
}));

jest.mock("expo-speech", () => ({
  speak: jest.fn(),
  stop: jest.fn(),
}));

jest.mock("expo-notifications", () => ({
  setNotificationHandler: jest.fn(),
  scheduleNotificationAsync: jest.fn(() => Promise.resolve("id")),
  cancelScheduledNotificationAsync: jest.fn(),
  addNotificationReceivedListener: jest.fn(() => ({ remove: jest.fn() })),
  getPermissionsAsync: jest.fn(() => Promise.resolve({ granted: true })),
  requestPermissionsAsync: jest.fn(() => Promise.resolve({ granted: true })),
  getExpoPushTokenAsync: jest.fn(() => Promise.resolve({ data: "mock-token" })),
}));

jest.mock("expo-sensors", () => ({
  Magnetometer: {
    isAvailableAsync: jest.fn(() => Promise.resolve(false)),
    setUpdateInterval: jest.fn(),
    addListener: jest.fn(() => ({ remove: jest.fn() })),
  },
  Accelerometer: {
    isAvailableAsync: jest.fn(() => Promise.resolve(false)),
    setUpdateInterval: jest.fn(),
    addListener: jest.fn(() => ({ remove: jest.fn() })),
  },
  DeviceMotion: {
    isAvailableAsync: jest.fn(() => Promise.resolve(false)),
    setUpdateInterval: jest.fn(),
    addListener: jest.fn(() => ({ remove: jest.fn() })),
  },
}));

jest.mock("expo-gl", () => ({
  GLView: () => null,
}));

jest.mock("expo-camera", () => ({
  CameraView: () => null,
  Camera: {
    requestCameraPermissionsAsync: jest.fn(() => Promise.resolve({ granted: false })),
  },
  requestCameraPermissionsAsync: jest.fn(() => Promise.resolve({ granted: false })),
}));

// Silence noisy logs during tests
const originalWarn = console.warn;
console.warn = (...args) => {
  const msg = String(args[0] ?? "");
  if (msg.includes("deprecated") || msg.includes("Warning: An update")) return;
  originalWarn(...args);
};
