import { Canvas, Circle, Line, Paint, Path, Rect, Text as SkText, useFont } from '@shopify/react-native-skia';
import Matter from 'matter-js';
import { useEffect, useRef, useState } from 'react';
import { GestureDetector, Gesture, GestureHandlerRootView } from 'react-native-gesture-handler';
import { View, StyleSheet, Text, TouchableOpacity } from 'react-native';
import { useSharedValue, useAnimatedReaction, runOnJS } from 'react-native-reanimated';
import { W, H, BAND, BALL_R, POCKET_R, POCKETS, BALL_DATA } from './constants';
import {
  createEngine, createWalls, createBalls, createCueBall,
  checkPockets, allStopped, BallObj,
} from './physics';

type GameState = 'aiming' | 'charging' | 'rolling' | 'placing' | 'won';

export default function BillarGame() {
  const engineRef = useRef<Matter.Engine | null>(null);
  const ballsRef = useRef<BallObj[]>([]);
  const cueBallRef = useRef<Matter.Body | null>(null);
  const rafRef = useRef<number>(0);

  const [score, setScore] = useState(0);
  const [gameState, setGameState] = useState<GameState>('aiming');
  const [tick, setTick] = useState(0); // fuerza re-render del canvas

  const aimAngle = useSharedValue(0);
  const chargePower = useSharedValue(0);
  const chargeStart = useSharedValue(0);
  const mouseX = useSharedValue(W * 0.25);
  const mouseY = useSharedValue(H / 2);
  const stateRef = useRef<GameState>('aiming');

  function setState(s: GameState) {
    stateRef.current = s;
    setGameState(s);
  }

  function initGame() {
    if (rafRef.current) cancelAnimationFrame(rafRef.current);
    const engine = createEngine();
    engineRef.current = engine;
    createWalls(engine.world);
    ballsRef.current = createBalls(engine.world);
    cueBallRef.current = createCueBall(engine.world);
    setScore(0);
    setState('aiming');
    startLoop();
  }

  function startLoop() {
    let last = performance.now();
    function loop(ts: number) {
      const delta = Math.min(ts - last, 50);
      last = ts;
      if (engineRef.current) {
        Matter.Engine.update(engineRef.current, delta);
        checkPockets(
          ballsRef.current,
          cueBallRef.current,
          engineRef.current.world,
          () => setScore(s => s + 1),
          () => {
            cueBallRef.current = null;
            setState('placing');
          },
        );
        if (stateRef.current === 'rolling' && allStopped(ballsRef.current, cueBallRef.current)) {
          setState('aiming');
        }
        if (ballsRef.current.every(b => b.pocketed)) setState('won');
      }
      setTick(t => t + 1);
      rafRef.current = requestAnimationFrame(loop);
    }
    rafRef.current = requestAnimationFrame(loop);
  }

  useEffect(() => {
    initGame();
    return () => { if (rafRef.current) cancelAnimationFrame(rafRef.current); };
  }, []);

  const gesture = Gesture.Pan()
    .onBegin((e) => {
      mouseX.value = e.x;
      mouseY.value = e.y;
      if (stateRef.current === 'aiming' && cueBallRef.current) {
        const cp = cueBallRef.current.position;
        aimAngle.value = Math.atan2(e.y - cp.y, e.x - cp.x);
        chargeStart.value = Date.now();
        runOnJS(setState)('charging');
      } else if (stateRef.current === 'placing') {
        // colocar bola en mano
        const nx = Math.max(BAND + BALL_R, Math.min(W * 0.4, e.x));
        const ny = Math.max(BAND + BALL_R, Math.min(H - BAND - BALL_R, e.y));
        if (engineRef.current) {
          cueBallRef.current = createCueBall(engineRef.current.world);
          Matter.Body.setPosition(cueBallRef.current, { x: nx, y: ny });
          runOnJS(setState)('aiming');
        }
      }
    })
    .onUpdate((e) => {
      mouseX.value = e.x;
      mouseY.value = e.y;
      if (stateRef.current === 'charging' && cueBallRef.current) {
        const cp = cueBallRef.current.position;
        aimAngle.value = Math.atan2(e.y - cp.y, e.x - cp.x);
        chargePower.value = Math.min((Date.now() - chargeStart.value) / 12, 100);
      }
    })
    .onEnd(() => {
      if (stateRef.current === 'charging' && cueBallRef.current) {
        const angle = aimAngle.value;
        const power = chargePower.value;
        Matter.Body.setVelocity(cueBallRef.current, {
          x: Math.cos(angle) * power * 0.055,
          y: Math.sin(angle) * power * 0.055,
        });
        chargePower.value = 0;
        runOnJS(setState)('rolling');
      }
    });

  // --- Renderizado Skia ---
  const cp = cueBallRef.current?.position;
  const angle = aimAngle.value; // leído en JS thread aquí solo para render

  return (
    <GestureHandlerRootView style={{ flex: 1 }}>
      <View style={styles.ui}>
        <Text style={styles.uiText}>Embocadas: {score}</Text>
        <Text style={styles.uiText}>
          {gameState === 'aiming'   ? 'Arrastra para apuntar' :
           gameState === 'charging' ? 'Suelta para disparar' :
           gameState === 'rolling'  ? 'En movimiento...' :
           gameState === 'placing'  ? 'Toca para colocar la bola' :
           '¡Ganaste! 🎱'}
        </Text>
        <TouchableOpacity onPress={initGame} style={styles.btn}>
          <Text style={styles.btnText}>Reiniciar</Text>
        </TouchableOpacity>
      </View>

      <GestureDetector gesture={gesture}>
        <Canvas style={{ width: W, height: H }}>
          {/* Mesa */}
          <Rect x={0} y={0} width={W} height={H} color="#5a3010" />
          <Rect x={BAND} y={BAND} width={W - BAND * 2} height={H - BAND * 2} color="#35873a" />

          {/* Troneras */}
          {POCKETS.map((p, i) => (
            <Circle key={i} cx={p.x} cy={p.y} r={POCKET_R} color="#111" />
          ))}

          {/* Bolas */}
          {ballsRef.current.filter(b => !b.pocketed).map((b, i) => {
            const { x, y } = b.body.position;
            return (
              <Circle key={i} cx={x} cy={y} r={BALL_R} color={b.data.color} />
            );
          })}

          {/* Bola blanca */}
          {cp && (
            <Circle cx={cp.x} cy={cp.y} r={BALL_R} color="#f5f0e8" />
          )}

          {/* Línea de trayectoria */}
          {cp && (gameState === 'aiming' || gameState === 'charging') && (
            <Line
              p1={{ x: cp.x + Math.cos(angle) * BALL_R, y: cp.y + Math.sin(angle) * BALL_R }}
              p2={{ x: cp.x + Math.cos(angle) * W * 0.4, y: cp.y + Math.sin(angle) * W * 0.4 }}
              color="rgba(255,255,255,0.35)"
              strokeWidth={1}
            />
          )}

          {/* Barra de poder */}
          {gameState === 'charging' && (
            <>
              <Rect x={BAND} y={H - BAND + 6} width={W - BAND * 2} height={8} color="rgba(0,0,0,0.3)" />
              <Rect x={BAND} y={H - BAND + 6} width={(W - BAND * 2) * (chargePower.value / 100)} height={8} color="#E24B4A" />
            </>
          )}
        </Canvas>
      </GestureDetector>
    </GestureHandlerRootView>
  );
}

const styles = StyleSheet.create({
  ui: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
    paddingHorizontal: 12, paddingVertical: 8, backgroundColor: '#1a1a1a',
  },
  uiText: { color: '#ccc', fontSize: 12 },
  btn: { borderWidth: 0.5, borderColor: '#555', borderRadius: 6, paddingHorizontal: 12, paddingVertical: 4 },
  btnText: { color: '#fff', fontSize: 12 },
});
