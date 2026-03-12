// ═══════════════════════════════════════════
//  BILLARMANIA — DESIGN SYSTEM
//  Inspirado en Balatro: pixel art + neon noir
// ═══════════════════════════════════════════

// ── COLORES BASE ────────────────────────────
export const colors = {
  // Fondos
  bg:          '#060910',  // negro profundo
  bgCard:      '#0a1020',  // cards y modales
  bgInput:     '#0d1628',  // campos de texto
  bgOverlay:   '#030508',  // overlays

  // Neón principal
  primary:     '#00d4ff',  // azul neón (como el verde de Balatro pero azul)
  accent:      '#ff2d55',  // rojo neón (botones principales)
  purple:      '#9b30ff',  // púrpura (potenciadores)
  gold:        '#ffd426',  // dorado (monedas, puntos)
  green:       '#00ff88',  // verde neón (éxito, combos)

  // Oscuros
  dark:        '#0a1f3d',
  darkMid:     '#0f2a50',
  textDim:     '#1a3a5c',

  // Texto
  textBright:  '#e8f4ff',
  textMuted:   '#4a7a9b',

  // Bolas de billar
  balls: {
    1:  '#f5c518',  // amarillo
    2:  '#1a6fc4',  // azul
    3:  '#e63232',  // rojo
    4:  '#7b2fff',  // morado
    5:  '#ff6b1a',  // naranja
    6:  '#16a34a',  // verde
    7:  '#c2410c',  // marrón
    8:  '#1a1a1a',  // negra
    9:  '#f5c518',  // rayada amarilla
    10: '#1a6fc4',  // rayada azul
    11: '#e63232',  // rayada roja
    12: '#7b2fff',  // rayada morada
    13: '#ff6b1a',  // rayada naranja
    14: '#16a34a',  // rayada verde
    15: '#c2410c',  // rayada marrón
  }
};

// ── EFECTOS NEÓN ────────────────────────────
export const neonText = (color: string) => ({
  textShadowColor: color,
  textShadowOffset: { width: 0, height: 0 },
  textShadowRadius: 12,
});

export const neonBox = (color: string) => ({
  shadowColor: color,
  shadowOpacity: 0.8,
  shadowRadius: 16,
  shadowOffset: { width: 0, height: 0 },
  elevation: 12,
});

export const neonBorder = (color: string) => ({
  borderWidth: 2,
  borderColor: color,
  ...neonBox(color),
});

// ── TIPOGRAFÍA (estilo Balatro) ──────────────
// Todo en mayúsculas, mucho letterSpacing, pixel art feel
export const typography = {
  gameTitle: {
    fontSize: 34,
    fontWeight: '900' as const,
    letterSpacing: 14,
    textTransform: 'uppercase' as const,
  },
  heading: {
    fontSize: 22,
    fontWeight: '900' as const,
    letterSpacing: 6,
    textTransform: 'uppercase' as const,
  },
  label: {
    fontSize: 11,
    fontWeight: 'bold' as const,
    letterSpacing: 4,
    textTransform: 'uppercase' as const,
  },
  button: {
    fontSize: 13,
    fontWeight: '900' as const,
    letterSpacing: 4,
    textTransform: 'uppercase' as const,
  },
  body: {
    fontSize: 14,
    letterSpacing: 1,
  },
  mono: {
    fontSize: 12,
    letterSpacing: 3,
    fontVariant: ['tabular-nums'] as any,
  },
  small: {
    fontSize: 9,
    letterSpacing: 3,
    textTransform: 'uppercase' as const,
  },
};

// ── ESPACIADO ────────────────────────────────
export const spacing = {
  xs: 4,
  sm: 8,
  md: 16,
  lg: 24,
  xl: 32,
  xxl: 48,
};

// ── BORDES (sin border radius — estilo Balatro) ──
export const borders = {
  sharp: { borderRadius: 0 },      // completamente cuadrado
  pixel: { borderRadius: 2 },      // casi cuadrado, 1px de suavidad
  card:  { borderRadius: 4 },      // cards, muy sutil
};

// ── COMPONENTES REUTILIZABLES ────────────────
export const components = {
  // Botón primario estilo Balatro
  buttonPrimary: {
    backgroundColor: 'transparent',
    borderWidth: 2,
    borderColor: colors.accent,
    borderRadius: 2,
    paddingVertical: 14,
    paddingHorizontal: 24,
    alignItems: 'center' as const,
    ...neonBox(colors.accent),
  },

  // Botón secundario
  buttonSecondary: {
    backgroundColor: 'transparent',
    borderWidth: 1,
    borderColor: colors.primary,
    borderRadius: 2,
    paddingVertical: 12,
    paddingHorizontal: 24,
    alignItems: 'center' as const,
  },

  // Card estilo Balatro
  card: {
    backgroundColor: colors.bgCard,
    borderWidth: 1,
    borderColor: colors.dark,
    borderRadius: 4,
    padding: spacing.md,
  },

  // Input
  input: {
    backgroundColor: colors.bgInput,
    borderWidth: 0,
    borderBottomWidth: 2,
    borderBottomColor: colors.dark,
    borderRadius: 0,
    paddingVertical: 10,
    paddingHorizontal: 4,
    color: colors.primary,
    fontSize: 15,
    letterSpacing: 1,
  },

  // Divider pixelado
  pixelDivider: {
    height: 2,
    backgroundColor: colors.dark,
    marginVertical: spacing.md,
  },
};

// ── GRID DE FONDO (efecto Balatro) ───────────
export const bgGrid = {
  position: 'absolute' as const,
  top: 0, left: 0, right: 0, bottom: 0,
  opacity: 0.04,
};