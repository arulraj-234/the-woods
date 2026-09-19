import { render, screen, fireEvent } from "@testing-library/react";
import App from "./App";
import { describe, it, expect, beforeEach } from "vitest";
import React from "react";

describe("The Woods", () => {
  beforeEach(() => {
    localStorage.clear();
  });

  it("renders the hero title and landing screen elements", () => {
    render(<App />);

    // Verify hero title and subtitle
    expect(screen.getByText("THE WOODS")).toBeInTheDocument();
    expect(screen.getByText("SURVIVE THE NIGHT")).toBeInTheDocument();

    // Verify play button
    expect(screen.getByRole("button", { name: "PLAY" })).toBeInTheDocument();
  });

  it("opens survivor registration for first-timers on clicking play", () => {
    render(<App />);

    const playBtn = screen.getByRole("button", { name: "PLAY" });
    fireEvent.click(playBtn);

    // Verify registration modal opens
    expect(screen.getByText("SURVIVOR REGISTRATION")).toBeInTheDocument();
    expect(screen.getByPlaceholderText("Survivor")).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "PROCEED TO SURVIVOR SELECTION" })).toBeInTheDocument();
  });

  it("proceeds to survivor selection after entering callsign", () => {
    render(<App />);

    fireEvent.click(screen.getByRole("button", { name: "PLAY" }));
    const input = screen.getByPlaceholderText("Survivor");
    fireEvent.change(input, { target: { value: "HunterX" } });
    fireEvent.click(screen.getByRole("button", { name: "PROCEED TO SURVIVOR SELECTION" }));

    // Verify survivor selection screen is shown
    expect(screen.getByText("SURVIVOR SELECTION")).toBeInTheDocument();
    expect(screen.getByText("Vance")).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "CONFIRM SURVIVOR" })).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "ENTER THE WOODS" })).toBeInTheDocument();
  });

  it("navigates to base camp for onboarded returning players", () => {
    localStorage.setItem("th_onboarded", "true");
    localStorage.setItem("th_playername", "ShadowWalker");

    render(<App />);

    fireEvent.click(screen.getByRole("button", { name: "PLAY" }));

    // Verify Base Camp screen options are rendered
    expect(screen.getByText("ShadowWalker")).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "ENTER THE WOODS" })).toBeInTheDocument();
    expect(screen.getAllByRole("button", { name: "SETTINGS" })).toHaveLength(2);
    expect(screen.getByRole("button", { name: "RETURN TO TITLE" })).toBeInTheDocument();
  });
});
