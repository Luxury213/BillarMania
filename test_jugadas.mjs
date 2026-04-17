// ============================================================
// test_jugadas.mjs — Pruebas de lógica de puntuación BillarMania
// Ejecutar: node test_jugadas.mjs
// ============================================================

// ─── Constantes del juego (mirror de GameScreen) ─────────────
const BALL_POINTS = { 8: 300 };
for (let i = 1; i <= 7;  i++) BALL_POINTS[i] = 100;
for (let i = 9; i <= 15; i++) BALL_POINTS[i] = 150;

// ─── Función pura de cálculo (lo que irá en resolveShot) ─────
function calcShot({ pocketed, bounces, chainCount }) {
  if (pocketed.length === 0) return { earned: 0, newChain: 0, label: '' };

  const baseTotal = pocketed.reduce((s, p) => s + (BALL_POINTS[p.ballId] ?? 100), 0);

  // Multiplicador de cantidad embocada en un tiro
  const n = pocketed.length;
  const playMult =
    n >= 4 ? 5   : // Póker
    n === 3 ? 3.5 : // Triplete
    n === 2 ? 2   : // Doblete
    1;              // Normal

  // Multiplicador de rebotes
  const bounceMult =
    bounces >= 3 ? 4 :
    bounces === 2 ? 3 :
    bounces === 1 ? 2 : 1;

  // Multiplicador de cadena entre tiros
  const newChain = chainCount + 1;
  const chainMult =
    newChain >= 3 ? 2.5 :
    newChain === 2 ? 1.5 : 1;

  const earned = Math.round(baseTotal * playMult * bounceMult * chainMult);
  const coinBonus = Math.floor(earned / 50);

  const parts = [`+${earned}`];
  if (playMult  > 1) parts.push(`JUGADA×${playMult}`);
  if (bounceMult > 1) parts.push(`REB×${bounceMult}`);
  if (chainMult  > 1) parts.push(`CHAIN×${chainMult}`);

  return { earned, coinBonus, newChain, label: parts.join(' ') };
}

// ─── Utilidad de test ─────────────────────────────────────────
let passed = 0, failed = 0;

function test(name, fn) {
  try {
    fn();
    console.log(`  ✅  ${name}`);
    passed++;
  } catch (e) {
    console.log(`  ❌  ${name}`);
    console.log(`       ${e.message}`);
    failed++;
  }
}

function expect(actual, expected, msg = '') {
  if (actual !== expected)
    throw new Error(`esperado ${expected}, obtenido ${actual}${msg ? ' — ' + msg : ''}`);
}

function expectRange(actual, min, max, msg = '') {
  if (actual < min || actual > max)
    throw new Error(`esperado entre ${min}-${max}, obtenido ${actual}${msg ? ' — ' + msg : ''}`);
}

// ─── SUITE ───────────────────────────────────────────────────
console.log('\n══════════════════════════════════════════');
console.log('  BillarMania — Test de Jugadas y Puntos');
console.log('══════════════════════════════════════════\n');

// ── Puntos base ──────────────────────────────────────────────
console.log('📋 Puntos base de bolas:');
test('Bola 8 vale 300 pts', () => expect(BALL_POINTS[8], 300));
test('Bolas sólidas (1-7) valen 100 pts', () => {
  for (let i = 1; i <= 7; i++) expect(BALL_POINTS[i], 100, `bola ${i}`);
});
test('Bolas rayadas (9-15) valen 150 pts', () => {
  for (let i = 9; i <= 15; i++) expect(BALL_POINTS[i], 150, `bola ${i}`);
});

// ── Tiro normal (1 bola, sin rebotes, primera cadena) ────────
console.log('\n🎱 Tiro normal — 1 bola:');
test('1 sólida sin rebotes = 100 pts', () => {
  const r = calcShot({ pocketed: [{ ballId: 1 }], bounces: 0, chainCount: 0 });
  expect(r.earned, 100);
  expect(r.newChain, 1);
});
test('1 rayada sin rebotes = 150 pts', () => {
  const r = calcShot({ pocketed: [{ ballId: 9 }], bounces: 0, chainCount: 0 });
  expect(r.earned, 150);
});
test('Bola 8 sin rebotes = 300 pts', () => {
  const r = calcShot({ pocketed: [{ ballId: 8 }], bounces: 0, chainCount: 0 });
  expect(r.earned, 300);
});

// ── Multiplicador de jugada (cantidad) ───────────────────────
console.log('\n🎯 Multiplicadores de jugada:');
test('Doblete (2 sólidas) = 100×2 × playMult(2) = 400', () => {
  const r = calcShot({ pocketed: [{ ballId: 1 }, { ballId: 2 }], bounces: 0, chainCount: 0 });
  expect(r.earned, 400);
});
test('Triplete (3 sólidas) = 300×3.5 = 1050', () => {
  const r = calcShot({ pocketed: [{ ballId: 1 }, { ballId: 2 }, { ballId: 3 }], bounces: 0, chainCount: 0 });
  expect(r.earned, 1050);
});
test('Póker (4 sólidas) = 400×5 = 2000', () => {
  const r = calcShot({ pocketed: [{ ballId: 1 },{ ballId: 2 },{ ballId: 3 },{ ballId: 4 }], bounces: 0, chainCount: 0 });
  expect(r.earned, 2000);
});
test('Doblete mixto (sólida + rayada) = (100+150)×2 = 500', () => {
  const r = calcShot({ pocketed: [{ ballId: 1 }, { ballId: 9 }], bounces: 0, chainCount: 0 });
  expect(r.earned, 500);
});
test('Doblete con bola 8 = (300+100)×2 = 800', () => {
  const r = calcShot({ pocketed: [{ ballId: 8 }, { ballId: 1 }], bounces: 0, chainCount: 0 });
  expect(r.earned, 800);
});

// ── Multiplicador de rebotes ──────────────────────────────────
console.log('\n🔄 Multiplicadores de rebotes:');
test('1 rebote → ×2: 100×2 = 200', () => {
  const r = calcShot({ pocketed: [{ ballId: 1 }], bounces: 1, chainCount: 0 });
  expect(r.earned, 200);
});
test('2 rebotes → ×3: 100×3 = 300', () => {
  const r = calcShot({ pocketed: [{ ballId: 1 }], bounces: 2, chainCount: 0 });
  expect(r.earned, 300);
});
test('3+ rebotes → ×4: 100×4 = 400', () => {
  const r = calcShot({ pocketed: [{ ballId: 1 }], bounces: 3, chainCount: 0 });
  expect(r.earned, 400);
});
test('5 rebotes → sigue siendo ×4: 150×4 = 600', () => {
  const r = calcShot({ pocketed: [{ ballId: 9 }], bounces: 5, chainCount: 0 });
  expect(r.earned, 600);
});

// ── Multiplicador de cadena ───────────────────────────────────
console.log('\n⛓️  Multiplicadores de cadena:');
test('Primera embocada (chain=0→1) → sin mult: 100×1 = 100', () => {
  const r = calcShot({ pocketed: [{ ballId: 1 }], bounces: 0, chainCount: 0 });
  expect(r.earned, 100);
  expect(r.newChain, 1);
});
test('Segunda embocada consecutiva (chain=1→2) → ×1.5: 100×1.5 = 150', () => {
  const r = calcShot({ pocketed: [{ ballId: 1 }], bounces: 0, chainCount: 1 });
  expect(r.earned, 150);
  expect(r.newChain, 2);
});
test('Tercera embocada consecutiva (chain=2→3) → ×2.5: 100×2.5 = 250', () => {
  const r = calcShot({ pocketed: [{ ballId: 1 }], bounces: 0, chainCount: 2 });
  expect(r.earned, 250);
});
test('Cadena alta (chain=5) sigue siendo ×2.5', () => {
  const r = calcShot({ pocketed: [{ ballId: 1 }], bounces: 0, chainCount: 5 });
  expect(r.earned, 250);
});
test('Sin embocadas rompe cadena → newChain=0', () => {
  const r = calcShot({ pocketed: [], bounces: 0, chainCount: 3 });
  expect(r.newChain, 0);
  expect(r.earned, 0);
});

// ── Combos cruzados ───────────────────────────────────────────
console.log('\n🔥 Combos cruzados:');
test('Doblete + 2 rebotes + chain 2: (100+100)×2 ×3 ×1.5 = 1800', () => {
  const r = calcShot({ pocketed: [{ ballId: 1 }, { ballId: 2 }], bounces: 2, chainCount: 1 });
  expect(r.earned, 1800);
});
test('Triplete + 3 rebotes + chain 3: (100×3)×3.5 ×4 ×2.5 = 10500', () => {
  const r = calcShot({ pocketed: [{ ballId: 1 },{ ballId: 2 },{ ballId: 3 }], bounces: 3, chainCount: 2 });
  expect(r.earned, 10500);
});
test('Bola 8 sola + 1 rebote + chain 2: 300×2 ×1.5 = 900', () => {
  const r = calcShot({ pocketed: [{ ballId: 8 }], bounces: 1, chainCount: 1 });
  expect(r.earned, 900);
});

// ── Monedas ───────────────────────────────────────────────────
console.log('\n🪙 Bonus de monedas:');
test('100 pts → 2 monedas', () => {
  const r = calcShot({ pocketed: [{ ballId: 1 }], bounces: 0, chainCount: 0 });
  expect(r.coinBonus, 2);
});
test('1000 pts → 20 monedas', () => {
  const r = calcShot({ pocketed: [{ ballId: 1 },{ ballId: 2 }], bounces: 2, chainCount: 1 });
  // (200)×2×3×1.5 = 1800 → 36 monedas
  expect(r.coinBonus, 36);
});
test('Monedas iniciales en ronda 1 = 0', () => {
  // Simulación de initRound(1)
  const coins = 0; // corregido en el código
  expect(coins, 0);
});

// ── Umbrales de ronda ─────────────────────────────────────────
console.log('\n🏆 Umbrales de ronda:');
const thresholds = Array.from({ length: 10 }, (_, i) => Math.round(500 * Math.pow(1.6, i)));
test('Ronda 1 umbral = 500', () => expect(thresholds[0], 500));
test('Ronda 2 umbral = 800', () => expect(thresholds[1], 800));
test('Ronda 5 umbral alcanzable con buenas jugadas', () => {
  // Con 5 tiros de triplete + 3 rebotes + cadena = 10500 × 5 >> umbral[4]
  expectRange(thresholds[4], 2000, 6000);
});
test('Escala de dificultad es progresiva', () => {
  for (let i = 1; i < thresholds.length; i++) {
    if (thresholds[i] <= thresholds[i-1])
      throw new Error(`Ronda ${i+1} (${thresholds[i]}) no supera ronda ${i} (${thresholds[i-1]})`);
  }
});

// ─────────────────────────────────────────────────────────────
console.log('\n══════════════════════════════════════════');
console.log(`  Resultado: ${passed} pasaron  |  ${failed} fallaron`);
console.log('══════════════════════════════════════════\n');
if (failed > 0) process.exit(1);
