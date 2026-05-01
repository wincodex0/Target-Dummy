import type { ThemeName } from '../types/index.ts';

const THEME_COLORS: Record<ThemeName, { barrel: string; base: string; glow: string }> = {
  sakura:   { barrel: '#c0392b', base: '#7f1d1d', glow: '#ffb6c1' },
  fire:     { barrel: '#e67e22', base: '#7f3d00', glow: '#ffa500' },
  ice:      { barrel: '#2980b9', base: '#1a4a6e', glow: '#87ceeb' },
  electric: { barrel: '#f1c40f', base: '#7d6608', glow: '#ffff00' },
  galaxy:   { barrel: '#8e44ad', base: '#4a235a', glow: '#e74c3c' },
  toxic:    { barrel: '#27ae60', base: '#145a32', glow: '#39ff14' },
};

export class Cannon {
  // Position of the cannon pivot (center of the wheel base)
  x: number = 0;
  y: number = 0;

  // Current angle in radians (pointing toward mouse)
  private angle: number = -Math.PI / 2; // default: straight up
  // Smoothed angle for visual interpolation
  private smoothAngle: number = -Math.PI / 2;

  // Muzzle flash timer
  private flashTimer: number = 0;
  private readonly FLASH_DURATION = 0.12;

  // Recoil offset along barrel axis
  private recoil: number = 0;

  // Barrel length (tip is where rockets spawn from)
  readonly BARREL_LENGTH = 70;

  constructor(x: number, y: number) {
    this.x = x;
    this.y = y;
  }

  /** Call every frame with the current mouse position */
  aimAt(mx: number, my: number): void {
    const dx = mx - this.x;
    const dy = my - this.y;
    this.angle = Math.atan2(dy, dx);
  }

  /** Call when a rocket is fired — triggers muzzle flash + recoil */
  fire(): void {
    this.flashTimer = this.FLASH_DURATION;
    this.recoil = 18;
  }

  /** Returns the world position of the barrel tip (where rockets spawn) */
  getMuzzlePosition(): { x: number; y: number } {
    const len = this.BARREL_LENGTH - this.recoil;
    return {
      x: this.x + Math.cos(this.smoothAngle) * len,
      y: this.y + Math.sin(this.smoothAngle) * len,
    };
  }

  /** Returns the current aim angle */
  getAngle(): number {
    return this.smoothAngle;
  }

  update(dt: number): void {
    // Smooth angle interpolation (lerp toward target)
    let da = this.angle - this.smoothAngle;
    // Wrap to [-π, π]
    while (da > Math.PI)  da -= Math.PI * 2;
    while (da < -Math.PI) da += Math.PI * 2;
    this.smoothAngle += da * Math.min(1, dt * 18);

    // Clamp cannon so it can only aim upward (between -170° and -10°)
    // i.e. prevent aiming straight down or behind
    const minAngle = -Math.PI + 0.17; // ~-170 deg
    const maxAngle = -0.17;           // ~-10 deg
    this.smoothAngle = Math.max(minAngle, Math.min(maxAngle, this.smoothAngle));

    // Decay flash and recoil
    if (this.flashTimer > 0) this.flashTimer -= dt;
    if (this.recoil > 0) this.recoil = Math.max(0, this.recoil - dt * 120);
  }

  draw(ctx: CanvasRenderingContext2D, theme: ThemeName): void {
    const colors = THEME_COLORS[theme];
    const cx = this.x;
    const cy = this.y;
    const angle = this.smoothAngle;
    const barrelLen = this.BARREL_LENGTH - this.recoil;
    const barrelW = 18;

    ctx.save();
    ctx.translate(cx, cy);

    // ── Wheel base ────────────────────────────────────────────────────────────
    // Shadow
    ctx.shadowColor = 'rgba(0,0,0,0.5)';
    ctx.shadowBlur = 12;
    ctx.shadowOffsetY = 4;

    // Main wheel
    const wheelGrad = ctx.createRadialGradient(-6, -6, 2, 0, 0, 28);
    wheelGrad.addColorStop(0, '#888');
    wheelGrad.addColorStop(0.5, '#444');
    wheelGrad.addColorStop(1, '#222');
    ctx.fillStyle = wheelGrad;
    ctx.beginPath();
    ctx.arc(0, 0, 28, 0, Math.PI * 2);
    ctx.fill();

    // Wheel rim
    ctx.strokeStyle = '#666';
    ctx.lineWidth = 3;
    ctx.stroke();

    // Wheel spokes
    ctx.strokeStyle = '#555';
    ctx.lineWidth = 2;
    for (let i = 0; i < 6; i++) {
      const a = (i / 6) * Math.PI * 2;
      ctx.beginPath();
      ctx.moveTo(Math.cos(a) * 8, Math.sin(a) * 8);
      ctx.lineTo(Math.cos(a) * 24, Math.sin(a) * 24);
      ctx.stroke();
    }

    // Hub
    ctx.fillStyle = '#888';
    ctx.beginPath();
    ctx.arc(0, 0, 7, 0, Math.PI * 2);
    ctx.fill();

    ctx.shadowBlur = 0;
    ctx.shadowOffsetY = 0;

    // ── Barrel ────────────────────────────────────────────────────────────────
    ctx.rotate(angle);

    // Barrel shadow
    ctx.shadowColor = 'rgba(0,0,0,0.4)';
    ctx.shadowBlur = 8;

    // Barrel body gradient
    const barrelGrad = ctx.createLinearGradient(0, -barrelW / 2, 0, barrelW / 2);
    barrelGrad.addColorStop(0, this.lighten(colors.barrel, 0.2));
    barrelGrad.addColorStop(0.5, colors.barrel);
    barrelGrad.addColorStop(1, colors.base);
    ctx.fillStyle = barrelGrad;

    // Barrel rectangle (extends from pivot outward)
    const barrelX = 0;
    ctx.beginPath();
    ctx.roundRect(barrelX - 10, -barrelW / 2, barrelLen + 10, barrelW, 4);
    ctx.fill();

    // Barrel outline
    ctx.strokeStyle = colors.base;
    ctx.lineWidth = 2;
    ctx.stroke();

    // Barrel ring bands
    ctx.strokeStyle = this.lighten(colors.barrel, 0.3);
    ctx.lineWidth = 3;
    for (const rx of [barrelLen * 0.3, barrelLen * 0.6, barrelLen * 0.85]) {
      ctx.beginPath();
      ctx.moveTo(rx, -barrelW / 2);
      ctx.lineTo(rx, barrelW / 2);
      ctx.stroke();
    }

    // Muzzle cap
    ctx.fillStyle = colors.base;
    ctx.beginPath();
    ctx.roundRect(barrelLen - 4, -barrelW / 2 - 3, 10, barrelW + 6, 3);
    ctx.fill();

    ctx.shadowBlur = 0;

    // ── Muzzle flash ─────────────────────────────────────────────────────────
    if (this.flashTimer > 0) {
      const flashAlpha = this.flashTimer / this.FLASH_DURATION;
      const flashSize = 28 * flashAlpha;

      ctx.save();
      ctx.translate(barrelLen + 6, 0);

      // Outer glow
      const flashGrad = ctx.createRadialGradient(0, 0, 0, 0, 0, flashSize * 1.5);
      flashGrad.addColorStop(0, `rgba(255,255,200,${flashAlpha})`);
      flashGrad.addColorStop(0.3, `${colors.glow}${Math.floor(flashAlpha * 200).toString(16).padStart(2,'0')}`);
      flashGrad.addColorStop(1, 'transparent');
      ctx.fillStyle = flashGrad;
      ctx.beginPath();
      ctx.arc(0, 0, flashSize * 1.5, 0, Math.PI * 2);
      ctx.fill();

      // Star burst
      ctx.strokeStyle = `rgba(255,255,200,${flashAlpha * 0.8})`;
      ctx.lineWidth = 2;
      for (let i = 0; i < 8; i++) {
        const a = (i / 8) * Math.PI * 2;
        ctx.beginPath();
        ctx.moveTo(0, 0);
        ctx.lineTo(Math.cos(a) * flashSize, Math.sin(a) * flashSize);
        ctx.stroke();
      }

      ctx.restore();
    }

    ctx.restore();

    // ── Aim line (dotted) ─────────────────────────────────────────────────────
    const muzzle = this.getMuzzlePosition();
    ctx.save();
    ctx.setLineDash([6, 10]);
    ctx.strokeStyle = `rgba(255,255,255,0.12)`;
    ctx.lineWidth = 1;
    ctx.beginPath();
    ctx.moveTo(muzzle.x, muzzle.y);
    // Extend aim line 300px in the barrel direction
    ctx.lineTo(
      muzzle.x + Math.cos(this.smoothAngle) * 300,
      muzzle.y + Math.sin(this.smoothAngle) * 300
    );
    ctx.stroke();
    ctx.setLineDash([]);
    ctx.restore();
  }

  private lighten(hex: string, amount: number): string {
    const num = parseInt(hex.replace('#', ''), 16);
    const r = Math.min(255, (num >> 16) + Math.floor(255 * amount));
    const g = Math.min(255, ((num >> 8) & 0xff) + Math.floor(255 * amount));
    const b = Math.min(255, (num & 0xff) + Math.floor(255 * amount));
    return `rgb(${r},${g},${b})`;
  }
}
