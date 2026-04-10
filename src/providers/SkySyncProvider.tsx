import { createContext, ReactNode, useContext, useEffect, useMemo, useRef, useState, useCallback } from "react";
import { LIVE_MODE_INTERVAL_MS, MAX_MESSAGE_LENGTH, MAX_NAME_LENGTH, MAX_USERNAME_LENGTH, MESSAGE_RATE_LIMIT_MS } from "@/constants";
import { badges as badgeDefinitions, dailyChallenges, formatTimestamp, guidedTargets, viewpoints } from "@/data/skyData";
import { roomSyncService, isFirebaseEnabled } from "@/services/roomSyncService";
import { QueuedAction } from "@/services/offlineQueue";
import { storage, UserProfile, BadgeProgress, ChallengeProgress } from "@/services/storage";
import { useAuth } from "@/providers/AuthProvider";
import {
  findSkyObject,
  focusRotationForObject,
  getConstellationName,
  getConstellationSegments,
  getCustomConstellationSegments,
  getStoryForConstellation,
  getVisibleThingsTonight,
  renderSkyObjects,
} from "@/services/skyEngine";
import { ChatMessage, RoomSkyState, SkyRoom, SpaceNote } from "@/types/rooms";
import { Badge, DailyChallenge, GuidedTarget, MythStory, RenderedSkyObject, Viewpoint } from "@/types/sky";

type SkySyncContextValue = {
  objects: RenderedSkyObject[];
  segments: ReturnType<typeof getConstellationSegments>;
  customSegments: ReturnType<typeof getCustomConstellationSegments>;
  draftSegments: ReturnType<typeof getCustomConstellationSegments>;
  selectedObject?: RenderedSkyObject;
  selectedStory?: MythStory;
  visibleTonight: RenderedSkyObject[];
  guidedTargets: GuidedTarget[];
  badges: Badge[];
  dailyChallenges: DailyChallenge[];
  rooms: SkyRoom[];
  currentRoom?: SkyRoom;
  roomChat: ChatMessage[];
  globalChat: ChatMessage[];
  participants: string[];
  callActive: boolean;
  selectedDate: Date;
  liveMode: boolean;
  rotation: number;
  zoom: number;
  viewpoint: Viewpoint;
  highlightedIds: string[];
  selectedObjectNotes: SpaceNote[];
  draftConstellationIds: string[];
  availableViewpoints: typeof viewpoints;
  isLoading: boolean;
  userProfile: UserProfile | null;
  badgeProgress: BadgeProgress;
  challengeProgress: ChallengeProgress;
  setRotation: (value: number) => void;
  setZoom: (value: number) => void;
  setSelectedDate: (date: Date) => void;
  setLiveMode: (enabled: boolean) => void;
  setViewpoint: (viewpoint: Viewpoint) => void;
  selectObject: (objectId?: string) => void;
  focusObject: (objectId: string) => void;
  toggleHighlight: (objectId: string) => Promise<boolean>;
  addNoteToSelectedObject: (text: string) => Promise<boolean>;
  createRoom: (name: string) => Promise<string>;
  joinRoom: (roomCode: string) => Promise<string>;
  sendRoomMessage: (text: string) => Promise<boolean>;
  sendGlobalMessage: (text: string) => Promise<boolean>;
  setCallActive: (active: boolean) => void;
  addStarToDraft: (objectId: string) => void;
  clearDraftConstellation: () => void;
  saveDraftConstellation: (title: string) => Promise<boolean>;
  updateUsername: (name: string) => void;
  completeChallenge: (challengeId: string) => void;
  processQueuedAction: (action: QueuedAction) => Promise<boolean>;
};

const SkySyncContext = createContext<SkySyncContextValue | undefined>(undefined);

function clampZoom(value: number) {
  return Math.max(0.85, Math.min(2.5, value));
}

const DEFAULT_BADGE_PROGRESS: BadgeProgress = {
  planetsDiscovered: [],
  constellationsTraced: [],
  satellitesTracked: [],
};

const DEFAULT_CHALLENGE_PROGRESS: ChallengeProgress = {
  completedIds: [],
  lastResetDate: new Date().toISOString().slice(0, 10),
  totalXpEarned: 0,
};

let constellationCounter = 0;

export function SkySyncProvider({ children }: { children: ReactNode }) {
  const { user } = useAuth();
  const userId = user?.uid ?? "local-user";

  const [rooms, setRooms] = useState<SkyRoom[]>([]);
  const [globalChat, setGlobalChat] = useState<ChatMessage[]>([]);
  const [currentRoomId, setCurrentRoomId] = useState<string | undefined>(undefined);
  const [selectedObjectId, setSelectedObjectId] = useState<string | undefined>("jupiter");
  const [selectedDate, setSelectedDateState] = useState(new Date());
  const [liveMode, setLiveMode] = useState(true);
  const [rotation, setRotationState] = useState(0);
  const [zoom, setZoomState] = useState(1.08);
  const [viewpoint, setViewpointState] = useState<Viewpoint>("earth");
  const [draftConstellationIds, setDraftConstellationIds] = useState<string[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [userProfile, setUserProfile] = useState<UserProfile | null>(null);
  const [badgeProgress, setBadgeProgress] = useState<BadgeProgress>(DEFAULT_BADGE_PROGRESS);
  const [challengeProgress, setChallengeProgress] = useState<ChallengeProgress>(DEFAULT_CHALLENGE_PROGRESS);
  const [observerLocation, setObserverLocation] = useState<{ latitude?: number; longitude?: number }>({});
  const settingsHydratedRef = useRef(false);

  // Refs for stable access in callbacks without stale closures
  const currentRoomIdRef = useRef(currentRoomId);
  currentRoomIdRef.current = currentRoomId;

  // Load persisted data on mount - local first, then sync with Firestore if enabled
  useEffect(() => {
    let mounted = true;
    async function loadData() {
      try {
        // Always load from local storage first (instant)
        const [profile, badges, challenges, settings] = await Promise.all([
          storage.getUserProfile(),
          storage.getBadgeProgress(),
          storage.getChallengeProgress(),
          storage.getSettings(),
        ]);
        if (!mounted) return;

        setUserProfile(profile);
        setBadgeProgress(badges);

        // Reset daily challenges if day changed
        const today = new Date().toISOString().slice(0, 10);
        if (challenges.lastResetDate !== today) {
          const reset: ChallengeProgress = { completedIds: [], lastResetDate: today, totalXpEarned: challenges.totalXpEarned };
          setChallengeProgress(reset);
          storage.saveChallengeProgress(reset);
        } else {
          setChallengeProgress(challenges);
        }

        if (viewpoints.some((item) => item.id === settings.lastViewpoint)) {
          setViewpointState(settings.lastViewpoint as Viewpoint);
        }
        if (settings.latitude != null && settings.longitude != null) {
          setObserverLocation({ latitude: settings.latitude, longitude: settings.longitude });
        }
        settingsHydratedRef.current = true;

        // If Firebase is enabled, also sync profile to Firestore
        if (isFirebaseEnabled && userId !== "local-user") {
          try {
            const { userService } = await import("@/services/firebase/userService");
            const firestoreProfile = await userService.getUserProfile(userId);
            if (firestoreProfile && mounted) {
              // Merge: Firestore profile takes precedence if newer
              setUserProfile(firestoreProfile);
              storage.saveUserProfile(firestoreProfile);
            } else if (!firestoreProfile) {
              // First time: push local profile to Firestore
              await userService.saveUserProfile(userId, profile);
            }
          } catch (error) {
            console.warn("[SkySync] Firestore sync failed, using local data:", error);
          }
        }
      } catch (error) {
        console.warn("[SkySync] Failed to load persisted data:", error);
      } finally {
        if (mounted) setIsLoading(false);
      }
    }
    loadData();

    // Safety: if loadData hangs (e.g. Firestore timeout), force isLoading=false after 6s
    const safetyTimeout = setTimeout(() => {
      if (mounted) setIsLoading(false);
    }, 6000);

    return () => { mounted = false; clearTimeout(safetyTimeout); };
  }, [userId]);

  useEffect(() => {
    if (!settingsHydratedRef.current) return;
    void storage.updateSettings({ lastViewpoint: viewpoint });
  }, [viewpoint]);

  const [roomChat, setRoomChat] = useState<ChatMessage[]>([]);

  useEffect(() => roomSyncService.subscribeRooms(setRooms), []);
  useEffect(() => roomSyncService.subscribeGlobalChat(setGlobalChat), []);

  // Subscribe to room-specific chat when current room changes
  useEffect(() => {
    if (!currentRoomId) {
      setRoomChat([]);
      return;
    }
    if (roomSyncService.subscribeRoomChat) {
      return roomSyncService.subscribeRoomChat(currentRoomId, setRoomChat);
    }
  }, [currentRoomId]);

  const currentRoom = rooms.find((room) => room.id === currentRoomId);

  useEffect(() => {
    if (!currentRoomId && rooms.length > 0) {
      setCurrentRoomId(rooms[0].id);
    }
  }, [rooms, currentRoomId]);

  // Sync local state when switching rooms (only on room ID change)
  const prevRoomIdRef = useRef<string | undefined>(undefined);
  useEffect(() => {
    if (!currentRoom || currentRoom.id === prevRoomIdRef.current) return;
    prevRoomIdRef.current = currentRoom.id;
    setRotationState(currentRoom.state.rotation);
    setZoomState(currentRoom.state.zoom);
    setSelectedDateState(new Date(currentRoom.state.dateIso));
  }, [currentRoom?.id]);

  // Live mode timer using ref to avoid stale closure on currentRoom
  useEffect(() => {
    if (!liveMode) return;
    const timer = setInterval(() => {
      const now = new Date();
      setSelectedDateState(now);
      const roomId = currentRoomIdRef.current;
      if (roomId) {
        roomSyncService.updateSkyState(roomId, { dateIso: now.toISOString() });
      }
    }, LIVE_MODE_INTERVAL_MS);
    return () => clearInterval(timer);
  }, [liveMode]);

  // Track planet/satellite discoveries when user selects objects
  const trackDiscovery = useCallback((objectId: string) => {
    const object = findSkyObject(objectId);
    if (!object) return;

    setBadgeProgress((prev) => {
      let updated = false;
      const next = { ...prev };

      if (object.kind === "planet" && !prev.planetsDiscovered.includes(objectId)) {
        next.planetsDiscovered = [...prev.planetsDiscovered, objectId];
        updated = true;
      } else if (object.kind === "satellite" && !prev.satellitesTracked.includes(objectId)) {
        next.satellitesTracked = [...prev.satellitesTracked, objectId];
        updated = true;
      }

      if (updated) {
        storage.saveBadgeProgress(next);
        setUserProfile((profile) => {
          if (!profile) return profile;
          const updatedProfile = {
            ...profile,
            planetsDiscovered: next.planetsDiscovered,
            satellitesTracked: next.satellitesTracked,
            totalStarsViewed: profile.totalStarsViewed + 1,
          };
          storage.saveUserProfile(updatedProfile);
          return updatedProfile;
        });
      }
      return updated ? next : prev;
    });
  }, []);

  const objects = useMemo(
    () => renderSkyObjects({
      rotation,
      zoom,
      date: selectedDate,
      viewpoint,
      observerLatitude: observerLocation.latitude,
      observerLongitude: observerLocation.longitude,
    }),
    [rotation, zoom, selectedDate, viewpoint, observerLocation.latitude, observerLocation.longitude],
  );
  const segments = useMemo(() => getConstellationSegments(objects), [objects]);

  const customConstellations = currentRoom?.state.customConstellations;
  const stableCustomConstellations = useMemo(() => customConstellations ?? [], [customConstellations]);
  const customSegments = useMemo(
    () => getCustomConstellationSegments(objects, stableCustomConstellations),
    [objects, stableCustomConstellations],
  );

  const draftSegments = useMemo(
    () =>
      getCustomConstellationSegments(
        objects,
        draftConstellationIds.length > 1
          ? [{ id: "draft", title: "Draft Pattern", starIds: draftConstellationIds, color: "#ffb15f" }]
          : [],
      ),
    [objects, draftConstellationIds],
  );
  const selectedObject = objects.find((object) => object.id === selectedObjectId);
  const selectedStory = useMemo(() => {
    const baseObject = findSkyObject(selectedObject?.id);
    return getStoryForConstellation(baseObject?.constellationId);
  }, [selectedObject?.id]);
  const visibleTonight = useMemo(() => getVisibleThingsTonight(objects), [objects]);
  const highlightedIds = currentRoom?.state.highlightedObjectIds ?? [];
  const selectedObjectNotes = (currentRoom?.state.notes ?? []).filter((note) => note.objectId === selectedObjectId);

  // Build live badge data with real progress
  const liveBadges: Badge[] = useMemo(() => {
    return badgeDefinitions.map((badge) => {
      let current = 0;
      if (badge.category === "planets") current = badgeProgress.planetsDiscovered.length;
      else if (badge.category === "constellations") current = badgeProgress.constellationsTraced.length;
      else if (badge.category === "satellites") current = badgeProgress.satellitesTracked.length;

      const completed = current >= badge.targetCount;
      return {
        ...badge,
        progressLabel: completed
          ? `Completed! ${badge.targetCount} / ${badge.targetCount}`
          : `${current} / ${badge.targetCount} ${badge.category}`,
      };
    });
  }, [badgeProgress]);

  // Rate limiting for messages
  const lastMessageTimeRef = useRef(0);
  function isRateLimited(): boolean {
    const now = Date.now();
    if (now - lastMessageTimeRef.current < MESSAGE_RATE_LIMIT_MS) return true;
    lastMessageTimeRef.current = now;
    return false;
  }

  function syncRoomState(partial: Partial<SkyRoom["state"]>) {
    if (!currentRoom) return;
    roomSyncService.updateSkyState(currentRoom.id, partial);
  }

  async function processQueuedAction(action: QueuedAction): Promise<boolean> {
    const username = userProfile?.username ?? "You";
    const now = Date.now();

    try {
      switch (action.type) {
        case "room_message": {
          const roomId = typeof action.payload.roomId === "string" ? action.payload.roomId : currentRoomIdRef.current;
          const text = typeof action.payload.text === "string" ? action.payload.text.trim() : "";
          if (!roomId || !text) return true;
          await Promise.resolve(roomSyncService.sendRoomMessage(roomId, {
            id: `room-msg-${now}-${Math.random().toString(36).slice(2, 6)}`,
            author: username,
            text: text.slice(0, MAX_MESSAGE_LENGTH),
            timestampLabel: formatTimestamp(now),
            timestamp: now,
          }));
          return true;
        }
        case "global_message": {
          const text = typeof action.payload.text === "string" ? action.payload.text.trim() : "";
          if (!text) return true;
          await Promise.resolve(roomSyncService.sendGlobalMessage({
            id: `global-msg-${now}-${Math.random().toString(36).slice(2, 6)}`,
            author: username,
            text: text.slice(0, MAX_MESSAGE_LENGTH),
            timestampLabel: formatTimestamp(now),
            timestamp: now,
          }));
          return true;
        }
        case "note": {
          const roomId = typeof action.payload.roomId === "string" ? action.payload.roomId : currentRoomIdRef.current;
          const objectId = typeof action.payload.objectId === "string" ? action.payload.objectId : undefined;
          const text = typeof action.payload.text === "string" ? action.payload.text.trim() : "";
          if (!roomId || !objectId || !text) return true;
          await Promise.resolve(roomSyncService.addNote(roomId, {
            id: `note-${now}-${Math.random().toString(36).slice(2, 6)}`,
            objectId,
            author: username,
            text: text.slice(0, 500),
          }));
          return true;
        }
        case "highlight": {
          const roomId = typeof action.payload.roomId === "string" ? action.payload.roomId : currentRoomIdRef.current;
          const objectId = typeof action.payload.objectId === "string" ? action.payload.objectId : undefined;
          if (!roomId || !objectId) return true;
          await Promise.resolve(roomSyncService.toggleHighlight(roomId, objectId));
          return true;
        }
        case "sky_state": {
          const roomId = typeof action.payload.roomId === "string" ? action.payload.roomId : currentRoomIdRef.current;
          const partial = action.payload.partial;
          if (!roomId || typeof partial !== "object" || partial === null) return true;
          await Promise.resolve(roomSyncService.updateSkyState(roomId, partial as Partial<RoomSkyState>));
          return true;
        }
        default:
          return false;
      }
    } catch (error) {
      console.warn("[SkySync] Failed to replay queued action:", error);
      return false;
    }
  }

  const value: SkySyncContextValue = {
    objects,
    segments,
    customSegments,
    draftSegments,
    selectedObject,
    selectedStory,
    visibleTonight,
    guidedTargets,
    badges: liveBadges,
    dailyChallenges,
    rooms,
    currentRoom,
    roomChat,
    globalChat,
    participants: currentRoom?.state.participants ?? [],
    callActive: currentRoom?.state.callActive ?? false,
    selectedDate,
    liveMode,
    rotation,
    zoom,
    viewpoint,
    highlightedIds,
    selectedObjectNotes,
    draftConstellationIds,
    availableViewpoints: viewpoints,
    isLoading,
    userProfile,
    badgeProgress,
    challengeProgress,
    setRotation: (value) => {
      const normalized = ((value % 360) + 360) % 360;
      setRotationState(normalized);
      syncRoomState({ rotation: normalized });
    },
    setZoom: (value) => {
      const nextZoom = clampZoom(value);
      setZoomState(nextZoom);
      syncRoomState({ zoom: nextZoom });
    },
    setSelectedDate: (date) => {
      setLiveMode(false);
      setSelectedDateState(date);
      syncRoomState({ dateIso: date.toISOString() });
    },
    setLiveMode,
    setViewpoint: (nextViewpoint) => {
      setViewpointState(nextViewpoint);
    },
    selectObject: (objectId) => {
      setSelectedObjectId(objectId);
      if (objectId) {
        trackDiscovery(objectId);
      }
    },
    focusObject: (objectId) => {
      const nextRotation = focusRotationForObject(objectId, selectedDate, viewpoint);
      const nextZoom = Math.max(zoom, 1.45);
      setSelectedObjectId(objectId);
      setRotationState(nextRotation);
      setZoomState(nextZoom);
      syncRoomState({ rotation: nextRotation, zoom: nextZoom });
      trackDiscovery(objectId);
    },
    toggleHighlight: async (objectId) => {
      if (!currentRoom) return false;
      try {
        await Promise.resolve(roomSyncService.toggleHighlight(currentRoom.id, objectId));
        const object = findSkyObject(objectId);
        if (object?.kind === "satellite") {
          trackDiscovery(objectId);
        }
        return true;
      } catch (error) {
        console.warn("[SkySync] Failed to toggle highlight:", error);
        return false;
      }
    },
    addNoteToSelectedObject: async (text) => {
      if (!currentRoom || !selectedObjectId || !text.trim()) return false;
      const trimmed = text.trim().slice(0, 500);
      const note: SpaceNote = {
        id: `note-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`,
        objectId: selectedObjectId,
        author: userProfile?.username ?? "You",
        text: trimmed,
      };
      try {
        await Promise.resolve(roomSyncService.addNote(currentRoom.id, note));
        return true;
      } catch (error) {
        console.warn("[SkySync] Failed to add note:", error);
        return false;
      }
    },
    createRoom: async (name) => {
      const trimmed = name.trim().slice(0, MAX_NAME_LENGTH) || "Orbit Club";
      const room = await Promise.resolve(roomSyncService.createRoom(trimmed));
      setCurrentRoomId(room.id);
      return room.roomCode;
    },
    joinRoom: async (roomCode) => {
      const trimmed = roomCode.trim().toUpperCase();
      if (!trimmed) return "Please enter a room code";
      const room = await Promise.resolve(roomSyncService.joinRoom(trimmed));
      if (!room) return "Room not found";
      setCurrentRoomId(room.id);
      return `Joined ${room.roomCode}`;
    },
    sendRoomMessage: async (text) => {
      if (!currentRoom || !text.trim() || isRateLimited()) return false;
      const now = Date.now();
      const trimmed = text.trim().slice(0, MAX_MESSAGE_LENGTH);
      try {
        await Promise.resolve(roomSyncService.sendRoomMessage(currentRoom.id, {
          id: `room-msg-${now}-${Math.random().toString(36).slice(2, 6)}`,
          author: userProfile?.username ?? "You",
          text: trimmed,
          timestampLabel: formatTimestamp(now),
          timestamp: now,
        }));
        return true;
      } catch (error) {
        console.warn("[SkySync] Failed to send room message:", error);
        return false;
      }
    },
    sendGlobalMessage: async (text) => {
      if (!text.trim() || isRateLimited()) return false;
      const now = Date.now();
      const trimmed = text.trim().slice(0, MAX_MESSAGE_LENGTH);
      try {
        await Promise.resolve(roomSyncService.sendGlobalMessage({
          id: `global-msg-${now}-${Math.random().toString(36).slice(2, 6)}`,
          author: userProfile?.username ?? "You",
          text: trimmed,
          timestampLabel: formatTimestamp(now),
          timestamp: now,
        }));
        return true;
      } catch (error) {
        console.warn("[SkySync] Failed to send global message:", error);
        return false;
      }
    },
    setCallActive: (active) => {
      syncRoomState({ callActive: active });
    },
    addStarToDraft: (objectId) => {
      const object = findSkyObject(objectId);
      if (!object || object.kind !== "star") return;
      setDraftConstellationIds((current) => {
        if (current.includes(objectId)) return current;
        return [...current, objectId];
      });
    },
    clearDraftConstellation: () => {
      setDraftConstellationIds([]);
    },
    saveDraftConstellation: async (title) => {
      if (!currentRoom || draftConstellationIds.length < 2) return false;
      constellationCounter += 1;
      const constellationId = `custom-${Date.now()}-${constellationCounter}`;
      try {
        await Promise.resolve(roomSyncService.addCustomConstellation(currentRoom.id, {
          id: constellationId,
          title: title.trim().slice(0, MAX_NAME_LENGTH) || "Custom Pattern",
          starIds: draftConstellationIds,
          color: "#73fbd3",
        }));
      } catch (error) {
        console.warn("[SkySync] Failed to save constellation:", error);
        return false;
      }

      // Track constellation for badge using the same ID
      setBadgeProgress((prev) => {
        const next = { ...prev, constellationsTraced: [...prev.constellationsTraced, constellationId] };
        storage.saveBadgeProgress(next);
        return next;
      });

      setDraftConstellationIds([]);
      return true;
    },
    updateUsername: (name: string) => {
      const trimmed = name.trim().slice(0, MAX_USERNAME_LENGTH);
      if (!trimmed) return;
      setUserProfile((prev) => {
        if (!prev) return prev;
        const updated = { ...prev, username: trimmed };
        storage.saveUserProfile(updated);
        return updated;
      });
    },
    completeChallenge: (challengeId: string) => {
      setChallengeProgress((prev) => {
        if (prev.completedIds.includes(challengeId)) return prev;
        const challenge = dailyChallenges.find((c) => c.id === challengeId);
        const xp = challenge?.xpValue ?? 0;
        const next: ChallengeProgress = {
          ...prev,
          completedIds: [...prev.completedIds, challengeId],
          totalXpEarned: prev.totalXpEarned + xp,
        };
        storage.saveChallengeProgress(next);

        setUserProfile((profile) => {
          if (!profile) return profile;
          const updated = { ...profile, xp: profile.xp + xp, challengesCompleted: [...profile.challengesCompleted, challengeId] };
          storage.saveUserProfile(updated);
          return updated;
        });

        return next;
      });
    },
    processQueuedAction,
  };

  return <SkySyncContext.Provider value={value}>{children}</SkySyncContext.Provider>;
}

export function useSkySync() {
  const context = useContext(SkySyncContext);
  if (!context) {
    throw new Error("useSkySync must be used inside SkySyncProvider");
  }
  return context;
}

export function useSelectedObjectDetails() {
  const { selectedObject, selectedStory } = useSkySync();
  const baseObject = findSkyObject(selectedObject?.id);
  return {
    object: selectedObject,
    constellationName: getConstellationName(baseObject?.constellationId),
    story: selectedStory,
  };
}
