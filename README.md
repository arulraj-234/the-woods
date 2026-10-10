# The Woods

> Survive the Night

The Woods is an atmospheric, top-down 2.5D survival horror experience built with React, Vite, HTML5 Canvas, and procedural Web Audio synthesis. Players venture into an infinite, procedurally generated, fog-choked forest stalked by relentless physical hunters and ethereal phantoms. Manage your flickering torch flame, outrun pursuers, and consecrate ancient stone shrines to establish radiant rings of sanctuary before the darkness claims your soul.

---

## Screen Flow and Architecture

The game features a multi-screen PC navigation flow designed to fit within a non-scrolling 100vh viewport:

1. **Title / Landing Screen**:
   - Hero title line rendered in custom horror typography.
   - Atmospheric background featuring procedural fog and floating ember particles.
   - High score tracker, ambient sound toggle, and settings modal access.
   - Prominent bonfire flame PLAY button.

2. **Survivor Callsign Registration**:
   - Seamless onboarding modal for first-time visitors.
   - Captures survivor callsign for persistent leaderboards and run statistics.
   - Automatically guides newcomers into character selection.

3. **Game-Style Character Selection Stage**:
   - Two-column RPG selection layout.
   - **Left Stage**: Elevated pedestal displaying animated character sprite with left and right swap controls, plus a fast-select thumbnail strip.
   - **Right Dossier**: In-depth survivor bio, unique perk card, and six core survival attributes.
   - Direct shortcuts: CONFIRM SURVIVOR, ENTER THE WOODS, and CANCEL / BACK.

4. **Base Camp Hub**:
   - The central operational hub for returning survivors.
   - **Left Column**: Active survivor card displaying current operative, callsign, and perk summary with direct access to swap characters.
   - **Right Column**: Operational menu:
     - ENTER THE WOODS (Launches session)
     - CHANGE SURVIVOR (Opens selection stage)
     - SURVIVAL FIELD GUIDE (Mechanics reference manual)
     - SETTINGS (Volume, screen shake, SFX, and ambience toggles)
     - RETURN TO TITLE (Returns to landing page)

5. **2.5D Survival Canvas and In-Game HUD**:
   - Real-time flashlight and torch lighting simulation with soft radius drop-off.
   - Dynamic fuel depletion bar, score multiplier, and zone level indicator.
   - Responsive death screen with immediate TRY AGAIN and safe RETURN TO CAMP pathways.

---

## Survivor Roster

| Survivor | Title | Role / Trait | Special Perk | Trait Modifiers |
| :--- | :--- | :--- | :--- | :--- |
| **Vance** | The Survivor | Balanced frontiersman | **Resolute Walker** | +2% Speed, +15% fuel efficiency, and +20 bonus torch fuel. |
| **Lyra** | The Shadow Walker | Swift scout | **Ghost Fleet** | +8% Walk speed, +62% sprint burst, 25% lower sprint fuel consumption, and slips past phantoms. |
| **Gideon** | The Woodsman | Seasoned tracker | **Ember Keeper** | Torch burns 30% slower, +35% pickup range, and +40 bonus torch fuel. |
| **Rowan** | The Vanguard | Holy sentinel | **Aegis Ward** | +40% larger Ring of Protection radius. Regenerates torch fuel steadily inside sanctuaries. |
| **Scarlet** | The Crimson Tracker | Keen hunter | **Predator Sight** | Heightened senses: Stalker chevrons detected up to 650px away; predator eyes revealed up to 600px. |
| **Torin** | The Ironclad | Rugged wanderer | **Iron Resolve & Bounty** | +15 bonus score per torch. Deflects and knocks back the first lethal blow every 35 seconds. |

---

## Core Gameplay Mechanics

### Torch Fuel and Sprint Bursts
- Your handheld torch continuously consumes fuel (`MAX_FUEL = 1000`).
- Recover fuel by gathering burning torches placed along deadwood and trees (+500 fuel baseline, modified by survivor traits).
- Holding **SHIFT** or **SPACE** initiates a sprint surge. Sprinting increases movement speed by 45% to 65% depending on chosen survivor, but accelerates fuel decay.

### Rings of Protection (Ancient Shrines and Gazebos)
- Stone shrines and sacred ruins are scattered across the deep forest with dedicated clearings.
- Approaching a shrine activates consecration runes and projects a radiant **Ring of Protection**.
- Standing within the consecrated ring renders the survivor impervious to harm and physically repels hunters and phantoms with kinetic force.

### The Stalkers
- **Hunters (Red Chevrons)**: Flesh-and-bone predators that navigate the forest. They collide with trees, rocks, and walls, allowing survivors to break line of sight in dense groves.
- **Phantoms (Cyan Chevrons)**: Ethereal entities unbound by physical obstacles. They pass through trees and boulders. Survivors must rely on sprint bursts or the sanctuary of a Ring of Protection to escape.

### 10-Level Difficulty Progression
Surviving the night and recovering torches advances your score and triggers zone transitions with increasing predator speed, count, and detection range:

- **Level 1: The Whispering Outskirts** (Score: 0+) - 2 Hunters, 0 Phantoms. Quiet outskirts to learn movement and torch recovery.
- **Level 2: The Twilight Thicket** (Score: 25+) - 3 Hunters, 1 Phantom. Shadows lengthen as lone spectral entities appear.
- **Level 3: The Shadowed Woods** (Score: 60+) - 4 Hunters, 2 Phantoms. Hunters match walking pace; sprint management becomes essential.
- **Level 4: The Crimson Grove** (Score: 105+) - 6 Hunters, 2 Phantoms. Predators outpace standard walking speed.
- **Level 5: The Howling Deep** (Score: 160+) - 8 Hunters, 3 Phantoms. Pack aggression escalates; sanctuaries become vital.
- **Level 6: The Haunted Ruins** (Score: 230+) - 10 Hunters, 4 Phantoms. Crumbling stone altars with elevated phantom presence.
- **Level 7: The Spectral Labyrinth** (Score: 315+) - 12 Hunters, 5 Phantoms. Relentless pursuers navigating dense tree clusters.
- **Level 8: The Abyssal Thicket** (Score: 410+) - 14 Hunters, 6 Phantoms. High difficulty demanding active perk synergy.
- **Level 9: The Cursed Necropolis** (Score: 520+) - 16 Hunters, 7 Phantoms. High predator density converging from multiple vectors.
- **Level 10: The Endless Nightmare** (Score: 650+) - 18 Hunters, 8 Phantoms. The ultimate endurance test in total darkness.

---

## Audio and Atmospheric Engine

- **Procedural Web Audio Synthesis**: Dual-engine wind synthesis utilizing filtered noise, bandpass LFO modulation, and a 55 Hz sub-bass drone.
- **Adaptive Heartbeat and Tension**: Dynamic urgency scaling that accelerates in volume and tempo as predators close distance or torch fuel depletes.
- **Procedural Chimes and Signals**: Synthesized feedback for torch pickups, shrine consecrations, level transitions, and tactile UI interactions.
- **Environmental Audio**: Crackling campfire loops, footstep cadence for walking and sprinting, creature stalk cues, and cinematic defeat impacts.
- **One-Touch Audio Unlock**: Automatic browser audio context unlocking on the first user pointer or keyboard gesture.

---

## Asset Architecture and Optimization

- **Standalone Sliced Sprites**: Individual trimmed PNG sprites for trees, boulders, bushes, and shrines located in `public/assets/sprites/` to prevent atlas texture bleeding.
- **High-Fidelity Character Art**: Transparent standalone character sprites in `public/characters/` configured for 2.5D depth-sorted rendering.
- **Relative Path Resolution**: Configured Vite build (`base: './'`) ensuring compatibility with web iframe environments such as Itch.io and static web servers.

---

## Design System and Typography

- **Color Palette**:
  - Night Charcoal: `#060507`
  - Bonfire Amber: `#FCB42C`
  - Flame Orange: `#EC8B10`
  - Molten Crimson: `#E74D02`
  - Ember Deep: `#B62602`
  - Warm Ash Cream: `#F5EBE6`
- **Typography**:
  - Hero Title: `Ghastly Panic`
  - Headings and Action Buttons: `Night Sacred`
  - System Stats, Logs and Dossiers: `Courier Prime`
  - UI Labels and Descriptions: `Outfit`

---

## Controls

| Key | Action |
| :--- | :--- |
| **W / Up Arrow** | Move North |
| **A / Left Arrow** | Move West |
| **S / Down Arrow** | Move South |
| **D / Right Arrow** | Move East |
| **Shift / Space** | Sprint Surge (Consumes fuel faster) |
| **Escape** | Close Modals / Return to Menu |

---

## Tech Stack

- **Framework**: React 19 + Vite 6
- **Rendering**: HTML5 2D Canvas (Depth-sorted 2.5D sprite renderer)
- **Audio**: Web Audio API (Procedural synthesizer nodes and HTMLMediaElement audio pools)
- **Styling**: Vanilla CSS with custom design tokens (`100vh` non-scrolling viewport)
- **Testing**: Vitest + Testing Library

---

## Local Development and Setup

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
