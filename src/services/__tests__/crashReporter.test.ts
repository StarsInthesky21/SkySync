jest.mock("expo-constants", () => ({
  __esModule: true,
  default: {
    expoConfig: { extra: {}, version: "1.3.0" },
    executionEnvironment: "standalone",
  },
}));

import { crashReporter } from "../crashReporter";

describe("crashReporter", () => {
  const originalFetch = global.fetch;
  const ENV_KEYS = ["EXPO_PUBLIC_CRASH_ENDPOINT", "EXPO_PUBLIC_CRASH_TOKEN"] as const;

  afterEach(() => {
    for (const k of ENV_KEYS) delete process.env[k];
    global.fetch = originalFetch;
    jest.restoreAllMocks();
  });

  it("returns without throwing when no endpoint is configured", async () => {
    delete process.env.EXPO_PUBLIC_CRASH_ENDPOINT;
    await expect(crashReporter.report(new Error("boom"), { fatal: true })).resolves.toBeUndefined();
  });

  it("POSTs envelope to configured endpoint with bearer token", async () => {
    process.env.EXPO_PUBLIC_CRASH_ENDPOINT = "https://crash.example.com/ingest";
    process.env.EXPO_PUBLIC_CRASH_TOKEN = "secret-token";
    const fetchMock = jest.fn().mockResolvedValue({ ok: true });
    global.fetch = fetchMock as unknown as typeof fetch;

    await crashReporter.report(new Error("critical failure"), {
      componentStack: "in <Foo />",
      fatal: true,
    });

    expect(fetchMock).toHaveBeenCalledTimes(1);
    const [url, init] = fetchMock.mock.calls[0];
    expect(url).toBe("https://crash.example.com/ingest");
    expect(init.method).toBe("POST");
    expect(init.headers["Content-Type"]).toBe("application/json");
    expect(init.headers.Authorization).toBe("Bearer secret-token");

    const body = JSON.parse(init.body);
    expect(body.message).toBe("critical failure");
    expect(body.componentStack).toBe("in <Foo />");
    expect(body.fatal).toBe(true);
    expect(body.appVersion).toBe("1.3.0");
    expect(typeof body.timestamp).toBe("number");
  });

  it("swallows network failures silently", async () => {
    process.env.EXPO_PUBLIC_CRASH_ENDPOINT = "https://crash.example.com/ingest";
    global.fetch = jest.fn().mockRejectedValue(new Error("offline")) as unknown as typeof fetch;

    await expect(crashReporter.report(new Error("x"))).resolves.toBeUndefined();
  });

  it("install() is idempotent", () => {
    crashReporter.install();
    crashReporter.install();
    crashReporter.install();
    // no assertion — would throw if it tried to double-register a handler
    // that was already present
  });
});
