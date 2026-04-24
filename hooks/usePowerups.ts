// hooks/usePowerups.ts
import Matter from 'matter-js';
import { useCallback, useRef } from 'react';

// ✅ Tipo actualizado con los dos nuevos boosters
export type BoosterType =
  | 'booster_fire'
  | 'booster_ice'
  | 'booster_wind'
  | 'booster_precision'
  | 'booster_extra_shot'
  | null;

interface UsePowerupsProps {
  bodiesRef: React.MutableRefObject<Map<number, Matter.Body>>;
  phaseRef: React.MutableRefObject<'aiming' | 'shooting'>;
  onAddParticles?: (x: number, y: number, color: string, count: number) => void;
}

export const usePowerups = ({ bodiesRef, phaseRef, onAddParticles }: UsePowerupsProps) => {
  const activeBoosterRef    = useRef<BoosterType>(null);
  const boosterDurationRef  = useRef<ReturnType<typeof setTimeout> | null>(null);

  // ── Activar ───────────────────────────────────────────────
  const activateBooster = useCallback((booster: BoosterType, durationMs: number = 0) => {
    if (boosterDurationRef.current) clearTimeout(boosterDurationRef.current);
    activeBoosterRef.current = booster;
    if (durationMs > 0) {
      boosterDurationRef.current = setTimeout(() => {
        activeBoosterRef.current = null;
        if (onAddParticles) {
          const cue = bodiesRef.current.get(0);
          if (cue) onAddParticles(cue.position.x, cue.position.y, '#888', 8);
        }
      }, durationMs);
    }
    return booster;
  }, [bodiesRef, onAddParticles]);

  // ── Desactivar ────────────────────────────────────────────
  const deactivateBooster = useCallback(() => {
    if (boosterDurationRef.current) clearTimeout(boosterDurationRef.current);
    activeBoosterRef.current = null;
  }, []);

  const getActiveBooster = useCallback(() => activeBoosterRef.current, []);

  const isBoosterActive = useCallback((booster: BoosterType): boolean => {
    return activeBoosterRef.current === booster;
  }, []);

  // ── FUEGO: +potencia al disparar ─────────────────────────
  const applyFireEffect = useCallback((dist: number): { power: number; fireMult: number } => {
    const fireMult = activeBoosterRef.current === 'booster_fire' ? 1.8 : 1;
    const power    = Math.min(dist * 0.055 * fireMult, 14 * fireMult);
    if (activeBoosterRef.current === 'booster_fire' && onAddParticles) {
      const cue = bodiesRef.current.get(0);
      if (cue) onAddParticles(cue.position.x, cue.position.y, '#ff6600', 12);
    }
    return { power, fireMult };
  }, [bodiesRef, onAddParticles]);

  // ── HIELO: reducir velocidad de todas las bolas ───────────
  const applyIceEffect = useCallback(() => {
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

  // ── VIENTO: fuerza lateral mientras se mueve ──────────────
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

  // ── PRECISIÓN: retorna la longitud de línea de mira ───────
  // GameScreen llama esto para saber qué tan larga dibujar la línea.
  // Sin booster → 1.0 (normal). Con precisión → 2.0 (doble).
  const getAimLineMult = useCallback((): number => {
    return activeBoosterRef.current === 'booster_precision' ? 2.0 : 1.0;
  }, []);

  // Partícula visual al disparar con precisión
  const applyPrecisionEffect = useCallback(() => {
    if (activeBoosterRef.current !== 'booster_precision') return false;
    if (onAddParticles) {
      const cue = bodiesRef.current.get(0);
      if (cue) onAddParticles(cue.position.x, cue.position.y, '#ff006e', 6);
    }
    return true;
  }, [bodiesRef, onAddParticles]);

  // ── TIRO EXTRA: retorna los tiros adicionales ─────────────
  // GameScreen llama esto en initRound para sumar al maxShots.
  const getExtraShots = useCallback((): number => {
    return activeBoosterRef.current === 'booster_extra_shot' ? 1 : 0;
  }, []);

  // ── Multiplicador de puntos ───────────────────────────────
  const getScoreMultiplier = useCallback((): number => {
    switch (activeBoosterRef.current) {
      case 'booster_fire':       return 1.5;
      case 'booster_ice':        return 1.2;
      case 'booster_wind':       return 1.3;
      case 'booster_precision':  return 1.0; // no afecta puntos
      case 'booster_extra_shot': return 1.0; // no afecta puntos
      default:                   return 1.0;
    }
  }, []);

  // ── Info visual (HUD / tienda) ────────────────────────────
  const getBoosterInfo = useCallback(() => {
    switch (activeBoosterRef.current) {
      case 'booster_fire':       return { icon: '🔥', color: '#ff6600', name: 'FUEGO' };
      case 'booster_ice':        return { icon: '❄️', color: '#00ccff', name: 'HIELO' };
      case 'booster_wind':       return { icon: '💨', color: '#88ff88', name: 'VIENTO' };
      case 'booster_precision':  return { icon: '🎯', color: '#ff006e', name: 'PRECISIÓN' };
      case 'booster_extra_shot': return { icon: '🔄', color: '#8338ec', name: 'TIRO EXTRA' };
      default:                   return { icon: '', color: '', name: '' };
    }
  }, []);

  // ── Cleanup ───────────────────────────────────────────────
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
    applyWindEffect,
    applyPrecisionEffect, // ✅ nuevo
    getAimLineMult,       // ✅ nuevo
    getExtraShots,        // ✅ nuevo
    getScoreMultiplier,
    getBoosterInfo,
    cleanup,
  };
};

export default usePowerups;