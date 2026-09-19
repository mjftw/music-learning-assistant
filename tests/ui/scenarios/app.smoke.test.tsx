import { describe, expect, it } from "vitest";
import { render, screen } from "@testing-library/react";
import { App } from "../../../src/ui/App";

describe("app shell", () => {
  it("renders the placeholder heading", () => {
    render(<App />);

    expect(
      screen.getByRole("heading", { name: "Music Learning Assistant" }),
    ).toBeTruthy();
  });
});
