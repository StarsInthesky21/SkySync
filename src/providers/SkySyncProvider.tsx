import { createContext, ReactNode, useContext, useEffect, useMemo, useRef, useState, useCallback } from "react";
import { LIVE_MODE_INTERVAL_MS, MAX_MESSAGE_LENGTH, MAX_NAME_LENGTH, MAX_USERNAME_LENGTH, MESSAGE_RATE_LIMIT_MS } from "@/constants";
import { badges as badgeDefinitions, dailyChallenges, formatTimestamp, guidedTargets, viewpoints } from "@/data/skyData";
import { roomSyncService, isFirebaseEnabled } from "@/services/roomSyncService";
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
import { ChatMessage, SkyRoom, SpaceNote } from "@/types/rooms";
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
  toggleHighlight: (objectId: string) => void;
  addNoteToSelectedObject: (text: string) => void;
  createRoom: (name: string) => string;
  joinRoom: (roomCode: string) => string;
  sendRoomMessage: (text: string) => void;
  sendGlobalMessage: (text: string) => void;
  setCallActive: (active: boolean) => void;
  addStarToDraft: (objectId: string) => void;
  clearDraftConstellation: () => void;
  saveDraftConstellation: (title: string) => void;
  updateUsername: (name: string) => void;
  completeChallenge: (challengeId: string) => void;
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

  // Refs for stable access in callbacks without stale closures
  const currentRoomIdRef = useRef(currentRoomId);
  currentRoomIdRef.current = currentRoomId;

  // Load persisted data on mount - local first, then sync with Firestore if enabled
  useEffect(() => {
    let mounted = true;
    async function loadData() {
      try {
        // Always load from local storage first (instant)
        const [profile, badges, challenges] = await Promise.all([
          storage.getUserProfile(),
          storage.getBadgeProgress(),
          storage.getChallengeProgress(),
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
    return () => { mounted = false; };
  }, [userId]);

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
    () => renderSkyObjects({ rotation, zoom, date: selectedDate, viewpoint }),
    [rotation, zoom, selectedDate, viewpoint],
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
    toggleHighlight: (objectId) => {
      if (!currentRoom) return;
      roomSyncService.toggleHighlight(currentRoom.id, objectId);
      const object = findSkyObject(objectId);
      if (object?.kind === "satellite") {
        trackDiscovery(objectId);
      }
    },
    addNoteToSelectedObject: (text) => {
      if (!currentRoom || !selectedObjectId || !text.trim()) return;
      const trimmed = text.trim().slice(0, 500);
      const note: SpaceNote = {
        id: `note-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`,
        objectId: selectedObjectId,
        author: userProfile?.username ?? "You",
        text: trimmed,
      };
      roomSyncService.addNote(currentRoom.id, note);
    },
    createRoom: (name) => {
      const trimmed = name.trim().slice(0, 40) || "Orbit Club";
      const room = roomSyncService.createRoom(trimmed);
      setCurrentRoomId(room.id);
      return room.roomCode;
    },
    joinRoom: (roomCode) => {
      const trimmed = roomCode.trim().toUpperCase();
      if (!trimmed) return "Please enter a room code";
      const room = roomSyncService.joinRoom(trimmed);
      if (!room) return "Room not found";
      setCurrentRoomId(room.id);
      return `Joined ${room.roomCode}`;
    },
    sendRoomMessage: (text) => {
      if (!currentRoom || !text.trim() || isRateLimited()) return;
      const now = Date.now();
      const trimmed = text.trim().slice(0, MAX_MESSAGE_LENGTH);
      roomSyncService.sendRoomMessage(currentRoom.id, {
        id: `room-msg-${now}-${Math.random().toString(36).slice(2, 6)}`,
        author: userProfile?.username ?? "You",
        text: trimmed,
        timestampLabel: formatTimestamp(now),
        timestamp: now,
      });
    },
    sendGlobalMessage: (text) => {
      if (!text.trim() || isRateLimited()) return;
      const now = Date.now();
      const trimmed = text.trim().slice(0, MAX_MESSAGE_LENGTH);
      roomSyncService.sendGlobalMessage({
        id: `global-msg-${now}-${Math.random().toString(36).slice(2, 6)}`,
        author: userProfile?.username ?? "You",
        text: trimmed,
        timestampLabel: formatTimestamp(now),
        timestamp: now,
      });
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
    saveDraftConstellation: (title) => {
      if (!currentRoom || draftConstellationIds.length < 2) return;
      constellationCounter += 1;
      const constellationId = `custom-${Date.now()}-${constellationCounter}`;
      roomSyncService.addCustomConstellation(currentRoom.id, {
        id: constellationId,
        title: title.trim().slice(0, 40) || "Custom Pattern",
        starIds: draftConstellationIds,
        color: "#73fbd3",
      });

      // Track constellation for badge using the same ID
      setBadgeProgress((prev) => {
        const next = { ...prev, constellationsTraced: [...prev.constellationsTraced, constellationId] };
        storage.saveBadgeProgress(next);
        return next;
      });

      setDraftConstellationIds([]);
    },
    updateUsername: (name: string) => {
      const trimmed = name.trim().slice(0, 20);
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
