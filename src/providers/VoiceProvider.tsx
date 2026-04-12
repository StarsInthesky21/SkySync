import {
  createContext,
  ReactNode,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useRef,
  useState,
} from "react";
import { voiceSession, type VoiceParticipant } from "@/services/voice/livekitService";
import { fetchVoiceToken } from "@/services/voice/tokenProvider";
import {
  reconcileParticipants,
  type ReconciledParticipant,
  type RoomMember,
} from "@/services/voice/reconciliation";

export type VoiceState = {
  available: boolean;
  connecting: boolean;
  connected: boolean;
  participants: VoiceParticipant[];
  activeSpeakerId: string | null;
  quality: "excellent" | "good" | "poor" | "unknown";
  localMuted: boolean;
  error: string | null;
};

type VoiceContextValue = VoiceState & {
  connect: (args: { roomId: string; userId: string; displayName: string }) => Promise<void>;
  leave: () => Promise<void>;
  toggleMute: () => Promise<void>;
  setPushToTalk: (active: boolean) => Promise<void>;
  reconciled: (members: RoomMember[]) => ReconciledParticipant[];
};

const INITIAL: VoiceState = {
  available: voiceSession.available,
  connecting: false,
  connected: false,
  participants: [],
  activeSpeakerId: null,
  quality: "unknown",
  localMuted: false,
  error: null,
};

const VoiceContext = createContext<VoiceContextValue | undefined>(undefined);

export function VoiceProvider({ children }: { children: ReactNode }) {
  const [state, setState] = useState<VoiceState>(INITIAL);
  const mounted = useRef(true);

  useEffect(() => {
    mounted.current = true;
    const unsub = voiceSession.subscribe((event) => {
      if (!mounted.current) return;
      setState((prev) => {
        switch (event.type) {
          case "participantsChanged": {
            const local = event.participants.find((p) => p.isLocal);
            return {
              ...prev,
              participants: event.participants,
              localMuted: local?.muted ?? prev.localMuted,
            };
          }
          case "connectionStateChanged":
            return { ...prev, connected: event.connected, quality: event.quality, connecting: false };
          case "activeSpeaker":
            return { ...prev, activeSpeakerId: event.participantId };
          case "error":
            return { ...prev, error: event.message };
        }
      });
    });
    return () => {
      mounted.current = false;
      unsub();
    };
  }, []);

  const connect = useCallback(
    async ({ roomId, userId, displayName }: { roomId: string; userId: string; displayName: string }) => {
      setState((prev) => ({ ...prev, connecting: true, error: null }));
      try {
        if (!voiceSession.available) {
          throw new Error("VOICE_UNAVAILABLE");
        }
        const { token, livekitUrl } = await fetchVoiceToken(roomId, userId, displayName);
        await voiceSession.connect(livekitUrl, token, displayName);
      } catch (err) {
        const message = err instanceof Error ? err.message : "CONNECT_FAILED";
        setState((prev) => ({ ...prev, connecting: false, error: message, connected: false }));
        throw err;
      }
    },
    [],
  );

  const leave = useCallback(async () => {
    await voiceSession.leave();
    setState((prev) => ({ ...prev, connected: false, connecting: false, participants: [] }));
  }, []);

  const toggleMute = useCallback(async () => {
    const muted = await voiceSession.toggleMute();
    setState((prev) => ({ ...prev, localMuted: muted }));
  }, []);

  const setPushToTalk = useCallback(async (active: boolean) => {
    await voiceSession.setPushToTalk(active);
    setState((prev) => ({ ...prev, localMuted: !active }));
  }, []);

  const reconciled = useCallback(
    (members: RoomMember[]) => reconcileParticipants(members, state.participants),
    [state.participants],
  );

  const value: VoiceContextValue = useMemo(
    () => ({ ...state, connect, leave, toggleMute, setPushToTalk, reconciled }),
    [state, connect, leave, toggleMute, setPushToTalk, reconciled],
  );

  return <VoiceContext.Provider value={value}>{children}</VoiceContext.Provider>;
}

export function useVoice() {
  const ctx = useContext(VoiceContext);
  if (!ctx) {
    throw new Error("useVoice must be used within a VoiceProvider");
  }
  return ctx;
}
