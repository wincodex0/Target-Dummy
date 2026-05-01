import type { ThemeName } from '../types/index.ts';
import { ParticleSystem } from './ParticleSystem.ts';

const THEME_ROCKET_COLORS: Record<ThemeName, { body: string; glow: string }> = {
  sakura:   { body: '#ff69b4', glow: '#ffb6c1' },
  fire:     { body: '#ff4500', glow: '#ffa500' },
  ice:      { body: '#00bfff', glow: '#87ceeb' },
  electric: { body: '#ffff00', glow: '#ffffff' },
  galaxy:   { body: '#9b59b6', glow: '#e74c3c' },
  toxic:    { body: '#39ff14', glow: '#7fff00' },
};

export interface RocketInstance {
  x: number;
  y: number;
  vx: number;
  vy: number;
  active: boolean;
  bouncesLeft: number;
  trail: Array<{ x: number; y: number; alpha: number }>;
}

export class RocketManager {
  rockets: RocketInstance[] = [];
  private particles: ParticleSystem;

  constructor(particles: ParticleSystem) {
    this.particles = particles;
  }

  fire(
    fromX: number,
    fromY: number,
    toX: number,
    toY: number,
    speed: number,
    count: number,
    bounces: number,
    theme: ThemeName
  ): void {
    const spread = count > 1 ? 0.15 : 0;
    for (let i = 0; i < count; i++) {
      const angle = Math.atan2(toY - fromY, toX - fromX) + (i - (count - 1) / 2) * spread;
      this.rockets.push({
        x: fromX,
        y: fromY,
        vx: Math.cos(angle) * speed,
        vy: Math.sin(angle) * speed,
        active: true,
        bouncesLeft: bounces,
        trail: [],
      });
    }
  }

  update(
    dt: number,
    canvasW: number,
    canvasH: number,
    theme: ThemeName,
    onHit: (x: number, y: number) => void
  ): void {
    for (const rocket of this.rockets) {
      if (!rocket.active) continue;

      // Store trail
      rocket.trail.push({ x: rocket.x, y: rocket.y, alpha: 1 });
      if (rocket.trail.length > 18) rocket.trail.shift();
      rocket.trail.forEach((t, i) => { t.alpha = i / rocket.trail.length; });

      rocket.x += rocket.vx;
      rocket.y += rocket.vy;

      // Spawn trail particles
      this.particles.spawnTrail(rocket.x, rocket.y, rocket.vx, rocket.vy, theme);

      // Bounce off walls
      if (rocket.x < 0 || rocket.x > canvasW) {
        if (rocket.bouncesLeft > 0) {
          rocket.vx *= -1;
          rocket.bouncesLeft--;
        } else {
          rocket.active = false;
          onHit(rocket.x, rocket.y);
        }
      }
      if (rocket.y < 0 || rocket.y > canvasH) {
        if (rocket.bouncesLeft > 0) {
          rocket.vy *= -1;
          rocket.bouncesLeft--;
        } else {
          rocket.active = false;
          onHit(rocket.x, rocket.y);
        }
      }
    }

    // Remove inactive
    this.rockets = this.rockets.filter(r => r.active);
  }

  checkHit(targetX: number, targetY: number, hitRadius: number, onHit: (x: number, y: number) => void): void {
    for (const rocket of this.rockets) {
      if (!rocket.active) continue;
      const dx = rocket.x - targetX;
      const dy = rocket.y - targetY;
      if (Math.sqrt(dx * dx + dy * dy) < hitRadius) {
        rocket.active = false;
        onHit(rocket.x, rocket.y);
      }
    }
    this.rockets = this.rockets.filter(r => r.active);
  }

  draw(ctx: CanvasRenderingContext2D, theme: ThemeName): void {
    const colors = THEME_ROCKET_COLORS[theme];

    for (const rocket of this.rockets) {
      if (!rocket.active) continue;

      // Draw trail
      for (let i = 0; i < rocket.trail.length - 1; i++) {
        const t = rocket.trail[i];
        ctx.save();
        ctx.globalAlpha = t.alpha * 0.5;
        ctx.strokeStyle = colors.glow;
        ctx.lineWidth = 3 * t.alpha;
        ctx.shadowColor = colors.glow;
        ctx.shadowBlur = 8;
        ctx.beginPath();
        ctx.moveTo(t.x, t.y);
        const next = rocket.trail[i + 1];
        ctx.lineTo(next.x, next.y);
        ctx.stroke();
        ctx.restore();
      }

      // Draw rocket body
      const angle = Math.atan2(rocket.vy, rocket.vx);
      ctx.save();
      ctx.translate(rocket.x, rocket.y);
      ctx.rotate(angle);

      // Glow
      ctx.shadowColor = colors.glow;
      ctx.shadowBlur = 20;

      // Body
      ctx.fillStyle = colors.body;
      ctx.beginPath();
      ctx.moveTo(14, 0);
      ctx.lineTo(-8, -5);
      ctx.lineTo(-8, 5);
      ctx.closePath();
      ctx.fill();

      // Nose cone
      ctx.fillStyle = '#ffffff';
      ctx.beginPath();
      ctx.moveTo(14, 0);
      ctx.lineTo(8, -3);
      ctx.lineTo(8, 3);
      ctx.closePath();
      ctx.fill();

      // Fins
      ctx.fillStyle = colors.glow;
      ctx.beginPath();
      ctx.moveTo(-8, 0);
      ctx.lineTo(-14, -8);
      ctx.lineTo(-10, 0);
      ctx.closePath();
      ctx.fill();
      ctx.beginPath();
      ctx.moveTo(-8, 0);
      ctx.lineTo(-14, 8);
      ctx.lineTo(-10, 0);
      ctx.closePath();
      ctx.fill();

      ctx.shadowBlur = 0;
      ctx.restore();
    }
  }
}
