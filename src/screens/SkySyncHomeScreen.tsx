import { useEffect, useMemo, useState } from "react";
import {
  ActivityIndicator,
  Modal,
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
import { colors } from "@/theme/colors";
import { Viewpoint } from "@/types/sky";

function formatDate(date: Date) {
  return date.toISOString().slice(0, 10);
}

function formatTime(date: Date) {
  return date.toISOString().slice(11, 16);
}

function parseDateTime(dateInput: string, timeInput: string) {
  const parsed = new Date(`${dateInput}T${timeInput}:00.000Z`);
  if (Number.isNaN(parsed.getTime())) {
    return null;
  }
  return parsed;
}

export function SkySyncHomeScreen() {
  const {
    objects,
    segments,
    customSegments,
    draftSegments,
    visibleTonight,
    guidedTargets,
    badges,
    dailyChallenges,
    rooms,
    currentRoom,
    roomChat,
    globalChat,
    participants,
    callActive,
    selectedDate,
    liveMode,
    rotation,
    zoom,
    viewpoint,
    highlightedIds,
    selectedObjectNotes,
    draftConstellationIds,
    availableViewpoints,
    isLoading,
    userProfile,
    challengeProgress,
    setRotation,
    setZoom,
    setSelectedDate,
    setLiveMode,
    setViewpoint,
    selectObject,
    focusObject,
    toggleHighlight,
    addNoteToSelectedObject,
    createRoom,
    joinRoom,
    sendRoomMessage,
    sendGlobalMessage,
    setCallActive,
    addStarToDraft,
    clearDraftConstellation,
    saveDraftConstellation,
    updateUsername,
    completeChallenge,
  } = useSkySync();
  const { object: selectedObject, constellationName, story } = useSelectedObjectDetails();
  const network = useNetworkStatus();

  const [voiceGuideEnabled, setVoiceGuideEnabled] = useState(true);
  const [statusMessage, setStatusMessage] = useState("Live sky ready");
  const [roomCodeInput, setRoomCodeInput] = useState("SKY-428");
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

  const visibleText = useMemo(
    () => visibleTonight.map((object) => object.name).join(", "),
    [visibleTonight],
  );

  useEffect(() => {
    if (userProfile) {
      setUsernameInput(userProfile.username);
    }
  }, [userProfile?.username]);

  useEffect(() => {
    setDateInput(formatDate(selectedDate));
    setTimeInput(formatTime(selectedDate));
  }, [selectedDate]);

  useEffect(() => {
    if (!voiceGuideEnabled || !selectedObject) {
      return;
    }

    const speech = [
      `${selectedObject.name}.`,
      `${selectedObject.distanceFromEarth} from Earth.`,
      selectedObject.mythologyStory,
      selectedObject.scientificFacts[0],
    ].join(" ");

    Speech.stop();
    Speech.speak(speech, {
      rate: 0.95,
      pitch: 1.0,
    });
  }, [selectedObject?.id, voiceGuideEnabled]);

  // Auto-complete challenges when relevant objects are selected
  useEffect(() => {
    if (!selectedObject) return;
    for (const challenge of dailyChallenges) {
      if (challengeProgress.completedIds.includes(challenge.id)) continue;
      if (challenge.objectId === selectedObject.id) {
        if (challenge.type === "discover" || challenge.type === "track") {
          completeChallenge(challenge.id);
          setStatusMessage(`Challenge completed: ${challenge.title} (${challenge.reward})`);
        }
      }
    }
  }, [selectedObject?.id]);

  // Auto-complete story challenges when a story is viewed
  useEffect(() => {
    if (!story) return;
    for (const challenge of dailyChallenges) {
      if (challengeProgress.completedIds.includes(challenge.id)) continue;
      if (challenge.type === "story" && challenge.objectId === selectedObject?.id) {
        completeChallenge(challenge.id);
        setStatusMessage(`Challenge completed: ${challenge.title} (${challenge.reward})`);
      }
    }
  }, [story?.id]);

  function handleSelectObject(objectId: string) {
    if (drawModeEnabled) {
      addStarToDraft(objectId);
      setStatusMessage(`Added ${objects.find((object) => object.id === objectId)?.name ?? objectId} to draft constellation`);
      return;
    }

    selectObject(objectId);
    setStatusMessage(`Selected ${objects.find((object) => object.id === objectId)?.name ?? objectId}`);
  }

  function handleApplyDateTime() {
    const parsed = parseDateTime(dateInput.trim(), timeInput.trim());
    if (!parsed) {
      setStatusMessage("Invalid date or time");
      return;
    }
    setSelectedDate(parsed);
    setStatusMessage(`Time travel set to ${dateInput} ${timeInput}`);
  }

  function handleJumpToYear(year: number) {
    const next = new Date(selectedDate);
    next.setUTCFullYear(year);
    setSelectedDate(next);
    setStatusMessage(`Jumped to ${year}`);
  }

  function handleNow() {
    const now = new Date();
    setSelectedDate(now);
    setLiveMode(true);
    setStatusMessage("Returned to real-time sky");
  }

  function handleJoinRoom() {
    if (!roomCodeInput.trim()) {
      setStatusMessage("Please enter a room code");
      return;
    }
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
    setStatusMessage("Note saved to the current object");
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

  if (isLoading) {
    return (
      <SafeAreaView style={styles.safeArea}>
        <View style={styles.loadingContainer} accessibilityRole="progressbar" accessibilityLabel="Loading SkySync">
          <ActivityIndicator size="large" color={colors.accent} />
          <Text style={styles.loadingText}>Initializing SkySync...</Text>
          <Text style={styles.loadingSubtext}>Mapping the night sky</Text>
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.safeArea}>
      <ScrollView contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>
        {!network.isConnected && (
          <View style={styles.offlineBanner} accessibilityRole="alert">
            <Text style={styles.offlineBannerText}>Offline - Using local data only</Text>
          </View>
        )}

        <View style={styles.hero} accessibilityRole="header">
          <View style={styles.heroCopy}>
            <Text style={styles.brand}>SkySync Android</Text>
            <Text style={styles.title}>Real-time social stargazing with time travel, voice guidance, and shared sky rooms.</Text>
            <Text style={styles.subtitle}>Visible tonight: {visibleText || "Jupiter, Venus, ISS, Sirius"}</Text>
          </View>
          <View style={styles.heroBadges}>
            <View style={styles.heroPill}>
              <Text style={styles.heroPillText}>{currentRoom?.roomCode ?? "SOLO"}</Text>
            </View>
            <View style={styles.heroPill}>
              <Text style={styles.heroPillText}>{liveMode ? "LIVE" : "TIME TRAVEL"}</Text>
            </View>
          </View>
        </View>

        {/* User Profile Card */}
        <View style={styles.card} accessibilityRole="summary" accessibilityLabel={`User profile for ${userProfile?.username}`}>
          <View style={styles.cardHeader}>
            <Text style={styles.cardTitle}>Stargazer Profile</Text>
            <Pressable
              style={styles.chip}
              onPress={() => setShowProfileEditor(!showProfileEditor)}
              accessibilityRole="button"
              accessibilityLabel="Edit profile"
            >
              <Text style={styles.chipText}>Edit</Text>
            </Pressable>
          </View>
          <View style={styles.profileRow}>
            <View style={styles.profileAvatar}>
              <Text style={styles.profileAvatarText}>{(userProfile?.username ?? "S")[0].toUpperCase()}</Text>
            </View>
            <View style={styles.profileInfo}>
              <Text style={styles.profileName}>{userProfile?.username ?? "Stargazer"}</Text>
              <Text style={styles.profileStat}>{userProfile?.xp ?? 0} XP earned</Text>
              <Text style={styles.profileStat}>
                {userProfile?.planetsDiscovered.length ?? 0} planets | {userProfile?.satellitesTracked.length ?? 0} satellites | {userProfile?.totalStarsViewed ?? 0} objects viewed
              </Text>
            </View>
          </View>
          {showProfileEditor && (
            <View style={styles.profileEditor}>
              <TextInput
                value={usernameInput}
                onChangeText={setUsernameInput}
                style={styles.input}
                placeholder="Enter username"
                placeholderTextColor={colors.textMuted}
                accessibilityLabel="Username input"
                maxLength={20}
              />
              <Pressable style={styles.primaryButton} onPress={handleSaveUsername} accessibilityRole="button" accessibilityLabel="Save username">
                <Text style={styles.primaryButtonText}>Save</Text>
              </Pressable>
            </View>
          )}
        </View>

        <View style={styles.viewpointRow} accessibilityRole="radiogroup" accessibilityLabel="Sky viewpoint selector">
          {availableViewpoints.map((item) => (
            <Pressable
              key={item.id}
              onPress={() => {
                setViewpoint(item.id as Viewpoint);
                setStatusMessage(`Viewing sky from ${item.label}`);
              }}
              style={[styles.chip, viewpoint === item.id && styles.chipActive]}
              accessibilityRole="radio"
              accessibilityState={{ selected: viewpoint === item.id }}
              accessibilityLabel={`View from ${item.label}`}
            >
              <Text style={[styles.chipText, viewpoint === item.id && styles.chipTextActive]}>{item.label}</Text>
            </Pressable>
          ))}
        </View>

        <SkyView
          objects={objects}
          segments={segments}
          customSegments={customSegments}
          draftSegments={draftSegments}
          selectedObjectId={selectedObject?.id}
          highlightedIds={highlightedIds}
          roomCode={currentRoom?.roomCode}
          liveMode={liveMode}
          viewpointLabel={viewpoint.toUpperCase()}
          dateLabel={`${dateInput} ${timeInput}`}
          callActive={callActive}
          rotation={rotation}
          zoom={zoom}
          onSelectObject={handleSelectObject}
          onRotate={setRotation}
          onZoom={setZoom}
        />

        <View style={styles.statusBar} accessibilityRole="alert" accessibilityLiveRegion="polite">
          <Text style={styles.statusText}>{statusMessage}</Text>
        </View>

        <View style={styles.card}>
          <View style={styles.cardHeader}>
            <Text style={styles.cardTitle}>Real-time Sky Controls</Text>
            <View style={styles.switchRow}>
              <Text style={styles.switchLabel}>Voice guide</Text>
              <Switch
                value={voiceGuideEnabled}
                onValueChange={setVoiceGuideEnabled}
                thumbColor={voiceGuideEnabled ? colors.accent : "#d7d7d7"}
                trackColor={{ false: "rgba(255,255,255,0.2)", true: colors.glow }}
                accessibilityLabel="Toggle voice guide"
                accessibilityRole="switch"
              />
            </View>
          </View>

          <View style={styles.dateRow}>
            <TextInput
              value={dateInput}
              onChangeText={setDateInput}
              style={styles.input}
              placeholder="YYYY-MM-DD"
              placeholderTextColor={colors.textMuted}
              accessibilityLabel="Date input for time travel"
              accessibilityHint="Enter date in YYYY-MM-DD format"
            />
            <TextInput
              value={timeInput}
              onChangeText={setTimeInput}
              style={styles.input}
              placeholder="HH:MM"
              placeholderTextColor={colors.textMuted}
              accessibilityLabel="Time input for time travel"
              accessibilityHint="Enter time in HH:MM format"
            />
          </View>

          <View style={styles.buttonRow}>
            <Pressable style={styles.secondaryButton} onPress={handleApplyDateTime} accessibilityRole="button" accessibilityLabel="Apply date and time">
              <Text style={styles.secondaryButtonText}>Apply</Text>
            </Pressable>
            <Pressable style={styles.primaryButton} onPress={handleNow} accessibilityRole="button" accessibilityLabel="Return to current time">
              <Text style={styles.primaryButtonText}>Now</Text>
            </Pressable>
          </View>

          <Text style={styles.caption} accessibilityLabel={`Timeline year: ${currentYear}`}>Timeline year: {currentYear}</Text>
          <Slider
            minimumValue={1800}
            maximumValue={2100}
            step={1}
            value={currentYear}
            onValueChange={(value) => {
              const next = new Date(selectedDate);
              next.setUTCFullYear(value);
              setSelectedDate(next);
            }}
            minimumTrackTintColor={colors.accent}
            maximumTrackTintColor="rgba(255,255,255,0.15)"
            thumbTintColor={colors.accentWarm}
            accessibilityLabel={`Year slider, current value ${currentYear}`}
            accessibilityRole="adjustable"
          />

          <View style={styles.quickJumpRow}>
            <Pressable style={styles.chip} onPress={() => handleJumpToYear(1800)} accessibilityRole="button" accessibilityLabel="Jump to year 1800">
              <Text style={styles.chipText}>1800</Text>
            </Pressable>
            <Pressable style={styles.chip} onPress={() => handleJumpToYear(2100)} accessibilityRole="button" accessibilityLabel="Jump to year 2100">
              <Text style={styles.chipText}>2100</Text>
            </Pressable>
            <Pressable style={styles.chip} onPress={() => handleJumpToYear(new Date().getUTCFullYear())} accessibilityRole="button" accessibilityLabel="Jump to current year">
              <Text style={styles.chipText}>This Year</Text>
            </Pressable>
          </View>
        </View>

        <View style={styles.card}>
          <Text style={styles.cardTitle}>Guided Mode</Text>
          {guidedTargets.map((item) => (
            <Pressable
              key={item.id}
              style={styles.listItem}
              onPress={() => {
                focusObject(item.objectId);
                setStatusMessage(`Centered on ${item.title}`);
              }}
              accessibilityRole="button"
              accessibilityLabel={`${item.title}: ${item.subtitle}`}
            >
              <Text style={styles.listTitle}>{item.title}</Text>
              <Text style={styles.listBody}>{item.subtitle}</Text>
            </Pressable>
          ))}
        </View>

        <View style={styles.card} accessibilityRole="summary" accessibilityLabel="Badges and daily challenges">
          <Text style={styles.cardTitle}>Badges & Challenges</Text>
          <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.horizontalRow}>
            {badges.map((badge) => {
              const isCompleted = badge.progressLabel.startsWith("Completed");
              return (
                <View
                  key={badge.id}
                  style={[styles.miniCard, isCompleted && styles.miniCardCompleted]}
                  accessibilityLabel={`${badge.title}: ${badge.description}. ${badge.progressLabel}`}
                >
                  <Text style={styles.miniCardTitle}>{isCompleted ? `${badge.title}` : badge.title}</Text>
                  <Text style={styles.miniCardBody}>{badge.description}</Text>
                  <Text style={[styles.miniCardMeta, isCompleted && styles.miniCardMetaCompleted]}>{badge.progressLabel}</Text>
                </View>
              );
            })}
          </ScrollView>
          <Text style={[styles.caption, { marginTop: 14, marginBottom: 4 }]}>
            Daily Challenges ({challengeProgress.completedIds.length}/{dailyChallenges.length} completed today)
          </Text>
          {dailyChallenges.map((challenge) => {
            const isCompleted = challengeProgress.completedIds.includes(challenge.id);
            return (
              <View
                key={challenge.id}
                style={[styles.listItem, isCompleted && styles.listItemCompleted]}
                accessibilityLabel={`${challenge.title}: ${challenge.reward}${isCompleted ? ", completed" : ""}`}
              >
                <View style={styles.challengeRow}>
                  <View style={{ flex: 1 }}>
                    <Text style={[styles.listTitle, isCompleted && styles.listTitleCompleted]}>
                      {isCompleted ? `[done] ${challenge.title}` : challenge.title}
                    </Text>
                    <Text style={styles.listBody}>{challenge.reward}</Text>
                  </View>
                  {!isCompleted && (
                    <Pressable
                      style={styles.chipSmall}
                      onPress={() => {
                        if (challenge.objectId) {
                          focusObject(challenge.objectId);
                          setStatusMessage(`Go find: ${challenge.title}`);
                        }
                      }}
                      accessibilityRole="button"
                      accessibilityLabel={`Go to ${challenge.title}`}
                    >
                      <Text style={styles.chipText}>Go</Text>
                    </Pressable>
                  )}
                </View>
              </View>
            );
          })}
          <View style={styles.xpBar}>
            <Text style={styles.xpText}>Total XP: {challengeProgress.totalXpEarned}</Text>
          </View>
        </View>

        <View style={styles.card}>
          <View style={styles.cardHeader}>
            <Text style={styles.cardTitle}>Sky Rooms & Voice Lounge</Text>
            <View style={styles.switchRow}>
              <Text style={styles.switchLabel}>Call</Text>
              <Switch
                value={callActive}
                onValueChange={(next) => {
                  setCallActive(next);
                  setStatusMessage(next ? "Voice lounge marked live - participants can see you're available" : "Voice lounge ended");
                }}
                thumbColor={callActive ? colors.accentWarm : "#d7d7d7"}
                trackColor={{ false: "rgba(255,255,255,0.2)", true: "rgba(255,177,95,0.35)" }}
                accessibilityLabel="Toggle voice lounge availability"
                accessibilityRole="switch"
              />
            </View>
          </View>
          {callActive && (
            <View style={styles.callBanner}>
              <Text style={styles.callBannerText}>Voice lounge is active - You're marked as available for voice chat</Text>
            </View>
          )}
          <Text style={styles.caption}>Participants: {participants.join(", ") || (userProfile?.username ?? "You")}</Text>
          <TextInput
            value={roomNameInput}
            onChangeText={setRoomNameInput}
            style={styles.input}
            placeholder="Room name"
            placeholderTextColor={colors.textMuted}
            accessibilityLabel="Room name input"
          />
          <TextInput
            value={roomCodeInput}
            onChangeText={setRoomCodeInput}
            style={styles.input}
            placeholder="Room code"
            placeholderTextColor={colors.textMuted}
            autoCapitalize="characters"
            accessibilityLabel="Room code input"
            accessibilityHint="Enter a room code like SKY-428 to join"
          />
          <View style={styles.buttonRow}>
            <Pressable style={styles.secondaryButton} onPress={handleJoinRoom} accessibilityRole="button" accessibilityLabel="Join room">
              <Text style={styles.secondaryButtonText}>Join Room</Text>
            </Pressable>
            <Pressable style={styles.primaryButton} onPress={handleCreateRoom} accessibilityRole="button" accessibilityLabel="Create new room">
              <Text style={styles.primaryButtonText}>Create Room</Text>
            </Pressable>
          </View>
          <Text style={styles.roomMeta}>Available rooms: {rooms.map((room) => room.roomCode).join(", ") || "None yet"}</Text>
        </View>

        <View style={styles.card}>
          <View style={styles.cardHeader}>
            <Text style={styles.cardTitle}>Draw Constellations</Text>
            <View style={styles.switchRow}>
              <Text style={styles.switchLabel}>Draw mode</Text>
              <Switch
                value={drawModeEnabled}
                onValueChange={(next) => {
                  setDrawModeEnabled(next);
                  setStatusMessage(next ? "Tap stars to draft a custom constellation" : "Draw mode off");
                }}
                thumbColor={drawModeEnabled ? colors.accent : "#d7d7d7"}
                trackColor={{ false: "rgba(255,255,255,0.2)", true: colors.glow }}
                accessibilityLabel="Toggle constellation draw mode"
                accessibilityRole="switch"
              />
            </View>
          </View>
          <Text style={styles.caption}>Draft stars selected: {draftConstellationIds.length}</Text>
          <TextInput
            value={draftTitleInput}
            onChangeText={setDraftTitleInput}
            style={styles.input}
            placeholder="Custom constellation title"
            placeholderTextColor={colors.textMuted}
            accessibilityLabel="Custom constellation title"
          />
          <View style={styles.buttonRow}>
            <Pressable style={styles.secondaryButton} onPress={clearDraftConstellation} accessibilityRole="button" accessibilityLabel="Clear draft constellation">
              <Text style={styles.secondaryButtonText}>Clear Draft</Text>
            </Pressable>
            <Pressable
              style={[styles.primaryButton, draftConstellationIds.length < 2 && styles.buttonDisabled]}
              onPress={() => {
                if (draftConstellationIds.length < 2) {
                  setStatusMessage("Select at least 2 stars to save a constellation");
                  return;
                }
                saveDraftConstellation(draftTitleInput);
                setStatusMessage("Custom constellation saved to room");
              }}
              accessibilityRole="button"
              accessibilityLabel="Save draft constellation"
              accessibilityState={{ disabled: draftConstellationIds.length < 2 }}
            >
              <Text style={styles.primaryButtonText}>Save Draft</Text>
            </Pressable>
          </View>
        </View>

        <View style={styles.card}>
          <Text style={styles.cardTitle}>Room Chat</Text>
          {roomChat.length === 0 && (
            <Text style={styles.emptyText}>No messages yet. Start the conversation!</Text>
          )}
          {roomChat.map((message) => (
            <View key={message.id} style={styles.message} accessibilityLabel={`${message.author} said: ${message.text}, ${message.timestampLabel}`}>
              <Text style={styles.messageAuthor}>
                {message.author} | {message.timestampLabel}
              </Text>
              <Text style={styles.messageBody}>{message.text}</Text>
            </View>
          ))}
          <TextInput
            value={roomMessageInput}
            onChangeText={setRoomMessageInput}
            style={styles.input}
            placeholder="Send a room message"
            placeholderTextColor={colors.textMuted}
            accessibilityLabel="Room message input"
            onSubmitEditing={handleSendRoomMessage}
            returnKeyType="send"
          />
          <Pressable style={styles.primaryButton} onPress={handleSendRoomMessage} accessibilityRole="button" accessibilityLabel="Send message to room">
            <Text style={styles.primaryButtonText}>Send To Room</Text>
          </Pressable>
        </View>

        <View style={styles.card}>
          <Text style={styles.cardTitle}>Global Chatroom</Text>
          {globalChat.map((message) => (
            <View key={message.id} style={styles.message} accessibilityLabel={`${message.author} said: ${message.text}, ${message.timestampLabel}`}>
              <Text style={styles.messageAuthor}>
                {message.author} | {message.timestampLabel}
              </Text>
              <Text style={styles.messageBody}>{message.text}</Text>
            </View>
          ))}
          <TextInput
            value={globalMessageInput}
            onChangeText={setGlobalMessageInput}
            style={styles.input}
            placeholder="Discuss space facts with the world"
            placeholderTextColor={colors.textMuted}
            accessibilityLabel="Global message input"
            onSubmitEditing={handleSendGlobalMessage}
            returnKeyType="send"
          />
          <Pressable style={styles.primaryButton} onPress={handleSendGlobalMessage} accessibilityRole="button" accessibilityLabel="Send message to global chat">
            <Text style={styles.primaryButtonText}>Send Global Message</Text>
          </Pressable>
        </View>
      </ScrollView>

      <Modal
        visible={Boolean(selectedObject)}
        transparent
        animationType="fade"
        onRequestClose={() => {
          Speech.stop();
          selectObject(undefined);
        }}
        accessibilityViewIsModal
      >
        <Pressable
          style={styles.modalBackdrop}
          onPress={() => {
            Speech.stop();
            selectObject(undefined);
          }}
          accessibilityLabel="Close object details"
          accessibilityRole="button"
        >
          <ScrollView contentContainerStyle={styles.modalScroll}>
            <Pressable style={styles.modalCard} onPress={() => {}} accessibilityRole="none">
              <Text style={styles.modalTitle} accessibilityRole="header">{selectedObject?.name}</Text>
              <Text style={styles.modalMeta}>
                {selectedObject?.kind}
                {constellationName ? ` | ${constellationName}` : ""}
                {selectedObject?.distanceFromEarth ? ` | ${selectedObject.distanceFromEarth}` : ""}
              </Text>
              <Text style={styles.modalBody}>{selectedObject?.description}</Text>

              <ObjectPreview3D
                color={selectedObject?.color ?? colors.accent}
                title={selectedObject?.previewTitle}
                description={selectedObject?.previewDescription}
              />

              <Text style={styles.sectionTitle} accessibilityRole="header">Mythology</Text>
              <Text style={styles.modalBody}>{selectedObject?.mythologyStory}</Text>

              <Text style={styles.sectionTitle} accessibilityRole="header">Scientific Facts</Text>
              {selectedObject?.scientificFacts.map((fact, index) => (
                <Text key={`${selectedObject.id}-fact-${index}`} style={styles.fact} accessibilityLabel={fact}>
                  - {fact}
                </Text>
              ))}

              {story ? (
                <>
                  <Text style={styles.sectionTitle} accessibilityRole="header">Animated Story</Text>
                  <StoryPlayer story={story} />
                </>
              ) : null}

              <Text style={styles.sectionTitle} accessibilityRole="header">Shared Notes</Text>
              {selectedObjectNotes.length === 0 ? <Text style={styles.modalBody}>No room notes yet for this object.</Text> : null}
              {selectedObjectNotes.map((note) => (
                <View key={note.id} style={styles.noteCard} accessibilityLabel={`Note by ${note.author}: ${note.text}`}>
                  <Text style={styles.messageAuthor}>{note.author}</Text>
                  <Text style={styles.messageBody}>{note.text}</Text>
                </View>
              ))}

              <TextInput
                value={noteInput}
                onChangeText={setNoteInput}
                style={styles.input}
                placeholder="Add a note to this star or planet"
                placeholderTextColor={colors.textMuted}
                accessibilityLabel="Note input for this object"
                onSubmitEditing={handleAddNote}
                returnKeyType="done"
              />

              <View style={styles.buttonRow}>
                <Pressable
                  style={styles.secondaryButton}
                  onPress={() => {
                    if (selectedObject) {
                      toggleHighlight(selectedObject.id);
                    }
                  }}
                  accessibilityRole="button"
                  accessibilityLabel={selectedObject && highlightedIds.includes(selectedObject.id) ? "Remove highlight" : "Highlight this object"}
                >
                  <Text style={styles.secondaryButtonText}>
                    {selectedObject && highlightedIds.includes(selectedObject.id) ? "Unhighlight" : "Highlight"}
                  </Text>
                </Pressable>
                <Pressable style={styles.secondaryButton} onPress={handleSpeakSelected} accessibilityRole="button" accessibilityLabel="Read object information aloud">
                  <Text style={styles.secondaryButtonText}>Speak</Text>
                </Pressable>
              </View>

              <View style={styles.buttonRow}>
                <Pressable style={styles.secondaryButton} onPress={handleAddNote} accessibilityRole="button" accessibilityLabel="Save note">
                  <Text style={styles.secondaryButtonText}>Save Note</Text>
                </Pressable>
                <Pressable
                  style={styles.primaryButton}
                  onPress={() => {
                    if (selectedObject) {
                      focusObject(selectedObject.id);
                    }
                    selectObject(undefined);
                  }}
                  accessibilityRole="button"
                  accessibilityLabel="Zoom and focus on this object"
                >
                  <Text style={styles.primaryButtonText}>Zoom Focus</Text>
                </Pressable>
              </View>
            </Pressable>
          </ScrollView>
        </Pressable>
      </Modal>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
    backgroundColor: colors.bg,
  },
  content: {
    padding: 16,
    paddingBottom: 40,
    gap: 16,
  },
  loadingContainer: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    gap: 16,
  },
  loadingText: {
    color: colors.accent,
    fontSize: 20,
    fontWeight: "800",
  },
  loadingSubtext: {
    color: colors.textMuted,
    fontSize: 14,
  },
  offlineBanner: {
    borderRadius: 12,
    padding: 10,
    backgroundColor: "rgba(255,111,97,0.15)",
    borderWidth: 1,
    borderColor: colors.accentDanger,
    alignItems: "center",
  },
  offlineBannerText: {
    color: colors.accentDanger,
    fontWeight: "700",
    fontSize: 13,
  },
  hero: {
    borderRadius: 28,
    padding: 18,
    backgroundColor: colors.bgRaised,
    borderWidth: 1,
    borderColor: colors.border,
    flexDirection: "row",
    justifyContent: "space-between",
    gap: 12,
  },
  heroCopy: {
    flex: 1,
  },
  brand: {
    color: colors.accent,
    fontSize: 12,
    fontWeight: "800",
    letterSpacing: 1.5,
    textTransform: "uppercase",
  },
  title: {
    color: colors.text,
    fontSize: 28,
    lineHeight: 34,
    fontWeight: "800",
    marginTop: 8,
  },
  subtitle: {
    color: colors.textMuted,
    marginTop: 10,
    lineHeight: 20,
  },
  heroBadges: {
    gap: 10,
  },
  heroPill: {
    borderRadius: 999,
    paddingHorizontal: 14,
    paddingVertical: 10,
    backgroundColor: colors.cardSoft,
  },
  heroPillText: {
    color: colors.text,
    fontWeight: "700",
  },
  viewpointRow: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 10,
  },
  chip: {
    borderRadius: 999,
    paddingHorizontal: 12,
    paddingVertical: 9,
    backgroundColor: colors.cardSoft,
  },
  chipSmall: {
    borderRadius: 999,
    paddingHorizontal: 10,
    paddingVertical: 6,
    backgroundColor: colors.accent,
  },
  chipActive: {
    backgroundColor: colors.accent,
  },
  chipText: {
    color: colors.text,
    fontWeight: "700",
  },
  chipTextActive: {
    color: "#05262a",
  },
  statusBar: {
    borderRadius: 16,
    padding: 12,
    backgroundColor: "rgba(115,251,211,0.08)",
    borderWidth: 1,
    borderColor: colors.border,
  },
  statusText: {
    color: colors.accent,
    fontWeight: "700",
  },
  card: {
    borderRadius: 24,
    padding: 16,
    backgroundColor: colors.card,
    borderWidth: 1,
    borderColor: colors.border,
  },
  cardHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    gap: 12,
    marginBottom: 10,
  },
  cardTitle: {
    color: colors.text,
    fontSize: 18,
    fontWeight: "800",
  },
  switchRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
  },
  switchLabel: {
    color: colors.textMuted,
    fontWeight: "600",
  },
  dateRow: {
    flexDirection: "row",
    gap: 10,
    marginBottom: 12,
  },
  input: {
    flex: 1,
    borderRadius: 14,
    backgroundColor: "rgba(255,255,255,0.04)",
    borderWidth: 1,
    borderColor: colors.border,
    paddingHorizontal: 12,
    paddingVertical: 12,
    color: colors.text,
    marginTop: 10,
  },
  buttonRow: {
    flexDirection: "row",
    gap: 10,
    marginTop: 12,
  },
  primaryButton: {
    flex: 1,
    borderRadius: 14,
    paddingVertical: 12,
    backgroundColor: colors.accent,
    alignItems: "center",
    justifyContent: "center",
  },
  primaryButtonText: {
    color: "#05262a",
    fontWeight: "800",
  },
  secondaryButton: {
    flex: 1,
    borderRadius: 14,
    paddingVertical: 12,
    backgroundColor: colors.cardSoft,
    alignItems: "center",
    justifyContent: "center",
  },
  secondaryButtonText: {
    color: colors.text,
    fontWeight: "700",
  },
  buttonDisabled: {
    opacity: 0.5,
  },
  caption: {
    color: colors.textMuted,
    marginTop: 6,
  },
  quickJumpRow: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 10,
    marginTop: 12,
  },
  listItem: {
    borderRadius: 18,
    padding: 14,
    backgroundColor: colors.cardSoft,
    marginTop: 10,
  },
  listItemCompleted: {
    backgroundColor: "rgba(115,251,211,0.08)",
    borderWidth: 1,
    borderColor: "rgba(115,251,211,0.2)",
  },
  listTitle: {
    color: colors.text,
    fontWeight: "700",
  },
  listTitleCompleted: {
    color: colors.accent,
  },
  listBody: {
    color: colors.textMuted,
    lineHeight: 20,
    marginTop: 6,
  },
  horizontalRow: {
    gap: 12,
    paddingVertical: 4,
  },
  miniCard: {
    width: 200,
    borderRadius: 18,
    padding: 14,
    backgroundColor: colors.cardSoft,
  },
  miniCardCompleted: {
    backgroundColor: "rgba(115,251,211,0.1)",
    borderWidth: 1,
    borderColor: "rgba(115,251,211,0.25)",
  },
  miniCardTitle: {
    color: colors.text,
    fontWeight: "700",
  },
  miniCardBody: {
    color: colors.textMuted,
    lineHeight: 19,
    marginTop: 8,
  },
  miniCardMeta: {
    color: colors.accentWarm,
    marginTop: 10,
    fontWeight: "700",
  },
  miniCardMetaCompleted: {
    color: colors.accent,
  },
  challengeRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
  },
  xpBar: {
    borderRadius: 12,
    padding: 10,
    marginTop: 12,
    backgroundColor: "rgba(255,177,95,0.1)",
    borderWidth: 1,
    borderColor: "rgba(255,177,95,0.2)",
    alignItems: "center",
  },
  xpText: {
    color: colors.accentWarm,
    fontWeight: "800",
  },
  roomMeta: {
    color: colors.textMuted,
    marginTop: 10,
    lineHeight: 18,
  },
  callBanner: {
    borderRadius: 12,
    padding: 10,
    marginBottom: 8,
    backgroundColor: "rgba(255,177,95,0.1)",
    borderWidth: 1,
    borderColor: "rgba(255,177,95,0.2)",
  },
  callBannerText: {
    color: colors.accentWarm,
    fontWeight: "600",
    fontSize: 13,
    textAlign: "center",
  },
  profileRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 14,
  },
  profileAvatar: {
    width: 52,
    height: 52,
    borderRadius: 999,
    backgroundColor: colors.accent,
    alignItems: "center",
    justifyContent: "center",
  },
  profileAvatarText: {
    color: "#05262a",
    fontSize: 22,
    fontWeight: "800",
  },
  profileInfo: {
    flex: 1,
  },
  profileName: {
    color: colors.text,
    fontSize: 17,
    fontWeight: "800",
  },
  profileStat: {
    color: colors.textMuted,
    fontSize: 13,
    marginTop: 3,
  },
  profileEditor: {
    marginTop: 12,
    gap: 8,
  },
  emptyText: {
    color: colors.textMuted,
    fontStyle: "italic",
    marginTop: 8,
  },
  message: {
    borderRadius: 16,
    padding: 12,
    backgroundColor: colors.cardSoft,
    marginTop: 10,
  },
  messageAuthor: {
    color: colors.accentWarm,
    fontWeight: "700",
  },
  messageBody: {
    color: colors.text,
    marginTop: 6,
    lineHeight: 19,
  },
  modalBackdrop: {
    flex: 1,
    backgroundColor: "rgba(0,0,0,0.64)",
  },
  modalScroll: {
    flexGrow: 1,
    padding: 18,
    justifyContent: "center",
  },
  modalCard: {
    borderRadius: 24,
    padding: 18,
    backgroundColor: colors.card,
    borderWidth: 1,
    borderColor: colors.border,
  },
  modalTitle: {
    color: colors.text,
    fontSize: 25,
    fontWeight: "800",
  },
  modalMeta: {
    color: colors.accentWarm,
    marginTop: 8,
    textTransform: "capitalize",
  },
  modalBody: {
    color: colors.textMuted,
    lineHeight: 21,
    marginTop: 12,
  },
  sectionTitle: {
    color: colors.text,
    fontWeight: "800",
    marginTop: 16,
  },
  fact: {
    color: colors.textMuted,
    marginTop: 8,
    lineHeight: 20,
  },
  noteCard: {
    borderRadius: 14,
    padding: 12,
    backgroundColor: colors.cardSoft,
    marginTop: 10,
  },
});
