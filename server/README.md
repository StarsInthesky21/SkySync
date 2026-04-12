# SkySync LiveKit server

Self-hosted WebRTC stack for Sky Rooms voice chat.

## Contents

- `docker-compose.yml` — LiveKit SFU, Redis, Caddy (TLS reverse proxy)
- `livekit.yaml` — LiveKit server config (ports, room defaults)
- `Caddyfile` — auto-TLS reverse proxy
- `deploy/setup.sh` — one-shot bootstrap for Ubuntu 22.04 VPS

## Provisioning

1. Point a DNS A record (e.g. `livekit.skysync.app`) at a VPS with a public IPv4.
   Minimum: 1 vCPU / 2 GB RAM handles ~30 concurrent voice participants.
2. SSH in as a sudo user.
3. `curl -fsSL https://raw.githubusercontent.com/your-org/SkySync/main/SkySync/server/deploy/setup.sh | bash`
4. Edit `/opt/skysync/SkySync/server/.env`:
   ```
   LIVEKIT_API_KEY=$(openssl rand -hex 16)
   LIVEKIT_API_SECRET=$(openssl rand -hex 32)
   LIVEKIT_DOMAIN=livekit.skysync.app
   ```
5. `cd /opt/skysync/SkySync/server && sudo docker compose up -d`

Caddy will auto-provision a Let's Encrypt cert on first boot. The WebSocket
control endpoint becomes `wss://livekit.skysync.app`.

## Handing credentials to the Firebase Cloud Function

The app never talks to LiveKit directly — it asks the [Firebase Function](../functions/livekit-token.ts)
for a short-lived JWT, and that function signs the token with the LiveKit API
secret. Configure the function with:

```
firebase functions:secrets:set LIVEKIT_API_KEY
firebase functions:secrets:set LIVEKIT_API_SECRET
firebase functions:config:set livekit.url=wss://livekit.skysync.app
firebase deploy --only functions:livekitToken
```

## Health checks

- `curl https://$LIVEKIT_DOMAIN` → 200 with LiveKit banner
- `docker compose logs livekit | grep "starting LiveKit server"`
- Connection test: `npx livekit-cli join-room --url wss://$LIVEKIT_DOMAIN --api-key $LIVEKIT_API_KEY --api-secret $LIVEKIT_API_SECRET --identity me --room test`

## Scaling notes

For >100 concurrent participants, switch to multi-node with the Redis backend
already wired in `docker-compose.yml` and place multiple `livekit` instances
behind Caddy with load balancing. See the
[LiveKit deployment guide](https://docs.livekit.io/realtime/self-hosting/distributed/).
