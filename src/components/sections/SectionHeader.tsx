import { StyleSheet, Text, View } from "react-native";
import { colors, fontSize } from "@/theme/colors";

type Props = {
  title: string;
  subtitle?: string;
};

export function SectionHeader({ title, subtitle }: Props) {
  return (
    <View style={styles.container} accessibilityRole="header">
      <Text style={styles.title}>{title}</Text>
      {subtitle && <Text style={styles.subtitle}>{subtitle}</Text>}
    </View>
  );
}

const styles = StyleSheet.create({
  container: { marginTop: 6 },
  title: { color: colors.text, fontSize: fontSize.md, fontWeight: "800" },
  subtitle: { color: colors.textDim, fontSize: fontSize.xs, marginTop: 2 },
});
