import React from "react";
import { fireEvent, render } from "@testing-library/react-native";
import ObjectDetailScreen from "../../../app/object/[id]";
import { buildMockSky, buildTestObject } from "../helpers/mockProvider";

const mockRouterBack = jest.fn();
const mockRouterPush = jest.fn();

jest.mock("expo-router", () => ({
  Stack: { Screen: ({ children }: { children?: React.ReactNode }) => children ?? null },
  useLocalSearchParams: () => ({ id: "sirius" }),
  useRouter: () => ({ back: mockRouterBack, push: mockRouterPush, replace: jest.fn() }),
}));

const mockSky = buildMockSky({ objects: [buildTestObject()] });

jest.mock("@/providers/SkySyncProvider", () => ({
  useSkySync: () => mockSky,
}));

describe("ObjectDetailScreen", () => {
  beforeEach(() => {
    mockRouterBack.mockClear();
    mockRouterPush.mockClear();
    mockSky.selectObject.mockClear();
    mockSky.focusObject.mockClear();
    mockSky.toggleHighlight.mockClear();
  });

  it("renders object name and facts", () => {
    const { getAllByText, getByText } = render(<ObjectDetailScreen />);
    expect(getAllByText("Sirius").length).toBeGreaterThan(0);
    expect(getByText(/Binary system/)).toBeTruthy();
  });

  it("focus button calls focusObject and navigates back", () => {
    const { getByText } = render(<ObjectDetailScreen />);
    fireEvent.press(getByText("Focus in sky"));
    expect(mockSky.focusObject).toHaveBeenCalledWith("sirius");
    expect(mockRouterBack).toHaveBeenCalled();
  });

  it("highlight button toggles highlight", () => {
    const { getByText } = render(<ObjectDetailScreen />);
    fireEvent.press(getByText("Highlight"));
    expect(mockSky.toggleHighlight).toHaveBeenCalledWith("sirius");
  });
});
