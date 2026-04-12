import { fetchVoiceToken } from "@/services/voice/tokenProvider";
import { voiceSession } from "@/services/voice/livekitService";

describe("VoiceProvider wiring", () => {
  it("voiceSession advertises availability via .available", () => {
    expect(typeof voiceSession.available).toBe("boolean");
  });

  it("connect rejects with VOICE_UNAVAILABLE when native missing", async () => {
    if (voiceSession.available) {
      // native SDK present — skip
      return;
    }
    await expect(voiceSession.connect("wss://unused", "token", "Demo")).rejects.toThrow("VOICE_UNAVAILABLE");
  });

  it("fetchVoiceToken rejects without endpoint", async () => {
    await expect(fetchVoiceToken("room", "user", "name")).rejects.toThrow("VOICE_NOT_CONFIGURED");
  });
});
