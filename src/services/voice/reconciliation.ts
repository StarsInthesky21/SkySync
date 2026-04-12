/**
 * reconciliation.ts
 *
 * Firestore is the source of truth for who is in a Sky Room. LiveKit is
 * the source of truth for who is currently talking. This module merges
 * them into a single list for the UI and flags discrepancies.
 */

import type { VoiceParticipant } from "./livekitService";

export type RoomMember = {
  identity: string;
  displayName: string;
};

export type ReconciledParticipant = VoiceParticipant & {
  inRoom: boolean; // present in Firestore member list
  inVoice: boolean; // present in LiveKit session
};

export function reconcileParticipants(
  members: RoomMember[],
  voiceParticipants: VoiceParticipant[],
): ReconciledParticipant[] {
  const voiceById = new Map(voiceParticipants.map((p) => [p.id, p]));
  const memberById = new Map(members.map((m) => [m.identity, m]));
  const out: ReconciledParticipant[] = [];

  for (const member of members) {
    const voice = voiceById.get(member.identity);
    if (voice) {
      out.push({ ...voice, inRoom: true, inVoice: true });
    } else {
      out.push({
        id: member.identity,
        name: member.displayName,
        speaking: false,
        muted: true,
        audioLevel: 0,
        isLocal: false,
        inRoom: true,
        inVoice: false,
      });
    }
  }

  for (const voice of voiceParticipants) {
    if (memberById.has(voice.id)) continue;
    out.push({ ...voice, inRoom: false, inVoice: true });
  }

  return out;
}
