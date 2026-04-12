import { render, fireEvent, act } from "@testing-library/react-native";
import { SearchBar } from "../SearchBar";
import { RenderedSkyObject } from "@/types/sky";

function mkObj(partial: Partial<RenderedSkyObject> & { id: string; name: string }): RenderedSkyObject {
  return {
    kind: "star",
    description: "desc",
    distanceFromEarth: "4.2 ly",
    mythologyStory: "",
    scientificFacts: [],
    color: "#fff",
    longitude: 0,
    latitude: 0,
    magnitude: 0,
    motionFactor: 0,
    x: 0,
    y: 0,
    size: 5,
    isVisible: true,
    ...partial,
  };
}

const OBJECTS: RenderedSkyObject[] = [
  mkObj({ id: "jupiter", name: "Jupiter", kind: "planet", constellationId: "pisces" }),
  mkObj({ id: "saturn", name: "Saturn", kind: "planet" }),
  mkObj({ id: "sirius", name: "Sirius", kind: "star" }),
  mkObj({ id: "iss", name: "ISS", kind: "satellite" }),
];

describe("SearchBar", () => {
  it("hides results until the input is focused and has text", () => {
    const { queryByText, getByLabelText } = render(<SearchBar objects={OBJECTS} onSelect={() => {}} />);
    expect(queryByText("Jupiter")).toBeNull();
    const input = getByLabelText("Search celestial objects");
    act(() => {
      fireEvent.changeText(input, "jup");
    });
    expect(queryByText("Jupiter")).toBeNull(); // focus needed
    act(() => {
      fireEvent(input, "focus");
    });
    expect(queryByText("Jupiter")).toBeTruthy();
  });

  it("filters by name, kind, and constellationId (case-insensitive)", () => {
    const { getByLabelText, queryByText } = render(<SearchBar objects={OBJECTS} onSelect={() => {}} />);
    const input = getByLabelText("Search celestial objects");
    act(() => {
      fireEvent(input, "focus");
      fireEvent.changeText(input, "PLANET");
    });
    expect(queryByText("Jupiter")).toBeTruthy();
    expect(queryByText("Saturn")).toBeTruthy();
    expect(queryByText("Sirius")).toBeNull();

    act(() => {
      fireEvent.changeText(input, "pisces");
    });
    expect(queryByText("Jupiter")).toBeTruthy();
    expect(queryByText("Saturn")).toBeNull();
  });

  it("shows 'No objects found' when query matches nothing", () => {
    const { getByLabelText, getByText } = render(<SearchBar objects={OBJECTS} onSelect={() => {}} />);
    const input = getByLabelText("Search celestial objects");
    act(() => {
      fireEvent(input, "focus");
      fireEvent.changeText(input, "xxxnothingxxx");
    });
    expect(getByText("No objects found")).toBeTruthy();
  });

  it("invokes onSelect and clears the query on result press", () => {
    const onSelect = jest.fn();
    const { getByLabelText, queryByText } = render(<SearchBar objects={OBJECTS} onSelect={onSelect} />);
    const input = getByLabelText("Search celestial objects");
    act(() => {
      fireEvent(input, "focus");
      fireEvent.changeText(input, "saturn");
    });
    const result = getByLabelText(/^Saturn, planet/);
    act(() => {
      fireEvent.press(result);
    });
    expect(onSelect).toHaveBeenCalledWith("saturn");
    expect(queryByText("Saturn")).toBeNull();
  });

  it("clears the input when the Clear button is pressed", () => {
    const { getByLabelText, queryByText } = render(<SearchBar objects={OBJECTS} onSelect={() => {}} />);
    const input = getByLabelText("Search celestial objects");
    act(() => {
      fireEvent(input, "focus");
      fireEvent.changeText(input, "iss");
    });
    expect(queryByText("ISS")).toBeTruthy();
    act(() => {
      fireEvent.press(getByLabelText("Clear search"));
    });
    expect(queryByText("ISS")).toBeNull();
  });

  it("caps results at 8 items", () => {
    const many = Array.from({ length: 20 }, (_, i) =>
      mkObj({ id: `star-${i}`, name: `AstroStar ${i}`, kind: "star" }),
    );
    const { getByLabelText, getAllByLabelText } = render(<SearchBar objects={many} onSelect={() => {}} />);
    const input = getByLabelText("Search celestial objects");
    act(() => {
      fireEvent(input, "focus");
      fireEvent.changeText(input, "astrostar");
    });
    const results = getAllByLabelText(/^AstroStar \d+, star/);
    expect(results.length).toBe(8);
  });
});
