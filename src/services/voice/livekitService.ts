/**
 * livekitService.ts
 *
 * Production VoIP layer. Thin wrapper around `@livekit/react-native` with a
 * graceful fallback so the app still runs in Expo Go (where the native
 * WebRTC module is absent).
 *
 * Install for dev-client / EAS build:
 *   npm install @livekit/react-native @livekit/react-native-webrtc livekit-client
 *
 * Then register the plugin in app.json:
 *   "plugins": [["@livekit/react-native-expo-plugin"], ...]
 */

type Room = any;

let livekit: any = null;
let nativeModuleAvailable = false;

try {
  // eslint-disable-next-line @typescript-eslint/no-require-imports
  livekit = require("livekit-client");
  nativeModuleAvailable = !!livekit?.Room;
} catch {
  nativeModuleAvailable = false;
}

export type VoiceParticipant = {
  id: string;
  name: string;
  speaking: boolean;
  muted: boolean;
  audioLevel: number;
  isLocal: boolean;
};

export type VoiceEvent =
  | { type: "participantsChanged"; participants: VoiceParticipant[] }
  | { type: "connectionStateChanged"; connected: boolean; quality: "excellent" | "good" | "poor" | "unknown" }
  | { type: "activeSpeaker"; participantId: string | null }
  | { type: "error"; message: string };

export type VoiceListener = (event: VoiceEvent) => void;

export class VoiceSession {
  private room: Room | null = null;
  private listeners = new Set<VoiceListener>();
  private participants = new Map<string, VoiceParticipant>();

  readonly available = nativeModuleAvailable;

  subscribe(listener: VoiceListener): () => void {
    this.listeners.add(listener);
    return () => this.listeners.delete(listener);
  }

  private emit(event: VoiceEvent) {
    for (const l of this.listeners) {
      try {
        l(event);
      } catch {
        // ignore bad listeners
      }
    }
  }

  private publishParticipants() {
    const list = Array.from(this.participants.values());
    this.emit({ type: "participantsChanged", participants: list });
  }

  async connect(url: string, token: string, displayName: string): Promise<void> {
    if (!nativeModuleAvailable) {
      throw new Error("VOICE_UNAVAILABLE");
    }
    const { Room, RoomEvent, ConnectionQuality } = livekit;
    this.room = new Room({ adaptiveStream: true, dynacast: true });

    const room: Room = this.room;
    room.on(RoomEvent.Connected, () => {
      this.emit({ type: "connectionStateChanged", connected: true, quality: "good" });
    });
    room.on(RoomEvent.Disconnected, () => {
      this.emit({ type: "connectionStateChanged", connected: false, quality: "unknown" });
      this.participants.clear();
      this.publishParticipants();
    });
    room.on(RoomEvent.ConnectionQualityChanged, (q: any) => {
      const map: Record<string, VoiceEvent extends { quality: infer Q } ? Q : never> = {
        [ConnectionQuality.Excellent]: "excellent",
        [ConnectionQuality.Good]: "good",
        [ConnectionQuality.Poor]: "poor",
        [ConnectionQuality.Unknown]: "unknown",
      } as any;
      this.emit({ type: "connectionStateChanged", connected: true, quality: map[q] ?? "unknown" });
    });
    room.on(RoomEvent.ParticipantConnected, (p: any) => {
      this.participants.set(p.identity, toParticipant(p, false));
      this.publishParticipants();
    });
    room.on(RoomEvent.ParticipantDisconnected, (p: any) => {
      this.participants.delete(p.identity);
      this.publishParticipants();
    });
    room.on(RoomEvent.ActiveSpeakersChanged, (speakers: any[]) => {
      const top = speakers[0]?.identity ?? null;
      this.emit({ type: "activeSpeaker", participantId: top });
      for (const [id, p] of this.participants) {
        p.speaking = speakers.some((s) => s.identity === id);
      }
      this.publishParticipants();
    });
    room.on(RoomEvent.TrackMuted, () => this.publishParticipants());
    room.on(RoomEvent.TrackUnmuted, () => this.publishParticipants());

    await room.connect(url, token);
    await room.localParticipant.setMicrophoneEnabled(true);
    this.participants.set(room.localParticipant.identity, {
      id: room.localParticipant.identity,
      name: displayName,
      speaking: false,
      muted: false,
      audioLevel: 0,
      isLocal: true,
    });
    // seed remote participants that were already there
    room.remoteParticipants.forEach((p: any) => {
      this.participants.set(p.identity, toParticipant(p, false));
    });
    this.publishParticipants();
  }

  async leave(): Promise<void> {
    if (!this.room) return;
    try {
      await this.room.disconnect();
    } catch {
      // ignore
    }
    this.room = null;
    this.participants.clear();
    this.publishParticipants();
  }

  async toggleMute(): Promise<boolean> {
    if (!this.room) return false;
    const local = this.room.localParticipant;
    const enabled = await local.setMicrophoneEnabled(!local.isMicrophoneEnabled);
    const current = this.participants.get(local.identity);
    if (current) {
      current.muted = !enabled;
      this.publishParticipants();
    }
    return !enabled;
  }

  async setPushToTalk(active: boolean): Promise<void> {
    if (!this.room) return;
    await this.room.localParticipant.setMicrophoneEnabled(active);
    const current = this.participants.get(this.room.localParticipant.identity);
    if (current) {
      current.muted = !active;
      this.publishParticipants();
    }
  }

  getParticipants(): VoiceParticipant[] {
    return Array.from(this.participants.values());
  }
}

function toParticipant(p: any, isLocal: boolean): VoiceParticipant {
  return {
    id: p.identity,
    name: p.name ?? p.identity,
    speaking: p.isSpeaking ?? false,
    muted: !p.isMicrophoneEnabled,
    audioLevel: p.audioLevel ?? 0,
    isLocal,
  };
}

export const voiceSession = new VoiceSession();
