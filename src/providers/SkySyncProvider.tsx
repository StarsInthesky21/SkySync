import { createContext, ReactNode, useContext, useEffect, useMemo, useState, useCallback } from "react";
import { badges as badgeDefinitions, dailyChallenges, formatTimestamp, guidedTargets, viewpoints } from "@/data/skyData";
import { roomSyncService } from "@/services/mock/roomSyncService";
import { storage, UserProfile, BadgeProgress, ChallengeProgress } from "@/services/storage";
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

export function SkySyncProvider({ children }: { children: ReactNode }) {
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

  // Load persisted data on mount
  useEffect(() => {
    let mounted = true;
    async function loadData() {
      try {
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
      } catch {
        // Continue with defaults on storage failure
      } finally {
        if (mounted) setIsLoading(false);
      }
    }
    loadData();
    return () => { mounted = false; };
  }, []);

  useEffect(() => roomSyncService.subscribeRooms(setRooms), []);
  useEffect(() => roomSyncService.subscribeGlobalChat(setGlobalChat), []);

  const currentRoom = rooms.find((room) => room.id === currentRoomId);

  useEffect(() => {
    if (!currentRoomId && rooms.length > 0) {
      setCurrentRoomId(rooms[0].id);
    }
  }, [rooms, currentRoomId]);

  useEffect(() => {
    if (!currentRoom) return;
    setRotationState(currentRoom.state.rotation);
    setZoomState(currentRoom.state.zoom);
    setSelectedDateState(new Date(currentRoom.state.dateIso));
  }, [currentRoom?.id, currentRoom?.state.rotation, currentRoom?.state.zoom, currentRoom?.state.dateIso]);

  useEffect(() => {
    if (!liveMode) return;
    const timer = setInterval(() => {
      const now = new Date();
      setSelectedDateState(now);
      if (currentRoom) {
        roomSyncService.updateSkyState(currentRoom.id, { dateIso: now.toISOString() });
      }
    }, 30000);
    return () => clearInterval(timer);
  }, [liveMode, currentRoom?.id]);

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

        // Update user profile stats
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
  const customSegments = useMemo(
    () => getCustomConstellationSegments(objects, currentRoom?.state.customConstellations ?? []),
    [objects, currentRoom?.state.customConstellations],
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
    roomChat: currentRoom?.chat ?? [],
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

      // Track satellite highlights for badge
      const object = findSkyObject(objectId);
      if (object?.kind === "satellite") {
        trackDiscovery(objectId);
      }
    },
    addNoteToSelectedObject: (text) => {
      if (!currentRoom || !selectedObjectId || !text.trim()) return;
      const note: SpaceNote = {
        id: `note-${Date.now()}`,
        objectId: selectedObjectId,
        author: userProfile?.username ?? "You",
        text: text.trim(),
      };
      roomSyncService.addNote(currentRoom.id, note);
    },
    createRoom: (name) => {
      const room = roomSyncService.createRoom(name);
      setCurrentRoomId(room.id);
      return room.roomCode;
    },
    joinRoom: (roomCode) => {
      const room = roomSyncService.joinRoom(roomCode);
      if (!room) return "Room not found";
      setCurrentRoomId(room.id);
      return `Joined ${room.roomCode}`;
    },
    sendRoomMessage: (text) => {
      if (!currentRoom || !text.trim()) return;
      const now = Date.now();
      roomSyncService.sendRoomMessage(currentRoom.id, {
        id: `room-msg-${now}`,
        author: userProfile?.username ?? "You",
        text: text.trim(),
        timestampLabel: formatTimestamp(now),
        timestamp: now,
      });
    },
    sendGlobalMessage: (text) => {
      if (!text.trim()) return;
      const now = Date.now();
      roomSyncService.sendGlobalMessage({
        id: `global-msg-${now}`,
        author: userProfile?.username ?? "You",
        text: text.trim(),
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
      setDraftConstellationIds((current) => [...current, objectId]);
    },
    clearDraftConstellation: () => {
      setDraftConstellationIds([]);
    },
    saveDraftConstellation: (title) => {
      if (!currentRoom || draftConstellationIds.length < 2) return;
      roomSyncService.addCustomConstellation(currentRoom.id, {
        id: `custom-${Date.now()}`,
        title: title.trim() || "Custom Pattern",
        starIds: draftConstellationIds,
        color: "#73fbd3",
      });

      // Track constellation for badge
      setBadgeProgress((prev) => {
        const constellationId = `custom-${Date.now()}`;
        if (prev.constellationsTraced.includes(constellationId)) return prev;
        const next = { ...prev, constellationsTraced: [...prev.constellationsTraced, constellationId] };
        storage.saveBadgeProgress(next);
        return next;
      });

      setDraftConstellationIds([]);
    },
    updateUsername: (name: string) => {
      setUserProfile((prev) => {
        if (!prev) return prev;
        const updated = { ...prev, username: name.trim() || prev.username };
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

        // Update user XP
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
