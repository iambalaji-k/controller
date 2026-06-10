# Controller Mastery 🎮

**Controller Mastery** is a browser-based interactive training application designed to help keyboard-and-mouse PC gamers transition to controller gaming. By combining gaming-inspired training drills, real-time hardware diagnostics, and cognitive science methodologies, it builds instinctive muscle memory, reaction speeds, and analog precision.

---

## 🚀 Key Learning Paradigms

### 1. Gamepad Diagnostics & Tester Mode
* **Giant Hero Controller**: A high-fidelity, interactive Xbox-style SVG overlay that maps inputs, button presses, and directional stick deflections in real-time.
* **Driver-Agnostic Input Fallback**: Leverages a hybrid check combining `btn.pressed` with analog value thresholds (`value > 0.5` for digital face buttons/bumpers, `value > 0.15` for triggers) to guarantee input registration on Bluetooth controller drivers that fail to report standard pressed signals.
* **Realistic Color Mapping**: Uses authentic Xbox standard layouts (A = Green, B = Red, X = Blue, Y = Yellow) when using the standard skin to accelerate layout recognition.
* **Analog Stick Crosshairs**: Live circular visualizers mapping coordinate tilts (LS X/Y, RS X/Y) with a moving target dot.
* **Trigger Depth Indicators**: Live ASCII bar fills (e.g., `LT ████████░░ 80%`) showing exact analog pressure percentages.
* **Input Signal Log**: A scrolling, timestamped buffer capturing raw input transitions.
* **Haptic Rumble Actuator test**: Send testing vibration pulses (Soft, Medium, Sharp, Strong) to connected controllers.

### 2. Guided Learning Pathway (10 progressive Levels)
Rather than overwhelming a beginner, the app locks training modules behind a guided progression tree:
* **Level 1**: Face Buttons (A, B, X, Y)
* **Level 2**: Bumpers (LB, RB)
* **Level 3**: Triggers (LT, RT)
* **Level 4**: Directional Pad (D-Pad)
* **Level 5**: Analog Sticks (Aim & Movement)
* **Level 6**: Stick Clicks (L3, R3)
* **Level 7**: Mixed Input drills
* **Level 8**: Advanced Combat Inputs
* **Level 9**: Blind Controller Mastery (Hidden controller overlays)
* **Level 10**: Real Game Readiness Certifications

### 3. Spaced Repetition Scheduling
Based on memory retention science, buttons are tracked and scheduled for review at progressive intervals (1 day, 3 days, 7 days, 14 days, 30 days). Buttons that haven't been practiced recently are dynamically re-introduced into training routines.

### 4. Weakness Detection Engine
Monitors and logs input errors, slowest reaction times, and failed combo segments. It translates raw telemetry into actionable tactical advice, such as:
> *"You frequently confuse LB and LT."*
> *"Your reaction time to Y is 32% slower than average."*

### 5. Personalized Daily Workouts
Generates custom workouts of **5, 10, or 15 minutes** that automatically assemble drills targeting the user's lowest mastery and highest mistake buttons.

### 6. 14-Day Transition Program
A structured, day-by-day curriculum designed to ease keyboard-and-mouse gamers into game layouts:
* **Day 1–3**: Face button recall and baseline bumper drills.
* **Day 4–7**: Triggers integration, stick centering, and basic coordination.
* **Day 8–10**: Blind mapping, audio cues, and stick click mastery.
* **Day 11–14**: Full mixed AAA combat simulations.

### 7. AAA Combat Readiness Certifications
Interactive gameplay exams that simulate actions in top-tier titles, graded from **F** to **S**:
* 🛡️ **Batman Combat Exam**: Counter, Strike, and Dodge chain sequences.
* 🏎️ **GTA V Driving Exam**: Steering precision and acceleration control.
* ⚔️ **Elden Ring Combat Exam**: Shield blocks, parry frames, and attack chains.
* 🏎️ **Forza Driving Exam**: Threshold braking and analog steering stability.

### 8. Post-Session Telemetry Review
Presents detailed analytics modals after every single drill, comparing performance trends to historical averages (accuracy differentials, speed improvements, strongest/weakest inputs, XP gained, and training recommendations).

### 9. Motivating Progression Systems
* **Daily/Weekly Streaks**: Encourages daily calibration practice.
* **Controller Skins**: Unlockable visual skins including **Standard**, **Carbon Fiber** (Red accents), **Gold Luxury** (Golden glows), and **Cyberpunk Neon** (Cyan/Pink outlines).
* **Analytics Heatmaps**: Overlay error densities, reaction speeds, or practice counts directly onto the controller SVG.

---

## 🛠️ Architecture & Performance Optimizations

### Technology Stack
* **Vite + React 18/19** (Ultra-fast Hot Module Replacement & builds)
* **TypeScript** (Strong type-safety and interface contracts)
* **Tailwind CSS** (Cyberpunk/Dark Mode responsive layout utility styling)
* **Lucide Icons** (Premium interface telemetry icons)

### Web Gamepad API Telemetry & Optimization
* **Continuous High-Frequency Polling**: Uses a lightweight `requestAnimationFrame` loop (60 FPS) to poll active gamepads immediately on component mount, avoiding browser event listener race conditions or missing initial handshake states.
* **Component-Safe Cleanup**: Ensures polling loops are canceled immediately when hooks/views unmount to prevent leaks in sandbox segments.

### Route-Splitting & Lazy Loading
To achieve a blazing-fast initial page load, the 11 sandbox mini-games, the adventure campaign, and the 4 structured subsystems are **lazy-loaded** (`React.lazy` + `Suspense`). 

This code-splitting keeps the initial JS bundle size extremely low:
* **Initial main JS bundle**: **451.77 kB** (**128.14 kB** gzipped)
* **Total bundle budget**: Well below the 500 KB gzipped threshold, maintaining a consistent **60 FPS** on mid-range and mobile devices.

---

## 🎮 Get Started

1. **Clone the Repository**:
   ```bash
   git clone <repo-url>
   cd xboxcontroller
   ```
2. **Install Dependencies**:
   ```bash
   npm install
   ```
3. **Launch Local Development Server**:
   ```bash
   npm run dev
   ```
4. **Build Production Assets**:
   ```bash
   npm run build
   ```
