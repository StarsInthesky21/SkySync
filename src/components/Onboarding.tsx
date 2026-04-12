import { useCallback, useEffect, useRef, useState } from "react";
import {
  Animated,
  Dimensions,
  Easing,
  FlatList,
  Platform,
  Pressable,
  StyleSheet,
  Text,
  TextInput,
  View,
  ViewToken,
} from "react-native";
// Dynamic imports to avoid crash if native modules aren't linked in debug APK
let Location: any = null;
let Haptics: any = null;
try { Location = require("expo-location"); } catch {}
try { Haptics = require("expo-haptics"); } catch {}
import { colors, fontSize, radius, spacing } from "@/theme/colors";
import { storage } from "@/services/storage";

const { width: SCREEN_WIDTH } = Dimensions.get("window");

type OnboardingStep = {
  id: string;
  icon: string;
  title: string;
  body: string;
  accent: string;
  interactive?: "username" | "location" | "interests";
};

const STEPS: OnboardingStep[] = [
  {
    id: "welcome",
    icon: "\u2728",
    title: "Welcome to SkySync",
    body: "Your personal gateway to the night sky. Explore stars, planets, satellites, and mythology stories \u2014 all in real time.",
    accent: colors.accent,
  },
  {
    id: "username",
    icon: "\u{1F464}",
    title: "What should we call you?",
    body: "Pick a stargazer name. You can always change it later.",
    accent: colors.accentInfo,
    interactive: "username",
  },
  {
    id: "location",
    icon: "\u{1F30D}",
    title: "Where are you stargazing?",
    body: "SkySync uses your location to show exactly what's visible in YOUR sky right now. We never share or store your exact location.",
    accent: colors.accentSuccess,
    interactive: "location",
  },
  {
    id: "interact",
    icon: "\u{1F30C}",
    title: "Interactive Sky Map",
    body: "Drag to rotate the sky, pinch to zoom. Tap any star or planet to discover its mythology, science, and distance from Earth.",
    accent: colors.accentInfo,
  },
  {
    id: "social",
    icon: "\u{1F91D}",
    title: "Stargaze Together",
    body: "Create Sky Rooms to share the sky view with friends. Chat, highlight objects, and draw your own constellations in real time.",
    accent: colors.accentWarm,
  },
  {
    id: "earn",
    icon: "\u{1F3C6}",
    title: "Earn Badges & XP",
    body: "Complete daily challenges, discover planets, trace constellations, and track satellites to level up your stargazer profile.",
    accent: colors.accentSuccess,
  },
  {
    id: "time",
    icon: "\u231A",
    title: "Travel Through Time",
    body: "See the sky from any date between 1800 and 2100. View from Earth, Mars, or the Moon. The universe is yours to explore.",
    accent: "#c084fc",
  },
];

type Props = {
  onComplete: () => void;
};

export function Onboarding({ onComplete }: Props) {
  const [currentIndex, setCurrentIndex] = useState(0);
  const [usernameInput, setUsernameInput] = useState("");
  const [locationGranted, setLocationGranted] = useState<boolean | null>(null);
  const flatListRef = useRef<FlatList>(null);
  const fadeAnim = useRef(new Animated.Value(0)).current;
  const slideAnim = useRef(new Animated.Value(30)).current;

  useEffect(() => {
    Animated.parallel([
      Animated.timing(fadeAnim, { toValue: 1, duration: 600, useNativeDriver: true }),
      Animated.timing(slideAnim, { toValue: 0, duration: 600, easing: Easing.out(Easing.cubic), useNativeDriver: true }),
    ]).start();
  }, [fadeAnim, slideAnim]);

  const onViewableItemsChanged = useCallback(({ viewableItems }: { viewableItems: ViewToken[] }) => {
    if (viewableItems.length > 0 && viewableItems[0].index != null) {
      setCurrentIndex(viewableItems[0].index);
    }
  }, []);

  const viewabilityConfig = useRef({ itemVisiblePercentThreshold: 50 }).current;

  const handleRequestLocation = useCallback(async () => {
    if (!Location) {
      // expo-location module not available on this device/build
      setLocationGranted(false);
      return;
    }
    try {
      const { status } = await Location.requestForegroundPermissionsAsync();
      const granted = status === "granted";
      setLocationGranted(granted);
      if (Platform.OS !== "web" && Haptics) {
        try {
          Haptics.notificationAsync(
            granted ? Haptics.NotificationFeedbackType.Success : Haptics.NotificationFeedbackType.Warning,
          );
        } catch {}
      }
      if (granted) {
        const loc = await Location.getCurrentPositionAsync({ accuracy: Location.Accuracy.Low });
        await storage.updateSettings({
          latitude: loc.coords.latitude,
          longitude: loc.coords.longitude,
        });
      }
    } catch {
      setLocationGranted(false);
    }
  }, []);

  const handleNext = useCallback(async () => {
    try { if (Platform.OS !== "web" && Haptics) Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light); } catch {}

    // Save username if on username step
    if (STEPS[currentIndex].interactive === "username" && usernameInput.trim()) {
      try {
        const profile = await storage.getUserProfile();
        await storage.saveUserProfile({ ...profile, username: usernameInput.trim().slice(0, 20) });
      } catch {}
    }

    if (currentIndex < STEPS.length - 1) {
      flatListRef.current?.scrollToIndex({ index: currentIndex + 1, animated: true });
    } else {
      try { if (Platform.OS !== "web" && Haptics) Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success); } catch {}
      onComplete();
    }
  }, [currentIndex, onComplete, usernameInput]);

  const isLast = currentIndex === STEPS.length - 1;
  const currentStep = STEPS[currentIndex];

  const renderItem = useCallback(({ item }: { item: OnboardingStep }) => (
    <View style={[styles.slide, { width: SCREEN_WIDTH }]}>
      <View style={[styles.iconContainer, { shadowColor: item.accent }]}>
        <Text style={styles.icon}>{item.icon}</Text>
      </View>
      <Text style={[styles.title, { color: item.accent }]}>{item.title}</Text>
      <Text style={styles.body}>{item.body}</Text>

      {/* Username input */}
      {item.interactive === "username" && (
        <View style={styles.interactiveContainer}>
          <TextInput
            style={styles.usernameInput}
            value={usernameInput}
            onChangeText={setUsernameInput}
            placeholder="e.g. StarExplorer"
            placeholderTextColor={colors.textDim}
            maxLength={20}
            autoCapitalize="none"
            autoCorrect={false}
          />
          {usernameInput.trim().length > 0 && (
            <Text style={styles.usernamePreview}>
              Hello, <Text style={{ color: colors.accent, fontWeight: "800" }}>{usernameInput.trim()}</Text>!
            </Text>
          )}
        </View>
      )}

      {/* Location permission */}
      {item.interactive === "location" && (
        <View style={styles.interactiveContainer}>
          {locationGranted === null ? (
            <Pressable
              style={({ pressed }) => [styles.locationBtn, pressed && { opacity: 0.85 }]}
              onPress={handleRequestLocation}
            >
              <Text style={styles.locationBtnText}>Enable Location</Text>
            </Pressable>
          ) : locationGranted ? (
            <View style={styles.locationStatus}>
              <Text style={styles.locationStatusIcon}>{"\u2705"}</Text>
              <Text style={styles.locationStatusText}>Location enabled! We'll show your personalized sky.</Text>
            </View>
          ) : (
            <View style={styles.locationStatus}>
              <Text style={styles.locationStatusText}>
                No worries! SkySync works great without location too. You can enable it later in Settings.
              </Text>
            </View>
          )}
        </View>
      )}
    </View>
  ), [usernameInput, locationGranted, handleRequestLocation]);

  return (
    <Animated.View style={[styles.container, { opacity: fadeAnim, transform: [{ translateY: slideAnim }] }]}>
      <FlatList
        ref={flatListRef}
        data={STEPS}
        renderItem={renderItem}
        keyExtractor={(item) => item.id}
        horizontal
        pagingEnabled
        showsHorizontalScrollIndicator={false}
        onViewableItemsChanged={onViewableItemsChanged}
        viewabilityConfig={viewabilityConfig}
        bounces={false}
      />

      {/* Dots */}
      <View style={styles.dotsRow}>
        {STEPS.map((step, i) => (
          <View
            key={step.id}
            style={[styles.dot, i === currentIndex && { backgroundColor: STEPS[currentIndex].accent, width: 24 }]}
          />
        ))}
      </View>

      {/* Buttons */}
      <View style={styles.buttonRow}>
        {!isLast && (
          <Pressable onPress={onComplete} style={styles.skipBtn}>
            <Text style={styles.skipText}>Skip</Text>
          </Pressable>
        )}
        <Pressable
          style={({ pressed }) => [styles.nextBtn, { backgroundColor: STEPS[currentIndex].accent }, pressed && { opacity: 0.85 }]}
          onPress={handleNext}
        >
          <Text style={styles.nextText}>{isLast ? "Get Started" : "Next"}</Text>
        </Pressable>
      </View>
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.bg,
    justifyContent: "center",
  },
  slide: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    paddingHorizontal: 40,
  },
  iconContainer: {
    width: 100,
    height: 100,
    borderRadius: radius.pill,
    backgroundColor: "rgba(255,255,255,0.04)",
    alignItems: "center",
    justifyContent: "center",
    marginBottom: 32,
    shadowOpacity: 0.6,
    shadowRadius: 30,
    elevation: 10,
  },
  icon: {
    fontSize: 48,
  },
  title: {
    fontSize: fontSize.xxl,
    fontWeight: "800",
    textAlign: "center",
    marginBottom: 16,
    letterSpacing: 0.5,
  },
  body: {
    color: colors.textMuted,
    fontSize: fontSize.base,
    textAlign: "center",
    lineHeight: 24,
    maxWidth: 320,
  },
  interactiveContainer: {
    width: "100%",
    maxWidth: 320,
    marginTop: 24,
    gap: 12,
  },
  usernameInput: {
    borderRadius: radius.md,
    backgroundColor: "rgba(255,255,255,0.06)",
    borderWidth: 1,
    borderColor: colors.border,
    paddingHorizontal: 16,
    paddingVertical: 14,
    color: colors.text,
    fontSize: fontSize.md,
    fontWeight: "700",
    textAlign: "center",
  },
  usernamePreview: {
    color: colors.textMuted,
    fontSize: fontSize.sm,
    textAlign: "center",
  },
  locationBtn: {
    borderRadius: radius.md,
    paddingVertical: 14,
    backgroundColor: colors.accentSuccess,
    alignItems: "center",
  },
  locationBtnText: {
    color: colors.onAccent,
    fontWeight: "800",
    fontSize: fontSize.base,
  },
  locationStatus: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    padding: 12,
    borderRadius: radius.md,
    backgroundColor: "rgba(255,255,255,0.04)",
  },
  locationStatusIcon: {
    fontSize: 20,
  },
  locationStatusText: {
    color: colors.textMuted,
    fontSize: fontSize.sm,
    lineHeight: 20,
    flex: 1,
  },
  dotsRow: {
    flexDirection: "row",
    justifyContent: "center",
    alignItems: "center",
    gap: 8,
    paddingVertical: 24,
  },
  dot: {
    width: 8,
    height: 8,
    borderRadius: radius.pill,
    backgroundColor: "rgba(255,255,255,0.15)",
  },
  buttonRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    paddingHorizontal: 32,
    paddingBottom: 48,
  },
  skipBtn: {
    paddingVertical: 12,
    paddingHorizontal: 20,
  },
  skipText: {
    color: colors.textDim,
    fontSize: fontSize.base,
    fontWeight: "600",
  },
  nextBtn: {
    flex: 1,
    marginLeft: 16,
    borderRadius: radius.md,
    paddingVertical: 16,
    alignItems: "center",
  },
  nextText: {
    color: colors.onAccent,
    fontSize: fontSize.base,
    fontWeight: "800",
  },
});
