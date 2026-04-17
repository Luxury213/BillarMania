// hooks/usePowerups.ts
import { useCallback, useState } from 'react';
import { POWERUPS } from '../config/powerups';

export function usePowerups() {
  const [inventory, setInventory] = useState<string[]>([]);
  const [coins, setCoins] = useState(150);
  const MAX_INVENTORY_SIZE = 5;

  const buyPowerup = useCallback((powerupId: string) => {
    const powerup = POWERUPS.find(p => p.id === powerupId);
    if (!powerup) return false;
    
    if (inventory.length >= MAX_INVENTORY_SIZE) {
      alert(`❌ Inventario lleno (máximo ${MAX_INVENTORY_SIZE} potenciadores). Vende uno para comprar otro.`);
      return false;
    }
    
    if (inventory.includes(powerupId)) {
      alert('❌ Ya tienes este potenciador');
      return false;
    }
    
    if (coins >= powerup.price) {
      setCoins(prev => prev - powerup.price);
      setInventory(prev => [...prev, powerupId]);
      return true;
    }
    alert('❌ No tienes suficientes monedas');
    return false;
  }, [coins, inventory]);

  const sellPowerup = useCallback((powerupId: string) => {
    const powerup = POWERUPS.find(p => p.id === powerupId);
    if (!powerup) return false;
    
    if (inventory.includes(powerupId)) {
      setInventory(prev => prev.filter(id => id !== powerupId));
      setCoins(prev => prev + Math.floor(powerup.price / 2));
      return true;
    }
    return false;
  }, [inventory]);

  const hasPowerup = useCallback((powerupId: string): boolean => {
    return inventory.includes(powerupId);
  }, [inventory]);

  // ========== EFECTOS ==========
  
  const getPowerMultiplier = useCallback((): number => {
    let mult = 1;
    if (hasPowerup('power_boost')) mult *= 1.3;
    return mult;
  }, [hasPowerup]);

  const getExtraShots = useCallback((): number => {
    return hasPowerup('extra_shots') ? 1 : 0;
  }, [hasPowerup]);

  const getCoinMultiplier = useCallback((): number => {
    return hasPowerup('coin_boost') ? 1.2 : 1;
  }, [hasPowerup]);

  const hasShield = useCallback((): boolean => {
    return hasPowerup('shield');
  }, [hasPowerup]);

  const getPointMultiplier = useCallback((): number => {
    return hasPowerup('point_multiplier') ? 1.2 : 1;
  }, [hasPowerup]);

  return {
    inventory,
    coins,
    setCoins,
    buyPowerup,
    sellPowerup,
    hasPowerup,
    getPowerMultiplier,
    getExtraShots,
    getCoinMultiplier,
    hasShield,
    getPointMultiplier,
  };
}