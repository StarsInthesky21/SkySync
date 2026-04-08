import { Pressable, StyleSheet, Text } from "react-native";
import { colors } from "@/theme/colors";

type PillButtonProps = {
  label: string;
  active?: boolean;
  onPress: () => void;
};

export function PillButton({ label, active, onPress }: PillButtonProps) {
  return (
    <Pressable onPress={onPress} style={[styles.button, active && styles.active]}>
      <Text style={[styles.label, active && styles.activeLabel]}>{label}</Text>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  button: {
    paddingHorizontal: 14,
    paddingVertical: 10,
    borderRadius: 999,
    backgroundColor: "rgba(255,255,255,0.04)",
    borderWidth: 1,
    borderColor: colors.border,
  },
  active: {
    backgroundColor: colors.accent,
  },
  label: {
    color: colors.text,
    fontWeight: "600",
  },
  activeLabel: {
    color: "#03262a",
  },
});
