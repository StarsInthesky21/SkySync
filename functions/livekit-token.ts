/**
 * Firebase Cloud Function handler: POST /livekitToken
 *
 * The HTTPS wrapper lives in `index.ts` — it verifies the caller's Firebase
 * ID token before delegating here, which signs a short-lived LiveKit access
 * token bound to the authenticated user's UID.
 *
 * Setup (one-time):
 *   cd functions && npm install
 *   firebase functions:secrets:set LIVEKIT_API_KEY
 *   firebase functions:secrets:set LIVEKIT_API_SECRET
 *   # LIVEKIT_URL is a non-secret env var set via the deploy config.
 *
 * Deploy:
 *   cd functions && npm run deploy
 */

import type { Request, Response } from "express";

type TokenRequestBody = {
  roomId: string;
  userId: string;
  displayName?: string;
};

type LivekitRuntime = {
  AccessToken: new (
    apiKey: string,
    apiSecret: string,
    opts: { identity: string; name?: string },
  ) => {
    addGrant: (grants: Record<string, unknown>) => void;
    toJwt: () => string;
  };
};

export async function livekitTokenHandler(req: Request, res: Response) {
  if (req.method !== "POST") {
    res.status(405).json({ error: "method_not_allowed" });
    return;
  }
  const body = req.body as TokenRequestBody;
  if (!body?.roomId || !body?.userId) {
    res.status(400).json({ error: "missing_fields" });
    return;
  }

  const apiKey = process.env.LIVEKIT_API_KEY;
  const apiSecret = process.env.LIVEKIT_API_SECRET;
  const livekitUrl = process.env.LIVEKIT_URL;
  if (!apiKey || !apiSecret || !livekitUrl) {
    res.status(500).json({ error: "server_not_configured" });
    return;
  }

  let sdk: LivekitRuntime;
  try {
    // eslint-disable-next-line @typescript-eslint/no-require-imports
    sdk = require("livekit-server-sdk") as LivekitRuntime;
  } catch {
    res.status(500).json({ error: "server_sdk_missing" });
    return;
  }

  const at = new sdk.AccessToken(apiKey, apiSecret, {
    identity: body.userId,
    name: body.displayName,
  });
  at.addGrant({
    roomJoin: true,
    room: body.roomId,
    canPublish: true,
    canPublishSources: ["microphone"],
    canSubscribe: true,
    canPublishData: false,
  });

  res.json({
    token: at.toJwt(),
    livekitUrl,
    expiresAt: Date.now() + 10 * 60 * 1000,
  });
}
