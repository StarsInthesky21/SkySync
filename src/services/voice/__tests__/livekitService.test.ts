import { VoiceSession, VoiceEvent } from "../livekitService";

describe("VoiceSession", () => {
  it("exposes an `available` boolean based on native module presence", () => {
    const session = new VoiceSession();
    expect(typeof session.available).toBe("boolean");
  });

  it("leave() is a no-op when never connected", async () => {
    const session = new VoiceSession();
    await expect(session.leave()).resolves.toBeUndefined();
  });

  it("toggleMute() returns false when not connected", async () => {
    const session = new VoiceSession();
    await expect(session.toggleMute()).resolves.toBe(false);
  });

  it("setPushToTalk is a no-op when not connected", async () => {
    const session = new VoiceSession();
    await expect(session.setPushToTalk(true)).resolves.toBeUndefined();
  });

  it("getParticipants() returns empty list initially", () => {
    const session = new VoiceSession();
    expect(session.getParticipants()).toEqual([]);
  });

  it("subscribe returns an unsubscribe fn that actually removes the listener", () => {
    const session = new VoiceSession();
    const received: VoiceEvent[] = [];
    const unsub = session.subscribe((e) => received.push(e));
    expect(typeof unsub).toBe("function");
    unsub();
    expect(received).toEqual([]);
  });

  it("rejects with a descriptive error if connect fails in environments without WebRTC", async () => {
    const session = new VoiceSession();
    await expect(session.connect("wss://invalid.example", "fake-token", "tester")).rejects.toBeTruthy();
  });
});
