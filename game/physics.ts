import Matter from 'matter-js';
import { W, H, BAND, BALL_R, POCKET_R, BALL_DATA, POCKETS } from './constants';

const { Engine, Bodies, Body, World } = Matter;

export type BallObj = {
  body: Matter.Body;
  data: typeof BALL_DATA[0];
  pocketed: boolean;
};

export function createEngine() {
  const engine = Engine.create({
    gravity: { x: 0, y: 0 },
    positionIterations: 10,   // más precisión en colisiones
    velocityIterations: 10,
    constraintIterations: 4,
  });
  return engine;
}

export function createWalls(world: Matter.World) {
  const opts = {
    isStatic: true,
    restitution: 0.75,   // rebote realista de banda
    friction: 0.1,
    frictionAir: 0,
    label: 'wall',
    slop: 0.05,          // evita que las bolas se "peguen" a la banda
  };
  const t = 24;
  const pc = POCKET_R * 1.2;
  const TW = W - BAND * 2;
  const TH = H - BAND * 2;

  World.add(world, [
    // arriba
    Bodies.rectangle(W / 2 - pc * 0.5, BAND / 2,     TW / 2 - pc, t, opts),
    Bodies.rectangle(W / 2 + pc * 0.5, BAND / 2,     TW / 2 - pc, t, opts),
    // abajo
    Bodies.rectangle(W / 2 - pc * 0.5, H - BAND / 2, TW / 2 - pc, t, opts),
    Bodies.rectangle(W / 2 + pc * 0.5, H - BAND / 2, TW / 2 - pc, t, opts),
    // izquierda
    Bodies.rectangle(BAND / 2,         H / 2,         t, TH - pc * 2, opts),
    // derecha
    Bodies.rectangle(W - BAND / 2,     H / 2,         t, TH - pc * 2, opts),
  ]);
}

export function createBalls(world: Matter.World): BallObj[] {
  const opts = {
    restitution: 0.97,      // bolas casi perfectamente elásticas
    friction: 0.004,        // poca fricción entre bolas
    frictionAir: 0.013,     // desaceleración gradual y realista
    frictionStatic: 0.02,
    density: 0.002,         // peso uniforme en todas las bolas
    slop: 0.02,
    label: 'ball',
  };

  const spacing = BALL_R * 2.08; // triángulo compacto
  const cx = W * 0.63;
  const cy = H / 2;
  const positions: { x: number; y: number }[] = [];

  for (let r = 0; r < 5; r++) {
    for (let c = 0; c <= r; c++) {
      // pequeño offset aleatorio para evitar colisiones perfectamente simétricas
      const jitter = (Math.random() - 0.5) * 0.5;
      positions.push({
        x: cx + r * spacing * Math.cos(Math.PI / 6) + jitter,
        y: cy + (c - r / 2) * spacing + jitter,
      });
    }
  }

  const shuffled = [...BALL_DATA].sort(() => Math.random() - 0.5);
  // La bola 8 siempre en el centro 
  const idx8 = shuffled.findIndex(b => b.n === 8);
  [shuffled[4], shuffled[idx8]] = [shuffled[idx8], shuffled[4]];

  return shuffled.map((data, i) => {
    const body = Bodies.circle(positions[i].x, positions[i].y, BALL_R, { ...opts });
    World.add(world, body);
    return { body, data, pocketed: false };
  });
}

export function createCueBall(world: Matter.World): Matter.Body {
  const body = Bodies.circle(W * 0.25, H / 2, BALL_R, {
    restitution: 0.97,
    friction: 0.004,
    frictionAir: 0.015,
    frictionStatic: 0.02,
    density: 0.002,
    slop: 0.02,
    label: 'cue',
  });
  World.add(world, body);
  return body;
}

export function shootCueBall(
  cueBall: Matter.Body,
  angle: number,
  power: number   // 0 a 100
) {
  // escala de fuerza no lineal 
  const force = Math.pow(power / 100, 1.4) * 0.072;
  Body.setVelocity(cueBall, {
    x: Math.cos(angle) * force * 60,
    y: Math.sin(angle) * force * 60,
  });
}

export function applyTableFriction(balls: BallObj[], cueBall: Matter.Body | null) {
  // fricción adicional del paño — frena bolas muy lentas limpiamente
  const SLOW_THRESHOLD = 0.8;
  const STOP_THRESHOLD = 0.15;

  const applyToBody = (body: Matter.Body) => {
    const speed = Math.sqrt(
      body.velocity.x ** 2 + body.velocity.y ** 2
    );
    if (speed < STOP_THRESHOLD) {
      Body.setVelocity(body, { x: 0, y: 0 });
    } else if (speed < SLOW_THRESHOLD) {
      Body.setVelocity(body, {
        x: body.velocity.x * 0.92,
        y: body.velocity.y * 0.92,
      });
    }
  };

  balls.forEach(b => { if (!b.pocketed) applyToBody(b.body); });
  if (cueBall) applyToBody(cueBall);
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
      if (Math.sqrt(dx * dx + dy * dy) < POCKET_R * 0.88) {
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
      if (Math.sqrt(dx * dx + dy * dy) < POCKET_R * 0.88) {
        World.remove(world, cueBall);
        onCuePocketed();
        break;
      }
    }
  }
}

export function allStopped(balls: BallObj[], cueBall: Matter.Body | null): boolean {
  const threshold = 0.15;
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
