# 🎯 Target Dummy

A browser-based rocket shooting simulator. Shoot a ragdoll dummy, earn money, and upgrade your rocket.

## Quick Start

```bash
npm install
npm run dev
```

Then open [http://localhost:5173](http://localhost:5173) in your browser.

## How to Play

- **Click anywhere** on the screen to fire a rocket toward that point
- Rockets deal damage to the ragdoll dummy — earn 💰 money based on damage dealt
- **Headshots** deal 2.5x damage and trigger slow-motion (if upgraded)
- Build up a **combo** by hitting rapidly for a money multiplier
- Spend money in the **🔧 Shop** to upgrade your rocket

## Controls

| Button | Action |
|---|---|
| Click canvas | Fire rocket |
| 📷 Upload Image | Put a face on the dummy |
| ✏️ Rename | Change the dummy's name (max 30 chars) |
| 🔧 Shop | Open upgrade shop |
| 🔄 Reset | Reset dummy position |
| Theme buttons | Switch rocket particle theme |

## Upgrades

| Upgrade | Effect |
|---|---|
| 🚀 Rocket Damage | +20 damage per level |
| 💥 Explosion Radius | +15 radius per level |
| ⚡ Rocket Speed | +2 speed per level |
| 💰 Money Multiplier | +0.5x earnings per level |
| 🎯 Multi-Rocket | Fire 2, 3, or 5 rockets at once |
| 🤖 Auto-Fire | Rockets fire automatically |
| ⏱️ Slow Motion | Dramatic slow-mo on critical hits |
| 🔀 Bounce Rockets | Rockets ricochet off walls |

## Themes

🌸 Sakura · 🔥 Fire · ❄️ Ice · ⚡ Electric · 🌌 Galaxy · ☠️ Toxic

## Tech Stack

- **TypeScript** + **Vite**
- **Matter.js** — ragdoll physics
- **HTML5 Canvas** — rendering

## Build for Production

```bash
npm run build
npm run preview
```
