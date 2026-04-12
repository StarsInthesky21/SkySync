import { render, act, fireEvent } from "@testing-library/react-native";
import { Text } from "react-native";
import { ToastProvider, useToast } from "../Toast";

function Trigger({
  text = "Saved",
  type,
}: {
  text?: string;
  type?: "success" | "error" | "info" | "warning";
}) {
  const toast = useToast();
  return (
    <Text accessibilityLabel="trigger-toast" onPress={() => toast.show(text, type)}>
      trigger
    </Text>
  );
}

describe("Toast", () => {
  beforeEach(() => {
    jest.useFakeTimers();
  });
  afterEach(() => {
    jest.useRealTimers();
  });

  it("useToast throws when called outside ToastProvider", () => {
    const consoleErr = jest.spyOn(console, "error").mockImplementation(() => {});
    expect(() =>
      render(
        <>
          <Trigger />
        </>,
      ),
    ).toThrow(/useToast must be used inside ToastProvider/);
    consoleErr.mockRestore();
  });

  it("renders a toast when show() is called, then auto-dismisses after 3s", () => {
    const { getByLabelText, queryByText } = render(
      <ToastProvider>
        <Trigger text="Hello world" />
      </ToastProvider>,
    );
    act(() => {
      fireEvent.press(getByLabelText("trigger-toast"));
    });
    expect(queryByText("Hello world")).toBeTruthy();

    act(() => {
      jest.advanceTimersByTime(3500);
    });
    expect(queryByText("Hello world")).toBeNull();
  });

  it("caps visible toasts at 3 (newer replaces oldest)", () => {
    const { getByLabelText, queryAllByText } = render(
      <ToastProvider>
        <Trigger text="one" />
      </ToastProvider>,
    );
    const trigger = getByLabelText("trigger-toast");
    act(() => {
      fireEvent.press(trigger);
      fireEvent.press(trigger);
      fireEvent.press(trigger);
      fireEvent.press(trigger);
      fireEvent.press(trigger);
    });
    // After 5 presses, only the latest 3 remain visible.
    expect(queryAllByText("one")).toHaveLength(3);
  });

  it("renders success icon for type=success", () => {
    const { getByLabelText, getByText } = render(
      <ToastProvider>
        <Trigger text="Done" type="success" />
      </ToastProvider>,
    );
    act(() => {
      fireEvent.press(getByLabelText("trigger-toast"));
    });
    expect(getByText("\u2713")).toBeTruthy();
  });
});
