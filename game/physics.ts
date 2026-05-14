import Matter from 'matter-js';
import { BALL_DATA, BALL_R, BAND, H, POCKET_R, POCKETS, W } from './constants';

const { Engine, Bodies, Body, World, Events } = Matter;

export type BallObj = {
  body: Matter.Body;
  data: typeof BALL_DATA[0];
  pocketed: boolean;
};

export function createEngine() {
  const engine = Engine.create({ gravity: { x: 0, y: 0 } });
  return engine;
}

export function createWalls(world: Matter.World) {
  const opts = { isStatic: true, restitution: 0.8, friction: 0, frictionAir: 0, label: 'wall' };
  const t = 20;
  const pc = POCKET_R * 1.1;
  const TW = W - BAND * 2;
  const TH = H - BAND * 2;

  World.add(world, [
    Bodies.rectangle(W / 2 - pc * 0.5, BAND / 2,     TW / 2 - pc, t, opts),
    Bodies.rectangle(W / 2 + pc * 0.5, BAND / 2,     TW / 2 - pc, t, opts),
    Bodies.rectangle(W / 2 - pc * 0.5, H - BAND / 2, TW / 2 - pc, t, opts),
    Bodies.rectangle(W / 2 + pc * 0.5, H - BAND / 2, TW / 2 - pc, t, opts),
    Bodies.rectangle(BAND / 2,         H / 2,         t, TH - pc * 2, opts),
    Bodies.rectangle(W - BAND / 2,     H / 2,         t, TH - pc * 2, opts),
  ]);
}

export function createBalls(world: Matter.World): BallObj[] {
  const opts = {
    restitution: 0.92,
    friction: 0.005,
    frictionAir: 0.018,
    label: 'ball',
  };

  const spacing = BALL_R * 2.08;
  const cx = W * 0.63;
  const cy = H / 2;

  // Triángulo: 5 filas → 15 posiciones
  const positions: { x: number; y: number }[] = [];
  for (let row = 0; row < 5; row++) {
    for (let col = 0; col <= row; col++) {
      positions.push({
        x: cx + row * spacing * Math.cos(Math.PI / 6),
        y: cy + (col - row / 2) * spacing,
      });
    }
  }

  const solids  = BALL_DATA.filter(b => b.solid);
  const stripes = BALL_DATA.filter(b => !b.solid);
  const eight   = BALL_DATA.find(b => b.n === 8)!;

  const arrangement: typeof BALL_DATA = new Array(15).fill(null);
  arrangement[0] = solids[0];  // vértice: bola 1
  arrangement[4] = eight;       // centro: bola 8

  let si = 1, ri = 0;
  for (let i = 0; i < 15; i++) {
    if (arrangement[i]) continue;
    if (si < solids.length && i % 2 === 1) {
      arrangement[i] = solids[si++];
    } else if (ri < stripes.length) {
      arrangement[i] = stripes[ri++];
    } else {
      arrangement[i] = solids[si++];
    }
  }

  return arrangement.map((data, i) => {
    const body = Bodies.circle(positions[i].x, positions[i].y, BALL_R, { ...opts });
    World.add(world, body);
    return { body, data, pocketed: false };
  });
}

export function createCueBall(world: Matter.World): Matter.Body {
  const body = Bodies.circle(W * 0.25, H / 2, BALL_R, {
    restitution: 0.95, friction: 0.005, frictionAir: 0.02, label: 'cue',
  });
  World.add(world, body);
  return body;
}

export function checkPockets(
  balls: BallObj[],
  cueBall: Matter.Body | null,
  world: Matter.World,
  onBallPocketed: () => void,
  onCuePocketed: () => void,
) {
  balls.forEach(b => {
    if (b.pocketed) return;
    const { x, y } = b.body.position;
    for (const p of POCKETS) {
      const dx = x - p.x, dy = y - p.y;
      if (Math.sqrt(dx * dx + dy * dy) < POCKET_R * 0.85) {
        b.pocketed = true;
        World.remove(world, b.body);
        onBallPocketed();
        break;
      }
    }
  });

  if (cueBall) {
    const { x, y } = cueBall.position;
    for (const p of POCKETS) {
      const dx = x - p.x, dy = y - p.y;
      if (Math.sqrt(dx * dx + dy * dy) < POCKET_R * 0.85) {
        World.remove(world, cueBall);
        onCuePocketed();
        break;
      }
    }
  }
}

export function allStopped(balls: BallObj[], cueBall: Matter.Body | null): boolean {
  const threshold = 0.2;
  for (const b of balls) {
    if (b.pocketed) continue;
    const { x, y } = b.body.velocity;
    if (Math.abs(x) > threshold || Math.abs(y) > threshold) return false;
  }
  if (cueBall) {
    const { x, y } = cueBall.velocity;
    if (Math.abs(x) > threshold || Math.abs(y) > threshold) return false;
  }
  return true;
}
