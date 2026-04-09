import { createContext, ReactNode, useContext, useEffect, useMemo, useState } from "react";
import { badges, dailyChallenges, guidedTargets, viewpoints } from "@/data/skyData";
import { roomSyncService } from "@/services/mock/roomSyncService";
import {
  findSkyObject,
  focusRotationForObject,
  getConstellationName,
  getConstellationSegments,
  getCustomConstellationSegments,
  getStoryForConstellation,
  getVisibleThingsTonight,
  renderSkyObjects,
} from "@/services/skyEngine";
import { ChatMessage, SkyRoom, SpaceNote } from "@/types/rooms";
import { Badge, DailyChallenge, GuidedTarget, MythStory, RenderedSkyObject, Viewpoint } from "@/types/sky";

type SkySyncContextValue = {
  objects: RenderedSkyObject[];
  segments: ReturnType<typeof getConstellationSegments>;
  customSegments: ReturnType<typeof getCustomConstellationSegments>;
  draftSegments: ReturnType<typeof getCustomConstellationSegments>;
  selectedObject?: RenderedSkyObject;
  selectedStory?: MythStory;
  visibleTonight: RenderedSkyObject[];
  guidedTargets: GuidedTarget[];
  badges: Badge[];
  dailyChallenges: DailyChallenge[];
  rooms: SkyRoom[];
  currentRoom?: SkyRoom;
  roomChat: ChatMessage[];
  globalChat: ChatMessage[];
  participants: string[];
  callActive: boolean;
  selectedDate: Date;
  liveMode: boolean;
  rotation: number;
  zoom: number;
  viewpoint: Viewpoint;
  highlightedIds: string[];
  selectedObjectNotes: SpaceNote[];
  draftConstellationIds: string[];
  availableViewpoints: typeof viewpoints;
  setRotation: (value: number) => void;
  setZoom: (value: number) => void;
  setSelectedDate: (date: Date) => void;
  setLiveMode: (enabled: boolean) => void;
  setViewpoint: (viewpoint: Viewpoint) => void;
  selectObject: (objectId?: string) => void;
  focusObject: (objectId: string) => void;
  toggleHighlight: (objectId: string) => void;
  addNoteToSelectedObject: (text: string) => void;
  createRoom: (name: string) => string;
  joinRoom: (roomCode: string) => string;
  sendRoomMessage: (text: string) => void;
  sendGlobalMessage: (text: string) => void;
  setCallActive: (active: boolean) => void;
  addStarToDraft: (objectId: string) => void;
  clearDraftConstellation: () => void;
  saveDraftConstellation: (title: string) => void;
};

const SkySyncContext = createContext<SkySyncContextValue | undefined>(undefined);

function clampZoom(value: number) {
  return Math.max(0.85, Math.min(2.5, value));
}

export function SkySyncProvider({ children }: { children: ReactNode }) {
  const [rooms, setRooms] = useState<SkyRoom[]>([]);
  const [globalChat, setGlobalChat] = useState<ChatMessage[]>([]);
  const [currentRoomId, setCurrentRoomId] = useState<string | undefined>(undefined);
  const [selectedObjectId, setSelectedObjectId] = useState<string | undefined>("jupiter");
  const [selectedDate, setSelectedDateState] = useState(new Date());
  const [liveMode, setLiveMode] = useState(true);
  const [rotation, setRotationState] = useState(0);
  const [zoom, setZoomState] = useState(1.08);
  const [viewpoint, setViewpointState] = useState<Viewpoint>("earth");
  const [draftConstellationIds, setDraftConstellationIds] = useState<string[]>([]);

  useEffect(() => roomSyncService.subscribeRooms(setRooms), []);
  useEffect(() => roomSyncService.subscribeGlobalChat(setGlobalChat), []);

  const currentRoom = rooms.find((room) => room.id === currentRoomId);

  useEffect(() => {
    if (!currentRoomId && rooms.length > 0) {
      setCurrentRoomId(rooms[0].id);
    }
  }, [rooms, currentRoomId]);

  useEffect(() => {
    if (!currentRoom) {
      return;
    }
    setRotationState(currentRoom.state.rotation);
    setZoomState(currentRoom.state.zoom);
    setSelectedDateState(new Date(currentRoom.state.dateIso));
  }, [currentRoom?.id, currentRoom?.state.rotation, currentRoom?.state.zoom, currentRoom?.state.dateIso]);

  useEffect(() => {
    if (!liveMode) {
      return;
    }
    const timer = setInterval(() => {
      const now = new Date();
      setSelectedDateState(now);
      if (currentRoom) {
        roomSyncService.updateSkyState(currentRoom.id, { dateIso: now.toISOString() });
      }
    }, 30000);
    return () => clearInterval(timer);
  }, [liveMode, currentRoom?.id]);

  const objects = useMemo(
    () =>
      renderSkyObjects({
        rotation,
        zoom,
        date: selectedDate,
        viewpoint,
      }),
    [rotation, zoom, selectedDate, viewpoint],
  );
  const segments = useMemo(() => getConstellationSegments(objects), [objects]);
  const customSegments = useMemo(
    () => getCustomConstellationSegments(objects, currentRoom?.state.customConstellations ?? []),
    [objects, currentRoom?.state.customConstellations],
  );
  const draftSegments = useMemo(
    () =>
      getCustomConstellationSegments(
        objects,
        draftConstellationIds.length > 1
          ? [
              {
                id: "draft",
                title: "Draft Pattern",
                starIds: draftConstellationIds,
                color: "#ffb15f",
              },
            ]
          : [],
      ),
    [objects, draftConstellationIds],
  );
  const selectedObject = objects.find((object) => object.id === selectedObjectId);
  const selectedStory = useMemo(() => {
    const baseObject = findSkyObject(selectedObject?.id);
    return getStoryForConstellation(baseObject?.constellationId);
  }, [selectedObject?.id]);
  const visibleTonight = useMemo(() => getVisibleThingsTonight(objects), [objects]);
  const highlightedIds = currentRoom?.state.highlightedObjectIds ?? [];
  const selectedObjectNotes = (currentRoom?.state.notes ?? []).filter((note) => note.objectId === selectedObjectId);

  function syncRoomState(partial: Partial<SkyRoom["state"]>) {
    if (!currentRoom) {
      return;
    }
    roomSyncService.updateSkyState(currentRoom.id, partial);
  }

  const value: SkySyncContextValue = {
    objects,
    segments,
    customSegments,
    draftSegments,
    selectedObject,
    selectedStory,
    visibleTonight,
    guidedTargets,
    badges,
    dailyChallenges,
    rooms,
    currentRoom,
    roomChat: currentRoom?.chat ?? [],
    globalChat,
    participants: currentRoom?.state.participants ?? [],
    callActive: currentRoom?.state.callActive ?? false,
    selectedDate,
    liveMode,
    rotation,
    zoom,
    viewpoint,
    highlightedIds,
    selectedObjectNotes,
    draftConstellationIds,
    availableViewpoints: viewpoints,
    setRotation: (value) => {
      const normalized = ((value % 360) + 360) % 360;
      setRotationState(normalized);
      syncRoomState({ rotation: normalized });
    },
    setZoom: (value) => {
      const nextZoom = clampZoom(value);
      setZoomState(nextZoom);
      syncRoomState({ zoom: nextZoom });
    },
    setSelectedDate: (date) => {
      setLiveMode(false);
      setSelectedDateState(date);
      syncRoomState({ dateIso: date.toISOString() });
    },
    setLiveMode,
    setViewpoint: (nextViewpoint) => {
      setViewpointState(nextViewpoint);
    },
    selectObject: (objectId) => {
      setSelectedObjectId(objectId);
    },
    focusObject: (objectId) => {
      const nextRotation = focusRotationForObject(objectId, selectedDate, viewpoint);
      const nextZoom = Math.max(zoom, 1.45);
      setSelectedObjectId(objectId);
      setRotationState(nextRotation);
      setZoomState(nextZoom);
      syncRoomState({ rotation: nextRotation, zoom: nextZoom });
    },
    toggleHighlight: (objectId) => {
      if (!currentRoom) {
        return;
      }
      roomSyncService.toggleHighlight(currentRoom.id, objectId);
    },
    addNoteToSelectedObject: (text) => {
      if (!currentRoom || !selectedObjectId || !text.trim()) {
        return;
      }
      const note: SpaceNote = {
        id: `note-${Date.now()}`,
        objectId: selectedObjectId,
        author: "You",
        text: text.trim(),
      };
      roomSyncService.addNote(currentRoom.id, note);
    },
    createRoom: (name) => {
      const room = roomSyncService.createRoom(name);
      setCurrentRoomId(room.id);
      return room.roomCode;
    },
    joinRoom: (roomCode) => {
      const room = roomSyncService.joinRoom(roomCode);
      if (!room) {
        return "Room not found";
      }
      setCurrentRoomId(room.id);
      return `Joined ${room.roomCode}`;
    },
    sendRoomMessage: (text) => {
      if (!currentRoom || !text.trim()) {
        return;
      }
      roomSyncService.sendRoomMessage(currentRoom.id, {
        id: `room-msg-${Date.now()}`,
        author: "You",
        text: text.trim(),
        timestampLabel: "Now",
      });
    },
    sendGlobalMessage: (text) => {
      if (!text.trim()) {
        return;
      }
      roomSyncService.sendGlobalMessage({
        id: `global-msg-${Date.now()}`,
        author: "You",
        text: text.trim(),
        timestampLabel: "Now",
      });
    },
    setCallActive: (active) => {
      syncRoomState({ callActive: active });
    },
    addStarToDraft: (objectId) => {
      const object = findSkyObject(objectId);
      if (!object || object.kind !== "star") {
        return;
      }
      setDraftConstellationIds((current) => [...current, objectId]);
    },
    clearDraftConstellation: () => {
      setDraftConstellationIds([]);
    },
    saveDraftConstellation: (title) => {
      if (!currentRoom || draftConstellationIds.length < 2) {
        return;
      }
      roomSyncService.addCustomConstellation(currentRoom.id, {
        id: `custom-${Date.now()}`,
        title: title.trim() || "Custom Pattern",
        starIds: draftConstellationIds,
        color: "#73fbd3",
      });
      setDraftConstellationIds([]);
    },
  };

  return <SkySyncContext.Provider value={value}>{children}</SkySyncContext.Provider>;
}

export function useSkySync() {
  const context = useContext(SkySyncContext);
  if (!context) {
    throw new Error("useSkySync must be used inside SkySyncProvider");
  }
  return context;
}

export function useSelectedObjectDetails() {
  const { selectedObject, selectedStory } = useSkySync();
  const baseObject = findSkyObject(selectedObject?.id);
  return {
    object: selectedObject,
    constellationName: getConstellationName(baseObject?.constellationId),
    story: selectedStory,
  };
}
