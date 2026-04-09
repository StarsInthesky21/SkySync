import { render, fireEvent, act } from "@testing-library/react-native";
import { StoryPlayer } from "../sky/StoryPlayer";
import { MythStory } from "@/types/sky";

const mockStory: MythStory = {
  id: "test-story",
  title: "Test Story",
  constellationId: "test-constellation",
  frames: [
    "Frame one content.",
    "Frame two content.",
    "Frame three content.",
  ],
};

describe("StoryPlayer", () => {
  beforeEach(() => { jest.useFakeTimers(); });
  afterEach(() => { jest.useRealTimers(); });

  it("renders story title", () => {
    const { getByText } = render(<StoryPlayer story={mockStory} />);
    expect(getByText("Test Story")).toBeTruthy();
  });

  it("shows first frame initially", () => {
    const { getByText } = render(<StoryPlayer story={mockStory} />);
    expect(getByText("Frame one content.")).toBeTruthy();
  });

  it("shows frame counter", () => {
    const { getByText } = render(<StoryPlayer story={mockStory} />);
    expect(getByText("1/3")).toBeTruthy();
  });

  it("has prev/next/pause controls", () => {
    const { getByText } = render(<StoryPlayer story={mockStory} />);
    expect(getByText("Prev")).toBeTruthy();
    expect(getByText("Next")).toBeTruthy();
    expect(getByText("Pause")).toBeTruthy();
  });

  it("advances to next frame on Next press", () => {
    const { getByText } = render(<StoryPlayer story={mockStory} />);
    fireEvent.press(getByText("Next"));
    expect(getByText("Frame two content.")).toBeTruthy();
    expect(getByText("2/3")).toBeTruthy();
  });

  it("goes to previous frame on Prev press", () => {
    const { getByText } = render(<StoryPlayer story={mockStory} />);
    fireEvent.press(getByText("Next"));
    fireEvent.press(getByText("Prev"));
    expect(getByText("Frame one content.")).toBeTruthy();
  });

  it("toggles pause/play", () => {
    const { getByText } = render(<StoryPlayer story={mockStory} />);
    fireEvent.press(getByText("Pause"));
    expect(getByText("Play")).toBeTruthy();
    fireEvent.press(getByText("Play"));
    expect(getByText("Pause")).toBeTruthy();
  });

  it("wraps around on Next at last frame", () => {
    const { getByText } = render(<StoryPlayer story={mockStory} />);
    fireEvent.press(getByText("Next"));
    fireEvent.press(getByText("Next"));
    fireEvent.press(getByText("Next"));
    expect(getByText("Frame one content.")).toBeTruthy();
  });
});
