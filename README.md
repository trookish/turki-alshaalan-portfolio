# Turki Alshaalan — Professional Developer Portfolio & Interactive Arcade

[![Live Website](https://img.shields.io/badge/Live-Demo-brightgreen.svg?style=for-the-badge&logo=google-chrome&logoColor=white)](https://trookish.github.io/turki-alshaalan-portfolio/)
[![License](https://img.shields.io/badge/License-Copyright-blue.svg?style=for-the-badge)](LICENSE)
[![GitHub stars](https://img.shields.io/github/stars/trookish/turki-alshaalan-portfolio?style=for-the-badge)](https://github.com/trookish/turki-alshaalan-portfolio/stargazers)
[![Tech Stack](https://img.shields.io/badge/Built%20With-HTML5%20%7C%20CSS3%20%7C%20JS%20(ES6)-orange?style=for-the-badge)](https://developer.mozilla.org/en-US/docs/Web)

Welcome to the official repository of my personal portfolio website. This is a premium, high-performance, single-page website showcasing my academic journey, professional history, game development projects, and technical skills as an IT Student and Game Developer. 

Designed with a curated retro/indie-game pixel aesthetic, this portfolio features smooth modern transitions, lightweight code (zero third-party JS libraries), complete bilingual layout support (English and Arabic), custom audio-effects, and a fully-playable custom battle game built on HTML5 canvas.

---

## 🎮 The Built-In Game: "Turki's Battle Game"
Accessible by clicking the play icon (🎮) in the navigation header, the portfolio embeds a high-quality browser minigame. Rather than standard templates, this is a custom-coded arcade platformer featuring modern gamefeel principles and an advanced adversary AI.

```
+-------------------------------------------------------------+
|                     TURKI'S BATTLE GAME                     |
+-------------------------------------------------------------+
|  [P1: Player]      <- Movement, Attacks ->      [P2: Boss]  |
|  - Sword Swing                                 - Combos     |
|  - Shield Block                                - Shield     |
|  - Squashed Jump                               - Rage Mode  |
+-------------------------------------------------------------+
|                      [A][D][W][Space][J][K]                 |
+-------------------------------------------------------------+
```

### 1. Custom Physics & Collision Engine
Written entirely in vanilla ES6 JavaScript inside [game.js](file:///c:/Users/trookish/Dev/Web-Projects/Portfolio-Website/game.js), the game implements:
- **Kinematics**: Linear velocity, gravity calculations, floor/ceiling friction constants, and horizontal deceleration.
- **Platform Bounds**: Axis-Aligned Bounding Box (AABB) collision checks against floating platforms, allowing players to land on, walk across, and drop off ledges.
- **Entity Collisions**: Mutual-push resolution to prevent the Player and Boss from overlapping or clipping through one another.

### 2. "Game Juice" / Visual Effects
To provide satisfying, professional feedback, the render loops incorporate:
- **Hit-Stop (Freeze Frames)**: Short frame locks (3-18 frames) on weapon impacts, creating a sense of weight.
- **Screen Shake**: Dynamic camera shake decay on critical hits and shield breaks.
- **Elastic Scale (Squash & Stretch)**: Smooth sprite resizing on jumps, landings, attacks, and hits.
- **Chromatic Aberration & Screen Flashes**: Color splitting and full-screen flashing triggers for high-impact attacks.
- **Multi-Emitter Particle Systems**: Spawn rates for Sparks, Dust plumes upon landing, Sword Trails matching character directions, and Twinkling background stars.

### 3. Advanced Predictive Boss AI
The Boss is governed by a state machine that reads game vectors in real-time, executing high-tier tactics:
- **Coordinate Prediction**: Forecasts player landing vectors up to 20 frames ahead using current velocity, gravity, and trajectory formulas.
- **Platform Navigation**: Evaluates the nearest platform based on height differentials, proximity, and tactical zones.
- **Combat Behaviors**: 
  - **Dynamic Defense**: Activates shields when player swings are detected inside strike windows.
  - **Feints & Baits**: Performs fake approaches to force premature blocks before striking.
  - **Anti-Air Maneuvers**: Tracks jumps and responds with overhead strikes.
  - **Rage Phase**: Triggers a state transition below 50% health, increasing speed, attack rates, and combo chaining.

### 4. Input Layouts (Dual Configuration)
- **Desktop Keyboard Layout**:
  - `A` / `D` (or Arrows): Walk Left / Right
  - `W` / `Space` (or Up Arrow): Jump
  - `J`: Attack (Sword swing)
  - `K`: Block (Shield active)
  - `ESC`: Close game overlay
- **Mobile Touch Overlay**: Fully responsive virtual Game Boy style layout utilizing active state changes, custom touch-event boundaries, and custom-styled D-pads.

---

## 🛠️ Portfolio Features

### 🌐 Complete Bilingual Localization (EN / AR)
The site includes a custom translation engine that handles structural and dynamic content. Switching language modes updates the typography to match cultural norms:
- **English View**: Uses retro-game fonts `Pixelify Sans`, `Press Start 2P`, and `VT323`.
- **Arabic View**: Dynamically scales margins, changes block directions, and adopts the modern `Cairo` font for readability.
- **Engine Logic**:
  - **Static Strings**: Replaces tags marked with `data-translate` and `data-translate-tooltip` using a translation map in [script.js](file:///c:/Users/trookish/Dev/Web-Projects/Portfolio-Website/script.js).
  - **Dynamic Content**: Auto-matches content terms dynamically to keep HTML modifications clean.

### 🔊 Interactive Sound System & Audio Manager
A background sound engine enhances tactile feedback:
- **UI Feedback**: Preloaded sound buffers play retro clicks and hover tones across clickable items.
- **Game Audio**: Trigger-based sound playback for jumps, blocks, hits, victory countdowns, and game-over states.
- **Local Storage Preservation**: Stores user mute settings across tabs using a unified sound toggle.

### 🌓 Dual-Theme Engine (Light / Dark Mode)
Allows switching themes via a control button. The engine alters global CSS variables (colors, border intensities, shadows, and cards) instantly and persists the state using `localStorage`.

### 📂 Unified Project Showcase Gallery
Rather than redirecting users, selecting projects triggers an immersive overlay modal displaying:
- **Screenshot Sliders**: Multi-image galleries showcasing screenshots, and user interfaces (e.g. for *Syntax Strike* and *Dungeon Puzzle*).
- **Localized Captions**: Image descriptions are updated depending on active language settings.
- **Specs & Gallery Metadata**: Complete listings of tags, team credits, role mappings, and external repository links.

### 📄 Export to PDF Resume
Includes specialized `@media print` CSS configurations. Clicking the PDF Export button triggers standard browser print dialogs configured to render the portfolio sections as a clean, multi-page professional CV (removing UI controls, toggles, interactive buttons, and the hero background).

---

## 📁 Repository Structure

```
Portfolio-Website/
├── index.html                  # Main webpage markup (fully translated-ready structure)
├── styles.css                  # Custom, responsive CSS variables, layout designs & print configurations
├── script.js                  # Interface logic: translation engine, observers, and showcase modals
├── game.js                    # Custom Canvas-based game logic, physics formulas, and Predictive AI
├── CV/
│   └── Turki-Alshalaan-CV.pdf  # Downloadable professional CV document
├── Sounds/                     # Structured retro sound effect directories
│   ├── Game/                  # In-game audio (blocks, hits, window controls)
│   └── Normal/                # UI feedback audio (clicks, hovers)
└── images/                     # Pixelated graphic assets and screenshots
    ├── Achievement/           # Hackathon and event certificates
    ├── Background/            # Hero section backdrops
    ├── Certficates/           # Professional certificates (Udemy, IMSIU, Tuwaiq)
    ├── Game/                  # Game UI sprites and touch graphics
    ├── Logos/                 # Academic and workplace logos
    ├── PFP/                   # Portrait pictures
    └── Projects/              # In-game screen captures & gallery images
```

---

## 💻 Tech Stack & Performance Architecture

The site is built with a focus on high-fidelity visual presentation and low performance footprints:
- **Markup**: Semantic HTML5 tags (`<section>`, `<nav>`, `<article>`).
- **Styles**: Custom Vanilla CSS3 variables, Flexbox/Grid systems, responsive clamps, and `@keyframes` step animations. No Tailwind or Bootstrap dependencies.
- **Scripts**: ES6 Vanilla JavaScript. No bulky external frameworks (React, Vue, jQuery) are loaded, ensuring lightning-fast initial load speeds.
- **Interactivity Observers**: High-performance scroll tracking using `IntersectionObserver` to manage fade-in animations and sticky navigation links without page lag.

---

## 🚀 Setup & Local Execution

Since the project uses zero build steps or npm packages, running the website locally is simple:

### Option A: Static Run
1. Download or clone this repository:
   ```bash
   git clone https://github.com/trookish/turki-alshaalan-portfolio.git
   ```
2. Navigate into the directory and double-click `index.html` to open it in your web browser.

### Option B: Local Development Server (Recommended for Audio/Images)
Some browsers restrict playing local audio files or loading assets via the `file://` protocol. To ensure sound files play correctly, run a local development server:
- If you have **Node.js**:
  ```bash
  npx serve .
  ```
- If you have **Python**:
  ```bash
  python -m http.server 8000
  ```
Open the provided local port (e.g., `http://localhost:8000`) in your browser.

---

## 📄 License & Permissions

This repository is built as a personal portfolio showcasing academic and professional work. All text content, code implementations (specifically [game.js](file:///c:/Users/trookish/Dev/Web-Projects/Portfolio-Website/game.js)), and graphical elements are owned by **Turki Alshaalan**. You are free to view, fork, and inspect the code for educational and reference purposes.

---

## ✉️ Let's Connect!

- **Email**: [trookishgamedev@gmail.com](mailto:trookishgamedev@gmail.com)
- **LinkedIn**: [turki-alshaalan](https://linkedin.com/in/turki-alshaalan)
- **GitHub**: [trookish](https://github.com/trookish)
- **itch.io**: [trookish](https://trookish.itch.io)
- **Location**: Riyadh, Saudi Arabia
