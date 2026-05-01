import { Game } from './game/Game.ts';
import { HUD } from './ui/HUD.ts';
import type { ThemeName } from './types/index.ts';

const canvas = document.getElementById('game-canvas') as HTMLCanvasElement;
const game = new Game(canvas);
const hud  = new HUD();

// ── Wire callbacks ────────────────────────────────────────────────────────────
game.onLevelUpdate = (level, progress, nextThreshold, totalDamage) => {
  hud.updateLevel(level, progress, nextThreshold, totalDamage);
};
game.onDamageNumber = (x, y, amount, isCrit) => {
  hud.spawnDamageNumber(x, y, amount, isCrit);
  hud.addDamage(amount);
};
game.onLevelUp = (level) => hud.showLevelUp(level);

// ── Helper: canvas-relative coords ───────────────────────────────────────────
function canvasCoords(clientX: number, clientY: number) {
  const rect = canvas.getBoundingClientRect();
  return {
    x: (clientX - rect.left) * (canvas.width  / rect.width),
    y: (clientY - rect.top)  * (canvas.height / rect.height),
  };
}

// ── Mouse: aim + click to fire ────────────────────────────────────────────────
canvas.addEventListener('mousemove', (e) => {
  const { x, y } = canvasCoords(e.clientX, e.clientY);
  game.setMousePos(x, y);
});

canvas.addEventListener('click', (e) => {
  const { x, y } = canvasCoords(e.clientX, e.clientY);
  game.fireFromCannon(x, y);
});

// ── Touch: aim on move, fire on tap ──────────────────────────────────────────
let touchFired = false;

canvas.addEventListener('touchstart', (e) => {
  e.preventDefault();
  touchFired = false;
  const t = e.touches[0];
  const { x, y } = canvasCoords(t.clientX, t.clientY);
  game.setMousePos(x, y);
}, { passive: false });

canvas.addEventListener('touchmove', (e) => {
  e.preventDefault();
  const t = e.touches[0];
  const { x, y } = canvasCoords(t.clientX, t.clientY);
  game.setMousePos(x, y);
}, { passive: false });

canvas.addEventListener('touchend', (e) => {
  e.preventDefault();
  if (!touchFired) {
    touchFired = true;
    const t = e.changedTouches[0];
    const { x, y } = canvasCoords(t.clientX, t.clientY);
    game.fireFromCannon(x, y);
  }
}, { passive: false });

// ── Theme toggle (collapsible on mobile) ──────────────────────────────────────
const themeToggleBtn  = document.getElementById('theme-toggle-btn')!;
const themeSelector   = document.getElementById('theme-selector')!;

themeToggleBtn.addEventListener('click', () => {
  const isOpen = !themeSelector.classList.contains('hidden');
  themeSelector.classList.toggle('hidden', isOpen);
  themeToggleBtn.classList.toggle('open', !isOpen);
});

document.querySelectorAll('.theme-btn').forEach((btn) => {
  btn.addEventListener('click', () => {
    document.querySelectorAll('.theme-btn').forEach(b => b.classList.remove('active'));
    btn.classList.add('active');
    game.setTheme((btn as HTMLElement).dataset.theme as ThemeName);
    // Close theme panel on mobile after selection
    if (window.innerWidth < 640) {
      themeSelector.classList.add('hidden');
      themeToggleBtn.classList.remove('open');
    }
  });
});

// ── Upload image ──────────────────────────────────────────────────────────────
const uploadBtn   = document.getElementById('upload-btn')!;
const imageUpload = document.getElementById('image-upload') as HTMLInputElement;
uploadBtn.addEventListener('click', () => imageUpload.click());
imageUpload.addEventListener('change', () => {
  const file = imageUpload.files?.[0];
  if (!file) return;
  const reader = new FileReader();
  reader.onload = (e) => game.setDummyImage(e.target?.result as string);
  reader.readAsDataURL(file);
  imageUpload.value = '';
});

// ── Rename modal ──────────────────────────────────────────────────────────────
const renameBtn     = document.getElementById('rename-btn')!;
const renameModal   = document.getElementById('rename-modal')!;
const renameInput   = document.getElementById('rename-input') as HTMLInputElement;
const renameConfirm = document.getElementById('rename-confirm')!;
const renameCancel  = document.getElementById('rename-cancel')!;

renameBtn.addEventListener('click', () => {
  renameInput.value = '';
  renameModal.classList.remove('hidden');
  setTimeout(() => renameInput.focus(), 50);
});
renameConfirm.addEventListener('click', () => {
  const name = renameInput.value.trim();
  if (name) game.setDummyName(name);
  renameModal.classList.add('hidden');
});
renameCancel.addEventListener('click', () => renameModal.classList.add('hidden'));
renameInput.addEventListener('keydown', (e) => {
  if (e.key === 'Enter')  renameConfirm.click();
  if (e.key === 'Escape') renameCancel.click();
});

// ── Reset ─────────────────────────────────────────────────────────────────────
document.getElementById('reset-btn')!.addEventListener('click', () => {
  if (confirm('Reset everything? (position, level and damage will be reset)')) {
    game.fullReset();
    hud.resetDamage();
  }
});

// ── Start ─────────────────────────────────────────────────────────────────────
game.start();
