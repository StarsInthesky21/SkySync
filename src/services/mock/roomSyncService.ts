import { formatTimestamp, initialGlobalChat, initialRooms } from "@/data/skyData";
import { ChatMessage, CustomConstellation, RoomSkyState, SkyRoom, SpaceNote } from "@/types/rooms";

type RoomsListener = (rooms: SkyRoom[]) => void;
type GlobalChatListener = (messages: ChatMessage[]) => void;

let rooms = [...initialRooms];
let globalChat = [...initialGlobalChat];

const roomListeners = new Set<RoomsListener>();
const globalChatListeners = new Set<GlobalChatListener>();

function notifyRooms() {
  roomListeners.forEach((listener) => listener([...rooms]));
}

function notifyGlobalChat() {
  globalChatListeners.forEach((listener) => listener([...globalChat]));
}

function updateRoom(roomId: string, updater: (room: SkyRoom) => SkyRoom) {
  rooms = rooms.map((room) => (room.id === roomId ? updater(room) : room));
  notifyRooms();
}

export const roomSyncService = {
  subscribeRooms(listener: RoomsListener) {
    roomListeners.add(listener);
    listener([...rooms]);
    return () => {
      roomListeners.delete(listener);
    };
  },
  subscribeGlobalChat(listener: GlobalChatListener) {
    globalChatListeners.add(listener);
    listener([...globalChat]);
    return () => {
      globalChatListeners.delete(listener);
    };
  },
  createRoom(name: string) {
    const now = Date.now();
    const room: SkyRoom = {
      id: `room-${now}`,
      roomCode: `SKY-${Math.floor(100 + Math.random() * 900)}${String.fromCharCode(65 + Math.floor(Math.random() * 26))}`,
      name,
      state: {
        rotation: 0,
        zoom: 1,
        dateIso: new Date().toISOString(),
        highlightedObjectIds: [],
        notes: [],
        customConstellations: [],
        callActive: false,
        participants: ["You"],
      },
      chat: [
        {
          id: `chat-${now}`,
          author: "SkySync",
          text: "Room created. Invite your friends to stargaze together.",
          timestampLabel: formatTimestamp(now),
          timestamp: now,
        },
      ],
    };
    rooms = [room, ...rooms];
    notifyRooms();
    return room;
  },
  joinRoom(roomCode: string) {
    const room = rooms.find((entry) => entry.roomCode.toLowerCase() === roomCode.toLowerCase()) ?? null;
    if (!room) {
      return null;
    }
    updateRoom(room.id, (current) => ({
      ...current,
      state: {
        ...current.state,
        participants: current.state.participants.includes("You")
          ? current.state.participants
          : [...current.state.participants, "You"],
      },
    }));
    return room;
  },
  updateSkyState(roomId: string, partial: Partial<RoomSkyState>) {
    updateRoom(roomId, (room) => ({
      ...room,
      state: {
        ...room.state,
        ...partial,
      },
    }));
  },
  toggleHighlight(roomId: string, objectId: string) {
    updateRoom(roomId, (room) => {
      const exists = room.state.highlightedObjectIds.includes(objectId);
      return {
        ...room,
        state: {
          ...room.state,
          highlightedObjectIds: exists
            ? room.state.highlightedObjectIds.filter((id) => id !== objectId)
            : [...room.state.highlightedObjectIds, objectId],
        },
      };
    });
  },
  addNote(roomId: string, note: SpaceNote) {
    updateRoom(roomId, (room) => ({
      ...room,
      state: {
        ...room.state,
        notes: [note, ...room.state.notes],
      },
    }));
  },
  addCustomConstellation(roomId: string, constellation: CustomConstellation) {
    updateRoom(roomId, (room) => ({
      ...room,
      state: {
        ...room.state,
        customConstellations: [constellation, ...room.state.customConstellations],
      },
    }));
  },
  sendRoomMessage(roomId: string, message: ChatMessage) {
    updateRoom(roomId, (room) => ({
      ...room,
      chat: [...room.chat, message],
    }));
  },
  sendGlobalMessage(message: ChatMessage) {
    globalChat = [...globalChat, message];
    notifyGlobalChat();
  },
};
