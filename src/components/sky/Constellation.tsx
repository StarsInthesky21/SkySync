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
      stroke={color ?? "rgba(158,183,214,0.22)"}
      strokeWidth={0.8}
      strokeLinecap="round"
      opacity={0.42}
    />
  );
}
