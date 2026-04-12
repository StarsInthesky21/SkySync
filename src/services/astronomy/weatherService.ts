/**
 * weatherService.ts
 *
 * Open-Meteo integration for sky-observing conditions. No API key required.
 * Cached 30 minutes per location bucket.
 */

import AsyncStorage from "@react-native-async-storage/async-storage";

export type ObservingWeather = {
  fetchedAt: number;
  cloudCoverPct: number;
  humidityPct: number;
  temperatureC: number;
  windKph: number;
  visibilityKm: number;
  precipitationProbPct: number;
  sourceUrl: string;
};

const CACHE_PREFIX = "skysync.weather.v1.";
const CACHE_TTL_MS = 30 * 60 * 1000;

function bucketKey(latDeg: number, lonDeg: number): string {
  const lat = Math.round(latDeg * 10) / 10;
  const lon = Math.round(lonDeg * 10) / 10;
  return `${CACHE_PREFIX}${lat}_${lon}`;
}

export async function fetchObservingWeather(
  latitudeDeg: number,
  longitudeDeg: number,
): Promise<ObservingWeather | null> {
  const key = bucketKey(latitudeDeg, longitudeDeg);
  const cachedRaw = await AsyncStorage.getItem(key);
  if (cachedRaw) {
    try {
      const parsed: ObservingWeather = JSON.parse(cachedRaw);
      if (Date.now() - parsed.fetchedAt < CACHE_TTL_MS) return parsed;
    } catch {
      // fallthrough
    }
  }

  const params = new URLSearchParams({
    latitude: latitudeDeg.toFixed(3),
    longitude: longitudeDeg.toFixed(3),
    current:
      "cloud_cover,relative_humidity_2m,temperature_2m,wind_speed_10m,visibility,precipitation_probability",
    wind_speed_unit: "kmh",
    timezone: "UTC",
  });
  const url = `https://api.open-meteo.com/v1/forecast?${params.toString()}`;
  try {
    const r = await fetch(url);
    if (!r.ok) throw new Error(`status ${r.status}`);
    const data = await r.json();
    const c = data.current ?? {};
    const result: ObservingWeather = {
      fetchedAt: Date.now(),
      cloudCoverPct: Number(c.cloud_cover ?? 0),
      humidityPct: Number(c.relative_humidity_2m ?? 0),
      temperatureC: Number(c.temperature_2m ?? 0),
      windKph: Number(c.wind_speed_10m ?? 0),
      visibilityKm: Number((c.visibility ?? 0) / 1000),
      precipitationProbPct: Number(c.precipitation_probability ?? 0),
      sourceUrl: url,
    };
    try {
      await AsyncStorage.setItem(key, JSON.stringify(result));
    } catch {
      // ignore
    }
    return result;
  } catch {
    if (cachedRaw) {
      try {
        return JSON.parse(cachedRaw);
      } catch {
        return null;
      }
    }
    return null;
  }
}
