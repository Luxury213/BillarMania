import { Dimensions } from 'react-native';

const { width, height } = Dimensions.get('window');

export const W = width;
export const H = height * 0.75;

export const BAND = Math.round(W * 0.045);
export const BALL_R = Math.round(W * 0.028);
export const POCKET_R = Math.round(W * 0.032);

export const POCKETS = [
  { x: BAND,     y: BAND },
  { x: W / 2,    y: BAND - POCKET_R * 0.3 },
  { x: W - BAND, y: BAND },
  { x: BAND,     y: H - BAND },
  { x: W / 2,    y: H - BAND + POCKET_R * 0.3 },
  { x: W - BAND, y: H - BAND },
];

export const BALL_DATA = [
  { n: 1,  color: '#F5C430', solid: true  },
  { n: 2,  color: '#185FA5', solid: true  },
  { n: 3,  color: '#E24B4A', solid: true  },
  { n: 4,  color: '#6B3FA0', solid: true  },
  { n: 5,  color: '#D85A30', solid: true  },
  { n: 6,  color: '#0F6E56', solid: true  },
  { n: 7,  color: '#993C1D', solid: true  },
  { n: 8,  color: '#1a1a1a', solid: true  },
  { n: 9,  color: '#F5C430', solid: false },
  { n: 10, color: '#185FA5', solid: false },
  { n: 11, color: '#E24B4A', solid: false },
  { n: 12, color: '#6B3FA0', solid: false },
  { n: 13, color: '#D85A30', solid: false },
  { n: 14, color: '#0F6E56', solid: false },
  { n: 15, color: '#993C1D', solid: false },
];
