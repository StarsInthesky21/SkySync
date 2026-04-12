import React from "react";
import { render } from "@testing-library/react-native";
import { ParticipantTile } from "../ParticipantTile";

describe("ParticipantTile", () => {
  it("renders the first letter of the participant name", () => {
    const { getByText } = render(
      <ParticipantTile
        participant={{
          id: "a",
          name: "Alice",
          speaking: false,
          muted: false,
          audioLevel: 0,
          isLocal: true,
        }}
      />,
    );
    expect(getByText("A")).toBeTruthy();
    expect(getByText("Alice")).toBeTruthy();
  });

  it("shows MUTED badge when participant is muted", () => {
    const { getByText } = render(
      <ParticipantTile
        participant={{
          id: "b",
          name: "Bob",
          speaking: false,
          muted: true,
          audioLevel: 0,
          isLocal: false,
        }}
      />,
    );
    expect(getByText("MUTED")).toBeTruthy();
  });

  it("handles empty name gracefully", () => {
    const { queryByText } = render(
      <ParticipantTile
        participant={{
          id: "c",
          name: "",
          speaking: false,
          muted: false,
          audioLevel: 0,
          isLocal: false,
        }}
      />,
    );
    expect(queryByText("?")).toBeTruthy();
  });
});
