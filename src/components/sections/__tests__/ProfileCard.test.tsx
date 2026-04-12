import { render, fireEvent, act } from "@testing-library/react-native";
import { ProfileCard } from "../ProfileCard";

const mockUpdateUsername = jest.fn();
let mockProfile: {
  username: string;
  xp: number;
  planetsDiscovered: string[];
  totalStarsViewed: number;
} | null = {
  username: "Tester",
  xp: 120,
  planetsDiscovered: ["jupiter", "saturn"],
  totalStarsViewed: 25,
};

jest.mock("@/providers/SkySyncProvider", () => ({
  useSkySync: () => ({ userProfile: mockProfile, updateUsername: mockUpdateUsername }),
}));

describe("ProfileCard", () => {
  beforeEach(() => {
    mockUpdateUsername.mockClear();
    mockProfile = {
      username: "Tester",
      xp: 120,
      planetsDiscovered: ["jupiter", "saturn"],
      totalStarsViewed: 25,
    };
  });

  it("renders username, XP, planet count, and stars viewed", () => {
    const { getByText } = render(<ProfileCard onStatus={() => {}} />);
    expect(getByText("Tester")).toBeTruthy();
    expect(getByText(/120 XP/)).toBeTruthy();
    expect(getByText(/2 planets/)).toBeTruthy();
    expect(getByText(/25 viewed/)).toBeTruthy();
  });

  it("falls back to 'Stargazer' when no profile is loaded", () => {
    mockProfile = null;
    const { getByText } = render(<ProfileCard onStatus={() => {}} />);
    expect(getByText("Stargazer")).toBeTruthy();
  });

  it("opens the editor when Edit is pressed and saves a new username", () => {
    const onStatus = jest.fn();
    const { getByLabelText, getByPlaceholderText, getByText } = render(<ProfileCard onStatus={onStatus} />);
    act(() => {
      fireEvent.press(getByLabelText("Edit profile"));
    });
    const input = getByPlaceholderText("Enter username");
    act(() => {
      fireEvent.changeText(input, "Nebula");
    });
    act(() => {
      fireEvent.press(getByText("Save"));
    });
    expect(mockUpdateUsername).toHaveBeenCalledWith("Nebula");
    expect(onStatus).toHaveBeenCalledWith("Username updated to Nebula");
  });

  it("ignores empty/whitespace-only usernames", () => {
    const { getByLabelText, getByPlaceholderText, getByText } = render(<ProfileCard onStatus={() => {}} />);
    act(() => {
      fireEvent.press(getByLabelText("Edit profile"));
    });
    const input = getByPlaceholderText("Enter username");
    act(() => {
      fireEvent.changeText(input, "   ");
    });
    act(() => {
      fireEvent.press(getByText("Save"));
    });
    expect(mockUpdateUsername).not.toHaveBeenCalled();
  });

  it("closes the editor when Close is pressed", () => {
    const { getByLabelText, queryByText } = render(<ProfileCard onStatus={() => {}} />);
    act(() => {
      fireEvent.press(getByLabelText("Edit profile"));
    });
    expect(queryByText("Save")).toBeTruthy();
    act(() => {
      fireEvent.press(getByLabelText("Edit profile"));
    });
    expect(queryByText("Save")).toBeNull();
  });
});
