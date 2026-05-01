import Matter from 'matter-js';
import type { DummyConfig } from '../types/index.ts';

const { Bodies, Body, Constraint, Composite, Vector } = Matter;

interface BodyPart {
  body: Matter.Body;
  label: string;
}

const REST_OFFSETS: Record<string, { x: number; y: number }> = {
  head:      { x:   0, y: -160 },
  torso:     { x:   0, y:  -80 },
  upperArmL: { x: -56, y:  -90 },
  upperArmR: { x:  56, y:  -90 },
  lowerArmL: { x: -56, y:  -30 },
  lowerArmR: { x:  56, y:  -30 },
  upperLegL: { x: -22, y:   10 },
  upperLegR: { x:  22, y:   10 },
  lowerLegL: { x: -22, y:   78 },
  lowerLegR: { x:  22, y:   78 },
};

const HIT_LINES = [
  'Ow!!', 'That hurt!', 'Stop it!!', 'Why meee?!', 'OUCH!',
  'Not the face!', 'I give up...', 'Please stop!', 'My bones!!',
  'AHHHHH!!', 'This is fine 🔥', 'I felt that...', 'Mommy!!',
  'Bruh.', '...ow.', 'YEET', 'I am okay 👍', 'Do it again!',
  'That tickled.', 'SEND HELP',
];

export class Dummy {
  parts: BodyPart[] = [];
  constraints: Matter.Constraint[] = [];
  composite: Matter.Composite;
  config: DummyConfig;
  private faceImage: HTMLImageElement | null = null;

  // Spawn reference — all stand-up lerps return here
  private spawnCx: number = 0;
  private spawnCy: number = 0;
  // Floor Y — set by Game so we can clamp stand position
  floorY: number = 9999;

  // State machine
  // 'idle'     — frozen upright, waiting for first hit
  // 'ragdoll'  — physics running freely after a hit
  // 'standup'  — lerping back to upright
  private state: 'idle' | 'ragdoll' | 'standup' = 'idle';
  private hitTimer: number = 0;       // ragdoll hold duration countdown
  private standProgress: number = 0;  // 0→1 during stand-up
  private standFrom: Record<string, { x: number; y: number; angle: number }> = {};

  private readonly STAND_SPEED   = 0.2;  // exactly 5 seconds to stand up

  // Dialogue
  private dialogueText: string = '';
  private dialogueVisible: boolean = false;
  private dialogueCooldown: number = 0;
  private dialogueTimer: number = 0;
  private lastLineIndex: number = -1;
  private readonly DIALOGUE_INTERVAL = 10;
  private readonly DIALOGUE_DURATION = 3;

  constructor(cx: number, cy: number, config: DummyConfig) {
    this.config = config;
    this.spawnCx = cx;
    this.spawnCy = cy;
    this.composite = Composite.create();
    this.build(cx, cy);
    // Start frozen upright — parts are static so gravity can't pull them
    this.snapToRest();
    this.setStatic(true);
  }

  private build(cx: number, cy: number): void {
    const scale = 2;
    const headR      = 18 * scale;
    const torsoW     = 28 * scale, torsoH     = 50 * scale;
    const upperArmW  = 12 * scale, upperArmH  = 30 * scale;
    const lowerArmW  = 10 * scale, lowerArmH  = 28 * scale;
    const upperLegW  = 14 * scale, upperLegH  = 34 * scale;
    const lowerLegW  = 12 * scale, lowerLegH  = 32 * scale;

    const dummyCategory = 0x0002;
    const worldCategory = 0x0001;

    const opts = (label: string, extra?: object) => ({
      label,
      frictionAir: 0.08,
      restitution: 0.3,
      friction: 0.4,
      density: 0.003,
      collisionFilter: { category: dummyCategory, mask: worldCategory },
      ...extra,
    });

    const o = REST_OFFSETS;
    const head      = Bodies.circle(cx + o.head.x,      cy + o.head.y,      headR,     opts('head'));
    const torso     = Bodies.rectangle(cx + o.torso.x,     cy + o.torso.y,     torsoW,    torsoH,    opts('torso'));
    const upperArmL = Bodies.rectangle(cx + o.upperArmL.x, cy + o.upperArmL.y, upperArmW, upperArmH, opts('upperArmL'));
    const upperArmR = Bodies.rectangle(cx + o.upperArmR.x, cy + o.upperArmR.y, upperArmW, upperArmH, opts('upperArmR'));
    const lowerArmL = Bodies.rectangle(cx + o.lowerArmL.x, cy + o.lowerArmL.y, lowerArmW, lowerArmH, opts('lowerArmL'));
    const lowerArmR = Bodies.rectangle(cx + o.lowerArmR.x, cy + o.lowerArmR.y, lowerArmW, lowerArmH, opts('lowerArmR'));
    const upperLegL = Bodies.rectangle(cx + o.upperLegL.x, cy + o.upperLegL.y, upperLegW, upperLegH, opts('upperLegL'));
    const upperLegR = Bodies.rectangle(cx + o.upperLegR.x, cy + o.upperLegR.y, upperLegW, upperLegH, opts('upperLegR'));
    const lowerLegL = Bodies.rectangle(cx + o.lowerLegL.x, cy + o.lowerLegL.y, lowerLegW, lowerLegH, opts('lowerLegL'));
    const lowerLegR = Bodies.rectangle(cx + o.lowerLegR.x, cy + o.lowerLegR.y, lowerLegW, lowerLegH, opts('lowerLegR'));

    const allBodies = [
      head, torso,
      upperArmL, upperArmR, lowerArmL, lowerArmR,
      upperLegL, upperLegR, lowerLegL, lowerLegR,
    ];

    this.parts = allBodies.map(b => ({ body: b, label: b.label as string }));

    const joint = (
      a: Matter.Body, b: Matter.Body,
      ax: Matter.Vector, bx: Matter.Vector,
      stiffness = 0.4
    ) => Constraint.create({ bodyA: a, bodyB: b, pointA: ax, pointB: bx, stiffness, length: 0 });

    this.constraints = [
      joint(head, torso,          { x: 0, y: headR },             { x: 0, y: -torsoH / 2 },  0.5),
      joint(torso, upperArmL,     { x: -torsoW/2, y: -torsoH/4 }, { x: 0, y: -upperArmH/2 }, 0.4),
      joint(torso, upperArmR,     { x:  torsoW/2, y: -torsoH/4 }, { x: 0, y: -upperArmH/2 }, 0.4),
      joint(upperArmL, lowerArmL, { x: 0, y: upperArmH/2 },       { x: 0, y: -lowerArmH/2 }, 0.4),
      joint(upperArmR, lowerArmR, { x: 0, y: upperArmH/2 },       { x: 0, y: -lowerArmH/2 }, 0.4),
      joint(torso, upperLegL,     { x: -torsoW/4, y: torsoH/2 },  { x: 0, y: -upperLegH/2 }, 0.4),
      joint(torso, upperLegR,     { x:  torsoW/4, y: torsoH/2 },  { x: 0, y: -upperLegH/2 }, 0.4),
      joint(upperLegL, lowerLegL, { x: 0, y: upperLegH/2 },       { x: 0, y: -lowerLegH/2 }, 0.4),
      joint(upperLegR, lowerLegR, { x: 0, y: upperLegH/2 },       { x: 0, y: -lowerLegH/2 }, 0.4),
    ];

    Composite.add(this.composite, [...allBodies, ...this.constraints]);
  }

  /** Instantly place every part at its rest position with zero velocity */
  private snapToRest(): void {
    for (const { body, label } of this.parts) {
      const off = REST_OFFSETS[label];
      if (!off) continue;
      Body.setPosition(body, { x: this.spawnCx + off.x, y: this.spawnCy + off.y });
      Body.setAngle(body, 0);
      Body.setVelocity(body, { x: 0, y: 0 });
      Body.setAngularVelocity(body, 0);
    }
  }

  /** Make all parts static so physics can't move them */
  private setStatic(isStatic: boolean): void {
    for (const { body } of this.parts) {
      Body.setStatic(body, isStatic);
    }
  }

  applyExplosionForce(x: number, y: number, radius: number, force: number): void {
    // Go dynamic so physics can move the parts
    this.setStatic(false);

    // Transition to ragdoll — wait 5–10 seconds before standing up
    this.state = 'ragdoll';
    this.hitTimer = 5 + Math.random() * 5; // 5–10s
    this.standProgress = 0;

    for (const { body } of this.parts) {
      const dx = body.position.x - x;
      const dy = body.position.y - y;
      const dist = Math.sqrt(dx * dx + dy * dy);
      const falloff = dist < radius ? (1 - dist / radius) : 0;
      if (falloff <= 0) continue;

      const nx = dx / (dist || 1);
      const ny = dy / (dist || 1);

      Body.applyForce(body, body.position, Vector.create(
        nx * force * falloff,
        ny * force * falloff - force * falloff * 0.8
      ));
      Body.setAngularVelocity(body, body.angularVelocity + (Math.random() - 0.5) * force * 8);
    }
  }

  getHeadPosition(): { x: number; y: number } {
    const h = this.parts.find(p => p.label === 'head');
    return h ? { x: h.body.position.x, y: h.body.position.y } : { x: 0, y: 0 };
  }

  getTorsoPosition(): { x: number; y: number } {
    const t = this.parts.find(p => p.label === 'torso');
    return t ? { x: t.body.position.x, y: t.body.position.y } : { x: 0, y: 0 };
  }

  setFaceImage(dataUrl: string): void {
    const img = new Image();
    img.onload = () => { this.faceImage = img; };
    img.src = dataUrl;
  }

  update(dt: number): void {
    // ── Dialogue tick ──────────────────────────────────────────────────────
    if (this.dialogueVisible) {
      this.dialogueTimer -= dt;
      if (this.dialogueTimer <= 0) {
        this.dialogueVisible = false;
        this.dialogueCooldown = 0;
      }
    } else {
      this.dialogueCooldown += dt;
    }

    // ── State machine ──────────────────────────────────────────────────────
    if (this.state === 'idle') {
      // Static — Matter.js holds parts in place, no tunneling possible
      return;
    }

    if (this.state === 'ragdoll') {
      this.hitTimer -= dt;
      if (this.hitTimer <= 0) {
        // Derive new stand center from torso's current position, clamped to floor
        const torso = this.parts.find(p => p.label === 'torso');
        if (torso) {
          this.spawnCx = torso.body.position.x;
          this.spawnCy = Math.min(torso.body.position.y + 80, this.floorY - 78);
        }

        // Snapshot the current angle of every part — we'll lerp these back to 0
        // Positions are snapped to rest immediately so parts are always visible,
        // but angles animate slowly back to upright
        this.standFrom = {};
        for (const { body, label } of this.parts) {
          this.standFrom[label] = {
            x: body.position.x,   // not used during standup, just stored
            y: body.position.y,
            angle: body.angle,
          };
        }

        // Snap positions to rest right now — no travel, no disappearing
        this.snapToRest();
        this.setStatic(true);

        this.standProgress = 0;
        this.state = 'standup';
      }
      return;
    }

    if (this.state === 'standup') {
      this.standProgress = Math.min(1, this.standProgress + dt * this.STAND_SPEED);
      // Ease-in-out — slow start (dazed), picks up, settles gently upright
      const t = this.standProgress < 0.5
        ? 2 * this.standProgress * this.standProgress
        : 1 - Math.pow(-2 * this.standProgress + 2, 2) / 2;

      // Rise from floor: every part starts at floorY and slides up to rest position.
      // Angles stay at 0 the whole time — clean upright rise, no spinning.
      for (const { body, label } of this.parts) {
        const off = REST_OFFSETS[label];
        if (!off) continue;

        const restX = this.spawnCx + off.x;
        const restY = this.spawnCy + off.y;
        const startY = this.floorY; // collapsed at floor level

        Body.setPosition(body, {
          x: restX,
          y: startY + (restY - startY) * t,
        });
        Body.setAngle(body, 0);
        Body.setVelocity(body, { x: 0, y: 0 });
        Body.setAngularVelocity(body, 0);
      }

      if (this.standProgress >= 1) {
        this.snapToRest();
        this.state = 'idle';
      }
    }
  }

  triggerDialogue(): void {
    if (this.dialogueCooldown < this.DIALOGUE_INTERVAL) return;
    let idx: number;
    do { idx = Math.floor(Math.random() * HIT_LINES.length); }
    while (idx === this.lastLineIndex && HIT_LINES.length > 1);
    this.lastLineIndex = idx;
    this.dialogueText = HIT_LINES[idx];
    this.dialogueVisible = true;
    this.dialogueTimer = this.DIALOGUE_DURATION;
    this.dialogueCooldown = 0;
  }

  draw(ctx: CanvasRenderingContext2D): void {
    const bodyColor = this.config.bodyColor;
    const outlineColor = '#1a1a1a';

    const drawOrder = [
      'lowerLegL', 'lowerLegR', 'upperLegL', 'upperLegR',
      'lowerArmL', 'lowerArmR', 'upperArmL', 'upperArmR',
      'torso', 'head',
    ];

    const sorted = [...this.parts].sort(
      (a, b) => drawOrder.indexOf(a.label) - drawOrder.indexOf(b.label)
    );

    for (const { body, label } of sorted) {
      ctx.save();
      ctx.translate(body.position.x, body.position.y);
      ctx.rotate(body.angle);

      if (label === 'head') {
        const verts = body.vertices;
        const r = Math.sqrt(
          (verts[0].x - body.position.x) ** 2 + (verts[0].y - body.position.y) ** 2
        );
        ctx.shadowColor = 'rgba(0,0,0,0.4)';
        ctx.shadowBlur = 8;
        ctx.shadowOffsetY = 4;
        ctx.beginPath();
        ctx.arc(0, 0, r, 0, Math.PI * 2);
        ctx.fillStyle = bodyColor;
        ctx.fill();
        ctx.strokeStyle = outlineColor;
        ctx.lineWidth = 3;
        ctx.stroke();
        ctx.shadowBlur = 0;
        ctx.shadowOffsetY = 0;

        if (this.faceImage) {
          ctx.save();
          ctx.beginPath();
          ctx.arc(0, 0, r - 2, 0, Math.PI * 2);
          ctx.clip();
          ctx.drawImage(this.faceImage, -r, -r, r * 2, r * 2);
          ctx.restore();
        } else {
          ctx.fillStyle = '#222';
          ctx.beginPath();
          ctx.arc(-10, -8, 5, 0, Math.PI * 2);
          ctx.arc( 10, -8, 5, 0, Math.PI * 2);
          ctx.fill();
          ctx.fillStyle = 'rgba(255,255,255,0.7)';
          ctx.beginPath();
          ctx.arc(-8, -10, 2, 0, Math.PI * 2);
          ctx.arc( 12, -10, 2, 0, Math.PI * 2);
          ctx.fill();
          ctx.strokeStyle = '#222';
          ctx.lineWidth = 2.5;
          ctx.beginPath();
          ctx.arc(0, 6, 9, 0.1 * Math.PI, 0.9 * Math.PI);
          ctx.stroke();
        }

      } else {
        const verts = body.vertices;
        ctx.shadowColor = 'rgba(0,0,0,0.35)';
        ctx.shadowBlur = 6;
        ctx.shadowOffsetY = 3;
        ctx.beginPath();
        ctx.moveTo(verts[0].x - body.position.x, verts[0].y - body.position.y);
        for (let i = 1; i < verts.length; i++) {
          ctx.lineTo(verts[i].x - body.position.x, verts[i].y - body.position.y);
        }
        ctx.closePath();

        const isLimb = label.includes('Arm') || label.includes('Leg');
        const grad = ctx.createLinearGradient(-15, -15, 15, 15);
        grad.addColorStop(0, isLimb ? this.lighten(bodyColor, 0.1) : bodyColor);
        grad.addColorStop(1, this.darken(bodyColor, 0.25));
        ctx.fillStyle = grad;
        ctx.fill();
        ctx.shadowBlur = 0;
        ctx.shadowOffsetY = 0;
        ctx.strokeStyle = outlineColor;
        ctx.lineWidth = 2;
        ctx.stroke();

        if (label === 'torso') {
          ctx.strokeStyle = 'rgba(0,0,0,0.15)';
          ctx.lineWidth = 1;
          ctx.beginPath();
          ctx.moveTo(-8, -15); ctx.lineTo(-8, 15);
          ctx.moveTo( 8, -15); ctx.lineTo( 8, 15);
          ctx.stroke();
        }
      }
      ctx.restore();
    }

    // Name label + speech bubble — follow the head
    const headPart = this.parts.find(p => p.label === 'head');
    if (headPart) {
      const hx = headPart.body.position.x;
      const hy = headPart.body.position.y;
      const headR = 36;

      ctx.save();
      ctx.font = 'bold 15px Segoe UI, sans-serif';
      ctx.textAlign = 'center';
      const textW = ctx.measureText(this.config.name).width;
      const pillX = hx - textW / 2 - 10;
      const pillY = hy - headR - 32;
      const pillW = textW + 20;
      const pillH = 24;
      ctx.fillStyle = 'rgba(0,0,0,0.65)';
      ctx.beginPath();
      ctx.roundRect(pillX, pillY, pillW, pillH, 12);
      ctx.fill();
      ctx.fillStyle = '#ffffff';
      ctx.fillText(this.config.name, hx, pillY + 16);
      ctx.restore();

      if (this.dialogueVisible && this.dialogueText) {
        const fadeIn  = Math.min(1, (this.DIALOGUE_DURATION - this.dialogueTimer) / 0.2);
        const fadeOut = Math.min(1, this.dialogueTimer / 0.4);
        const alpha   = Math.min(fadeIn, fadeOut);

        ctx.save();
        ctx.globalAlpha = alpha;
        ctx.font = 'bold 16px Segoe UI, sans-serif';
        ctx.textAlign = 'center';

        const bw = ctx.measureText(this.dialogueText).width + 28;
        const bh = 36;
        const bx = hx - bw / 2;
        const by = pillY - bh - 18;
        const tailX = hx;
        const tailY = by + bh;

        ctx.shadowColor = 'rgba(0,0,0,0.4)';
        ctx.shadowBlur = 10;
        ctx.shadowOffsetY = 3;
        ctx.fillStyle = '#ffffff';
        ctx.beginPath();
        ctx.roundRect(bx, by, bw, bh, 10);
        ctx.fill();
        ctx.beginPath();
        ctx.moveTo(tailX - 8, tailY);
        ctx.lineTo(tailX + 8, tailY);
        ctx.lineTo(tailX, tailY + 12);
        ctx.closePath();
        ctx.fill();
        ctx.shadowBlur = 0;
        ctx.shadowOffsetY = 0;
        ctx.strokeStyle = 'rgba(0,0,0,0.12)';
        ctx.lineWidth = 1.5;
        ctx.beginPath();
        ctx.roundRect(bx, by, bw, bh, 10);
        ctx.stroke();
        ctx.fillStyle = '#1a1a2e';
        ctx.font = 'bold 15px Segoe UI, sans-serif';
        ctx.fillText(this.dialogueText, hx, by + bh / 2 + 5);
        ctx.restore();
      }
    }
  }

  private darken(hex: string, amount: number): string {
    const num = parseInt(hex.replace('#', ''), 16);
    const r = Math.max(0, (num >> 16) - Math.floor(255 * amount));
    const g = Math.max(0, ((num >> 8) & 0xff) - Math.floor(255 * amount));
    const b = Math.max(0, (num & 0xff) - Math.floor(255 * amount));
    return `rgb(${r},${g},${b})`;
  }

  private lighten(hex: string, amount: number): string {
    const num = parseInt(hex.replace('#', ''), 16);
    const r = Math.min(255, (num >> 16) + Math.floor(255 * amount));
    const g = Math.min(255, ((num >> 8) & 0xff) + Math.floor(255 * amount));
    const b = Math.min(255, (num & 0xff) + Math.floor(255 * amount));
    return `rgb(${r},${g},${b})`;
  }
}
