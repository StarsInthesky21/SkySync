import Constants from "expo-constants";
import { ChatMessage, CustomConstellation, RoomSkyState, SkyRoom, SpaceNote } from "@/types/rooms";

export type RoomSyncService = {
  subscribeRooms: (listener: (rooms: SkyRoom[]) => void) => () => void;
  subscribeRoomChat?: (roomId: string, listener: (messages: ChatMessage[]) => void) => () => void;
  subscribeGlobalChat: (listener: (messages: ChatMessage[]) => void) => () => void;
  createRoom: (name: string) => SkyRoom | Promise<SkyRoom>;
  joinRoom: (roomCode: string) => SkyRoom | null | Promise<SkyRoom | null>;
  updateSkyState: (roomId: string, partial: Partial<RoomSkyState>) => void | Promise<void>;
  toggleHighlight: (roomId: string, objectId: string) => void | Promise<void>;
  addNote: (roomId: string, note: SpaceNote) => void | Promise<void>;
  addCustomConstellation: (roomId: string, constellation: CustomConstellation) => void | Promise<void>;
  sendRoomMessage: (roomId: string, message: ChatMessage) => void | Promise<void>;
  sendGlobalMessage: (message: ChatMessage) => void | Promise<void>;
};

// Controlled via app.json extra.firebaseEnabled
// For EAS builds, use app.config.js to read from env vars
const configEnabled = Constants.expoConfig?.extra?.firebaseEnabled === true;
const hasCredentials = Boolean(Constants.expoConfig?.extra?.firebaseApiKey);

// Only truly enable Firebase when the flag is on AND real credentials exist.
// This prevents hangs when firebaseEnabled=true but keys are empty strings.
const useFirebase = configEnabled && hasCredentials;

// Dynamic import based on config flag
// When useFirebase is true, use real Firestore backend
// When false, use in-memory mock for development/testing
const serviceModule = useFirebase ? require("./firebase/roomSyncService") : require("./mock/roomSyncService");

export const roomSyncService = serviceModule.roomSyncService as RoomSyncService;

export const isFirebaseEnabled = useFirebase;
