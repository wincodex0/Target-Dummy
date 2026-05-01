import type { Particle, ThemeName } from '../types/index.ts';

const THEME_COLORS: Record<ThemeName, string[]> = {
  sakura:   ['#ffb6c1', '#ff69b4', '#ffc0cb', '#ff1493', '#fff0f5'],
  fire:     ['#ff4500', '#ff6347', '#ffa500', '#ff8c00', '#ffff00'],
  ice:      ['#00bfff', '#87ceeb', '#b0e0e6', '#e0f7ff', '#ffffff'],
  electric: ['#ffff00', '#fffacd', '#ffd700', '#00ffff', '#ffffff'],
  galaxy:   ['#9b59b6', '#8e44ad', '#3498db', '#e74c3c', '#f1c40f'],
  toxic:    ['#39ff14', '#7fff00', '#adff2f', '#00ff7f', '#32cd32'],
};

export class ParticleSystem {
  private particles: Particle[] = [];

  spawnTrail(x: number, y: number, vx: number, vy: number, theme: ThemeName): void {
    const colors = THEME_COLORS[theme];
    const count = theme === 'sakura' ? 3 : 2;
    for (let i = 0; i < count; i++) {
      const angle = Math.atan2(vy, vx) + Math.PI + (Math.random() - 0.5) * 0.8;
      const speed = Math.random() * 2 + 0.5;
      this.particles.push({
        x: x + (Math.random() - 0.5) * 6,
        y: y + (Math.random() - 0.5) * 6,
        vx: Math.cos(angle) * speed,
        vy: Math.sin(angle) * speed,
        life: 1,
        maxLife: theme === 'sakura' ? 0.6 + Math.random() * 0.4 : 0.3 + Math.random() * 0.3,
        size: theme === 'sakura' ? 4 + Math.random() * 4 : 3 + Math.random() * 3,
        color: colors[Math.floor(Math.random() * colors.length)],
        rotation: Math.random() * Math.PI * 2,
        rotationSpeed: (Math.random() - 0.5) * 0.3,
        gravity: theme === 'sakura' ? 0.05 : 0.02,
        type: theme === 'sakura' ? 'petal' : theme === 'fire' ? 'ember' : 'spark',
      });
    }
  }

  spawnExplosion(x: number, y: number, radius: number, theme: ThemeName): void {
    const colors = THEME_COLORS[theme];
    const count = 40 + Math.floor(radius * 0.5);

    // Burst particles
    for (let i = 0; i < count; i++) {
      const angle = (i / count) * Math.PI * 2 + Math.random() * 0.3;
      const speed = (Math.random() * radius * 0.12) + 2;
      const particleType = this.getParticleType(theme);
      this.particles.push({
        x,
        y,
        vx: Math.cos(angle) * speed,
        vy: Math.sin(angle) * speed - Math.random() * 3,
        life: 1,
        maxLife: 0.8 + Math.random() * 0.6,
        size: 3 + Math.random() * (theme === 'sakura' ? 8 : 5),
        color: colors[Math.floor(Math.random() * colors.length)],
        rotation: Math.random() * Math.PI * 2,
        rotationSpeed: (Math.random() - 0.5) * 0.4,
        gravity: theme === 'ice' ? 0.08 : theme === 'sakura' ? 0.04 : 0.12,
        type: particleType,
      });
    }

    // Shockwave ring particle (single marker)
    this.particles.push({
      x, y,
      vx: 0, vy: 0,
      life: 1,
      maxLife: 0.5,
      size: radius,
      color: colors[0],
      rotation: 0,
      rotationSpeed: 0,
      gravity: 0,
      type: 'ring',
    });
  }

  private getParticleType(theme: ThemeName): Particle['type'] {
    switch (theme) {
      case 'sakura':   return 'petal';
      case 'fire':     return 'ember';
      case 'ice':      return 'shard';
      case 'electric': return 'spark';
      case 'galaxy':   return 'star';
      case 'toxic':    return 'bubble';
    }
  }

  update(dt: number): void {
    for (let i = this.particles.length - 1; i >= 0; i--) {
      const p = this.particles[i];
      p.x += p.vx;
      p.y += p.vy;
      p.vy += p.gravity;
      p.vx *= 0.98;
      p.rotation += p.rotationSpeed;
      p.life -= dt / p.maxLife;
      if (p.life <= 0) {
        this.particles.splice(i, 1);
      }
    }
  }

  draw(ctx: CanvasRenderingContext2D): void {
    for (const p of this.particles) {
      const alpha = Math.max(0, p.life);
      ctx.save();
      ctx.globalAlpha = alpha;
      ctx.translate(p.x, p.y);
      ctx.rotate(p.rotation);

      switch (p.type) {
        case 'petal':
          this.drawPetal(ctx, p);
          break;
        case 'ember':
          this.drawEmber(ctx, p);
          break;
        case 'shard':
          this.drawShard(ctx, p);
          break;
        case 'spark':
          this.drawSpark(ctx, p);
          break;
        case 'star':
          this.drawStar(ctx, p);
          break;
        case 'bubble':
          this.drawBubble(ctx, p);
          break;
        case 'ring':
          this.drawRing(ctx, p);
          break;
      }

      ctx.restore();
    }
  }

  private drawPetal(ctx: CanvasRenderingContext2D, p: Particle): void {
    ctx.fillStyle = p.color;
    ctx.beginPath();
    ctx.ellipse(0, 0, p.size * 0.5, p.size, 0, 0, Math.PI * 2);
    ctx.fill();
    // Second lobe
    ctx.beginPath();
    ctx.ellipse(p.size * 0.3, -p.size * 0.3, p.size * 0.4, p.size * 0.7, Math.PI / 4, 0, Math.PI * 2);
    ctx.fill();
  }

  private drawEmber(ctx: CanvasRenderingContext2D, p: Particle): void {
    const grad = ctx.createRadialGradient(0, 0, 0, 0, 0, p.size);
    grad.addColorStop(0, '#ffffff');
    grad.addColorStop(0.3, p.color);
    grad.addColorStop(1, 'transparent');
    ctx.fillStyle = grad;
    ctx.beginPath();
    ctx.arc(0, 0, p.size, 0, Math.PI * 2);
    ctx.fill();
  }

  private drawShard(ctx: CanvasRenderingContext2D, p: Particle): void {
    ctx.fillStyle = p.color;
    ctx.strokeStyle = '#ffffff';
    ctx.lineWidth = 0.5;
    ctx.beginPath();
    ctx.moveTo(0, -p.size);
    ctx.lineTo(p.size * 0.4, p.size * 0.5);
    ctx.lineTo(-p.size * 0.4, p.size * 0.5);
    ctx.closePath();
    ctx.fill();
    ctx.stroke();
  }

  private drawSpark(ctx: CanvasRenderingContext2D, p: Particle): void {
    ctx.strokeStyle = p.color;
    ctx.lineWidth = 2;
    ctx.shadowColor = p.color;
    ctx.shadowBlur = 6;
    ctx.beginPath();
    ctx.moveTo(-p.size, 0);
    ctx.lineTo(p.size, 0);
    ctx.moveTo(0, -p.size);
    ctx.lineTo(0, p.size);
    ctx.stroke();
    ctx.shadowBlur = 0;
  }

  private drawStar(ctx: CanvasRenderingContext2D, p: Particle): void {
    ctx.fillStyle = p.color;
    ctx.shadowColor = p.color;
    ctx.shadowBlur = 8;
    const spikes = 5;
    const outerR = p.size;
    const innerR = p.size * 0.4;
    ctx.beginPath();
    for (let i = 0; i < spikes * 2; i++) {
      const r = i % 2 === 0 ? outerR : innerR;
      const angle = (i * Math.PI) / spikes;
      if (i === 0) ctx.moveTo(Math.cos(angle) * r, Math.sin(angle) * r);
      else ctx.lineTo(Math.cos(angle) * r, Math.sin(angle) * r);
    }
    ctx.closePath();
    ctx.fill();
    ctx.shadowBlur = 0;
  }

  private drawBubble(ctx: CanvasRenderingContext2D, p: Particle): void {
    ctx.strokeStyle = p.color;
    ctx.lineWidth = 1.5;
    ctx.shadowColor = p.color;
    ctx.shadowBlur = 4;
    ctx.beginPath();
    ctx.arc(0, 0, p.size, 0, Math.PI * 2);
    ctx.stroke();
    ctx.shadowBlur = 0;
    // Shine
    ctx.fillStyle = 'rgba(255,255,255,0.3)';
    ctx.beginPath();
    ctx.arc(-p.size * 0.3, -p.size * 0.3, p.size * 0.25, 0, Math.PI * 2);
    ctx.fill();
  }

  private drawRing(ctx: CanvasRenderingContext2D, p: Particle): void {
    const progress = 1 - p.life;
    const currentRadius = p.size * progress;
    ctx.strokeStyle = p.color;
    ctx.lineWidth = Math.max(1, 6 * p.life);
    ctx.globalAlpha = p.life * 0.6;
    ctx.shadowColor = p.color;
    ctx.shadowBlur = 20;
    ctx.beginPath();
    ctx.arc(0, 0, currentRadius, 0, Math.PI * 2);
    ctx.stroke();
    ctx.shadowBlur = 0;
  }

  get count(): number {
    return this.particles.length;
  }
}
