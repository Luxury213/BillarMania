// hooks/usePowerups.ts
import Matter from 'matter-js';
import { useCallback, useRef } from 'react';

export type BoosterType =
  | 'booster_fire'
  | 'booster_ice'
  | 'booster_wind'
  | 'booster_precision'
  | 'booster_extra_shot'
  | 'booster_combo_seguro'  // ✅ nuevo
  | 'booster_primera_bola'  // ✅ nuevo
  | null;

interface UsePowerupsProps {
  bodiesRef: React.MutableRefObject<Map<number, Matter.Body>>;
  phaseRef: React.MutableRefObject<'aiming' | 'shooting'>;
  onAddParticles?: (x: number, y: number, color: string, count: number) => void;
}

export const usePowerups = ({ bodiesRef, phaseRef, onAddParticles }: UsePowerupsProps) => {
  const activeBoosterRef   = useRef<BoosterType>(null);
  const boosterDurationRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const activateBooster = useCallback((booster: BoosterType, durationMs = 0) => {
    if (boosterDurationRef.current) clearTimeout(boosterDurationRef.current);
    activeBoosterRef.current = booster;
    if (durationMs > 0) {
      boosterDurationRef.current = setTimeout(() => {
        activeBoosterRef.current = null;
        const cue = bodiesRef.current.get(0);
        if (cue && onAddParticles) onAddParticles(cue.position.x, cue.position.y, '#888', 8);
      }, durationMs);
    }
    return booster;
  }, [bodiesRef, onAddParticles]);

  const deactivateBooster = useCallback(() => {
    if (boosterDurationRef.current) clearTimeout(boosterDurationRef.current);
    activeBoosterRef.current = null;
  }, []);

  const getActiveBooster = useCallback(() => activeBoosterRef.current, []);
  const isBoosterActive  = useCallback((b: BoosterType) => activeBoosterRef.current === b, []);

  // ── FUEGO ─────────────────────────────────────────────────
  const applyFireEffect = useCallback((dist: number) => {
    const fireMult = activeBoosterRef.current === 'booster_fire' ? 1.8 : 1;
    const power    = Math.min(dist * 0.055 * fireMult, 14 * fireMult);
    if (activeBoosterRef.current === 'booster_fire' && onAddParticles) {
      const cue = bodiesRef.current.get(0);
      if (cue) onAddParticles(cue.position.x, cue.position.y, '#ff6600', 12);
    }
    return { power, fireMult };
  }, [bodiesRef, onAddParticles]);

  // ── HIELO ─────────────────────────────────────────────────
  const applyIceEffect = useCallback(() => {
    if (activeBoosterRef.current !== 'booster_ice') return false;
    bodiesRef.current.forEach(body =>
      Matter.Body.set(body, { frictionAir: 0.008 })
    );
    const cue = bodiesRef.current.get(0);
    if (cue && onAddParticles) onAddParticles(cue.position.x, cue.position.y, '#00ccff', 10);
    return true;
  }, [bodiesRef, onAddParticles]);

  // Restaurar fricción al terminar tiro con hielo
  const restoreIceEffect = useCallback(() => {
    if (activeBoosterRef.current !== 'booster_ice') return false;
    bodiesRef.current.forEach(body =>
      Matter.Body.set(body, { frictionAir: 0.018 })
    );
    return true;
  }, [bodiesRef]);

  // ── VIENTO ────────────────────────────────────────────────
  const applyWindEffect = useCallback(() => {
    if (activeBoosterRef.current !== 'booster_wind') return false;
    if (phaseRef.current !== 'shooting') return false;
    const cueBody = bodiesRef.current.get(0);
    if (!cueBody) return false;
    const speed = Math.sqrt(cueBody.velocity.x ** 2 + cueBody.velocity.y ** 2);
    if (speed > 0.5) {
      Matter.Body.applyForce(cueBody, cueBody.position, {
        x: cueBody.velocity.y * 0.0012,
        y: -cueBody.velocity.x * 0.0012,
      });
      if (onAddParticles && Math.random() < 0.3)
        onAddParticles(cueBody.position.x, cueBody.position.y, '#aaffff', 2);
      return true;
    }
    return false;
  }, [bodiesRef, phaseRef, onAddParticles]);

  // ── PRECISIÓN ─────────────────────────────────────────────
  const getAimLineMult = useCallback((): number => {
    return activeBoosterRef.current === 'booster_precision' ? 2.0 : 1.0;
  }, []);

  const applyPrecisionEffect = useCallback(() => {
    if (activeBoosterRef.current !== 'booster_precision') return false;
    const cue = bodiesRef.current.get(0);
    if (cue && onAddParticles) onAddParticles(cue.position.x, cue.position.y, '#ff006e', 6);
    return true;
  }, [bodiesRef, onAddParticles]);

  // ── TIRO EXTRA ────────────────────────────────────────────
  const getExtraShots = useCallback((): number => {
    return activeBoosterRef.current === 'booster_extra_shot' ? 1 : 0;
  }, []);

  // ── COMBO SEGURO ✅ ───────────────────────────────────────
  // GameScreen llama esto en initRound para saber con qué chainCount arrancar
  const getInitialChain = useCallback((): number => {
    return activeBoosterRef.current === 'booster_combo_seguro' ? 2 : 0;
  }, []);

  // ── PRIMERA BOLA ✅ ───────────────────────────────────────
  // GameScreen llama esto en calcShot para saber si aplicar x2 a la primera bola
  const getFirstBallMult = useCallback((): number => {
    return activeBoosterRef.current === 'booster_primera_bola' ? 2.0 : 1.0;
  }, []);

  // ── Score multiplier ──────────────────────────────────────
  const getScoreMultiplier = useCallback((): number => {
    switch (activeBoosterRef.current) {
      case 'booster_fire':  return 1.5;
      case 'booster_ice':   return 1.2;
      case 'booster_wind':  return 1.3;
      default:              return 1.0;
    }
  }, []);

  // ── Info visual ───────────────────────────────────────────
  const getBoosterInfo = useCallback(() => {
    switch (activeBoosterRef.current) {
      case 'booster_fire':         return { icon: '🔥', color: '#ff6600', name: 'FUEGO' };
      case 'booster_ice':          return { icon: '❄️', color: '#00ccff', name: 'HIELO' };
      case 'booster_wind':         return { icon: '💨', color: '#88ff88', name: 'VIENTO' };
      case 'booster_precision':    return { icon: '🎯', color: '#ff006e', name: 'PRECISIÓN' };
      case 'booster_extra_shot':   return { icon: '🔄', color: '#8338ec', name: 'TIRO EXTRA' };
      case 'booster_combo_seguro': return { icon: '⭐', color: '#ffbe0b', name: 'COMBO SEGURO' };
      case 'booster_primera_bola': return { icon: '✨', color: '#00ff88', name: 'PRIMERA BOLA' };
      default:                     return { icon: '', color: '', name: '' };
    }
  }, []);

  const cleanup = useCallback(() => {
    if (boosterDurationRef.current) clearTimeout(boosterDurationRef.current);
  }, []);

  return {
    activateBooster,
    deactivateBooster,
    getActiveBooster,
    isBoosterActive,
    applyFireEffect,
    applyIceEffect,
    restoreIceEffect,   // ✅ separado del apply para usarlo en resolveShot
    applyWindEffect,
    applyPrecisionEffect,
    getAimLineMult,
    getExtraShots,
    getInitialChain,    // ✅ nuevo
    getFirstBallMult,   // ✅ nuevo
    getScoreMultiplier,
    getBoosterInfo,
    cleanup,
  };
};

export default usePowerups;