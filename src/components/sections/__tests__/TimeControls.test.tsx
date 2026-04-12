import { render, fireEvent, act } from "@testing-library/react-native";
import { TimeControls } from "../TimeControls";

const mockSetSelectedDate = jest.fn();
const mockSetLiveMode = jest.fn();
let mockSelectedDate = new Date("2024-06-21T12:00:00.000Z");

jest.mock("@/providers/SkySyncProvider", () => ({
  useSkySync: () => ({
    selectedDate: mockSelectedDate,
    setSelectedDate: mockSetSelectedDate,
    setLiveMode: mockSetLiveMode,
  }),
}));

jest.mock("@react-native-community/slider", () => {
  const React = require("react");
  const { View } = require("react-native");
  return {
    __esModule: true,
    default: ({ value }: { value: number }) => React.createElement(View, { testID: `slider-${value}` }),
  };
});

describe("TimeControls", () => {
  beforeEach(() => {
    mockSetSelectedDate.mockClear();
    mockSetLiveMode.mockClear();
    mockSelectedDate = new Date("2024-06-21T12:00:00.000Z");
  });

  it("seeds inputs from the provider's selectedDate", () => {
    const { getByDisplayValue } = render(
      <TimeControls voiceGuideEnabled onStatus={() => {}} setVoiceGuideEnabled={() => {}} />,
    );
    expect(getByDisplayValue("2024-06-21")).toBeTruthy();
    expect(getByDisplayValue("12:00")).toBeTruthy();
  });

  it("rejects invalid date/time format with an error status", () => {
    const onStatus = jest.fn();
    const { getByText, getByDisplayValue } = render(
      <TimeControls voiceGuideEnabled onStatus={onStatus} setVoiceGuideEnabled={() => {}} />,
    );
    act(() => {
      fireEvent.changeText(getByDisplayValue("2024-06-21"), "not-a-date");
    });
    act(() => {
      fireEvent.press(getByText("Apply"));
    });
    expect(onStatus).toHaveBeenCalledWith("Invalid date or time format");
    expect(mockSetSelectedDate).not.toHaveBeenCalled();
  });

  it("applies valid date/time to the provider", () => {
    const onStatus = jest.fn();
    const { getByText, getByDisplayValue } = render(
      <TimeControls voiceGuideEnabled onStatus={onStatus} setVoiceGuideEnabled={() => {}} />,
    );
    act(() => {
      fireEvent.changeText(getByDisplayValue("2024-06-21"), "2030-01-15");
      fireEvent.changeText(getByDisplayValue("12:00"), "22:30");
    });
    act(() => {
      fireEvent.press(getByText("Apply"));
    });
    expect(mockSetSelectedDate).toHaveBeenCalledTimes(1);
    const passed = mockSetSelectedDate.mock.calls[0][0] as Date;
    expect(passed.toISOString()).toBe("2030-01-15T22:30:00.000Z");
    expect(onStatus).toHaveBeenCalledWith("Time travel: 2030-01-15 22:30");
  });

  it("'Now' button resets to real-time", () => {
    const onStatus = jest.fn();
    const { getAllByText } = render(
      <TimeControls voiceGuideEnabled onStatus={onStatus} setVoiceGuideEnabled={() => {}} />,
    );
    // The first "Now" is the primary button (chip "Now" appears later).
    act(() => {
      fireEvent.press(getAllByText("Now")[0]);
    });
    expect(mockSetLiveMode).toHaveBeenCalledWith(true);
    expect(onStatus).toHaveBeenCalledWith("Returned to real-time sky");
  });

  it("year chips jump to the selected year", () => {
    const onStatus = jest.fn();
    const { getByText } = render(
      <TimeControls voiceGuideEnabled onStatus={onStatus} setVoiceGuideEnabled={() => {}} />,
    );
    act(() => {
      fireEvent.press(getByText("1800"));
    });
    expect(mockSetSelectedDate).toHaveBeenCalledTimes(1);
    const passed = mockSetSelectedDate.mock.calls[0][0] as Date;
    expect(passed.getUTCFullYear()).toBe(1800);
    expect(onStatus).toHaveBeenCalledWith("Jumped to 1800");
  });

  it("voice-guide toggle calls setVoiceGuideEnabled", () => {
    const setVoiceGuideEnabled = jest.fn();
    const { UNSAFE_getByType } = render(
      <TimeControls
        voiceGuideEnabled={false}
        onStatus={() => {}}
        setVoiceGuideEnabled={setVoiceGuideEnabled}
      />,
    );
    const Switch = require("react-native").Switch;
    const toggle = UNSAFE_getByType(Switch);
    act(() => {
      toggle.props.onValueChange(true);
    });
    expect(setVoiceGuideEnabled).toHaveBeenCalledWith(true);
  });
});
