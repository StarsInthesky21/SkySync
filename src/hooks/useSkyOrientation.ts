import { useEffect, useState } from "react";

type SkyOrientation = {
  azimuth: number;
  elevation: number;
  pitch: number;
  locationLabel: string;
};

const initialState: SkyOrientation = {
  azimuth: 74,
  elevation: 38,
  pitch: 12,
  locationLabel: "Calibrating sky alignment",
};

export function useSkyOrientation() {
  const [orientation, setOrientation] = useState<SkyOrientation>(initialState);

  useEffect(() => {
    const interval = setInterval(() => {
      setOrientation((current) => ({
        azimuth: (current.azimuth + 2) % 360,
        elevation: 30 + ((current.elevation + 1) % 24),
        pitch: 8 + ((current.pitch + 1) % 16),
        locationLabel: "Bengaluru, clear eastern horizon",
      }));
    }, 2200);

    return () => clearInterval(interval);
  }, []);

  return orientation;
}
