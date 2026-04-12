import React from "react";
import { act, fireEvent, render, waitFor } from "@testing-library/react-native";
import AsyncStorage from "@react-native-async-storage/async-storage";
import ObservingSettingsScreen from "../../../app/settings/observing";

jest.mock("expo-router", () => ({
  Stack: { Screen: ({ children }: { children?: React.ReactNode }) => children ?? null },
  useRouter: () => ({ back: jest.fn() }),
}));

describe("ObservingSettingsScreen", () => {
  beforeEach(async () => {
    await AsyncStorage.clear();
  });

  it("writes lat/lon to storage on save", async () => {
    const { getByPlaceholderText, getByText, findByText } = render(<ObservingSettingsScreen />);
    fireEvent.changeText(getByPlaceholderText("37.7749"), "40.7");
    fireEvent.changeText(getByPlaceholderText("-122.4194"), "-74.0");
    await act(async () => {
      fireEvent.press(getByText("Save"));
    });
    expect(await findByText(/Saved/)).toBeTruthy();
    await waitFor(async () => {
      const raw = await AsyncStorage.getItem("@skysync/settings");
      expect(raw).toBeTruthy();
      const parsed = JSON.parse(raw!);
      expect(parsed.latitude).toBeCloseTo(40.7, 3);
      expect(parsed.longitude).toBeCloseTo(-74.0, 3);
    });
  });

  it("rejects out-of-range coordinates silently", async () => {
    const { getByPlaceholderText, getByText, queryByText } = render(<ObservingSettingsScreen />);
    fireEvent.changeText(getByPlaceholderText("37.7749"), "400");
    fireEvent.changeText(getByPlaceholderText("-122.4194"), "999");
    await act(async () => {
      fireEvent.press(getByText("Save"));
    });
    expect(queryByText(/Saved/)).toBeNull();
  });
});
