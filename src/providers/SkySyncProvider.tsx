import { createContext, ReactNode, useContext, useEffect, useState } from "react";
import { achievements, discoverySuggestions, spaceEvents } from "@/data/skyData";
import { useSkyOrientation } from "@/hooks/useSkyOrientation";
import { buildVisibleSky, findCelestialObject } from "@/services/skyEngine";
import { roomSyncService } from "@/services/mock/roomSyncService";
import { CelestialObject, DiscoverySuggestion, SpaceEvent } from "@/types/sky";
import { Achievement, SkyMarker, SkyRoom } from "@/types/rooms";

type SkySyncContextValue = {
  activeObject?: CelestialObject;
  objects: CelestialObject[];
  rooms: SkyRoom[];
  selectedRoom?: SkyRoom;
  suggestions: DiscoverySuggestion[];
  events: SpaceEvent[];
  achievements: Achievement[];
  hourOffset: number;
  orientation: ReturnType<typeof useSkyOrientation>;
  setActiveObject: (objectId?: string) => void;
  setHourOffset: (nextValue: number) => void;
  createRoom: (name: string) => void;
  joinRoom: (inviteCode: string) => string;
  addMarkerToActiveRoom: (title: string, note: string, objectId?: string) => void;
  selectRoom: (roomId: string) => void;
};

const SkySyncContext = createContext<SkySyncContextValue | undefined>(undefined);

export function SkySyncProvider({ children }: { children: ReactNode }) {
  const orientation = useSkyOrientation();
  const [rooms, setRooms] = useState<SkyRoom[]>([]);
  const [selectedRoomId, setSelectedRoomId] = useState<string | undefined>(undefined);
  const [activeObjectId, setActiveObjectId] = useState<string | undefined>("mars");
  const [hourOffset, setHourOffset] = useState(0);

  useEffect(() => roomSyncService.subscribe(setRooms), []);

  useEffect(() => {
    if (!selectedRoomId && rooms.length > 0) {
      setSelectedRoomId(rooms[0].id);
    }
  }, [rooms, selectedRoomId]);

  const objects = buildVisibleSky(hourOffset);
  const activeObject = objects.find((item) => item.id === activeObjectId);
  const selectedRoom = rooms.find((room) => room.id === selectedRoomId);

  const value: SkySyncContextValue = {
    activeObject,
    objects,
    rooms,
    selectedRoom,
    suggestions: discoverySuggestions,
    events: spaceEvents,
    achievements,
    hourOffset,
    orientation,
    setActiveObject: (objectId) => setActiveObjectId(objectId),
    setHourOffset,
    createRoom: (name) => {
      const room = roomSyncService.createRoom(name);
      setSelectedRoomId(room.id);
    },
    joinRoom: (inviteCode) => {
      const room = roomSyncService.joinRoom(inviteCode);
      if (!room) {
        return "Room not found";
      }
      setSelectedRoomId(room.id);
      return `Joined ${room.name}`;
    },
    addMarkerToActiveRoom: (title, note, objectId) => {
      if (!selectedRoom) {
        return;
      }

      const target = findCelestialObject(objectId);
      const marker: SkyMarker = {
        id: `marker-${Date.now()}`,
        title,
        note,
        objectId,
        color: target?.color ?? "#73fbd3",
      };
      roomSyncService.addMarker(selectedRoom.id, marker);
    },
    selectRoom: setSelectedRoomId,
  };

  return <SkySyncContext.Provider value={value}>{children}</SkySyncContext.Provider>;
}

export function useSkySync() {
  const context = useContext(SkySyncContext);
  if (!context) {
    throw new Error("useSkySync must be used within SkySyncProvider");
  }
  return context;
}
