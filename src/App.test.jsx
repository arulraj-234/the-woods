import { render, screen } from "@testing-library/react";
import App from "./App";
import { describe, it, expect } from "vitest";
import React from "react";

describe("Treasure Hunt: The Shadowed Woods", () => {
  it("renders the hero title and landing screen elements", () => {
    render(<App />);

    // Verify hero title and subtitle
    expect(screen.getByText("TREASURE HUNT")).toBeInTheDocument();
    expect(screen.getByText("THE SHADOWED WOODS")).toBeInTheDocument();

    // Verify start button
    expect(screen.getByText("ENTER THE WOODS")).toBeInTheDocument();

    // Verify character roster is displayed
    expect(screen.getByText("Vance")).toBeInTheDocument();
    expect(screen.getByText("Lyra")).toBeInTheDocument();
    expect(screen.getByText("Scarlet")).toBeInTheDocument();
  });
});

