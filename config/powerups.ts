// config/powerups.ts
export interface Powerup {
  id: string;
  name: string;
  description: string;
  price: number;
  emoji: string;
  color: string;
  effect: {
    type: 'power_boost' | 'extra_shots' | 'coin_boost' | 'shield' | 'point_multiplier';
    value: number;
  };
}

export const POWERUPS: Powerup[] = [
  {
    id: 'power_boost',
    name: '💪 TIRO POTENTE',
    description: '+30% de potencia en el disparo',
    price: 100,
    emoji: '💪',
    color: '#ff4500',
    effect: { type: 'power_boost', value: 1.3 },
  },
  {
    id: 'extra_shots',
    name: '🔄 TIRO EXTRA',
    description: '+1 tiro por ronda',
    price: 100,
    emoji: '🔄',
    color: '#8338ec',
    effect: { type: 'extra_shots', value: 1 },
  },
  {
    id: 'coin_boost',
    name: '🪙 IMÁN DE MONEDAS',
    description: '+20% monedas ganadas',
    price: 100,
    emoji: '🪙',
    color: '#ffbe0b',
    effect: { type: 'coin_boost', value: 1.2 },
  },
  {
    id: 'shield',
    name: '🛡️ ESCUDO',
    description: 'Fallar NO rompe el combo',
    price: 100,
    emoji: '🛡️',
    color: '#00ff88',
    effect: { type: 'shield', value: 1 },
  },
  {
    id: 'point_multiplier',
    name: '📈 MULTIPLICADOR',
    description: 'Todos los puntos ×1.2',
    price: 100,
    emoji: '📈',
    color: '#ff006e',
    effect: { type: 'point_multiplier', value: 1.2 },
  },
];