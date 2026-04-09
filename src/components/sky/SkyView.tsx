import { useRef } from "react";
import { PanResponder, StyleSheet, Text, View } from "react-native";
import Svg from "react-native-svg";
import { Star } from "@/components/sky/Star";
import { Constellation } from "@/components/sky/Constellation";
import { colors } from "@/theme/colors";
import { RenderedSkyObject } from "@/types/sky";

type GestureRef = {
  startRotation: number;
  startZoom: number;
  startDistance: number | null;
};

type SkyViewProps = {
  objects: RenderedSkyObject[];
  segments: { id: string; from: RenderedSkyObject; to: RenderedSkyObject; color?: string }[];
  customSegments: { id: string; from: RenderedSkyObject; to: RenderedSkyObject; color?: string }[];
  draftSegments: { id: string; from: RenderedSkyObject; to: RenderedSkyObject; color?: string }[];
  selectedObjectId?: string;
  highlightedIds: string[];
  roomCode?: string;
  liveMode: boolean;
  viewpointLabel: string;
  dateLabel: string;
  callActive: boolean;
  onSelectObject: (objectId: string) => void;
  onRotate: (rotation: number) => void;
  onZoom: (zoom: number) => void;
  rotation: number;
  zoom: number;
};

function getDistance(touches: readonly { pageX: number; pageY: number }[]) {
  if (touches.length < 2) {
    return null;
  }
  const [first, second] = touches;
  const dx = second.pageX - first.pageX;
  const dy = second.pageY - first.pageY;
  return Math.sqrt(dx * dx + dy * dy);
}

export function SkyView({
  objects,
  segments,
  customSegments,
  draftSegments,
  selectedObjectId,
  highlightedIds,
  roomCode,
  liveMode,
  viewpointLabel,
  dateLabel,
  callActive,
  onSelectObject,
  onRotate,
  onZoom,
  rotation,
  zoom,
}: SkyViewProps) {
  const gesture = useRef<GestureRef>({
    startRotation: rotation,
    startZoom: zoom,
    startDistance: null,
  });

  const panResponder = useRef(
    PanResponder.create({
      onMoveShouldSetPanResponder: () => true,
      onPanResponderGrant: (event) => {
        gesture.current.startRotation = rotation;
        gesture.current.startZoom = zoom;
        gesture.current.startDistance = getDistance(event.nativeEvent.touches);
      },
      onPanResponderMove: (event, gestureState) => {
        const pinchDistance = getDistance(event.nativeEvent.touches);
        if (pinchDistance && gesture.current.startDistance) {
          const nextZoom = gesture.current.startZoom * (pinchDistance / gesture.current.startDistance);
          onZoom(nextZoom);
          return;
        }

        onRotate(gesture.current.startRotation - gestureState.dx * 0.25);
      },
      onPanResponderRelease: () => {
        gesture.current.startDistance = null;
      },
      onPanResponderTerminationRequest: () => false,
    }),
  ).current;

  return (
    <View style={styles.frame} {...panResponder.panHandlers}>
      <Svg width="100%" height="100%" style={StyleSheet.absoluteFillObject}>
        {segments.map((segment) => (
          <Constellation key={segment.id} from={segment.from} to={segment.to} color={segment.color} />
        ))}
        {customSegments.map((segment) => (
          <Constellation key={segment.id} from={segment.from} to={segment.to} color={segment.color} />
        ))}
        {draftSegments.map((segment) => (
          <Constellation key={segment.id} from={segment.from} to={segment.to} color={segment.color} />
        ))}
      </Svg>

      {objects.map((object) => (
        <Star
          key={object.id}
          object={object}
          selected={selectedObjectId === object.id}
          highlighted={highlightedIds.includes(object.id)}
          onPress={onSelectObject}
        />
      ))}

      <View style={styles.hud}>
        <Text style={styles.hudTitle}>SkySync</Text>
        <Text style={styles.hudText}>
          Drag to rotate | Pinch to zoom | {liveMode ? "Real-time sky" : "Time travel mode"}
        </Text>
        <Text style={styles.hudSubtext}>
          {dateLabel} | View {viewpointLabel} | Room {roomCode ?? "Solo"} | Voice lounge {callActive ? "on" : "off"}
        </Text>
        <Text style={styles.hudSubtext}>Rotation {Math.round(rotation)} deg | Zoom {zoom.toFixed(1)}x</Text>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  frame: {
    height: 420,
    borderRadius: 28,
    overflow: "hidden",
    backgroundColor: "#020814",
    borderWidth: 1,
    borderColor: colors.border,
    position: "relative",
  },
  hud: {
    position: "absolute",
    left: 14,
    right: 14,
    bottom: 14,
    borderRadius: 18,
    padding: 12,
    backgroundColor: "rgba(4,17,31,0.84)",
  },
  hudTitle: {
    color: colors.accent,
    fontWeight: "800",
    marginBottom: 4,
  },
  hudText: {
    color: colors.text,
    fontSize: 12,
    lineHeight: 18,
  },
  hudSubtext: {
    color: colors.textMuted,
    marginTop: 4,
    fontSize: 12,
  },
});
