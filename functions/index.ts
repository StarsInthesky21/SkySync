/**
 * SkySync Cloud Functions entrypoint.
 *
 * Currently exposes:
 *   POST /livekitToken — signs short-lived LiveKit JWTs for authenticated users.
 */

import { onRequest } from "firebase-functions/v2/https";
import { initializeApp } from "firebase-admin/app";
import { getAuth } from "firebase-admin/auth";
import { defineSecret } from "firebase-functions/params";
import { livekitTokenHandler } from "./livekit-token";

initializeApp();

const livekitApiKey = defineSecret("LIVEKIT_API_KEY");
const livekitApiSecret = defineSecret("LIVEKIT_API_SECRET");

export const livekitToken = onRequest(
  {
    region: "us-central1",
    cors: true,
    secrets: [livekitApiKey, livekitApiSecret],
    maxInstances: 20,
    memory: "256MiB",
    timeoutSeconds: 15,
  },
  async (req, res) => {
    // Verify Firebase ID token in Authorization: Bearer <jwt>
    const authHeader = req.header("authorization") ?? "";
    const match = /^Bearer\s+(.+)$/i.exec(authHeader);
    if (!match) {
      res.status(401).json({ error: "missing_auth" });
      return;
    }
    try {
      const decoded = await getAuth().verifyIdToken(match[1]);
      // Enforce: userId in body must equal authenticated uid.
      const body = req.body as { userId?: string };
      if (body?.userId && body.userId !== decoded.uid) {
        res.status(403).json({ error: "uid_mismatch" });
        return;
      }
      req.body = { ...req.body, userId: decoded.uid };
    } catch {
      res.status(401).json({ error: "invalid_auth" });
      return;
    }

    // Populate env so the handler can read secrets via process.env.
    process.env.LIVEKIT_API_KEY = livekitApiKey.value();
    process.env.LIVEKIT_API_SECRET = livekitApiSecret.value();
    process.env.LIVEKIT_URL = process.env.LIVEKIT_URL ?? "";
    await livekitTokenHandler(req, res);
  },
);
