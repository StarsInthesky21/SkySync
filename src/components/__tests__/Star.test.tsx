import { render, fireEvent } from "@testing-library/react-native";
import { Star } from "../sky/Star";
import { RenderedSkyObject } from "@/types/sky";

const mockObject: RenderedSkyObject = {
  id: "test-star",
  name: "Test Star",
  kind: "star",
  description: "A test star",
  distanceFromEarth: "10 ly",
  mythologyStory: "Test myth",
  scientificFacts: ["Fact 1", "Fact 2"],
  color: "#ffffff",
  longitude: 100,
  latitude: 20,
  magnitude: 1.0,
  motionFactor: 0.98,
  x: 0.5,
  y: 0.5,
  size: 6,
  isVisible: true,
};

const invisibleObject: RenderedSkyObject = { ...mockObject, id: "invisible", isVisible: false };

const planetObject: RenderedSkyObject = { ...mockObject, id: "planet-test", name: "Test Planet", kind: "planet" };

describe("Star component", () => {
  it("renders visible star", () => {
    const onPress = jest.fn();
    const { getByRole } = render(
      <Star object={mockObject} selected={false} highlighted={false} onPress={onPress} />
    );
    expect(getByRole("button")).toBeTruthy();
  });

  it("does not render invisible star", () => {
    const onPress = jest.fn();
    const { queryByRole } = render(
      <Star object={invisibleObject} selected={false} highlighted={false} onPress={onPress} />
    );
    expect(queryByRole("button")).toBeNull();
  });

  it("calls onPress with object id when tapped", () => {
    const onPress = jest.fn();
    const { getByRole } = render(
      <Star object={mockObject} selected={false} highlighted={false} onPress={onPress} />
    );
    fireEvent.press(getByRole("button"));
    expect(onPress).toHaveBeenCalledWith("test-star");
  });

  it("includes planet kind in accessibility label", () => {
    const onPress = jest.fn();
    const { getByLabelText } = render(
      <Star object={planetObject} selected={false} highlighted={false} onPress={onPress} />
    );
    expect(getByLabelText(/Test Planet, planet/)).toBeTruthy();
  });

  it("includes selected in accessibility label when selected", () => {
    const onPress = jest.fn();
    const { getByLabelText } = render(
      <Star object={mockObject} selected={true} highlighted={false} onPress={onPress} />
    );
    expect(getByLabelText(/Test Star, star, selected/)).toBeTruthy();
  });

  it("does not include selected for unselected stars", () => {
    const onPress = jest.fn();
    const { getByLabelText } = render(
      <Star object={mockObject} selected={false} highlighted={false} onPress={onPress} />
    );
    const label = getByLabelText(/Test Star, star/);
    expect(label.props.accessibilityLabel).not.toContain("selected");
  });

  it("includes accessibility label", () => {
    const onPress = jest.fn();
    const { getByLabelText } = render(
      <Star object={mockObject} selected={true} highlighted={true} onPress={onPress} />
    );
    expect(getByLabelText(/Test Star, star, selected, highlighted/)).toBeTruthy();
  });
});
