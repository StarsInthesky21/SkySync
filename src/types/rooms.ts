export type FriendPointer = {
  id: string;
  name: string;
  azimuth: number;
  elevation: number;
  color: string;
};

export type SkyMarker = {
  id: string;
  objectId?: string;
  title: string;
  note: string;
  color: string;
};

export type SkyRoom = {
  id: string;
  name: string;
  inviteCode: string;
  voiceEnabled: boolean;
  participants: string[];
  markers: SkyMarker[];
  pointers: FriendPointer[];
};

export type Achievement = {
  id: string;
  title: string;
  progressLabel: string;
};
