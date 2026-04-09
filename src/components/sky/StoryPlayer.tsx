import { useEffect, useMemo, useState } from "react";
import { StyleSheet, Text, View } from "react-native";
import { colors } from "@/theme/colors";
import { MythStory } from "@/types/sky";

export function StoryPlayer({ story }: { story: MythStory }) {
  const [frameIndex, setFrameIndex] = useState(0);

  useEffect(() => {
    setFrameIndex(0);
  }, [story.id]);

  useEffect(() => {
    const timer = setInterval(() => {
      setFrameIndex((current) => (current + 1) % story.frames.length);
    }, 2800);
    return () => clearInterval(timer);
  }, [story.frames.length]);

  const progressDots = useMemo(
    () => story.frames.map((_, index) => index === frameIndex),
    [frameIndex, story.frames],
  );

  return (
    <View style={styles.card}>
      <Text style={styles.title}>{story.title}</Text>
      <Text style={styles.frame}>{story.frames[frameIndex]}</Text>
      <View style={styles.dots}>
        {progressDots.map((active, index) => (
          <View key={`${story.id}-${index}`} style={[styles.dot, active && styles.dotActive]} />
        ))}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  card: {
    borderRadius: 18,
    padding: 14,
    backgroundColor: colors.cardSoft,
    marginTop: 14,
  },
  title: {
    color: colors.accentWarm,
    fontWeight: "800",
    marginBottom: 10,
  },
  frame: {
    color: colors.text,
    lineHeight: 22,
    minHeight: 70,
  },
  dots: {
    flexDirection: "row",
    gap: 8,
    marginTop: 12,
  },
  dot: {
    width: 10,
    height: 10,
    borderRadius: 999,
    backgroundColor: "rgba(255,255,255,0.15)",
  },
  dotActive: {
    backgroundColor: colors.accent,
  },
});
