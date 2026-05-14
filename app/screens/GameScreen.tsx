// ============================================================
// GameScreen.tsx — BillarMania
// Mesa moderna con márgenes simétricos + Tienda + Potenciadores + SONIDOS
// Universidad Santiago de Cali — Computación Móvil 2026
// ============================================================
import {
  Canvas, Circle, Group, Line,
  matchFont, Path, RoundedRect,
  Skia, Text as SkText, vec,
} from '@shopify/react-native-skia';
import * as ScreenOrientation from 'expo-screen-orientation';
import Matter from 'matter-js';
import React, { useCallback, useEffect, useRef, useState } from 'react';
import {
  Dimensions, Platform, StyleSheet, Text, TouchableOpacity,
  Vibration, View,
} from 'react-native';
import { Gesture, GestureDetector, GestureHandlerRootView } from 'react-native-gesture-handler';
import { runOnJS, useSharedValue } from 'react-native-reanimated';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useAudio } from '../../hooks/useAudio';
import ShopScreen from './ShopScreen';

// ─── COLORES ─────────────────────────────────────────────────
const C = {
  primary:     '#3a86ff',
  accent:      '#ff006e',
  gold:        '#ffbe0b',
  green:       '#00ff88',
  bg:          '#060910',
  tableFelt:   '#0a2e1a',
  tableBorder: '#4a2800',
  cushion:     '#1a4a25',
};

// ─── DIMENSIONES CON MÁRGENES SIMÉTRICOS (MODERNO) ───────────
const { width: SCREEN_W, height: SCREEN_H } = Dimensions.get('window');
const W = Math.max(SCREEN_W, SCREEN_H);
const H = Math.min(SCREEN_W, SCREEN_H);
const NOTCH = Platform.OS === 'ios' ? 35 : 0;
const HUD_H = H * 0.12;

// Márgenes laterales SIMÉTRICOS (10% cada lado)
const MARGIN_H = W * 0.10;
const MARGIN_V = HUD_H + H * 0.02 + NOTCH;

const TABLE_X = MARGIN_H;
const TABLE_Y = MARGIN_V;
const TABLE_W = W - MARGIN_H * 2;
const TABLE_H = H - MARGIN_V - H * 0.04;
const CUSHION = 18;
const PLAY_X = TABLE_X + CUSHION;
const PLAY_Y = TABLE_Y + CUSHION;
const PLAY_W = TABLE_W - CUSHION * 2;
const PLAY_H = TABLE_H - CUSHION * 2;
const POCKET_R = 16;
const BALL_R = Math.min(PLAY_W, PLAY_H) * 0.038;
const CUE_LEN = BALL_R * 14;
const CUE_W = 5;
const MAX_DRAG = 160;

// ─── TRONERAS ────────────────────────────────────────────────
const POCKETS = [
  { x: PLAY_X, y: PLAY_Y },
  { x: PLAY_X + PLAY_W / 2, y: PLAY_Y - 4 },
  { x: PLAY_X + PLAY_W, y: PLAY_Y },
  { x: PLAY_X, y: PLAY_Y + PLAY_H },
  { x: PLAY_X + PLAY_W / 2, y: PLAY_Y + PLAY_H + 4 },
  { x: PLAY_X + PLAY_W, y: PLAY_Y + PLAY_H },
];

// ─── PUNTOS DE BOLAS ─────────────────────────────────────────
const BALL_POINTS: Record<number, number> = { 8: 200 };
for (let i = 1; i <= 7; i++) BALL_POINTS[i] = 60;
for (let i = 9; i <= 15; i++) BALL_POINTS[i] = 90;

const BALL_COLORS: Record<number, string> = {
  0: '#ffffff', 1: '#ffbe0b', 2: '#3a86ff', 3: '#ff006e',
  4: '#8338ec', 5: '#fb5607', 6: '#00ff88', 7: '#c2410c',
  8: '#222222', 9: '#ffbe0b', 10: '#3a86ff', 11: '#ff006e',
  12: '#8338ec', 13: '#fb5607', 14: '#00ff88', 15: '#c2410c',
};

// ─── RACK TRIANGULAR CLÁSICO ─────────────────────────────────
function getRackPositions() {
  const cx = PLAY_X + PLAY_W * 0.68;
  const cy = PLAY_Y + PLAY_H / 2;
  const positions: { id: number; x: number; y: number }[] = [];
  const rows = [1, 2, 3, 4, 5];
  let ballId = 1;
  
  for (let r = 0; r < rows.length; r++) {
    const numBalls = rows[r];
    const startY = cy - (numBalls - 1) * BALL_R * 1.9;
    const x = cx + r * BALL_R * 1.9;
    
    for (let c = 0; c < numBalls; c++) {
      if (ballId > 15) break;
      if (ballId === 8) {
        positions.push({ id: 8, x: cx + 3 * BALL_R * 1.9, y: cy });
        ballId++;
        continue;
      }
      positions.push({ id: ballId, x: x, y: startY + c * BALL_R * 1.9 });
      ballId++;
    }
  }
  return positions;
}

// ─── TIPOS ───────────────────────────────────────────────────
interface BallState { id: number; x: number; y: number }
interface FloatingText { id: number; text: string; x: number; y: number; opacity: number; vy: number; color: string }
interface PocketFlash { id: number; x: number; y: number; r: number; opacity: number }
interface Particle { id: number; x: number; y: number; vx: number; vy: number; life: number; color: string }
interface ShotData {
  pocketed: { ballId: number; px: number; py: number; bounces: number }[];
  bounces: number;
  chainCount: number;
  shotsLeft: number;
  score: number;
  coins: number;
  threshold: number;
  round: number;
  maxShots: number;
  activeBooster: string | null;
}

// ─── CÁLCULO DE PUNTOS ───────────────────────────────────────
function calcShot(pocketed: { ballId: number; bounces: number }[], chainCount: number) {
  if (pocketed.length === 0) {
    return { earned: 0, coinBonus: 0, newChain: 0, label: '', color: C.gold };
  }
  
  const baseTotal = pocketed.reduce((s, p) => s + (BALL_POINTS[p.ballId] ?? 60), 0);
  const n = pocketed.length;
  
  let multCantidad = 1;
  let color = C.gold;
  if (n === 2) { multCantidad = 1.8; color = C.gold; }
  else if (n === 3) { multCantidad = 2.5; color = C.gold; }
  
  const ballIds = pocketed.map(p => p.ballId).sort((a, b) => a - b);
  let isScale = true;
  for (let i = 1; i < ballIds.length; i++) {
    if (ballIds[i] !== ballIds[i - 1] + 1) { isScale = false; break; }
  }
  const multEscala = (isScale && ballIds.length >= 2) ? 1.5 : 1;
  if (multEscala > 1) color = C.green;
  
  const hasBounce = pocketed.some(p => p.bounces >= 1);
  const multBounce = hasBounce ? 1.3 : 1;
  if (hasBounce && color === C.gold) color = C.primary;
  
  const newChain = pocketed.length > 0 ? chainCount + 1 : 0;
  let multCadena = 1;
  if (newChain === 2) multCadena = 1.2;
  else if (newChain >= 3) multCadena = 1.5;
  if (multCadena > 1) color = C.accent;
  
  const totalMult = multCantidad * multEscala * multBounce * multCadena;
  const earned = Math.floor(baseTotal * totalMult);
  const coinBonus = Math.floor(earned / 60);
  
  const parts = [`+${earned}`];
  if (multCantidad > 1) parts.push(`${n}B×${multCantidad}`);
  if (multEscala > 1) parts.push(`ESC×1.5`);
  if (multBounce > 1) parts.push(`REB×1.3`);
  if (multCadena > 1) parts.push(`CH×${multCadena}`);
  
  return { earned, coinBonus, newChain, label: parts.join(' '), color };
}

// ─── FUENTE ──────────────────────────────────────────────────
const skFont = matchFont({
  fontFamily: 'monospace', fontSize: BALL_R * 0.85, fontWeight: 'bold',
} as any);

// ─── COMPONENTE PRINCIPAL ────────────────────────────────────
export default function GameScreen({ onSalir }: { onSalir?: () => void }) {
  // Refs físicas
  const engineRef = useRef<Matter.Engine | null>(null);
  const runnerRef = useRef<Matter.Runner | null>(null);
  const bodiesRef = useRef<Map<number, Matter.Body>>(new Map());
  const frameRef = useRef<number>(0);
  const ballBouncesRef = useRef<Map<number, number>>(new Map());
  const floatIdRef = useRef(0);
  const flashIdRef = useRef(0);
  const particleIdRef = useRef(0);
  
  const phaseRef = useRef<'aiming' | 'shooting'>('aiming');
  const resolvingRef = useRef(false);
  const shotDataRef = useRef<ShotData>({
    pocketed: [], bounces: 0, chainCount: 0,
    shotsLeft: 5, score: 0, coins: 0,
    threshold: 300, round: 1, maxShots: 5,
    activeBooster: null,
  });

  // AUDIO
  const { playEffect } = useAudio();

  // Shared values
  const svStep = useSharedValue<0 | 1 | 2>(0);
  const svOriginX = useSharedValue(0);
  const svOriginY = useSharedValue(0);

  // Refs JS puros
  const aimDirRef = useRef<{ x: number; y: number } | null>(null);
  const cuePosRef = useRef<{ x: number; y: number } | null>(null);

  // Estados de UI
  const [balls, setBalls] = useState<BallState[]>([]);
  const [floatingTexts, setFloatingTexts] = useState<FloatingText[]>([]);
  const [pocketFlashes, setPocketFlashes] = useState<PocketFlash[]>([]);
  const [particles, setParticles] = useState<Particle[]>([]);
  const [gamePhase, setGamePhase] = useState<'aiming' | 'shooting' | 'roundOver' | 'gameWin'>('aiming');
  const [showShop, setShowShop] = useState(false);
  const [selectedCue, setSelectedCue] = useState('cue_classic');
  const [displayState, setDisplayState] = useState({
    score: 0, round: 1, shots: 5, maxShots: 5,
    threshold: 300, coins: 0, chainCount: 0,
  });
  const [shootUI, setShootUI] = useState<{
    step: 0 | 1 | 2; dir: { x: number; y: number } | null;
    power: number; cuePos: { x: number; y: number } | null; lineEnd: { x: number; y: number } | null;
  }>({ step: 0, dir: null, power: 0, cuePos: null, lineEnd: null });
  
  // Debug mode
  const [debugMode, setDebugMode] = useState(false);

  // Efectos visuales
  const addParticles = (x: number, y: number, color: string, count: number = 12) => {
    const newParticles: Particle[] = [];
    for (let i = 0; i < count; i++) {
      newParticles.push({
        id: particleIdRef.current++,
        x: x + (Math.random() - 0.5) * 15,
        y: y + (Math.random() - 0.5) * 15,
        vx: (Math.random() - 0.5) * 5,
        vy: (Math.random() - 0.5) * 5 - 2,
        life: 1,
        color: color,
      });
    }
    setParticles(prev => [...prev, ...newParticles]);
  };

  const resetShootUI = () => {
    aimDirRef.current = null;
    cuePosRef.current = null;
    svStep.value = 0;
    setShootUI({ step: 0, dir: null, power: 0, cuePos: null, lineEnd: null });
  };

  // Funciones de debug
  const testJugada = (tipo: string) => {
    let pocketed: { ballId: number; px: number; py: number; bounces: number }[] = [];
    let chainCount = 0;
    
    switch(tipo) {
      case 'normal':
        pocketed = [{ ballId: 1, px: PLAY_X + PLAY_W/2, py: PLAY_Y + PLAY_H/2, bounces: 0 }];
        break;
      case 'doblete':
        pocketed = [
          { ballId: 1, px: PLAY_X + PLAY_W/2, py: PLAY_Y + PLAY_H/2, bounces: 0 },
          { ballId: 2, px: PLAY_X + PLAY_W/2, py: PLAY_Y + PLAY_H/2, bounces: 0 },
        ];
        break;
      case 'triplete':
        pocketed = [
          { ballId: 1, px: PLAY_X + PLAY_W/2, py: PLAY_Y + PLAY_H/2, bounces: 0 },
          { ballId: 2, px: PLAY_X + PLAY_W/2, py: PLAY_Y + PLAY_H/2, bounces: 0 },
          { ballId: 3, px: PLAY_X + PLAY_W/2, py: PLAY_Y + PLAY_H/2, bounces: 0 },
        ];
        break;
      case 'escala':
        pocketed = [
          { ballId: 5, px: PLAY_X + PLAY_W/2, py: PLAY_Y + PLAY_H/2, bounces: 0 },
          { ballId: 6, px: PLAY_X + PLAY_W/2, py: PLAY_Y + PLAY_H/2, bounces: 0 },
          { ballId: 7, px: PLAY_X + PLAY_W/2, py: PLAY_Y + PLAY_H/2, bounces: 0 },
        ];
        break;
      case 'rebote':
        pocketed = [
          { ballId: 1, px: PLAY_X + PLAY_W/2, py: PLAY_Y + PLAY_H/2, bounces: 2 },
        ];
        break;
      case 'cadena':
        pocketed = [{ ballId: 1, px: PLAY_X + PLAY_W/2, py: PLAY_Y + PLAY_H/2, bounces: 0 }];
        chainCount = 2;
        break;
      default:
        pocketed = [{ ballId: 1, px: PLAY_X + PLAY_W/2, py: PLAY_Y + PLAY_H/2, bounces: 0 }];
    }
    
    const result = calcShot(pocketed, chainCount);
    alert(`🎱 ${tipo.toUpperCase()}:\n${result.label}\n💰 ${result.earned} puntos\n🪙 +${result.coinBonus} monedas`);
  };

  // Loop de animación
  const startLoop = useCallback(() => {
    cancelAnimationFrame(frameRef.current);
    const loop = () => {
      const nb: BallState[] = [];
      bodiesRef.current.forEach((b, id) => nb.push({ id, x: b.position.x, y: b.position.y }));
      setBalls([...nb]);
      
      // Efecto VIENTO
      if (shotDataRef.current.activeBooster === 'wind' && phaseRef.current === 'shooting') {
        const cueBody = bodiesRef.current.get(0);
        if (cueBody) {
          const speed = Math.sqrt(cueBody.velocity.x ** 2 + cueBody.velocity.y ** 2);
          if (speed > 0.3) {
            Matter.Body.applyForce(cueBody, cueBody.position, { x: 0.0008, y: 0 });
            if (Math.random() < 0.2) {
              addParticles(cueBody.position.x, cueBody.position.y, '#aaffdd', 2);
            }
          }
        }
      }
      
      setParticles(p => p.map(pt => ({ ...pt, x: pt.x + pt.vx, y: pt.y + pt.vy, life: pt.life - 0.025 })).filter(pt => pt.life > 0));
      setFloatingTexts(p => p.map(t => ({ ...t, y: t.y + t.vy, opacity: t.opacity - 0.018 })).filter(t => t.opacity > 0));
      setPocketFlashes(p => p.map(f => ({ ...f, r: f.r + 2, opacity: f.opacity - 0.05 })).filter(f => f.opacity > 0));
      
      if (phaseRef.current === 'shooting' && !resolvingRef.current) {
        const still = Array.from(bodiesRef.current.values()).every(
          b => Math.abs(b.velocity.x) < 0.12 && Math.abs(b.velocity.y) < 0.12
        );
        if (still) resolveShot();
      }
      frameRef.current = requestAnimationFrame(loop);
    };
    frameRef.current = requestAnimationFrame(loop);
  }, []);

  // Resolver tiro
  const resolveShot = useCallback(() => {
    if (resolvingRef.current) return;
    resolvingRef.current = true;
    const sd = shotDataRef.current;
    const { earned, coinBonus, newChain, label, color } = calcShot(sd.pocketed, sd.chainCount);
    
    if (earned > 0 && sd.pocketed.length > 0) {
      const fp = sd.pocketed[0];
      setFloatingTexts(ft => [...ft, {
        id: floatIdRef.current++, text: label,
        x: fp.px - label.length * 2.5, y: fp.py - 25,
        opacity: 1, vy: -1.2, color,
      }]);
      addParticles(fp.px, fp.py, color, 14);
    }
    
    sd.chainCount = newChain;
    sd.score += earned;
    // Efecto DIAMANTE: duplica las monedas ganadas
    const finalCoinBonus = sd.activeBooster === 'diamante' ? coinBonus * 2 : coinBonus;
    sd.coins += finalCoinBonus;
    sd.pocketed = [];
    sd.bounces = 0;
    
    // Restaurar fricción normal (efecto HIELO)
    if (sd.activeBooster === 'ice') {
      bodiesRef.current.forEach(body => {
        Matter.Body.set(body, { frictionAir: 0.018 });
      });
    }
    
    phaseRef.current = 'aiming';
    
    const won = sd.score >= sd.threshold;
    const noAmmo = sd.shotsLeft <= 0;
    
    // 🔊 SONIDO DE RONDA COMPLETADA
    if (won) {
      playEffect(require('../../assets/sounds/round success.mp3'), 0.8);
    }
    
    setDisplayState({
      score: sd.score, round: sd.round, shots: sd.shotsLeft,
      maxShots: sd.maxShots, threshold: sd.threshold,
      coins: sd.coins, chainCount: sd.chainCount,
    });
    setGamePhase(won || noAmmo ? 'roundOver' : 'aiming');
    resetShootUI();
    resolvingRef.current = false;
  }, [playEffect]);

  // Manejar troneras
  const handlePockets = useCallback((bodyA: Matter.Body, bodyB: Matter.Body) => {
    [bodyA, bodyB].forEach(body => {
      if (!body.label.startsWith('ball_')) return;
      const ballId: number = (body as any).ballId;
      POCKETS.forEach(p => {
        const dx = body.position.x - p.x, dy = body.position.y - p.y;
        if (Math.sqrt(dx * dx + dy * dy) >= POCKET_R + BALL_R * 0.8) return;
        if (ballId === 0) {
          // Efecto PRECISIÓN: bloquea el foul, la bola rebota desde el borde
          if (shotDataRef.current.activeBooster === 'precision') {
            const vx = body.velocity.x;
            const vy = body.velocity.y;
            Matter.Body.setPosition(body, { x: PLAY_X + PLAY_W * 0.25, y: PLAY_Y + PLAY_H / 2 });
            Matter.Body.setVelocity(body, { x: -vx * 0.6, y: -vy * 0.6 });
            addParticles(body.position.x, body.position.y, '#b388ff', 10);
          } else {
            Matter.Body.setPosition(body, { x: PLAY_X + PLAY_W * 0.25, y: PLAY_Y + PLAY_H / 2 });
            Matter.Body.setVelocity(body, { x: 0, y: 0 });
          }
          return;
        }
        if (!engineRef.current) return;
        
        // 🔊 SONIDO DE BOLA CAYENDO
        playEffect(require('../../assets/sounds/ball drop.mp3'), 0.5);
        
        Matter.World.remove(engineRef.current.world, body);
        bodiesRef.current.delete(ballId);
        const bounces = ballBouncesRef.current.get(ballId) ?? 0;
        shotDataRef.current.pocketed.push({ ballId, px: p.x, py: p.y, bounces });
        setPocketFlashes(pf => [...pf, { id: flashIdRef.current++, x: p.x, y: p.y, r: POCKET_R, opacity: 1 }]);
        addParticles(p.x, p.y, C.gold, 8);
      });
    });
  }, [playEffect]);

  // Iniciar ronda
  const initRound = useCallback((round: number, coins: number, score: number, activeBooster: string | null = null) => {
    cancelAnimationFrame(frameRef.current);
    resolvingRef.current = false;
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
      Matter.Bodies.rectangle(PLAY_X + PLAY_W / 2, PLAY_Y - 5, PLAY_W, 10, wo),
      Matter.Bodies.rectangle(PLAY_X + PLAY_W / 2, PLAY_Y + PLAY_H + 5, PLAY_W, 10, wo),
      Matter.Bodies.rectangle(PLAY_X - 5, PLAY_Y + PLAY_H / 2, 10, PLAY_H, wo),
      Matter.Bodies.rectangle(PLAY_X + PLAY_W + 5, PLAY_Y + PLAY_H / 2, 10, PLAY_H, wo),
    ]);
    getRackPositions().forEach(({ id, x, y }) => {
      const b = Matter.Bodies.circle(x, y, BALL_R, {
        restitution: 0.92, friction: 0.005,
        frictionAir: 0.018, density: 0.002, label: `ball_${id}`,
      });
      (b as any).ballId = id;
      bodiesRef.current.set(id, b);
      Matter.World.add(engine.world, b);
    });
    const cue = Matter.Bodies.circle(PLAY_X + PLAY_W * 0.25, PLAY_Y + PLAY_H / 2, BALL_R, {
      restitution: 0.92, friction: 0.005,
      frictionAir: 0.02, density: 0.002, label: 'ball_0',
    });
    (cue as any).ballId = 0;
    bodiesRef.current.set(0, cue);
    Matter.World.add(engine.world, cue);
    
    Matter.Events.on(engine, 'collisionStart', ev => {
      ev.pairs.forEach(({ bodyA, bodyB }) => {
        if (bodyA.label === 'wall' && bodyB.label.startsWith('ball_')) {
          const bid: number = (bodyB as any).ballId;
          ballBouncesRef.current.set(bid, (ballBouncesRef.current.get(bid) ?? 0) + 1);
          shotDataRef.current.bounces += 1;
        }
        if (bodyB.label === 'wall' && bodyA.label.startsWith('ball_')) {
          const bid: number = (bodyA as any).ballId;
          ballBouncesRef.current.set(bid, (ballBouncesRef.current.get(bid) ?? 0) + 1);
          shotDataRef.current.bounces += 1;
        }
        handlePockets(bodyA, bodyB);
      });
    });
    Matter.Runner.run(runner, engine);
    
    const maxShots = 5;
    const threshold = Math.round(300 * Math.pow(1.35, round - 1));
    shotDataRef.current = {
      pocketed: [], bounces: 0, chainCount: 0,
      shotsLeft: maxShots, score, coins,
      threshold, round, maxShots,
      activeBooster,
    };
    phaseRef.current = 'aiming';
    setGamePhase('aiming');
    setDisplayState({ score, round, shots: maxShots, maxShots, threshold, coins, chainCount: 0 });
    setFloatingTexts([]);
    setPocketFlashes([]);
    setParticles([]);
    ballBouncesRef.current.clear();
    resetShootUI();
  }, [handlePockets]);

  useEffect(() => {
    ScreenOrientation.lockAsync(ScreenOrientation.OrientationLock.LANDSCAPE_LEFT);
    initRound(1, 0, 0);
    startLoop();
    return () => {
      cancelAnimationFrame(frameRef.current);
      if (runnerRef.current) Matter.Runner.stop(runnerRef.current);
      if (engineRef.current) {
        Matter.Events.off(engineRef.current, 'collisionStart');
        Matter.Engine.clear(engineRef.current);
      }
      ScreenOrientation.unlockAsync();
    };
  }, []);

  // Callbacks JS
  const jsStartAim = useCallback((tx: number, ty: number) => {
    if (phaseRef.current !== 'aiming') { svStep.value = 0; return; }
    const cue = bodiesRef.current.get(0);
    if (!cue) { svStep.value = 0; return; }
    cuePosRef.current = { x: cue.position.x, y: cue.position.y };
    aimDirRef.current = null;
    setShootUI({ step: 1, dir: null, power: 0, cuePos: { x: cue.position.x, y: cue.position.y }, lineEnd: null });
  }, []);

  const jsUpdateAim = useCallback((tx: number, ty: number, ox: number, oy: number) => {
    const cp = cuePosRef.current;
    if (!cp) return;
    const dx = tx - ox, dy = ty - oy, dist = Math.sqrt(dx * dx + dy * dy);
    if (dist < 6) return;
    const dir = { x: dx / dist, y: dy / dist };
    const len = Math.min(dist * 1.8, PLAY_W * 0.75);
    const lineEnd = { x: cp.x + dir.x * len, y: cp.y + dir.y * len };
    aimDirRef.current = dir;
    setShootUI({ step: 1, dir, power: 0, cuePos: cp, lineEnd });
  }, []);

  const jsConfirmDir = useCallback(() => {
    const dir = aimDirRef.current, cp = cuePosRef.current;
    if (!dir || !cp) { resetShootUI(); return; }
    Vibration.vibrate(18);
    const lineEnd = { x: cp.x + dir.x * PLAY_W * 0.5, y: cp.y + dir.y * PLAY_W * 0.5 };
    setShootUI({ step: 2, dir, power: 0, cuePos: cp, lineEnd });
  }, []);

  const jsUpdateCharge = useCallback((dx: number, dy: number) => {
    const dir = aimDirRef.current, cp = cuePosRef.current;
    if (!dir || !cp) return;
    const dot = -(dx * dir.x + dy * dir.y);
    const power = Math.max(0, Math.min(dot / MAX_DRAG, 1));
    if (power >= 0.99) Vibration.vibrate(25);
    const lineEnd = { x: cp.x + dir.x * PLAY_W * 0.5, y: cp.y + dir.y * PLAY_W * 0.5 };
    setShootUI({ step: 2, dir, power, cuePos: cp, lineEnd });
  }, []);

  const jsFire = useCallback((dx: number, dy: number) => {
    const dir = aimDirRef.current, cue = bodiesRef.current.get(0), sd = shotDataRef.current;
    if (!dir || !cue || sd.shotsLeft <= 0 || phaseRef.current !== 'aiming') { resetShootUI(); return; }
    const dot = -(dx * dir.x + dy * dir.y);
    let power = Math.max(0, Math.min(dot / MAX_DRAG, 1));
    if (power < 0.04) { resetShootUI(); return; }
    
    // 🔊 SONIDO DE DISPARO
    playEffect(require('../../assets/sounds/shot.mp3'), 0.7);
    
    // Efecto FUEGO
    if (sd.activeBooster === 'fire') {
      power = Math.min(power * 1.3, 1);
      addParticles(cue.position.x, cue.position.y, '#ff6600', 8);
    }

    // Efecto RAYO: primer disparo a máxima potencia
    if (sd.activeBooster === 'rayo') {
      power = 1;
      addParticles(cue.position.x, cue.position.y, '#ffe066', 14);
      sd.activeBooster = null; // se consume en el primer disparo
    }
    
    // Efecto HIELO (reducir fricción)
    if (sd.activeBooster === 'ice') {
      bodiesRef.current.forEach(body => {
        Matter.Body.set(body, { frictionAir: 0.008 });
      });
      addParticles(cue.position.x, cue.position.y, '#88ccff', 6);
    }
    // Potenciador +VIDA: da un tiro extra esta ronda (solo una vez)
    if (sd.activeBooster === 'vida') {
      sd.shotsLeft += 1;        // suma 1 tiro extra
      sd.activeBooster = null;  // se consume al usarse
    }

    sd.shotsLeft -= 1;
    sd.pocketed = [];
    sd.bounces = 0;
    phaseRef.current = 'shooting';
    ballBouncesRef.current.clear();
    setGamePhase('shooting');
    setDisplayState(prev => ({ ...prev, shots: sd.shotsLeft }));
    const speed = power * 20;
    Matter.Body.setVelocity(cue, { x: dir.x * speed, y: dir.y * speed });
    setPocketFlashes(pf => [...pf, { id: flashIdRef.current++, x: cue.position.x, y: cue.position.y, r: BALL_R * 1.5, opacity: 0.6 }]);
    addParticles(cue.position.x, cue.position.y, C.primary, 16);
    Vibration.vibrate(40);
    resetShootUI();
  }, [playEffect]);

  const jsCancel = useCallback(() => { resetShootUI(); }, []);

  // Gesto unificado
  const gesture = Gesture.Pan()
    .minDistance(0)
    .onStart(e => {
      'worklet';
      if (svStep.value === 0) {
        svStep.value = 1;
        svOriginX.value = e.x;
        svOriginY.value = e.y;
        runOnJS(jsStartAim)(e.x, e.y);
      } else if (svStep.value === 1) {
        svStep.value = 2;
        svOriginX.value = e.x;
        svOriginY.value = e.y;
        runOnJS(jsConfirmDir)();
      }
    })
    .onUpdate(e => {
      'worklet';
      if (svStep.value === 1) {
        runOnJS(jsUpdateAim)(e.x, e.y, svOriginX.value, svOriginY.value);
      } else if (svStep.value === 2) {
        const dx = e.x - svOriginX.value;
        const dy = e.y - svOriginY.value;
        runOnJS(jsUpdateCharge)(dx, dy);
      }
    })
    .onEnd(e => {
      'worklet';
      const dx = e.x - svOriginX.value;
      const dy = e.y - svOriginY.value;
      if (svStep.value === 1) {
        const dist = Math.sqrt(dx * dx + dy * dy);
        if (dist < 6) { svStep.value = 0; runOnJS(jsCancel)(); }
        else { runOnJS(jsConfirmDir)(); svStep.value = 1; }
      } else if (svStep.value === 2) {
        svStep.value = 0;
        runOnJS(jsFire)(dx, dy);
      }
    });

  // Render
  const getPowerColor = (p: number) => {
    if (p < 0.4) return C.green;
    if (p < 0.7) return C.gold;
    return C.accent;
  };
  
  const getPowerArc = (p: number) => {
    const r = 22, a0 = -Math.PI / 2, a1 = a0 + p * Math.PI * 2;
    const x1 = r * Math.cos(a0), y1 = r * Math.sin(a0);
    const x2 = r * Math.cos(a1), y2 = r * Math.sin(a1);
    const big = p * Math.PI * 2 > Math.PI ? 1 : 0;
    return p >= 0.999 ? `M ${x1} ${y1} A ${r} ${r} 0 1 1 ${x1 + 0.001} ${y1}` : `M ${x1} ${y1} A ${r} ${r} 0 ${big} 1 ${x2} ${y2}`;
  };

  const { step, dir, power, cuePos, lineEnd } = shootUI;
  const showAim = (step === 1 || step === 2) && !!dir && !!cuePos;

  return (
    <GestureHandlerRootView style={styles.container}>
      <SafeAreaView style={{ flex: 1 }}>
        {/* HUD */}
        <View style={styles.hud}>
          <View style={styles.hudBlock}><Text style={styles.hudLabel}>RONDA</Text><Text style={[styles.hudVal, { color: C.accent }]}>{displayState.round}/10</Text></View>
          <View style={styles.hudSep} />
          <View style={styles.hudBlock}><Text style={styles.hudLabel}>PUNTOS</Text><Text style={[styles.hudVal, { color: C.gold }]}>{displayState.score}</Text><Text style={styles.hudSub}>META {displayState.threshold}</Text></View>
          <View style={styles.progressBar}><View style={[styles.progressFill, { width: `${Math.min(100, (displayState.score / displayState.threshold) * 100)}%` }]} /></View>
          <View style={styles.hudSep} />
          <View style={styles.hudBlock}><Text style={styles.hudLabel}>TIROS</Text><View style={styles.shotsRow}>{Array.from({ length: displayState.maxShots }).map((_, i) => (<View key={i} style={[styles.shotDot, { backgroundColor: i < displayState.shots ? C.green : '#2a2a2a' }]} />))}</View></View>
          <View style={styles.hudSep} />
          <View style={styles.hudBlock}><Text style={styles.hudLabel}>MONEDAS</Text><Text style={[styles.hudVal, { color: C.gold }]}>🪙 {displayState.coins}</Text></View>
          <View style={styles.hudSep} />
          <View style={styles.hudBlock}><Text style={styles.hudLabel}>COMBO</Text><Text style={[styles.hudVal, { color: C.green }]}>{displayState.chainCount > 0 ? `${displayState.chainCount}×` : '—'}</Text></View>
          {onSalir && <TouchableOpacity onPress={onSalir} style={styles.exitBtn}><Text style={styles.exitText}>✕</Text></TouchableOpacity>}
          
          {debugMode && (
            <TouchableOpacity onPress={() => setDebugMode(false)} style={styles.debugButton}>
              <Text style={styles.debugButtonText}>🔧</Text>
            </TouchableOpacity>
          )}
        </View>

        {/* Instrucciones */}
        <View style={styles.instruction}>
          {gamePhase === 'aiming' && step === 0 && <Text style={styles.instrText}>🎱 ARRASTRA PARA APUNTAR</Text>}
          {step === 1 && !dir && <Text style={[styles.instrText, { color: C.primary }]}>🎯 ARRASTRA HACIA EL OBJETIVO</Text>}
          {step === 1 && !!dir && <Text style={[styles.instrText, { color: C.green }]}>✅ LEVANTA PARA CONFIRMAR</Text>}
          {step === 2 && power < 0.05 && <Text style={[styles.instrText, { color: C.gold }]}>💪 ARRASTRA HACIA ATRÁS PARA CARGAR</Text>}
          {step === 2 && power >= 0.05 && <Text style={[styles.instrText, { color: getPowerColor(power) }]}>🔥 {Math.round(power * 100)}% · LEVANTA PARA DISPARAR</Text>}
          {gamePhase === 'shooting' && <Text style={[styles.instrText, { color: '#444' }]}>· · ·</Text>}
        </View>

        <GestureDetector gesture={gesture}>
          <View style={styles.canvas}>
            <Canvas style={StyleSheet.absoluteFill}>
              {/* Mesa moderna */}
              <RoundedRect x={TABLE_X - 8} y={TABLE_Y - 8} width={TABLE_W + 16} height={TABLE_H + 16} r={8} color={C.tableBorder} />
              <RoundedRect x={TABLE_X} y={TABLE_Y} width={TABLE_W} height={TABLE_H} r={4} color={C.tableFelt} />
              <RoundedRect x={TABLE_X} y={TABLE_Y} width={TABLE_W} height={CUSHION} r={3} color={C.cushion} />
              <RoundedRect x={TABLE_X} y={TABLE_Y + TABLE_H - CUSHION} width={TABLE_W} height={CUSHION} r={3} color={C.cushion} />
              <RoundedRect x={TABLE_X} y={TABLE_Y} width={CUSHION} height={TABLE_H} r={3} color={C.cushion} />
              <RoundedRect x={TABLE_X + TABLE_W - CUSHION} y={TABLE_Y} width={CUSHION} height={TABLE_H} r={3} color={C.cushion} />
              <Line p1={vec(PLAY_X + PLAY_W * 0.33, PLAY_Y)} p2={vec(PLAY_X + PLAY_W * 0.33, PLAY_Y + PLAY_H)} color="rgba(255,255,255,0.07)" strokeWidth={1} />
              <Circle cx={PLAY_X + PLAY_W * 0.33} cy={PLAY_Y + PLAY_H / 2} r={4} color="rgba(255,255,255,0.15)" />
              
              {/* Troneras */}
              {POCKETS.map((p, i) => (
                <React.Fragment key={i}>
                  <Circle cx={p.x} cy={p.y} r={POCKET_R + 6} color="rgba(0,255,136,0.06)" />
                  <Circle cx={p.x} cy={p.y} r={POCKET_R + 4} color="#050505" />
                  <Circle cx={p.x} cy={p.y} r={POCKET_R} color="#0d0d0d" />
                </React.Fragment>
              ))}
              
              {/* Efectos */}
              {pocketFlashes.map(f => <Circle key={f.id} cx={f.x} cy={f.y} r={f.r} color={`rgba(255,190,11,${f.opacity.toFixed(2)})`} />)}
              {particles.map(p => <Circle key={p.id} cx={p.x} cy={p.y} r={3} color={p.color} opacity={p.life} />)}

              {/* Línea de mira */}
              {showAim && lineEnd && (
                <>
                  <Line p1={vec(cuePos!.x, cuePos!.y)} p2={vec(lineEnd.x, lineEnd.y)}
                    color={step === 2 ? `rgba(255,190,11,${(0.4 + power * 0.55).toFixed(2)})` : 'rgba(255,255,255,0.65)'}
                    strokeWidth={step === 2 ? 2 + power * 2 : 2} />
                  <Circle cx={lineEnd.x} cy={lineEnd.y} r={step === 2 ? 6 + power * 5 : 6}
                    color={step === 2 ? getPowerColor(power) : 'rgba(255,255,255,0.45)'} />
                  <Circle cx={cuePos!.x} cy={cuePos!.y} r={BALL_R + 3} color="rgba(255,255,255,0.1)" />
                </>
              )}

              {/* Taco */}
              {showAim && dir && cuePos && (() => {
                const bx = -dir.x, by = -dir.y;
                const off = BALL_R + 6 + (step === 2 ? power * 28 : 0);
                const x1 = cuePos.x + bx * off, y1 = cuePos.y + by * off;
                const x2 = cuePos.x + bx * (off + CUE_LEN), y2 = cuePos.y + by * (off + CUE_LEN);
                const px = -by, py = bx;
                const path = Skia.Path.Make();
                path.moveTo(x1 + px * CUE_W * 0.4, y1 + py * CUE_W * 0.4);
                path.lineTo(x1 - px * CUE_W * 0.4, y1 - py * CUE_W * 0.4);
                path.lineTo(x2 - px * CUE_W * 1.6, y2 - py * CUE_W * 1.6);
                path.lineTo(x2 + px * CUE_W * 1.6, y2 + py * CUE_W * 1.6);
                path.close();

                // Color del taco según diseño comprado
                let cueBodyColor = '#8B5E3C';
                let cueTipColor  = '#c8a97a';
                if (selectedCue === 'cue_fire') {
                  cueBodyColor = step === 2 ? (power > 0.6 ? '#ff2200' : '#ff4500') : '#ff4500';
                  cueTipColor  = '#ffbe0b';
                } else if (selectedCue === 'cue_ice') {
                  cueBodyColor = step === 2 ? (power > 0.6 ? '#0099cc' : '#00cfff') : '#00cfff';
                  cueTipColor  = '#ffffff';
                } else {
                  // Clásico: cambia con la potencia como antes
                  cueBodyColor = step === 2 ? (power > 0.7 ? '#d97706' : power > 0.4 ? '#a16207' : '#8B5E3C') : '#8B5E3C';
                  cueTipColor  = '#c8a97a';
                }

                return (
                  <Group>
                    <Path path={path} color={cueBodyColor} />
                    <Circle cx={x1} cy={y1} r={CUE_W * 0.4} color={cueTipColor} />
                  </Group>
                );
              })()}

              {/* Medidor de potencia circular */}
              {step === 2 && cuePos && (
                <Group transform={[{ translateX: cuePos.x }, { translateY: cuePos.y - 50 }]}>
                  <Circle cx={0} cy={0} r={28} color="rgba(0,0,0,0.8)" />
                  <Path path={`M 0 -22 A 22 22 0 1 1 -0.001 -22`} color="rgba(255,255,255,0.1)" style="stroke" strokeWidth={6} />
                  {power > 0.01 && <Path path={getPowerArc(power)} color={getPowerColor(power)} style="stroke" strokeWidth={6} />}
                  {skFont && <SkText x={-13} y={6} text={`${Math.round(power * 100)}%`} font={skFont} color="white" />}
                </Group>
              )}

              {/* Bolas */}
              {balls.map(ball => {
                const color = BALL_COLORS[ball.id] ?? '#fff';
                const isStripe = ball.id >= 9 && ball.id <= 15;
                const label = ball.id === 0 ? '' : String(ball.id);
                const tx = ball.x - (label.length > 1 ? BALL_R * 0.38 : BALL_R * 0.22);
                const ty = ball.y + BALL_R * 0.3;
                return (
                  <React.Fragment key={ball.id}>
                    <Circle cx={ball.x + 2} cy={ball.y + 3} r={BALL_R + 1} color="rgba(0,0,0,0.4)" />
                    {ball.id === 8 && <><Circle cx={ball.x} cy={ball.y} r={BALL_R + 6} color="rgba(255,190,11,0.08)" /><Circle cx={ball.x} cy={ball.y} r={BALL_R + 3} color="rgba(255,190,11,0.18)" /></>}
                    <Circle cx={ball.x} cy={ball.y} r={BALL_R} color={color} />
                    {isStripe && <><Circle cx={ball.x} cy={ball.y} r={BALL_R} color="rgba(255,255,255,0.88)" /><Circle cx={ball.x} cy={ball.y} r={BALL_R * 0.58} color={color} /></>}
                    {ball.id !== 0 && <><Circle cx={ball.x} cy={ball.y} r={BALL_R * 0.42} color="rgba(255,255,255,0.92)" />{skFont && <SkText x={tx} y={ty} text={label} font={skFont} color="#111" />}</>}
                    <Circle cx={ball.x - BALL_R * 0.28} cy={ball.y - BALL_R * 0.28} r={BALL_R * 0.22} color="rgba(255,255,255,0.55)" />
                  </React.Fragment>
                );
              })}
              {floatingTexts.map(t => skFont && <SkText key={t.id} x={t.x} y={t.y} text={t.text} font={skFont} color={t.color} />)}
            </Canvas>
          </View>
        </GestureDetector>

        {/* Panel de Debug */}
        {debugMode && (
          <View style={styles.debugPanel}>
            <Text style={styles.debugTitle}>🐞 TEST JUGADAS</Text>
            <View style={styles.debugRow}>
              <TouchableOpacity style={styles.debugBtn} onPress={() => testJugada('normal')}><Text style={styles.debugBtnText}>Normal</Text></TouchableOpacity>
              <TouchableOpacity style={styles.debugBtn} onPress={() => testJugada('doblete')}><Text style={styles.debugBtnText}>Doblete</Text></TouchableOpacity>
              <TouchableOpacity style={styles.debugBtn} onPress={() => testJugada('triplete')}><Text style={styles.debugBtnText}>Triplete</Text></TouchableOpacity>
            </View>
            <View style={styles.debugRow}>
              <TouchableOpacity style={styles.debugBtn} onPress={() => testJugada('escala')}><Text style={styles.debugBtnText}>Escala</Text></TouchableOpacity>
              <TouchableOpacity style={styles.debugBtn} onPress={() => testJugada('rebote')}><Text style={styles.debugBtnText}>Rebote</Text></TouchableOpacity>
              <TouchableOpacity style={styles.debugBtn} onPress={() => testJugada('cadena')}><Text style={styles.debugBtnText}>Cadena</Text></TouchableOpacity>
            </View>
            <TouchableOpacity style={styles.debugClose} onPress={() => setDebugMode(false)}><Text style={styles.debugCloseText}>CERRAR</Text></TouchableOpacity>
          </View>
        )}

        {/* Botón para activar debug */}
        {!debugMode && (
          <TouchableOpacity onPress={() => setDebugMode(true)} style={styles.debugToggle}>
            <Text style={styles.debugToggleText}>🐞</Text>
          </TouchableOpacity>
        )}

        {/* Overlay fin de ronda con tienda */}
        {gamePhase === 'roundOver' && !showShop && (() => {
          const won = displayState.score >= displayState.threshold;
          const reward = won ? 150 : 0;
          return (
            <View style={styles.overlay}>
              <Text style={styles.overlayTitle}>{won ? '¡RONDA SUPERADA!' : 'SIN TIROS'}</Text>
              <Text style={styles.overlayScore}>{displayState.score} / {displayState.threshold} pts</Text>
              {won && <Text style={styles.overlayBonus}>🪙 +{reward} monedas</Text>}

              {/* Tienda siempre disponible */}
              <TouchableOpacity
                style={styles.overlayBtn}
                onPress={() => {
                  if (won) {
                    const rewardAmount = 150;
                    setDisplayState(prev => ({ ...prev, coins: prev.coins + rewardAmount }));
                    shotDataRef.current.coins += rewardAmount;
                  }
                  setShowShop(true);
                }}
              >
                <Text style={styles.overlayBtnText}>IR A LA TIENDA 🏪</Text>
              </TouchableOpacity>

              {/* Reintentar solo si perdió */}
              {!won && (
                <TouchableOpacity
                  style={[styles.overlayBtn, { borderColor: C.primary, marginTop: 10 }]}
                  onPress={() => {
                    initRound(displayState.round, displayState.coins, 0);
                    startLoop();
                  }}
                >
                  <Text style={[styles.overlayBtnText, { color: C.primary }]}>REINTENTAR</Text>
                </TouchableOpacity>
              )}

              {onSalir && (
                <TouchableOpacity
                  style={[styles.overlayBtn, { borderColor: '#333', marginTop: 10 }]}
                  onPress={onSalir}
                >
                  <Text style={[styles.overlayBtnText, { color: '#555' }]}>MENÚ PRINCIPAL</Text>
                </TouchableOpacity>
              )}
            </View>
          );
        })()}

        {/* Tienda */}
        {showShop && (
          <View style={StyleSheet.absoluteFillObject}>
            <ShopScreen
              coins={displayState.coins}
              round={displayState.round}
              score={displayState.score}
             onClose={(result) => {
                setShowShop(false);
                setSelectedCue(result.selectedCue);
                const won = displayState.score >= displayState.threshold;
                initRound(
                  won ? displayState.round + 1 : displayState.round,
                  result.coins,
                  0,
                  result.activeBooster
                );
                startLoop();
              }}
            />
          </View>
        )}

        {/* Game Win */}
        {gamePhase === 'gameWin' && (
          <View style={styles.overlay}>
            <Text style={[styles.overlayTitle, { color: C.gold }]}>¡VICTORIA!</Text>
            <Text style={styles.overlayScore}>Completaste las 10 rondas 🎱</Text>
            <Text style={styles.overlayScore}>Puntuación final: {displayState.score}</Text>
            <Text style={styles.overlayScore}>Monedas: 🪙 {displayState.coins}</Text>
            {onSalir && <TouchableOpacity style={styles.overlayBtn} onPress={onSalir}><Text style={styles.overlayBtnText}>SALIR</Text></TouchableOpacity>}
          </View>
        )}
      </SafeAreaView>
    </GestureHandlerRootView>
  );
}

// ─── ESTILOS ─────────────────────────────────────────────────
const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: C.bg },
  canvas: { flex: 1 },
  hud: {
    position: 'absolute', top: 0, left: 0, right: 0, height: HUD_H,
    flexDirection: 'row', alignItems: 'center', justifyContent: 'space-around',
    paddingHorizontal: 8, backgroundColor: 'rgba(6,9,16,0.96)',
    borderBottomWidth: 1, borderBottomColor: C.primary + '33', zIndex: 10,
  },
  hudBlock: { alignItems: 'center', marginHorizontal: 4 },
  hudSep: { width: 1, height: '40%', backgroundColor: 'rgba(255,255,255,0.07)' },
  hudLabel: { color: '#555', fontSize: 8, letterSpacing: 2, textTransform: 'uppercase' },
  hudVal: { fontSize: 16, fontWeight: 'bold', letterSpacing: 1 },
  hudSub: { color: '#444', fontSize: 8, letterSpacing: 1 },
  shotsRow: { flexDirection: 'row', gap: 3, marginTop: 3 },
  shotDot: { width: 8, height: 8, borderRadius: 1 },
  exitBtn: { padding: 8 },
  exitText: { color: '#555', fontSize: 16 },
  progressBar: { width: 50, height: 4, backgroundColor: '#1a1a2e', borderRadius: 2, overflow: 'hidden', marginHorizontal: 4 },
  progressFill: { height: '100%', backgroundColor: C.green, borderRadius: 2 },
  instruction: { position: 'absolute', bottom: H * 0.04, alignSelf: 'center', backgroundColor: 'rgba(0,0,0,0.7)', paddingHorizontal: 20, paddingVertical: 7, borderRadius: 20, zIndex: 15 },
  instrText: { color: C.gold, fontSize: 12, letterSpacing: 2 },
  overlay: {
    position: 'absolute', top: 0, left: 0, right: 0, bottom: 0,
    backgroundColor: 'rgba(6,9,16,0.95)', alignItems: 'center', justifyContent: 'center', zIndex: 20,
  },
  overlayTitle: { color: C.accent, fontSize: 24, fontWeight: 'bold', letterSpacing: 4, textTransform: 'uppercase', marginBottom: 8 },
  overlayScore: { color: C.gold, fontSize: 16, letterSpacing: 2, marginBottom: 12 },
  overlayBonus: { color: C.green, fontSize: 13, letterSpacing: 1, marginBottom: 20 },
  overlayBtn: { borderWidth: 2, borderColor: C.accent, paddingHorizontal: 28, paddingVertical: 12, marginTop: 8 },
  overlayBtnText: { color: C.accent, fontSize: 14, letterSpacing: 3, textTransform: 'uppercase', fontWeight: 'bold' },
  
  debugToggle: {
    position: 'absolute',
    bottom: H * 0.1,
    right: 10,
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: '#1a1a2e',
    borderWidth: 1,
    borderColor: C.accent,
    justifyContent: 'center',
    alignItems: 'center',
    zIndex: 100,
  },
  debugToggleText: { fontSize: 22, color: C.gold },
  debugButton: { padding: 8, marginLeft: 8 },
  debugButtonText: { fontSize: 16, color: C.gold },
  debugPanel: {
    position: 'absolute',
    bottom: H * 0.15,
    left: 10,
    right: 10,
    backgroundColor: 'rgba(0,0,0,0.95)',
    borderRadius: 12,
    padding: 12,
    zIndex: 100,
    borderWidth: 1,
    borderColor: C.accent,
  },
  debugTitle: { color: C.accent, fontSize: 12, fontWeight: 'bold', textAlign: 'center', marginBottom: 10, letterSpacing: 2 },
  debugRow: { flexDirection: 'row', justifyContent: 'space-around', marginBottom: 8, gap: 8 },
  debugBtn: { backgroundColor: C.primary, paddingHorizontal: 12, paddingVertical: 8, borderRadius: 6, flex: 1, alignItems: 'center' },
  debugBtnText: { color: '#fff', fontSize: 11, fontWeight: 'bold' },
  debugClose: { backgroundColor: '#333', paddingVertical: 8, borderRadius: 6, marginTop: 8, alignItems: 'center' },
  debugCloseText: { color: '#fff', fontSize: 12 },
});