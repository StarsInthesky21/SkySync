import React from "react";
import { act, fireEvent, render, waitFor } from "@testing-library/react-native";
import RoomJoinScreen from "../../../app/room/join";
import { buildMockSky } from "../helpers/mockProvider";

const mockReplace = jest.fn();

jest.mock("expo-router", () => ({
  Stack: { Screen: ({ children }: { children?: React.ReactNode }) => children ?? null },
  useRouter: () => ({ back: jest.fn(), push: jest.fn(), replace: mockReplace }),
}));

const mockSky = buildMockSky();

jest.mock("@/providers/SkySyncProvider", () => ({
  useSkySync: () => mockSky,
}));

describe("RoomJoinScreen", () => {
  beforeEach(() => {
    mockReplace.mockClear();
    mockSky.joinRoom.mockClear();
  });

  it("uppercases the entered code and redirects", async () => {
    mockSky.joinRoom.mockResolvedValueOnce("joined abc123");
    const { getByPlaceholderText, getByLabelText } = render(<RoomJoinScreen />);
    fireEvent.changeText(getByPlaceholderText("ABC123"), "abc123");
    await act(async () => {
      fireEvent.press(getByLabelText("Submit join code"));
    });
    await waitFor(() => expect(mockSky.joinRoom).toHaveBeenCalledWith("ABC123"));
    expect(mockReplace).toHaveBeenCalledWith("/room/ABC123");
  });

  it("does nothing on empty input", () => {
    const { getByLabelText } = render(<RoomJoinScreen />);
    fireEvent.press(getByLabelText("Submit join code"));
    expect(mockSky.joinRoom).not.toHaveBeenCalled();
  });
});
