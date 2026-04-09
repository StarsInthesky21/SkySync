import { memo, useCallback } from "react";
import { Pressable, StyleSheet, Text, View } from "react-native";
import { colors } from "@/theme/colors";
import { RenderedSkyObject } from "@/types/sky";

type StarProps = {
  object: RenderedSkyObject;
  selected: boolean;
  highlighted: boolean;
  onPress: (objectId: string) => void;
};

function StarComponent({ object, selected, highlighted, onPress }: StarProps) {
  const handlePress = useCallback(() => onPress(object.id), [onPress, object.id]);

  if (!object.isVisible) {
    return null;
  }

  const showLabel = selected || object.kind === "planet" || object.kind === "satellite";

  return (
    <Pressable
      onPress={handlePress}
      accessibilityRole="button"
      accessibilityLabel={`${object.name}, ${object.kind}${selected ? ", selected" : ""}${highlighted ? ", highlighted" : ""}`}
      accessibilityHint={`Tap to view details about ${object.name}`}
      style={[
        styles.wrapper,
        {
          left: `${object.x * 100}%`,
          top: `${object.y * 100}%`,
        },
      ]}
    >
      <View
        style={[
          styles.dot,
          {
            width: object.size,
            height: object.size,
            backgroundColor: object.color,
          },
          selected && styles.selected,
          highlighted && styles.highlighted,
        ]}
      />
      {showLabel && (
        <Text style={styles.label} accessibilityElementsHidden>
          {object.name}
        </Text>
      )}
    </Pressable>
  );
}

export const Star = memo(StarComponent, (prev, next) => {
  return (
    prev.object.id === next.object.id &&
    prev.object.x === next.object.x &&
    prev.object.y === next.object.y &&
    prev.object.isVisible === next.object.isVisible &&
    prev.object.size === next.object.size &&
    prev.selected === next.selected &&
    prev.highlighted === next.highlighted &&
    prev.onPress === next.onPress
  );
});

const styles = StyleSheet.create({
  wrapper: {
    position: "absolute",
    alignItems: "center",
    marginLeft: -20,
    marginTop: -20,
    width: 40,
  },
  dot: {
    borderRadius: 999,
    shadowColor: "#ffffff",
    shadowOpacity: 0.5,
    shadowRadius: 6,
  },
  selected: {
    borderWidth: 2,
    borderColor: colors.accent,
    transform: [{ scale: 1.25 }],
  },
  highlighted: {
    borderWidth: 2,
    borderColor: colors.accentWarm,
    shadowColor: colors.accentWarm,
    shadowOpacity: 0.6,
    shadowRadius: 10,
  },
  label: {
    marginTop: 6,
    color: colors.text,
    fontSize: 10,
    fontWeight: "700",
    textAlign: "center",
  },
});
