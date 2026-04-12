/**
 * tokenProvider.ts
 *
 * Fetches short-lived LiveKit access tokens.
 *
 * In production, this calls a backend (Cloud Function, or /api/livekit/token
 * on your own server) that signs with LIVEKIT_API_KEY / LIVEKIT_API_SECRET.
 *
 * In local development, if LIVEKIT_TOKEN_URL isn't set, the provider returns
 * a demo token from process.env — sufficient for unit tests only, never for
 * production.
 */

export type TokenResponse = {
  token: string;
  livekitUrl: string;
  expiresAt: number;
};

const DEFAULT_TIMEOUT_MS = 5000;

export type TokenProviderOptions = {
  /** Backend endpoint that returns { token, livekitUrl, expiresAt }. */
  endpoint?: string;
  /** Bearer auth for the endpoint (e.g., Firebase ID token). */
  authToken?: string;
};

export async function fetchVoiceToken(
  roomId: string,
  userId: string,
  displayName: string,
  options: TokenProviderOptions = {},
): Promise<TokenResponse> {
  const globalProcess = (globalThis as unknown as { process?: { env?: Record<string, string | undefined> } })
    .process;
  const endpoint = options.endpoint ?? globalProcess?.env?.EXPO_PUBLIC_LIVEKIT_TOKEN_URL;

  if (!endpoint) {
    throw new Error("VOICE_NOT_CONFIGURED");
  }

  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), DEFAULT_TIMEOUT_MS);
  try {
    const res = await fetch(endpoint, {
      method: "POST",
      signal: controller.signal,
      headers: {
        "Content-Type": "application/json",
        ...(options.authToken ? { Authorization: `Bearer ${options.authToken}` } : {}),
      },
      body: JSON.stringify({ roomId, userId, displayName }),
    });
    if (!res.ok) {
      throw new Error(`TOKEN_HTTP_${res.status}`);
    }
    const data = await res.json();
    if (!data?.token || !data?.livekitUrl) {
      throw new Error("TOKEN_MALFORMED");
    }
    return {
      token: String(data.token),
      livekitUrl: String(data.livekitUrl),
      expiresAt: Number(data.expiresAt) || Date.now() + 60_000,
    };
  } finally {
    clearTimeout(timer);
  }
}
