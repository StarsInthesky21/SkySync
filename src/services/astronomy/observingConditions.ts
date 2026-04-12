/**
 * observingConditions.ts
 *
 * Combines weather + moon phase + time-of-day into a single observability
 * score 0..100 and a human-readable recommendation.
 */

import { equatorialToHorizon, moonEquatorial, moonIllumination, sunEquatorial } from "./planetEphemeris";
import type { ObservingWeather } from "./weatherService";

export type ObservingAssessment = {
  score: number; // 0..100
  rating: "poor" | "fair" | "good" | "excellent";
  headline: string;
  details: string[];
  moonIllumination: number;
  sunAltitudeDeg: number;
};

export function assessObservingConditions(input: {
  date: Date;
  latitudeDeg: number;
  longitudeDeg: number;
  weather?: ObservingWeather | null;
}): ObservingAssessment {
  const { date, latitudeDeg, longitudeDeg, weather } = input;

  const sunPos = sunEquatorial(date);
  const sunHorizon = equatorialToHorizon(sunPos, date, latitudeDeg, longitudeDeg);
  const moonPos = moonEquatorial(date);
  const moonHorizon = equatorialToHorizon(moonPos, date, latitudeDeg, longitudeDeg);
  const illum = moonIllumination(date);

  let score = 100;
  const details: string[] = [];

  if (sunHorizon.altitudeDeg > -6) {
    score -= 70;
    details.push("Sun is up — wait for astronomical twilight.");
  } else if (sunHorizon.altitudeDeg > -12) {
    score -= 25;
    details.push("Civil/nautical twilight — brighter stars only.");
  } else if (sunHorizon.altitudeDeg > -18) {
    score -= 5;
    details.push("Astronomical twilight — dim objects still washed out.");
  } else {
    details.push("Full astronomical darkness.");
  }

  if (moonHorizon.altitudeDeg > 0) {
    const moonImpact = illum * 35;
    score -= moonImpact;
    details.push(`Moon is ${Math.round(illum * 100)}% illuminated and above horizon — expect sky glow.`);
  } else if (illum > 0.5) {
    details.push(`Moon is ${Math.round(illum * 100)}% illuminated but below horizon.`);
  }

  if (weather) {
    if (weather.cloudCoverPct > 70) {
      score -= 45;
      details.push(`${Math.round(weather.cloudCoverPct)}% cloud cover — heavy overcast.`);
    } else if (weather.cloudCoverPct > 30) {
      score -= 15;
      details.push(`${Math.round(weather.cloudCoverPct)}% cloud cover — partial.`);
    } else {
      details.push(`${Math.round(weather.cloudCoverPct)}% cloud cover — mostly clear.`);
    }
    if (weather.humidityPct > 85) {
      score -= 10;
      details.push(`High humidity (${Math.round(weather.humidityPct)}%) — dew on optics likely.`);
    }
    if (weather.windKph > 30) {
      score -= 8;
      details.push(`Windy (${Math.round(weather.windKph)} kph) — unsteady seeing.`);
    }
    if (weather.precipitationProbPct > 40) {
      score -= 20;
      details.push(`${Math.round(weather.precipitationProbPct)}% chance of precipitation.`);
    }
  } else {
    details.push("No weather data — using baseline assumptions.");
  }

  score = Math.max(0, Math.min(100, Math.round(score)));

  let rating: ObservingAssessment["rating"];
  let headline: string;
  if (score >= 80) {
    rating = "excellent";
    headline = "Excellent night for deep-sky observing.";
  } else if (score >= 60) {
    rating = "good";
    headline = "Good conditions — most targets accessible.";
  } else if (score >= 35) {
    rating = "fair";
    headline = "Mixed conditions — stick to brighter targets.";
  } else {
    rating = "poor";
    headline = "Poor — consider rescheduling.";
  }

  return {
    score,
    rating,
    headline,
    details,
    moonIllumination: illum,
    sunAltitudeDeg: sunHorizon.altitudeDeg,
  };
}
