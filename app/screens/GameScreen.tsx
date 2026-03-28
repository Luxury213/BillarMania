// ============================================================
// GameScreen.tsx — BillarMania Fase 1
// Mesa de billar con Matter.js (física) + React Native Skia (gráficos)
// Estética Neon Noir / Pixel Art inspirada en Balatro
// Universidad Santiago de Cali — Computación Móvil 2026
// ============================================================

import { Canvas, Circle, Line, RoundedRect, vec } from '@shopify/react-native-skia';
import * as ScreenOrientation from 'expo-screen-orientation';
import Matter from 'matter-js';
import React, { useCallback, useEffect, useRef, useState } from 'react';
import {
  Dimensions,
  GestureResponderEvent,
  PanResponder,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from 'react-native';

// ─── TEMA ────────────────────────────────────────────────────
const COLORS = {
  primary: '#3a86ff',
  accent:  '#ff006e',
  purple:  '#8338ec',
  gold:    '#ffbe0b',
  green:   '#00ff88',
  orange:  '#fb5607',
  bg:      '#060910',
  white:   '#ffffff',
  tableFelt:   '#0a2e1a',
  tableBorder: '#4a2800',
  cushion:     '#1a4a25',
};

// ─── DIMENSIONES ─────────────────────────────────────────────
const SCREEN = Dimensions.get('window');
const W = Math.max(SCREEN.width, SCREEN.height);
const H = Math.min(SCREEN.width, SCREEN.height);

// ─── MESA ────────────────────────────────────────────────────
const MARGIN_H = W * 0.05;
const MARGIN_V = H * 0.12;
const TABLE_X  = MARGIN_H;
const TABLE_Y  = MARGIN_V;
const TABLE_W  = W - MARGIN_H * 2;
const TABLE_H  = H - MARGIN_V - H * 0.05;
const CUSHION  = 18;
const PLAY_X   = TABLE_X + CUSHION;
const PLAY_Y   = TABLE_Y + CUSHION;
const PLAY_W   = TABLE_W - CUSHION * 2;
const PLAY_H   = TABLE_H - CUSHION * 2;
const POCKET_R = 16;

// ─── BOLAS ────────────────────────────────────────────────────
const BALL_R = Math.min(PLAY_W, PLAY_H) * 0.038;

const BALL_COLORS: Record<number, string> = {
  0:  '#ffffff',
  1:  '#ffbe0b',
  2:  '#3a86ff',
  3:  '#ff006e',
  4:  '#8338ec',
  5:  '#fb5607',
  6:  '#00ff88',
  7:  '#ff006e',
  8:  '#222222',
  9:  '#ffbe0b',
  10: '#3a86ff',
  11: '#ff006e',
  12: '#8338ec',
  13: '#fb5607',
  14: '#00ff88',
  15: '#ff4444',
};

const BALL_POINTS: Record<number, number> = { 8: 300 };
for (let i = 1; i <= 7; i++) BALL_POINTS[i] = 100;
for (let i = 9; i <= 15; i++) BALL_POINTS[i] = 150;

// ─── TRONERAS ─────────────────────────────────────────────────
const POCKETS = [
  { x: PLAY_X,            y: PLAY_Y },
  { x: PLAY_X + PLAY_W/2, y: PLAY_Y - 4 },
  { x: PLAY_X + PLAY_W,   y: PLAY_Y },
  { x: PLAY_X,            y: PLAY_Y + PLAY_H },
  { x: PLAY_X + PLAY_W/2, y: PLAY_Y + PLAY_H + 4 },
  { x: PLAY_X + PLAY_W,   y: PLAY_Y + PLAY_H },
];

// ─── TIPOS ────────────────────────────────────────────────────
interface BallState {
  id: number;
  x: number;
  y: number;
  radius: number;
  pocketed: boolean;
}

interface GameState {
  score:       number;
  round:       number;
  shots:       number;
  maxShots:    number;
  threshold:   number;
  coins:       number;
  chainCount:  number;
  bounceCount: number;
  phase: 'aiming' | 'shooting' | 'waiting';
}

// ─── RACK ─────────────────────────────────────────────────────
function getRackPositions(ballIds: number[]): { id: number; x: number; y: number }[] {
  const rackCenterX = PLAY_X + PLAY_W * 0.67;
  const rackCenterY = PLAY_Y + PLAY_H / 2;
  const rows = [
    [0],
    [1, 2],
    [3, 8, 4],
    [5, 6, 7, 9],
    [10, 11, 12, 13, 14],
  ];
  const positions: { id: number; x: number; y: number }[] = [];
  let ballIndex = 0;
  rows.forEach((row, rowIdx) => {
    row.forEach((_, colIdx) => {
      if (ballIndex >= ballIds.length) return;
      const px = rackCenterX + rowIdx * BALL_R * 1.9;
      const py = rackCenterY + (colIdx - (row.length - 1) / 2) * BALL_R * 1.95;
      positions.push({ id: ballIds[ballIndex], x: px, y: py });
      ballIndex++;
    });
  });
  return positions;
}

// ─── COMPONENTE PRINCIPAL ─────────────────────────────────────
export default function GameScreen() {
  const engineRef  = useRef<Matter.Engine | null>(null);
  const runnerRef  = useRef<Matter.Runner | null>(null);
  const bodiesRef  = useRef<Map<number, Matter.Body>>(new Map());
  const wallsRef   = useRef<Matter.Body[]>([]);
  const frameRef   = useRef<number>(0);

  const [balls, setBalls] = useState<BallState[]>([]);
  const [gameState, setGameState] = useState<GameState>({
    score:       0,
    round:       1,
    shots:       6,
    maxShots:    6,
    threshold:   500,
    coins:       150,
    chainCount:  0,
    bounceCount: 0,
    phase:       'aiming',
  });

  const [aimStart, setAimStart] = useState<{ x: number; y: number } | null>(null);
  const [aimEnd,   setAimEnd]   = useState<{ x: number; y: number } | null>(null);
  const [showGuide, setShowGuide] = useState(false);

  // ── INICIALIZAR FÍSICA ──────────────────────────────────────
  useEffect(() => {
    ScreenOrientation.lockAsync(ScreenOrientation.OrientationLock.LANDSCAPE_LEFT);

    const engine = Matter.Engine.create({ gravity: { x: 0, y: 0 } });
    const runner = Matter.Runner.create();
    engineRef.current = engine;
    runnerRef.current = runner;

    const wallOpts = { isStatic: true, restitution: 0.85, friction: 0, label: 'wall' };
    const walls = [
      Matter.Bodies.rectangle(PLAY_X + PLAY_W/2, PLAY_Y - 5,          PLAY_W, 10, wallOpts),
      Matter.Bodies.rectangle(PLAY_X + PLAY_W/2, PLAY_Y + PLAY_H + 5, PLAY_W, 10, wallOpts),
      Matter.Bodies.rectangle(PLAY_X - 5,        PLAY_Y + PLAY_H/2,   10, PLAY_H, wallOpts),
      Matter.Bodies.rectangle(PLAY_X + PLAY_W + 5, PLAY_Y + PLAY_H/2, 10, PLAY_H, wallOpts),
    ];
    wallsRef.current = walls;
    Matter.World.add(engine.world, walls);

    const activeBallIds = [1, 2, 3, 4, 8];
    createBalls(engine, activeBallIds);
    createCueBall(engine);

    Matter.Events.on(engine, 'collisionStart', (event) => {
      event.pairs.forEach(pair => {
        const { bodyA, bodyB } = pair;
        if (bodyA.label === 'wall' || bodyB.label === 'wall') {
          setGameState(prev => ({ ...prev, bounceCount: prev.bounceCount + 1 }));
        }
        checkPockets(bodyA, bodyB);
      });
    });

    Matter.Runner.run(runner, engine);
    startRenderLoop(engine);

    return () => {
      cancelAnimationFrame(frameRef.current);
      Matter.Runner.stop(runner);
      Matter.Engine.clear(engine);
    };
  }, []);

  // ── CREAR BOLAS ─────────────────────────────────────────────
  const createBalls = (engine: Matter.Engine, ballIds: number[]) => {
    const positions = getRackPositions(ballIds);
    positions.forEach(({ id, x, y }) => {
      const body = Matter.Bodies.circle(x, y, BALL_R, {
        restitution: 0.92,
        friction: 0.005,
        frictionAir: 0.018,
        density: 0.002,
        label: `ball_${id}`,
      });
      (body as any).ballId = id;
      bodiesRef.current.set(id, body);
      Matter.World.add(engine.world, body);
    });
  };

  const createCueBall = (engine: Matter.Engine) => {
    const cx = PLAY_X + PLAY_W * 0.25;
    const cy = PLAY_Y + PLAY_H / 2;
    const body = Matter.Bodies.circle(cx, cy, BALL_R, {
      restitution: 0.92,
      friction: 0.005,
      frictionAir: 0.02,
      density: 0.002,
      label: 'ball_0',
    });
    (body as any).ballId = 0;
    bodiesRef.current.set(0, body);
    Matter.World.add(engine.world, body);
  };

  // ── TRONERAS ────────────────────────────────────────────────
  const checkPockets = useCallback((bodyA: Matter.Body, bodyB: Matter.Body) => {
    [bodyA, bodyB].forEach(body => {
      if (!body.label.startsWith('ball_')) return;
      const ballId = (body as any).ballId as number;
      POCKETS.forEach(pocket => {
        const dx = body.position.x - pocket.x;
        const dy = body.position.y - pocket.y;
        if (Math.sqrt(dx * dx + dy * dy) < POCKET_R + BALL_R) {
          pocketBall(ballId, body);
        }
      });
    });
  }, []);

  const pocketBall = (ballId: number, body: Matter.Body) => {
    if (ballId === 0) {
      Matter.Body.setPosition(body, { x: PLAY_X + PLAY_W * 0.25, y: PLAY_Y + PLAY_H / 2 });
      Matter.Body.setVelocity(body, { x: 0, y: 0 });
      return;
    }
    Matter.World.remove(engineRef.current!.world, body);
    bodiesRef.current.delete(ballId);

    setGameState(prev => {
      const basePoints  = BALL_POINTS[ballId] ?? 100;
      const bounceMult  = prev.bounceCount >= 3 ? 4 : prev.bounceCount === 2 ? 3 : prev.bounceCount === 1 ? 2 : 1;
      const newChain    = prev.chainCount + 1;
      const chainMult   = newChain >= 3 ? 2.5 : newChain === 2 ? 1.5 : 1;
      const earned      = Math.round(basePoints * bounceMult * chainMult);
      return { ...prev, score: prev.score + earned, chainCount: newChain, phase: 'waiting' };
    });
  };

  // ── LOOP DE RENDER ───────────────────────────────────────────
  const startRenderLoop = (engine: Matter.Engine) => {
    const loop = () => {
      const newBalls: BallState[] = [];
      bodiesRef.current.forEach((body, id) => {
        newBalls.push({ id, x: body.position.x, y: body.position.y, radius: BALL_R, pocketed: false });
      });
      setBalls([...newBalls]);

      const allStopped = Array.from(bodiesRef.current.values()).every(b =>
        Math.abs(b.velocity.x) < 0.1 && Math.abs(b.velocity.y) < 0.1
      );
      if (allStopped) {
        setGameState(prev => prev.phase === 'shooting' ? { ...prev, phase: 'aiming', bounceCount: 0 } : prev);
      }
      frameRef.current = requestAnimationFrame(loop);
    };
    frameRef.current = requestAnimationFrame(loop);
  };

  // ── APUNTADO Y DISPARO ───────────────────────────────────────
  const cueBallPos = useCallback((): { x: number; y: number } | null => {
    const body = bodiesRef.current.get(0);
    return body ? { x: body.position.x, y: body.position.y } : null;
  }, []);

  const panResponder = useRef(
    PanResponder.create({
      onStartShouldSetPanResponder: () => true,
      onPanResponderGrant: (e: GestureResponderEvent) => {
        const { locationX, locationY } = e.nativeEvent;
        setAimStart({ x: locationX, y: locationY });
        setAimEnd({ x: locationX, y: locationY });
      },
      onPanResponderMove: (e: GestureResponderEvent) => {
        const { locationX, locationY } = e.nativeEvent;
        setAimEnd({ x: locationX, y: locationY });
      },
      onPanResponderRelease: (e: GestureResponderEvent) => {
        const { locationX, locationY } = e.nativeEvent;
        shootCueBall(locationX, locationY);
        setAimStart(null);
        setAimEnd(null);
      },
    })
  ).current;

  const shootCueBall = (releaseX: number, releaseY: number) => {
    const cue = bodiesRef.current.get(0);
    if (!cue || !aimStart) return;

    setGameState(prev => {
      if (prev.phase !== 'aiming' || prev.shots <= 0) return prev;
      return { ...prev, shots: prev.shots - 1, chainCount: 0, bounceCount: 0, phase: 'shooting' };
    });

    const dx = aimStart.x - releaseX;
    const dy = aimStart.y - releaseY;
    const dist = Math.sqrt(dx * dx + dy * dy);
    if (dist < 5) return;

    const power = Math.min(dist * 0.06, 15);
    Matter.Body.setVelocity(cue, { x: (dx / dist) * power, y: (dy / dist) * power });
  };

  // ── HUD ──────────────────────────────────────────────────────
  const renderHUD = () => (
    <View style={styles.hud}>
      <View style={styles.hudLeft}>
        <Text style={styles.hudLabel}>RONDA</Text>
        <Text style={[styles.hudValue, { color: COLORS.accent }]}>{gameState.round}</Text>
      </View>
      <View style={styles.hudCenter}>
        <Text style={styles.hudLabel}>PUNTOS</Text>
        <Text style={[styles.hudValue, { color: COLORS.gold }]}>{gameState.score}</Text>
        <Text style={styles.hudSub}>META: {gameState.threshold}</Text>
      </View>
      <View style={styles.hudRight}>
        <Text style={styles.hudLabel}>TIROS</Text>
        <View style={styles.shotsRow}>
          {Array.from({ length: gameState.maxShots }).map((_, i) => (
            <View key={i} style={[styles.shotDot, { backgroundColor: i < gameState.shots ? COLORS.green : '#333' }]} />
          ))}
        </View>
      </View>
      <View style={styles.hudCoins}>
        <Text style={styles.hudLabel}>💰</Text>
        <Text style={[styles.hudValue, { color: COLORS.gold }]}>{gameState.coins}</Text>
      </View>
    </View>
  );

  // ── LÍNEA DE GUÍA ────────────────────────────────────────────
  const renderAimLine = () => {
    if (!aimStart || !aimEnd) return null;
    const cue = cueBallPos();
    if (!cue) return null;

    const dx = aimStart.x - aimEnd.x;
    const dy = aimStart.y - aimEnd.y;
    const dist = Math.sqrt(dx * dx + dy * dy);
    if (dist < 5) return null;

    const nx = dx / dist;
    const ny = dy / dist;
    const guideLen = showGuide ? 200 : 80;

    return (
      <>
        {Array.from({ length: 8 }).map((_, i) => {
          const t1 = (i / 8) * guideLen;
          const t2 = ((i + 0.5) / 8) * guideLen;
          return (
            <Line key={i}
              p1={vec(cue.x + nx * t1, cue.y + ny * t1)}
              p2={vec(cue.x + nx * t2, cue.y + ny * t2)}
              color="rgba(255,190,11,0.7)"
              strokeWidth={2}
            />
          );
        })}
        <Circle cx={aimStart.x} cy={aimStart.y} r={Math.min(dist * 0.3, 20)} color="rgba(255,0,110,0.3)" />
      </>
    );
  };

  // ── RENDER ───────────────────────────────────────────────────
  return (
    <View style={styles.container} {...panResponder.panHandlers}>

      {renderHUD()}

      <Canvas style={styles.canvas}>

        {/* Mesa exterior (madera) */}
        <RoundedRect x={TABLE_X - 6} y={TABLE_Y - 6} width={TABLE_W + 12} height={TABLE_H + 12} r={6} color={COLORS.tableBorder} />

        {/* Fieltro */}
        <RoundedRect x={TABLE_X} y={TABLE_Y} width={TABLE_W} height={TABLE_H} r={4} color={COLORS.tableFelt} />

        {/* Bandas */}
        <RoundedRect x={TABLE_X} y={TABLE_Y} width={TABLE_W} height={CUSHION} r={2} color={COLORS.cushion} />
        <RoundedRect x={TABLE_X} y={TABLE_Y + TABLE_H - CUSHION} width={TABLE_W} height={CUSHION} r={2} color={COLORS.cushion} />
        <RoundedRect x={TABLE_X} y={TABLE_Y} width={CUSHION} height={TABLE_H} r={2} color={COLORS.cushion} />
        <RoundedRect x={TABLE_X + TABLE_W - CUSHION} y={TABLE_Y} width={CUSHION} height={TABLE_H} r={2} color={COLORS.cushion} />

        {/* Línea y puntos de referencia */}
        <Line p1={vec(PLAY_X + PLAY_W * 0.33, PLAY_Y)} p2={vec(PLAY_X + PLAY_W * 0.33, PLAY_Y + PLAY_H)} color="rgba(255,255,255,0.08)" strokeWidth={1} />
        <Circle cx={PLAY_X + PLAY_W * 0.33} cy={PLAY_Y + PLAY_H / 2} r={3} color="rgba(255,255,255,0.2)" />
        <Circle cx={PLAY_X + PLAY_W * 0.67} cy={PLAY_Y + PLAY_H / 2} r={3} color="rgba(255,255,255,0.2)" />

        {/* Troneras */}
        {POCKETS.map((p, i) => (
          <React.Fragment key={i}>
            <Circle cx={p.x} cy={p.y} r={POCKET_R + 2} color="#000000" />
            <Circle cx={p.x} cy={p.y} r={POCKET_R} color="#111111" />
            <Circle cx={p.x} cy={p.y} r={POCKET_R - 2} color="rgba(0,0,0,0.8)" />
          </React.Fragment>
        ))}

        {/* Línea de guía */}
        {renderAimLine()}

        {/* Bolas */}
        {balls.map(ball => {
          const color = BALL_COLORS[ball.id] ?? '#ffffff';
          const isRayada = ball.id >= 9 && ball.id <= 15;
          return (
            <React.Fragment key={ball.id}>
              <Circle cx={ball.x + 2} cy={ball.y + 2} r={ball.radius + 3} color="rgba(0,0,0,0.4)" />
              <Circle cx={ball.x} cy={ball.y} r={ball.radius} color={color} />
              {isRayada && (
                <>
                  <Circle cx={ball.x} cy={ball.y} r={ball.radius} color="rgba(255,255,255,0.85)" />
                  <Circle cx={ball.x} cy={ball.y} r={ball.radius * 0.55} color={color} />
                </>
              )}
              {ball.id !== 0 && <Circle cx={ball.x} cy={ball.y} r={ball.radius * 0.38} color="rgba(0,0,0,0.7)" />}
              <Circle cx={ball.x - ball.radius * 0.3} cy={ball.y - ball.radius * 0.3} r={ball.radius * 0.25} color="rgba(255,255,255,0.5)" />
            </React.Fragment>
          );
        })}

        {/* Borde neón de la mesa */}
        <RoundedRect x={TABLE_X} y={TABLE_Y} width={TABLE_W} height={TABLE_H} r={4} color="transparent" style="stroke" strokeWidth={2} />

      </Canvas>

      {gameState.phase === 'shooting' && (
        <View style={styles.phaseOverlay}>
          <Text style={styles.phaseText}>DISPARANDO...</Text>
        </View>
      )}

      {gameState.shots === 0 && gameState.phase === 'aiming' && (
        <View style={styles.gameOverOverlay}>
          <Text style={styles.gameOverTitle}>
            {gameState.score >= gameState.threshold ? '¡RONDA COMPLETADA!' : 'SIN TIROS'}
          </Text>
          <Text style={styles.gameOverScore}>{gameState.score} / {gameState.threshold} pts</Text>
          <TouchableOpacity style={styles.btn} onPress={() => {}}>
            <Text style={styles.btnText}>
              {gameState.score >= gameState.threshold ? 'SIGUIENTE RONDA →' : 'REINTENTAR'}
            </Text>
          </TouchableOpacity>
        </View>
      )}

    </View>
  );
}

// ─── ESTILOS ──────────────────────────────────────────────────
const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: COLORS.bg },
  canvas: { flex: 1, width: W, height: H },
  hud: {
    position: 'absolute', top: 0, left: 0, right: 0, height: MARGIN_V,
    flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
    paddingHorizontal: 16, backgroundColor: 'rgba(6,9,16,0.95)',
    borderBottomWidth: 1, borderBottomColor: COLORS.primary + '44', zIndex: 10,
  },
  hudLeft:   { alignItems: 'center', minWidth: 60 },
  hudCenter: { alignItems: 'center', flex: 1 },
  hudRight:  { alignItems: 'center', minWidth: 100 },
  hudCoins:  { alignItems: 'center', minWidth: 60 },
  hudLabel:  { color: '#888', fontSize: 9, letterSpacing: 2, textTransform: 'uppercase', fontFamily: 'monospace' },
  hudValue:  { fontSize: 20, fontWeight: 'bold', letterSpacing: 1, fontFamily: 'monospace' },
  hudSub:    { color: '#555', fontSize: 9, letterSpacing: 1, fontFamily: 'monospace' },
  shotsRow:  { flexDirection: 'row', gap: 4, marginTop: 2 },
  shotDot:   { width: 10, height: 10, borderRadius: 0 },
  phaseOverlay: { position: 'absolute', bottom: 8, left: 0, right: 0, alignItems: 'center', zIndex: 10 },
  phaseText: { color: COLORS.gold, fontSize: 11, letterSpacing: 3, textTransform: 'uppercase', fontFamily: 'monospace', opacity: 0.8 },
  gameOverOverlay: {
    position: 'absolute', top: 0, left: 0, right: 0, bottom: 0,
    backgroundColor: 'rgba(6,9,16,0.88)', alignItems: 'center', justifyContent: 'center', zIndex: 20,
  },
  gameOverTitle: { color: COLORS.accent, fontSize: 22, fontWeight: 'bold', letterSpacing: 4, textTransform: 'uppercase', fontFamily: 'monospace', marginBottom: 8 },
  gameOverScore: { color: COLORS.gold, fontSize: 16, letterSpacing: 2, fontFamily: 'monospace', marginBottom: 24 },
  btn:     { borderWidth: 2, borderColor: COLORS.accent, paddingHorizontal: 24, paddingVertical: 10, backgroundColor: 'transparent' },
  btnText: { color: COLORS.accent, fontSize: 13, letterSpacing: 3, textTransform: 'uppercase', fontFamily: 'monospace', fontWeight: 'bold' },
});