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
  RefreshControl,
  ScrollView,
  Share,
  StyleSheet,
  Text,
  TextInput,
  View,
} from "react-native";
let Speech: any = null;
try { Speech = require("expo-speech"); } catch {}
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
import { SearchBar } from "@/components/SearchBar";
import { TabBar, TabId } from "@/components/TabBar";
import { SettingsScreen } from "@/components/SettingsScreen";
import { ProfileSkeleton, CardSkeleton, SkyViewSkeleton } from "@/components/SkeletonLoader";
import { AstronomyPanel } from "@/components/sections/AstronomyPanel";
import { useToast } from "@/components/Toast";
import { useSelectedObjectDetails, useSkySync } from "@/providers/SkySyncProvider";
import { useNetworkStatus } from "@/hooks/useNetworkStatus";
import { streakService, StreakData } from "@/services/streakService";
import { offlineQueue } from "@/services/offlineQueue";
import { analytics } from "@/services/analytics";
import { notificationService } from "@/services/notifications";
import { storage } from "@/services/storage";
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
    completeChallenge, processQueuedAction,
  } = useSkySync();
  const { object: selectedObject, constellationName, story } = useSelectedObjectDetails();
  const network = useNetworkStatus();
  const toast = useToast();

  const [voiceGuideEnabled, setVoiceGuideEnabled] = useState(true);
  const [drawModeEnabled, setDrawModeEnabled] = useState(false);
  const [noteInput, setNoteInput] = useState("");
  const [activeTab, setActiveTab] = useState<TabId>("sky");
  const [showSettings, setShowSettings] = useState(false);
  const [refreshing, setRefreshing] = useState(false);
  const [streak, setStreak] = useState<StreakData | null>(null);
  const [pendingQueueCount, setPendingQueueCount] = useState(0);
  const settingsHydratedRef = useRef(false);

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

  // Initialize analytics and notifications on mount
  useEffect(() => {
    analytics.init();
    notificationService.init();
    return () => { analytics.endSession(); };
  }, []);

  // Track tab changes
  useEffect(() => {
    analytics.screenView(activeTab);
  }, [activeTab]);

  // Load streak on mount and schedule notifications
  useEffect(() => {
    streakService.recordActivity(challengeProgress.totalXpEarned).then((s) => {
      setStreak(s);
      notificationService.scheduleStreakReminder(s.currentStreak);
      notificationService.scheduleChallengeReminder(
        challengeProgress.completedIds.length,
        dailyChallenges.length,
      );
    });
  }, [challengeProgress.totalXpEarned, challengeProgress.completedIds.length, dailyChallenges.length]);

  useEffect(() => {
    let mounted = true;
    storage.getSettings().then((settings) => {
      if (!mounted) return;
      setVoiceGuideEnabled(settings.voiceGuideEnabled);
      settingsHydratedRef.current = true;
    }).catch(() => {
      settingsHydratedRef.current = true;
    });

    return () => {
      mounted = false;
    };
  }, []);

  useEffect(() => {
    if (!settingsHydratedRef.current) return;
    void storage.updateSettings({ voiceGuideEnabled });
  }, [voiceGuideEnabled]);

  // Check offline queue
  useEffect(() => {
    offlineQueue.count().then(setPendingQueueCount);
  }, []);

  // Flush offline queue when back online
  useEffect(() => {
    if (!network.isConnected) return;
    if (pendingQueueCount === 0) return;
    let cancelled = false;
    offlineQueue.flush(processQueuedAction).then(async (flushed) => {
      const remaining = await offlineQueue.count();
      if (cancelled) return;
      setPendingQueueCount(remaining);
      if (flushed > 0) {
        toast.show(`Synced ${flushed} queued action${flushed > 1 ? "s" : ""}`, "success");
      }
      if (remaining > 0) {
        toast.show(`${remaining} queued action${remaining > 1 ? "s" : ""} still pending`, "warning");
      }
    });

    return () => {
      cancelled = true;
    };
  }, [network.isConnected, pendingQueueCount, processQueuedAction, toast]);

  const visibleText = useMemo(() => visibleTonight.map((o) => o.name).join(", "), [visibleTonight]);

  const formatDate = (d: Date) => d.toISOString().slice(0, 10);
  const formatTime = (d: Date) => d.toISOString().slice(11, 16);

  // Toast-based status messages
  const setStatusMessage = useCallback((msg: string) => {
    if (msg.toLowerCase().includes("error") || msg.toLowerCase().includes("invalid") || msg.toLowerCase().includes("failed")) {
      toast.show(msg, "error");
    } else if (msg.toLowerCase().includes("completed") || msg.toLowerCase().includes("saved") || msg.toLowerCase().includes("created")) {
      toast.show(msg, "success");
    } else if (msg.toLowerCase().includes("warning") || msg.toLowerCase().includes("offline")) {
      toast.show(msg, "warning");
    } else {
      toast.show(msg, "info");
    }
  }, [toast]);

  const stopVoiceGuide = useCallback(() => {
    if (typeof Speech?.stop === "function") {
      Speech.stop();
    }
  }, []);

  const speakSelectedObject = useCallback((text: string) => {
    if (typeof Speech?.speak !== "function") {
      return;
    }
    stopVoiceGuide();
    Speech.speak(text, { rate: 0.95, pitch: 1.0 });
  }, [stopVoiceGuide]);

  // Voice guide
  useEffect(() => {
    if (!voiceGuideEnabled || !selectedObject) return;
    speakSelectedObject(
      `${selectedObject.name}. ${selectedObject.distanceFromEarth} from Earth. ${selectedObject.mythologyStory}. ${selectedObject.scientificFacts[0]}`,
    );
    return stopVoiceGuide;
  }, [selectedObject?.id, speakSelectedObject, stopVoiceGuide, voiceGuideEnabled]);

  // Challenge auto-completion
  const challengeRef = useRef(challengeProgress);
  challengeRef.current = challengeProgress;

  useEffect(() => {
    if (!selectedObject) return;
    for (const c of dailyChallenges) {
      if (challengeRef.current.completedIds.includes(c.id)) continue;
      if (c.objectId === selectedObject.id && (c.type === "discover" || c.type === "track")) {
        completeChallenge(c.id);
        toast.show(`Challenge completed: ${c.title} (+${c.xpValue} XP)`, "success");
      }
    }
  }, [selectedObject?.id, completeChallenge, dailyChallenges, toast]);

  useEffect(() => {
    if (!story || !selectedObject) return;
    for (const c of dailyChallenges) {
      if (challengeRef.current.completedIds.includes(c.id)) continue;
      if (c.type === "story" && c.objectId === selectedObject.id) {
        completeChallenge(c.id);
        toast.show(`Challenge completed: ${c.title} (+${c.xpValue} XP)`, "success");
      }
    }
  }, [story?.id, selectedObject?.id, completeChallenge, dailyChallenges, toast]);

  const handleSelectObject = useCallback((objectId: string) => {
    if (drawModeEnabled) {
      addStarToDraft(objectId);
      toast.show("Added star to draft pattern", "info");
      return;
    }
    selectObject(objectId);
    const obj = objects.find((o) => o.id === objectId);
    if (obj) analytics.objectDiscovered(objectId, obj.kind, obj.name);
  }, [drawModeEnabled, addStarToDraft, selectObject, toast, objects]);

  const handleAddNote = useCallback(async () => {
    if (!noteInput.trim()) return;
    if (!currentRoom || !selectedObject) {
      toast.show("Join a room to save shared notes", "warning");
      return;
    }
    if (!network.isConnected) {
      await offlineQueue.enqueue({
        type: "note",
        payload: { roomId: currentRoom.id, objectId: selectedObject.id, text: noteInput.trim() },
      });
      setPendingQueueCount((c) => c + 1);
      setNoteInput("");
      toast.show("Note queued (offline)", "warning");
      return;
    }
    const saved = await addNoteToSelectedObject(noteInput);
    if (!saved) {
      toast.show("Couldn't save note", "error");
      return;
    }
    setNoteInput("");
    toast.show("Note saved", "success");
  }, [noteInput, currentRoom, selectedObject, network.isConnected, addNoteToSelectedObject, toast]);

  const handleSendRoom = useCallback(async (text: string) => {
    if (!currentRoom) {
      toast.show("Join a room to chat", "warning");
      return;
    }
    if (!network.isConnected) {
      await offlineQueue.enqueue({ type: "room_message", payload: { roomId: currentRoom.id, text } });
      toast.show("Message queued (offline)", "warning");
      setPendingQueueCount((c) => c + 1);
      return;
    }
    const sent = await sendRoomMessage(text);
    if (!sent) {
      toast.show("Couldn't send room message", "error");
      return;
    }
    analytics.messageSent("room");
  }, [currentRoom, sendRoomMessage, network.isConnected, toast]);

  const handleSendGlobal = useCallback(async (text: string) => {
    if (!network.isConnected) {
      await offlineQueue.enqueue({ type: "global_message", payload: { text } });
      toast.show("Message queued (offline)", "warning");
      setPendingQueueCount((c) => c + 1);
      return;
    }
    const sent = await sendGlobalMessage(text);
    if (!sent) {
      toast.show("Couldn't send global message", "error");
      return;
    }
    analytics.messageSent("global");
  }, [sendGlobalMessage, network.isConnected, toast]);

  const handleShare = useCallback(async () => {
    try {
      const objectName = selectedObject?.name ?? "the night sky";
      await Share.share({
        message: `I'm stargazing at ${objectName} with SkySync! ${currentRoom ? `Join my room: ${currentRoom.roomCode}` : "Download SkySync to explore the night sky together."}`,
        title: "SkySync - Social Stargazing",
      });
      analytics.shareAction(selectedObject ? "object" : "app");
    } catch {
      // User cancelled
    }
  }, [selectedObject, currentRoom]);

  const handleSearchSelect = useCallback((objectId: string) => {
    focusObject(objectId);
    toast.show(`Focused on ${objects.find((o) => o.id === objectId)?.name ?? objectId}`, "info");
  }, [focusObject, objects, toast]);

  const handleToggleHighlight = useCallback(async () => {
    if (!selectedObject) return;
    if (!currentRoom) {
      toast.show("Join a room to highlight objects", "warning");
      return;
    }
    if (!network.isConnected) {
      await offlineQueue.enqueue({
        type: "highlight",
        payload: { roomId: currentRoom.id, objectId: selectedObject.id },
      });
      setPendingQueueCount((c) => c + 1);
      toast.show("Highlight queued (offline)", "warning");
      return;
    }
    const updated = await toggleHighlight(selectedObject.id);
    if (!updated) {
      toast.show("Couldn't update highlight", "error");
    }
  }, [selectedObject, currentRoom, network.isConnected, toggleHighlight, toast]);

  // Pull to refresh
  const handleRefresh = useCallback(async () => {
    setRefreshing(true);
    await streakService.recordActivity(challengeProgress.totalXpEarned).then(setStreak);
    const count = await offlineQueue.count();
    setPendingQueueCount(count);
    setRefreshing(false);
  }, [challengeProgress.totalXpEarned]);

  // Guided targets render
  const renderGuided = useCallback(({ item }: { item: GuidedTarget }) => (
    <Pressable
      style={({ pressed }) => [styles.listItem, pressed && styles.listItemPressed]}
      onPress={() => { focusObject(item.objectId); toast.show(`Centered on ${item.title}`, "info"); }}
      accessibilityRole="button"
    >
      <Text style={styles.listTitle}>{item.title}</Text>
      <Text style={styles.listBody}>{item.subtitle}</Text>
    </Pressable>
  ), [focusObject, toast]);

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

  // Settings modal
  if (showSettings) {
    return (
      <SafeAreaView style={styles.safeArea}>
        <SettingsScreen
          onClose={() => setShowSettings(false)}
          voiceGuideEnabled={voiceGuideEnabled}
          setVoiceGuideEnabled={setVoiceGuideEnabled}
        />
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
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={handleRefresh} tintColor={colors.accent} />}
      >
        {!network.isConnected && (
          <View style={styles.offlineBanner} accessibilityRole="alert">
            <Text style={styles.offlineText}>
              Offline mode{pendingQueueCount > 0 ? ` \u2022 ${pendingQueueCount} queued` : ""}
            </Text>
          </View>
        )}

        {/* ============================================================ */}
        {/* SKY TAB - Clean and focused: just the sky map + controls      */}
        {/* ============================================================ */}
        {activeTab === "sky" && (
          <>
            {/* Compact Hero */}
            <View style={styles.heroCompact}>
              <View style={styles.heroTop}>
                <View style={{ flex: 1 }}>
                  <Text style={styles.brand}>SkySync</Text>
                  <Text style={styles.heroSubCompact}>
                    {visibleText ? `Tonight: ${visibleText}` : "Explore the night sky together"}
                  </Text>
                </View>
                <View style={styles.heroActions}>
                  {streak && streak.currentStreak > 0 && (
                    <View style={[styles.pill, styles.pillStreak]}>
                      <Text style={styles.pillText}>{"\u{1F525}"} {streak.currentStreak}</Text>
                    </View>
                  )}
                  <Pressable
                    style={({ pressed }) => [styles.settingsBtn, pressed && { opacity: 0.7 }]}
                    onPress={() => setShowSettings(true)}
                    accessibilityRole="button"
                    accessibilityLabel="Settings"
                  >
                    <Text style={styles.settingsIcon}>{"\u2699"}</Text>
                  </Pressable>
                </View>
              </View>
              <View style={styles.pillRow}>
                <View style={styles.pill}><Text style={styles.pillText}>{currentRoom?.roomCode ?? "SOLO"}</Text></View>
                <View style={[styles.pill, liveMode && styles.pillLive]}><Text style={styles.pillText}>{liveMode ? "LIVE" : "TIME TRAVEL"}</Text></View>
                {streak && (
                  <View style={styles.pill}><Text style={styles.pillText}>Lv. {streak.level}</Text></View>
                )}
              </View>
            </View>

            {/* Search */}
            <SearchBar objects={objects} onSelect={handleSearchSelect} />

            {/* Viewpoints */}
            <View style={styles.chipRow} accessibilityRole="radiogroup">
              {availableViewpoints.map((item) => (
                <Pressable key={item.id} onPress={() => { setViewpoint(item.id as Viewpoint); toast.show(`Viewing from ${item.label}`, "info"); }}
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

            {/* Time Controls */}
            <SectionErrorBoundary section="Time Controls">
              <TimeControls voiceGuideEnabled={voiceGuideEnabled} setVoiceGuideEnabled={setVoiceGuideEnabled} onStatus={setStatusMessage} />
            </SectionErrorBoundary>

            {/* Draw Constellations */}
            <SectionErrorBoundary section="Draw">
              <DrawConstellations drawModeEnabled={drawModeEnabled} setDrawModeEnabled={setDrawModeEnabled} onStatus={setStatusMessage} />
            </SectionErrorBoundary>
          </>
        )}

        {/* ============================================================ */}
        {/* EXPLORE TAB - Astronomy data, guided mode, tonight's sky     */}
        {/* ============================================================ */}
        {activeTab === "explore" && (
          <>
            <View style={styles.tabHeader}>
              <Text style={styles.tabHeaderIcon}>{"\u{1F52D}"}</Text>
              <Text style={styles.tabHeaderTitle}>Explore</Text>
              <Text style={styles.tabHeaderSub}>Discover what's in the sky right now</Text>
            </View>

            <SectionHeader title="Tonight's Highlights" subtitle="Tap to center on recommended objects" />
            <SectionErrorBoundary section="Guided Mode">
              <View style={styles.card}>
                <FlatList data={guidedTargets} renderItem={renderGuided} keyExtractor={(i) => i.id} scrollEnabled={false} />
              </View>
            </SectionErrorBoundary>

            <SectionHeader title="Live Astronomy Data" subtitle="Real-time planetary positions, moon phase, and upcoming events" />
            <SectionErrorBoundary section="Astronomy">
              <AstronomyPanel selectedDate={selectedDate} onFocusPlanet={(name) => {
                const obj = objects.find((o) => o.name.toLowerCase() === name);
                if (obj) {
                  focusObject(obj.id);
                  setActiveTab("sky");
                  toast.show(`Focused on ${obj.name}`, "info");
                }
              }} />
            </SectionErrorBoundary>
          </>
        )}

        {/* ============================================================ */}
        {/* SOCIAL TAB - Rooms, chat, voice                              */}
        {/* ============================================================ */}
        {activeTab === "social" && (
          <>
            <View style={styles.tabHeader}>
              <Text style={styles.tabHeaderIcon}>{"\u{1F4AC}"}</Text>
              <Text style={styles.tabHeaderTitle}>Social</Text>
              <Text style={styles.tabHeaderSub}>Stargaze with friends in real-time</Text>
            </View>

            <SectionErrorBoundary section="Rooms"><RoomSection onStatus={setStatusMessage} /></SectionErrorBoundary>

            <SectionHeader title="Voice Lounge" subtitle="Coordinate shared observing sessions" />
            <SectionErrorBoundary section="Voice Lounge"><VoiceLounge onStatus={setStatusMessage} /></SectionErrorBoundary>

            <SectionHeader title="Room Chat" />
            <SectionErrorBoundary section="Room Chat">
              {roomChat.length === 0 ? (
                <View style={styles.emptyState}>
                  <Text style={styles.emptyIcon}>{"\u{1F4AC}"}</Text>
                  <Text style={styles.emptyTitle}>No room messages yet</Text>
                  <Text style={styles.emptyBody}>Join or create a Sky Room to start chatting with fellow stargazers.</Text>
                </View>
              ) : (
                <ChatSection title="Room Chat" messages={roomChat} currentUsername={username} onSend={handleSendRoom} placeholder="Message room..." />
              )}
            </SectionErrorBoundary>

            <SectionHeader title="Global Chat" />
            <SectionErrorBoundary section="Global Chat">
              {globalChat.length === 0 ? (
                <View style={styles.emptyState}>
                  <Text style={styles.emptyIcon}>{"\u{1F30D}"}</Text>
                  <Text style={styles.emptyTitle}>Global chat is quiet</Text>
                  <Text style={styles.emptyBody}>Be the first to say hello to stargazers around the world!</Text>
                </View>
              ) : (
                <ChatSection title="Global Chat" messages={globalChat} currentUsername={username} onSend={handleSendGlobal} placeholder="Say something..." />
              )}
            </SectionErrorBoundary>
          </>
        )}

        {/* ============================================================ */}
        {/* LEARN TAB - Mythology, science facts, daily challenges       */}
        {/* ============================================================ */}
        {activeTab === "learn" && (
          <>
            <View style={styles.tabHeader}>
              <Text style={styles.tabHeaderIcon}>{"\u{1F4D6}"}</Text>
              <Text style={styles.tabHeaderTitle}>Learn</Text>
              <Text style={styles.tabHeaderSub}>Daily challenges and astronomy knowledge</Text>
            </View>

            <SectionHeader title="Daily Challenges" subtitle={`${challengeProgress.completedIds.length}/${dailyChallenges.length} completed today`} />
            <SectionErrorBoundary section="Badges"><BadgesAndChallenges onStatus={setStatusMessage} /></SectionErrorBoundary>

            {/* Featured Object of the Day */}
            {visibleTonight.length > 0 && (
              <>
                <SectionHeader title="Featured Tonight" subtitle="Tap to learn about tonight's visible objects" />
                <View style={styles.featuredGrid}>
                  {visibleTonight.slice(0, 6).map((obj) => (
                    <Pressable
                      key={obj.id}
                      style={({ pressed }) => [styles.featuredCard, pressed && { opacity: 0.8 }]}
                      onPress={() => {
                        selectObject(obj.id);
                        analytics.objectDiscovered(obj.id, obj.kind, obj.name);
                      }}
                    >
                      <View style={[styles.featuredDot, { backgroundColor: obj.color, shadowColor: obj.color }]} />
                      <Text style={styles.featuredName}>{obj.name}</Text>
                      <Text style={styles.featuredKind}>{obj.kind}</Text>
                    </Pressable>
                  ))}
                </View>
              </>
            )}

            {/* Quick astronomy facts */}
            <SectionHeader title="Did You Know?" subtitle="Tap any object in the sky to discover its mythology and science" />
            <View style={styles.card}>
              <View style={styles.factCard}>
                <Text style={styles.factEmoji}>{"\u{1F30C}"}</Text>
                <Text style={styles.factText}>The light from Betelgeuse left the star 548 years ago. You're seeing it as it was during the Renaissance.</Text>
              </View>
              <View style={styles.factCard}>
                <Text style={styles.factEmoji}>{"\u{1F6F0}\uFE0F"}</Text>
                <Text style={styles.factText}>The ISS orbits Earth every 92 minutes at 28,000 km/h. You can often see it with the naked eye!</Text>
              </View>
              <View style={styles.factCard}>
                <Text style={styles.factEmoji}>{"\u{1FA90}"}</Text>
                <Text style={styles.factText}>Saturn's rings are mostly made of ice chunks ranging from tiny grains to pieces the size of a house.</Text>
              </View>
            </View>
          </>
        )}

        {/* ============================================================ */}
        {/* PROFILE TAB - Stats, streaks, settings                       */}
        {/* ============================================================ */}
        {activeTab === "profile" && (
          <>
            <SectionErrorBoundary section="Profile"><ProfileCard onStatus={setStatusMessage} /></SectionErrorBoundary>

            {/* Streak & Level Card */}
            {streak && <StreakCard streak={streak} />}

            {/* Quick Stats Summary */}
            <View style={styles.statsRow}>
              <View style={styles.statBox}>
                <Text style={styles.statNumber}>{userProfile?.planetsDiscovered.length ?? 0}</Text>
                <Text style={styles.statLabel}>Planets Found</Text>
              </View>
              <View style={styles.statBox}>
                <Text style={[styles.statNumber, { color: colors.accentWarm }]}>{userProfile?.totalStarsViewed ?? 0}</Text>
                <Text style={styles.statLabel}>Stars Viewed</Text>
              </View>
              <View style={styles.statBox}>
                <Text style={[styles.statNumber, { color: colors.accentInfo }]}>{challengeProgress.completedIds.length}</Text>
                <Text style={styles.statLabel}>Challenges</Text>
              </View>
            </View>

            {/* Share Button */}
            <Pressable style={({ pressed }) => [styles.shareBtn, pressed && { opacity: 0.85 }]} onPress={handleShare}>
              <Text style={styles.shareBtnText}>{"\u{1F4E4}"} Share SkySync</Text>
            </Pressable>

            <Pressable style={({ pressed }) => [styles.settingsCard, pressed && { opacity: 0.85 }]} onPress={() => setShowSettings(true)}>
              <Text style={styles.settingsCardText}>{"\u2699"} Open Settings</Text>
            </Pressable>
          </>
        )}
      </ScrollView>

      {/* Tab Bar */}
      <TabBar
        activeTab={activeTab}
        onChangeTab={setActiveTab}
        unreadCount={activeTab !== "social" ? globalChat.length + roomChat.length : 0}
      />

      {/* Object Detail Modal */}
      <Modal visible={Boolean(selectedObject)} transparent animationType="slide"
        onRequestClose={() => { stopVoiceGuide(); selectObject(undefined); }} accessibilityViewIsModal>
        <KeyboardAvoidingView style={{ flex: 1 }} behavior={Platform.OS === "ios" ? "padding" : undefined}>
          <Pressable style={styles.backdrop} onPress={() => { stopVoiceGuide(); selectObject(undefined); }}>
            <View style={styles.modalSheet}>
              <Pressable onPress={() => {}} style={{ flex: 1 }}>
                <ScrollView contentContainerStyle={styles.modalContent} showsVerticalScrollIndicator={false}>
                  <View style={styles.modalHandle} />
                  <View style={styles.modalHeader}>
                    <Pressable style={({ pressed }) => [styles.closeBtn, pressed && { opacity: 0.7 }]}
                      onPress={() => { stopVoiceGuide(); selectObject(undefined); }}>
                      <Text style={styles.closeBtnText}>Close</Text>
                    </Pressable>
                    <Pressable style={({ pressed }) => [styles.shareChip, pressed && { opacity: 0.7 }]} onPress={handleShare}>
                      <Text style={styles.shareChipText}>{"\u{1F4E4}"} Share</Text>
                    </Pressable>
                  </View>

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
                  {selectedObjectNotes.length === 0 ? (
                    <View style={styles.emptyNotes}>
                      <Text style={styles.emptyNotesText}>No notes yet. Be the first to add one!</Text>
                    </View>
                  ) : (
                    selectedObjectNotes.map((n) => (
                      <View key={n.id} style={styles.noteCard}>
                        <Text style={styles.noteAuthor}>{n.author}</Text>
                        <Text style={styles.noteText}>{n.text}</Text>
                      </View>
                    ))
                  )}

                  <TextInput value={noteInput} onChangeText={setNoteInput} style={styles.input} placeholder="Add a note..." placeholderTextColor={colors.textDim} maxLength={500} />

                  <View style={styles.btnRow}>
                    <Pressable style={({ pressed }) => [styles.secondaryBtn, pressed && styles.secondaryPressed]}
                      onPress={handleToggleHighlight}>
                      <Text style={styles.secondaryText}>{selectedObject && highlightedIds.includes(selectedObject.id) ? "Unhighlight" : "Highlight"}</Text>
                    </Pressable>
                    <Pressable style={({ pressed }) => [styles.secondaryBtn, pressed && styles.secondaryPressed]}
                      onPress={() => {
                        if (!selectedObject) return;
                        speakSelectedObject(`${selectedObject.name}. ${selectedObject.distanceFromEarth}. ${selectedObject.scientificFacts.join(" ")}`);
                      }}>
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
  safeArea: { flex: 1, backgroundColor: colors.bg },
  content: { padding: spacing.lg, paddingBottom: 16, gap: 14 },
  loadingContainer: { flex: 1, justifyContent: "center", alignItems: "center", gap: 20 },
  loadingBrand: { color: colors.accent, fontSize: fontSize.hero, fontWeight: "800", letterSpacing: 2 },
  loadingSubtext: { color: colors.textDim, fontSize: fontSize.sm },
  offlineBanner: { borderRadius: radius.sm, padding: 10, backgroundColor: "rgba(255,111,97,0.12)", alignItems: "center", flexDirection: "row", justifyContent: "center", gap: 6 },
  offlineText: { color: colors.accentDanger, fontWeight: "700", fontSize: fontSize.xs },
  // Compact hero for sky tab
  heroCompact: { borderRadius: radius.xl, padding: spacing.lg, backgroundColor: colors.bgRaised, borderWidth: 1, borderColor: colors.border },
  heroTop: { flexDirection: "row", justifyContent: "space-between", alignItems: "center" },
  heroActions: { flexDirection: "row", alignItems: "center", gap: 8 },
  brand: { color: colors.accent, fontSize: fontSize.sm, fontWeight: "800", letterSpacing: 2, textTransform: "uppercase" },
  heroSubCompact: { color: colors.textMuted, marginTop: 4, fontSize: fontSize.xs, lineHeight: 18 },
  settingsBtn: { padding: 8, borderRadius: radius.pill, backgroundColor: "rgba(255,255,255,0.06)" },
  settingsIcon: { fontSize: 20 },
  pillRow: { flexDirection: "row", flexWrap: "wrap", gap: 8, marginTop: 10 },
  pill: { borderRadius: radius.pill, paddingHorizontal: 12, paddingVertical: 6, backgroundColor: "rgba(255,255,255,0.06)" },
  pillLive: { backgroundColor: "rgba(115,251,211,0.12)" },
  pillStreak: { backgroundColor: "rgba(255,177,95,0.12)" },
  pillText: { color: colors.text, fontWeight: "700", fontSize: fontSize.xs },
  chipRow: { flexDirection: "row", flexWrap: "wrap", gap: 8 },
  chip: { borderRadius: radius.pill, paddingHorizontal: 14, paddingVertical: 8, backgroundColor: colors.cardSoft },
  chipActive: { backgroundColor: colors.accent },
  chipPressed: { opacity: 0.7 },
  chipText: { color: colors.text, fontWeight: "700", fontSize: fontSize.sm },
  chipTextActive: { color: colors.onAccent },
  card: { borderRadius: radius.xl, padding: spacing.lg, backgroundColor: colors.card, borderWidth: 1, borderColor: colors.border, shadowColor: "#000", shadowOffset: { width: 0, height: 4 }, shadowOpacity: 0.3, shadowRadius: 12, elevation: 6 },
  listItem: { borderRadius: radius.lg, padding: 14, backgroundColor: colors.cardSoft, marginTop: 8 },
  listItemPressed: { backgroundColor: colors.pressedSecondary },
  listTitle: { color: colors.text, fontWeight: "700", fontSize: fontSize.sm },
  listBody: { color: colors.textDim, lineHeight: 19, marginTop: 4, fontSize: fontSize.xs },
  // Tab headers
  tabHeader: { alignItems: "center", paddingVertical: 8, gap: 4 },
  tabHeaderIcon: { fontSize: 32 },
  tabHeaderTitle: { color: colors.text, fontSize: fontSize.xl, fontWeight: "800" },
  tabHeaderSub: { color: colors.textDim, fontSize: fontSize.sm, textAlign: "center" },
  // Featured grid (Learn tab)
  featuredGrid: { flexDirection: "row", flexWrap: "wrap", gap: 10 },
  featuredCard: { flex: 1, minWidth: "28%", borderRadius: radius.lg, padding: 14, backgroundColor: colors.card, borderWidth: 1, borderColor: colors.border, alignItems: "center", gap: 8 },
  featuredDot: { width: 24, height: 24, borderRadius: 12, shadowOpacity: 0.6, shadowRadius: 8, elevation: 4 },
  featuredName: { color: colors.text, fontSize: fontSize.sm, fontWeight: "700", textAlign: "center" },
  featuredKind: { color: colors.textDim, fontSize: fontSize.xs, textTransform: "capitalize" },
  // Facts (Learn tab)
  factCard: { flexDirection: "row", alignItems: "flex-start", gap: 12, paddingVertical: 12, borderBottomWidth: 1, borderBottomColor: "rgba(255,255,255,0.04)" },
  factEmoji: { fontSize: 24 },
  factText: { color: colors.textMuted, fontSize: fontSize.sm, lineHeight: 20, flex: 1 },
  // Stats row (Profile tab)
  statsRow: { flexDirection: "row", gap: 10 },
  statBox: { flex: 1, borderRadius: radius.lg, padding: 16, backgroundColor: colors.card, borderWidth: 1, borderColor: colors.border, alignItems: "center", gap: 4 },
  statNumber: { color: colors.accent, fontSize: fontSize.xl, fontWeight: "800" },
  statLabel: { color: colors.textDim, fontSize: fontSize.xs },
  // Empty states
  emptyState: { borderRadius: radius.xl, padding: spacing.xl, backgroundColor: colors.card, borderWidth: 1, borderColor: colors.border, alignItems: "center", gap: 8 },
  emptyIcon: { fontSize: 36, marginBottom: 4 },
  emptyTitle: { color: colors.text, fontSize: fontSize.base, fontWeight: "800" },
  emptyBody: { color: colors.textDim, fontSize: fontSize.sm, textAlign: "center", lineHeight: 20, maxWidth: 280 },
  emptyNotes: { padding: 12, borderRadius: radius.md, backgroundColor: "rgba(255,255,255,0.02)", marginTop: 4 },
  emptyNotesText: { color: colors.textDim, fontStyle: "italic", fontSize: fontSize.xs, textAlign: "center" },
  // Streak
  streakTitle: { color: colors.text, fontSize: fontSize.md, fontWeight: "800", marginBottom: 12 },
  streakGrid: { flexDirection: "row", flexWrap: "wrap", gap: 8 },
  streakItem: { flex: 1, minWidth: "42%", alignItems: "center", padding: 12, borderRadius: radius.md, backgroundColor: "rgba(255,255,255,0.03)" },
  streakValue: { color: colors.accent, fontSize: fontSize.xl, fontWeight: "800" },
  streakLabel: { color: colors.textDim, fontSize: fontSize.xs, marginTop: 4 },
  xpBar: { height: 6, borderRadius: radius.pill, backgroundColor: "rgba(255,255,255,0.06)", marginTop: 16, overflow: "hidden" },
  xpFill: { height: "100%", borderRadius: radius.pill, backgroundColor: colors.accent },
  xpLabel: { color: colors.textDim, fontSize: fontSize.xs, marginTop: 6, textAlign: "center" },
  // Share
  shareBtn: { borderRadius: radius.xl, padding: 16, backgroundColor: colors.accent, alignItems: "center" },
  shareBtnText: { color: colors.onAccent, fontWeight: "800", fontSize: fontSize.base },
  settingsCard: { borderRadius: radius.xl, padding: 16, backgroundColor: colors.card, borderWidth: 1, borderColor: colors.border, alignItems: "center" },
  settingsCardText: { color: colors.text, fontWeight: "700", fontSize: fontSize.base },
  // Modal
  backdrop: { flex: 1, backgroundColor: "rgba(0,0,0,0.5)", justifyContent: "flex-end" },
  modalSheet: { maxHeight: "92%", backgroundColor: colors.card, borderTopLeftRadius: radius.xl, borderTopRightRadius: radius.xl, borderWidth: 1, borderColor: colors.border },
  modalContent: { padding: spacing.xl, paddingBottom: 40 },
  modalHandle: { width: 40, height: 4, borderRadius: 2, backgroundColor: "rgba(255,255,255,0.2)", alignSelf: "center", marginBottom: 12 },
  modalHeader: { flexDirection: "row", justifyContent: "space-between", alignItems: "center", marginBottom: 8 },
  closeBtn: { borderRadius: radius.pill, paddingHorizontal: 14, paddingVertical: 6, backgroundColor: "rgba(255,255,255,0.06)" },
  closeBtnText: { color: colors.textMuted, fontWeight: "700", fontSize: fontSize.xs },
  shareChip: { borderRadius: radius.pill, paddingHorizontal: 12, paddingVertical: 6, backgroundColor: "rgba(255,255,255,0.06)" },
  shareChipText: { color: colors.textMuted, fontWeight: "700", fontSize: fontSize.xs },
  modalTitle: { color: colors.text, fontSize: fontSize.xl, fontWeight: "800" },
  modalMeta: { color: colors.accentWarm, marginTop: 6, textTransform: "capitalize", fontSize: fontSize.sm },
  modalBody: { color: colors.textMuted, lineHeight: 22, marginTop: 10, fontSize: fontSize.sm },
  modalSection: { color: colors.text, fontWeight: "800", marginTop: 18, fontSize: fontSize.base },
  fact: { color: colors.textMuted, marginTop: 6, lineHeight: 20, fontSize: fontSize.sm },
  noteCard: { borderRadius: radius.md, padding: 10, backgroundColor: "rgba(255,255,255,0.04)", marginTop: 8, borderLeftWidth: 3, borderLeftColor: colors.accentWarm },
  noteAuthor: { color: colors.accentWarm, fontWeight: "700", fontSize: fontSize.xs },
  noteText: { color: colors.text, marginTop: 3, lineHeight: 19, fontSize: fontSize.sm },
  input: { borderRadius: radius.md, backgroundColor: "rgba(255,255,255,0.03)", borderWidth: 1, borderColor: colors.border, paddingHorizontal: 14, paddingVertical: 11, color: colors.text, fontSize: fontSize.sm, marginTop: 8 },
  btnRow: { flexDirection: "row", gap: 8, marginTop: 10 },
  primaryBtn: { flex: 1, borderRadius: radius.md, paddingVertical: 12, backgroundColor: colors.accent, alignItems: "center" },
  primaryPressed: { backgroundColor: colors.pressedPrimary },
  primaryText: { color: colors.onAccent, fontWeight: "800", fontSize: fontSize.sm },
  secondaryBtn: { flex: 1, borderRadius: radius.md, paddingVertical: 12, backgroundColor: colors.cardSoft, alignItems: "center" },
  secondaryPressed: { backgroundColor: colors.pressedSecondary },
  secondaryText: { color: colors.text, fontWeight: "700", fontSize: fontSize.sm },
});
