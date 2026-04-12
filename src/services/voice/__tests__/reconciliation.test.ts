import { reconcileParticipants } from "../reconciliation";

describe("reconcileParticipants", () => {
  it("flags a room member missing from voice as inVoice: false", () => {
    const merged = reconcileParticipants(
      [
        { identity: "alice", displayName: "Alice" },
        { identity: "bob", displayName: "Bob" },
      ],
      [{ id: "alice", name: "Alice", speaking: true, muted: false, audioLevel: 0.6, isLocal: true }],
    );
    expect(merged).toHaveLength(2);
    const alice = merged.find((p) => p.id === "alice")!;
    const bob = merged.find((p) => p.id === "bob")!;
    expect(alice.inVoice).toBe(true);
    expect(alice.inRoom).toBe(true);
    expect(alice.speaking).toBe(true);
    expect(bob.inVoice).toBe(false);
    expect(bob.inRoom).toBe(true);
    expect(bob.muted).toBe(true);
  });

  it("surfaces stale voice connections not in the room", () => {
    const merged = reconcileParticipants(
      [{ identity: "alice", displayName: "Alice" }],
      [
        { id: "alice", name: "Alice", speaking: false, muted: false, audioLevel: 0, isLocal: true },
        { id: "ghost", name: "Ghost", speaking: false, muted: false, audioLevel: 0, isLocal: false },
      ],
    );
    const ghost = merged.find((p) => p.id === "ghost")!;
    expect(ghost.inRoom).toBe(false);
    expect(ghost.inVoice).toBe(true);
  });

  it("returns empty list when both inputs are empty", () => {
    expect(reconcileParticipants([], [])).toEqual([]);
  });
});
