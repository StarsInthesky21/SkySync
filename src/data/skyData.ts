import { CelestialObject, ConstellationLine, DiscoverySuggestion, SpaceEvent } from "@/types/sky";
import { Achievement, SkyRoom } from "@/types/rooms";

export const celestialCatalog: CelestialObject[] = [
  {
    id: "sirius",
    name: "Sirius",
    kind: "star",
    distance: "8.6 light-years",
    magnitude: -1.46,
    mythology: "Known as the Dog Star, Sirius guided seasonal calendars across Egypt and Greece.",
    facts: ["Brightest star in Earth's night sky.", "Binary star system in Canis Major."],
    screenX: 0.22,
    screenY: 0.28,
    color: "#bfe8ff",
    label: "Alpha Canis Majoris",
    constellationId: "canis-major",
  },
  {
    id: "betelgeuse",
    name: "Betelgeuse",
    kind: "star",
    distance: "548 light-years",
    magnitude: 0.42,
    mythology: "A red supergiant marking Orion's shoulder in many hunter myths.",
    facts: ["Red supergiant nearing the end of its stellar life.", "Its brightness visibly varies."],
    screenX: 0.61,
    screenY: 0.34,
    color: "#ffb46f",
    constellationId: "orion",
  },
  {
    id: "rigel",
    name: "Rigel",
    kind: "star",
    distance: "863 light-years",
    magnitude: 0.13,
    mythology: "Blue-white beacon marking Orion's foot.",
    facts: ["Supergiant roughly 120,000 times brighter than the Sun.", "One of the easiest bright stars to locate in winter skies."],
    screenX: 0.67,
    screenY: 0.63,
    color: "#dbe9ff",
    constellationId: "orion",
  },
  {
    id: "mars",
    name: "Mars",
    kind: "planet",
    distance: "225 million km",
    magnitude: -0.7,
    mythology: "Named for the Roman god of war because of its blood-red glow.",
    facts: ["Its iron oxide dust makes the planet appear red.", "Home to Olympus Mons, the tallest volcano in the solar system."],
    screenX: 0.46,
    screenY: 0.48,
    color: "#ff6f61",
  },
  {
    id: "jupiter",
    name: "Jupiter",
    kind: "planet",
    distance: "778 million km",
    magnitude: -2.1,
    mythology: "King of the Roman gods, mirrored in the planet's commanding brightness.",
    facts: ["Largest planet in the solar system.", "Its Great Red Spot is a giant persistent storm."],
    screenX: 0.79,
    screenY: 0.24,
    color: "#ffd89c",
  },
  {
    id: "iss",
    name: "ISS",
    kind: "satellite",
    distance: "408 km",
    magnitude: -3.0,
    mythology: "A human-made moving star and symbol of international collaboration.",
    facts: ["Orbits Earth about every 90 minutes.", "Visible to the naked eye during many passes."],
    screenX: 0.14,
    screenY: 0.16,
    color: "#f8fbff",
  },
];

export const constellationLines: ConstellationLine[] = [
  { id: "orion-1", from: "betelgeuse", to: "rigel" },
  { id: "orion-2", from: "betelgeuse", to: "mars" },
];

export const discoverySuggestions: DiscoverySuggestion[] = [
  {
    id: "planet-highlight",
    title: "Visible planets right now",
    detail: "Mars and Jupiter are the brightest targets in your current field of view.",
    urgency: "live",
    objectId: "mars",
  },
  {
    id: "meteor-alert",
    title: "Meteor shower alert",
    detail: "A meteor radiant rises after midnight. Save a room to watch together.",
    urgency: "tonight",
  },
  {
    id: "story-mode",
    title: "Sky story",
    detail: "Orion is fully framed. Tap its shoulder to open mythology mode.",
    urgency: "watch",
    objectId: "betelgeuse",
  },
];

export const spaceEvents: SpaceEvent[] = [
  {
    id: "iss-flyover",
    title: "ISS Flyover",
    window: "8:42 PM - 8:48 PM",
    detail: "Bright overhead pass from northwest to southeast.",
  },
  {
    id: "lyrids",
    title: "Lyrids Preview",
    window: "After 11:30 PM",
    detail: "Expect fast streaks near Lyra with low moonlight interference.",
  },
  {
    id: "jupiter-window",
    title: "Jupiter Prime Time",
    window: "Now",
    detail: "Steady high altitude view with minimal haze at your location.",
  },
];

export const initialRooms: SkyRoom[] = [
  {
    id: "northern-watch",
    name: "Northern Watch",
    inviteCode: "SKY-428",
    voiceEnabled: true,
    participants: ["You", "Ava", "Kian"],
    markers: [
      {
        id: "marker-1",
        objectId: "mars",
        title: "Mars Challenge",
        note: "Pin this for tonight's daily XP bonus.",
        color: "#ff6f61",
      },
    ],
    pointers: [
      { id: "ptr-ava", name: "Ava", azimuth: 68, elevation: 42, color: "#73fbd3" },
      { id: "ptr-kian", name: "Kian", azimuth: 142, elevation: 26, color: "#7bb5ff" },
    ],
  },
];

export const achievements: Achievement[] = [
  { id: "planet-hunter", title: "Planet Hunter", progressLabel: "3 / 8 planets tagged" },
  { id: "constellation-master", title: "Constellation Master", progressLabel: "11 / 20 patterns traced" },
  { id: "night-owl", title: "Night Owl", progressLabel: "5 daily discoveries streak" },
];
