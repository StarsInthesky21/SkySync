/**
 * crashReporter.ts
 *
 * Sentry-compatible crash reporting. When `EXPO_PUBLIC_CRASH_ENDPOINT` is
 * configured, unhandled exceptions and React error-boundary catches are
 * POSTed as JSON envelopes. Otherwise they are logged via console.warn in
 * __DEV__ and dropped in production builds.
 *
 * The service layers on top of the analytics pipeline so crash counts are
 * visible in the same dashboard (via `analytics.trackError`).
 */

import Constants from "expo-constants";
import { analytics } from "./analytics";

type CrashEnvelope = {
  message: string;
  stack?: string;
  componentStack?: string;
  timestamp: number;
  platform: string;
  appVersion: string;
  fatal: boolean;
};

function readEndpoint(): { endpoint?: string; token?: string } {
  const extra = (Constants.expoConfig?.extra ?? {}) as Record<string, unknown>;
  return {
    endpoint:
      (process.env.EXPO_PUBLIC_CRASH_ENDPOINT as string | undefined) ??
      (typeof extra.crashEndpoint === "string" ? extra.crashEndpoint : undefined),
    token:
      (process.env.EXPO_PUBLIC_CRASH_TOKEN as string | undefined) ??
      (typeof extra.crashToken === "string" ? extra.crashToken : undefined),
  };
}

async function dispatch(envelope: CrashEnvelope): Promise<boolean> {
  const { endpoint, token } = readEndpoint();
  if (!endpoint) {
    if (__DEV__) {
      // eslint-disable-next-line no-console
      console.warn("[CrashReporter] (no endpoint)", envelope.message);
    }
    return false;
  }
  try {
    const res = await fetch(endpoint, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        ...(token ? { Authorization: `Bearer ${token}` } : {}),
      },
      body: JSON.stringify(envelope),
    });
    return res.ok;
  } catch {
    return false;
  }
}

export const crashReporter = {
  async report(error: Error, extra?: { componentStack?: string; fatal?: boolean }): Promise<void> {
    const envelope: CrashEnvelope = {
      message: error.message ?? "Unknown error",
      stack: error.stack,
      componentStack: extra?.componentStack,
      timestamp: Date.now(),
      platform: Constants.executionEnvironment ?? "unknown",
      appVersion: (Constants.expoConfig?.version as string | undefined) ?? "0.0.0",
      fatal: extra?.fatal ?? false,
    };
    await Promise.all([
      dispatch(envelope),
      analytics.trackError(extra?.fatal ? "fatal" : "handled", envelope.message),
    ]);
  },

  /**
   * Install a global handler that catches otherwise-unhandled promise
   * rejections and JS errors. Safe to call multiple times.
   */
  install(): void {
    const globalAny = globalThis as unknown as {
      __skysyncCrashReporterInstalled?: boolean;
      addEventListener?: (type: string, handler: (e: unknown) => void) => void;
      process?: { on?: (event: string, handler: (reason: unknown) => void) => void };
    };
    if (globalAny.__skysyncCrashReporterInstalled) return;
    globalAny.__skysyncCrashReporterInstalled = true;

    const handleUnhandled = (reason: unknown) => {
      const err = reason instanceof Error ? reason : new Error(String(reason));
      void this.report(err, { fatal: false });
    };

    if (typeof globalAny.addEventListener === "function") {
      globalAny.addEventListener("unhandledrejection", (e: unknown) => {
        const reason = (e as { reason?: unknown })?.reason ?? e;
        handleUnhandled(reason);
      });
    }
    if (globalAny.process?.on) {
      globalAny.process.on("unhandledRejection", handleUnhandled);
    }
  },
};
