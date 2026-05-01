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

game.onLevelUp = (level) => {
  hud.showLevelUp(level);
};

// ── Canvas click → fire ───────────────────────────────────────────────────────
canvas.addEventListener('click', (e) => {
  const rect = canvas.getBoundingClientRect();
  game.fireFromCannon(e.clientX - rect.left, e.clientY - rect.top);
});

// ── Theme buttons ─────────────────────────────────────────────────────────────
document.querySelectorAll('.theme-btn').forEach((btn) => {
  btn.addEventListener('click', () => {
    document.querySelectorAll('.theme-btn').forEach(b => b.classList.remove('active'));
    btn.classList.add('active');
    game.setTheme((btn as HTMLElement).dataset.theme as ThemeName);
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
