import React from "react";
import { render } from "@testing-library/react-native";
import ConstellationScreen from "../../../app/constellation/[id]";
import { buildMockSky, buildTestObject } from "../helpers/mockProvider";

jest.mock("expo-router", () => ({
  Stack: { Screen: ({ children }: { children?: React.ReactNode }) => children ?? null },
  useLocalSearchParams: () => ({ id: "orion" }),
  useRouter: () => ({ back: jest.fn(), push: jest.fn() }),
}));

const mockSky = buildMockSky({
  objects: [
    buildTestObject({ id: "betelgeuse", name: "Betelgeuse" }),
    buildTestObject({ id: "rigel", name: "Rigel" }),
    buildTestObject({ id: "mintaka", name: "Mintaka" }),
  ],
});

jest.mock("@/providers/SkySyncProvider", () => ({
  useSkySync: () => mockSky,
}));

describe("ConstellationScreen", () => {
  it("renders the constellation name and member stars", () => {
    const { getAllByText, queryAllByText } = render(<ConstellationScreen />);
    expect(getAllByText(/Orion/i).length).toBeGreaterThan(0);
    expect(queryAllByText(/Betelgeuse|Rigel|Mintaka/).length).toBeGreaterThan(0);
  });
});
