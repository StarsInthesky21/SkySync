import { render, fireEvent } from "@testing-library/react-native";
import { TabBar, TabId } from "../TabBar";

describe("TabBar", () => {
  it("renders all five tabs", () => {
    const { getByLabelText } = render(<TabBar activeTab="sky" onChangeTab={() => {}} />);
    ["Sky", "Explore", "Social", "Learn", "Profile"].forEach((label) => {
      expect(getByLabelText(label)).toBeTruthy();
    });
  });

  it("marks the active tab with accessibilityState.selected = true", () => {
    const { getByLabelText } = render(<TabBar activeTab="explore" onChangeTab={() => {}} />);
    expect(getByLabelText("Explore").props.accessibilityState.selected).toBe(true);
    expect(getByLabelText("Sky").props.accessibilityState.selected).toBe(false);
  });

  it("invokes onChangeTab with the selected tab id", () => {
    const onChangeTab = jest.fn();
    const { getByLabelText } = render(<TabBar activeTab="sky" onChangeTab={onChangeTab} />);
    fireEvent.press(getByLabelText("Social"));
    fireEvent.press(getByLabelText("Profile"));
    expect(onChangeTab).toHaveBeenCalledTimes(2);
    expect(onChangeTab.mock.calls[0][0] satisfies TabId).toBe("social");
    expect(onChangeTab.mock.calls[1][0] satisfies TabId).toBe("profile");
  });

  it("hides the unread badge when unreadCount is zero", () => {
    const { queryByText } = render(<TabBar activeTab="sky" onChangeTab={() => {}} unreadCount={0} />);
    expect(queryByText(/^\d+$|^9\+$/)).toBeNull();
  });

  it("shows exact count when unreadCount <= 9", () => {
    const { getByText } = render(<TabBar activeTab="sky" onChangeTab={() => {}} unreadCount={3} />);
    expect(getByText("3")).toBeTruthy();
  });

  it("shows 9+ when unreadCount > 9", () => {
    const { getByText } = render(<TabBar activeTab="sky" onChangeTab={() => {}} unreadCount={42} />);
    expect(getByText("9+")).toBeTruthy();
  });
});
