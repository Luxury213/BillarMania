import {
  Canvas, Circle, Line, Rect, Image, useImage,
} from '@shopify/react-native-skia';
import Matter from 'matter-js';
import { useEffect, useRef, useState } from 'react';
import {
  GestureDetector, Gesture, GestureHandlerRootView,
} from 'react-native-gesture-handler';
import { View, StyleSheet, Text, TouchableOpacity, Dimensions } from 'react-native';
import { runOnJS, useSharedValue } from 'react-native-reanimated';
import { W, H, BAND, BALL_R, POCKET_R, POCKETS } from './constants';
import {
  createEngine, createWalls, createBalls, createCueBall,
  checkPockets, allStopped, applyTableFriction, shootCueBall,
  BallObj,
} from './physics';

type GameState = 'aiming' | 'charging' | 'rolling' | 'placing' | 'won';

export default function BillarGame() {
  const engineRef = useRef<Matter.Engine | null>(null);
  const ballsRef  = useRef<BallObj[]>([]);
  const cueBallRef = useRef<Matter.Body | null>(null);
  const rafRef    = useRef<number>(0);
  const stateRef  = useRef<GameState>('aiming');

  const [score, setScore]       = useState(0);
  const [gameState, setGameState] = useState<GameState>('aiming');
  const [, forceRender]         = useState(0);

  const aimAngle    = useSharedValue(0);
  const chargePower = useSharedValue(0);
  const chargeStart = useSharedValue(0);
  const mouseX      = useSharedValue(W * 0.25);
  const mouseY      = useSharedValue(H / 2);

  // imágenes
  const tableImg = useImage(require('../assets/images/billar/table.png'));
  const cueImg   = useImage(require('../assets/images/billar/cue.png'));
  const ballImgs = [
    useImage(require('../assets/images/billar/ball_0.png')),
    useImage(require('../assets/images/billar/ball_1.png')),
    useImage(require('../assets/images/billar/ball_2.png')),
    useImage(require('../assets/images/billar/ball_3.png')),
    useImage(require('../assets/images/billar/ball_4.png')),
    useImage(require('../assets/images/billar/ball_5.png')),
    useImage(require('../assets/images/billar/ball_6.png')),
    useImage(require('../assets/images/billar/ball_7.png')),
    useImage(require('../assets/images/billar/ball_8.png')),
    useImage(require('../assets/images/billar/ball_9.png')),
    useImage(require('../assets/images/billar/ball_10.png')),
    useImage(require('../assets/images/billar/ball_11.png')),
    useImage(require('../assets/images/billar/ball_13.png')),
    useImage(require('../assets/images/billar/ball_14.png')),
    useImage(require('../assets/images/billar/ball_15.png')),
  ];

  function setState(s: GameState) {
    stateRef.current = s;
    setGameState(s);
  }

  function initGame() {
    if (rafRef.current) cancelAnimationFrame(rafRef.current);
    const engine = createEngine();
    engineRef.current = engine;
    createWalls(engine.world);
    ballsRef.current  = createBalls(engine.world);
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

        // fricción del paño en cada frame
        applyTableFriction(ballsRef.current, cueBallRef.current);

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

        if (
          stateRef.current === 'rolling' &&
          allStopped(ballsRef.current, cueBallRef.current)
        ) {
          setState('aiming');
        }

        if (ballsRef.current.every(b => b.pocketed)) {
          setState('won');
        }
      }

      forceRender(n => n + 1);
      rafRef.current = requestAnimationFrame(loop);
    }
    rafRef.current = requestAnimationFrame(loop);
  }

  useEffect(() => {
    initGame();
    return () => { if (rafRef.current) cancelAnimationFrame(rafRef.current); };
  }, []);

  // --- Gestos ---
  const gesture = Gesture.Pan()
    .onBegin((e) => {
      mouseX.value = e.x;
      mouseY.value = e.y;

      if (stateRef.current === 'aiming' && cueBallRef.current) {
        const cp = cueBallRef.current.position;
        aimAngle.value  = Math.atan2(e.y - cp.y, e.x - cp.x);
        chargeStart.value = Date.now();
        chargePower.value = 0;
        runOnJS(setState)('charging');
      }

      if (stateRef.current === 'placing' && engineRef.current) {
        const nx = Math.max(BAND + BALL_R, Math.min(W * 0.45, e.x));
        const ny = Math.max(BAND + BALL_R, Math.min(H - BAND - BALL_R, e.y));
        cueBallRef.current = createCueBall(engineRef.current.world);
        Matter.Body.setPosition(cueBallRef.current, { x: nx, y: ny });
        runOnJS(setState)('aiming');
      }
    })
    .onUpdate((e) => {
      mouseX.value = e.x;
      mouseY.value = e.y;

      if (stateRef.current === 'charging' && cueBallRef.current) {
        const cp = cueBallRef.current.position;
        aimAngle.value    = Math.atan2(e.y - cp.y, e.x - cp.x);
        chargePower.value = Math.min((Date.now() - chargeStart.value) / 12, 100);
      }
    })
    .onEnd(() => {
      if (stateRef.current === 'charging' && cueBallRef.current) {
        shootCueBall(cueBallRef.current, aimAngle.value, chargePower.value);
        chargePower.value = 0;
        runOnJS(setState)('rolling');
      }
    });

  // --- Render ---
  const cp    = cueBallRef.current?.position;
  const angle = aimAngle.value;
  const power = chargePower.value;

  // posición del taco: detrás de la bola blanca
  const CUE_LEN  = W * 0.55;
  const CUE_H    = 12;
  const cueGap   = BALL_R + 8 + power * 0.12;
  const cueStartX = cp ? cp.x - Math.cos(angle) * cueGap : 0;
  const cueStartY = cp ? cp.y - Math.sin(angle) * cueGap : 0;

  return (
    <GestureHandlerRootView style={{ flex: 1 }}>

      {/* HUD */}
      <View style={styles.ui}>
        <Text style={styles.uiText}>🎱 {score} embocadas</Text>
        <Text style={styles.uiMsg}>
          {gameState === 'aiming'   ? 'Arrastra para apuntar' :
           gameState === 'charging' ? 'Suelta para disparar'  :
           gameState === 'rolling'  ? 'En movimiento...'      :
           gameState === 'placing'  ? 'Toca para colocar la bola blanca' :
           '¡Ganaste! 🎱'}
        </Text>
        <TouchableOpacity onPress={initGame} style={styles.btn}>
          <Text style={styles.btnText}>Reiniciar</Text>
        </TouchableOpacity>
      </View>

      {/* Barra de poder */}
      <View style={styles.powerContainer}>
        <View style={styles.powerTrack}>
          <View style={[styles.powerFill, { width: `${power}%` }]} />
        </View>
      </View>

      <GestureDetector gesture={gesture}>
        <Canvas style={{ width: W, height: H }}>

          {/* Mesa */}
          {tableImg && (
            <Image image={tableImg} x={0} y={0} width={W} height={H} fit="fill" />
          )}

          {/* Bolas numeradas */}
          {ballsRef.current
            .filter(b => !b.pocketed)
            .map((b, i) => {
              const { x, y } = b.body.position;
              const img = ballImgs[b.data.n];
              if (!img) return null;
              return (
                <Image
                  key={i}
                  image={img}
                  x={x - BALL_R}
                  y={y - BALL_R}
                  width={BALL_R * 2}
                  height={BALL_R * 2}
                />
              );
            })}

          {/* Bola blanca */}
          {cp && ballImgs[0] && (
            <Image
              image={ballImgs[0]}
              x={cp.x - BALL_R}
              y={cp.y - BALL_R}
              width={BALL_R * 2}
              height={BALL_R * 2}
            />
          )}

          {/* Línea de trayectoria */}
          {cp && (gameState === 'aiming' || gameState === 'charging') && (
            <Line
              p1={{ x: cp.x + Math.cos(angle) * (BALL_R + 4), y: cp.y + Math.sin(angle) * (BALL_R + 4) }}
              p2={{ x: cp.x + Math.cos(angle) * W * 0.45,     y: cp.y + Math.sin(angle) * W * 0.45 }}
              color="rgba(255,255,255,0.4)"
              strokeWidth={1.5}
            />
          )}

          {/* Taco */}
          {cp && cueImg && (gameState === 'aiming' || gameState === 'charging') && (
            <Image
              image={cueImg}
              x={cueStartX - CUE_LEN}
              y={cueStartY - CUE_H / 2}
              width={CUE_LEN}
              height={CUE_H}
              transform={[
                { translateX: cueStartX },
                { translateY: cueStartY },
                { rotate: angle },
                { translateX: -cueStartX },
                { translateY: -cueStartY },
              ]}
            />
          )}

        </Canvas>
      </GestureDetector>

    </GestureHandlerRootView>
  );
}

const styles = StyleSheet.create({
  ui: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 14,
    paddingVertical: 10,
    backgroundColor: '#1a1a1a',
  },
  uiText: {
    color: '#fff',
    fontSize: 13,
    fontWeight: '500',
  },
  uiMsg: {
    color: '#aaa',
    fontSize: 12,
    flex: 1,
    textAlign: 'center',
  },
  btn: {
    borderWidth: 0.5,
    borderColor: '#555',
    borderRadius: 6,
    paddingHorizontal: 12,
    paddingVertical: 5,
  },
  btnText: {
    color: '#fff',
    fontSize: 12,
  },
  powerContainer: {
    paddingHorizontal: 14,
    paddingBottom: 6,
    backgroundColor: '#1a1a1a',
  },
  powerTrack: {
    height: 6,
    backgroundColor: '#333',
    borderRadius: 3,
    overflow: 'hidden',
  },
  powerFill: {
    height: '100%',
    backgroundColor: '#E24B4A',
    borderRadius: 3,
  },
});
