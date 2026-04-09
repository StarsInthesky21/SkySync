import { useEffect, useMemo, useState } from "react";
import {
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
  } = useSkySync();
  const { object: selectedObject, constellationName, story } = useSelectedObjectDetails();

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

  const visibleText = useMemo(
    () => visibleTonight.map((object) => object.name).join(", "),
    [visibleTonight],
  );

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
    setStatusMessage(joinRoom(roomCodeInput.trim()));
  }

  function handleCreateRoom() {
    const code = createRoom(roomNameInput.trim() || "Orbit Club");
    setRoomCodeInput(code);
    setStatusMessage(`Created room ${code}`);
  }

  function handleSendRoomMessage() {
    if (!roomMessageInput.trim()) {
      return;
    }
    sendRoomMessage(roomMessageInput);
    setRoomMessageInput("");
  }

  function handleSendGlobalMessage() {
    if (!globalMessageInput.trim()) {
      return;
    }
    sendGlobalMessage(globalMessageInput);
    setGlobalMessageInput("");
  }

  function handleAddNote() {
    if (!noteInput.trim()) {
      return;
    }
    addNoteToSelectedObject(noteInput);
    setNoteInput("");
    setStatusMessage("Note saved to the current object");
  }

  function handleSpeakSelected() {
    if (!selectedObject) {
      return;
    }
    Speech.stop();
    Speech.speak(
      `${selectedObject.name}. ${selectedObject.distanceFromEarth}. ${selectedObject.mythologyStory}. ${selectedObject.scientificFacts.join(" ")}`,
      { rate: 0.95, pitch: 1.0 },
    );
  }

  const currentYear = selectedDate.getUTCFullYear();

  return (
    <SafeAreaView style={styles.safeArea}>
      <ScrollView contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>
        <View style={styles.hero}>
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

        <View style={styles.viewpointRow}>
          {availableViewpoints.map((item) => (
            <Pressable
              key={item.id}
              onPress={() => {
                setViewpoint(item.id as Viewpoint);
                setStatusMessage(`Viewing sky from ${item.label}`);
              }}
              style={[styles.chip, viewpoint === item.id && styles.chipActive]}
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

        <View style={styles.statusBar}>
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
            />
            <TextInput
              value={timeInput}
              onChangeText={setTimeInput}
              style={styles.input}
              placeholder="HH:MM"
              placeholderTextColor={colors.textMuted}
            />
          </View>

          <View style={styles.buttonRow}>
            <Pressable style={styles.secondaryButton} onPress={handleApplyDateTime}>
              <Text style={styles.secondaryButtonText}>Apply</Text>
            </Pressable>
            <Pressable style={styles.primaryButton} onPress={handleNow}>
              <Text style={styles.primaryButtonText}>Now</Text>
            </Pressable>
          </View>

          <Text style={styles.caption}>Timeline year: {currentYear}</Text>
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
          />

          <View style={styles.quickJumpRow}>
            <Pressable style={styles.chip} onPress={() => handleJumpToYear(1800)}>
              <Text style={styles.chipText}>1800</Text>
            </Pressable>
            <Pressable style={styles.chip} onPress={() => handleJumpToYear(2100)}>
              <Text style={styles.chipText}>2100</Text>
            </Pressable>
            <Pressable style={styles.chip} onPress={() => handleJumpToYear(new Date().getUTCFullYear())}>
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
            >
              <Text style={styles.listTitle}>{item.title}</Text>
              <Text style={styles.listBody}>{item.subtitle}</Text>
            </Pressable>
          ))}
        </View>

        <View style={styles.card}>
          <Text style={styles.cardTitle}>Badges & Challenges</Text>
          <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.horizontalRow}>
            {badges.map((badge) => (
              <View key={badge.id} style={styles.miniCard}>
                <Text style={styles.miniCardTitle}>{badge.title}</Text>
                <Text style={styles.miniCardBody}>{badge.description}</Text>
                <Text style={styles.miniCardMeta}>{badge.progressLabel}</Text>
              </View>
            ))}
          </ScrollView>
          {dailyChallenges.map((challenge) => (
            <View key={challenge.id} style={styles.listItem}>
              <Text style={styles.listTitle}>{challenge.title}</Text>
              <Text style={styles.listBody}>{challenge.reward}</Text>
            </View>
          ))}
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
                  setStatusMessage(next ? "Voice lounge marked live" : "Voice lounge ended");
                }}
                thumbColor={callActive ? colors.accentWarm : "#d7d7d7"}
                trackColor={{ false: "rgba(255,255,255,0.2)", true: "rgba(255,177,95,0.35)" }}
              />
            </View>
          </View>
          <Text style={styles.caption}>Participants: {participants.join(", ") || "You"}</Text>
          <TextInput
            value={roomNameInput}
            onChangeText={setRoomNameInput}
            style={styles.input}
            placeholder="Room name"
            placeholderTextColor={colors.textMuted}
          />
          <TextInput
            value={roomCodeInput}
            onChangeText={setRoomCodeInput}
            style={styles.input}
            placeholder="Room code"
            placeholderTextColor={colors.textMuted}
            autoCapitalize="characters"
          />
          <View style={styles.buttonRow}>
            <Pressable style={styles.secondaryButton} onPress={handleJoinRoom}>
              <Text style={styles.secondaryButtonText}>Join Room</Text>
            </Pressable>
            <Pressable style={styles.primaryButton} onPress={handleCreateRoom}>
              <Text style={styles.primaryButtonText}>Create Room</Text>
            </Pressable>
          </View>
          <Text style={styles.roomMeta}>Available rooms: {rooms.map((room) => room.roomCode).join(", ")}</Text>
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
          />
          <View style={styles.buttonRow}>
            <Pressable style={styles.secondaryButton} onPress={clearDraftConstellation}>
              <Text style={styles.secondaryButtonText}>Clear Draft</Text>
            </Pressable>
            <Pressable
              style={styles.primaryButton}
              onPress={() => {
                saveDraftConstellation(draftTitleInput);
                setStatusMessage("Custom constellation saved to room");
              }}
            >
              <Text style={styles.primaryButtonText}>Save Draft</Text>
            </Pressable>
          </View>
        </View>

        <View style={styles.card}>
          <Text style={styles.cardTitle}>Room Chat</Text>
          {roomChat.map((message) => (
            <View key={message.id} style={styles.message}>
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
          />
          <Pressable style={styles.primaryButton} onPress={handleSendRoomMessage}>
            <Text style={styles.primaryButtonText}>Send To Room</Text>
          </Pressable>
        </View>

        <View style={styles.card}>
          <Text style={styles.cardTitle}>Global Chatroom</Text>
          {globalChat.map((message) => (
            <View key={message.id} style={styles.message}>
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
          />
          <Pressable style={styles.primaryButton} onPress={handleSendGlobalMessage}>
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
      >
        <Pressable
          style={styles.modalBackdrop}
          onPress={() => {
            Speech.stop();
            selectObject(undefined);
          }}
        >
          <ScrollView contentContainerStyle={styles.modalScroll}>
            <Pressable style={styles.modalCard} onPress={() => {}}>
              <Text style={styles.modalTitle}>{selectedObject?.name}</Text>
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

              <Text style={styles.sectionTitle}>Mythology</Text>
              <Text style={styles.modalBody}>{selectedObject?.mythologyStory}</Text>

              <Text style={styles.sectionTitle}>Scientific Facts</Text>
              {selectedObject?.scientificFacts.map((fact) => (
                <Text key={fact} style={styles.fact}>
                  - {fact}
                </Text>
              ))}

              {story ? (
                <>
                  <Text style={styles.sectionTitle}>Animated Story</Text>
                  <StoryPlayer story={story} />
                </>
              ) : null}

              <Text style={styles.sectionTitle}>Shared Notes</Text>
              {selectedObjectNotes.length === 0 ? <Text style={styles.modalBody}>No room notes yet for this object.</Text> : null}
              {selectedObjectNotes.map((note) => (
                <View key={note.id} style={styles.noteCard}>
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
              />

              <View style={styles.buttonRow}>
                <Pressable
                  style={styles.secondaryButton}
                  onPress={() => {
                    if (selectedObject) {
                      toggleHighlight(selectedObject.id);
                    }
                  }}
                >
                  <Text style={styles.secondaryButtonText}>
                    {selectedObject && highlightedIds.includes(selectedObject.id) ? "Unhighlight" : "Highlight"}
                  </Text>
                </Pressable>
                <Pressable style={styles.secondaryButton} onPress={handleSpeakSelected}>
                  <Text style={styles.secondaryButtonText}>Speak</Text>
                </Pressable>
              </View>

              <View style={styles.buttonRow}>
                <Pressable style={styles.secondaryButton} onPress={handleAddNote}>
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
  listTitle: {
    color: colors.text,
    fontWeight: "700",
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
  roomMeta: {
    color: colors.textMuted,
    marginTop: 10,
    lineHeight: 18,
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
