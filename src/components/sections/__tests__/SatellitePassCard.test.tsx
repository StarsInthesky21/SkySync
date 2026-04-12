import { render } from "@testing-library/react-native";
import { SatellitePassCard } from "../SatellitePassCard";

const mockFetchTles = jest.fn();
const mockNextVisiblePass = jest.fn();

jest.mock("@/services/astronomy/satelliteTracking", () => ({
  FEATURED_SAT_NAMES: ["ISS", "HST"],
  fetchTles: (...args: unknown[]) => mockFetchTles(...args),
  nextVisiblePass: (...args: unknown[]) => mockNextVisiblePass(...args),
}));

describe("SatellitePassCard", () => {
  beforeEach(() => {
    mockFetchTles.mockReset();
    mockNextVisiblePass.mockReset();
  });

  it("renders nothing while TLE data is loading", () => {
    mockFetchTles.mockReturnValue(new Promise(() => {})); // never resolves
    const { toJSON } = render(
      <SatellitePassCard latitudeDeg={37.7} longitudeDeg={-122.4} date={new Date()} />,
    );
    expect(toJSON()).toBeNull();
  });

  it("shows the empty-state when no featured passes are found", async () => {
    mockFetchTles.mockResolvedValue([{ name: "ISS (ZARYA)", line1: "", line2: "" }]);
    mockNextVisiblePass.mockReturnValue(null);
    const { findByText } = render(
      <SatellitePassCard latitudeDeg={37.7} longitudeDeg={-122.4} date={new Date()} />,
    );
    expect(await findByText(/No bright passes/)).toBeTruthy();
  });

  it("renders rows for featured satellites only, with rounded altitude", async () => {
    mockFetchTles.mockResolvedValue([
      { name: "ISS", line1: "", line2: "" },
      { name: "HST", line1: "", line2: "" },
      { name: "NOT-FEATURED", line1: "", line2: "" },
    ]);
    mockNextVisiblePass.mockReturnValue({
      start: new Date("2024-06-21T21:30:00Z"),
      maxAltitudeDeg: 47.4,
    });
    const { findByText, getByText, queryByText, findAllByText } = render(
      <SatellitePassCard latitudeDeg={37.7} longitudeDeg={-122.4} date={new Date()} />,
    );
    expect(await findByText("ISS")).toBeTruthy();
    expect(getByText("HST")).toBeTruthy();
    expect(queryByText("NOT-FEATURED")).toBeNull();
    const altRows = await findAllByText("47\u00B0");
    expect(altRows.length).toBe(2);
  });
});
