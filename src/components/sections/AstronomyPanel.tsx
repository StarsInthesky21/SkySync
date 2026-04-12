import { useCallback, useEffect, useState } from "react";
import { Pressable, StyleSheet, Text, View } from "react-native";
import {
  astronomyApi,
  AstroEvent,
  ISSPosition,
  MoonPhase,
  PlanetPosition,
  SunMoonTimes,
} from "@/services/astronomyApi";
import { useToast } from "@/components/Toast";
import { colors, fontSize, radius, spacing } from "@/theme/colors";

type Props = {
  selectedDate: Date;
  onFocusPlanet?: (planetName: string) => void;
};

const IMPORTANCE_COLORS: Record<string, string> = {
  high: colors.accentDanger,
  medium: colors.accentWarm,
  low: colors.textDim,
};

const EVENT_ICONS: Record<string, string> = {
  meteor_shower: "\u2604\uFE0F",
  eclipse: "\u{1F311}",
  conjunction: "\u2B50",
  opposition: "\u{1F30D}",
  equinox: "\u2696\uFE0F",
  solstice: "\u2600\uFE0F",
};

export function AstronomyPanel({ selectedDate, onFocusPlanet }: Props) {
  const [planets, setPlanets] = useState<PlanetPosition[]>([]);
  const [moonPhase, setMoonPhase] = useState<MoonPhase | null>(null);
  const [sunMoon, setSunMoon] = useState<SunMoonTimes | null>(null);
  const [events, setEvents] = useState<AstroEvent[]>([]);
  const [iss, setISS] = useState<ISSPosition | null>(null);
  const [loading, setLoading] = useState(true);
  const toast = useToast();

  const loadData = useCallback(async () => {
    setLoading(true);
    try {
      const data = await astronomyApi.getAllData(selectedDate);
      setPlanets(data.planets);
      setMoonPhase(data.moonPhase);
      setSunMoon(data.sunMoon);
      setEvents(data.events);
      setISS(data.iss);
    } catch {
      toast.show("Failed to load astronomy data", "error");
    } finally {
      setLoading(false);
    }
  }, [selectedDate, toast]);

  useEffect(() => {
    loadData();
  }, [loadData]);

  // Refresh ISS position every 30 seconds
  useEffect(() => {
    const timer = setInterval(async () => {
      const pos = await astronomyApi.getISSPosition();
      if (pos) setISS(pos);
    }, 30000);
    return () => clearInterval(timer);
  }, []);

  if (loading) {
    return (
      <View style={styles.card}>
        <Text style={styles.loadingText}>Computing planetary positions...</Text>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      {/* Moon Phase */}
      {moonPhase && (
        <View style={styles.card}>
          <View style={styles.moonRow}>
            <Text style={styles.moonEmoji}>{moonPhase.emoji}</Text>
            <View style={{ flex: 1 }}>
              <Text style={styles.cardTitle}>{moonPhase.phase}</Text>
              <Text style={styles.cardSub}>
                {moonPhase.illumination}% illuminated | Age: {moonPhase.age} days
              </Text>
            </View>
          </View>
          <View style={styles.moonDetails}>
            <View style={styles.moonDetail}>
              <Text style={styles.detailLabel}>Next Full</Text>
              <Text style={styles.detailValue}>{moonPhase.nextFullMoon}</Text>
            </View>
            <View style={styles.moonDetail}>
              <Text style={styles.detailLabel}>Next New</Text>
              <Text style={styles.detailValue}>{moonPhase.nextNewMoon}</Text>
            </View>
          </View>
        </View>
      )}

      {/* Sun & Moon Times */}
      {sunMoon && (
        <View style={styles.card}>
          <Text style={styles.cardTitle}>Sun & Moon</Text>
          <View style={styles.timesGrid}>
            <TimeBox icon={"\u{1F305}"} label="Sunrise" value={sunMoon.sunrise} />
            <TimeBox icon={"\u{1F307}"} label="Sunset" value={sunMoon.sunset} />
            <TimeBox icon={"\u{1F312}"} label="Moonrise" value={sunMoon.moonrise} />
            <TimeBox icon={"\u{1F318}"} label="Moonset" value={sunMoon.moonset} />
          </View>
          <View style={styles.infoRow}>
            <Text style={styles.infoText}>
              {"\u2600\uFE0F"} Day: {sunMoon.dayLength}
            </Text>
            <Text style={styles.infoText}>
              {"\u{1F4F8}"} Golden Hour: {sunMoon.goldenHour}
            </Text>
          </View>
        </View>
      )}

      {/* ISS Tracker */}
      {iss && (
        <View style={[styles.card, styles.issCard]}>
          <View style={styles.issHeader}>
            <Text style={styles.cardTitle}>{"\u{1F6F0}\uFE0F"} ISS Live Position</Text>
            <View style={styles.liveDot} />
          </View>
          <Text style={styles.cardSub}>
            Lat: {iss.latitude.toFixed(2)}\u00B0 | Lon: {iss.longitude.toFixed(2)}\u00B0
          </Text>
          <Text style={styles.cardSub}>
            Altitude: {iss.altitude} km | Speed: {iss.velocity} km/s ({Math.round(iss.velocity * 3600)} km/h)
          </Text>
        </View>
      )}

      {/* Planet Positions */}
      <View style={styles.card}>
        <Text style={styles.cardTitle}>Planet Positions (Live)</Text>
        <Text style={styles.cardSub}>
          Computed from orbital mechanics for {selectedDate.toISOString().slice(0, 10)}
        </Text>
        {planets.map((planet) => (
          <Pressable
            key={planet.name}
            style={({ pressed }) => [styles.planetRow, pressed && { opacity: 0.7 }]}
            onPress={() => onFocusPlanet?.(planet.name.toLowerCase())}
          >
            <View
              style={[
                styles.visibilityDot,
                { backgroundColor: planet.isVisible ? colors.accentSuccess : colors.textDim },
              ]}
            />
            <View style={{ flex: 1 }}>
              <Text style={styles.planetName}>{planet.name}</Text>
              <Text style={styles.planetInfo}>
                RA: {planet.rightAscension}\u00B0 | Dec: {planet.declination}\u00B0 | in{" "}
                {planet.constellation}
              </Text>
            </View>
            <View style={styles.planetRight}>
              <Text style={styles.magText}>mag {planet.magnitude.toFixed(1)}</Text>
              <Text style={styles.distText}>{planet.distanceAU} AU</Text>
            </View>
          </Pressable>
        ))}
      </View>

      {/* Upcoming Events */}
      <View style={styles.card}>
        <Text style={styles.cardTitle}>Upcoming Celestial Events</Text>
        {events.length === 0 ? (
          <Text style={styles.emptyText}>No upcoming events found</Text>
        ) : (
          events.map((event) => (
            <View key={event.id} style={styles.eventRow}>
              <Text style={styles.eventIcon}>{EVENT_ICONS[event.type] ?? "\u2B50"}</Text>
              <View style={{ flex: 1 }}>
                <View style={styles.eventHeader}>
                  <Text style={styles.eventTitle}>{event.title}</Text>
                  <View
                    style={[
                      styles.importanceBadge,
                      { backgroundColor: `${IMPORTANCE_COLORS[event.importance]}20` },
                    ]}
                  >
                    <Text style={[styles.importanceText, { color: IMPORTANCE_COLORS[event.importance] }]}>
                      {event.importance}
                    </Text>
                  </View>
                </View>
                <Text style={styles.eventDate}>{event.date}</Text>
                <Text style={styles.eventDesc}>{event.description}</Text>
              </View>
            </View>
          ))
        )}
      </View>

      {/* Refresh */}
      <Pressable
        style={({ pressed }) => [styles.refreshBtn, pressed && { opacity: 0.85 }]}
        onPress={loadData}
      >
        <Text style={styles.refreshText}>{"\u{1F504}"} Refresh Astronomy Data</Text>
      </Pressable>
    </View>
  );
}

function TimeBox({ icon, label, value }: { icon: string; label: string; value: string }) {
  return (
    <View style={styles.timeBox}>
      <Text style={styles.timeIcon}>{icon}</Text>
      <Text style={styles.timeLabel}>{label}</Text>
      <Text style={styles.timeValue}>{value}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { gap: 12 },
  card: {
    borderRadius: radius.xl,
    padding: spacing.lg,
    backgroundColor: colors.card,
    borderWidth: 1,
    borderColor: colors.border,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 12,
    elevation: 6,
  },
  issCard: { borderColor: "rgba(100,181,246,0.2)" },
  loadingText: { color: colors.textDim, fontSize: fontSize.sm, textAlign: "center", fontStyle: "italic" },
  cardTitle: { color: colors.text, fontSize: fontSize.md, fontWeight: "800", marginBottom: 4 },
  cardSub: { color: colors.textDim, fontSize: fontSize.xs, marginTop: 2, lineHeight: 18 },
  // Moon
  moonRow: { flexDirection: "row", alignItems: "center", gap: 12 },
  moonEmoji: { fontSize: 44 },
  moonDetails: { flexDirection: "row", gap: 12, marginTop: 12 },
  moonDetail: {
    flex: 1,
    borderRadius: radius.md,
    padding: 10,
    backgroundColor: "rgba(255,255,255,0.03)",
    alignItems: "center",
  },
  detailLabel: { color: colors.textDim, fontSize: fontSize.xs, fontWeight: "600" },
  detailValue: { color: colors.text, fontSize: fontSize.sm, fontWeight: "700", marginTop: 4 },
  // Sun/Moon times
  timesGrid: { flexDirection: "row", flexWrap: "wrap", gap: 8, marginTop: 10 },
  timeBox: {
    flex: 1,
    minWidth: "42%",
    borderRadius: radius.md,
    padding: 10,
    backgroundColor: "rgba(255,255,255,0.03)",
    alignItems: "center",
  },
  timeIcon: { fontSize: 18 },
  timeLabel: { color: colors.textDim, fontSize: fontSize.xs, marginTop: 4 },
  timeValue: { color: colors.text, fontSize: fontSize.base, fontWeight: "800", marginTop: 2 },
  infoRow: { flexDirection: "row", justifyContent: "space-around", marginTop: 10 },
  infoText: { color: colors.textDim, fontSize: fontSize.xs },
  // ISS
  issHeader: { flexDirection: "row", justifyContent: "space-between", alignItems: "center" },
  liveDot: {
    width: 10,
    height: 10,
    borderRadius: 5,
    backgroundColor: colors.accentSuccess,
    shadowColor: colors.accentSuccess,
    shadowOpacity: 0.8,
    shadowRadius: 6,
  },
  // Planets
  planetRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
    paddingVertical: 10,
    borderBottomWidth: 1,
    borderBottomColor: "rgba(255,255,255,0.04)",
  },
  visibilityDot: { width: 8, height: 8, borderRadius: 4 },
  planetName: { color: colors.text, fontSize: fontSize.sm, fontWeight: "700" },
  planetInfo: { color: colors.textDim, fontSize: fontSize.xs, marginTop: 2 },
  planetRight: { alignItems: "flex-end" },
  magText: { color: colors.accentWarm, fontSize: fontSize.xs, fontWeight: "700" },
  distText: { color: colors.textDim, fontSize: 10, marginTop: 2 },
  // Events
  eventRow: {
    flexDirection: "row",
    gap: 10,
    paddingVertical: 10,
    borderBottomWidth: 1,
    borderBottomColor: "rgba(255,255,255,0.04)",
  },
  eventIcon: { fontSize: 20, marginTop: 2 },
  eventHeader: { flexDirection: "row", alignItems: "center", gap: 8 },
  eventTitle: { color: colors.text, fontSize: fontSize.sm, fontWeight: "700", flex: 1 },
  importanceBadge: { borderRadius: radius.pill, paddingHorizontal: 8, paddingVertical: 2 },
  importanceText: { fontSize: 10, fontWeight: "700", textTransform: "uppercase" },
  eventDate: { color: colors.accentWarm, fontSize: fontSize.xs, fontWeight: "600", marginTop: 2 },
  eventDesc: { color: colors.textDim, fontSize: fontSize.xs, lineHeight: 17, marginTop: 4 },
  emptyText: {
    color: colors.textDim,
    fontSize: fontSize.xs,
    fontStyle: "italic",
    textAlign: "center",
    paddingVertical: 12,
  },
  // Refresh
  refreshBtn: {
    borderRadius: radius.xl,
    padding: 14,
    backgroundColor: colors.cardSoft,
    alignItems: "center",
  },
  refreshText: { color: colors.text, fontWeight: "700", fontSize: fontSize.sm },
});
