import { useEffect, useMemo, useRef, useState } from "react";
import {
  ActivityIndicator,
  Animated,
  Easing,
  Keyboard,
  KeyboardAvoidingView,
  Modal,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  Switch,
  Text,
  TextInput,
  View,
} from "react-native";
import * as Speech from "expo-speech";
import Slider from "@react-native-community/slider";
import { SafeAreaView } from "react-native-safe-area-context";
import { ObjectPreview3D } from "@/components/sky/ObjectPreview3D";
import { SkyView } from "@/components/sky/SkyView";
import { StoryPlayer } from "@/components/sky/StoryPlayer";
import { useSelectedObjectDetails, useSkySync } from "@/providers/SkySyncProvider";
import { useNetworkStatus } from "@/hooks/useNetworkStatus";
import { colors, fontSize, radius, spacing } from "@/theme/colors";
import { Viewpoint } from "@/types/sky";

function formatDate(date: Date) {
  return date.toISOString().slice(0, 10);
}

function formatTime(date: Date) {
  return date.toISOString().slice(11, 16);
}

const DATE_REGEX = /^\d{4}-\d{2}-\d{2}$/;
const TIME_REGEX = /^\d{2}:\d{2}$/;

function parseDateTime(dateInput: string, timeInput: string) {
  if (!DATE_REGEX.test(dateInput) || !TIME_REGEX.test(timeInput)) {
    return null;
  }
  const parsed = new Date(`${dateInput}T${timeInput}:00.000Z`);
  if (Number.isNaN(parsed.getTime())) {
    return null;
  }
  return parsed;
}

function SectionHeader({ title, subtitle }: { title: string; subtitle?: string }) {
  return (
    <View style={styles.sectionHeader}>
      <Text style={styles.sectionHeaderTitle}>{title}</Text>
      {subtitle && <Text style={styles.sectionHeaderSub}>{subtitle}</Text>}
    </View>
  );
}

export function SkySyncHomeScreen() {
  const {
    objects, segments, customSegments, draftSegments, visibleTonight, guidedTargets,
    badges, dailyChallenges, rooms, currentRoom, roomChat, globalChat, participants,
    callActive, selectedDate, liveMode, rotation, zoom, viewpoint, highlightedIds,
    selectedObjectNotes, draftConstellationIds, availableViewpoints, isLoading,
    userProfile, challengeProgress, setRotation, setZoom, setSelectedDate, setLiveMode,
    setViewpoint, selectObject, focusObject, toggleHighlight, addNoteToSelectedObject,
    createRoom, joinRoom, sendRoomMessage, sendGlobalMessage, setCallActive,
    addStarToDraft, clearDraftConstellation, saveDraftConstellation, updateUsername,
    completeChallenge,
  } = useSkySync();
  const { object: selectedObject, constellationName, story } = useSelectedObjectDetails();
  const network = useNetworkStatus();

  const [voiceGuideEnabled, setVoiceGuideEnabled] = useState(true);
  const [statusMessage, setStatusMessage] = useState("Live sky ready");
  const [roomCodeInput, setRoomCodeInput] = useState("");
  const [roomNameInput, setRoomNameInput] = useState("Orbit Club");
  const [dateInput, setDateInput] = useState(formatDate(selectedDate));
  const [timeInput, setTimeInput] = useState(formatTime(selectedDate));
  const [noteInput, setNoteInput] = useState("");
  const [roomMessageInput, setRoomMessageInput] = useState("");
  const [globalMessageInput, setGlobalMessageInput] = useState("");
  const [drawModeEnabled, setDrawModeEnabled] = useState(false);
  const [draftTitleInput, setDraftTitleInput] = useState("Custom Pattern");
  const [usernameInput, setUsernameInput] = useState("");
  const [showProfileEditor, setShowProfileEditor] = useState(false);

  // Loading screen animation
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

  const roomChatScrollRef = useRef<ScrollView>(null);
  const globalChatScrollRef = useRef<ScrollView>(null);

  const visibleText = useMemo(
    () => visibleTonight.map((object) => object.name).join(", "),
    [visibleTonight],
  );

  useEffect(() => {
    if (userProfile) setUsernameInput(userProfile.username);
  }, [userProfile?.username]);

  useEffect(() => {
    setDateInput(formatDate(selectedDate));
    setTimeInput(formatTime(selectedDate));
  }, [selectedDate]);

  useEffect(() => {
    if (!voiceGuideEnabled || !selectedObject) return;
    const speech = [
      `${selectedObject.name}.`,
      `${selectedObject.distanceFromEarth} from Earth.`,
      selectedObject.mythologyStory,
      selectedObject.scientificFacts[0],
    ].join(" ");
    Speech.stop();
    Speech.speak(speech, { rate: 0.95, pitch: 1.0 });
    return () => { Speech.stop(); };
  }, [selectedObject?.id, voiceGuideEnabled]);

  const challengeProgressRef = useRef(challengeProgress);
  challengeProgressRef.current = challengeProgress;

  useEffect(() => {
    if (!selectedObject) return;
    const progress = challengeProgressRef.current;
    for (const challenge of dailyChallenges) {
      if (progress.completedIds.includes(challenge.id)) continue;
      if (challenge.objectId === selectedObject.id) {
        if (challenge.type === "discover" || challenge.type === "track") {
          completeChallenge(challenge.id);
          setStatusMessage(`Challenge completed: ${challenge.title} (${challenge.reward})`);
        }
      }
    }
  }, [selectedObject?.id, completeChallenge]);

  useEffect(() => {
    if (!story || !selectedObject) return;
    const progress = challengeProgressRef.current;
    for (const challenge of dailyChallenges) {
      if (progress.completedIds.includes(challenge.id)) continue;
      if (challenge.type === "story" && challenge.objectId === selectedObject.id) {
        completeChallenge(challenge.id);
        setStatusMessage(`Challenge completed: ${challenge.title} (${challenge.reward})`);
      }
    }
  }, [story?.id, selectedObject?.id, completeChallenge]);

  // Auto-scroll chat
  useEffect(() => {
    setTimeout(() => roomChatScrollRef.current?.scrollToEnd({ animated: true }), 100);
  }, [roomChat.length]);
  useEffect(() => {
    setTimeout(() => globalChatScrollRef.current?.scrollToEnd({ animated: true }), 100);
  }, [globalChat.length]);

  function handleSelectObject(objectId: string) {
    if (drawModeEnabled) {
      addStarToDraft(objectId);
      setStatusMessage(`Added ${objects.find((o) => o.id === objectId)?.name ?? objectId} to draft`);
      return;
    }
    selectObject(objectId);
    setStatusMessage(`Selected ${objects.find((o) => o.id === objectId)?.name ?? objectId}`);
  }

  function handleApplyDateTime() {
    const parsed = parseDateTime(dateInput.trim(), timeInput.trim());
    if (!parsed) { setStatusMessage("Invalid date or time format"); return; }
    setSelectedDate(parsed);
    setStatusMessage(`Time travel: ${dateInput} ${timeInput}`);
  }

  function handleJumpToYear(year: number) {
    const next = new Date(selectedDate);
    next.setUTCFullYear(year);
    setSelectedDate(next);
    setStatusMessage(`Jumped to ${year}`);
  }

  function handleNow() {
    setSelectedDate(new Date());
    setLiveMode(true);
    setStatusMessage("Returned to real-time sky");
  }

  function handleJoinRoom() {
    if (!roomCodeInput.trim()) { setStatusMessage("Please enter a room code"); return; }
    setStatusMessage(joinRoom(roomCodeInput.trim()));
  }

  function handleCreateRoom() {
    const code = createRoom(roomNameInput.trim() || "Orbit Club");
    setRoomCodeInput(code);
    setStatusMessage(`Created room ${code}`);
  }

  function handleSendRoomMessage() {
    if (!roomMessageInput.trim()) return;
    sendRoomMessage(roomMessageInput);
    setRoomMessageInput("");
  }

  function handleSendGlobalMessage() {
    if (!globalMessageInput.trim()) return;
    sendGlobalMessage(globalMessageInput);
    setGlobalMessageInput("");
  }

  function handleAddNote() {
    if (!noteInput.trim()) return;
    addNoteToSelectedObject(noteInput);
    setNoteInput("");
    setStatusMessage("Note saved");
  }

  function handleSpeakSelected() {
    if (!selectedObject) return;
    Speech.stop();
    Speech.speak(
      `${selectedObject.name}. ${selectedObject.distanceFromEarth}. ${selectedObject.mythologyStory}. ${selectedObject.scientificFacts.join(" ")}`,
      { rate: 0.95, pitch: 1.0 },
    );
  }

  function handleSaveUsername() {
    if (usernameInput.trim()) {
      updateUsername(usernameInput.trim());
      setShowProfileEditor(false);
      setStatusMessage(`Username updated to ${usernameInput.trim()}`);
    }
  }

  const currentYear = selectedDate.getUTCFullYear();
  const username = userProfile?.username ?? "Stargazer";

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
      <ScrollView
        contentContainerStyle={styles.content}
        showsVerticalScrollIndicator={false}
        keyboardShouldPersistTaps="handled"
        onScrollBeginDrag={Keyboard.dismiss}
      >
        {!network.isConnected && (
          <View style={styles.offlineBanner} accessibilityRole="alert">
            <Text style={styles.offlineBannerText}>Offline mode</Text>
          </View>
        )}

        {/* Hero */}
        <View style={styles.hero} accessibilityRole="header">
          <Text style={styles.brand}>SkySync</Text>
          <Text style={styles.heroTitle}>Explore the night sky together</Text>
          <Text style={styles.heroSubtitle}>Visible tonight: {visibleText || "Jupiter, Venus, ISS, Sirius"}</Text>
          <View style={styles.heroPillRow}>
            <View style={styles.heroPill}>
              <Text style={styles.heroPillText}>{currentRoom?.roomCode ?? "SOLO"}</Text>
            </View>
            <View style={[styles.heroPill, liveMode && styles.heroPillLive]}>
              <Text style={styles.heroPillText}>{liveMode ? "LIVE" : "TIME TRAVEL"}</Text>
            </View>
          </View>
        </View>

        {/* Profile */}
        <View style={styles.card} accessibilityRole="summary">
          <View style={styles.profileRow}>
            <View style={styles.profileAvatar}>
              <Text style={styles.profileAvatarText}>{username[0].toUpperCase()}</Text>
            </View>
            <View style={styles.profileInfo}>
              <Text style={styles.profileName}>{username}</Text>
              <Text style={styles.profileStat}>
                {userProfile?.xp ?? 0} XP | {userProfile?.planetsDiscovered.length ?? 0} planets | {userProfile?.totalStarsViewed ?? 0} viewed
              </Text>
            </View>
            <Pressable
              style={({ pressed }) => [styles.chipSmall, pressed && styles.chipPressed]}
              onPress={() => setShowProfileEditor(!showProfileEditor)}
              accessibilityRole="button"
              accessibilityLabel="Edit profile"
            >
              <Text style={styles.chipSmallText}>{showProfileEditor ? "Close" : "Edit"}</Text>
            </Pressable>
          </View>
          {showProfileEditor && (
            <View style={styles.profileEditor}>
              <TextInput value={usernameInput} onChangeText={setUsernameInput} style={styles.input} placeholder="Enter username" placeholderTextColor={colors.textDim} maxLength={20} />
              <Pressable style={({ pressed }) => [styles.primaryButton, pressed && styles.primaryPressed]} onPress={handleSaveUsername} accessibilityRole="button">
                <Text style={styles.primaryButtonText}>Save</Text>
              </Pressable>
            </View>
          )}
        </View>

        {/* Viewpoint chips */}
        <View style={styles.chipRow} accessibilityRole="radiogroup" accessibilityLabel="Sky viewpoint">
          {availableViewpoints.map((item) => (
            <Pressable
              key={item.id}
              onPress={() => { setViewpoint(item.id as Viewpoint); setStatusMessage(`Viewing from ${item.label}`); }}
              style={({ pressed }) => [styles.chip, viewpoint === item.id && styles.chipActive, pressed && styles.chipPressed]}
              accessibilityRole="radio"
              accessibilityState={{ selected: viewpoint === item.id }}
            >
              <Text style={[styles.chipText, viewpoint === item.id && styles.chipTextActive]}>{item.label}</Text>
            </Pressable>
          ))}
        </View>

        {/* Sky View */}
        <SkyView objects={objects} segments={segments} customSegments={customSegments} draftSegments={draftSegments}
          selectedObjectId={selectedObject?.id} highlightedIds={highlightedIds} roomCode={currentRoom?.roomCode}
          liveMode={liveMode} viewpointLabel={viewpoint.toUpperCase()} dateLabel={`${dateInput} ${timeInput}`}
          callActive={callActive} rotation={rotation} zoom={zoom} onSelectObject={handleSelectObject}
          onRotate={setRotation} onZoom={setZoom} />

        {/* Status */}
        <View style={styles.statusBar}>
          <Text style={styles.statusText}>{statusMessage}</Text>
        </View>

        {/* Time Controls */}
        <SectionHeader title="Time Controls" subtitle="Travel through history or return to now" />
        <View style={styles.card}>
          <View style={styles.cardHeader}>
            <Text style={styles.cardLabel}>Voice guide</Text>
            <Switch value={voiceGuideEnabled} onValueChange={setVoiceGuideEnabled}
              thumbColor={voiceGuideEnabled ? colors.accent : "#aaa"} trackColor={{ false: "rgba(255,255,255,0.15)", true: colors.glow }} />
          </View>
          <View style={styles.dateRow}>
            <TextInput value={dateInput} onChangeText={setDateInput} style={styles.input} placeholder="YYYY-MM-DD" placeholderTextColor={colors.textDim} />
            <TextInput value={timeInput} onChangeText={setTimeInput} style={styles.input} placeholder="HH:MM" placeholderTextColor={colors.textDim} />
          </View>
          <View style={styles.buttonRow}>
            <Pressable style={({ pressed }) => [styles.secondaryButton, pressed && styles.secondaryPressed]} onPress={handleApplyDateTime}>
              <Text style={styles.secondaryButtonText}>Apply</Text>
            </Pressable>
            <Pressable style={({ pressed }) => [styles.primaryButton, pressed && styles.primaryPressed]} onPress={handleNow}>
              <Text style={styles.primaryButtonText}>Now</Text>
            </Pressable>
          </View>
          <Text style={styles.caption}>Year: {currentYear}</Text>
          <Slider minimumValue={1800} maximumValue={2100} step={1} value={currentYear}
            onValueChange={(v) => { const n = new Date(selectedDate); n.setUTCFullYear(v); setSelectedDate(n); }}
            minimumTrackTintColor={colors.accent} maximumTrackTintColor="rgba(255,255,255,0.1)" thumbTintColor={colors.accentWarm} />
          <View style={styles.chipRow}>
            {[1800, 2100, new Date().getUTCFullYear()].map((y, i) => (
              <Pressable key={y} style={({ pressed }) => [styles.chip, pressed && styles.chipPressed]} onPress={() => handleJumpToYear(y)}>
                <Text style={styles.chipText}>{i === 2 ? "Now" : y}</Text>
              </Pressable>
            ))}
          </View>
        </View>

        {/* Guided Mode */}
        <SectionHeader title="Guided Mode" subtitle="Tap to center on recommended objects" />
        <View style={styles.card}>
          {guidedTargets.map((item) => (
            <Pressable key={item.id} style={({ pressed }) => [styles.listItem, pressed && styles.listItemPressed]}
              onPress={() => { focusObject(item.objectId); setStatusMessage(`Centered on ${item.title}`); }} accessibilityRole="button">
              <Text style={styles.listTitle}>{item.title}</Text>
              <Text style={styles.listBody}>{item.subtitle}</Text>
            </Pressable>
          ))}
        </View>

        {/* Badges & Challenges */}
        <SectionHeader title="Badges & Challenges" subtitle={`${challengeProgress.completedIds.length}/${dailyChallenges.length} challenges done today`} />
        <View style={styles.card}>
          <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.horizontalRow}>
            {badges.map((badge) => {
              const done = badge.progressLabel.startsWith("Completed");
              return (
                <View key={badge.id} style={[styles.miniCard, done && styles.miniCardDone]}>
                  <Text style={styles.miniCardTitle}>{badge.title}</Text>
                  <Text style={styles.miniCardBody}>{badge.description}</Text>
                  <Text style={[styles.miniCardMeta, done && styles.miniCardMetaDone]}>{badge.progressLabel}</Text>
                </View>
              );
            })}
          </ScrollView>
          {dailyChallenges.map((challenge) => {
            const done = challengeProgress.completedIds.includes(challenge.id);
            return (
              <View key={challenge.id} style={[styles.listItem, done && styles.listItemDone]}>
                <View style={styles.challengeRow}>
                  <View style={[styles.challengeDot, done && styles.challengeDotDone]} />
                  <View style={{ flex: 1 }}>
                    <Text style={[styles.listTitle, done && styles.listTitleDone]}>{challenge.title}</Text>
                    <Text style={styles.listBody}>{challenge.reward}</Text>
                  </View>
                  {!done && challenge.objectId && (
                    <Pressable style={({ pressed }) => [styles.chipSmall, pressed && styles.chipPressed]}
                      onPress={() => { focusObject(challenge.objectId!); setStatusMessage(`Go find: ${challenge.title}`); }}>
                      <Text style={styles.chipSmallText}>Go</Text>
                    </Pressable>
                  )}
                </View>
              </View>
            );
          })}
          <View style={styles.xpBar}>
            <Text style={styles.xpText}>{challengeProgress.totalXpEarned} XP earned</Text>
          </View>
        </View>

        {/* Sky Rooms */}
        <SectionHeader title="Sky Rooms" subtitle="Stargaze with friends in real-time" />
        <View style={styles.card}>
          <View style={styles.cardHeader}>
            <Text style={styles.cardLabel}>Voice lounge</Text>
            <Switch value={callActive} onValueChange={(v) => { setCallActive(v); setStatusMessage(v ? "Voice lounge live" : "Voice lounge ended"); }}
              thumbColor={callActive ? colors.accentWarm : "#aaa"} trackColor={{ false: "rgba(255,255,255,0.15)", true: colors.glowWarm }} />
          </View>
          {callActive && (
            <View style={styles.infoBanner}>
              <Text style={styles.infoBannerText}>You're marked as available for voice chat</Text>
            </View>
          )}
          <Text style={styles.caption}>Participants: {participants.join(", ") || username}</Text>
          <TextInput value={roomNameInput} onChangeText={setRoomNameInput} style={styles.input} placeholder="Room name" placeholderTextColor={colors.textDim} maxLength={40} />
          <TextInput value={roomCodeInput} onChangeText={setRoomCodeInput} style={styles.input} placeholder="Room code (e.g. SKY-428A)" placeholderTextColor={colors.textDim} autoCapitalize="characters" maxLength={10} />
          <View style={styles.buttonRow}>
            <Pressable style={({ pressed }) => [styles.secondaryButton, pressed && styles.secondaryPressed]} onPress={handleJoinRoom}>
              <Text style={styles.secondaryButtonText}>Join</Text>
            </Pressable>
            <Pressable style={({ pressed }) => [styles.primaryButton, pressed && styles.primaryPressed]} onPress={handleCreateRoom}>
              <Text style={styles.primaryButtonText}>Create Room</Text>
            </Pressable>
          </View>
          {rooms.length > 0 && <Text style={styles.caption}>Rooms: {rooms.map((r) => r.roomCode).join(", ")}</Text>}
        </View>

        {/* Draw Constellations */}
        <SectionHeader title="Draw Constellations" subtitle="Connect stars to create your own patterns" />
        <View style={styles.card}>
          <View style={styles.cardHeader}>
            <Text style={styles.cardLabel}>Draw mode</Text>
            <Switch value={drawModeEnabled} onValueChange={(v) => { setDrawModeEnabled(v); setStatusMessage(v ? "Tap stars to draw" : "Draw mode off"); }}
              thumbColor={drawModeEnabled ? colors.accent : "#aaa"} trackColor={{ false: "rgba(255,255,255,0.15)", true: colors.glow }} />
          </View>
          <Text style={styles.caption}>{draftConstellationIds.length} stars selected</Text>
          <TextInput value={draftTitleInput} onChangeText={setDraftTitleInput} style={styles.input} placeholder="Constellation name" placeholderTextColor={colors.textDim} maxLength={40} />
          <View style={styles.buttonRow}>
            <Pressable style={({ pressed }) => [styles.secondaryButton, pressed && styles.secondaryPressed]} onPress={clearDraftConstellation}>
              <Text style={styles.secondaryButtonText}>Clear</Text>
            </Pressable>
            <Pressable style={({ pressed }) => [styles.primaryButton, draftConstellationIds.length < 2 && styles.buttonDisabled, pressed && styles.primaryPressed]}
              onPress={() => { if (draftConstellationIds.length < 2) { setStatusMessage("Select at least 2 stars"); return; } saveDraftConstellation(draftTitleInput); setStatusMessage("Constellation saved!"); }}>
              <Text style={styles.primaryButtonText}>Save</Text>
            </Pressable>
          </View>
        </View>

        {/* Room Chat */}
        <SectionHeader title="Room Chat" />
        <View style={styles.card}>
          {roomChat.length === 0 && <Text style={styles.emptyText}>No messages yet</Text>}
          <ScrollView ref={roomChatScrollRef} style={styles.chatScroll} nestedScrollEnabled>
            {roomChat.map((msg) => {
              const isOwn = msg.author === username;
              return (
                <View key={msg.id} style={[styles.chatBubble, isOwn && styles.chatBubbleOwn]}>
                  <Text style={styles.chatAuthor}>{msg.author} <Text style={styles.chatTime}>{msg.timestampLabel}</Text></Text>
                  <Text style={styles.chatText}>{msg.text}</Text>
                </View>
              );
            })}
          </ScrollView>
          <View style={styles.chatInputRow}>
            <TextInput value={roomMessageInput} onChangeText={setRoomMessageInput} style={styles.chatInput} placeholder="Message..." placeholderTextColor={colors.textDim} onSubmitEditing={handleSendRoomMessage} returnKeyType="send" maxLength={500} />
            <Pressable style={({ pressed }) => [styles.sendButton, pressed && styles.primaryPressed]} onPress={handleSendRoomMessage}>
              <Text style={styles.sendButtonText}>Send</Text>
            </Pressable>
          </View>
        </View>

        {/* Global Chat */}
        <SectionHeader title="Global Chat" />
        <View style={styles.card}>
          <ScrollView ref={globalChatScrollRef} style={styles.chatScroll} nestedScrollEnabled>
            {globalChat.map((msg) => {
              const isOwn = msg.author === username;
              return (
                <View key={msg.id} style={[styles.chatBubble, isOwn && styles.chatBubbleOwn]}>
                  <Text style={styles.chatAuthor}>{msg.author} <Text style={styles.chatTime}>{msg.timestampLabel}</Text></Text>
                  <Text style={styles.chatText}>{msg.text}</Text>
                </View>
              );
            })}
          </ScrollView>
          <View style={styles.chatInputRow}>
            <TextInput value={globalMessageInput} onChangeText={setGlobalMessageInput} style={styles.chatInput} placeholder="Say something..." placeholderTextColor={colors.textDim} onSubmitEditing={handleSendGlobalMessage} returnKeyType="send" maxLength={500} />
            <Pressable style={({ pressed }) => [styles.sendButton, pressed && styles.primaryPressed]} onPress={handleSendGlobalMessage}>
              <Text style={styles.sendButtonText}>Send</Text>
            </Pressable>
          </View>
        </View>
      </ScrollView>

      {/* Object Detail Modal */}
      <Modal visible={Boolean(selectedObject)} transparent animationType="slide"
        onRequestClose={() => { Speech.stop(); selectObject(undefined); }} accessibilityViewIsModal>
        <KeyboardAvoidingView style={{ flex: 1 }} behavior={Platform.OS === "ios" ? "padding" : undefined}>
          <Pressable style={styles.modalBackdrop} onPress={() => { Speech.stop(); selectObject(undefined); }}>
            <View style={styles.modalSheet}>
              <Pressable onPress={() => {}} style={{ flex: 1 }}>
                <ScrollView contentContainerStyle={styles.modalContent} showsVerticalScrollIndicator={false}>
                  {/* Close handle */}
                  <View style={styles.modalHandle} />
                  <Pressable style={({ pressed }) => [styles.modalCloseBtn, pressed && styles.chipPressed]}
                    onPress={() => { Speech.stop(); selectObject(undefined); }} accessibilityRole="button" accessibilityLabel="Close">
                    <Text style={styles.modalCloseBtnText}>Close</Text>
                  </Pressable>

                  <Text style={styles.modalTitle}>{selectedObject?.name}</Text>
                  <Text style={styles.modalMeta}>
                    {selectedObject?.kind}{constellationName ? ` | ${constellationName}` : ""}{selectedObject?.distanceFromEarth ? ` | ${selectedObject.distanceFromEarth}` : ""}
                  </Text>
                  <Text style={styles.modalBody}>{selectedObject?.description}</Text>

                  <ObjectPreview3D color={selectedObject?.color ?? colors.accent} title={selectedObject?.previewTitle}
                    description={selectedObject?.previewDescription} kind={selectedObject?.kind} />

                  <Text style={styles.modalSectionTitle}>Mythology</Text>
                  <Text style={styles.modalBody}>{selectedObject?.mythologyStory}</Text>

                  <Text style={styles.modalSectionTitle}>Scientific Facts</Text>
                  {selectedObject?.scientificFacts.map((fact, i) => (
                    <Text key={`${selectedObject.id}-f-${i}`} style={styles.fact}>- {fact}</Text>
                  ))}

                  {story && (
                    <>
                      <Text style={styles.modalSectionTitle}>Animated Story</Text>
                      <StoryPlayer story={story} />
                    </>
                  )}

                  <Text style={styles.modalSectionTitle}>Shared Notes</Text>
                  {selectedObjectNotes.length === 0 && <Text style={styles.emptyText}>No notes yet</Text>}
                  {selectedObjectNotes.map((note) => (
                    <View key={note.id} style={styles.noteCard}>
                      <Text style={styles.chatAuthor}>{note.author}</Text>
                      <Text style={styles.chatText}>{note.text}</Text>
                    </View>
                  ))}

                  <TextInput value={noteInput} onChangeText={setNoteInput} style={styles.input} placeholder="Add a note..." placeholderTextColor={colors.textDim} maxLength={500} />

                  <View style={styles.buttonRow}>
                    <Pressable style={({ pressed }) => [styles.secondaryButton, pressed && styles.secondaryPressed]}
                      onPress={() => { if (selectedObject) toggleHighlight(selectedObject.id); }}>
                      <Text style={styles.secondaryButtonText}>{selectedObject && highlightedIds.includes(selectedObject.id) ? "Unhighlight" : "Highlight"}</Text>
                    </Pressable>
                    <Pressable style={({ pressed }) => [styles.secondaryButton, pressed && styles.secondaryPressed]} onPress={handleSpeakSelected}>
                      <Text style={styles.secondaryButtonText}>Speak</Text>
                    </Pressable>
                  </View>
                  <View style={styles.buttonRow}>
                    <Pressable style={({ pressed }) => [styles.secondaryButton, pressed && styles.secondaryPressed]} onPress={handleAddNote}>
                      <Text style={styles.secondaryButtonText}>Save Note</Text>
                    </Pressable>
                    <Pressable style={({ pressed }) => [styles.primaryButton, pressed && styles.primaryPressed]}
                      onPress={() => { if (selectedObject) focusObject(selectedObject.id); selectObject(undefined); }}>
                      <Text style={styles.primaryButtonText}>Zoom Focus</Text>
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

  // Loading
  loadingContainer: { flex: 1, justifyContent: "center", alignItems: "center", gap: 20 },
  loadingBrand: { color: colors.accent, fontSize: fontSize.hero, fontWeight: "800", letterSpacing: 2 },
  loadingSubtext: { color: colors.textDim, fontSize: fontSize.sm },

  // Offline
  offlineBanner: { borderRadius: radius.sm, padding: 8, backgroundColor: "rgba(255,111,97,0.12)", alignItems: "center" },
  offlineBannerText: { color: colors.accentDanger, fontWeight: "700", fontSize: fontSize.xs },

  // Hero
  hero: { borderRadius: radius.xl, padding: spacing.xl, backgroundColor: colors.bgRaised, borderWidth: 1, borderColor: colors.border },
  brand: { color: colors.accent, fontSize: fontSize.sm, fontWeight: "800", letterSpacing: 2, textTransform: "uppercase" },
  heroTitle: { color: colors.text, fontSize: fontSize.xl, lineHeight: 30, fontWeight: "800", marginTop: 8 },
  heroSubtitle: { color: colors.textMuted, marginTop: 8, lineHeight: 20, fontSize: fontSize.sm },
  heroPillRow: { flexDirection: "row", gap: 8, marginTop: 12 },
  heroPill: { borderRadius: radius.pill, paddingHorizontal: 12, paddingVertical: 6, backgroundColor: "rgba(255,255,255,0.06)" },
  heroPillLive: { backgroundColor: "rgba(115,251,211,0.12)" },
  heroPillText: { color: colors.text, fontWeight: "700", fontSize: fontSize.xs },

  // Section headers
  sectionHeader: { marginTop: 6 },
  sectionHeaderTitle: { color: colors.text, fontSize: fontSize.md, fontWeight: "800" },
  sectionHeaderSub: { color: colors.textDim, fontSize: fontSize.xs, marginTop: 2 },

  // Profile
  profileRow: { flexDirection: "row", alignItems: "center", gap: 12 },
  profileAvatar: { width: 48, height: 48, borderRadius: radius.pill, backgroundColor: colors.accent, alignItems: "center", justifyContent: "center" },
  profileAvatarText: { color: "#05262a", fontSize: fontSize.lg, fontWeight: "800" },
  profileInfo: { flex: 1 },
  profileName: { color: colors.text, fontSize: fontSize.base, fontWeight: "800" },
  profileStat: { color: colors.textDim, fontSize: fontSize.xs, marginTop: 2 },
  profileEditor: { marginTop: spacing.md, gap: 8 },

  // Cards
  card: { borderRadius: radius.xl, padding: spacing.lg, backgroundColor: colors.card, borderWidth: 1, borderColor: colors.border,
    shadowColor: "#000", shadowOffset: { width: 0, height: 4 }, shadowOpacity: 0.3, shadowRadius: 12, elevation: 6 },
  cardHeader: { flexDirection: "row", justifyContent: "space-between", alignItems: "center", marginBottom: 8 },
  cardLabel: { color: colors.textMuted, fontWeight: "600", fontSize: fontSize.sm },

  // Chips
  chipRow: { flexDirection: "row", flexWrap: "wrap", gap: 8 },
  chip: { borderRadius: radius.pill, paddingHorizontal: 14, paddingVertical: 8, backgroundColor: colors.cardSoft },
  chipActive: { backgroundColor: colors.accent },
  chipPressed: { opacity: 0.7 },
  chipText: { color: colors.text, fontWeight: "700", fontSize: fontSize.sm },
  chipTextActive: { color: "#05262a" },
  chipSmall: { borderRadius: radius.pill, paddingHorizontal: 12, paddingVertical: 5, backgroundColor: "rgba(255,255,255,0.08)" },
  chipSmallText: { color: colors.accent, fontWeight: "700", fontSize: fontSize.xs },

  // Status
  statusBar: { borderRadius: radius.md, padding: 10, backgroundColor: "rgba(115,251,211,0.06)", borderWidth: 1, borderColor: "rgba(115,251,211,0.1)" },
  statusText: { color: colors.accent, fontWeight: "700", fontSize: fontSize.sm },

  // Inputs
  input: { flex: 1, borderRadius: radius.md, backgroundColor: "rgba(255,255,255,0.03)", borderWidth: 1, borderColor: colors.border, paddingHorizontal: 14, paddingVertical: 11, color: colors.text, fontSize: fontSize.sm, marginTop: 8 },
  dateRow: { flexDirection: "row", gap: 8 },

  // Buttons
  buttonRow: { flexDirection: "row", gap: 8, marginTop: 10 },
  primaryButton: { flex: 1, borderRadius: radius.md, paddingVertical: 12, backgroundColor: colors.accent, alignItems: "center", justifyContent: "center" },
  primaryPressed: { backgroundColor: colors.pressedPrimary },
  primaryButtonText: { color: "#05262a", fontWeight: "800", fontSize: fontSize.sm },
  secondaryButton: { flex: 1, borderRadius: radius.md, paddingVertical: 12, backgroundColor: colors.cardSoft, alignItems: "center", justifyContent: "center" },
  secondaryPressed: { backgroundColor: colors.pressedSecondary },
  secondaryButtonText: { color: colors.text, fontWeight: "700", fontSize: fontSize.sm },
  buttonDisabled: { opacity: 0.4 },

  caption: { color: colors.textDim, marginTop: 6, fontSize: fontSize.xs },

  // Lists
  listItem: { borderRadius: radius.lg, padding: 14, backgroundColor: colors.cardSoft, marginTop: 8 },
  listItemPressed: { backgroundColor: colors.pressedSecondary },
  listItemDone: { backgroundColor: "rgba(115,251,211,0.06)", borderWidth: 1, borderColor: "rgba(115,251,211,0.15)" },
  listTitle: { color: colors.text, fontWeight: "700", fontSize: fontSize.sm },
  listTitleDone: { color: colors.accent },
  listBody: { color: colors.textDim, lineHeight: 19, marginTop: 4, fontSize: fontSize.xs },

  // Challenges
  challengeRow: { flexDirection: "row", alignItems: "center", gap: 10 },
  challengeDot: { width: 10, height: 10, borderRadius: radius.pill, borderWidth: 2, borderColor: colors.textDim },
  challengeDotDone: { backgroundColor: colors.accent, borderColor: colors.accent },

  // Badges
  horizontalRow: { gap: 10, paddingVertical: 4 },
  miniCard: { width: 180, borderRadius: radius.lg, padding: 14, backgroundColor: colors.cardSoft },
  miniCardDone: { backgroundColor: "rgba(115,251,211,0.08)", borderWidth: 1, borderColor: "rgba(115,251,211,0.2)" },
  miniCardTitle: { color: colors.text, fontWeight: "700", fontSize: fontSize.sm },
  miniCardBody: { color: colors.textDim, lineHeight: 18, marginTop: 6, fontSize: fontSize.xs },
  miniCardMeta: { color: colors.accentWarm, marginTop: 8, fontWeight: "700", fontSize: fontSize.xs },
  miniCardMetaDone: { color: colors.accent },

  // XP bar
  xpBar: { borderRadius: radius.sm, padding: 10, marginTop: 10, backgroundColor: "rgba(255,177,95,0.08)", alignItems: "center" },
  xpText: { color: colors.accentWarm, fontWeight: "800", fontSize: fontSize.sm },

  // Chat
  chatScroll: { maxHeight: 240 },
  chatBubble: { borderRadius: radius.lg, padding: 10, backgroundColor: "rgba(255,255,255,0.04)", marginTop: 6, borderLeftWidth: 3, borderLeftColor: colors.accentWarm },
  chatBubbleOwn: { borderLeftColor: colors.accent, backgroundColor: "rgba(115,251,211,0.04)" },
  chatAuthor: { color: colors.accentWarm, fontWeight: "700", fontSize: fontSize.xs },
  chatTime: { color: colors.textDim, fontWeight: "400" },
  chatText: { color: colors.text, marginTop: 3, lineHeight: 19, fontSize: fontSize.sm },
  chatInputRow: { flexDirection: "row", gap: 8, marginTop: 8, alignItems: "center" },
  chatInput: { flex: 1, borderRadius: radius.md, backgroundColor: "rgba(255,255,255,0.03)", borderWidth: 1, borderColor: colors.border, paddingHorizontal: 12, paddingVertical: 10, color: colors.text, fontSize: fontSize.sm },
  sendButton: { borderRadius: radius.md, paddingHorizontal: 16, paddingVertical: 10, backgroundColor: colors.accent },
  sendButtonText: { color: "#05262a", fontWeight: "800", fontSize: fontSize.sm },
  emptyText: { color: colors.textDim, fontStyle: "italic", fontSize: fontSize.xs, marginTop: 4 },

  // Info banner
  infoBanner: { borderRadius: radius.sm, padding: 8, marginBottom: 6, backgroundColor: "rgba(255,177,95,0.08)" },
  infoBannerText: { color: colors.accentWarm, fontWeight: "600", fontSize: fontSize.xs, textAlign: "center" },

  // Modal
  modalBackdrop: { flex: 1, backgroundColor: "rgba(0,0,0,0.5)", justifyContent: "flex-end" },
  modalSheet: { maxHeight: "92%", backgroundColor: colors.card, borderTopLeftRadius: radius.xl, borderTopRightRadius: radius.xl, borderWidth: 1, borderColor: colors.border },
  modalContent: { padding: spacing.xl, paddingBottom: 40 },
  modalHandle: { width: 40, height: 4, borderRadius: 2, backgroundColor: "rgba(255,255,255,0.2)", alignSelf: "center", marginBottom: 12 },
  modalCloseBtn: { alignSelf: "flex-end", borderRadius: radius.pill, paddingHorizontal: 14, paddingVertical: 6, backgroundColor: "rgba(255,255,255,0.06)", marginBottom: 8 },
  modalCloseBtnText: { color: colors.textMuted, fontWeight: "700", fontSize: fontSize.xs },
  modalTitle: { color: colors.text, fontSize: fontSize.xl, fontWeight: "800" },
  modalMeta: { color: colors.accentWarm, marginTop: 6, textTransform: "capitalize", fontSize: fontSize.sm },
  modalBody: { color: colors.textMuted, lineHeight: 22, marginTop: 10, fontSize: fontSize.sm },
  modalSectionTitle: { color: colors.text, fontWeight: "800", marginTop: 18, fontSize: fontSize.base },
  fact: { color: colors.textMuted, marginTop: 6, lineHeight: 20, fontSize: fontSize.sm },
  noteCard: { borderRadius: radius.md, padding: 10, backgroundColor: "rgba(255,255,255,0.04)", marginTop: 8, borderLeftWidth: 3, borderLeftColor: colors.accentWarm },
});
