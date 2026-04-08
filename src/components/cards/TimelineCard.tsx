import Slider from "@react-native-community/slider";
import { StyleSheet, Text } from "react-native";
import { GlassCard } from "@/components/cards/GlassCard";
import { colors } from "@/theme/colors";

type TimelineCardProps = {
  hourOffset: number;
  onChange: (value: number) => void;
};

export function TimelineCard({ hourOffset, onChange }: TimelineCardProps) {
  return (
    <GlassCard>
      <Text style={styles.title}>Time travel</Text>
      <Text style={styles.caption}>Swipe the timeline to simulate past or future sky positions.</Text>
      <Slider
        minimumValue={-12}
        maximumValue={12}
        step={1}
        value={hourOffset}
        onValueChange={onChange}
        minimumTrackTintColor={colors.accent}
        maximumTrackTintColor="rgba(255,255,255,0.12)"
        thumbTintColor={colors.accentWarm}
      />
      <Text style={styles.value}>{hourOffset > 0 ? `+${hourOffset}` : hourOffset} hours</Text>
    </GlassCard>
  );
}

const styles = StyleSheet.create({
  title: {
    color: colors.text,
    fontSize: 18,
    fontWeight: "700",
  },
  caption: {
    color: colors.textMuted,
    marginTop: 8,
    marginBottom: 8,
    lineHeight: 20,
  },
  value: {
    color: colors.accentWarm,
    fontWeight: "700",
    marginTop: 8,
  },
});
