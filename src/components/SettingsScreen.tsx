import { useCallback, useEffect, useState } from "react";
import { Alert, Modal, Pressable, ScrollView, StyleSheet, Switch, Text, View } from "react-native";
import { useSkySync } from "@/providers/SkySyncProvider";
import { useAuth } from "@/providers/AuthProvider";
import { useToast } from "@/components/Toast";
import { LEGAL_DOCUMENTS, LegalDocumentKey } from "@/content/legal";
import { storage } from "@/services/storage";
import { notificationService, NotificationPrefs } from "@/services/notifications";
import { analytics } from "@/services/analytics";
import { colors, fontSize, radius, spacing } from "@/theme/colors";

type Props = {
  onClose: () => void;
  voiceGuideEnabled: boolean;
  setVoiceGuideEnabled: (v: boolean) => void;
};

function SettingRow({ label, value, onToggle }: { label: string; value: boolean; onToggle: (v: boolean) => void }) {
  return (
    <View style={styles.settingRow}>
      <Text style={styles.settingLabel}>{label}</Text>
      <Switch
        value={value}
        onValueChange={onToggle}
        thumbColor={value ? colors.accent : "#aaa"}
        trackColor={{ false: "rgba(255,255,255,0.15)", true: colors.glow }}
      />
    </View>
  );
}

function SettingLink({ label, subtitle, onPress }: { label: string; subtitle?: string; onPress: () => void }) {
  return (
    <Pressable style={({ pressed }) => [styles.settingLink, pressed && { opacity: 0.7 }]} onPress={onPress}>
      <View style={{ flex: 1 }}>
        <Text style={styles.settingLabel}>{label}</Text>
        {subtitle && <Text style={styles.settingSub}>{subtitle}</Text>}
      </View>
      <Text style={styles.arrow}>{"\u203A"}</Text>
    </Pressable>
  );
}

export function SettingsScreen({ onClose, voiceGuideEnabled, setVoiceGuideEnabled }: Props) {
  const { userProfile } = useSkySync();
  const { user, isFirebase } = useAuth();
  const toast = useToast();
  const [notifPrefs, setNotifPrefs] = useState<NotificationPrefs | null>(null);
  const [activeLegalDoc, setActiveLegalDoc] = useState<LegalDocumentKey | null>(null);

  useEffect(() => {
    notificationService.getPrefs().then(setNotifPrefs);
  }, []);

  const legalDocument = activeLegalDoc ? LEGAL_DOCUMENTS[activeLegalDoc] : null;

  const updateNotifPref = useCallback((key: keyof NotificationPrefs, value: boolean) => {
    setNotifPrefs((prev) => {
      if (!prev) return prev;
      const updated = { ...prev, [key]: value };
      notificationService.savePrefs(updated);
      analytics.featureUsed(`notification_toggle_${key}`);
      return updated;
    });
  }, []);

  const handleClearData = useCallback(() => {
    Alert.alert(
      "Clear All Data",
      "This will reset your profile, badges, and challenge progress. This cannot be undone.",
      [
        { text: "Cancel", style: "cancel" },
        {
          text: "Clear",
          style: "destructive",
          onPress: async () => {
            await storage.clearAll();
            toast.show("All data cleared. Restart the app.", "warning");
          },
        },
      ],
    );
  }, [toast]);

  return (
    <>
      <ScrollView style={styles.container} contentContainerStyle={styles.content}>
        <View style={styles.header}>
          <Text style={styles.title}>Settings</Text>
          <Pressable style={({ pressed }) => [styles.closeBtn, pressed && { opacity: 0.7 }]} onPress={onClose}>
            <Text style={styles.closeBtnText}>Done</Text>
          </Pressable>
        </View>

        <View style={styles.card}>
          <Text style={styles.sectionTitle}>Profile</Text>
          <View style={styles.profileRow}>
            <View style={styles.avatar}>
              <Text style={styles.avatarText}>{(userProfile?.username ?? "S")[0].toUpperCase()}</Text>
            </View>
            <View style={{ flex: 1 }}>
              <Text style={styles.profileName}>{userProfile?.username ?? "Stargazer"}</Text>
              <Text style={styles.profileStat}>
                {userProfile?.xp ?? 0} XP | Joined {userProfile?.joinedAt ? new Date(userProfile.joinedAt).toLocaleDateString() : "today"}
              </Text>
            </View>
          </View>
          <View style={styles.statGrid}>
            <StatBox label="Planets" value={userProfile?.planetsDiscovered.length ?? 0} color={colors.accentWarm} />
            <StatBox label="Stars Viewed" value={userProfile?.totalStarsViewed ?? 0} color={colors.accentInfo} />
            <StatBox label="Satellites" value={userProfile?.satellitesTracked.length ?? 0} color={colors.accent} />
            <StatBox label="Challenges" value={userProfile?.challengesCompleted.length ?? 0} color={colors.accentSuccess} />
          </View>
        </View>

        <View style={styles.card}>
          <Text style={styles.sectionTitle}>Preferences</Text>
          <SettingRow label="Voice Guide" value={voiceGuideEnabled} onToggle={setVoiceGuideEnabled} />
        </View>

        {notifPrefs && (
          <View style={styles.card}>
            <Text style={styles.sectionTitle}>Notifications</Text>
            <SettingRow label="Streak Reminders" value={notifPrefs.streakReminders} onToggle={(v) => updateNotifPref("streakReminders", v)} />
            <SettingRow label="Astronomical Event Alerts" value={notifPrefs.eventAlerts} onToggle={(v) => updateNotifPref("eventAlerts", v)} />
            <SettingRow label="Challenge Reminders" value={notifPrefs.challengeReminders} onToggle={(v) => updateNotifPref("challengeReminders", v)} />
            <SettingRow label="Room Activity" value={notifPrefs.roomActivity} onToggle={(v) => updateNotifPref("roomActivity", v)} />
            <Text style={styles.settingSub}>Quiet hours: {notifPrefs.quietHoursStart}:00 - {notifPrefs.quietHoursEnd}:00</Text>
          </View>
        )}

        <View style={styles.card}>
          <Text style={styles.sectionTitle}>Account</Text>
          <Text style={styles.accountInfo}>
            {isFirebase ? `Firebase: ${user?.email ?? "Anonymous"}` : "Local mode (offline)"}
          </Text>
          <SettingLink label="Clear All Data" subtitle="Reset profile, badges, and progress" onPress={handleClearData} />
        </View>

        <View style={styles.card}>
          <Text style={styles.sectionTitle}>About</Text>
          <SettingLink label="Privacy Policy" subtitle="How we handle your data" onPress={() => setActiveLegalDoc("privacy")} />
          <SettingLink label="Terms of Service" subtitle="Rules for using SkySync" onPress={() => setActiveLegalDoc("terms")} />
          <SettingLink label="Rate SkySync" subtitle="Wire store review links before release" onPress={() => toast.show("Add your real App Store and Play Store review links before launch.", "info")} />
          <View style={styles.versionRow}>
            <Text style={styles.versionText}>SkySync v1.1.0</Text>
            <Text style={styles.versionSub}>Release candidate settings and legal docs are now available in-app.</Text>
          </View>
        </View>
      </ScrollView>

      <Modal visible={Boolean(legalDocument)} animationType="slide" presentationStyle="pageSheet" onRequestClose={() => setActiveLegalDoc(null)}>
        <View style={styles.legalScreen}>
          <View style={styles.header}>
            <View>
              <Text style={styles.title}>{legalDocument?.title}</Text>
              <Text style={styles.settingSub}>Last updated {legalDocument?.updated}</Text>
            </View>
            <Pressable style={({ pressed }) => [styles.closeBtn, pressed && { opacity: 0.7 }]} onPress={() => setActiveLegalDoc(null)}>
              <Text style={styles.closeBtnText}>Done</Text>
            </Pressable>
          </View>
          <ScrollView contentContainerStyle={styles.legalContent}>
            {legalDocument?.sections.map((section) => (
              <View key={section.heading} style={styles.legalSection}>
                <Text style={styles.legalHeading}>{section.heading}</Text>
                {section.body.map((paragraph, index) => (
                  <Text key={`${section.heading}-${index}`} style={styles.legalBody}>{paragraph}</Text>
                ))}
              </View>
            ))}
          </ScrollView>
        </View>
      </Modal>
    </>
  );
}

function StatBox({ label, value, color }: { label: string; value: number; color: string }) {
  return (
    <View style={styles.statBox}>
      <Text style={[styles.statValue, { color }]}>{value}</Text>
      <Text style={styles.statLabel}>{label}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.bg },
  content: { padding: spacing.lg, paddingBottom: 48, gap: 14 },
  header: { flexDirection: "row", justifyContent: "space-between", alignItems: "center", marginBottom: 8 },
  title: { color: colors.text, fontSize: fontSize.xl, fontWeight: "800" },
  closeBtn: { borderRadius: radius.pill, paddingHorizontal: 16, paddingVertical: 8, backgroundColor: colors.accent },
  closeBtnText: { color: colors.onAccent, fontWeight: "800", fontSize: fontSize.sm },
  card: {
    borderRadius: radius.xl, padding: spacing.lg, backgroundColor: colors.card,
    borderWidth: 1, borderColor: colors.border,
    shadowColor: "#000", shadowOffset: { width: 0, height: 4 }, shadowOpacity: 0.3, shadowRadius: 12, elevation: 6,
  },
  sectionTitle: { color: colors.text, fontSize: fontSize.md, fontWeight: "800", marginBottom: 12 },
  profileRow: { flexDirection: "row", alignItems: "center", gap: 12, marginBottom: 16 },
  avatar: { width: 52, height: 52, borderRadius: radius.pill, backgroundColor: colors.accent, alignItems: "center", justifyContent: "center" },
  avatarText: { color: colors.onAccent, fontSize: fontSize.lg, fontWeight: "800" },
  profileName: { color: colors.text, fontSize: fontSize.base, fontWeight: "800" },
  profileStat: { color: colors.textDim, fontSize: fontSize.xs, marginTop: 2 },
  statGrid: { flexDirection: "row", flexWrap: "wrap", gap: 8 },
  statBox: {
    flex: 1, minWidth: "45%", borderRadius: radius.md, padding: 12,
    backgroundColor: "rgba(255,255,255,0.03)", alignItems: "center",
  },
  statValue: { fontSize: fontSize.xl, fontWeight: "800" },
  statLabel: { color: colors.textDim, fontSize: fontSize.xs, marginTop: 4 },
  settingRow: {
    flexDirection: "row", justifyContent: "space-between", alignItems: "center",
    paddingVertical: 10, borderBottomWidth: 1, borderBottomColor: "rgba(255,255,255,0.04)",
  },
  settingLabel: { color: colors.text, fontSize: fontSize.sm, fontWeight: "600" },
  settingSub: { color: colors.textDim, fontSize: fontSize.xs, marginTop: 2 },
  settingLink: {
    flexDirection: "row", alignItems: "center", paddingVertical: 12,
    borderBottomWidth: 1, borderBottomColor: "rgba(255,255,255,0.04)",
  },
  arrow: { color: colors.textDim, fontSize: fontSize.xl },
  accountInfo: { color: colors.textDim, fontSize: fontSize.xs, marginBottom: 8 },
  versionRow: { alignItems: "center", paddingTop: 16 },
  versionText: { color: colors.textDim, fontSize: fontSize.sm, fontWeight: "700" },
  versionSub: { color: colors.textDim, fontSize: fontSize.xs, marginTop: 4, fontStyle: "italic" },
  legalScreen: { flex: 1, backgroundColor: colors.bg, padding: spacing.lg },
  legalContent: { paddingBottom: 32, gap: 18 },
  legalSection: { gap: 8 },
  legalHeading: { color: colors.text, fontSize: fontSize.md, fontWeight: "800" },
  legalBody: { color: colors.textMuted, fontSize: fontSize.sm, lineHeight: 21 },
});
