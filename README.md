# 🍽️ DineView AR - Interactive WebAR Restaurant Menu Preview

**Module:** INTE 42312 - Virtual and Augmented Reality  
**Assessment:** Individual Assignment (25% Continuous Assessment)  
**Student:** M.A.C.S.S. Jayaweera (IM/2021/100)  
**Faculty:** Faculty of Science, University of Kelaniya  

---

## 📖 Project Overview

**DineView AR** is a mobile-first Web Augmented Reality (WebAR) restaurant menu application designed to bridge the gap between traditional static menus and real customer expectations. Using interactive 3D modeling, marker-based camera tracking, and markerless surface hit-testing, customers can inspect authentic chef dishes from any angle, customize portion sizes, calculate live pricing (LKR) and calories, and project true-to-scale 3D food directly onto physical dining tables.

---

## ✨ Key Features & Capabilities

1. **Responsive 3D Digital Menu (`index.html`)**:
   - Filter dishes by category (*Artisan Pizzas*, *Asian Bowls*, *Chef's Specials*).
   - Live 3D thumbnail previews with auto-rotate and touch inspection.
   - Comprehensive nutritional, caloric, and allergen safety indicators.
   - Diagnostic WebXR and mobile capability detection.

2. **Interactive 3D Studio & Configurator (`dish.html`)**:
   - 360° Touch rotation, pinch-to-zoom, pan, camera reset, and lighting presets.
   - Dynamic 3D inspection hotspots highlighting artisan ingredients and crust textures.
   - **"Build My Plate" Advanced Multi-Step Interaction**:
     - Portion configuration (Small, Regular, Large) with real-time visual scale and dimension indicators.
     - Add-on customizer (e.g., Double Mozzarella, Truffle Drizzle, Onsen Egg).
     - Live dynamic price (in LKR) and calorie ticker.
     - State persistence across pages via central state manager.

3. **Marker-Based AR Tracking (`marker-ar.html`)**:
   - Built on **A-Frame 1.4.2** and **AR.js 3.4.5**.
   - Continuous 60fps tracking over standard **Hiro Markers** or custom table patterns.
   - In-AR Head-Up Display (HUD): tracking status badge (*Scanning*, *Locked*, *Lost*), targeting crosshairs, live pricing, and 45° model rotation controls.
   - In-AR dish switcher allowing users to switch models without resetting camera stream.
   - Built-in on-screen Hiro marker popup for instantaneous testing on a second screen.

4. **Markerless WebXR Table Placement**:
   - Powered by Google **`<model-viewer>`** with WebXR horizontal plane hit-testing.
   - Fallback cascading support for Android Scene Viewer and iOS AR Quick Look.
   - True 1:1 metric table placement so dishes appear at exact physical culinary sizes.

5. **Optimized 3D Asset Pipeline**:
   - Features the 3 given food models:
     - 🍕 *Artisan Margherita Rustica* (`pizza.glb`)
     - 🍕 *Ballerina Gourmet Truffle Pizza* (`pizza_ballerina.glb`)
     - 🍜 *Tokyo Yaki Udon Sizzle Bowl* (`yakiudon.glb`)
   - Optimized using `@gltf-transform/cli` with mesh welding, scene graph pruning, and geometry simplification (up to 33.9% file size reduction).

---

## 🛠️ Technology Stack

| Layer | Tool / Technology | Purpose |
| :--- | :--- | :--- |
| **Frontend Tooling** | Vite + Vanilla ES Modules | Fast local development, hot reloading, and optimized static bundling. |
| **Styling & UI** | Vanilla CSS3 (Custom Design System) | Glassmorphic luxury culinary theme, dark mode, responsive fluid grid, ≥44px touch targets. |
| **3D & Markerless AR** | `@google/model-viewer` | WebGL PBR rendering, camera controls, WebXR surface hit-testing. |
| **Marker Tracking AR** | A-Frame + AR.js | Continuous computer vision tracking over Hiro markers. |
| **3D Asset Format** | glTF 2.0 Binary (`.glb`) | Single-file embedded mesh, PBR materials, and textures. |
| **Asset Optimization** | `@gltf-transform/cli` | Mesh welding, vertex pruning, geometry simplification, and validation. |

---

## 🚀 Quick Start & Installation

### 1. Prerequisites
Ensure **Node.js** (v18+) is installed on your computer.

### 2. Install Dependencies
```bash
npm install
```

### 3. Run Local Development Server
```bash
npm run dev
```
Vite will start the server at:
- Local: `http://localhost:5173/`
- Network: `http://<your-lan-ip>:5173/` (accessible from any mobile phone on the same Wi-Fi network)

### 4. Build for Production
```bash
npm run build
```
Production output will be generated in the `dist/` directory.

---

## 🎯 How to Test Marker AR (Hiro Marker)

1. Open the application on your mobile device (or desktop browser).
2. Tap the **🎯 Marker Guide** button in the top navigation or in the AR HUD to display the **Hiro Marker** on screen.
3. Alternatively, view or print [`public/markers/hiro.svg`](file:///public/markers/hiro.svg).
4. Launch **View on Marker** from any dish page.
5. Point your camera at the marker. The 3D dish will lock into place above the marker with smooth 60fps tracking.

---

## 📁 Repository Structure

```text
dineview-ar/
├── index.html                   # Main digital menu & 3D preview cards
├── dish.html                    # 3D Studio & "Build My Plate" Configurator
├── marker-ar.html               # Full-screen A-Frame + AR.js Hiro tracking
├── about.html                   # Academic documentation, credits & device matrix
├── package.json                 # Project dependencies and npm scripts
├── vite.config.js               # Multi-page build & network host config
├── src/
│   ├── main.js                  # Menu renderer, filtering, and diagnostics
│   ├── dish-viewer.js           # 3D studio controls, hotspots, and AR launchers
│   ├── configurator-state.js    # State manager for portion scaling & pricing
│   ├── marker-ar.js             # AR.js lifecycle, HUD controls, and rotation
│   └── styles.css               # Glassmorphic dark design system
├── public/
│   ├── data/
│   │   └── menu.json            # Structured dish, pricing, and allergen data
│   ├── models/
│   │   ├── original/            # Raw uncompressed GLB files
│   │   └── optimized/           # Mobile-optimized GLB models
│   ├── markers/
│   │   └── hiro.svg             # Standard Hiro marker pattern
│   └── images/                  # UI icons and thumbnails
├── docs/
│   ├── ASSET_CREDITS.md         # Full asset attribution and optimization benchmarks
│   └── TESTING_EVALUATION.md    # Device matrix, usability tests, and challenge log
└── README.md                    # Submission and documentation guide
```

---

## 📊 Evaluation & Verification Summary

Comprehensive evaluation reports are provided in the `docs/` folder:
- **`docs/ASSET_CREDITS.md`**: Asset licensing, polygon counts, before/after file sizes.
- **`docs/TESTING_EVALUATION.md`**:
  - Device compatibility matrix (Android Chrome, iOS Safari, Desktop).
  - 5-User task-based usability study (100% task success rate, 4.8/5.0 satisfaction).
  - Dated Challenge & Troubleshooting Log resolving model origin centering, WebXR security context, and AR.js smoothing.

---

## 📄 License & Academic Declaration

This project was developed by **M.A.C.S.S. Jayaweera (IM/2021/100)** as an individual assessment submission for **INTE 42312 - Virtual and Augmented Reality**, Faculty of Science, University of Kelaniya.
