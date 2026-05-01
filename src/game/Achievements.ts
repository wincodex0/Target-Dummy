import type { Achievement, GameStats } from '../types/index.ts';

export const ACHIEVEMENTS: Achievement[] = [
  {
    id: 'first_blood',
    name: '🩸 First Blood',
    description: 'Deal your first damage',
    unlocked: false,
    check: (s) => s.totalDamage > 0,
  },
  {
    id: 'combo_king',
    name: '🔥 Combo King',
    description: 'Reach a x3 combo',
    unlocked: false,
    check: (s) => s.maxCombo >= 3,
  },
  {
    id: 'millionaire',
    name: '💰 Millionaire',
    description: 'Earn $1,000,000 total',
    unlocked: false,
    check: (s) => s.totalMoney >= 1_000_000,
  },
  {
    id: 'sharpshooter',
    name: '🎯 Sharpshooter',
    description: 'Land 10 critical hits',
    unlocked: false,
    check: (s) => s.criticalHits >= 10,
  },
  {
    id: 'destroyer',
    name: '💥 Destroyer',
    description: 'Deal 10,000 total damage',
    unlocked: false,
    check: (s) => s.totalDamage >= 10_000,
  },
  {
    id: 'trigger_happy',
    name: '🚀 Trigger Happy',
    description: 'Fire 100 rockets',
    unlocked: false,
    check: (s) => s.totalShots >= 100,
  },
  {
    id: 'max_combo',
    name: '⚡ Unstoppable',
    description: 'Reach a x5 combo',
    unlocked: false,
    check: (s) => s.maxCombo >= 5,
  },
  {
    id: 'big_spender',
    name: '🛒 Big Spender',
    description: 'Spend $5,000 on upgrades',
    unlocked: false,
    check: (s) => s.totalMoney >= 5_000,
  },
];

export class AchievementSystem {
  achievements: Achievement[];
  private onUnlock: (a: Achievement) => void;

  constructor(onUnlock: (a: Achievement) => void) {
    this.achievements = ACHIEVEMENTS.map(a => ({ ...a }));
    this.onUnlock = onUnlock;
    this.load();
  }

  check(stats: GameStats): void {
    for (const achievement of this.achievements) {
      if (!achievement.unlocked && achievement.check(stats)) {
        achievement.unlocked = true;
        this.onUnlock(achievement);
        this.save();
      }
    }
  }

  private save(): void {
    try {
      const unlocked = this.achievements.filter(a => a.unlocked).map(a => a.id);
      localStorage.setItem('td_achievements', JSON.stringify(unlocked));
    } catch (_) { /* ignore */ }
  }

  private load(): void {
    try {
      const data = localStorage.getItem('td_achievements');
      if (data) {
        const unlocked: string[] = JSON.parse(data);
        for (const a of this.achievements) {
          if (unlocked.includes(a.id)) a.unlocked = true;
        }
      }
    } catch (_) { /* ignore */ }
  }
}
