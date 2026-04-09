export type SpaceNote = {
  id: string;
  objectId: string;
  author: string;
  text: string;
};

export type ChatMessage = {
  id: string;
  author: string;
  text: string;
  timestampLabel: string;
  timestamp: number;
};

export type CustomConstellation = {
  id: string;
  title: string;
  starIds: string[];
  color: string;
};

export type RoomSkyState = {
  rotation: number;
  zoom: number;
  dateIso: string;
  highlightedObjectIds: string[];
  notes: SpaceNote[];
  customConstellations: CustomConstellation[];
  callActive: boolean;
  participants: string[];
};

export type SkyRoom = {
  id: string;
  roomCode: string;
  name: string;
  state: RoomSkyState;
  chat: ChatMessage[];
};
