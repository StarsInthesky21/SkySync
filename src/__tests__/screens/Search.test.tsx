import React from "react";
import { fireEvent, render } from "@testing-library/react-native";
import SearchScreen from "../../../app/search";
import { buildMockSky, buildTestObject } from "../helpers/mockProvider";

const mockRouterReplace = jest.fn();

jest.mock("expo-router", () => ({
  Stack: { Screen: ({ children }: { children?: React.ReactNode }) => children ?? null },
  useRouter: () => ({ back: jest.fn(), push: jest.fn(), replace: mockRouterReplace }),
}));

const mockSky = buildMockSky({
  objects: [
    buildTestObject({ id: "sirius", name: "Sirius" }),
    buildTestObject({ id: "vega", name: "Vega", magnitude: 0.03 }),
    buildTestObject({ id: "jupiter", name: "Jupiter", kind: "planet", magnitude: -2 }),
  ],
});

jest.mock("@/providers/SkySyncProvider", () => ({
  useSkySync: () => mockSky,
}));

describe("SearchScreen", () => {
  beforeEach(() => mockRouterReplace.mockClear());

  it("starts with no results and a hint", () => {
    const { getByText } = render(<SearchScreen />);
    expect(getByText(/Start typing/)).toBeTruthy();
  });

  it("surfaces matches as the user types", () => {
    const { getByPlaceholderText, getByText } = render(<SearchScreen />);
    fireEvent.changeText(getByPlaceholderText(/Search/), "sir");
    expect(getByText("Sirius")).toBeTruthy();
  });

  it("tapping a result navigates to object detail", () => {
    const { getByPlaceholderText, getByText } = render(<SearchScreen />);
    fireEvent.changeText(getByPlaceholderText(/Search/), "vega");
    fireEvent.press(getByText("Vega"));
    expect(mockRouterReplace).toHaveBeenCalledWith("/object/vega");
  });

  it("returns no matches for garbage input", () => {
    const { getByPlaceholderText, getByText } = render(<SearchScreen />);
    fireEvent.changeText(getByPlaceholderText(/Search/), "xyzxyz");
    expect(getByText("No matches.")).toBeTruthy();
  });
});
