import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import {
  ActivityIndicator,
  Animated,
  Easing,
  FlatList,
  Keyboard,
  KeyboardAvoidingView,
  Modal,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
} from "react-native";
import * as Speech from "expo-speech";
import { SafeAreaView } from "react-native-safe-area-context";
import { SectionErrorBoundary } from "@/components/SectionErrorBoundary";
import { ObjectPreview3D } from "@/components/sky/ObjectPreview3D";
import { SkyView } from "@/components/sky/SkyView";
import { StoryPlayer } from "@/components/sky/StoryPlayer";
import { SectionHeader } from "@/components/sections/SectionHeader";
import { ProfileCard } from "@/components/sections/ProfileCard";
import { TimeControls } from "@/components/sections/TimeControls";
import { BadgesAndChallenges } from "@/components/sections/BadgesAndChallenges";
import { RoomSection } from "@/components/sections/RoomSection";
import { DrawConstellations } from "@/components/sections/DrawConstellations";
import { ChatSection } from "@/components/sections/ChatSection";
import { VoiceLounge } from "@/components/sections/VoiceLounge";
import { useSelectedObjectDetails, useSkySync } from "@/providers/SkySyncProvider";
import { useNetworkStatus } from "@/hooks/useNetworkStatus";
import { colors, fontSize, radius, spacing } from "@/theme/colors";
import { Viewpoint, GuidedTarget } from "@/types/sky";

export function SkySyncHomeScreen() {
  const {
    objects, segments, customSegments, draftSegments, visibleTonight, guidedTargets,
    dailyChallenges, currentRoom, roomChat, globalChat,
    selectedDate, liveMode, rotation, zoom, viewpoint, highlightedIds,
    selectedObjectNotes, availableViewpoints, isLoading, userProfile, challengeProgress,
    setRotation, setZoom, setViewpoint, selectObject, focusObject, toggleHighlight,
    addNoteToSelectedObject, sendRoomMessage, sendGlobalMessage, addStarToDraft,
    completeChallenge,
  } = useSkySync();
  const { object: selectedObject, constellationName, story } = useSelectedObjectDetails();
  const network = useNetworkStatus();

  const [voiceGuideEnabled, setVoiceGuideEnabled] = useState(true);
  const [statusMessage, setStatusMessage] = useState("Live sky ready");
  const [drawModeEnabled, setDrawModeEnabled] = useState(false);
  const [noteInput, setNoteInput] = useState("");

  const username = userProfile?.username ?? "Stargazer";

  // Loading animation
  const loadingPulse = useRef(new Animated.Value(0.6)).current;
  useEffect(() => {
    if (!isLoading) return;
    const anim = Animated.loop(
      Animated.sequence([
        Animated.timing(loadingPulse, { toValue: 1, duration: 1200, easing: Easing.inOut(Easing.ease), useNativeDriver: true }),
        Animated.timing(loadingPulse, { toValue: 0.6, duration: 1200, easing: Easing.inOut(Easing.ease), useNativeDriver: true }),
      ]),
    );
    anim.start();
    return () => anim.stop();
  }, [isLoading, loadingPulse]);

  const visibleText = useMemo(() => visibleTonight.map((o) => o.name).join(", "), [visibleTonight]);

  const formatDate = (d: Date) => d.toISOString().slice(0, 10);
  const formatTime = (d: Date) => d.toISOString().slice(11, 16);

  // Voice guide
  useEffect(() => {
    if (!voiceGuideEnabled || !selectedObject) return;
    Speech.stop();
    Speech.speak(
      `${selectedObject.name}. ${selectedObject.distanceFromEarth} from Earth. ${selectedObject.mythologyStory}. ${selectedObject.scientificFacts[0]}`,
      { rate: 0.95, pitch: 1.0 },
    );
    return () => { Speech.stop(); };
  }, [selectedObject?.id, voiceGuideEnabled]);

  // Challenge auto-completion
  const challengeRef = useRef(challengeProgress);
  challengeRef.current = challengeProgress;

  useEffect(() => {
    if (!selectedObject) return;
    for (const c of dailyChallenges) {
      if (challengeRef.current.completedIds.includes(c.id)) continue;
      if (c.objectId === selectedObject.id && (c.type === "discover" || c.type === "track")) {
        completeChallenge(c.id);
        setStatusMessage(`Challenge completed: ${c.title} (${c.reward})`);
      }
    }
  }, [selectedObject?.id, completeChallenge]);

  useEffect(() => {
    if (!story || !selectedObject) return;
    for (const c of dailyChallenges) {
      if (challengeRef.current.completedIds.includes(c.id)) continue;
      if (c.type === "story" && c.objectId === selectedObject.id) {
        completeChallenge(c.id);
        setStatusMessage(`Challenge completed: ${c.title} (${c.reward})`);
      }
    }
  }, [story?.id, selectedObject?.id, completeChallenge]);

  const handleSelectObject = useCallback((objectId: string) => {
    if (drawModeEnabled) {
      addStarToDraft(objectId);
      setStatusMessage(`Added star to draft`);
      return;
    }
    selectObject(objectId);
  }, [drawModeEnabled, addStarToDraft, selectObject]);

  const handleAddNote = useCallback(() => {
    if (!noteInput.trim()) return;
    addNoteToSelectedObject(noteInput);
    setNoteInput("");
    setStatusMessage("Note saved");
  }, [noteInput, addNoteToSelectedObject]);

  const handleSendRoom = useCallback((text: string) => sendRoomMessage(text), [sendRoomMessage]);
  const handleSendGlobal = useCallback((text: string) => sendGlobalMessage(text), [sendGlobalMessage]);

  // Guided targets render
  const renderGuided = useCallback(({ item }: { item: GuidedTarget }) => (
    <Pressable
      style={({ pressed }) => [styles.listItem, pressed && styles.listItemPressed]}
      onPress={() => { focusObject(item.objectId); setStatusMessage(`Centered on ${item.title}`); }}
      accessibilityRole="button"
    >
      <Text style={styles.listTitle}>{item.title}</Text>
      <Text style={styles.listBody}>{item.subtitle}</Text>
    </Pressable>
  ), [focusObject]);

  if (isLoading) {
    return (
      <SafeAreaView style={styles.safeArea}>
        <View style={styles.loadingContainer}>
          <Animated.View style={{ opacity: loadingPulse }}>
            <Text style={styles.loadingBrand}>SkySync</Text>
          </Animated.View>
          <ActivityIndicator size="large" color={colors.accent} />
          <Text style={styles.loadingSubtext}>Mapping the night sky</Text>
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.safeArea}>
      <ScrollView contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}
        keyboardShouldPersistTaps="handled" onScrollBeginDrag={Keyboard.dismiss}>

        {!network.isConnected && (
          <View style={styles.offlineBanner} accessibilityRole="alert">
            <Text style={styles.offlineText}>Offline mode</Text>
          </View>
        )}

        {/* Hero */}
        <View style={styles.hero} accessibilityRole="header">
          <Text style={styles.brand}>SkySync</Text>
          <Text style={styles.heroTitle}>Explore the night sky together</Text>
          <Text style={styles.heroSub}>Visible tonight: {visibleText || "Jupiter, Venus, ISS, Sirius"}</Text>
          <View style={styles.pillRow}>
            <View style={styles.pill}><Text style={styles.pillText}>{currentRoom?.roomCode ?? "SOLO"}</Text></View>
            <View style={[styles.pill, liveMode && styles.pillLive]}><Text style={styles.pillText}>{liveMode ? "LIVE" : "TIME TRAVEL"}</Text></View>
          </View>
        </View>

        <SectionErrorBoundary section="Profile"><ProfileCard onStatus={setStatusMessage} /></SectionErrorBoundary>

        {/* Viewpoints */}
        <View style={styles.chipRow} accessibilityRole="radiogroup">
          {availableViewpoints.map((item) => (
            <Pressable key={item.id} onPress={() => { setViewpoint(item.id as Viewpoint); setStatusMessage(`Viewing from ${item.label}`); }}
              style={({ pressed }) => [styles.chip, viewpoint === item.id && styles.chipActive, pressed && styles.chipPressed]}
              accessibilityRole="radio" accessibilityState={{ selected: viewpoint === item.id }}>
              <Text style={[styles.chipText, viewpoint === item.id && styles.chipTextActive]}>{item.label}</Text>
            </Pressable>
          ))}
        </View>

        {/* Sky View */}
        <SectionErrorBoundary section="Sky Viewer">
          <SkyView objects={objects} segments={segments} customSegments={customSegments} draftSegments={draftSegments}
            selectedObjectId={selectedObject?.id} highlightedIds={highlightedIds} roomCode={currentRoom?.roomCode}
            liveMode={liveMode} viewpointLabel={viewpoint.toUpperCase()} dateLabel={`${formatDate(selectedDate)} ${formatTime(selectedDate)}`}
            callActive={false} rotation={rotation} zoom={zoom} onSelectObject={handleSelectObject}
            onRotate={setRotation} onZoom={setZoom} />
        </SectionErrorBoundary>

        {/* Status */}
        <View style={styles.statusBar}><Text style={styles.statusText}>{statusMessage}</Text></View>

        <SectionHeader title="Time Controls" subtitle="Travel through history or return to now" />
        <SectionErrorBoundary section="Time Controls">
          <TimeControls voiceGuideEnabled={voiceGuideEnabled} setVoiceGuideEnabled={setVoiceGuideEnabled} onStatus={setStatusMessage} />
        </SectionErrorBoundary>

        <SectionHeader title="Guided Mode" subtitle="Tap to center on recommended objects" />
        <SectionErrorBoundary section="Guided Mode">
          <View style={styles.card}>
            <FlatList data={guidedTargets} renderItem={renderGuided} keyExtractor={(i) => i.id} scrollEnabled={false} />
          </View>
        </SectionErrorBoundary>

        <SectionHeader title="Badges & Challenges" subtitle={`${challengeProgress.completedIds.length}/${dailyChallenges.length} done today`} />
        <SectionErrorBoundary section="Badges"><BadgesAndChallenges onStatus={setStatusMessage} /></SectionErrorBoundary>

        <SectionHeader title="Voice Lounge" subtitle="Talk with room participants in real-time" />
        <SectionErrorBoundary section="Voice Lounge"><VoiceLounge onStatus={setStatusMessage} /></SectionErrorBoundary>

        <SectionHeader title="Sky Rooms" subtitle="Stargaze with friends" />
        <SectionErrorBoundary section="Rooms"><RoomSection onStatus={setStatusMessage} /></SectionErrorBoundary>

        <SectionHeader title="Draw Constellations" subtitle="Connect stars to create patterns" />
        <SectionErrorBoundary section="Draw"><DrawConstellations drawModeEnabled={drawModeEnabled} setDrawModeEnabled={setDrawModeEnabled} onStatus={setStatusMessage} /></SectionErrorBoundary>

        <SectionHeader title="Room Chat" />
        <SectionErrorBoundary section="Room Chat">
          <ChatSection title="Room Chat" messages={roomChat} currentUsername={username} onSend={handleSendRoom} placeholder="Message room..." />
        </SectionErrorBoundary>

        <SectionHeader title="Global Chat" />
        <SectionErrorBoundary section="Global Chat">
          <ChatSection title="Global Chat" messages={globalChat} currentUsername={username} onSend={handleSendGlobal} placeholder="Say something..." />
        </SectionErrorBoundary>
      </ScrollView>

      {/* Object Detail Modal */}
      <Modal visible={Boolean(selectedObject)} transparent animationType="slide"
        onRequestClose={() => { Speech.stop(); selectObject(undefined); }} accessibilityViewIsModal>
        <KeyboardAvoidingView style={{ flex: 1 }} behavior={Platform.OS === "ios" ? "padding" : undefined}>
          <Pressable style={styles.backdrop} onPress={() => { Speech.stop(); selectObject(undefined); }}>
            <View style={styles.modalSheet}>
              <Pressable onPress={() => {}} style={{ flex: 1 }}>
                <ScrollView contentContainerStyle={styles.modalContent} showsVerticalScrollIndicator={false}>
                  <View style={styles.modalHandle} />
                  <Pressable style={({ pressed }) => [styles.closeBtn, pressed && { opacity: 0.7 }]}
                    onPress={() => { Speech.stop(); selectObject(undefined); }}>
                    <Text style={styles.closeBtnText}>Close</Text>
                  </Pressable>

                  <Text style={styles.modalTitle}>{selectedObject?.name}</Text>
                  <Text style={styles.modalMeta}>
                    {selectedObject?.kind}{constellationName ? ` | ${constellationName}` : ""}{selectedObject?.distanceFromEarth ? ` | ${selectedObject.distanceFromEarth}` : ""}
                  </Text>
                  <Text style={styles.modalBody}>{selectedObject?.description}</Text>

                  <ObjectPreview3D color={selectedObject?.color ?? colors.accent} title={selectedObject?.previewTitle}
                    description={selectedObject?.previewDescription} kind={selectedObject?.kind} />

                  <Text style={styles.modalSection}>Mythology</Text>
                  <Text style={styles.modalBody}>{selectedObject?.mythologyStory}</Text>

                  <Text style={styles.modalSection}>Scientific Facts</Text>
                  {selectedObject?.scientificFacts.map((f, i) => <Text key={`f-${i}`} style={styles.fact}>- {f}</Text>)}

                  {story && (<><Text style={styles.modalSection}>Animated Story</Text><StoryPlayer story={story} /></>)}

                  <Text style={styles.modalSection}>Shared Notes</Text>
                  {selectedObjectNotes.length === 0 && <Text style={styles.emptyText}>No notes yet</Text>}
                  {selectedObjectNotes.map((n) => (
                    <View key={n.id} style={styles.noteCard}>
                      <Text style={styles.noteAuthor}>{n.author}</Text>
                      <Text style={styles.noteText}>{n.text}</Text>
                    </View>
                  ))}

                  <TextInput value={noteInput} onChangeText={setNoteInput} style={styles.input} placeholder="Add a note..." placeholderTextColor={colors.textDim} maxLength={500} />

                  <View style={styles.btnRow}>
                    <Pressable style={({ pressed }) => [styles.secondaryBtn, pressed && styles.secondaryPressed]}
                      onPress={() => { if (selectedObject) toggleHighlight(selectedObject.id); }}>
                      <Text style={styles.secondaryText}>{selectedObject && highlightedIds.includes(selectedObject.id) ? "Unhighlight" : "Highlight"}</Text>
                    </Pressable>
                    <Pressable style={({ pressed }) => [styles.secondaryBtn, pressed && styles.secondaryPressed]}
                      onPress={() => { if (!selectedObject) return; Speech.stop(); Speech.speak(`${selectedObject.name}. ${selectedObject.distanceFromEarth}. ${selectedObject.scientificFacts.join(" ")}`, { rate: 0.95, pitch: 1.0 }); }}>
                      <Text style={styles.secondaryText}>Speak</Text>
                    </Pressable>
                  </View>
                  <View style={styles.btnRow}>
                    <Pressable style={({ pressed }) => [styles.secondaryBtn, pressed && styles.secondaryPressed]} onPress={handleAddNote}>
                      <Text style={styles.secondaryText}>Save Note</Text>
                    </Pressable>
                    <Pressable style={({ pressed }) => [styles.primaryBtn, pressed && styles.primaryPressed]}
                      onPress={() => { if (selectedObject) focusObject(selectedObject.id); selectObject(undefined); }}>
                      <Text style={styles.primaryText}>Zoom Focus</Text>
                    </Pressable>
                  </View>
                </ScrollView>
              </Pressable>
            </View>
          </Pressable>
        </KeyboardAvoidingView>
      </Modal>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeArea: { flex: 1, backgroundColor: colors.bg },
  content: { padding: spacing.lg, paddingBottom: 48, gap: 14 },
  loadingContainer: { flex: 1, justifyContent: "center", alignItems: "center", gap: 20 },
  loadingBrand: { color: colors.accent, fontSize: fontSize.hero, fontWeight: "800", letterSpacing: 2 },
  loadingSubtext: { color: colors.textDim, fontSize: fontSize.sm },
  offlineBanner: { borderRadius: radius.sm, padding: 8, backgroundColor: "rgba(255,111,97,0.12)", alignItems: "center" },
  offlineText: { color: colors.accentDanger, fontWeight: "700", fontSize: fontSize.xs },
  hero: { borderRadius: radius.xl, padding: spacing.xl, backgroundColor: colors.bgRaised, borderWidth: 1, borderColor: colors.border },
  brand: { color: colors.accent, fontSize: fontSize.sm, fontWeight: "800", letterSpacing: 2, textTransform: "uppercase" },
  heroTitle: { color: colors.text, fontSize: fontSize.xl, lineHeight: 30, fontWeight: "800", marginTop: 8 },
  heroSub: { color: colors.textMuted, marginTop: 8, lineHeight: 20, fontSize: fontSize.sm },
  pillRow: { flexDirection: "row", gap: 8, marginTop: 12 },
  pill: { borderRadius: radius.pill, paddingHorizontal: 12, paddingVertical: 6, backgroundColor: "rgba(255,255,255,0.06)" },
  pillLive: { backgroundColor: "rgba(115,251,211,0.12)" },
  pillText: { color: colors.text, fontWeight: "700", fontSize: fontSize.xs },
  chipRow: { flexDirection: "row", flexWrap: "wrap", gap: 8 },
  chip: { borderRadius: radius.pill, paddingHorizontal: 14, paddingVertical: 8, backgroundColor: colors.cardSoft },
  chipActive: { backgroundColor: colors.accent },
  chipPressed: { opacity: 0.7 },
  chipText: { color: colors.text, fontWeight: "700", fontSize: fontSize.sm },
  chipTextActive: { color: colors.onAccent },
  statusBar: { borderRadius: radius.md, padding: 10, backgroundColor: "rgba(115,251,211,0.06)", borderWidth: 1, borderColor: "rgba(115,251,211,0.1)" },
  statusText: { color: colors.accent, fontWeight: "700", fontSize: fontSize.sm },
  card: { borderRadius: radius.xl, padding: spacing.lg, backgroundColor: colors.card, borderWidth: 1, borderColor: colors.border, shadowColor: "#000", shadowOffset: { width: 0, height: 4 }, shadowOpacity: 0.3, shadowRadius: 12, elevation: 6 },
  listItem: { borderRadius: radius.lg, padding: 14, backgroundColor: colors.cardSoft, marginTop: 8 },
  listItemPressed: { backgroundColor: colors.pressedSecondary },
  listTitle: { color: colors.text, fontWeight: "700", fontSize: fontSize.sm },
  listBody: { color: colors.textDim, lineHeight: 19, marginTop: 4, fontSize: fontSize.xs },
  // Modal
  backdrop: { flex: 1, backgroundColor: "rgba(0,0,0,0.5)", justifyContent: "flex-end" },
  modalSheet: { maxHeight: "92%", backgroundColor: colors.card, borderTopLeftRadius: radius.xl, borderTopRightRadius: radius.xl, borderWidth: 1, borderColor: colors.border },
  modalContent: { padding: spacing.xl, paddingBottom: 40 },
  modalHandle: { width: 40, height: 4, borderRadius: 2, backgroundColor: "rgba(255,255,255,0.2)", alignSelf: "center", marginBottom: 12 },
  closeBtn: { alignSelf: "flex-end", borderRadius: radius.pill, paddingHorizontal: 14, paddingVertical: 6, backgroundColor: "rgba(255,255,255,0.06)", marginBottom: 8 },
  closeBtnText: { color: colors.textMuted, fontWeight: "700", fontSize: fontSize.xs },
  modalTitle: { color: colors.text, fontSize: fontSize.xl, fontWeight: "800" },
  modalMeta: { color: colors.accentWarm, marginTop: 6, textTransform: "capitalize", fontSize: fontSize.sm },
  modalBody: { color: colors.textMuted, lineHeight: 22, marginTop: 10, fontSize: fontSize.sm },
  modalSection: { color: colors.text, fontWeight: "800", marginTop: 18, fontSize: fontSize.base },
  fact: { color: colors.textMuted, marginTop: 6, lineHeight: 20, fontSize: fontSize.sm },
  noteCard: { borderRadius: radius.md, padding: 10, backgroundColor: "rgba(255,255,255,0.04)", marginTop: 8, borderLeftWidth: 3, borderLeftColor: colors.accentWarm },
  noteAuthor: { color: colors.accentWarm, fontWeight: "700", fontSize: fontSize.xs },
  noteText: { color: colors.text, marginTop: 3, lineHeight: 19, fontSize: fontSize.sm },
  emptyText: { color: colors.textDim, fontStyle: "italic", fontSize: fontSize.xs, marginTop: 4 },
  input: { borderRadius: radius.md, backgroundColor: "rgba(255,255,255,0.03)", borderWidth: 1, borderColor: colors.border, paddingHorizontal: 14, paddingVertical: 11, color: colors.text, fontSize: fontSize.sm, marginTop: 8 },
  btnRow: { flexDirection: "row", gap: 8, marginTop: 10 },
  primaryBtn: { flex: 1, borderRadius: radius.md, paddingVertical: 12, backgroundColor: colors.accent, alignItems: "center" },
  primaryPressed: { backgroundColor: colors.pressedPrimary },
  primaryText: { color: colors.onAccent, fontWeight: "800", fontSize: fontSize.sm },
  secondaryBtn: { flex: 1, borderRadius: radius.md, paddingVertical: 12, backgroundColor: colors.cardSoft, alignItems: "center" },
  secondaryPressed: { backgroundColor: colors.pressedSecondary },
  secondaryText: { color: colors.text, fontWeight: "700", fontSize: fontSize.sm },
});
