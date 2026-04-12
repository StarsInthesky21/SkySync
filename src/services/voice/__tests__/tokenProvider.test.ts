import { fetchVoiceToken } from "../tokenProvider";

describe("tokenProvider", () => {
  const originalFetch = globalThis.fetch;

  afterEach(() => {
    globalThis.fetch = originalFetch;
  });

  it("throws when no endpoint configured", async () => {
    await expect(fetchVoiceToken("room1", "user1", "Demo")).rejects.toThrow("VOICE_NOT_CONFIGURED");
  });

  it("returns parsed payload on success", async () => {
    globalThis.fetch = jest.fn().mockResolvedValue({
      ok: true,
      json: async () => ({
        token: "abc",
        livekitUrl: "wss://lk.example",
        expiresAt: Date.now() + 60_000,
      }),
    }) as unknown as typeof fetch;
    const res = await fetchVoiceToken("r", "u", "n", {
      endpoint: "https://example.com/token",
    });
    expect(res.token).toBe("abc");
    expect(res.livekitUrl).toBe("wss://lk.example");
  });

  it("throws when payload is malformed", async () => {
    globalThis.fetch = jest.fn().mockResolvedValue({
      ok: true,
      json: async () => ({ token: "abc" }),
    }) as unknown as typeof fetch;
    await expect(fetchVoiceToken("r", "u", "n", { endpoint: "https://example.com/token" })).rejects.toThrow(
      "TOKEN_MALFORMED",
    );
  });

  it("surfaces HTTP error codes", async () => {
    globalThis.fetch = jest.fn().mockResolvedValue({
      ok: false,
      status: 401,
    }) as unknown as typeof fetch;
    await expect(fetchVoiceToken("r", "u", "n", { endpoint: "https://example.com/token" })).rejects.toThrow(
      "TOKEN_HTTP_401",
    );
  });
});
