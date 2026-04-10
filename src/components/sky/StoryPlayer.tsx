import { useEffect, useState } from "react";
import { Pressable, StyleSheet, Text, View } from "react-native";
import { colors, fontSize, radius } from "@/theme/colors";
import { MythStory } from "@/types/sky";

export function StoryPlayer({ story }: { story: MythStory }) {
  const [frameIndex, setFrameIndex] = useState(0);
  const [isPaused, setIsPaused] = useState(false);

  useEffect(() => {
    setFrameIndex(0);
    setIsPaused(false);
  }, [story.id]);

  useEffect(() => {
    if (isPaused) return;
    const timer = setInterval(() => {
      setFrameIndex((current) => (current + 1) % story.frames.length);
    }, 3500);
    return () => clearInterval(timer);
  }, [story.frames.length, isPaused]);

  function goNext() {
    setFrameIndex((current) => (current + 1) % story.frames.length);
  }

  function goPrev() {
    setFrameIndex((current) => (current - 1 + story.frames.length) % story.frames.length);
  }

  return (
    <View style={styles.card}>
      <View style={styles.headerRow}>
        <Text style={styles.title}>{story.title}</Text>
        <Text style={styles.counter}>{frameIndex + 1}/{story.frames.length}</Text>
      </View>
      <Text style={styles.frame}>{story.frames[frameIndex]}</Text>
      <View style={styles.controlRow}>
        <Pressable
          onPress={goPrev}
          style={({ pressed }) => [styles.controlButton, pressed && styles.controlPressed]}
          accessibilityLabel="Previous frame"
          accessibilityRole="button"
        >
          <Text style={styles.controlText}>Prev</Text>
        </Pressable>
        <View style={styles.dots}>
          {story.frames.map((_, index) => (
            <Pressable
              key={`${story.id}-dot-${index}`}
              onPress={() => setFrameIndex(index)}
              accessibilityLabel={`Go to frame ${index + 1}`}
            >
              <View style={[styles.dot, index === frameIndex && styles.dotActive]} />
            </Pressable>
          ))}
        </View>
        <Pressable
          onPress={() => setIsPaused(!isPaused)}
          style={({ pressed }) => [styles.controlButton, pressed && styles.controlPressed]}
          accessibilityLabel={isPaused ? "Play" : "Pause"}
          accessibilityRole="button"
        >
          <Text style={styles.controlText}>{isPaused ? "Play" : "Pause"}</Text>
        </Pressable>
        <Pressable
          onPress={goNext}
          style={({ pressed }) => [styles.controlButton, pressed && styles.controlPressed]}
          accessibilityLabel="Next frame"
          accessibilityRole="button"
        >
          <Text style={styles.controlText}>Next</Text>
        </Pressable>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  card: {
    borderRadius: radius.lg,
    padding: 16,
    backgroundColor: "rgba(11,29,51,0.6)",
    marginTop: 14,
    borderWidth: 1,
    borderColor: "rgba(255,255,255,0.04)",
  },
  headerRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 10,
  },
  title: {
    color: colors.accentWarm,
    fontWeight: "800",
    fontSize: fontSize.base,
  },
  counter: {
    color: colors.textDim,
    fontSize: fontSize.xs,
    fontWeight: "600",
  },
  frame: {
    color: colors.text,
    lineHeight: 23,
    minHeight: 70,
    fontSize: fontSize.sm,
  },
  controlRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    marginTop: 12,
  },
  controlButton: {
    borderRadius: radius.sm,
    paddingHorizontal: 10,
    paddingVertical: 5,
    backgroundColor: "rgba(255,255,255,0.06)",
  },
  controlPressed: {
    backgroundColor: "rgba(255,255,255,0.12)",
  },
  controlText: {
    color: colors.textMuted,
    fontSize: fontSize.xs,
    fontWeight: "700",
  },
  dots: {
    flexDirection: "row",
    gap: 6,
    flex: 1,
    justifyContent: "center",
  },
  dot: {
    width: 8,
    height: 8,
    borderRadius: radius.pill,
    backgroundColor: "rgba(255,255,255,0.15)",
  },
  dotActive: {
    backgroundColor: colors.accent,
    width: 20,
  },
});
