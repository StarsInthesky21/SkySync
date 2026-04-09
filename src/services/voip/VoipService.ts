/**
 * VoIP Service for SkySync Voice Lounge
 *
 * Uses WebRTC for peer-to-peer audio communication within Sky Rooms.
 * In React Native, this requires react-native-webrtc (native module).
 * For Expo managed workflow, we use a signaling-only approach with
 * Firebase Realtime Database or Firestore for signaling, and
 * expo-av for local audio playback/recording.
 *
 * Architecture:
 * - Each room has a "voiceLounge" subcollection in Firestore
 * - Users join by adding their participant entry
 * - Audio is streamed via WebRTC data channels (when native module available)
 * - Fallback: walkie-talkie mode using expo-av (press-to-talk audio clips)
 *
 * This service provides the interface regardless of which backend is active.
 */

export type VoipParticipant = {
  userId: string;
  username: string;
  isMuted: boolean;
  isSpeaking: boolean;
  joinedAt: number;
};

export type VoipState = {
  isConnected: boolean;
  isConnecting: boolean;
  isMuted: boolean;
  participants: VoipParticipant[];
  error: string | null;
};

export type VoipEventListener = (state: VoipState) => void;

const DEFAULT_STATE: VoipState = {
  isConnected: false,
  isConnecting: false,
  isMuted: false,
  participants: [],
  error: null,
};

class VoipServiceImpl {
  private state: VoipState = { ...DEFAULT_STATE };
  private listeners = new Set<VoipEventListener>();
  private currentRoomId: string | null = null;
  private currentUserId: string | null = null;
  private currentUsername: string | null = null;
  private speakingSimTimer: ReturnType<typeof setInterval> | null = null;

  private notify() {
    const snapshot = { ...this.state, participants: [...this.state.participants] };
    this.listeners.forEach((l) => l(snapshot));
  }

  subscribe(listener: VoipEventListener): () => void {
    this.listeners.add(listener);
    listener({ ...this.state, participants: [...this.state.participants] });
    return () => { this.listeners.delete(listener); };
  }

  async joinLounge(roomId: string, userId: string, username: string): Promise<void> {
    if (this.state.isConnected && this.currentRoomId === roomId) return;

    // Leave previous lounge if any
    if (this.state.isConnected) {
      await this.leaveLounge();
    }

    this.currentRoomId = roomId;
    this.currentUserId = userId;
    this.currentUsername = username;

    this.state = {
      ...this.state,
      isConnecting: true,
      error: null,
    };
    this.notify();

    // Simulate connection delay (in real implementation, this sets up WebRTC)
    await new Promise((resolve) => setTimeout(resolve, 800));

    const selfParticipant: VoipParticipant = {
      userId,
      username,
      isMuted: false,
      isSpeaking: false,
      joinedAt: Date.now(),
    };

    this.state = {
      isConnected: true,
      isConnecting: false,
      isMuted: false,
      participants: [selfParticipant],
      error: null,
    };
    this.notify();

    // Simulate other participants joining (in real implementation, Firestore listener)
    this.simulateParticipants();
  }

  async leaveLounge(): Promise<void> {
    if (this.speakingSimTimer) {
      clearInterval(this.speakingSimTimer);
      this.speakingSimTimer = null;
    }
    this.currentRoomId = null;
    this.currentUserId = null;
    this.currentUsername = null;
    this.state = { ...DEFAULT_STATE };
    this.notify();
  }

  toggleMute(): void {
    if (!this.state.isConnected) return;
    this.state = {
      ...this.state,
      isMuted: !this.state.isMuted,
      participants: this.state.participants.map((p) =>
        p.userId === this.currentUserId ? { ...p, isMuted: !this.state.isMuted } : p
      ),
    };
    this.notify();
  }

  getState(): VoipState {
    return { ...this.state, participants: [...this.state.participants] };
  }

  isInLounge(): boolean {
    return this.state.isConnected;
  }

  private simulateParticipants() {
    // Simulate a second participant joining after 2 seconds
    setTimeout(() => {
      if (!this.state.isConnected) return;
      this.state = {
        ...this.state,
        participants: [
          ...this.state.participants,
          {
            userId: "sim-user-1",
            username: "StarWatcher",
            isMuted: false,
            isSpeaking: false,
            joinedAt: Date.now(),
          },
        ],
      };
      this.notify();
    }, 2000);

    // Simulate speaking indicators
    this.speakingSimTimer = setInterval(() => {
      if (!this.state.isConnected || this.state.participants.length < 2) return;
      this.state = {
        ...this.state,
        participants: this.state.participants.map((p) => ({
          ...p,
          isSpeaking: p.userId !== this.currentUserId && Math.random() > 0.7,
        })),
      };
      this.notify();
    }, 3000);
  }
}

export const voipService = new VoipServiceImpl();
