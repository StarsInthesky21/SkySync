import { initialRooms } from "@/data/skyData";
import { SkyMarker, SkyRoom } from "@/types/rooms";

type Listener = (rooms: SkyRoom[]) => void;

let rooms = [...initialRooms];
const listeners = new Set<Listener>();

function notify() {
  listeners.forEach((listener) => listener([...rooms]));
}

export const roomSyncService = {
  subscribe(listener: Listener) {
    listeners.add(listener);
    listener([...rooms]);
    return () => {
      listeners.delete(listener);
    };
  },
  createRoom(name: string) {
    const newRoom: SkyRoom = {
      id: `room-${Date.now()}`,
      name,
      inviteCode: `SKY-${Math.floor(100 + Math.random() * 899)}`,
      voiceEnabled: true,
      participants: ["You"],
      markers: [],
      pointers: [],
    };
    rooms = [newRoom, ...rooms];
    notify();
    return newRoom;
  },
  joinRoom(inviteCode: string) {
    const existingRoom = rooms.find((room) => room.inviteCode.toLowerCase() === inviteCode.toLowerCase());
    if (!existingRoom) {
      return null;
    }

    if (!existingRoom.participants.includes("You")) {
      existingRoom.participants = [...existingRoom.participants, "You"];
    }
    notify();
    return existingRoom;
  },
  addMarker(roomId: string, marker: SkyMarker) {
    rooms = rooms.map((room) => {
      if (room.id !== roomId) {
        return room;
      }
      return {
        ...room,
        markers: [marker, ...room.markers],
      };
    });
    notify();
  },
};
