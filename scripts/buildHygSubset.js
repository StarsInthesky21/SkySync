#!/usr/bin/env node
/**
 * buildHygSubset.js
 *
 * Downloads the HYG catalog v4.2 and writes a compact JSON subset
 * (mag ≤ 6.5) into src/data/hygSubsetExtended.json.
 *
 * Usage:  node scripts/buildHygSubset.js
 */

const fs = require("fs");
const path = require("path");
const https = require("https");

const SOURCE = "https://raw.githubusercontent.com/astronexus/HYG-Database/master/hyg/CURRENT/hygdata_v42.csv";
const OUT = path.join(__dirname, "..", "src", "data", "hygSubsetExtended.json");

function get(url) {
  return new Promise((resolve, reject) => {
    https
      .get(url, (res) => {
        if (res.statusCode && res.statusCode >= 300 && res.statusCode < 400 && res.headers.location) {
          return get(res.headers.location).then(resolve, reject);
        }
        let data = "";
        res.setEncoding("utf8");
        res.on("data", (chunk) => (data += chunk));
        res.on("end", () => resolve(data));
      })
      .on("error", reject);
  });
}

function colorFromCI(ci) {
  if (!Number.isFinite(ci)) return "#d4e2ff";
  if (ci < -0.2) return "#adc8ff";
  if (ci < 0.1) return "#cadcff";
  if (ci < 0.3) return "#d4e2ff";
  if (ci < 0.6) return "#f8f0e0";
  if (ci < 1.0) return "#fff4d6";
  if (ci < 1.4) return "#ffd9a0";
  return "#ffb07b";
}

async function main() {
  console.warn("Fetching HYG database…");
  const csv = await get(SOURCE);
  const lines = csv.split(/\r?\n/);
  const header = lines[0].split(",");
  const idx = Object.fromEntries(header.map((h, i) => [h, i]));

  const keep = [];
  for (let i = 1; i < lines.length; i += 1) {
    const row = lines[i].split(",");
    const mag = parseFloat(row[idx.mag]);
    if (!Number.isFinite(mag) || mag > 6.5) continue;
    const ra = parseFloat(row[idx.ra]);
    const dec = parseFloat(row[idx.dec]);
    const ci = parseFloat(row[idx.ci]);
    const proper = row[idx.proper] || row[idx.bf] || `HIP ${row[idx.hip] || row[idx.id]}`;
    keep.push({
      id: `hyg-${row[idx.id]}`,
      name: proper.replace(/"/g, ""),
      ra: ra * 15,
      dec,
      mag,
      color: colorFromCI(ci),
    });
  }

  console.warn(`Kept ${keep.length} stars (mag ≤ 6.5). Writing ${OUT}…`);
  fs.mkdirSync(path.dirname(OUT), { recursive: true });
  fs.writeFileSync(OUT, JSON.stringify(keep));
  console.warn("Done.");
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
