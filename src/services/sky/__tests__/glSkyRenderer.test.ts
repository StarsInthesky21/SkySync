import { buildViewProjectionMatrix } from "../glSkyRenderer";

describe("glSkyRenderer", () => {
  it("produces a 4x4 Float32Array matrix", () => {
    const m = buildViewProjectionMatrix([0, 0, 0, 1], 0, 0, 60, 1);
    expect(m).toBeInstanceOf(Float32Array);
    expect(m.length).toBe(16);
  });

  it("final row is 0,0,0,1 (w axis)", () => {
    const m = buildViewProjectionMatrix([0, 0, 0, 1], 30, 45, 60, 1.5);
    expect(m[12]).toBe(0);
    expect(m[13]).toBe(0);
    expect(m[14]).toBe(0);
    expect(m[15]).toBe(1);
  });

  it("identity quaternion at LST=0 lat=0 produces non-zero entries", () => {
    const m = buildViewProjectionMatrix([0, 0, 0, 1], 0, 0, 60, 1);
    // At least one rotation entry should be non-zero.
    const rotEntries = [m[0], m[1], m[4], m[5], m[8], m[9]];
    expect(rotEntries.some((v) => v !== 0)).toBe(true);
  });
});
