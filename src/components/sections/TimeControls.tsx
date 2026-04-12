import { useEffect, useState } from "react";
import { Pressable, StyleSheet, Switch, Text, TextInput, View } from "react-native";
import Slider from "@react-native-community/slider";
import { useSkySync } from "@/providers/SkySyncProvider";
import { colors, fontSize, radius, spacing } from "@/theme/colors";

const DATE_REGEX = /^\d{4}-\d{2}-\d{2}$/;
const TIME_REGEX = /^\d{2}:\d{2}$/;

type Props = {
  voiceGuideEnabled: boolean;
  setVoiceGuideEnabled: (v: boolean) => void;
  onStatus: (msg: string) => void;
};

function formatDate(date: Date) {
  return date.toISOString().slice(0, 10);
}
function formatTime(date: Date) {
  return date.toISOString().slice(11, 16);
}

export function TimeControls({ voiceGuideEnabled, setVoiceGuideEnabled, onStatus }: Props) {
  const { selectedDate, setSelectedDate, setLiveMode } = useSkySync();
  const [dateInput, setDateInput] = useState(formatDate(selectedDate));
  const [timeInput, setTimeInput] = useState(formatTime(selectedDate));

  useEffect(() => {
    setDateInput(formatDate(selectedDate));
    setTimeInput(formatTime(selectedDate));
  }, [selectedDate]);

  const currentYear = selectedDate.getUTCFullYear();

  function handleApply() {
    if (!DATE_REGEX.test(dateInput.trim()) || !TIME_REGEX.test(timeInput.trim())) {
      onStatus("Invalid date or time format");
      return;
    }
    const parsed = new Date(`${dateInput.trim()}T${timeInput.trim()}:00.000Z`);
    if (Number.isNaN(parsed.getTime())) {
      onStatus("Invalid date or time");
      return;
    }
    setSelectedDate(parsed);
    onStatus(`Time travel: ${dateInput} ${timeInput}`);
  }

  function handleNow() {
    setSelectedDate(new Date());
    setLiveMode(true);
    onStatus("Returned to real-time sky");
  }

  function handleJumpToYear(year: number) {
    const next = new Date(selectedDate);
    next.setUTCFullYear(year);
    setSelectedDate(next);
    onStatus(`Jumped to ${year}`);
  }

  return (
    <View style={styles.card}>
      <View style={styles.header}>
        <Text style={styles.label}>Voice guide</Text>
        <Switch
          value={voiceGuideEnabled}
          onValueChange={setVoiceGuideEnabled}
          thumbColor={voiceGuideEnabled ? colors.accent : "#aaa"}
          trackColor={{ false: "rgba(255,255,255,0.15)", true: colors.glow }}
        />
      </View>
      <View style={styles.dateRow}>
        <TextInput
          value={dateInput}
          onChangeText={setDateInput}
          style={styles.input}
          placeholder="YYYY-MM-DD"
          placeholderTextColor={colors.textDim}
        />
        <TextInput
          value={timeInput}
          onChangeText={setTimeInput}
          style={styles.input}
          placeholder="HH:MM"
          placeholderTextColor={colors.textDim}
        />
      </View>
      <View style={styles.buttonRow}>
        <Pressable
          style={({ pressed }) => [styles.secondary, pressed && styles.secondaryPressed]}
          onPress={handleApply}
        >
          <Text style={styles.secondaryText}>Apply</Text>
        </Pressable>
        <Pressable
          style={({ pressed }) => [styles.primary, pressed && styles.primaryPressed]}
          onPress={handleNow}
        >
          <Text style={styles.primaryText}>Now</Text>
        </Pressable>
      </View>
      <Text style={styles.caption}>Year: {currentYear}</Text>
      <Slider
        minimumValue={1800}
        maximumValue={2100}
        step={1}
        value={currentYear}
        onValueChange={(v) => {
          const n = new Date(selectedDate);
          n.setUTCFullYear(v);
          setSelectedDate(n);
        }}
        minimumTrackTintColor={colors.accent}
        maximumTrackTintColor="rgba(255,255,255,0.1)"
        thumbTintColor={colors.accentWarm}
      />
      <View style={styles.chipRow}>
        {[1800, 2100, new Date().getUTCFullYear()].map((y, i) => (
          <Pressable
            key={y}
            style={({ pressed }) => [styles.chip, pressed && styles.chipPressed]}
            onPress={() => handleJumpToYear(y)}
          >
            <Text style={styles.chipText}>{i === 2 ? "Now" : y}</Text>
          </Pressable>
        ))}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
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
  header: { flexDirection: "row", justifyContent: "space-between", alignItems: "center", marginBottom: 8 },
  label: { color: colors.textMuted, fontWeight: "600", fontSize: fontSize.sm },
  dateRow: { flexDirection: "row", gap: 8 },
  input: {
    flex: 1,
    borderRadius: radius.md,
    backgroundColor: "rgba(255,255,255,0.03)",
    borderWidth: 1,
    borderColor: colors.border,
    paddingHorizontal: 14,
    paddingVertical: 11,
    color: colors.text,
    fontSize: fontSize.sm,
    marginTop: 8,
  },
  buttonRow: { flexDirection: "row", gap: 8, marginTop: 10 },
  primary: {
    flex: 1,
    borderRadius: radius.md,
    paddingVertical: 12,
    backgroundColor: colors.accent,
    alignItems: "center",
  },
  primaryPressed: { backgroundColor: colors.pressedPrimary },
  primaryText: { color: colors.onAccent, fontWeight: "800", fontSize: fontSize.sm },
  secondary: {
    flex: 1,
    borderRadius: radius.md,
    paddingVertical: 12,
    backgroundColor: colors.cardSoft,
    alignItems: "center",
  },
  secondaryPressed: { backgroundColor: colors.pressedSecondary },
  secondaryText: { color: colors.text, fontWeight: "700", fontSize: fontSize.sm },
  caption: { color: colors.textDim, marginTop: 6, fontSize: fontSize.xs },
  chipRow: { flexDirection: "row", flexWrap: "wrap", gap: 8, marginTop: 8 },
  chip: {
    borderRadius: radius.pill,
    paddingHorizontal: 14,
    paddingVertical: 8,
    backgroundColor: colors.cardSoft,
  },
  chipPressed: { opacity: 0.7 },
  chipText: { color: colors.text, fontWeight: "700", fontSize: fontSize.sm },
});
