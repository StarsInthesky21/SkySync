import { Line } from "react-native-svg";
import { RenderedSkyObject } from "@/types/sky";

export function Constellation({
  from,
  to,
  color,
}: {
  from: RenderedSkyObject;
  to: RenderedSkyObject;
  color?: string;
}) {
  return (
    <Line
      x1={`${from.x * 100}%`}
      y1={`${from.y * 100}%`}
      x2={`${to.x * 100}%`}
      y2={`${to.y * 100}%`}
      stroke={color ?? "rgba(143,188,255,0.4)"}
      strokeWidth={1.4}
    />
  );
}
