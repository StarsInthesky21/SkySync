import { Pressable, StyleSheet, Text, View } from "react-native";
import Svg, { Circle, Line } from "react-native-svg";
import { constellationLines } from "@/data/skyData";
import { colors } from "@/theme/colors";
import { CelestialObject } from "@/types/sky";
import { SkyMarker } from "@/types/rooms";

type SkyViewportProps = {
  objects: CelestialObject[];
  selectedObjectId?: string;
  markers: SkyMarker[];
  friendPointers: { id: string; name: string; color: string; azimuth: number; elevation: number }[];
  onSelectObject: (objectId: string) => void;
};

export function SkyViewport({
  objects,
  selectedObjectId,
  markers,
  friendPointers,
  onSelectObject,
}: SkyViewportProps) {
  const byId = Object.fromEntries(objects.map((object) => [object.id, object]));

  return (
    <View style={styles.frame}>
      <Svg width="100%" height="100%" style={StyleSheet.absoluteFillObject}>
        {constellationLines.map((line) => {
          const from = byId[line.from];
          const to = byId[line.to];
          if (!from || !to) {
            return null;
          }

          return (
            <Line
              key={line.id}
              x1={`${from.screenX * 100}%`}
              y1={`${from.screenY * 100}%`}
              x2={`${to.screenX * 100}%`}
              y2={`${to.screenY * 100}%`}
              stroke="rgba(163,201,255,0.35)"
              strokeWidth={1.5}
            />
          );
        })}
        {objects.map((object) => (
          <Circle
            key={`glow-${object.id}`}
            cx={`${object.screenX * 100}%`}
            cy={`${object.screenY * 100}%`}
            r={selectedObjectId === object.id ? 16 : 10}
            fill={object.color}
            opacity={0.14}
          />
        ))}
      </Svg>

      {objects.map((object) => (
        <Pressable
          key={object.id}
          onPress={() => onSelectObject(object.id)}
          style={[
            styles.object,
            {
              left: `${object.screenX * 100}%`,
              top: `${object.screenY * 100}%`,
            },
          ]}
        >
          <View
            style={[
              styles.dot,
              { backgroundColor: object.color },
              selectedObjectId === object.id && styles.dotSelected,
            ]}
          />
          <Text style={styles.objectLabel}>{object.name}</Text>
        </Pressable>
      ))}

      {markers.map((marker, index) => (
        <View
          key={marker.id}
          style={[
            styles.marker,
            {
              right: 14,
              top: 22 + index * 42,
              borderColor: marker.color,
            },
          ]}
        >
          <Text style={styles.markerTitle}>{marker.title}</Text>
        </View>
      ))}

      {friendPointers.map((pointer, index) => (
        <View key={pointer.id} style={[styles.pointer, { left: 14, top: 22 + index * 44 }]}>
          <View style={[styles.pointerDot, { backgroundColor: pointer.color }]} />
          <Text style={styles.pointerText}>
            {pointer.name} is pointing {pointer.azimuth} deg / {pointer.elevation} deg
          </Text>
        </View>
      ))}

      <View style={styles.hud}>
        <Text style={styles.hudText}>AR-ready horizon mesh</Text>
        <Text style={styles.hudSubtext}>Swap this viewport with ARKit / ARCore native scene for production alignment.</Text>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  frame: {
    height: 360,
    borderRadius: 28,
    overflow: "hidden",
    backgroundColor: "#030a14",
    borderWidth: 1,
    borderColor: colors.border,
    position: "relative",
  },
  object: {
    position: "absolute",
    marginLeft: -34,
    marginTop: -18,
    alignItems: "center",
  },
  dot: {
    width: 8,
    height: 8,
    borderRadius: 999,
    shadowColor: "#ffffff",
    shadowOpacity: 0.4,
    shadowRadius: 8,
  },
  dotSelected: {
    width: 12,
    height: 12,
  },
  objectLabel: {
    marginTop: 6,
    color: colors.text,
    fontSize: 11,
    fontWeight: "600",
  },
  marker: {
    position: "absolute",
    backgroundColor: "rgba(10,22,42,0.9)",
    borderRadius: 12,
    paddingHorizontal: 10,
    paddingVertical: 8,
    borderWidth: 1,
  },
  markerTitle: {
    color: colors.text,
    fontSize: 12,
    fontWeight: "700",
  },
  pointer: {
    position: "absolute",
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
  },
  pointerDot: {
    width: 9,
    height: 9,
    borderRadius: 999,
  },
  pointerText: {
    color: colors.text,
    fontSize: 12,
  },
  hud: {
    position: "absolute",
    bottom: 14,
    left: 14,
    right: 14,
    padding: 12,
    borderRadius: 18,
    backgroundColor: "rgba(4,17,31,0.82)",
  },
  hudText: {
    color: colors.accent,
    fontWeight: "700",
    marginBottom: 4,
  },
  hudSubtext: {
    color: colors.textMuted,
    fontSize: 12,
    lineHeight: 18,
  },
});
