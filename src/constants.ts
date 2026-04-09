// App-wide constants to eliminate magic numbers

export const LIVE_MODE_INTERVAL_MS = 30_000;
export const ROTATION_SENSITIVITY = 0.25;
export const MIN_ZOOM = 0.85;
export const MAX_ZOOM = 2.5;
export const DEFAULT_ZOOM = 1.08;

export const MAX_MESSAGE_LENGTH = 500;
export const MAX_NAME_LENGTH = 40;
export const MAX_USERNAME_LENGTH = 20;
export const MAX_ROOM_CODE_LENGTH = 12;

export const ROOM_CODE_CHARS = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789"; // no 0/O/1/I ambiguity
export const ROOM_CODE_LENGTH = 6;

export const SKY_STATE_DEBOUNCE_MS = 250;
export const CHAT_SCROLL_DELAY_MS = 100;
export const MESSAGE_RATE_LIMIT_MS = 1_000;

export const ANIMATION_DURATIONS = {
  orbSpin: 8_000,
  orbPulse: 2_000,
  storyFrame: 3_500,
  loadingPulse: 1_200,
} as const;
