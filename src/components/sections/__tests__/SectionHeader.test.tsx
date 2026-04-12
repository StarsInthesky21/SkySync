import { render } from "@testing-library/react-native";
import { SectionHeader } from "../SectionHeader";

describe("SectionHeader", () => {
  it("renders just the title when no subtitle is provided", () => {
    const { getByText, queryByText } = render(<SectionHeader title="Badges" />);
    expect(getByText("Badges")).toBeTruthy();
    expect(queryByText("subtitle")).toBeNull();
  });

  it("renders both title and subtitle when both provided", () => {
    const { getByText } = render(<SectionHeader title="Challenges" subtitle="Today's tasks" />);
    expect(getByText("Challenges")).toBeTruthy();
    expect(getByText("Today's tasks")).toBeTruthy();
  });

  it("uses the 'header' accessibility role", () => {
    const { UNSAFE_getByProps } = render(<SectionHeader title="Room" />);
    expect(UNSAFE_getByProps({ accessibilityRole: "header" })).toBeTruthy();
  });
});
