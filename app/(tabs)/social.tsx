import {
  Keyboard,
  RefreshControl,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { SectionErrorBoundary } from "@/components/SectionErrorBoundary";
import { SectionHeader } from "@/components/sections/SectionHeader";
import { RoomSection } from "@/components/sections/RoomSection";
import { VoiceLounge } from "@/components/sections/VoiceLounge";
import { ChatSection } from "@/components/sections/ChatSection";
import { useAppState } from "@/hooks/useAppState";
import { colors, fontSize, radius, spacing } from "@/theme/colors";

export default function SocialScreen() {
  const app = useAppState();

  return (
    <SafeAreaView style={styles.safe} edges={["top"]}>
      <ScrollView
        contentContainerStyle={styles.content}
        showsVerticalScrollIndicator={false}
        keyboardShouldPersistTaps="handled"
        onScrollBeginDrag={Keyboard.dismiss}
        refreshControl={<RefreshControl refreshing={app.refreshing} onRefresh={app.handleRefresh} tintColor={colors.accent} />}
      >
        <View style={styles.tabHeader}>
          <Text style={styles.tabHeaderIcon}>{"\u{1F4AC}"}</Text>
          <Text style={styles.tabHeaderTitle}>Social</Text>
          <Text style={styles.tabHeaderSub}>Stargaze with friends in real-time</Text>
        </View>

        <SectionErrorBoundary section="Rooms">
          <RoomSection onStatus={app.setStatusMessage} />
        </SectionErrorBoundary>

        <SectionHeader title="Voice Lounge" subtitle="Coordinate shared observing sessions" />
        <SectionErrorBoundary section="Voice Lounge">
          <VoiceLounge onStatus={app.setStatusMessage} />
        </SectionErrorBoundary>

        <SectionHeader title="Room Chat" />
        <SectionErrorBoundary section="Room Chat">
          {app.roomChat.length === 0 ? (
            <View style={styles.emptyState}>
              <Text style={styles.emptyIcon}>{"\u{1F4AC}"}</Text>
              <Text style={styles.emptyTitle}>No room messages yet</Text>
              <Text style={styles.emptyBody}>Join or create a Sky Room to start chatting with fellow stargazers.</Text>
            </View>
          ) : (
            <ChatSection title="Room Chat" messages={app.roomChat} currentUsername={app.username} onSend={app.handleSendRoom} placeholder="Message room..." />
          )}
        </SectionErrorBoundary>

        <SectionHeader title="Global Chat" />
        <SectionErrorBoundary section="Global Chat">
          {app.globalChat.length === 0 ? (
            <View style={styles.emptyState}>
              <Text style={styles.emptyIcon}>{"\u{1F30D}"}</Text>
              <Text style={styles.emptyTitle}>Global chat is quiet</Text>
              <Text style={styles.emptyBody}>Be the first to say hello to stargazers around the world!</Text>
            </View>
          ) : (
            <ChatSection title="Global Chat" messages={app.globalChat} currentUsername={app.username} onSend={app.handleSendGlobal} placeholder="Say something..." />
          )}
        </SectionErrorBoundary>
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: colors.bg },
  content: { padding: spacing.lg, paddingBottom: 16, gap: 14 },
  tabHeader: { alignItems: "center", paddingVertical: 8, gap: 4 },
  tabHeaderIcon: { fontSize: 32 },
  tabHeaderTitle: { color: colors.text, fontSize: fontSize.xl, fontWeight: "800" },
  tabHeaderSub: { color: colors.textDim, fontSize: fontSize.sm, textAlign: "center" },
  emptyState: { borderRadius: radius.xl, padding: spacing.xl, backgroundColor: colors.card, borderWidth: 1, borderColor: colors.border, alignItems: "center", gap: 8 },
  emptyIcon: { fontSize: 36, marginBottom: 4 },
  emptyTitle: { color: colors.text, fontSize: fontSize.base, fontWeight: "800" },
  emptyBody: { color: colors.textDim, fontSize: fontSize.sm, textAlign: "center", lineHeight: 20, maxWidth: 280 },
});
