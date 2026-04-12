import {
  equatorialToVector,
  eulerToQuaternion,
  projectToScreen,
  rotateByQuaternion,
  quaternionConjugate,
  slerpQ,
  celestialToLocal,
} from "../skyProjection";

describe("skyProjection", () => {
  it("converts equatorial origin to unit vector along +X", () => {
    const v = equatorialToVector(0, 0);
    expect(v[0]).toBeCloseTo(1, 6);
    expect(v[1]).toBeCloseTo(0, 6);
    expect(v[2]).toBeCloseTo(0, 6);
  });

  it("maps celestial north pole to +Z", () => {
    const v = equatorialToVector(0, 90);
    expect(v[2]).toBeCloseTo(1, 6);
  });

  it("identity quaternion leaves vectors unchanged", () => {
    const v: [number, number, number] = [0.3, -0.4, 0.86];
    const rotated = rotateByQuaternion(v, [0, 0, 0, 1]);
    expect(rotated[0]).toBeCloseTo(v[0], 6);
    expect(rotated[1]).toBeCloseTo(v[1], 6);
    expect(rotated[2]).toBeCloseTo(v[2], 6);
  });

  it("conjugate inverts rotation", () => {
    const q = eulerToQuaternion(40, 10, -5);
    const qInv = quaternionConjugate(q);
    const v: [number, number, number] = [1, 2, 3];
    const rot = rotateByQuaternion(v, q);
    const back = rotateByQuaternion(rot, qInv);
    expect(back[0]).toBeCloseTo(1, 4);
    expect(back[1]).toBeCloseTo(2, 4);
    expect(back[2]).toBeCloseTo(3, 4);
  });

  it("returns null when a point is behind the camera", () => {
    const p = projectToScreen([0, 0, -1], [0, 0, 0, 1], 60, 1);
    expect(p).toBeNull();
  });

  it("projects an on-axis point to screen center", () => {
    const p = projectToScreen([0, 0, 1], [0, 0, 0, 1], 60, 1);
    expect(p).not.toBeNull();
    expect(p!.x).toBeCloseTo(0, 6);
    expect(p!.y).toBeCloseTo(0, 6);
  });

  it("slerpQ is bounded", () => {
    const q = slerpQ([0, 0, 0, 1], eulerToQuaternion(90, 0, 0), 0.5);
    const norm = Math.sqrt(q[0] ** 2 + q[1] ** 2 + q[2] ** 2 + q[3] ** 2);
    expect(norm).toBeCloseTo(1, 3);
  });

  it("celestialToLocal preserves vector norm", () => {
    const v = equatorialToVector(150, 30);
    const local = celestialToLocal(v, 37.7, 120);
    const norm = Math.sqrt(local[0] ** 2 + local[1] ** 2 + local[2] ** 2);
    expect(norm).toBeCloseTo(1, 5);
  });
});
