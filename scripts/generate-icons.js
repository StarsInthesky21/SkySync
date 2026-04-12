/**
 * Icon generator for SkySync
 *
 * Generates icon.png, adaptive-icon.png, and favicon.png
 * using a pure Node.js PNG encoder so CI does not depend on native canvas.
 */

const fs = require("fs");
const path = require("path");
const zlib = require("zlib");

const BACKGROUND = [4, 17, 31, 255];
const GLOW = [115, 251, 211, 255];
const DEEP = [11, 29, 51, 255];
const STAR = [249, 252, 255, 255];

const PNG_SIGNATURE = Buffer.from([137, 80, 78, 71, 13, 10, 26, 10]);

function makeCrcTable() {
  const table = new Uint32Array(256);
  for (let n = 0; n < 256; n += 1) {
    let c = n;
    for (let k = 0; k < 8; k += 1) {
      c = c & 1 ? 0xedb88320 ^ (c >>> 1) : c >>> 1;
    }
    table[n] = c >>> 0;
  }
  return table;
}

const CRC_TABLE = makeCrcTable();

function crc32(buffer) {
  let crc = 0xffffffff;
  for (let i = 0; i < buffer.length; i += 1) {
    crc = CRC_TABLE[(crc ^ buffer[i]) & 0xff] ^ (crc >>> 8);
  }
  return (crc ^ 0xffffffff) >>> 0;
}

function pngChunk(type, data) {
  const typeBuffer = Buffer.from(type, "ascii");
  const chunk = Buffer.alloc(12 + data.length);
  chunk.writeUInt32BE(data.length, 0);
  typeBuffer.copy(chunk, 4);
  data.copy(chunk, 8);
  const crc = crc32(Buffer.concat([typeBuffer, data]));
  chunk.writeUInt32BE(crc, 8 + data.length);
  return chunk;
}

function blendPixel(data, width, x, y, rgba, alphaScale = 1) {
  if (x < 0 || y < 0 || x >= width || y >= data.length / 4 / width) {
    return;
  }

  const index = (y * width + x) * 4;
  const sourceAlpha = (rgba[3] / 255) * alphaScale;
  const destAlpha = data[index + 3] / 255;
  const outAlpha = sourceAlpha + destAlpha * (1 - sourceAlpha);

  if (outAlpha <= 0) {
    return;
  }

  for (let channel = 0; channel < 3; channel += 1) {
    const src = rgba[channel] / 255;
    const dst = data[index + channel] / 255;
    const out = (src * sourceAlpha + dst * destAlpha * (1 - sourceAlpha)) / outAlpha;
    data[index + channel] = Math.round(out * 255);
  }

  data[index + 3] = Math.round(outAlpha * 255);
}

function drawCircle(data, width, height, cx, cy, radius, color, alphaScale = 1) {
  const minX = Math.max(0, Math.floor(cx - radius - 1));
  const maxX = Math.min(width - 1, Math.ceil(cx + radius + 1));
  const minY = Math.max(0, Math.floor(cy - radius - 1));
  const maxY = Math.min(height - 1, Math.ceil(cy + radius + 1));
  const radiusSquared = radius * radius;

  for (let y = minY; y <= maxY; y += 1) {
    for (let x = minX; x <= maxX; x += 1) {
      const dx = x + 0.5 - cx;
      const dy = y + 0.5 - cy;
      const distanceSquared = dx * dx + dy * dy;
      if (distanceSquared <= radiusSquared) {
        blendPixel(data, width, x, y, color, alphaScale);
      }
    }
  }
}

function drawGlow(data, width, height, cx, cy, innerRadius, outerRadius, color) {
  const minX = Math.max(0, Math.floor(cx - outerRadius - 1));
  const maxX = Math.min(width - 1, Math.ceil(cx + outerRadius + 1));
  const minY = Math.max(0, Math.floor(cy - outerRadius - 1));
  const maxY = Math.min(height - 1, Math.ceil(cy + outerRadius + 1));

  for (let y = minY; y <= maxY; y += 1) {
    for (let x = minX; x <= maxX; x += 1) {
      const dx = x + 0.5 - cx;
      const dy = y + 0.5 - cy;
      const distance = Math.sqrt(dx * dx + dy * dy);
      if (distance <= outerRadius) {
        const t = Math.max(0, Math.min(1, (distance - innerRadius) / Math.max(outerRadius - innerRadius, 1)));
        const alphaScale = Math.max(0, (1 - t) * 0.38);
        blendPixel(data, width, x, y, color, alphaScale);
      }
    }
  }
}

function drawRect(data, width, height, left, top, rectWidth, rectHeight, color, alphaScale = 1) {
  const right = Math.min(width, left + rectWidth);
  const bottom = Math.min(height, top + rectHeight);
  for (let y = Math.max(0, top); y < bottom; y += 1) {
    for (let x = Math.max(0, left); x < right; x += 1) {
      blendPixel(data, width, x, y, color, alphaScale);
    }
  }
}

function drawLetterS(data, width, height, size) {
  const scale = size / 1024;
  const stroke = Math.max(2, Math.round(72 * scale));
  const barWidth = Math.max(2, Math.round(250 * scale));
  const left = Math.round(width * 0.385);
  const top = Math.round(height * 0.3);
  const center = Math.round(height * 0.49);
  const bottom = Math.round(height * 0.67);

  drawRect(data, width, height, left, top, barWidth, stroke, GLOW, 0.95);
  drawRect(data, width, height, left, center, barWidth, stroke, GLOW, 0.95);
  drawRect(data, width, height, left, bottom, barWidth, stroke, GLOW, 0.95);

  drawRect(data, width, height, left, top, stroke, center - top, GLOW, 0.95);
  drawRect(
    data,
    width,
    height,
    left + barWidth - stroke,
    center,
    stroke,
    bottom - center + stroke,
    GLOW,
    0.95,
  );
}

function createPixelBuffer(size) {
  const width = size;
  const height = size;
  const data = Buffer.alloc(width * height * 4);

  for (let y = 0; y < height; y += 1) {
    for (let x = 0; x < width; x += 1) {
      const index = (y * width + x) * 4;
      data[index] = BACKGROUND[0];
      data[index + 1] = BACKGROUND[1];
      data[index + 2] = BACKGROUND[2];
      data[index + 3] = BACKGROUND[3];
    }
  }

  const cx = width / 2;
  const cy = height / 2;
  const radius = size * 0.34;

  drawGlow(data, width, height, cx, cy, radius * 0.45, radius * 1.28, GLOW);
  drawCircle(data, width, height, cx, cy, radius, GLOW, 0.9);
  drawCircle(data, width, height, cx, cy, radius * 0.76, DEEP, 1);
  drawLetterS(data, width, height, size);

  const stars = [
    [0.26, 0.2, 0.016],
    [0.72, 0.27, 0.013],
    [0.18, 0.47, 0.012],
    [0.81, 0.58, 0.014],
    [0.62, 0.79, 0.011],
    [0.37, 0.86, 0.01],
    [0.52, 0.14, 0.012],
  ];

  for (const [sx, sy, sr] of stars) {
    drawCircle(data, width, height, sx * width, sy * height, size * sr, STAR, 1);
  }

  return data;
}

function encodePng(width, height, rgbaBuffer) {
  const stride = width * 4 + 1;
  const raw = Buffer.alloc(stride * height);

  for (let y = 0; y < height; y += 1) {
    const rowStart = y * stride;
    raw[rowStart] = 0;
    rgbaBuffer.copy(raw, rowStart + 1, y * width * 4, (y + 1) * width * 4);
  }

  const ihdr = Buffer.alloc(13);
  ihdr.writeUInt32BE(width, 0);
  ihdr.writeUInt32BE(height, 4);
  ihdr[8] = 8;
  ihdr[9] = 6;
  ihdr[10] = 0;
  ihdr[11] = 0;
  ihdr[12] = 0;

  const compressed = zlib.deflateSync(raw, { level: 9 });

  return Buffer.concat([
    PNG_SIGNATURE,
    pngChunk("IHDR", ihdr),
    pngChunk("IDAT", compressed),
    pngChunk("IEND", Buffer.alloc(0)),
  ]);
}

function createIcon(size) {
  const pixels = createPixelBuffer(size);
  return encodePng(size, size, pixels);
}

const assetsDir = path.join(__dirname, "..", "assets");
fs.mkdirSync(assetsDir, { recursive: true });

const iconSizes = {
  "icon.png": 1024,
  "adaptive-icon.png": 1024,
  "favicon.png": 48,
};

for (const [filename, size] of Object.entries(iconSizes)) {
  const filepath = path.join(assetsDir, filename);
  const buffer = createIcon(size);
  fs.writeFileSync(filepath, buffer);
  console.log(`Generated ${filename} (${size}x${size})`);
}

console.log("Icon generation complete!");
