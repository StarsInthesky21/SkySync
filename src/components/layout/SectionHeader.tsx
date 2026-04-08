import { StyleSheet, Text, View } from "react-native";
import { colors } from "@/theme/colors";

export function SectionHeader({ title, caption }: { title: string; caption?: string }) {
  return (
    <View style={styles.row}>
      <Text style={styles.title}>{title}</Text>
      {caption ? <Text style={styles.caption}>{caption}</Text> : null}
    </View>
  );
}

const styles = StyleSheet.create({
  row: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 10,
  },
  title: {
    color: colors.text,
    fontSize: 18,
    fontWeight: "700",
  },
  caption: {
    color: colors.textMuted,
    fontSize: 12,
  },
});
