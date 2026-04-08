import { useState } from "react";
import { Pressable, ScrollView, StyleSheet, Text, View } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { AchievementCard } from "@/components/cards/AchievementCard";
import { AssistantCard } from "@/components/cards/AssistantCard";
import { AstroPhotoCard } from "@/components/cards/AstroPhotoCard";
import { EventFeedCard } from "@/components/cards/EventFeedCard";
import { ObjectDetailCard } from "@/components/cards/ObjectDetailCard";
import { SkyRoomCard } from "@/components/cards/SkyRoomCard";
import { SuggestionsCard } from "@/components/cards/SuggestionsCard";
import { TimelineCard } from "@/components/cards/TimelineCard";
import { SectionHeader } from "@/components/layout/SectionHeader";
import { SkyViewport } from "@/components/sky/SkyViewport";
import { useSkySync } from "@/providers/SkySyncProvider";
import { colors } from "@/theme/colors";

export function SkySyncHomeScreen() {
  const {
    activeObject,
    objects,
    rooms,
    selectedRoom,
    suggestions,
    achievements,
    events,
    hourOffset,
    orientation,
    setActiveObject,
    setHourOffset,
    createRoom,
    joinRoom,
    addMarkerToActiveRoom,
    selectRoom,
  } = useSkySync();
  const [flashMessage, setFlashMessage] = useState("Live sky aligned and ready");

  function handleCreateRoom() {
    createRoom("Aurora Circle");
    setFlashMessage("Created Aurora Circle");
  }

  function handleJoinRoom() {
    setFlashMessage(joinRoom("SKY-428"));
  }

  function handlePinObject() {
    addMarkerToActiveRoom(activeObject?.name ?? "Sky note", "Meet here for the shared watch party.", activeObject?.id);
    setFlashMessage(`Pinned ${activeObject?.name ?? "the sky"}`);
  }

  return (
    <SafeAreaView style={styles.safeArea}>
      <ScrollView contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>
        <View style={styles.hero}>
          <Text style={styles.brand}>SkySync</Text>
          <Text style={styles.title}>Social AR stargazing, synchronized in real time.</Text>
          <Text style={styles.subtitle}>
            Azimuth {orientation.azimuth} deg | Elevation {orientation.elevation} deg | {orientation.locationLabel}
          </Text>
          <View style={styles.tabRow}>
            {rooms.slice(0, 3).map((room) => (
              <Pressable
                key={room.id}
                style={[styles.roomChip, selectedRoom?.id === room.id && styles.roomChipActive]}
                onPress={() => selectRoom(room.id)}
              >
                <Text style={[styles.roomChipText, selectedRoom?.id === room.id && styles.roomChipTextActive]}>
                  {room.name}
                </Text>
              </Pressable>
            ))}
          </View>
        </View>

        <SectionHeader title="AR Sky View" caption={flashMessage} />
        <SkyViewport
          objects={objects}
          selectedObjectId={activeObject?.id}
          markers={selectedRoom?.markers ?? []}
          friendPointers={selectedRoom?.pointers ?? []}
          onSelectObject={(objectId) => {
            setActiveObject(objectId);
            setFlashMessage(`Locked on ${objects.find((item) => item.id === objectId)?.name ?? objectId}`);
          }}
        />

        <View style={styles.grid}>
          <ObjectDetailCard object={activeObject} />
          <TimelineCard hourOffset={hourOffset} onChange={setHourOffset} />
        </View>

        <View style={styles.grid}>
          <SkyRoomCard room={selectedRoom} onCreate={handleCreateRoom} onJoin={handleJoinRoom} onPin={handlePinObject} />
          <AssistantCard object={activeObject} />
        </View>

        <SuggestionsCard suggestions={suggestions} />

        <View style={styles.grid}>
          <EventFeedCard events={events} />
          <AchievementCard items={achievements} />
        </View>

        <AstroPhotoCard />
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
    backgroundColor: colors.bg,
  },
  content: {
    padding: 18,
    paddingBottom: 40,
    gap: 18,
  },
  hero: {
    borderRadius: 30,
    padding: 22,
    backgroundColor: "#08182d",
    borderWidth: 1,
    borderColor: colors.border,
  },
  brand: {
    color: colors.accent,
    fontSize: 13,
    textTransform: "uppercase",
    letterSpacing: 2,
    fontWeight: "800",
    marginBottom: 10,
  },
  title: {
    color: colors.text,
    fontSize: 30,
    lineHeight: 36,
    fontWeight: "800",
  },
  subtitle: {
    color: colors.textMuted,
    lineHeight: 21,
    marginTop: 12,
  },
  tabRow: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 10,
    marginTop: 16,
  },
  roomChip: {
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 999,
    backgroundColor: "rgba(255,255,255,0.04)",
  },
  roomChipActive: {
    backgroundColor: colors.accent,
  },
  roomChipText: {
    color: colors.text,
    fontWeight: "600",
  },
  roomChipTextActive: {
    color: "#062126",
  },
  grid: {
    gap: 18,
  },
});
