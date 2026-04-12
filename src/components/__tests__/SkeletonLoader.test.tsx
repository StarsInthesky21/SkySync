import { render } from "@testing-library/react-native";
import { SkyViewSkeleton, CardSkeleton, ProfileSkeleton } from "../SkeletonLoader";

describe("SkeletonLoader", () => {
  it("SkyViewSkeleton renders without crashing", () => {
    const { toJSON } = render(<SkyViewSkeleton />);
    expect(toJSON()).toBeTruthy();
  });

  it("CardSkeleton renders four shimmer blocks", () => {
    const tree = render(<CardSkeleton />).toJSON();
    expect(tree).toBeTruthy();
  });

  it("ProfileSkeleton renders avatar + name blocks", () => {
    const tree = render(<ProfileSkeleton />).toJSON();
    expect(tree).toBeTruthy();
  });
});
