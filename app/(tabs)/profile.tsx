import { useState } from "react";
import {
  Keyboard,
  Pressable,
  RefreshControl,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { AuthScreen } from "@/components/AuthScreen";
import { AuthUpgradeCard } from "@/components/AuthUpgradeCard";
import { SectionErrorBoundary } from "@/components/SectionErrorBoundary";
import { ProfileCard } from "@/components/sections/ProfileCard";
import { SettingsScreen } from "@/components/SettingsScreen";
import { useAppState } from "@/hooks/useAppState";
import { useAuth } from "@/providers/AuthProvider";
import { StreakData } from "@/services/streakService";
import { colors, fontSize, radius, spacing } from "@/theme/colors";

export default function ProfileScreen() {
  const app = useAppState();
  const { user, isFirebase, signOut } = useAuth();
  const [showSettings, setShowSettings] = useState(false);
  const [showAuth, setShowAuth] = useState<"signIn" | "createAccount" | null>(null);

  if (showAuth) {
    return (
      <SafeAreaView style={styles.safe}>
        <AuthScreen
          initialMode={showAuth}
          onClose={() => setShowAuth(null)}
        />
      </SafeAreaView>
    );
  }

  if (showSettings) {
    return (
      <SafeAreaView style={styles.safe}>
        <SettingsScreen
          onClose={() => setShowSettings(false)}
          voiceGuideEnabled={app.voiceGuideEnabled}
          setVoiceGuideEnabled={app.setVoiceGuideEnabled}
        />
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.safe} edges={["top"]}>
      <ScrollView
        contentContainerStyle={styles.content}
        showsVerticalScrollIndicator={false}
        keyboardShouldPersistTaps="handled"
        onScrollBeginDrag={Keyboard.dismiss}
        refreshControl={<RefreshControl refreshing={app.refreshing} onRefresh={app.handleRefresh} tintColor={colors.accent} />}
      >
        <SectionErrorBoundary section="Profile">
          <ProfileCard onStatus={app.setStatusMessage} />
        </SectionErrorBoundary>

        {/* Streak & Level Card */}
        {app.streak && <StreakCard streak={app.streak} />}

        {/* Quick Stats Summary */}
        <View style={styles.statsRow}>
          <View style={styles.statBox}>
            <Text style={styles.statNumber}>{app.userProfile?.planetsDiscovered.length ?? 0}</Text>
            <Text style={styles.statLabel}>Planets Found</Text>
          </View>
          <View style={styles.statBox}>
            <Text style={[styles.statNumber, { color: colors.accentWarm }]}>{app.userProfile?.totalStarsViewed ?? 0}</Text>
            <Text style={styles.statLabel}>Stars Viewed</Text>
          </View>
          <View style={styles.statBox}>
            <Text style={[styles.statNumber, { color: colors.accentInfo }]}>{app.challengeProgress.completedIds.length}</Text>
            <Text style={styles.statLabel}>Challenges</Text>
          </View>
        </View>

        {/* Auth section */}
        {isFirebase && user?.isAnonymous ? (
          <AuthUpgradeCard onOpenAuth={(mode) => setShowAuth(mode)} />
        ) : null}

        {/* Share Button */}
        <Pressable style={({ pressed }) => [styles.shareBtn, pressed && { opacity: 0.85 }]} onPress={app.handleShare}>
          <Text style={styles.shareBtnText}>{"\u{1F4E4}"} Share SkySync</Text>
        </Pressable>

        <Pressable style={({ pressed }) => [styles.settingsCard, pressed && { opacity: 0.85 }]} onPress={() => setShowSettings(true)}>
          <Text style={styles.settingsCardText}>{"\u2699"} Open Settings</Text>
        </Pressable>

        {/* Sign Out (only for authenticated non-anonymous users) */}
        {isFirebase && user && !user.isAnonymous ? (
          <Pressable
            style={({ pressed }) => [styles.signOutBtn, pressed && { opacity: 0.85 }]}
            onPress={signOut}
          >
            <Text style={styles.signOutBtnText}>Sign Out</Text>
          </Pressable>
        ) : null}
      </ScrollView>
    </SafeAreaView>
  );
}

function StreakCard({ streak }: { streak: StreakData }) {
  const totalXpForLevel = Math.floor(100 * (1 + (streak.level - 1) * 0.5));
  const xpProgress = totalXpForLevel > 0 ? Math.max(5, Math.min(100, ((totalXpForLevel - streak.xpToNextLevel) / totalXpForLevel) * 100)) : 100;
  const widthPercent = `${Math.round(xpProgress)}%`;

  return (
    <View style={styles.card}>
      <Text style={styles.streakTitle}>Your Progress</Text>
      <View style={styles.streakGrid}>
        <View style={styles.streakItem}>
          <Text style={styles.streakValue}>{streak.currentStreak}</Text>
          <Text style={styles.streakLabel}>Current Streak</Text>
        </View>
        <View style={styles.streakItem}>
          <Text style={[styles.streakValue, { color: colors.accentWarm }]}>{streak.longestStreak}</Text>
          <Text style={styles.streakLabel}>Longest Streak</Text>
        </View>
        <View style={styles.streakItem}>
          <Text style={[styles.streakValue, { color: colors.accentInfo }]}>{streak.level}</Text>
          <Text style={styles.streakLabel}>Level</Text>
        </View>
        <View style={styles.streakItem}>
          <Text style={[styles.streakValue, { color: colors.accentSuccess }]}>{streak.totalDaysActive}</Text>
          <Text style={styles.streakLabel}>Days Active</Text>
        </View>
      </View>
      <View style={styles.xpBar}>
        <View style={[styles.xpFill, { width: widthPercent as `${number}%` }]} />
      </View>
      <Text style={styles.xpLabel}>{streak.xpToNextLevel} XP to Level {streak.level + 1}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: colors.bg },
  content: { padding: spacing.lg, paddingBottom: 16, gap: 14 },
  card: { borderRadius: radius.xl, padding: spacing.lg, backgroundColor: colors.card, borderWidth: 1, borderColor: colors.border, shadowColor: "#000", shadowOffset: { width: 0, height: 4 }, shadowOpacity: 0.3, shadowRadius: 12, elevation: 6 },
  statsRow: { flexDirection: "row", gap: 10 },
  statBox: { flex: 1, borderRadius: radius.lg, padding: 16, backgroundColor: colors.card, borderWidth: 1, borderColor: colors.border, alignItems: "center", gap: 4 },
  statNumber: { color: colors.accent, fontSize: fontSize.xl, fontWeight: "800" },
  statLabel: { color: colors.textDim, fontSize: fontSize.xs },
  shareBtn: { borderRadius: radius.xl, padding: 16, backgroundColor: colors.accent, alignItems: "center" },
  shareBtnText: { color: colors.onAccent, fontWeight: "800", fontSize: fontSize.base },
  settingsCard: { borderRadius: radius.xl, padding: 16, backgroundColor: colors.card, borderWidth: 1, borderColor: colors.border, alignItems: "center" },
  settingsCardText: { color: colors.text, fontWeight: "700", fontSize: fontSize.base },
  // Streak
  streakTitle: { color: colors.text, fontSize: fontSize.md, fontWeight: "800", marginBottom: 12 },
  streakGrid: { flexDirection: "row", flexWrap: "wrap", gap: 8 },
  streakItem: { flex: 1, minWidth: "42%", alignItems: "center", padding: 12, borderRadius: radius.md, backgroundColor: "rgba(255,255,255,0.03)" },
  streakValue: { color: colors.accent, fontSize: fontSize.xl, fontWeight: "800" },
  streakLabel: { color: colors.textDim, fontSize: fontSize.xs, marginTop: 4 },
  xpBar: { height: 6, borderRadius: radius.pill, backgroundColor: "rgba(255,255,255,0.06)", marginTop: 16, overflow: "hidden" },
  xpFill: { height: "100%", borderRadius: radius.pill, backgroundColor: colors.accent },
  xpLabel: { color: colors.textDim, fontSize: fontSize.xs, marginTop: 6, textAlign: "center" },
  signOutBtn: { borderRadius: radius.xl, padding: 16, backgroundColor: colors.bgRaised, borderWidth: 1, borderColor: "rgba(255,111,97,0.25)", alignItems: "center" },
  signOutBtnText: { color: colors.accentDanger, fontWeight: "700", fontSize: fontSize.base },
});
