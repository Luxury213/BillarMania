// ============================================================
// hooks/usePowerups.ts — BillarMania
// Hook que gestiona los 5 potenciadores del juego con física
// real sobre Matter.js.
//
// Boosters disponibles:
//   🔥 FUEGO       → ×1.8 velocidad disparo, ×1.5 puntos
//   ❄️  HIELO       → frena bolas rivales ×0.4, ×1.2 puntos
//   💨 VIENTO      → fuerza lateral en vuelo, ×1.3 puntos
//   🎯 PRECISIÓN   → línea de mira ×2 de larga, partículas
//   🔄 TIRO EXTRA  → +1 tiro disponible en la ronda
//
// Integración con GameScreen:
//   - applyFireEffect(dist)   → al disparar (handleAimEnd)
//   - applyIceEffect()        → al embocar bola (handlePockets)
//   - applyWindEffect()       → cada frame del loop (startLoop)
//   - applyPrecisionEffect()  → al disparar (handleAimEnd)
//   - getExtraShots()         → al iniciar ronda (initRound)
//   - getScoreMultiplier()    → al calcular puntos (handlePockets)
//   - getAimLineMult()        → al renderizar guía de apunte
//
// Universidad Santiago de Cali — Computación Móvil 2026
// ============================================================

import Matter from 'matter-js';
import { useCallback, useRef } from 'react';

// ─── TIPOS ────────────────────────────────────────────────────

export type BoosterType =
  | 'booster_fire'
  | 'booster_ice'
  | 'booster_wind'
  | 'booster_precision'
  | 'booster_extra_shot'
  | null;

// ─── CONFIGURACIÓN DECLARATIVA ────────────────────────────────
// Centraliza costo, visual y multiplicadores de cada booster.
// Úsala en la tienda/HUD para renderizar sin hardcodear valores.

export interface BoosterConfig {
  id:         NonNullable<BoosterType>;
  icon:       string;
  color:      string;
  name:       string;
  cost:       number;        // costo en monedas
  speedMult:  number;        // multiplicador de velocidad al disparar
  pointsMult: number;        // multiplicador de puntos al embocar
  slowBalls:  boolean;       // ¿frena bolas rivales? (HIELO)
  curveShot:  boolean;       // ¿añade curva lateral? (VIENTO)
}

export const BOOSTER_CONFIG: Record<NonNullable<BoosterType>, BoosterConfig> = {
  booster_fire: {
    id: 'booster_fire', icon: '🔥', color: '#ff6600', name: 'INFIERNO',
    cost: 120, speedMult: 1.8, pointsMult: 1.5,
    slowBalls: false, curveShot: false,
  },
  booster_ice: {
    id: 'booster_ice', icon: '❄️', color: '#00ccff', name: 'GLACIAR',
    cost: 100, speedMult: 1.0, pointsMult: 1.2,
    slowBalls: true, curveShot: false,
  },
  booster_wind: {
    id: 'booster_wind', icon: '💨', color: '#88ff88', name: 'VIENTO',
    cost: 90, speedMult: 1.0, pointsMult: 1.3,
    slowBalls: false, curveShot: true,
  },
  booster_precision: {
    id: 'booster_precision', icon: '🎯', color: '#ff006e', name: 'PRECISIÓN',
    cost: 80, speedMult: 1.0, pointsMult: 1.0,
    slowBalls: false, curveShot: false,
  },
  booster_extra_shot: {
    id: 'booster_extra_shot', icon: '🔄', color: '#8338ec', name: 'TIRO EXTRA',
    cost: 110, speedMult: 1.0, pointsMult: 1.0,
    slowBalls: false, curveShot: false,
  },
};

// ─── PROPS DEL HOOK ──────────────────────────────────────────

interface UsePowerupsProps {
  bodiesRef:       React.MutableRefObject<Map<number, Matter.Body>>;
  phaseRef:        React.MutableRefObject<'aiming' | 'shooting'>;
  onAddParticles?: (x: number, y: number, color: string, count: number) => void;
}

// ─── HOOK ────────────────────────────────────────────────────

export const usePowerups = ({ bodiesRef, phaseRef, onAddParticles }: UsePowerupsProps) => {

  const activeBoosterRef   = useRef<BoosterType>(null);
  const boosterTimerRef    = useRef<ReturnType<typeof setTimeout> | null>(null);

  // Estadísticas de uso por sesión (para pantalla de resultados)
  const usageCountRef = useRef<Record<NonNullable<BoosterType>, number>>({
    booster_fire:       0,
    booster_ice:        0,
    booster_wind:       0,
    booster_precision:  0,
    booster_extra_shot: 0,
  });

  // ── ACTIVAR ──────────────────────────────────────────────
  /**
   * Activa un booster. Si durationMs > 0, se desactiva automáticamente.
   * GameScreen llama esto cuando el usuario compra un booster.
   */
  const activateBooster = useCallback((booster: BoosterType, durationMs: number = 0) => {
    if (boosterTimerRef.current) clearTimeout(boosterTimerRef.current);
    activeBoosterRef.current = booster;

    if (booster) {
      usageCountRef.current[booster]++;
    }

    if (durationMs > 0) {
      boosterTimerRef.current = setTimeout(() => {
        activeBoosterRef.current = null;
        // Partícula de expiración sobre la bola blanca
        if (onAddParticles) {
          const cue = bodiesRef.current.get(0);
          if (cue) onAddParticles(cue.position.x, cue.position.y, '#888', 8);
        }
      }, durationMs);
    }
    return booster;
  }, [bodiesRef, onAddParticles]);

  // ── DESACTIVAR ───────────────────────────────────────────
  /**
   * Desactiva el booster actual sin devolución de monedas.
   * Llamar después de consumirlo (post-disparo) o si el usuario cancela.
   */
  const deactivateBooster = useCallback(() => {
    if (boosterTimerRef.current) clearTimeout(boosterTimerRef.current);
    activeBoosterRef.current = null;
  }, []);

  // ── CONSUMIR (comprar + activar en un paso) ──────────────
  /**
   * Intenta comprar y activar un booster gastando monedas.
   * Retorna true si la compra fue exitosa, false si no hay fondos.
   * GameScreen pasa onSpendCoins para actualizar su estado de monedas.
   *
   * Ejemplo de uso en GameScreen:
   *   const ok = powerups.buyAndActivate('booster_fire', gameState.coins, (amt) =>
   *     setGameState(prev => ({ ...prev, coins: prev.coins - amt }))
   *   );
   */
  const buyAndActivate = useCallback((
    id:            NonNullable<BoosterType>,
    currentCoins:  number,
    onSpendCoins:  (amount: number) => void,
  ): boolean => {
    const cfg = BOOSTER_CONFIG[id];
    if (currentCoins < cfg.cost) return false;
    onSpendCoins(cfg.cost);
    activateBooster(id);
    return true;
  }, [activateBooster]);

  // ── GETTERS ──────────────────────────────────────────────

  const getActiveBooster = useCallback((): BoosterType => activeBoosterRef.current, []);

  const isBoosterActive = useCallback((booster: BoosterType): boolean =>
    activeBoosterRef.current === booster, []);

  const getUsageCount = useCallback(() => ({ ...usageCountRef.current }), []);

  // ── 🔥 FUEGO: +potencia al disparar ─────────────────────
  /**
   * Llama en handleAimEnd, antes de setVelocity.
   * Retorna { power, fireMult } para que GameScreen aplique la velocidad.
   */
  const applyFireEffect = useCallback((dist: number): { power: number; fireMult: number } => {
    const fireMult = activeBoosterRef.current === 'booster_fire'
      ? BOOSTER_CONFIG.booster_fire.speedMult
      : 1;
    const power = Math.min(dist * 0.055 * fireMult, 14 * fireMult);

    if (activeBoosterRef.current === 'booster_fire' && onAddParticles) {
      const cue = bodiesRef.current.get(0);
      if (cue) onAddParticles(cue.position.x, cue.position.y, '#ff6600', 12);
    }
    return { power, fireMult };
  }, [bodiesRef, onAddParticles]);

  // ── ❄️ HIELO: reducir velocidad de todas las bolas ───────
  /**
   * Llama en handlePockets cuando una bola cae en tronera.
   * Frena todas las bolas en la mesa al 40% de su velocidad actual.
   */
  const applyIceEffect = useCallback((): boolean => {
    if (activeBoosterRef.current !== 'booster_ice') return false;

    bodiesRef.current.forEach(body => {
      Matter.Body.setVelocity(body, {
        x: body.velocity.x * 0.4,
        y: body.velocity.y * 0.4,
      });
    });

    if (onAddParticles) {
      const cue = bodiesRef.current.get(0);
      if (cue) onAddParticles(cue.position.x, cue.position.y, '#00ccff', 10);
    }
    return true;
  }, [bodiesRef, onAddParticles]);

  // ── 💨 VIENTO: fuerza lateral mientras la bola se mueve ──
  /**
   * Llama en cada frame del loop (startLoop) mientras phase === 'shooting'.
   * Aplica una fuerza perpendicular a la dirección de movimiento.
   */
  const applyWindEffect = useCallback((): boolean => {
    if (activeBoosterRef.current !== 'booster_wind') return false;
    if (phaseRef.current !== 'shooting') return false;

    const cueBody = bodiesRef.current.get(0);
    if (!cueBody) return false;

    const speed = Math.sqrt(cueBody.velocity.x ** 2 + cueBody.velocity.y ** 2);
    if (speed > 0.5) {
      Matter.Body.applyForce(cueBody, cueBody.position, {
        x:  cueBody.velocity.y * 0.0012,
        y: -cueBody.velocity.x * 0.0012,
      });
      if (onAddParticles && Math.random() < 0.3) {
        onAddParticles(cueBody.position.x, cueBody.position.y, '#aaffff', 2);
      }
      return true;
    }
    return false;
  }, [bodiesRef, phaseRef, onAddParticles]);

  // ── 🎯 PRECISIÓN: línea de mira más larga ────────────────
  /**
   * Retorna el multiplicador de longitud para la línea de guía.
   * GameScreen multiplica la longitud base de la línea por este valor.
   *   Sin booster → 1.0 (normal)
   *   Con precisión → 2.0 (línea doble)
   */
  const getAimLineMult = useCallback((): number =>
    activeBoosterRef.current === 'booster_precision' ? 2.0 : 1.0, []);

  /**
   * Emite partículas visuales al momento del disparo con precisión.
   * Llama en handleAimEnd junto a applyFireEffect.
   */
  const applyPrecisionEffect = useCallback((): boolean => {
    if (activeBoosterRef.current !== 'booster_precision') return false;
    if (onAddParticles) {
      const cue = bodiesRef.current.get(0);
      if (cue) onAddParticles(cue.position.x, cue.position.y, '#ff006e', 6);
    }
    return true;
  }, [bodiesRef, onAddParticles]);

  // ── 🔄 TIRO EXTRA: +1 tiro en initRound ─────────────────
  /**
   * Retorna cuántos tiros adicionales debe sumar initRound al maxShots.
   * Llama al inicio de cada ronda:
   *   const maxShots = baseMaxShots + powerups.getExtraShots();
   */
  const getExtraShots = useCallback((): number =>
    activeBoosterRef.current === 'booster_extra_shot' ? 1 : 0, []);

  // ── MULTIPLICADOR DE PUNTOS ──────────────────────────────
  /**
   * Retorna el multiplicador de puntos según el booster activo.
   * Llama en handlePockets al calcular el puntaje ganado.
   */
  const getScoreMultiplier = useCallback((): number => {
    const booster = activeBoosterRef.current;
    if (!booster) return 1.0;
    return BOOSTER_CONFIG[booster].pointsMult;
  }, []);

  // ── INFO VISUAL (HUD / tienda) ───────────────────────────
  /**
   * Retorna ícono, color y nombre del booster activo.
   * Úsalo para renderizar el indicador en el HUD de GameScreen.
   */
  const getBoosterInfo = useCallback((): { icon: string; color: string; name: string } => {
    const booster = activeBoosterRef.current;
    if (!booster) return { icon: '', color: '', name: '' };
    const { icon, color, name } = BOOSTER_CONFIG[booster];
    return { icon, color, name };
  }, []);

  // ── CLEANUP ──────────────────────────────────────────────
  /** Llama en el return del useEffect de GameScreen para limpiar timers. */
  const cleanup = useCallback(() => {
    if (boosterTimerRef.current) clearTimeout(boosterTimerRef.current);
  }, []);

  // ─────────────────────────────────────────────────────────
  return {
    // Estado
    getActiveBooster,
    isBoosterActive,
    getUsageCount,

    // Gestión
    activateBooster,
    deactivateBooster,
    buyAndActivate,       // ← nuevo: compra + activa en un paso

    // Efectos físicos (llamar en los puntos correctos de GameScreen)
    applyFireEffect,      // → handleAimEnd
    applyIceEffect,       // → handlePockets
    applyWindEffect,      // → startLoop (cada frame)
    applyPrecisionEffect, // → handleAimEnd
    getAimLineMult,       // → render de línea de guía
    getExtraShots,        // → initRound

    // Datos derivados
    getScoreMultiplier,   // → handlePockets
    getBoosterInfo,       // → HUD

    // Utilidades
    cleanup,
    BOOSTER_CONFIG,       // re-exportado para conveniencia en tienda/HUD
  };
};

export default usePowerups;
