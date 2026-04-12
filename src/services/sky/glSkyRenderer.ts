/**
 * glSkyRenderer.ts
 *
 * Low-level GL draw for the 3D sky scene. Accepts any WebGL 1 context
 * (expo-gl in Expo, native WebGLRenderingContext in tests via headless-gl)
 * and draws a full celestial sphere of stars as GL_POINTS.
 */

import type { SkyObject } from "@/types/sky";
import type { Quaternion } from "./skyProjection";

export type GLContextLike = WebGLRenderingContext;

export type GLSkyHandles = {
  drawFrame: (options: {
    quaternion: Quaternion;
    observerLatDeg: number;
    localSiderealDeg: number;
    fovYDeg: number;
  }) => void;
  destroy: () => void;
  objectCount: number;
};

const VERTEX_SHADER = `
attribute vec3 aPosition;
attribute vec3 aColor;
attribute float aMagnitude;

uniform mat4 uView;
uniform float uPointScale;

varying vec3 vColor;

void main(void) {
  vec4 pos = uView * vec4(aPosition, 0.0);
  gl_Position = vec4(pos.x, pos.y, 0.5, max(pos.z, 0.001));
  gl_PointSize = max(1.5, (6.0 - aMagnitude) * uPointScale);
  vColor = aColor;
}
`;

const FRAGMENT_SHADER = `
precision mediump float;
varying vec3 vColor;

void main(void) {
  vec2 uv = gl_PointCoord - vec2(0.5);
  float d = length(uv);
  float alpha = smoothstep(0.5, 0.05, d);
  gl_FragColor = vec4(vColor, alpha);
}
`;

export function initGLScene(gl: GLContextLike, objects: SkyObject[]): GLSkyHandles {
  const vs = compileShader(gl, gl.VERTEX_SHADER, VERTEX_SHADER);
  const fs = compileShader(gl, gl.FRAGMENT_SHADER, FRAGMENT_SHADER);
  const program = gl.createProgram()!;
  gl.attachShader(program, vs);
  gl.attachShader(program, fs);
  gl.linkProgram(program);
  if (!gl.getProgramParameter(program, gl.LINK_STATUS)) {
    throw new Error(`Shader link failed: ${gl.getProgramInfoLog(program)}`);
  }
  gl.useProgram(program);

  const aPosition = gl.getAttribLocation(program, "aPosition");
  const aColor = gl.getAttribLocation(program, "aColor");
  const aMagnitude = gl.getAttribLocation(program, "aMagnitude");
  const uView = gl.getUniformLocation(program, "uView");
  const uPointScale = gl.getUniformLocation(program, "uPointScale");

  const vertexData = new Float32Array(objects.length * 7);
  for (let i = 0; i < objects.length; i += 1) {
    const obj = objects[i];
    const raRad = (obj.longitude * Math.PI) / 180;
    const decRad = (obj.latitude * Math.PI) / 180;
    const cosDec = Math.cos(decRad);
    const { r, g, b } = hexToRgb(obj.color);
    const off = i * 7;
    vertexData[off + 0] = cosDec * Math.cos(raRad);
    vertexData[off + 1] = cosDec * Math.sin(raRad);
    vertexData[off + 2] = Math.sin(decRad);
    vertexData[off + 3] = r;
    vertexData[off + 4] = g;
    vertexData[off + 5] = b;
    vertexData[off + 6] = obj.magnitude;
  }

  const buffer = gl.createBuffer();
  gl.bindBuffer(gl.ARRAY_BUFFER, buffer);
  gl.bufferData(gl.ARRAY_BUFFER, vertexData, gl.STATIC_DRAW);

  const stride = 7 * 4;
  gl.enableVertexAttribArray(aPosition);
  gl.vertexAttribPointer(aPosition, 3, gl.FLOAT, false, stride, 0);
  gl.enableVertexAttribArray(aColor);
  gl.vertexAttribPointer(aColor, 3, gl.FLOAT, false, stride, 12);
  gl.enableVertexAttribArray(aMagnitude);
  gl.vertexAttribPointer(aMagnitude, 1, gl.FLOAT, false, stride, 24);

  gl.enable(gl.BLEND);
  gl.blendFunc(gl.SRC_ALPHA, gl.ONE);

  const drawFrame: GLSkyHandles["drawFrame"] = ({
    quaternion,
    observerLatDeg,
    localSiderealDeg,
    fovYDeg,
  }) => {
    const w = gl.drawingBufferWidth;
    const h = gl.drawingBufferHeight;
    gl.viewport(0, 0, w, h);
    gl.clearColor(0.0, 0.008, 0.02, 1.0);
    gl.clear(gl.COLOR_BUFFER_BIT | gl.DEPTH_BUFFER_BIT);

    const matrix = buildViewProjectionMatrix(quaternion, observerLatDeg, localSiderealDeg, fovYDeg, w / h);
    gl.uniformMatrix4fv(uView, false, matrix);
    gl.uniform1f(uPointScale, Math.min(w, h) / 250);

    gl.drawArrays(gl.POINTS, 0, objects.length);
  };

  return {
    drawFrame,
    destroy: () => {
      /* no-op */
    },
    objectCount: objects.length,
  };
}

function compileShader(gl: GLContextLike, type: number, source: string) {
  const shader = gl.createShader(type);
  if (!shader) throw new Error("createShader returned null");
  gl.shaderSource(shader, source);
  gl.compileShader(shader);
  if (!gl.getShaderParameter(shader, gl.COMPILE_STATUS)) {
    throw new Error(`Shader compile failed: ${gl.getShaderInfoLog(shader)}`);
  }
  return shader;
}

function hexToRgb(hex: string): { r: number; g: number; b: number } {
  const clean = hex.replace("#", "");
  const full =
    clean.length === 3
      ? clean
          .split("")
          .map((c) => c + c)
          .join("")
      : clean;
  const n = parseInt(full.slice(0, 6), 16);
  return {
    r: ((n >> 16) & 0xff) / 255,
    g: ((n >> 8) & 0xff) / 255,
    b: (n & 0xff) / 255,
  };
}

export function buildViewProjectionMatrix(
  q: Quaternion,
  observerLatDeg: number,
  localSiderealDeg: number,
  fovYDeg: number,
  aspect: number,
): Float32Array {
  const DEG = Math.PI / 180;
  const tanY = Math.tan((fovYDeg * DEG) / 2);
  const tanX = tanY * aspect;

  const lst = -localSiderealDeg * DEG;
  const cosL = Math.cos(lst);
  const sinL = Math.sin(lst);
  const colat = (90 - observerLatDeg) * DEG;
  const cosC = Math.cos(colat);
  const sinC = Math.sin(colat);

  // M_observer = axis-swap ∘ Ry(colat) ∘ Rz(-LST)
  // We construct columns as transformed celestial basis vectors, matching
  // src/services/sky/skyProjection.ts:celestialToLocal exactly.
  const basis = (v: [number, number, number]) => {
    const x1 = v[0] * cosL - v[1] * sinL;
    const y1 = v[0] * sinL + v[1] * cosL;
    const z1 = v[2];
    const x2 = x1 * cosC + z1 * sinC;
    const y2 = y1;
    const z2 = -x1 * sinC + z1 * cosC;
    return [-y2, z2, -x2] as [number, number, number];
  };

  const cx = basis([1, 0, 0]);
  const cy = basis([0, 1, 0]);
  const cz = basis([0, 0, 1]);

  // Inverse device quaternion
  const [qx, qy, qz, qw] = q;
  const inv: Quaternion = [-qx, -qy, -qz, qw];

  const rot = (v: [number, number, number]): [number, number, number] => {
    const [vx, vy, vz] = v;
    const tx = 2 * (inv[1] * vz - inv[2] * vy);
    const ty = 2 * (inv[2] * vx - inv[0] * vz);
    const tz = 2 * (inv[0] * vy - inv[1] * vx);
    return [
      vx + inv[3] * tx + (inv[1] * tz - inv[2] * ty),
      vy + inv[3] * ty + (inv[2] * tx - inv[0] * tz),
      vz + inv[3] * tz + (inv[0] * ty - inv[1] * tx),
    ];
  };

  const rx = rot(cx);
  const ry = rot(cy);
  const rz = rot(cz);

  // Column-major matrix mapping celestial basis → clip space
  const m = new Float32Array(16);
  m[0] = rx[0] / tanX;
  m[1] = -rx[1] / tanY;
  m[2] = 0;
  m[3] = 0;
  m[4] = ry[0] / tanX;
  m[5] = -ry[1] / tanY;
  m[6] = 0;
  m[7] = 0;
  m[8] = rz[0] / tanX;
  m[9] = -rz[1] / tanY;
  m[10] = 0;
  m[11] = 0;
  m[12] = 0;
  m[13] = 0;
  m[14] = 0;
  m[15] = 1;
  // Store depth in column 2 so shader can z-divide by positive Z.
  // We actually don't need Z-divide for a celestial sphere — everything
  // is at infinity — so we rely on the shader's max() clamp.
  m[2] = 0;
  m[6] = 0;
  m[10] = 0;

  return m;
}
