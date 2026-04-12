/**
 * passScheduler.ts
 *
 * Computes the next visible pass for each subscribed satellite and writes
 * corresponding notification entries to the local inbox. Designed to run
 * opportunistically when the app foregrounds or when the satellite TLE
 * cache is refreshed.
 */

import AsyncStorage from "@react-native-async-storage/async-storage";
import { fetchTles, FEATURED_SAT_NAMES, nextVisiblePass, type TleRecord } from "./satelliteTracking";

export type PassAlert = {
  id: string;
  kind: "pass";
  title: string;
  body: string;
  timestamp: number;
  read: boolean;
  satelliteId: string;
  startIso: string;
  peakIso: string;
};

const INBOX_KEY = "@skysync/notifications";

async function readInbox(): Promise<PassAlert[]> {
  try {
    const raw = await AsyncStorage.getItem(INBOX_KEY);
    return raw ? (JSON.parse(raw) as PassAlert[]) : [];
  } catch {
    return [];
  }
}

async function writeInbox(items: PassAlert[]) {
  try {
    await AsyncStorage.setItem(INBOX_KEY, JSON.stringify(items));
  } catch {
    /* ignore */
  }
}

function isFeatured(name: string): boolean {
  const up = name.toUpperCase();
  return FEATURED_SAT_NAMES.some((n) => up.includes(n));
}

export async function schedulePassAlerts(
  observer: { latitudeDeg: number; longitudeDeg: number },
  now: Date = new Date(),
): Promise<number> {
  const tles: TleRecord[] = await fetchTles();
  if (tles.length === 0) return 0;
  const inbox = await readInbox();
  const existing = new Set(inbox.map((i) => i.id));
  let added = 0;

  for (const tle of tles) {
    if (!isFeatured(tle.name)) continue;
    const pass = nextVisiblePass(tle, observer, now, 24);
    if (!pass) continue;
    const id = `pass-${tle.name}-${pass.start.getTime()}`;
    if (existing.has(id)) continue;
    inbox.push({
      id,
      kind: "pass",
      title: `${tle.name} visible pass`,
      body: `Peaks at ${pass.peak.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })} — max altitude ${Math.round(pass.maxAltitudeDeg)}\u00B0.`,
      timestamp: pass.start.getTime(),
      read: false,
      satelliteId: tle.name.toLowerCase().replace(/\s+/g, "-"),
      startIso: pass.start.toISOString(),
      peakIso: pass.peak.toISOString(),
    });
    added += 1;
  }

  if (added > 0) {
    await writeInbox(inbox);
  }
  return added;
}
