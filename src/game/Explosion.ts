import type { ThemeName } from '../types/index.ts';
import { ParticleSystem } from './ParticleSystem.ts';

interface ActiveExplosion {
  x: number;
  y: number;
  radius: number;
  maxRadius: number;
  life: number;
  theme: ThemeName;
}

export class ExplosionManager {
  private explosions: ActiveExplosion[] = [];
  private particles: ParticleSystem;

  constructor(particles: ParticleSystem) {
    this.particles = particles;
  }

  trigger(x: number, y: number, radius: number, theme: ThemeName): void {
    this.explosions.push({ x, y, radius: 0, maxRadius: radius, life: 1, theme });
    this.particles.spawnExplosion(x, y, radius, theme);
  }

  update(dt: number): void {
    for (let i = this.explosions.length - 1; i >= 0; i--) {
      const e = this.explosions[i];
      e.life -= dt * 3;
      e.radius = e.maxRadius * (1 - e.life);
      if (e.life <= 0) this.explosions.splice(i, 1);
    }
  }

  draw(ctx: CanvasRenderingContext2D): void {
    for (const e of this.explosions) {
      const alpha = e.life * 0.4;
      ctx.save();
      ctx.globalAlpha = alpha;

      const grad = ctx.createRadialGradient(e.x, e.y, 0, e.x, e.y, e.radius);
      const innerColor = this.getInnerColor(e.theme);
      const outerColor = this.getOuterColor(e.theme);
      grad.addColorStop(0, innerColor);
      grad.addColorStop(0.5, outerColor);
      grad.addColorStop(1, 'transparent');

      ctx.fillStyle = grad;
      ctx.beginPath();
      ctx.arc(e.x, e.y, e.radius, 0, Math.PI * 2);
      ctx.fill();

      ctx.restore();
    }
  }

  private getInnerColor(theme: ThemeName): string {
    switch (theme) {
      case 'sakura':   return 'rgba(255,255,255,0.9)';
      case 'fire':     return 'rgba(255,255,200,0.9)';
      case 'ice':      return 'rgba(200,240,255,0.9)';
      case 'electric': return 'rgba(255,255,255,0.95)';
      case 'galaxy':   return 'rgba(255,200,255,0.9)';
      case 'toxic':    return 'rgba(200,255,200,0.9)';
    }
  }

  private getOuterColor(theme: ThemeName): string {
    switch (theme) {
      case 'sakura':   return 'rgba(255,105,180,0.6)';
      case 'fire':     return 'rgba(255,69,0,0.6)';
      case 'ice':      return 'rgba(0,191,255,0.6)';
      case 'electric': return 'rgba(255,255,0,0.6)';
      case 'galaxy':   return 'rgba(155,89,182,0.6)';
      case 'toxic':    return 'rgba(57,255,20,0.6)';
    }
  }
}
