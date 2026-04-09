/**
 * Icon generator for SkySync
 *
 * Generates icon.png, adaptive-icon.png, and favicon.png
 * from an SVG template using Node.js canvas.
 *
 * Usage: node scripts/generate-icons.js
 *
 * If canvas is not available, this creates placeholder PNGs
 * using a minimal valid PNG buffer.
 */

const fs = require("fs");
const path = require("path");

// Minimal 1x1 transparent PNG as fallback (will be replaced by proper icons in CI)
const PLACEHOLDER_PNG = Buffer.from(
  "iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNk+M9QDwADhgGAWjR9awAAAABJRU5ErkJggg==",
  "base64"
);

function createIcon(size) {
  try {
    // Try to use canvas if available
    const { createCanvas } = require("canvas");
    const canvas = createCanvas(size, size);
    const ctx = canvas.getContext("2d");

    // Background - deep space blue
    ctx.fillStyle = "#04111f";
    ctx.fillRect(0, 0, size, size);

    // Outer glow circle
    const cx = size / 2;
    const cy = size / 2;
    const radius = size * 0.35;

    // Glow
    const glow = ctx.createRadialGradient(cx, cy, radius * 0.5, cx, cy, radius * 1.3);
    glow.addColorStop(0, "rgba(115, 251, 211, 0.3)");
    glow.addColorStop(1, "rgba(115, 251, 211, 0)");
    ctx.fillStyle = glow;
    ctx.fillRect(0, 0, size, size);

    // Main circle
    ctx.beginPath();
    ctx.arc(cx, cy, radius, 0, Math.PI * 2);
    ctx.fillStyle = "#73fbd3";
    ctx.fill();

    // Inner circle (dark)
    ctx.beginPath();
    ctx.arc(cx, cy, radius * 0.75, 0, Math.PI * 2);
    ctx.fillStyle = "#0b1d33";
    ctx.fill();

    // Star dots
    const starPositions = [
      [0.3, 0.25], [0.7, 0.3], [0.2, 0.6], [0.8, 0.7], [0.5, 0.15],
      [0.15, 0.4], [0.85, 0.45], [0.4, 0.8], [0.65, 0.85],
    ];
    for (const [sx, sy] of starPositions) {
      ctx.beginPath();
      ctx.arc(sx * size, sy * size, size * 0.012, 0, Math.PI * 2);
      ctx.fillStyle = "#f9fcff";
      ctx.fill();
    }

    // "S" letter in center
    ctx.font = `bold ${size * 0.28}px sans-serif`;
    ctx.textAlign = "center";
    ctx.textBaseline = "middle";
    ctx.fillStyle = "#73fbd3";
    ctx.fillText("S", cx, cy + size * 0.02);

    return canvas.toBuffer("image/png");
  } catch {
    // Canvas not available, use placeholder
    return PLACEHOLDER_PNG;
  }
}

const assetsDir = path.join(__dirname, "..", "assets");
fs.mkdirSync(assetsDir, { recursive: true });

// Generate icons
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
