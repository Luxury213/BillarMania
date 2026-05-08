// ============================================================
// GameScreen.tsx — BillarMania
// Mesa de billar con Matter.js + React Native Skia
// Estética Neon Noir / Pixel Art inspirada en Balatro
// Universidad Santiago de Cali — Computación Móvil 2026
// ============================================================

import {
  Canvas,
  Circle,
  Group,
  Line,
  matchFont,
  Path,
  RoundedRect,
  Skia,
  Text as SkText,
  vec
} from '@shopify/react-native-skia';
import * as ScreenOrientation from 'expo-screen-orientation';
import Matter from 'matter-js';
import React, { useCallback, useEffect, useRef, useState } from 'react';
import { Dimensions, StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { Gesture, GestureDetector, GestureHandlerRootView } from 'react-native-gesture-handler';
import { runOnJS } from 'react-native-reanimated';
import { usePowerups } from '../../hooks/usePowerups';
import ShopScreen from './ShopScreen';

// ─── COLORES ─────────────────────────────────────────────────
const C = {
  primary:     '#3a86ff',
  accent:      '#ff006e',
  purple:      '#8338ec',
  gold:        '#ffbe0b',
  green:       '#00ff88',
  orange:      '#fb5607',
  bg:          '#060910',
  tableFelt:   '#0a2e1a',
  tableBorder: '#4a2800',
  cushion:     '#1a4a25',
};

// ─── DIMENSIONES ─────────────────────────────────────────────
const SCREEN   = Dimensions.get('window');
const W        = Math.max(SCREEN.width, SCREEN.height);
const H        = Math.min(SCREEN.width, SCREEN.height);
const MARGIN_H = W * 0.05;
const MARGIN_V = H * 0.13;
const TABLE_X  = MARGIN_H;
const TABLE_Y  = MARGIN_V;
const TABLE_W  = W - MARGIN_H * 2;
const TABLE_H  = H - MARGIN_V - H * 0.04;
const CUSHION  = 20;
const PLAY_X   = TABLE_X + CUSHION;
const PLAY_Y   = TABLE_Y + CUSHION;
const PLAY_W   = TABLE_W - CUSHION * 2;
const PLAY_H   = TABLE_H - CUSHION * 2;
const POCKET_R = 15;
const BALL_R   = Math.min(PLAY_W, PLAY_H) * 0.036;
const CUE_LEN  = BALL_R * 14;
const CUE_W    = 5;

// ─── BOLAS ───────────────────────────────────────────────────
const BALL_COLORS: Record<number, string> = {
  0:  '#ffffff',
  1:  '#ffbe0b', 2:  '#3a86ff', 3:  '#ff006e',
  4:  '#8338ec', 5:  '#fb5607', 6:  '#00ff88', 7:  '#c2410c',
  8:  '#222222',
  9:  '#ffbe0b', 10: '#3a86ff', 11: '#ff006e',
  12: '#8338ec', 13: '#fb5607', 14: '#00ff88', 15: '#c2410c',
};
const BALL_POINTS: Record<number, number> = { 8: 300 };
for (let i = 1; i <= 7; i++) BALL_POINTS[i] = 100;
for (let i = 9; i <= 15; i++) BALL_POINTS[i] = 150;

// ─── TRONERAS ────────────────────────────────────────────────
const POCKETS = [
  { x: PLAY_X,             y: PLAY_Y             },
  { x: PLAY_X + PLAY_W/2,  y: PLAY_Y - 4         },
  { x: PLAY_X + PLAY_W,    y: PLAY_Y             },
  { x: PLAY_X,             y: PLAY_Y + PLAY_H    },
  { x: PLAY_X + PLAY_W/2,  y: PLAY_Y + PLAY_H + 4 },
  { x: PLAY_X + PLAY_W,    y: PLAY_Y + PLAY_H    },
];

// ─── TIPOS ───────────────────────────────────────────────────
interface BallState    { id: number; x: number; y: number }
interface FloatingText { id: number; text: string; x: number; y: number; opacity: number; vy: number }
interface PocketFlash  { id: number; x: number; y: number; r: number; opacity: number; color: string }

// ─── RACK ────────────────────────────────────────────────────
function getRackPositions(ballIds: number[]) {
  const cx   = PLAY_X + PLAY_W * 0.67;
  const cy   = PLAY_Y + PLAY_H / 2;
  const rows = [[0],[1,2],[3,8,4],[5,6,7,9],[10,11,12,13,14]];
  const out: { id: number; x: number; y: number }[] = [];
  let idx = 0;
  rows.forEach((row, r) => {
    row.forEach((_, c) => {
      if (idx >= ballIds.length) return;
      out.push({
        id: ballIds[idx++],
        x:  cx + r * BALL_R * 2.05,
        y:  cy + (c - (row.length - 1) / 2) * BALL_R * 2.05,
      });
    });
  });
  return out;
}

// ─── FUENTE SKIA ─────────────────────────────────────────────
const fontStyle = { fontFamily: 'monospace', fontSize: BALL_R * 0.9, fontWeight: 'bold' } as const;
const skFont    = matchFont(fontStyle);

// ─── COMPONENTE ──────────────────────────────────────────────
export default function GameScreen({ onSalir }: { onSalir?: () => void }) {
  const engineRef    = useRef<Matter.Engine | null>(null);
  const runnerRef    = useRef<Matter.Runner | null>(null);
  const bodiesRef    = useRef<Map<number, Matter.Body>>(new Map());
  const frameRef     = useRef<number>(0);
  const loopActiveRef = useRef(false);
  const aimStartRef  = useRef<{ x: number; y: number } | null>(null);
  const phaseRef     = useRef<'aiming' | 'shooting'>('aiming');
  const floatIdRef   = useRef(0);
  const flashIdRef   = useRef(0);

  const [balls,         setBalls]         = useState<BallState[]>([]);
  const [phase,         setPhase]         = useState<'aiming' | 'shooting' | 'roundOver'>('aiming');
  const [aimStart,      setAimStart]      = useState<{ x: number; y: number } | null>(null);
  const [aimEnd,        setAimEnd]        = useState<{ x: number; y: number } | null>(null);
  const [floatingTexts, setFloatingTexts] = useState<FloatingText[]>([]);
  const [pocketFlashes, setPocketFlashes] = useState<PocketFlash[]>([]);
  const [showShop,      setShowShop]      = useState(false);

  // ── POTENCIADORES ─────────────────────────────────────────
  const { activePower, activeId, buyAndActivate, consume, cancel } = usePowerups();
  const [gameState,     setGameState]     = useState({
    score: 0, round: 1, shots: 6, maxShots: 6,
    threshold: 500, coins: 150, chainCount: 0, bounceCount: 0,
  });

  // ── LOOP (una sola instancia) ──────────────────────────────
  // sessionId evita que un loop antiguo siga corriendo tras reiniciar ronda.
  // Sin esto, cancelAnimationFrame no garantiza detención inmediata y puede
  // haber dos loops activos al mismo tiempo durante el primer frame.
  const loopSessionRef = useRef(0);

  const startLoop = useCallback(() => {
    if (loopActiveRef.current) return;
    loopActiveRef.current = true;
    const sessionId = ++loopSessionRef.current;

    const loop = () => {
      if (!loopActiveRef.current || loopSessionRef.current !== sessionId) return;

      // Sync bolas desde Matter
      const newBalls: BallState[] = [];
      bodiesRef.current.forEach((body, id) => {
        newBalls.push({ id, x: body.position.x, y: body.position.y });
      });
      setBalls([...newBalls]);

      // Detectar parada
      const allStop = Array.from(bodiesRef.current.values()).every(
        b => Math.abs(b.velocity.x) < 0.12 && Math.abs(b.velocity.y) < 0.12
      );
      if (allStop && phaseRef.current === 'shooting') {
        phaseRef.current = 'aiming';
        setGameState(prev => {
          const nextPhase = prev.shots <= 0 ? 'roundOver' : 'aiming';
          setPhase(nextPhase);
          return { ...prev, bounceCount: 0, chainCount: 0 };
        });
      }

      // Detección de troneras por distancia (las troneras no tienen cuerpo físico)
      checkPocketsInLoop();

      // Animar textos flotantes
      setFloatingTexts(prev =>
        prev
          .map(t  => ({ ...t, y: t.y + t.vy, opacity: t.opacity - 0.018 }))
          .filter(t => t.opacity > 0)
      );

      // Animar flashes de tronera
      setPocketFlashes(prev =>
        prev
          .map(f  => ({ ...f, r: f.r + 1.5, opacity: f.opacity - 0.06 }))
          .filter(f => f.opacity > 0)
      );

      frameRef.current = requestAnimationFrame(loop);
    };
    frameRef.current = requestAnimationFrame(loop);
  }, []);

  // ── TRONERAS ─────────────────────────────────────────────
  // Llamada desde el loop de animación, no desde collisionStart.
  // Las troneras son zonas vacías (sin cuerpo físico), por eso
  // la detección debe ser por distancia en el loop, no por evento.
  const checkPocketsInLoop = useCallback(() => {
    if (!engineRef.current) return;

    bodiesRef.current.forEach((body, ballId) => {
      for (const p of POCKETS) {
        const dx = body.position.x - p.x;
        const dy = body.position.y - p.y;
        if (Math.sqrt(dx * dx + dy * dy) >= POCKET_R + BALL_R * 0.75) continue;

        if (ballId === 0) {
          // Foul — eliminamos el body y creamos uno nuevo en posición de saque.
          // setPosition sobre un body que colisionó deja el motor inconsistente;
          // remove + create es la solución correcta.
          Matter.World.remove(engineRef.current!.world, body);
          const newCue = Matter.Bodies.circle(
            PLAY_X + PLAY_W * 0.25, PLAY_Y + PLAY_H / 2, BALL_R,
            { restitution: 0.92, friction: 0.005, frictionAir: 0.02,
              density: 0.002, label: 'ball_0' }
          );
          (newCue as any).ballId = 0;
          Matter.World.add(engineRef.current!.world, newCue);
          bodiesRef.current.set(0, newCue);
          phaseRef.current = 'aiming';
          setPhase('aiming');
          return;
        }

        // Bola numerada — sacarla del mundo
        Matter.World.remove(engineRef.current!.world, body);
        bodiesRef.current.delete(ballId);

        const isStripe   = ballId >= 9 && ballId <= 15;
        const flashColor = isStripe ? 'rgba(180,120,255,' : 'rgba(255,190,11,';

        setPocketFlashes(prev => [...prev, {
          id: flashIdRef.current++,
          x: p.x, y: p.y, r: POCKET_R,
          opacity: 1,
          color: flashColor,
        }]);

        setGameState(prev => {
          const base      = BALL_POINTS[ballId] ?? 100;
          const bMult     = prev.bounceCount >= 3 ? 4
                          : prev.bounceCount === 2 ? 3
                          : prev.bounceCount === 1 ? 2 : 1;
          const newChain  = prev.chainCount + 1;
          const cMult     = newChain >= 3 ? 2.5 : newChain === 2 ? 1.5 : 1;
          // Multiplicador de potenciador activo (se resetea tras usarse en disparo)
          const pMult     = prev.activePowerMult ?? 1.0;
          const earned    = Math.round(base * bMult * cMult * pMult);
          const coinBonus = Math.floor(earned / 50);

          const label = bMult > 1 || cMult > 1
            ? `+${earned} ×${(bMult * cMult).toFixed(1)}`
            : `+${earned}`;

          setFloatingTexts(ft => [...ft, {
            id: floatIdRef.current++,
            text: label, x: p.x, y: p.y - 20, opacity: 1, vy: -1.2,
          }]);

          // Abrimos la tienda después de cada bola embocada
          // para que el jugador pueda comprar un potenciador
          setTimeout(() => setShowShop(true), 350);

          return {
            ...prev,
            score:           prev.score + earned,
            coins:           prev.coins + coinBonus,
            chainCount:      newChain,
            activePowerMult: 1.0, // resetear tras aplicar
          };
        });

        break; // una tronera por frame por bola es suficiente
      }
    });
  }, []);

  // ── INICIALIZAR ────────────────────────────────────────────
  const initRound = useCallback((round: number, prevCoins: number, prevScore: number) => {
    // Detener loop y limpiar motor anterior
    loopActiveRef.current = false;
    cancelAnimationFrame(frameRef.current);

    if (engineRef.current) {
      Matter.Events.off(engineRef.current, 'collisionStart');
      Matter.Runner.stop(runnerRef.current!);
      Matter.Engine.clear(engineRef.current);
      bodiesRef.current.clear();
    }

    const engine = Matter.Engine.create({ gravity: { x: 0, y: 0 } });
    const runner = Matter.Runner.create();
    engineRef.current = engine;
    runnerRef.current = runner;

    const wo = { isStatic: true, restitution: 0.85, friction: 0, label: 'wall' };
    Matter.World.add(engine.world, [
      Matter.Bodies.rectangle(PLAY_X + PLAY_W/2, PLAY_Y - 5,           PLAY_W, 10, wo),
      Matter.Bodies.rectangle(PLAY_X + PLAY_W/2, PLAY_Y + PLAY_H + 5,  PLAY_W, 10, wo),
      Matter.Bodies.rectangle(PLAY_X - 5,        PLAY_Y + PLAY_H/2,    10, PLAY_H, wo),
      Matter.Bodies.rectangle(PLAY_X + PLAY_W+5, PLAY_Y + PLAY_H/2,    10, PLAY_H, wo),
    ]);

    const ballCount = Math.min(4 + round, 15);
    const ids = [1,2,3,4,5,6,7,9,10,11,12,13,14,15,8].slice(0, ballCount);
    if (ballCount >= 5) {
      const pos8 = ids.indexOf(8);
      if (pos8 !== -1 && pos8 !== 4) {
        [ids[4], ids[pos8]] = [ids[pos8], ids[4]];
      }
    }

    getRackPositions(ids).forEach(({ id, x, y }) => {
      const body = Matter.Bodies.circle(x, y, BALL_R, {
        restitution: 0.92, friction: 0.005,
        frictionAir: 0.018, density: 0.002, label: `ball_${id}`,
      });
      (body as any).ballId = id;
      bodiesRef.current.set(id, body);
      Matter.World.add(engine.world, body);
    });

    // Bola blanca
    const cue = Matter.Bodies.circle(PLAY_X + PLAY_W * 0.25, PLAY_Y + PLAY_H/2, BALL_R, {
      restitution: 0.92, friction: 0.005,
      frictionAir: 0.02, density: 0.002, label: 'ball_0',
    });
    (cue as any).ballId = 0;
    bodiesRef.current.set(0, cue);
    Matter.World.add(engine.world, cue);

    // Solo contamos rebotes de la bola blanca contra paredes
    Matter.Events.on(engine, 'collisionStart', (event) => {
      event.pairs.forEach(({ bodyA, bodyB }) => {
        const hitWall = bodyA.label === 'wall' || bodyB.label === 'wall';
        const cueBallInvolved = bodyA.label === 'ball_0' || bodyB.label === 'ball_0';
        if (hitWall && cueBallInvolved) {
          setGameState(prev => ({ ...prev, bounceCount: prev.bounceCount + 1 }));
        }
      });
    });

    Matter.Runner.run(runner, engine);

    const maxShots  = Math.max(6 - Math.floor(round / 2), 3);
    const threshold = Math.round(500 * Math.pow(1.6, round - 1));
    phaseRef.current = 'aiming';
    setPhase('aiming');
    setGameState({
      score: prevScore, round, shots: maxShots, maxShots,
      threshold, coins: prevCoins, chainCount: 0, bounceCount: 0,
      activePowerMult: 1.0,
    });
    setFloatingTexts([]);
    setPocketFlashes([]);
  }, [checkPocketsInLoop]);

  useEffect(() => {
    ScreenOrientation.lockAsync(ScreenOrientation.OrientationLock.LANDSCAPE_LEFT);
    initRound(1, 150, 0);
    startLoop();
    return () => {
      loopActiveRef.current = false;
      cancelAnimationFrame(frameRef.current);
      if (runnerRef.current) Matter.Runner.stop(runnerRef.current);
      if (engineRef.current) {
        Matter.Events.off(engineRef.current, 'collisionStart');
        Matter.Engine.clear(engineRef.current);
      }
      ScreenOrientation.unlockAsync();
    };
  }, []);

  // ── DISPARO ───────────────────────────────────────────────
  const handleAimStart = (x: number, y: number) => {
    if (phaseRef.current !== 'aiming') return;
    aimStartRef.current = { x, y };
    setAimStart({ x, y });
    setAimEnd({ x, y });
  };

  const handleAimMove = (x: number, y: number) => {
    if (!aimStartRef.current) return;
    setAimEnd({ x, y });
  };

  const handleAimEnd = (rx: number, ry: number) => {
    const cue   = bodiesRef.current.get(0);
    const start = aimStartRef.current;
    if (!cue || !start || phaseRef.current !== 'aiming') {
      aimStartRef.current = null;
      setAimStart(null);
      setAimEnd(null);
      return;
    }

    setGameState(prev => {
      if (prev.shots <= 0) return prev;
      return { ...prev, shots: prev.shots - 1 };
    });

    phaseRef.current = 'shooting';

    // ── Consumir potenciador activo ───────────────────────────
    const activatedPower = consume();

    const dx   = start.x - rx;
    const dy   = start.y - ry;
    const dist = Math.sqrt(dx*dx + dy*dy);
    if (dist > 5) {
      // Velocidad base escalada por el multiplicador del poder
      const speedMult = activatedPower?.speedMult ?? 1.0;
      let vx = (dx/dist) * Math.min(dist * 0.055, 14) * speedMult;
      let vy = (dy/dist) * Math.min(dist * 0.055, 14) * speedMult;

      // VIENTO: añade componente perpendicular para curvar el tiro
      if (activatedPower?.curveShot) {
        const curveMag = Math.min(dist * 0.055, 14) * 0.35;
        // perpendicular al vector de disparo (rotación 90°)
        vx += -vy / Math.sqrt(vx*vx + vy*vy) * curveMag;
        vy +=  vx / Math.sqrt(vx*vx + vy*vy) * curveMag;
      }

      Matter.Body.setVelocity(cue, { x: vx, y: vy });

      // HIELO: ralentiza todas las bolas del rack al disparar
      if (activatedPower?.slowBalls) {
        bodiesRef.current.forEach((body, id) => {
          if (id === 0) return; // no frenar la bola blanca
          Matter.Body.setVelocity(body, {
            x: body.velocity.x * 0.4,
            y: body.velocity.y * 0.4,
          });
          // también reducir frictionAir temporalmente para simular efecto hielo
          Matter.Body.set(body, { frictionAir: 0.008 });
        });
      }

      // Guardar multiplicador de puntos activo en el estado del juego
      if (activatedPower) {
        setGameState(prev => ({
          ...prev,
          activePowerMult: activatedPower.pointsMult,
        }));
      }
    }

    aimStartRef.current = null;
    setAimStart(null);
    setAimEnd(null);
  };

  const gesture = Gesture.Pan()
    .onBegin(e  => runOnJS(handleAimStart)(e.x, e.y))
    .onUpdate(e => runOnJS(handleAimMove)(e.x, e.y))
    .onEnd(e    => runOnJS(handleAimEnd)(e.x, e.y));

  // ── CUEBALL POS ───────────────────────────────────────────
  const getCueBall = () => {
    const b = bodiesRef.current.get(0);
    return b ? b.position : null;
  };

  // ── RENDER ────────────────────────────────────────────────
  const cp     = getCueBall();
  const hasAim = aimStart && aimEnd && cp;

  let aimDx = 0, aimDy = 0, aimDist = 0;
  if (hasAim) {
    aimDx   = aimStart!.x - aimEnd!.x;
    aimDy   = aimStart!.y - aimEnd!.y;
    aimDist = Math.sqrt(aimDx*aimDx + aimDy*aimDy);
    if (aimDist > 0) { aimDx /= aimDist; aimDy /= aimDist; }
  }

  const roundOver = phase === 'roundOver';

  return (
    <GestureHandlerRootView style={styles.container}>

      {/* ── HUD ── */}
      <View style={styles.hud}>
        <View style={styles.hudBlock}>
          <Text style={styles.hudLabel}>RONDA</Text>
          <Text style={[styles.hudVal, { color: C.accent }]}>{gameState.round}</Text>
        </View>

        <View style={styles.hudSep} />

        <View style={styles.hudBlock}>
          <Text style={styles.hudLabel}>PUNTOS</Text>
          <Text style={[styles.hudVal, { color: C.gold }]}>{gameState.score}</Text>
          <Text style={styles.hudSub}>META {gameState.threshold}</Text>
        </View>

        {/* Barra de progreso hacia la meta */}
        <View style={styles.progressBar}>
          <View style={[
            styles.progressFill,
            { width: `${Math.min(100, (gameState.score / gameState.threshold) * 100)}%` }
          ]} />
        </View>

        <View style={styles.hudSep} />

        <View style={styles.hudBlock}>
          <Text style={styles.hudLabel}>TIROS</Text>
          <View style={styles.shotsRow}>
            {Array.from({ length: gameState.maxShots }).map((_, i) => (
              <View key={i} style={[
                styles.shotDot,
                { backgroundColor: i < gameState.shots ? C.green : '#2a2a2a' }
              ]} />
            ))}
          </View>
        </View>

        <View style={styles.hudSep} />

        <View style={styles.hudBlock}>
          <Text style={styles.hudLabel}>MONEDAS</Text>
          <Text style={[styles.hudVal, { color: C.gold }]}>
            🪙 {gameState.coins}
          </Text>
        </View>

        {/* Indicador de poder activo */}
        {activePower && (
          <View style={styles.powerIndicator}>
            <Text style={styles.powerEmoji}>{activePower.emoji}</Text>
            <Text style={styles.powerLabel}>{activePower.name}</Text>
          </View>
        )}

        {onSalir && (
          <TouchableOpacity
            onPress={() => {
              ScreenOrientation.unlockAsync();
              onSalir();
            }}
            style={styles.exitBtn}
          >
            <Text style={styles.exitText}>✕</Text>
          </TouchableOpacity>
        )}
      </View>

      {/* ── MESA ── */}
      <GestureDetector gesture={gesture}>
        <View style={styles.canvas}>
          <Canvas style={StyleSheet.absoluteFill}>

            {/* Madera exterior */}
            <RoundedRect
              x={TABLE_X-8} y={TABLE_Y-8}
              width={TABLE_W+16} height={TABLE_H+16}
              r={8} color={C.tableBorder}
            />
            {/* Fieltro */}
            <RoundedRect
              x={TABLE_X} y={TABLE_Y}
              width={TABLE_W} height={TABLE_H}
              r={4} color={C.tableFelt}
            />
            {/* Bandas */}
            <RoundedRect x={TABLE_X} y={TABLE_Y} width={TABLE_W} height={CUSHION} r={3} color={C.cushion} />
            <RoundedRect x={TABLE_X} y={TABLE_Y+TABLE_H-CUSHION} width={TABLE_W} height={CUSHION} r={3} color={C.cushion} />
            <RoundedRect x={TABLE_X} y={TABLE_Y} width={CUSHION} height={TABLE_H} r={3} color={C.cushion} />
            <RoundedRect x={TABLE_X+TABLE_W-CUSHION} y={TABLE_Y} width={CUSHION} height={TABLE_H} r={3} color={C.cushion} />

            {/* Línea de saque */}
            <Line
              p1={vec(PLAY_X + PLAY_W*0.33, PLAY_Y)}
              p2={vec(PLAY_X + PLAY_W*0.33, PLAY_Y+PLAY_H)}
              color="rgba(255,255,255,0.07)" strokeWidth={1}
            />
            <Circle
              cx={PLAY_X+PLAY_W*0.33} cy={PLAY_Y+PLAY_H/2}
              r={4} color="rgba(255,255,255,0.15)"
            />

            {/* Troneras — con borde neón */}
            {POCKETS.map((p, i) => (
              <React.Fragment key={i}>
                <Circle cx={p.x} cy={p.y} r={POCKET_R+6} color="rgba(0,255,136,0.08)" />
                <Circle cx={p.x} cy={p.y} r={POCKET_R+4} color="#050505" />
                <Circle cx={p.x} cy={p.y} r={POCKET_R}   color="#0d0d0d" />
              </React.Fragment>
            ))}

            {/* Flashes de tronera - ✅ CORREGIDO: sin paréntesis extra */}
            {pocketFlashes.map(f => (
              <Circle
                key={f.id} cx={f.x} cy={f.y} r={f.r}
                color={`${f.color}${f.opacity.toFixed(2)}`}
              />
            ))}

            {/* Línea de guía — más segmentos, degradado más suave */}
            {hasAim && aimDist > 8 && Array.from({ length: 16 }).map((_, i) => {
              const t1    = BALL_R + (i/16) * PLAY_W * 0.55;
              const t2    = BALL_R + ((i+0.4)/16) * PLAY_W * 0.55;
              const alpha = Math.max(0, 0.75 - i * 0.048);
              return (
                <Line key={i}
                  p1={vec(cp!.x + aimDx*t1, cp!.y + aimDy*t1)}
                  p2={vec(cp!.x + aimDx*t2, cp!.y + aimDy*t2)}
                  color={`rgba(255,190,11,${alpha.toFixed(2)})`}
                  strokeWidth={2}
                />
              );
            })}

            {/* Taco */}
            {hasAim && aimDist > 8 && cp && (() => {
              const gap   = BALL_R + 6 + Math.min(aimDist * 0.15, 20);
              const x1    = cp.x - aimDx * gap;
              const y1    = cp.y - aimDy * gap;
              const x2    = cp.x - aimDx * (gap + CUE_LEN);
              const y2    = cp.y - aimDy * (gap + CUE_LEN);
              const perpX = -aimDy;
              const perpY =  aimDx;
              const tipW  = CUE_W * 0.4;
              const buttW = CUE_W * 1.6;
              const path  = Skia.Path.Make();
              path.moveTo(x1 + perpX*tipW,  y1 + perpY*tipW);
              path.lineTo(x1 - perpX*tipW,  y1 - perpY*tipW);
              path.lineTo(x2 - perpX*buttW, y2 - perpY*buttW);
              path.lineTo(x2 + perpX*buttW, y2 + perpY*buttW);
              path.close();
              return (
                <Group>
                  <Path path={path} color="#8B5E3C" />
                  <Circle cx={x1} cy={y1} r={tipW} color="#c8a97a" />
                </Group>
              );
            })()}

            {/* Bolas */}
            {balls.map(ball => {
              const color    = BALL_COLORS[ball.id] ?? '#fff';
              const isStripe = ball.id >= 9 && ball.id <= 15;
              const is8ball  = ball.id === 8;
              const label    = ball.id === 0 ? '' : String(ball.id);
              const fontSize = BALL_R * 0.85;
              const textX    = ball.x - (label.length > 1 ? fontSize*0.6 : fontSize*0.3);
              const textY    = ball.y + fontSize * 0.35;

              return (
                <React.Fragment key={ball.id}>
                  {/* Sombra */}
                  <Circle cx={ball.x+2} cy={ball.y+3} r={BALL_R+1} color="rgba(0,0,0,0.4)" />

                  {/* Halo dorado bola 8 */}
                  {is8ball && (
                    <Circle cx={ball.x} cy={ball.y} r={BALL_R+3} color="rgba(255,190,11,0.18)" />
                  )}

                  {/* Cuerpo */}
                  <Circle cx={ball.x} cy={ball.y} r={BALL_R} color={color} />

                  {/* Banda rayada */}
                  {isStripe && (
                    <>
                      <Circle cx={ball.x} cy={ball.y} r={BALL_R}      color="rgba(255,255,255,0.88)" />
                      <Circle cx={ball.x} cy={ball.y} r={BALL_R*0.58} color={color} />
                    </>
                  )}

                  {/* Círculo del número */}
                  {ball.id !== 0 && (
                    <>
                      <Circle cx={ball.x} cy={ball.y} r={BALL_R*0.42} color="rgba(255,255,255,0.92)" />
                      {skFont && (
                        <SkText x={textX} y={textY} text={label} font={skFont} color="#111" />
                      )}
                    </>
                  )}

                  {/* Brillo */}
                  <Circle
                    cx={ball.x - BALL_R*0.28} cy={ball.y - BALL_R*0.28}
                    r={BALL_R*0.22} color="rgba(255,255,255,0.55)"
                  />
                </React.Fragment>
              );
            })}

            {/* Textos flotantes */}
            {floatingTexts.map(t => skFont && (
              <SkText
                key={t.id} x={t.x - 20} y={t.y} text={t.text} font={skFont}
                color={`rgba(255,190,11,${Math.min(t.opacity, 1).toFixed(2)})`}
              />
            ))}

          </Canvas>
        </View>
      </GestureDetector>

      {/* ── TIENDA DE POTENCIADORES ── */}
      {showShop && !roundOver && (
        <ShopScreen
          coins={gameState.coins}
          activePower={activePower}
          onBuy={(id) => {
            return buyAndActivate(id, gameState.coins, (amount) => {
              setGameState(prev => ({ ...prev, coins: prev.coins - amount }));
            });
          }}
          onClose={() => setShowShop(false)}
        />
      )}

      {/* ── OVERLAY FIN DE RONDA ── */}
      {roundOver && (
        <View style={styles.overlay}>
          <Text style={styles.overlayTitle}>
            {gameState.score >= gameState.threshold ? '¡RONDA SUPERADA!' : 'SIN TIROS'}
          </Text>
          <Text style={styles.overlayScore}>
            {gameState.score} / {gameState.threshold} pts
          </Text>
          {gameState.score >= gameState.threshold ? (
            <TouchableOpacity
              style={styles.overlayBtn}
              onPress={() => {
                const coinsBonus = gameState.shots * 15;
                initRound(gameState.round + 1, gameState.coins + coinsBonus, gameState.score);
                startLoop();
              }}
            >
              <Text style={styles.overlayBtnText}>SIGUIENTE RONDA →</Text>
            </TouchableOpacity>
          ) : (
            <TouchableOpacity
              style={[styles.overlayBtn, { borderColor: C.primary }]}
              onPress={() => {
                initRound(gameState.round, gameState.coins, gameState.score);
                startLoop();
              }}
            >
              <Text style={[styles.overlayBtnText, { color: C.primary }]}>REINTENTAR</Text>
            </TouchableOpacity>
          )}
        </View>
      )}

    </GestureHandlerRootView>
  );
}

// ─── ESTILOS ─────────────────────────────────────────────────
const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: C.bg },
  canvas:    { flex: 1 },

  hud: {
    position: 'absolute', top: 0, left: 0, right: 0, height: MARGIN_V,
    flexDirection: 'row', alignItems: 'center', justifyContent: 'space-around',
    paddingHorizontal: 12, backgroundColor: 'rgba(6,9,16,0.96)',
    borderBottomWidth: 1, borderBottomColor: C.primary + '33', zIndex: 10,
  },
  hudBlock:  { alignItems: 'center' },
  hudSep:    { width: 1, height: '40%', backgroundColor: 'rgba(255,255,255,0.07)' },
  hudLabel:  { color: '#555', fontSize: 8, letterSpacing: 2, textTransform: 'uppercase' },
  hudVal:    { fontSize: 18, fontWeight: 'bold', letterSpacing: 1 },
  hudSub:    { color: '#444', fontSize: 8, letterSpacing: 1 },
  shotsRow:  { flexDirection: 'row', gap: 3, marginTop: 3 },
  shotDot:   { width: 9, height: 9, borderRadius: 1 },
  exitBtn:   { padding: 8 },
  exitText:  { color: '#555', fontSize: 16 },

  progressBar: {
    width: 60, height: 4, backgroundColor: '#1a1a2e',
    borderRadius: 2, overflow: 'hidden', marginTop: 4,
  },
  progressFill: {
    height: '100%', backgroundColor: C.green,
    borderRadius: 2,
  },

  overlay: {
    position: 'absolute', top: 0, left: 0, right: 0, bottom: 0,
    backgroundColor: 'rgba(6,9,16,0.92)',
    alignItems: 'center', justifyContent: 'center', zIndex: 20,
  },
  overlayTitle: {
    color: C.accent, fontSize: 24, fontWeight: 'bold',
    letterSpacing: 4, textTransform: 'uppercase', marginBottom: 8,
  },
  overlayScore: {
    color: C.gold, fontSize: 16, letterSpacing: 2, marginBottom: 28,
  },
  overlayBtn: {
    borderWidth: 2, borderColor: C.accent,
    paddingHorizontal: 28, paddingVertical: 12,
  },
  overlayBtnText: {
    color: C.accent, fontSize: 14, letterSpacing: 3,
    textTransform: 'uppercase', fontWeight: 'bold',
  },

  // ── Potenciador activo en HUD ──
  powerIndicator: {
    flexDirection: 'row', alignItems: 'center', gap: 4,
    backgroundColor: 'rgba(131,56,236,0.18)',
    borderRadius: 6, borderWidth: 0.5, borderColor: '#8338ec88',
    paddingHorizontal: 8, paddingVertical: 4,
  },
  powerEmoji: { fontSize: 14 },
  powerLabel: {
    color: '#c084fc', fontSize: 9, fontWeight: 'bold', letterSpacing: 1,
  },
});
