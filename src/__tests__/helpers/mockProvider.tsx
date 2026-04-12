/**
 * Test harness — renders children with a minimal SkySync/Voice provider stub
 * so screen-level tests can assert DOM without booting the real context.
 */

import React, { ReactNode } from "react";
import type { RenderedSkyObject } from "@/types/sky";
import type { SkyRoom, ChatMessage } from "@/types/rooms";

type MockOverrides = {
  objects?: RenderedSkyObject[];
  currentRoom?: SkyRoom;
  rooms?: SkyRoom[];
  highlightedIds?: string[];
  roomChat?: ChatMessage[];
  selectObject?: jest.Mock;
  focusObject?: jest.Mock;
  toggleHighlight?: jest.Mock;
  joinRoom?: jest.Mock;
  createRoom?: jest.Mock;
  sendRoomMessage?: jest.Mock;
  setCallActive?: jest.Mock;
  observerLocation?: { latitude?: number; longitude?: number };
  userProfile?: { username: string } | null;
};

export function buildMockSky(overrides: MockOverrides = {}) {
  return {
    objects: overrides.objects ?? [],
    segments: [],
    customSegments: [],
    draftSegments: [],
    selectedObject: undefined,
    selectedStory: undefined,
    visibleTonight: [],
    guidedTargets: [],
    badges: [],
    dailyChallenges: [],
    rooms: overrides.rooms ?? [],
    currentRoom: overrides.currentRoom,
    roomChat: overrides.roomChat ?? [],
    globalChat: [],
    participants: overrides.currentRoom?.state.participants ?? [],
    callActive: false,
    selectedDate: new Date("2024-06-21T12:00:00Z"),
    liveMode: true,
    rotation: 0,
    zoom: 1,
    viewpoint: "earth" as const,
    highlightedIds: overrides.highlightedIds ?? [],
    selectedObjectNotes: [],
    draftConstellationIds: [],
    availableViewpoints: [],
    isLoading: false,
    observerLocation: overrides.observerLocation ?? { latitude: 37.7, longitude: -122.4 },
    userProfile: overrides.userProfile ?? { username: "Tester" },
    badgeProgress: { planetsDiscovered: [], constellationsTraced: [], satellitesTracked: [] },
    challengeProgress: { completedIds: [], lastResetDate: "2024-06-21", totalXpEarned: 0 },
    setRotation: jest.fn(),
    setZoom: jest.fn(),
    setSelectedDate: jest.fn(),
    setLiveMode: jest.fn(),
    setViewpoint: jest.fn(),
    selectObject: overrides.selectObject ?? jest.fn(),
    focusObject: overrides.focusObject ?? jest.fn(),
    toggleHighlight: overrides.toggleHighlight ?? jest.fn(() => Promise.resolve(true)),
    addNoteToSelectedObject: jest.fn(() => Promise.resolve(true)),
    createRoom: overrides.createRoom ?? jest.fn(() => Promise.resolve("ABC123")),
    joinRoom: overrides.joinRoom ?? jest.fn(() => Promise.resolve("ABC123")),
    sendRoomMessage: overrides.sendRoomMessage ?? jest.fn(() => Promise.resolve(true)),
    sendGlobalMessage: jest.fn(() => Promise.resolve(true)),
    setCallActive: overrides.setCallActive ?? jest.fn(),
    addStarToDraft: jest.fn(),
    clearDraftConstellation: jest.fn(),
    saveDraftConstellation: jest.fn(() => Promise.resolve(true)),
    updateUsername: jest.fn(),
    completeChallenge: jest.fn(),
    processQueuedAction: jest.fn(() => Promise.resolve(true)),
  };
}

export function buildMockVoice() {
  return {
    available: false,
    connecting: false,
    connected: false,
    participants: [],
    activeSpeakerId: null,
    quality: "unknown" as const,
    localMuted: false,
    error: null,
    connect: jest.fn(),
    leave: jest.fn(),
    toggleMute: jest.fn(),
    setPushToTalk: jest.fn(),
    reconciled: jest.fn(() => []),
  };
}

export function buildTestObject(partial: Partial<RenderedSkyObject> = {}): RenderedSkyObject {
  return {
    id: partial.id ?? "sirius",
    name: partial.name ?? "Sirius",
    kind: partial.kind ?? "star",
    description: partial.description ?? "Brightest star in the sky.",
    distanceFromEarth: partial.distanceFromEarth ?? "8.6 ly",
    mythologyStory: partial.mythologyStory ?? "Egyptian astronomy anchor.",
    scientificFacts: partial.scientificFacts ?? ["Binary system with a white dwarf."],
    color: partial.color ?? "#cfe9ff",
    longitude: partial.longitude ?? 101.3,
    latitude: partial.latitude ?? -16.7,
    magnitude: partial.magnitude ?? -1.46,
    motionFactor: partial.motionFactor ?? 0.98,
    constellationId: partial.constellationId,
    x: partial.x ?? 0.5,
    y: partial.y ?? 0.5,
    size: partial.size ?? 5,
    isVisible: partial.isVisible ?? true,
  };
}

export const mockProviderWrap =
  (overrides: MockOverrides = {}) =>
  // eslint-disable-next-line react/display-name
  (children: ReactNode) => {
    const sky = buildMockSky(overrides);
    const voice = buildMockVoice();
    return (
      <TestSkyContext.Provider value={sky}>
        <TestVoiceContext.Provider value={voice}>{children}</TestVoiceContext.Provider>
      </TestSkyContext.Provider>
    );
  };

// These stubs aren't actually used — tests mock the hooks directly — but are
// exported to keep the helper symmetric with the real providers.
const TestSkyContext = React.createContext<unknown>(undefined);
const TestVoiceContext = React.createContext<unknown>(undefined);
