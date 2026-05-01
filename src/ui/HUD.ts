import { MAX_LEVEL } from '../game/Economy.ts';

export class HUD {
  private levelEl: HTMLElement;
  private xpBarFill: HTMLElement;
  private xpLabel: HTMLElement;
  private damageEl: HTMLElement;
  private damageNumbers: HTMLElement;
  private levelUpToast: HTMLElement;
  private levelUpText: HTMLElement;
  private toastTimeout: ReturnType<typeof setTimeout> | null = null;
  private totalDamage: number = 0;

  constructor() {
    this.levelEl      = document.getElementById('level-value')!;
    this.xpBarFill    = document.getElementById('xp-bar-fill')!;
    this.xpLabel      = document.getElementById('xp-label')!;
    this.damageEl     = document.getElementById('damage-value')!;
    this.damageNumbers = document.getElementById('damage-numbers')!;
    this.levelUpToast = document.getElementById('achievement-toast')!;
    this.levelUpText  = document.getElementById('achievement-text')!;
  }

  updateLevel(level: number, progress: number, nextThreshold: number, totalDamage: number): void {
    this.levelEl.textContent = String(level);
    this.xpBarFill.style.width = `${Math.round(progress * 100)}%`;
    if (level >= MAX_LEVEL) {
      this.xpLabel.textContent = 'MAX';
    } else {
      this.xpLabel.textContent = `${Math.floor(totalDamage).toLocaleString()} / ${nextThreshold.toLocaleString()} DMG`;
    }
  }

  addDamage(amount: number): void {
    this.totalDamage += amount;
    this.damageEl.textContent = this.totalDamage.toLocaleString();
  }

  resetDamage(): void {
    this.totalDamage = 0;
    this.damageEl.textContent = '0';
  }

  spawnDamageNumber(x: number, y: number, amount: number, isCrit: boolean): void {
    const el = document.createElement('div');
    el.className = `damage-number ${isCrit ? 'critical' : 'normal'}`;
    el.textContent = isCrit ? `💥 ${amount.toLocaleString()}!` : `${amount.toLocaleString()}`;
    el.style.left = `${x + (Math.random() - 0.5) * 30}px`;
    el.style.top  = `${y}px`;
    this.damageNumbers.appendChild(el);
    setTimeout(() => el.remove(), 1200);
  }

  showLevelUp(level: number): void {
    if (this.toastTimeout) clearTimeout(this.toastTimeout);
    this.levelUpText.textContent = `🚀 Level Up! Rocket is now Lv.${level}`;
    this.levelUpToast.classList.remove('hidden');
    this.toastTimeout = setTimeout(() => {
      this.levelUpToast.classList.add('hidden');
    }, 3000);
  }
}
