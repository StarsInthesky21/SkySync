/**
 * Shared app-level state and handlers used across multiple tab screens.
 * Extracted from the monolithic SkySyncHomeScreen to support route-based navigation.
 */
import { useCallback, useEffect, useRef, useState } from "react";
let Speech: any = null;
try { Speech = require("expo-speech"); } catch {}
import { Share } from "react-native";
import { useSkySync, useSelectedObjectDetails } from "@/providers/SkySyncProvider";
import { useNetworkStatus } from "@/hooks/useNetworkStatus";
import { useToast } from "@/components/Toast";
import { streakService, StreakData } from "@/services/streakService";
import { offlineQueue } from "@/services/offlineQueue";
import { analytics } from "@/services/analytics";
import { notificationService } from "@/services/notifications";
import { storage } from "@/services/storage";

export function useAppState() {
  const sky = useSkySync();
  const details = useSelectedObjectDetails();
  const network = useNetworkStatus();
  const toast = useToast();

  const [voiceGuideEnabled, setVoiceGuideEnabled] = useState(true);
  const [drawModeEnabled, setDrawModeEnabled] = useState(false);
  const [noteInput, setNoteInput] = useState("");
  const [refreshing, setRefreshing] = useState(false);
  const [streak, setStreak] = useState<StreakData | null>(null);
  const [pendingQueueCount, setPendingQueueCount] = useState(0);
  const settingsHydratedRef = useRef(false);

  const username = sky.userProfile?.username ?? "Stargazer";

  // Initialize analytics on mount.
  // Notification init is handled in the root layout — do NOT call it again here
  // as it can hang on Android (getExpoPushTokenAsync with no project ID).
  useEffect(() => {
    analytics.init();
    return () => { analytics.endSession(); };
  }, []);

  // Load streak on mount and schedule notifications
  useEffect(() => {
    streakService.recordActivity(sky.challengeProgress.totalXpEarned).then((s) => {
      setStreak(s);
      // Schedule notifications in background — must never block UI
      try {
        notificationService.scheduleStreakReminder(s.currentStreak).catch(() => {});
        notificationService.scheduleChallengeReminder(
          sky.challengeProgress.completedIds.length,
          sky.dailyChallenges.length,
        ).catch(() => {});
      } catch {
        // Notification scheduling not available
      }
    }).catch(() => {});
  }, [sky.challengeProgress.totalXpEarned, sky.challengeProgress.completedIds.length, sky.dailyChallenges.length]);

  // Hydrate settings
  useEffect(() => {
    let mounted = true;
    storage.getSettings().then((settings) => {
      if (!mounted) return;
      setVoiceGuideEnabled(settings.voiceGuideEnabled);
      settingsHydratedRef.current = true;
    }).catch(() => {
      settingsHydratedRef.current = true;
    });
    return () => { mounted = false; };
  }, []);

  useEffect(() => {
    if (!settingsHydratedRef.current) return;
    void storage.updateSettings({ voiceGuideEnabled });
  }, [voiceGuideEnabled]);

  // Check offline queue
  useEffect(() => {
    offlineQueue.count().then(setPendingQueueCount);
  }, []);

  // Flush offline queue when back online
  useEffect(() => {
    if (!network.isConnected) return;
    if (pendingQueueCount === 0) return;
    let cancelled = false;
    offlineQueue.flush(sky.processQueuedAction).then(async (flushed) => {
      const remaining = await offlineQueue.count();
      if (cancelled) return;
      setPendingQueueCount(remaining);
      if (flushed > 0) {
        toast.show(`Synced ${flushed} queued action${flushed > 1 ? "s" : ""}`, "success");
      }
      if (remaining > 0) {
        toast.show(`${remaining} queued action${remaining > 1 ? "s" : ""} still pending`, "warning");
      }
    });
    return () => { cancelled = true; };
  }, [network.isConnected, pendingQueueCount, sky.processQueuedAction, toast]);

  // Voice guide
  useEffect(() => {
    if (!voiceGuideEnabled || !details.object || !Speech) return;
    try {
      Speech.stop();
      Speech.speak(
        `${details.object.name}. ${details.object.distanceFromEarth} from Earth. ${details.object.mythologyStory}. ${details.object.scientificFacts[0]}`,
        { rate: 0.95, pitch: 1.0 },
      );
    } catch {}
    return () => { try { Speech?.stop(); } catch {} };
  }, [details.object?.id, voiceGuideEnabled]);

  // Challenge auto-completion
  const challengeRef = useRef(sky.challengeProgress);
  challengeRef.current = sky.challengeProgress;

  useEffect(() => {
    if (!details.object) return;
    for (const c of sky.dailyChallenges) {
      if (challengeRef.current.completedIds.includes(c.id)) continue;
      if (c.objectId === details.object.id && (c.type === "discover" || c.type === "track")) {
        sky.completeChallenge(c.id);
        toast.show(`Challenge completed: ${c.title} (+${c.xpValue} XP)`, "success");
      }
    }
  }, [details.object?.id, sky.completeChallenge, sky.dailyChallenges, toast]);

  useEffect(() => {
    if (!details.story || !details.object) return;
    for (const c of sky.dailyChallenges) {
      if (challengeRef.current.completedIds.includes(c.id)) continue;
      if (c.type === "story" && c.objectId === details.object.id) {
        sky.completeChallenge(c.id);
        toast.show(`Challenge completed: ${c.title} (+${c.xpValue} XP)`, "success");
      }
    }
  }, [details.story?.id, details.object?.id, sky.completeChallenge, sky.dailyChallenges, toast]);

  // Toast-based status messages
  const setStatusMessage = useCallback((msg: string) => {
    if (msg.toLowerCase().includes("error") || msg.toLowerCase().includes("invalid") || msg.toLowerCase().includes("failed")) {
      toast.show(msg, "error");
    } else if (msg.toLowerCase().includes("completed") || msg.toLowerCase().includes("saved") || msg.toLowerCase().includes("created")) {
      toast.show(msg, "success");
    } else if (msg.toLowerCase().includes("warning") || msg.toLowerCase().includes("offline")) {
      toast.show(msg, "warning");
    } else {
      toast.show(msg, "info");
    }
  }, [toast]);

  const handleSelectObject = useCallback((objectId: string) => {
    if (drawModeEnabled) {
      sky.addStarToDraft(objectId);
      toast.show("Added star to draft pattern", "info");
      return;
    }
    sky.selectObject(objectId);
    const obj = sky.objects.find((o) => o.id === objectId);
    if (obj) analytics.objectDiscovered(objectId, obj.kind, obj.name);
  }, [drawModeEnabled, sky.addStarToDraft, sky.selectObject, toast, sky.objects]);

  const handleAddNote = useCallback(async () => {
    if (!noteInput.trim()) return;
    if (!sky.currentRoom || !details.object) {
      toast.show("Join a room to save shared notes", "warning");
      return;
    }
    if (!network.isConnected) {
      await offlineQueue.enqueue({
        type: "note",
        payload: { roomId: sky.currentRoom.id, objectId: details.object.id, text: noteInput.trim() },
      });
      setPendingQueueCount((c) => c + 1);
      setNoteInput("");
      toast.show("Note queued (offline)", "warning");
      return;
    }
    const saved = await sky.addNoteToSelectedObject(noteInput);
    if (!saved) {
      toast.show("Couldn't save note", "error");
      return;
    }
    setNoteInput("");
    toast.show("Note saved", "success");
  }, [noteInput, sky.currentRoom, details.object, network.isConnected, sky.addNoteToSelectedObject, toast]);

  const handleSendRoom = useCallback(async (text: string) => {
    if (!sky.currentRoom) {
      toast.show("Join a room to chat", "warning");
      return;
    }
    if (!network.isConnected) {
      await offlineQueue.enqueue({ type: "room_message", payload: { roomId: sky.currentRoom.id, text } });
      toast.show("Message queued (offline)", "warning");
      setPendingQueueCount((c) => c + 1);
      return;
    }
    const sent = await sky.sendRoomMessage(text);
    if (!sent) {
      toast.show("Couldn't send room message", "error");
      return;
    }
    analytics.messageSent("room");
  }, [sky.currentRoom, sky.sendRoomMessage, network.isConnected, toast]);

  const handleSendGlobal = useCallback(async (text: string) => {
    if (!network.isConnected) {
      await offlineQueue.enqueue({ type: "global_message", payload: { text } });
      toast.show("Message queued (offline)", "warning");
      setPendingQueueCount((c) => c + 1);
      return;
    }
    const sent = await sky.sendGlobalMessage(text);
    if (!sent) {
      toast.show("Couldn't send global message", "error");
      return;
    }
    analytics.messageSent("global");
  }, [sky.sendGlobalMessage, network.isConnected, toast]);

  const handleShare = useCallback(async () => {
    try {
      const objectName = details.object?.name ?? "the night sky";
      await Share.share({
        message: `I'm stargazing at ${objectName} with SkySync! ${sky.currentRoom ? `Join my room: ${sky.currentRoom.roomCode}` : "Download SkySync to explore the night sky together."}`,
        title: "SkySync - Social Stargazing",
      });
      analytics.shareAction(details.object ? "object" : "app");
    } catch {
      // User cancelled
    }
  }, [details.object, sky.currentRoom]);

  const handleToggleHighlight = useCallback(async () => {
    if (!details.object) return;
    if (!sky.currentRoom) {
      toast.show("Join a room to highlight objects", "warning");
      return;
    }
    if (!network.isConnected) {
      await offlineQueue.enqueue({
        type: "highlight",
        payload: { roomId: sky.currentRoom.id, objectId: details.object.id },
      });
      setPendingQueueCount((c) => c + 1);
      toast.show("Highlight queued (offline)", "warning");
      return;
    }
    const updated = await sky.toggleHighlight(details.object.id);
    if (!updated) {
      toast.show("Couldn't update highlight", "error");
    }
  }, [details.object, sky.currentRoom, network.isConnected, sky.toggleHighlight, toast]);

  const handleRefresh = useCallback(async () => {
    setRefreshing(true);
    await streakService.recordActivity(sky.challengeProgress.totalXpEarned).then(setStreak);
    const count = await offlineQueue.count();
    setPendingQueueCount(count);
    setRefreshing(false);
  }, [sky.challengeProgress.totalXpEarned]);

  return {
    // State
    ...sky,
    ...details,
    network,
    toast,
    voiceGuideEnabled,
    setVoiceGuideEnabled,
    drawModeEnabled,
    setDrawModeEnabled,
    noteInput,
    setNoteInput,
    refreshing,
    streak,
    pendingQueueCount,
    username,
    // Handlers
    setStatusMessage,
    handleSelectObject,
    handleAddNote,
    handleSendRoom,
    handleSendGlobal,
    handleShare,
    handleToggleHighlight,
    handleRefresh,
  };
}
