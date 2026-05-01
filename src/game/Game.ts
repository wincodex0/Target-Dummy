import Matter from 'matter-js';
import { Dummy } from './Dummy.ts';
import { RocketManager } from './Rocket.ts';
import { ExplosionManager } from './Explosion.ts';
import { ParticleSystem } from './ParticleSystem.ts';
import { Economy } from './Economy.ts';
import { Cannon } from './Cannon.ts';
import type { ThemeName, DummyConfig } from '../types/index.ts';

const { Engine, Runner, Bodies, Composite } = Matter;

// Visual floor Y offset from bottom of canvas (matches drawFloor)
const FLOOR_OFFSET = 60;
// Controls bar height at the bottom of the screen
const CONTROLS_BAR_HEIGHT = 56;
// The dummy's "center" is at the hip level.
// From hip center: feet are +78px down, head is -196px up (total height ~274px)
// We want feet to sit ON the floor line, so:
//   cy = floorY - DUMMY_FOOT_OFFSET
//   floorY = canvas.height - CONTROLS_BAR_HEIGHT - FLOOR_OFFSET
const DUMMY_FOOT_OFFSET = 78;

export class Game {
  private canvas: HTMLCanvasElement;
  private ctx: CanvasRenderingContext2D;
  private engine: Matter.Engine;
  private runner: Matter.Runner;

  private dummy!: Dummy;
  private rockets: RocketManager;
  private explosions: ExplosionManager;
  private particles: ParticleSystem;
  private cannon!: Cannon;
  economy: Economy;

  private theme: ThemeName = 'sakura';
  private lastTime: number = 0;
  private animId: number = 0;
  private autoFireTimer: number = 0;
  private slowMoActive: boolean = false;
  private slowMoTimer: number = 0;
  private shakeTimer: number = 0;
  private mouseX: number = 0;
  private mouseY: number = 0;

  // Spawn position — set once when dummy is created, used for recovery target
  private dummySpawnX: number = 0;
  private dummySpawnY: number = 0;

  private dummyConfig: DummyConfig = {
    name: 'Target Dummy',
    bodyColor: '#e8c49a',
    imageDataUrl: null,
  };

  // Callbacks for UI
  onLevelUpdate?: (level: number, progress: number, nextThreshold: number, totalDamage: number) => void;
  onDamageNumber?: (x: number, y: number, amount: number, isCrit: boolean) => void;
  onLevelUp?: (level: number) => void;

  constructor(canvas: HTMLCanvasElement) {
    this.canvas = canvas;
    this.ctx = canvas.getContext('2d')!;

    this.engine = Engine.create({ gravity: { y: 1.2 } });
    this.runner = Runner.create();

    this.particles = new ParticleSystem();
    this.rockets = new RocketManager(this.particles);
    this.explosions = new ExplosionManager(this.particles);
    this.economy = new Economy();

    this.economy.onLevelUp = (level, _stats) => {
      this.onLevelUp?.(level);
    };

    this.resize();
    this.setupWorld();
    this.setupDummy();
    this.setupCannon();

    window.addEventListener('resize', () => {
      this.resize();
      this.setupCannon();
      // Recalculate spawn so pedestal stays centered after resize
      const { cx, cy } = this.getDummySpawn();
      this.dummySpawnX = cx;
      this.dummySpawnY = cy;
    });

    // Track mouse for cannon aiming
    this.canvas.addEventListener('mousemove', (e) => {
      const rect = this.canvas.getBoundingClientRect();
      this.mouseX = e.clientX - rect.left;
      this.mouseY = e.clientY - rect.top;
    });
  }

  private resize(): void {
    this.canvas.width = window.innerWidth;
    this.canvas.height = window.innerHeight;
  }

  private setupWorld(): void {
    const w = this.canvas.width;
    const h = this.canvas.height;

    // The visible play area ends above the controls bar
    const playH = h - CONTROLS_BAR_HEIGHT;
    const floorY = playH - FLOOR_OFFSET;

    const ground = Bodies.rectangle(w / 2, floorY + 25, w * 3, 50, {
      isStatic: true,
      label: 'ground',
      friction: 0.8,
      collisionFilter: { category: 0x0001, mask: 0x0002 },
    });
    const wallL = Bodies.rectangle(-25, playH / 2, 50, playH * 3, {
      isStatic: true, label: 'wallL',
      collisionFilter: { category: 0x0001, mask: 0x0002 },
    });
    const wallR = Bodies.rectangle(w + 25, playH / 2, 50, playH * 3, {
      isStatic: true, label: 'wallR',
      collisionFilter: { category: 0x0001, mask: 0x0002 },
    });
    Composite.add(this.engine.world, [ground, wallL, wallR]);
    Runner.run(this.runner, this.engine);
  }

  private getDummySpawn(): { cx: number; cy: number } {
    // Dummy spawns on top of the pedestal (right of center, where the arrow points)
    // Pedestal is at 60% across, 14px tall — dummy feet sit on top of it
    const PEDESTAL_HEIGHT = 14;
    const cx = this.canvas.width * 0.60;
    const floorY = this.canvas.height - CONTROLS_BAR_HEIGHT - FLOOR_OFFSET;
    // Feet land on top of pedestal, not the floor
    const cy = floorY - PEDESTAL_HEIGHT - DUMMY_FOOT_OFFSET;
    return { cx, cy };
  }

  private setupCannon(): void {
    // Cannon sits left of center — clear lane to shoot at dummy on the right
    const cx = this.canvas.width * 0.35;
    const floorY = this.canvas.height - CONTROLS_BAR_HEIGHT - FLOOR_OFFSET;
    const cy = floorY;
    if (this.cannon) {
      this.cannon.x = cx;
      this.cannon.y = cy;
    } else {
      this.cannon = new Cannon(cx, cy);
    }
  }

  private setupDummy(): void {
    const { cx, cy } = this.getDummySpawn();

    // Store spawn so recovery always returns here
    this.dummySpawnX = cx;
    this.dummySpawnY = cy;

    if (this.dummy) {
      Composite.remove(this.engine.world, this.dummy.composite);
    }

    this.dummy = new Dummy(cx, cy, { ...this.dummyConfig });
    Composite.add(this.engine.world, this.dummy.composite);
  }

  start(): void {
    this.lastTime = performance.now();
    this.loop(this.lastTime);
  }

  stop(): void {
    cancelAnimationFrame(this.animId);
    Runner.stop(this.runner);
  }

  private loop(timestamp: number): void {
    const rawDt = Math.min((timestamp - this.lastTime) / 1000, 0.05);
    this.lastTime = timestamp;

    // Slow-mo effect
    let dt = rawDt;
    if (this.slowMoActive) {
      dt = rawDt * 0.25;
      this.slowMoTimer -= rawDt * 1000;
      if (this.slowMoTimer <= 0) this.slowMoActive = false;
    }

    this.update(dt, rawDt);
    this.draw();

    this.animId = requestAnimationFrame((t) => this.loop(t));
  }

  private update(dt: number, rawDt: number): void {
    const w = this.canvas.width;
    const h = this.canvas.height;

    // Update cannon aim
    this.cannon.aimAt(this.mouseX, this.mouseY);
    this.cannon.update(dt);

    // Economy tick + level update callback
    this.economy.tick(dt);
    this.onLevelUpdate?.(
      this.economy.level,
      this.economy.levelProgress,
      this.economy.nextThreshold,
      this.economy.totalDamage
    );

    // Auto-fire (none by default in auto-level system)
    const autoInterval = this.economy.autoFireInterval;
    if (autoInterval !== null) {
      this.autoFireTimer += rawDt * 1000;
      if (this.autoFireTimer >= autoInterval) {
        this.autoFireTimer = 0;
        const tx = this.dummy.getTorsoPosition().x + (Math.random() - 0.5) * 40;
        const ty = this.dummy.getTorsoPosition().y + (Math.random() - 0.5) * 40;
        const muzzle = this.cannon.getMuzzlePosition();
        this.fireRocketFromMuzzle(muzzle.x, muzzle.y, tx, ty);
      }
    }

    // Update rockets
    this.rockets.update(dt, w, h, this.theme, (x, y) => {
      this.handleExplosion(x, y);
    });

    // Check hits against dummy parts
    for (const { body } of this.dummy.parts) {
      this.rockets.checkHit(body.position.x, body.position.y, 30, (x, y) => {
        const isCrit = body.label === 'head';
        this.handleExplosion(x, y, isCrit);
      });
    }

    // Update explosions and particles
    this.explosions.update(dt);
    this.particles.update(dt);

    // Update dummy — pure physics, no snap-back
    this.dummy.update(dt);

    // Shake timer
    if (this.shakeTimer > 0) this.shakeTimer -= rawDt * 1000;
  }

  private handleExplosion(x: number, y: number, isCrit: boolean = false): void {
    const radius = this.economy.explosionRadius;
    const damage = this.economy.rocketDamage * (isCrit ? 2.5 : 1);

    this.explosions.trigger(x, y, radius, this.theme);

    // Moderate knockback — feels impactful but doesn't launch dummy off-screen
    const knockbackForce = this.economy.knockbackForce * (isCrit ? 1.5 : 1);
    this.dummy.applyExplosionForce(x, y, radius, knockbackForce);
    this.dummy.triggerDialogue();

    this.economy.addDamage(damage, isCrit);
    this.onDamageNumber?.(x, y - 20, Math.floor(damage), isCrit);

    if (damage > 50 || isCrit) {
      this.shakeTimer = isCrit ? 300 : 150;
      if (this.economy.hasSlowMo && isCrit) {
        this.slowMoActive = true;
        this.slowMoTimer = 800;
      }
    }

    this.economy.totalShots++;
  }

  fireRocket(fromX: number, fromY: number, toX: number, toY: number): void {
    this.cannon.fire();
    this.rockets.fire(
      fromX, fromY, toX, toY,
      this.economy.rocketSpeed,
      this.economy.rocketCount,
      this.economy.bounceCount,
      this.theme
    );
    this.economy.totalShots++;
  }

  /** Fire from the cannon muzzle toward a target (used by click and auto-fire) */
  private fireRocketFromMuzzle(fromX: number, fromY: number, toX: number, toY: number): void {
    this.cannon.fire();
    this.rockets.fire(
      fromX, fromY, toX, toY,
      this.economy.rocketSpeed,
      this.economy.rocketCount,
      this.economy.bounceCount,
      this.theme
    );
    this.economy.totalShots++;
  }

  /** Public: fire from cannon muzzle toward a screen point (called from main.ts on click) */
  fireFromCannon(toX: number, toY: number): void {
    const muzzle = this.cannon.getMuzzlePosition();
    this.fireRocketFromMuzzle(muzzle.x, muzzle.y, toX, toY);
  }

  getCannon(): Cannon {
    return this.cannon;
  }

  private draw(): void {
    const ctx = this.ctx;
    const w = this.canvas.width;
    const h = this.canvas.height;

    // Screen shake
    ctx.save();
    if (this.shakeTimer > 0) {
      const intensity = Math.min(this.shakeTimer / 300, 1) * 6;
      ctx.translate(
        (Math.random() - 0.5) * intensity,
        (Math.random() - 0.5) * intensity
      );
    }

    // Background
    const bgGrad = ctx.createLinearGradient(0, 0, 0, h);
    bgGrad.addColorStop(0, '#0a0a1a');
    bgGrad.addColorStop(1, '#1a0a2e');
    ctx.fillStyle = bgGrad;
    ctx.fillRect(0, 0, w, h);

    // Grid floor
    this.drawFloor(ctx, w, h);

    // Target pedestal under dummy
    this.drawPedestal(ctx);

    // Explosions (behind dummy)
    this.explosions.draw(ctx);

    // Dummy
    this.dummy.draw(ctx);

    // Rockets
    this.rockets.draw(ctx, this.theme);

    // Cannon (drawn on top of floor, below particles)
    this.cannon.draw(ctx, this.theme);

    // Particles (on top)
    this.particles.draw(ctx);

    // Custom crosshair cursor
    this.drawCrosshair(ctx, this.mouseX, this.mouseY);

    // Slow-mo overlay
    if (this.slowMoActive) {
      ctx.fillStyle = 'rgba(0, 0, 50, 0.15)';
      ctx.fillRect(0, 0, w, h);
    }

    ctx.restore();
  }

  private drawFloor(ctx: CanvasRenderingContext2D, w: number, h: number): void {
    const playH = h - CONTROLS_BAR_HEIGHT;
    const floorY = playH - FLOOR_OFFSET;

    // Floor surface
    const floorGrad = ctx.createLinearGradient(0, floorY, 0, playH);
    floorGrad.addColorStop(0, 'rgba(40, 20, 60, 0.8)');
    floorGrad.addColorStop(1, 'rgba(20, 10, 30, 0.9)');
    ctx.fillStyle = floorGrad;
    ctx.fillRect(0, floorY, w, playH - floorY);

    // Grid lines
    ctx.strokeStyle = 'rgba(255, 255, 255, 0.04)';
    ctx.lineWidth = 1;
    const gridSize = 40;
    for (let x = 0; x < w; x += gridSize) {
      ctx.beginPath();
      ctx.moveTo(x, 0);
      ctx.lineTo(x, playH);
      ctx.stroke();
    }
    for (let y = 0; y < playH; y += gridSize) {
      ctx.beginPath();
      ctx.moveTo(0, y);
      ctx.lineTo(w, y);
      ctx.stroke();
    }

    // Floor line glow
    ctx.strokeStyle = 'rgba(150, 100, 255, 0.3)';
    ctx.lineWidth = 2;
    ctx.shadowColor = 'rgba(150, 100, 255, 0.5)';
    ctx.shadowBlur = 10;
    ctx.beginPath();
    ctx.moveTo(0, floorY);
    ctx.lineTo(w, floorY);
    ctx.stroke();
    ctx.shadowBlur = 0;
  }

  private drawPedestal(ctx: CanvasRenderingContext2D): void {
    const cx = this.dummySpawnX;
    const floorY = this.canvas.height - CONTROLS_BAR_HEIGHT - FLOOR_OFFSET;

    const pw = 90;
    const ph = 14;
    const px = cx - pw / 2;
    const py = floorY - ph;

    ctx.save();

    // Drop shadow
    ctx.fillStyle = 'rgba(0,0,0,0.3)';
    ctx.beginPath();
    ctx.ellipse(cx, floorY + 4, pw / 2, 8, 0, 0, Math.PI * 2);
    ctx.fill();

    // Platform block
    const grad = ctx.createLinearGradient(px, py, px, py + ph);
    grad.addColorStop(0, '#5a3e8a');
    grad.addColorStop(1, '#2d1f4a');
    ctx.fillStyle = grad;
    ctx.beginPath();
    ctx.roundRect(px, py, pw, ph, [4, 4, 0, 0]);
    ctx.fill();

    // Top edge highlight
    ctx.strokeStyle = 'rgba(180, 140, 255, 0.5)';
    ctx.lineWidth = 1.5;
    ctx.beginPath();
    ctx.moveTo(px + 4, py + 2);
    ctx.lineTo(px + pw - 4, py + 2);
    ctx.stroke();

    ctx.restore();
  }

  private drawCrosshair(ctx: CanvasRenderingContext2D, x: number, y: number): void {
    if (x === 0 && y === 0) return;
    const r = 12;
    const gap = 4;
    ctx.save();
    ctx.strokeStyle = 'rgba(255,255,255,0.9)';
    ctx.lineWidth = 1.5;
    ctx.shadowColor = 'rgba(255,255,255,0.5)';
    ctx.shadowBlur = 4;
    // Cross lines
    ctx.beginPath();
    ctx.moveTo(x - r, y); ctx.lineTo(x - gap, y);
    ctx.moveTo(x + gap, y); ctx.lineTo(x + r, y);
    ctx.moveTo(x, y - r); ctx.lineTo(x, y - gap);
    ctx.moveTo(x, y + gap); ctx.lineTo(x, y + r);
    ctx.stroke();
    // Center dot
    ctx.fillStyle = 'rgba(255,255,255,0.9)';
    ctx.beginPath();
    ctx.arc(x, y, 1.5, 0, Math.PI * 2);
    ctx.fill();
    // Outer circle
    ctx.strokeStyle = 'rgba(255,255,255,0.4)';
    ctx.lineWidth = 1;
    ctx.beginPath();
    ctx.arc(x, y, r + 2, 0, Math.PI * 2);
    ctx.stroke();
    ctx.restore();
  }

  setTheme(theme: ThemeName): void {
    this.theme = theme;
  }

  setDummyName(name: string): void {
    this.dummyConfig.name = name.slice(0, 30);
    this.dummy.config.name = this.dummyConfig.name;
  }

  setDummyImage(dataUrl: string): void {
    this.dummyConfig.imageDataUrl = dataUrl;
    this.dummy.setFaceImage(dataUrl);
  }

  resetDummy(): void {
    this.setupDummy();
  }

  /** Full reset — dummy position + level + all damage progress */
  fullReset(): void {
    this.economy.reset();
    this.setupDummy();
    // Force immediate HUD sync
    this.onLevelUpdate?.(
      this.economy.level,
      this.economy.levelProgress,
      this.economy.nextThreshold,
      this.economy.totalDamage
    );
  }

  getTheme(): ThemeName {
    return this.theme;
  }
}
