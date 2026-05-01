// Auto-leveling system — no money, no shop.
// Every N damage dealt, the rocket automatically levels up.

export interface RocketStats {
  level: number;
  damage: number;
  radius: number;
  speed: number;
  rocketCount: number;
  knockback: number;
}

// Damage thresholds to reach each level (cumulative total damage)
const LEVEL_THRESHOLDS = [
  0,       // Lv 1  — start
  500,     // Lv 2
  1500,    // Lv 3
  3500,    // Lv 4
  7000,    // Lv 5
  13000,   // Lv 6
  22000,   // Lv 7
  35000,   // Lv 8
  55000,   // Lv 9
  80000,   // Lv 10
];

export const MAX_LEVEL = LEVEL_THRESHOLDS.length;

export class Economy {
  totalDamage: number = 0;
  totalShots: number = 0;
  criticalHits: number = 0;
  sessionTime: number = 0;

  // Fired when a level-up happens
  onLevelUp?: (level: number, stats: RocketStats) => void;

  private _level: number = 1;

  constructor() {
    this.load();
  }

  get level(): number { return this._level; }

  get stats(): RocketStats {
    const l = this._level;
    return {
      level:       l,
      damage:      20 + l * 15,           // 35 → 170
      radius:      55 + l * 8,            // 63 → 135
      speed:       9  + l * 1.2,          // 10.2 → 21
      rocketCount: l >= 8 ? 3 : l >= 5 ? 2 : 1,
      knockback:   0.4 + l * 0.08,        // 0.48 → 1.2 — visible but not off-screen
    };
  }

  // Derived getters used by Game.ts
  get rocketDamage():    number  { return this.stats.damage; }
  get explosionRadius(): number  { return this.stats.radius; }
  get rocketSpeed():     number  { return this.stats.speed; }
  get rocketCount():     number  { return this.stats.rocketCount; }
  get knockbackForce():  number  { return this.stats.knockback; }
  get bounceCount():     number  { return 0; }
  get autoFireInterval():number | null { return null; }
  get hasSlowMo():       boolean { return this._level >= 6; }

  /** Progress toward next level, 0–1 */
  get levelProgress(): number {
    if (this._level >= MAX_LEVEL) return 1;
    const from = LEVEL_THRESHOLDS[this._level - 1];
    const to   = LEVEL_THRESHOLDS[this._level];
    return Math.min(1, (this.totalDamage - from) / (to - from));
  }

  /** Next level threshold (total damage needed) */
  get nextThreshold(): number {
    if (this._level >= MAX_LEVEL) return LEVEL_THRESHOLDS[MAX_LEVEL - 1];
    return LEVEL_THRESHOLDS[this._level];
  }

  addDamage(damage: number, isCritical: boolean): void {
    this.totalDamage += damage;
    if (isCritical) this.criticalHits++;

    // Check for level-up
    while (
      this._level < MAX_LEVEL &&
      this.totalDamage >= LEVEL_THRESHOLDS[this._level]
    ) {
      this._level++;
      this.onLevelUp?.(this._level, this.stats);
    }

    this.save();
  }

  tick(dt: number): void {
    this.sessionTime += dt;
  }

  private save(): void {
    try {
      localStorage.setItem('td_damage',  String(this.totalDamage));
      localStorage.setItem('td_level',   String(this._level));
      localStorage.setItem('td_shots',   String(this.totalShots));
      localStorage.setItem('td_crits',   String(this.criticalHits));
    } catch (_) { /* ignore */ }
  }

  private load(): void {
    try {
      const d = localStorage.getItem('td_damage');
      if (d) this.totalDamage = parseFloat(d) || 0;
      const l = localStorage.getItem('td_level');
      if (l) this._level = Math.max(1, Math.min(MAX_LEVEL, parseInt(l) || 1));
      const s = localStorage.getItem('td_shots');
      if (s) this.totalShots = parseInt(s) || 0;
      const c = localStorage.getItem('td_crits');
      if (c) this.criticalHits = parseInt(c) || 0;
    } catch (_) { /* ignore */ }
  }

  reset(): void {
    this.totalDamage = 0;
    this.totalShots  = 0;
    this.criticalHits = 0;
    this._level = 1;
    this.save();
  }
}
