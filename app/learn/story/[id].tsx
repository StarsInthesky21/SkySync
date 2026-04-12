import { useMemo } from "react";
import { Pressable, ScrollView, StyleSheet, Text, View } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { Stack, useLocalSearchParams, useRouter } from "expo-router";
import { myths } from "@/data/skyData";
import { StoryPlayer } from "@/components/sky/StoryPlayer";
import { colors, fontSize, spacing } from "@/theme/colors";

export default function StoryScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const router = useRouter();
  const story = useMemo(() => myths.find((s) => s.id === id), [id]);

  return (
    <SafeAreaView style={styles.container} edges={["top"]}>
      <Stack.Screen options={{ title: story?.title ?? "Story" }} />
      <View style={styles.header}>
        <Pressable onPress={() => router.back()}>
          <Text style={styles.back}>Back</Text>
        </Pressable>
        <Text style={styles.title}>{story?.title ?? "Story"}</Text>
        <View style={{ width: 40 }} />
      </View>
      <ScrollView contentContainerStyle={styles.body}>
        {story ? <StoryPlayer story={story} /> : <Text style={styles.empty}>Story not found.</Text>}
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.bg },
  header: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.md,
  },
  back: { color: colors.accentInfo, fontWeight: "700" },
  title: { color: colors.text, fontSize: fontSize.md, fontWeight: "800" },
  body: { padding: spacing.lg, gap: spacing.md },
  empty: { color: colors.textDim, textAlign: "center", paddingVertical: 40 },
});
