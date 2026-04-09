import {
  collection,
  doc,
  addDoc,
  getDoc,
  getDocs,
  updateDoc,
  onSnapshot,
  query,
  where,
  orderBy,
  limit,
  serverTimestamp,
  arrayUnion,
  arrayRemove,
  Timestamp,
} from "firebase/firestore";
import { db } from "./config";
import { authService } from "./authService";
import { formatTimestamp } from "@/data/skyData";
import { ChatMessage, CustomConstellation, RoomSkyState, SkyRoom, SpaceNote } from "@/types/rooms";

type RoomsListener = (rooms: SkyRoom[]) => void;
type GlobalChatListener = (messages: ChatMessage[]) => void;

function firestoreTimestampToNumber(ts: unknown): number {
  if (ts instanceof Timestamp) return ts.toMillis();
  if (typeof ts === "number") return ts;
  return Date.now();
}

function mapRoomDoc(docId: string, data: Record<string, unknown>): SkyRoom {
  const state = (data.state ?? {}) as Record<string, unknown>;
  return {
    id: docId,
    roomCode: (data.roomCode as string) ?? "",
    name: (data.name as string) ?? "",
    createdBy: (data.createdBy as string) ?? "",
    createdAt: firestoreTimestampToNumber(data.createdAt),
    state: {
      rotation: (state.rotation as number) ?? 0,
      zoom: (state.zoom as number) ?? 1,
      dateIso: (state.dateIso as string) ?? new Date().toISOString(),
      highlightedObjectIds: (state.highlightedObjectIds as string[]) ?? [],
      notes: (state.notes as SpaceNote[]) ?? [],
      customConstellations: (state.customConstellations as CustomConstellation[]) ?? [],
      callActive: (state.callActive as boolean) ?? false,
      participants: (state.participants as string[]) ?? [],
    },
    chat: [],
  };
}

function mapChatMessage(docId: string, data: Record<string, unknown>): ChatMessage {
  const ts = firestoreTimestampToNumber(data.timestamp);
  return {
    id: docId,
    author: (data.author as string) ?? "Unknown",
    authorId: (data.authorId as string) ?? "",
    text: (data.text as string) ?? "",
    timestamp: ts,
    timestampLabel: formatTimestamp(ts),
  };
}

// Debounce utility for throttling sky state updates
let skyStateTimeout: ReturnType<typeof setTimeout> | null = null;
let pendingSkyState: { roomId: string; partial: Partial<RoomSkyState> } | null = null;

function flushSkyState() {
  if (!pendingSkyState) return;
  const { roomId, partial } = pendingSkyState;
  pendingSkyState = null;

  const updates: { [key: string]: unknown } = {};
  for (const [key, value] of Object.entries(partial)) {
    updates[`state.${key}`] = value;
  }
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  updateDoc(doc(db, "rooms", roomId), updates as any).catch((error) => {
    console.warn("[SkySync Firebase] Failed to update sky state:", error);
  });
}

export const roomSyncService = {
  subscribeRooms(listener: RoomsListener): () => void {
    const userId = authService.getCurrentUserId();
    // Query rooms the user is participating in, or all rooms if no auth yet
    const roomsRef = collection(db, "rooms");
    const q = userId
      ? query(roomsRef, where("state.participants", "array-contains", userId))
      : query(roomsRef, limit(20));

    return onSnapshot(q, (snapshot) => {
      const rooms: SkyRoom[] = snapshot.docs.map((d) =>
        mapRoomDoc(d.id, d.data() as Record<string, unknown>)
      );
      listener(rooms);
    }, (error) => {
      console.warn("[SkySync Firebase] Rooms listener error:", error);
    });
  },

  subscribeRoomChat(roomId: string, listener: (messages: ChatMessage[]) => void): () => void {
    const chatRef = collection(db, "rooms", roomId, "chat");
    const q = query(chatRef, orderBy("timestamp", "asc"), limit(100));

    return onSnapshot(q, (snapshot) => {
      const messages: ChatMessage[] = snapshot.docs.map((d) =>
        mapChatMessage(d.id, d.data() as Record<string, unknown>)
      );
      listener(messages);
    }, (error) => {
      console.warn("[SkySync Firebase] Chat listener error:", error);
    });
  },

  subscribeGlobalChat(listener: GlobalChatListener): () => void {
    const chatRef = collection(db, "globalChat");
    const q = query(chatRef, orderBy("timestamp", "asc"), limit(100));

    return onSnapshot(q, (snapshot) => {
      const messages: ChatMessage[] = snapshot.docs.map((d) =>
        mapChatMessage(d.id, d.data() as Record<string, unknown>)
      );
      listener(messages);
    }, (error) => {
      console.warn("[SkySync Firebase] Global chat listener error:", error);
    });
  },

  async createRoom(name: string): Promise<SkyRoom> {
    const userId = authService.getCurrentUserId() ?? "anonymous";
    const roomCode = `SKY-${Math.floor(100 + Math.random() * 900)}${String.fromCharCode(65 + Math.floor(Math.random() * 26))}`;
    const now = Date.now();

    const roomData = {
      roomCode,
      name,
      createdBy: userId,
      createdAt: serverTimestamp(),
      state: {
        rotation: 0,
        zoom: 1,
        dateIso: new Date().toISOString(),
        highlightedObjectIds: [],
        notes: [],
        customConstellations: [],
        callActive: false,
        participants: [userId],
      },
    };

    const docRef = await addDoc(collection(db, "rooms"), roomData);

    // Add welcome message to chat subcollection
    await addDoc(collection(db, "rooms", docRef.id, "chat"), {
      author: "SkySync",
      authorId: "system",
      text: "Room created. Invite your friends to stargaze together.",
      timestamp: serverTimestamp(),
    });

    return {
      id: docRef.id,
      roomCode,
      name,
      createdBy: userId,
      createdAt: now,
      state: roomData.state,
      chat: [],
    };
  },

  async joinRoom(roomCode: string): Promise<SkyRoom | null> {
    const userId = authService.getCurrentUserId() ?? "anonymous";
    const roomsRef = collection(db, "rooms");
    const q = query(roomsRef, where("roomCode", "==", roomCode.toUpperCase()));

    try {
      const snapshot = await getDocs(q);
      if (snapshot.empty) return null;

      const roomDoc = snapshot.docs[0];
      const roomId = roomDoc.id;

      // Add user to participants
      await updateDoc(doc(db, "rooms", roomId), {
        "state.participants": arrayUnion(userId),
      });

      return mapRoomDoc(roomId, roomDoc.data() as Record<string, unknown>);
    } catch (error) {
      console.warn("[SkySync Firebase] Failed to join room:", error);
      return null;
    }
  },

  updateSkyState(roomId: string, partial: Partial<RoomSkyState>): void {
    // Debounce to avoid hammering Firestore during drag gestures
    pendingSkyState = { roomId, partial: { ...pendingSkyState?.partial, ...partial } };
    if (skyStateTimeout) clearTimeout(skyStateTimeout);
    skyStateTimeout = setTimeout(flushSkyState, 250);
  },

  async toggleHighlight(roomId: string, objectId: string): Promise<void> {
    try {
      const roomRef = doc(db, "rooms", roomId);
      const snap = await getDoc(roomRef);
      if (!snap.exists()) return;

      const data = snap.data();
      const highlighted: string[] = data?.state?.highlightedObjectIds ?? [];

      if (highlighted.includes(objectId)) {
        await updateDoc(roomRef, {
          "state.highlightedObjectIds": arrayRemove(objectId),
        });
      } else {
        await updateDoc(roomRef, {
          "state.highlightedObjectIds": arrayUnion(objectId),
        });
      }
    } catch (error) {
      console.warn("[SkySync Firebase] Failed to toggle highlight:", error);
    }
  },

  async addNote(roomId: string, note: SpaceNote): Promise<void> {
    try {
      await updateDoc(doc(db, "rooms", roomId), {
        "state.notes": arrayUnion(note),
      });
    } catch (error) {
      console.warn("[SkySync Firebase] Failed to add note:", error);
    }
  },

  async addCustomConstellation(roomId: string, constellation: CustomConstellation): Promise<void> {
    try {
      await updateDoc(doc(db, "rooms", roomId), {
        "state.customConstellations": arrayUnion(constellation),
      });
    } catch (error) {
      console.warn("[SkySync Firebase] Failed to add constellation:", error);
    }
  },

  async sendRoomMessage(roomId: string, message: ChatMessage): Promise<void> {
    try {
      const userId = authService.getCurrentUserId() ?? "anonymous";
      await addDoc(collection(db, "rooms", roomId, "chat"), {
        author: message.author,
        authorId: userId,
        text: message.text,
        timestamp: serverTimestamp(),
      });
    } catch (error) {
      console.warn("[SkySync Firebase] Failed to send room message:", error);
    }
  },

  async sendGlobalMessage(message: ChatMessage): Promise<void> {
    try {
      const userId = authService.getCurrentUserId() ?? "anonymous";
      await addDoc(collection(db, "globalChat"), {
        author: message.author,
        authorId: userId,
        text: message.text,
        timestamp: serverTimestamp(),
      });
    } catch (error) {
      console.warn("[SkySync Firebase] Failed to send global message:", error);
    }
  },
};
