/**
 * Analytics Service for SkySync
 *
 * Lightweight, privacy-respecting analytics that tracks:
 * - Screen views and navigation
 * - Feature usage (discover, challenge, room, chat)
 * - Session duration and retention
 * - Error rates
 *
 * Data is buffered locally and flushed periodically.
 * When a real analytics backend is connected (Mixpanel, Amplitude, PostHog),
 * swap the `send` implementation below.
 *
 * No PII is collected. User IDs are anonymous.
 */

import AsyncStorage from "@react-native-async-storage/async-storage";

const ANALYTICS_KEY = "@skysync/analytics_buffer";
const SESSION_KEY = "@skysync/analytics_session";
const FLUSH_INTERVAL_MS = 5 * 60 * 1000; // 5 minutes
const MAX_BUFFER_SIZE = 200;

export type AnalyticsEvent = {
  name: string;
  properties?: Record<string, string | number | boolean>;
  timestamp: number;
  sessionId: string;
};

type SessionData = {
  sessionId: string;
  startedAt: number;
  screenViews: number;
  eventsCount: number;
};

let currentSession: SessionData | null = null;
let flushTimer: ReturnType<typeof setInterval> | null = null;

function generateSessionId(): string {
  return `s-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
}

// ------------------------------------------------------------------
// Buffer management
// ------------------------------------------------------------------

async function getBuffer(): Promise<AnalyticsEvent[]> {
  try {
    const raw = await AsyncStorage.getItem(ANALYTICS_KEY);
    if (!raw) return [];
    return JSON.parse(raw) as AnalyticsEvent[];
  } catch {
    return [];
  }
}

async function appendToBuffer(event: AnalyticsEvent): Promise<void> {
  try {
    const buffer = await getBuffer();
    buffer.push(event);
    // Keep buffer bounded
    const trimmed = buffer.length > MAX_BUFFER_SIZE ? buffer.slice(-MAX_BUFFER_SIZE) : buffer;
    await AsyncStorage.setItem(ANALYTICS_KEY, JSON.stringify(trimmed));
  } catch {
    // Silent fail
  }
}

async function clearBuffer(): Promise<void> {
  await AsyncStorage.removeItem(ANALYTICS_KEY);
}

// ------------------------------------------------------------------
// Send to backend (swap this for real analytics)
// ------------------------------------------------------------------

async function sendToBackend(events: AnalyticsEvent[]): Promise<boolean> {
  // TODO: Replace with real analytics provider
  // Examples:
  //   Mixpanel: mixpanel.track(event.name, event.properties)
  //   Amplitude: amplitude.logEvent(event.name, event.properties)
  //   PostHog: posthog.capture(event.name, event.properties)
  //
  // For now, log to console in development
  if (__DEV__) {
    console.log(`[Analytics] Flushing ${events.length} events`, events.map((e) => e.name));
  }
  return true;
}

// ------------------------------------------------------------------
// Public API
// ------------------------------------------------------------------

export const analytics = {
  /**
   * Initialize analytics and start a new session.
   * Call once on app start.
   */
  async init(): Promise<void> {
    currentSession = {
      sessionId: generateSessionId(),
      startedAt: Date.now(),
      screenViews: 0,
      eventsCount: 0,
    };

    await AsyncStorage.setItem(SESSION_KEY, JSON.stringify(currentSession));

    // Track session start
    await this.track("session_start", {
      sessionId: currentSession.sessionId,
    });

    // Start periodic flush
    if (flushTimer) clearInterval(flushTimer);
    flushTimer = setInterval(() => this.flush(), FLUSH_INTERVAL_MS);
  },

  /**
   * Track a custom event.
   */
  async track(name: string, properties?: Record<string, string | number | boolean>): Promise<void> {
    if (!currentSession) return;

    currentSession.eventsCount += 1;

    const event: AnalyticsEvent = {
      name,
      properties: {
        ...properties,
        session_event_count: currentSession.eventsCount,
        session_duration_ms: Date.now() - currentSession.startedAt,
      },
      timestamp: Date.now(),
      sessionId: currentSession.sessionId,
    };

    await appendToBuffer(event);
  },

  /**
   * Track a screen view.
   */
  async screenView(screenName: string): Promise<void> {
    if (!currentSession) return;
    currentSession.screenViews += 1;

    await this.track("screen_view", {
      screen: screenName,
      screen_view_count: currentSession.screenViews,
    });
  },

  /**
   * Track object discovery (planet, star, satellite).
   */
  async objectDiscovered(objectId: string, objectKind: string, objectName: string): Promise<void> {
    await this.track("object_discovered", { objectId, objectKind, objectName });
  },

  /**
   * Track challenge completion.
   */
  async challengeCompleted(challengeId: string, xpEarned: number): Promise<void> {
    await this.track("challenge_completed", { challengeId, xpEarned });
  },

  /**
   * Track room creation or joining.
   */
  async roomAction(action: "create" | "join", roomCode: string): Promise<void> {
    await this.track("room_action", { action, roomCode });
  },

  /**
   * Track chat message sent.
   */
  async messageSent(chatType: "room" | "global"): Promise<void> {
    await this.track("message_sent", { chatType });
  },

  /**
   * Track share action.
   */
  async shareAction(contentType: string): Promise<void> {
    await this.track("share", { contentType });
  },

  /**
   * Track feature usage.
   */
  async featureUsed(feature: string): Promise<void> {
    await this.track("feature_used", { feature });
  },

  /**
   * Track an error for monitoring.
   */
  async trackError(errorType: string, message: string): Promise<void> {
    await this.track("error", { errorType, message: message.slice(0, 200) });
  },

  /**
   * Flush buffered events to the backend.
   */
  async flush(): Promise<void> {
    const buffer = await getBuffer();
    if (buffer.length === 0) return;

    const success = await sendToBackend(buffer);
    if (success) {
      await clearBuffer();
    }
  },

  /**
   * End session and flush remaining events.
   */
  async endSession(): Promise<void> {
    if (!currentSession) return;

    await this.track("session_end", {
      duration_ms: Date.now() - currentSession.startedAt,
      total_screen_views: currentSession.screenViews,
      total_events: currentSession.eventsCount,
    });

    await this.flush();

    if (flushTimer) {
      clearInterval(flushTimer);
      flushTimer = null;
    }

    currentSession = null;
  },

  /**
   * Get session summary for debugging.
   */
  getSessionSummary(): { sessionId: string; duration: number; events: number; screens: number } | null {
    if (!currentSession) return null;
    return {
      sessionId: currentSession.sessionId,
      duration: Date.now() - currentSession.startedAt,
      events: currentSession.eventsCount,
      screens: currentSession.screenViews,
    };
  },
};
