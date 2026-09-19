# The Woods

> Survive the Night

**The Woods** is an atmospheric, top-down 2.5D survival horror experience built with React, Vite, HTML5 Canvas, and procedural Web Audio synthesis. Players venture into a procedurally generated, fog-choked forest stalked by relentless physical hunters and ethereal phantoms. Manage your flickering torch flame, outrun pursuers, and consecrate ancient stone shrines to establish radiant rings of sanctuary before the darkness claims your soul.

---

## Screen Flow & Architecture

The game features a multi-screen PC navigation flow designed to fit within a non-scrolling 100vh viewport:

1. **Title / Landing Screen**:
   - Hero title line rendered in custom horror typography.
   - Atmospheric background featuring procedural fog and floating ember particles.
   - High score tracker, ambient sound toggle, and settings modal access.
   - Prominent bonfire flame `PLAY` button.

2. **Survivor Callsign Registration**:
   - Seamless onboarding modal for first-time visitors.
   - Captures survivor callsign for persistent leaderboards and run statistics.
   - Automatically guides newcomers into character selection.

3. **Game-Style Character Selection Stage**:
   - Two-column RPG/fighting game selection layout.
   - **Left Stage**: Elevated pedestal displaying animated character sprite with left and right swap controls, plus a fast-select thumbnail strip.
   - **Right Dossier**: In-depth survivor bio, unique perk card with fiery flame accents, and six core survival attributes.
   - Direct shortcuts: `CONFIRM SURVIVOR`, `ENTER THE WOODS`, and `CANCEL / BACK`.

4. **Base Camp Hub**:
   - The central operational hub for returning survivors.
   - **Left Column**: Active survivor card displaying current operative, callsign, and perk summary with direct access to swap characters.
   - **Right Column**: Operational menu:
     - `ENTER THE WOODS` (Launches session)
     - `CHANGE SURVIVOR` (Opens selection stage)
     - `SURVIVAL FIELD GUIDE` (Mechanics reference manual)
     - `SETTINGS` (Volume, screen shake, SFX, and ambience toggles)
     - `RETURN TO TITLE` (Returns to landing page)

5. **2.5D Survival Canvas & In-Game HUD**:
   - Real-time flashlight/torch lighting simulation with soft radius drop-off.
   - Dynamic fuel depletion bar, score multiplier, and level indicator.
   - Responsive death screen with immediate `TRY AGAIN` and safe `RETURN TO CAMP` pathways.

---

## Survivor Roster

| Survivor | Title | Role / Trait | Special Perk | Trait Modifiers |
| :--- | :--- | :--- | :--- | :--- |
| **Vance** | The Survivor | Balanced frontiersman | **Resolute Walker** | Baseline stats across speed, fuel, and ward radius. |
| **Lyra** | The Shadow Walker | Swift scout | **Ghost Fleet** | +15% Sprint Speed boost. Easily outpaces phantoms. |
| **Gideon** | The Woodsman | Seasoned tracker | **Ember Keeper** | +20% Torch Fuel efficiency. Burns 20% slower. |
| **Rowan** | The Vanguard | Holy sentinel | **Aegis Ward** | +20% Ring of Protection radius. Broader sanctuary coverage. |
| **Scarlet** | The Crimson Tracker | Keen hunter | **Predator Sight** | Threat chevrons and stalker eyes detectable up to 550px. |
| **Torin** | The Ironclad | Rugged wanderer | **Trophy Hunter** | +5 bonus score per recovered wall/tree torch (+20 total). |

---

## Core Gameplay Mechanics

### Torch Fuel & Sprint Bursts
- Your handheld torch continuously consumes fuel (`MAX_FUEL = 1000`).
- Recover fuel (+500 per torch) by gathering torches placed along trees, fences, and ruin walls.
- Holding **SHIFT** or **SPACE** initiates a sprint surge. Sprinting increases movement speed by 45% to 65% depending on your chosen survivor, but accelerates fuel decay by 1.8x.

### Rings of Protection (Ancient Shrines & Gazebos)
- Stone shrines and wooden gazebos are scattered throughout the deep forest.
- Approaching a shrine activates consecration runes and projects a radiant **Ring of Protection**.
- Standing within the consecrated ring renders the survivor impervious to harm and physically repels hunters and phantoms backward with kinetic force.

### The Stalkers
- **Hunters (Red Chevrons)**: Flesh-and-bone stalkers that navigate the labyrinthine forest. They collide with trees, rocks, and walls, allowing clever survivors to break line of sight in dense groves.
- **Phantoms (Cyan Chevrons)**: Ethereal entities unbound by physical obstacles. They glide directly through solid trees and boulders. Survivors must rely on sprint bursts or the sanctuary of a Ring of Protection to survive.

### Level Progression
Surviving each night and recovering torches advances your score and triggers zone transitions:
- **Level 1**: *The Whispering Woods* (Score: 0+) - 4 Hunters, 0 Phantoms
- **Level 2**: *The Crimson Thicket* (Score: 35+) - 6 Hunters, 0 Phantoms, +8% speed
- **Level 3**: *The Haunted Grove* (Score: 80+) - 6 Hunters, 2 Phantoms, +15% speed
- **Level 4**: *The Ancient Ruins* (Score: 140+) - 8 Hunters, 4 Phantoms, +22% speed
- **Level 5**: *The Endless Nightmare* (Score: 220+) - 10 Hunters, 6 Phantoms, +30% speed

---

## Audio & Atmospheric Engine

- **Procedural Wind Synthesizer**: Built on the native Web Audio API using filtered pink/brownian noise passed through a sweeping bandpass filter (260 Hz with 0.12 Hz LFO modulation) coupled with a 55 Hz sub-bass sine drone.
- **Adaptive Heartbeat SFX**: Pulsing audio that accelerates in pitch and volume when stalkers close distance or torch fuel nears total exhaustion.
- **Visual Embers & Fog**: Procedural HTML5 canvas rendering layered rising embers and shifting dark fog beneath a charcoal night gradient.

---

## Design System & Typography

- **Color Palette**:
  - Night Charcoal: `#060507`
  - Bonfire Amber: `#FCB42C`
  - Flame Orange: `#EC8B10`
  - Molten Crimson: `#E74D02`
  - Ember Deep: `#B62602`
  - Warm Ash Cream: `#F5EBE6`
- **Typography**:
  - Hero Title: `Ghastly Panic`
  - Headings & Action Buttons: `Night Sacred`
  - System Stats, Logs & Dossiers: `Courier Prime`
  - UI Labels & Descriptions: `Outfit`

---

## Controls

| Key | Action |
| :--- | :--- |
| **W / Up Arrow** | Move North |
| **A / Left Arrow** | Move West |
| **S / Down Arrow** | Move South |
| **D / Right Arrow** | Move East |
| **Shift / Space** | Sprint Surge (Burns fuel 1.8x faster) |
| **Escape** | Close Modals / Field Guide |

---

## Tech Stack

- **Framework**: React 19 + Vite 6
- **Rendering**: HTML5 2D Canvas (Custom 2.5D depth-sorted sprite rendering)
- **Audio**: Web Audio API (Procedural synthesis + Web Audio gain nodes)
- **Styling**: Vanilla CSS with custom tokens and viewport constraints (`100vh` non-scrolling)
- **Testing**: Vitest + Testing Library

---

## Local Development & Setup

### Prerequisites
- Node.js (v18 or higher recommended)
- npm or yarn

### Installation
```bash
# Clone repository
git clone https://github.com/arulraj-234/the-woods.git

# Navigate to project directory
cd the-woods

# Install dependencies
npm install
```

### Running the Development Server
```bash
npm run dev
```
Open `http://localhost:5173` in your browser.

### Running Automated Tests
```bash
npm test
```

### Production Build
```bash
npm run build
```
The optimized production bundle will be output to the `dist/` directory.

---

## License

MIT License. Developed for all wanderers of the dark.
