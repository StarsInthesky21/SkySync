/**
 * App Icon Generator for SkySync
 *
 * Generates a professional app icon as an SVG that can be exported to PNG.
 * The design features:
 * - Deep space gradient background
 * - Stylized constellation pattern
 * - Crescent moon accent
 * - Clean, modern look suitable for App Store / Play Store
 *
 * Usage: node scripts/generate-icon.js
 * Output: assets/icon-generated.svg
 */

const fs = require("fs");
const path = require("path");

// Generate stars at random but deterministic positions
function generateStars(count, seed) {
  const stars = [];
  for (let i = 0; i < count; i++) {
    const x = Math.sin(seed + i * 12.9898) * 43758.5453;
    const rx = (x - Math.floor(x)) * 1024;
    const y = Math.sin(seed + i * 78.233 + 1.0) * 43758.5453;
    const ry = (y - Math.floor(y)) * 1024;
    const s = Math.sin(seed + i * 37.719 + 2.0) * 43758.5453;
    const size = 1 + (s - Math.floor(s)) * 3;
    const o = Math.sin(seed + i * 53.11 + 3.0) * 43758.5453;
    const opacity = 0.3 + (o - Math.floor(o)) * 0.7;
    stars.push({ x: rx, y: ry, size, opacity });
  }
  return stars;
}

const stars = generateStars(80, 42);

// Constellation points (stylized "S" shape for SkySync)
const constellationPoints = [
  { x: 650, y: 280 },
  { x: 580, y: 350 },
  { x: 500, y: 380 },
  { x: 440, y: 450 },
  { x: 420, y: 540 },
  { x: 470, y: 620 },
  { x: 560, y: 660 },
  { x: 640, y: 700 },
];

const constellationLines = constellationPoints
  .slice(0, -1)
  .map((p, i) => {
    const next = constellationPoints[i + 1];
    return `<line x1="${p.x}" y1="${p.y}" x2="${next.x}" y2="${next.y}" stroke="rgba(115,251,211,0.35)" stroke-width="2.5" stroke-linecap="round"/>`;
  })
  .join("\n    ");

const constellationDots = constellationPoints
  .map(
    (p, i) =>
      `<circle cx="${p.x}" cy="${p.y}" r="${i === 0 || i === constellationPoints.length - 1 ? 6 : 4}" fill="#73fbd3" opacity="${i === 0 || i === constellationPoints.length - 1 ? 1 : 0.8}"/>
    <circle cx="${p.x}" cy="${p.y}" r="${i === 0 || i === constellationPoints.length - 1 ? 14 : 10}" fill="#73fbd3" opacity="0.12"/>`,
  )
  .join("\n    ");

const starElements = stars
  .map(
    (s) =>
      `<circle cx="${s.x.toFixed(1)}" cy="${s.y.toFixed(1)}" r="${s.size.toFixed(1)}" fill="white" opacity="${s.opacity.toFixed(2)}"/>`,
  )
  .join("\n    ");

const svg = `<?xml version="1.0" encoding="UTF-8"?>
<svg width="1024" height="1024" viewBox="0 0 1024 1024" xmlns="http://www.w3.org/2000/svg">
  <defs>
    <!-- Background gradient - deep space -->
    <radialGradient id="bg" cx="50%" cy="40%" r="70%">
      <stop offset="0%" stop-color="#0b1d33"/>
      <stop offset="50%" stop-color="#061428"/>
      <stop offset="100%" stop-color="#020810"/>
    </radialGradient>

    <!-- Glow for accent elements -->
    <radialGradient id="moonGlow" cx="50%" cy="50%" r="50%">
      <stop offset="0%" stop-color="#73fbd3" stop-opacity="0.4"/>
      <stop offset="100%" stop-color="#73fbd3" stop-opacity="0"/>
    </radialGradient>

    <!-- Subtle nebula glow -->
    <radialGradient id="nebula1" cx="30%" cy="25%" r="40%">
      <stop offset="0%" stop-color="#4a5aff" stop-opacity="0.08"/>
      <stop offset="100%" stop-color="#4a5aff" stop-opacity="0"/>
    </radialGradient>
    <radialGradient id="nebula2" cx="70%" cy="75%" r="35%">
      <stop offset="0%" stop-color="#ff6f61" stop-opacity="0.05"/>
      <stop offset="100%" stop-color="#ff6f61" stop-opacity="0"/>
    </radialGradient>

    <!-- Icon shape mask (rounded square) -->
    <clipPath id="iconClip">
      <rect width="1024" height="1024" rx="224" ry="224"/>
    </clipPath>
  </defs>

  <g clip-path="url(#iconClip)">
    <!-- Background -->
    <rect width="1024" height="1024" fill="url(#bg)"/>

    <!-- Nebula hints -->
    <rect width="1024" height="1024" fill="url(#nebula1)"/>
    <rect width="1024" height="1024" fill="url(#nebula2)"/>

    <!-- Background stars -->
    ${starElements}

    <!-- Constellation pattern -->
    ${constellationLines}
    ${constellationDots}

    <!-- Crescent moon accent (top-right area) -->
    <circle cx="760" cy="200" r="80" fill="url(#moonGlow)"/>
    <circle cx="760" cy="200" r="38" fill="#e8f4ff" opacity="0.9"/>
    <circle cx="778" cy="188" r="32" fill="#0b1d33"/>

    <!-- "SS" monogram text -->
    <text x="512" y="540" text-anchor="middle" font-family="system-ui, -apple-system, sans-serif" font-size="280" font-weight="900" fill="#73fbd3" letter-spacing="-12" opacity="0.95">SS</text>

    <!-- Subtle bottom glow line -->
    <line x1="200" y1="820" x2="824" y2="820" stroke="rgba(115,251,211,0.15)" stroke-width="2"/>

    <!-- "SKYSYNC" small text below -->
    <text x="512" y="870" text-anchor="middle" font-family="system-ui, -apple-system, sans-serif" font-size="64" font-weight="800" fill="rgba(115,251,211,0.5)" letter-spacing="16">SKYSYNC</text>
  </g>
</svg>`;

const outputPath = path.join(__dirname, "..", "assets", "icon-generated.svg");
fs.writeFileSync(outputPath, svg);
console.log(`Icon SVG generated at: ${outputPath}`);
console.log("To convert to PNG for App Store:");
console.log("  - Use Figma, Sketch, or an online SVG-to-PNG converter");
console.log("  - Export at 1024x1024 for App Store, 512x512 for Play Store");
console.log("  - The icon uses a rounded rectangle clip (224px radius at 1024px)");
