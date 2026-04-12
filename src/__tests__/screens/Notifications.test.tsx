import React from "react";
import { act, fireEvent, render, waitFor } from "@testing-library/react-native";
import AsyncStorage from "@react-native-async-storage/async-storage";
import NotificationsScreen from "../../../app/notifications";

jest.mock("expo-router", () => ({
  Stack: { Screen: ({ children }: { children?: React.ReactNode }) => children ?? null },
  useRouter: () => ({ back: jest.fn() }),
}));

describe("NotificationsScreen", () => {
  beforeEach(async () => {
    await AsyncStorage.clear();
  });

  it("seeds default welcome entries on first open", async () => {
    const { findByText } = render(<NotificationsScreen />);
    expect(await findByText(/Welcome to SkySync/)).toBeTruthy();
  });

  it("mark-all-read flips every item read", async () => {
    const { findByText, getByText } = render(<NotificationsScreen />);
    await findByText(/Welcome to SkySync/);
    await act(async () => {
      fireEvent.press(getByText("Mark all read"));
    });
    await waitFor(async () => {
      const raw = (await AsyncStorage.getItem("@skysync/notifications")) ?? "[]";
      const list = JSON.parse(raw);
      expect(list.every((n: { read: boolean }) => n.read === true)).toBe(true);
    });
  });
});
