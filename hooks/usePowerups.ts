// hooks/usePowerups.ts
import { useCallback, useRef } from 'react';
import Matter from 'matter-js';

export type BoosterType = 'booster_fire' | 'booster_ice' | 'booster_wind' | null;

interface UsePowerupsProps {
  bodiesRef: React.MutableRefObject<Map<number, Matter.Body>>;
  phaseRef: React.MutableRefObject<'aiming' | 'shooting'>;
  onAddParticles?: (x: number, y: number, color: string, count: number) => void;
}

export const usePowerups = ({ bodiesRef, phaseRef, onAddParticles }: UsePowerupsProps) => {
  const activeBoosterRef = useRef<BoosterType>(null);
  const boosterDurationRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  // Activar un potenciador
  const activateBooster = useCallback((booster: BoosterType, durationMs: number = 0) => {
    // Limpiar duración anterior
    if (boosterDurationRef.current) {
      clearTimeout(boosterDurationRef.current);
    }
    
    activeBoosterRef.current = booster;
    
    // Auto-desactivar después de la duración (si durationMs > 0)
    if (durationMs > 0) {
      boosterDurationRef.current = setTimeout(() => {
        activeBoosterRef.current = null;
        if (onAddParticles) {
          const cue = bodiesRef.current.get(0);
          if (cue) {
            onAddParticles(cue.position.x, cue.position.y, '#888', 8);
          }
        }
      }, durationMs);
    }
    
    return booster;
  }, [bodiesRef, onAddParticles]);

  // Desactivar potenciador manualmente
  const deactivateBooster = useCallback(() => {
    if (boosterDurationRef.current) {
      clearTimeout(boosterDurationRef.current);
    }
    activeBoosterRef.current = null;
  }, []);

  // Obtener potenciador activo
  const getActiveBooster = useCallback(() => {
    return activeBoosterRef.current;
  }, []);

  // EFECTO FUEGO: multiplicador de velocidad al disparar
  const applyFireEffect = useCallback((dist: number): { power: number; fireMult: number } => {
    const fireMult = activeBoosterRef.current === 'booster_fire' ? 1.8 : 1;
    const power = Math.min(dist * 0.055 * fireMult, 14 * fireMult);
    
    if (activeBoosterRef.current === 'booster_fire' && onAddParticles) {
      const cue = bodiesRef.current.get(0);
      if (cue) {
        onAddParticles(cue.position.x, cue.position.y, '#ff6600', 12);
      }
    }
    
    return { power, fireMult };
  }, [bodiesRef, onAddParticles]);

  // EFECTO HIELO: ralentizar todas las bolas al detenerse
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
      if (cue) {
        onAddParticles(cue.position.x, cue.position.y, '#00ccff', 10);
      }
    }
    return true;
  }, [bodiesRef, onAddParticles]);

  // EFECTO VIENTO: aplicar fuerza lateral mientras se mueve
  const applyWindEffect = useCallback(() => {
    if (activeBoosterRef.current !== 'booster_wind') return false;
    if (phaseRef.current !== 'shooting') return false;
    
    const cueBody = bodiesRef.current.get(0);
    if (!cueBody) return false;
    
    const speed = Math.sqrt(
      cueBody.velocity.x ** 2 + cueBody.velocity.y ** 2
    );
    
    if (speed > 0.5) {
      // Fuerza perpendicular al movimiento (curva a la derecha)
      const windX = cueBody.velocity.y * 0.0012;
      const windY = -cueBody.velocity.x * 0.0012;
      Matter.Body.applyForce(cueBody, cueBody.position, { x: windX, y: windY });
      
      // Partículas de viento (opcional)
      if (onAddParticles && Math.random() < 0.3) {
        onAddParticles(cueBody.position.x, cueBody.position.y, '#aaffff', 2);
      }
      return true;
    }
    return false;
  }, [bodiesRef, phaseRef, onAddParticles]);

  // Verificar si un potenciador está activo
  const isBoosterActive = useCallback((booster: BoosterType): boolean => {
    return activeBoosterRef.current === booster;
  }, []);

  // Obtener el multiplicador de puntos para el potenciador
  const getScoreMultiplier = useCallback((): number => {
    switch (activeBoosterRef.current) {
      case 'booster_fire': return 1.5;
      case 'booster_ice': return 1.2;
      case 'booster_wind': return 1.3;
      default: return 1;
    }
  }, []);

  // Obtener información visual del potenciador
  const getBoosterInfo = useCallback(() => {
    switch (activeBoosterRef.current) {
      case 'booster_fire': return { icon: '🔥', color: '#ff6600', name: 'FUEGO' };
      case 'booster_ice': return { icon: '❄️', color: '#00ccff', name: 'HIELO' };
      case 'booster_wind': return { icon: '💨', color: '#88ff88', name: 'VIENTO' };
      default: return { icon: '', color: '', name: '' };
    }
  }, []);

  // Limpiar al desmontar
  const cleanup = useCallback(() => {
    if (boosterDurationRef.current) {
      clearTimeout(boosterDurationRef.current);
    }
  }, []);

  return {
    activateBooster,
    deactivateBooster,
    getActiveBooster,
    applyFireEffect,
    applyIceEffect,
    applyWindEffect,
    isBoosterActive,
    getScoreMultiplier,
    getBoosterInfo,
    cleanup,
  };
};

export default usePowerups;