import AsyncStorage from "@react-native-async-storage/async-storage";

const QUEUE_KEY = "@skysync/offline_queue";

export type QueuedAction = {
  id: string;
  type: "room_message" | "global_message" | "sky_state" | "note" | "highlight";
  payload: Record<string, unknown>;
  createdAt: number;
};

async function getQueue(): Promise<QueuedAction[]> {
  try {
    const raw = await AsyncStorage.getItem(QUEUE_KEY);
    if (!raw) return [];
    return JSON.parse(raw) as QueuedAction[];
  } catch {
    return [];
  }
}

async function saveQueue(queue: QueuedAction[]): Promise<void> {
  try {
    await AsyncStorage.setItem(QUEUE_KEY, JSON.stringify(queue));
  } catch {
    // Silent fail
  }
}

export const offlineQueue = {
  async enqueue(action: Omit<QueuedAction, "id" | "createdAt">): Promise<void> {
    const queue = await getQueue();
    queue.push({
      ...action,
      id: `q-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`,
      createdAt: Date.now(),
    });
    await saveQueue(queue);
  },

  async flush(handler: (action: QueuedAction) => Promise<boolean>): Promise<number> {
    const queue = await getQueue();
    if (queue.length === 0) return 0;

    let flushed = 0;
    const remaining: QueuedAction[] = [];

    for (const action of queue) {
      try {
        const success = await handler(action);
        if (success) {
          flushed += 1;
        } else {
          remaining.push(action);
        }
      } catch {
        remaining.push(action);
      }
    }

    await saveQueue(remaining);
    return flushed;
  },

  async count(): Promise<number> {
    const queue = await getQueue();
    return queue.length;
  },

  async clear(): Promise<void> {
    await AsyncStorage.removeItem(QUEUE_KEY);
  },
};
