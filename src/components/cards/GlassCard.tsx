import { ReactNode } from "react";
import { StyleSheet, View } from "react-native";
import { colors } from "@/theme/colors";

export function GlassCard({ children }: { children: ReactNode }) {
  return <View style={styles.card}>{children}</View>;
}

const styles = StyleSheet.create({
  card: {
    backgroundColor: colors.card,
    borderRadius: 22,
    padding: 16,
    borderWidth: 1,
    borderColor: colors.border,
  },
});
