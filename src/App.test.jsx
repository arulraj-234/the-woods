import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import App from "./App";
import { describe, it, expect } from "vitest";
import React from "react";

describe("App", () => {
  it("renders player on top of checkpoint", async () => {
    render(<App />);
    const user = userEvent.setup();

    // Initial position is (0,0).
    // "old oak tree" is at (2,3).
    // We need to move Right 2 times, Down 3 times.

    // Verify player is initially visible
    expect(screen.getByText("🙂")).toBeInTheDocument();

    // Move Right x 2
    await user.keyboard("{ArrowRight}");
    await user.keyboard("{ArrowRight}");

    // Move Down x 3
    await user.keyboard("{ArrowDown}");
    await user.keyboard("{ArrowDown}");
    await user.keyboard("{ArrowDown}");

    // Now we should be at (2,3).
    // Check if player is still visible.
    // If the bug exists, the checkpoint image will overwrite the player span.
    expect(screen.queryByText("🙂")).toBeInTheDocument();
  });
});
