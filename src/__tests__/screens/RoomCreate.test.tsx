import React from "react";
import { act, fireEvent, render, waitFor } from "@testing-library/react-native";
import RoomCreateScreen from "../../../app/room/create";
import { buildMockSky } from "../helpers/mockProvider";

const mockReplace = jest.fn();
const mockBack = jest.fn();

jest.mock("expo-router", () => ({
  Stack: { Screen: ({ children }: { children?: React.ReactNode }) => children ?? null },
  useRouter: () => ({ back: mockBack, push: jest.fn(), replace: mockReplace }),
}));

const mockSky = buildMockSky();

jest.mock("@/providers/SkySyncProvider", () => ({
  useSkySync: () => mockSky,
}));

describe("RoomCreateScreen", () => {
  beforeEach(() => {
    mockReplace.mockClear();
    mockBack.mockClear();
    mockSky.createRoom.mockClear();
  });

  it("disables Create when name is empty", () => {
    const { getByText } = render(<RoomCreateScreen />);
    const btn = getByText("Create room");
    fireEvent.press(btn);
    expect(mockSky.createRoom).not.toHaveBeenCalled();
  });

  it("creates a room and replaces route on success", async () => {
    mockSky.createRoom.mockResolvedValueOnce("XYZ789");
    const { getByPlaceholderText, getByText } = render(<RoomCreateScreen />);
    fireEvent.changeText(getByPlaceholderText(/Winter Orion/), "Test Room");
    await act(async () => {
      fireEvent.press(getByText("Create room"));
    });
    await waitFor(() => expect(mockSky.createRoom).toHaveBeenCalledWith("Test Room"));
    expect(mockReplace).toHaveBeenCalledWith("/room/XYZ789");
  });

  it("surfaces errors from createRoom", async () => {
    mockSky.createRoom.mockRejectedValueOnce(new Error("network down"));
    const { getByPlaceholderText, getByText, findByText } = render(<RoomCreateScreen />);
    fireEvent.changeText(getByPlaceholderText(/Winter Orion/), "Boom");
    await act(async () => {
      fireEvent.press(getByText("Create room"));
    });
    expect(await findByText(/network down/)).toBeTruthy();
  });

  it("cancel calls router.back", () => {
    const { getByText } = render(<RoomCreateScreen />);
    fireEvent.press(getByText("Cancel"));
    expect(mockBack).toHaveBeenCalled();
  });
});
