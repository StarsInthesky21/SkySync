import { StyleSheet, Text, View } from "react-native";
import { GlassCard } from "@/components/cards/GlassCard";
import { colors } from "@/theme/colors";
import { CelestialObject } from "@/types/sky";

export function AssistantCard({ object }: { object?: CelestialObject }) {
  const answer = object
    ? `${object.name} is a ${object.kind} ${object.distance} away. Tonight it stands out because its brightness is around magnitude ${object.magnitude}.`
    : "Ask SkySync things like: What is that bright star, why is Mars red, or what should I watch tonight?";

  return (
    <GlassCard>
      <Text style={styles.title}>AI Sky Assistant</Text>
      <View style={styles.chatBubble}>
        <Text style={styles.question}>What should I watch tonight?</Text>
      </View>
      <View style={[styles.chatBubble, styles.answerBubble]}>
        <Text style={styles.answer}>{answer}</Text>
      </View>
    </GlassCard>
  );
}

const styles = StyleSheet.create({
  title: {
    color: colors.text,
    fontSize: 18,
    fontWeight: "700",
    marginBottom: 12,
  },
  chatBubble: {
    borderRadius: 18,
    padding: 14,
    backgroundColor: "rgba(255,255,255,0.04)",
    marginBottom: 10,
  },
  answerBubble: {
    backgroundColor: "rgba(115,251,211,0.08)",
  },
  question: {
    color: colors.text,
    fontWeight: "600",
  },
  answer: {
    color: colors.textMuted,
    lineHeight: 20,
  },
});
