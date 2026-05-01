# 🎯 Target Dummy

A browser-based ragdoll shooting simulator. Fire rockets at a dummy, watch it fly, and level up your rocket automatically as you deal more damage.

## Quick Start

```bash
npm install
npm run dev
```

Open [http://localhost:5173](http://localhost:5173) in your browser.

## How to Play

- **Click / Tap** anywhere on the screen to fire a rocket toward that point
- The cannon tracks your mouse/finger and aims automatically
- Rockets deal damage — earn XP and level up automatically
- The dummy flies on impact and **stands back up** at wherever it landed
- Hit it again before it stands up to keep the ragdoll going

## Controls

| Button | Action |
|---|---|
| Click / Tap canvas | Fire rocket |
| 📷 | Upload a photo onto the dummy's face |
| ✏️ Rename | Change the dummy's name (max 30 chars) |
| 🎨 Theme | Switch rocket particle theme |
| 🔄 Reset | Reset everything — position, level, damage |

## Auto-Level System

No shop, no currency. Just shoot. Every time your cumulative damage hits a threshold, the rocket automatically levels up (Lv.1–10).

| Level | Damage | Radius | Speed | Rockets |
|---|---|---|---|---|
| 1 | 35 | 63 | 10.2 | 1 |
| 5 | 95 | 95 | 15 | 2 |
| 8 | 140 | 119 | 18.6 | 3 |
| 10 | 170 | 135 | 21 | 3 |

Slow-motion on critical hits unlocks at **Lv.6**.

## Themes

🌸 Sakura · 🔥 Fire · ❄️ Ice · ⚡ Electric · 🌌 Galaxy · ☠️ Toxic

Each theme changes the rocket trail particles, explosion color, and cannon barrel color.

## Dummy Behavior

- Starts **standing upright** — body parts are static until first hit
- On hit → **ragdoll phase** (1.4s of free physics — flies, tumbles, bounces off walls)
- After ragdoll → **stands back up** at its current location with a smooth ease-out animation
- **Does not go through walls or floor** — world boundaries are solid and update on window resize
- Speech bubble appears every 10 seconds when hit, visible for 3 seconds

## Mobile

Fully touch-responsive:
- Tap to fire, drag to aim
- Theme buttons collapse into a toggle
- HUD scales down on small screens
- Prevents browser zoom/scroll during gameplay
- Works as a PWA (add to home screen on iOS/Android)

## Tech Stack

- **TypeScript** + **Vite**
- **Matter.js** — ragdoll physics
- **HTML5 Canvas** — all rendering

## Project Structure

```
src/
├── game/
│   ├── Game.ts          # Main loop, world setup, collision, level callbacks
│   ├── Dummy.ts         # Ragdoll — idle/ragdoll/standup state machine
│   ├── Cannon.ts        # Cannon rendering, aim tracking, muzzle flash
│   ├── Rocket.ts        # Rocket movement, trail, hit detection
│   ├── Explosion.ts     # Blast radius visual
│   ├── ParticleSystem.ts# All particle effects (petals, sparks, shards…)
│   └── Economy.ts       # Auto-level system, damage thresholds, rocket stats
├── ui/
│   └── HUD.ts           # Level display, XP bar, damage numbers, toasts
├── main.ts              # Entry point, mouse/touch events, UI wiring
└── style.css            # Responsive layout, mobile-first CSS
```

## Build & Deploy

```bash
npm run build    # outputs to /dist
npm run preview  # preview the production build locally
```

Deploys to Vercel automatically on push to `main` via `vercel.json`.
