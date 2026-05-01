export type ThemeName = 'sakura' | 'fire' | 'ice' | 'electric' | 'galaxy' | 'toxic';

export interface Particle {
  x: number;
  y: number;
  vx: number;
  vy: number;
  life: number;       // 0–1, decreases over time
  maxLife: number;
  size: number;
  color: string;
  rotation: number;
  rotationSpeed: number;
  gravity: number;
  type: 'petal' | 'spark' | 'shard' | 'star' | 'bubble' | 'ember' | 'ring';
}

export interface RocketData {
  x: number;
  y: number;
  vx: number;
  vy: number;
  active: boolean;
  trail: Array<{ x: number; y: number; alpha: number }>;
}

export interface UpgradeDefinition {
  id: string;
  name: string;
  icon: string;
  description: string;
  levels: number[];   // cost per level
  effect: string;     // description of what each level does
}

export interface UpgradeState {
  [id: string]: number; // current level (0 = not bought)
}

export interface Achievement {
  id: string;
  name: string;
  description: string;
  unlocked: boolean;
  check: (stats: GameStats) => boolean;
}

export interface GameStats {
  totalDamage: number;
  totalShots: number;
  totalMoney: number;
  criticalHits: number;
  maxCombo: number;
  sessionTime: number;
}

export interface DummyConfig {
  name: string;
  imageDataUrl: string | null;
  bodyColor: string;
}
