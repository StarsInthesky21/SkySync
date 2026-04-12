import React from "react";
import { render } from "@testing-library/react-native";
import { ObservingCard } from "../ObservingCard";

jest.mock("@/services/astronomy/weatherService", () => ({
  fetchObservingWeather: jest.fn().mockResolvedValue(null),
}));

describe("ObservingCard", () => {
  it("renders a score and headline without crashing", async () => {
    const { findByText } = render(
      <ObservingCard date={new Date("2024-01-15T06:00:00Z")} latitudeDeg={37.7} longitudeDeg={-122.4} />,
    );
    const heading = await findByText(/Tonight/);
    expect(heading).toBeTruthy();
  });
});
