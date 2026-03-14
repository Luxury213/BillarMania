
export const colors = {
  // Fondos
  bg:          '#060910',
  bgCard:      '#0a1020',
  bgInput:     '#0d1628',
  bgOverlay:   '#030508',

  // Neón principal — 
  primary:     '#3a86ff',  // azul eléctrico
  accent:      '#ff006e',  // rosa neón
  purple:      '#8338ec',  // púrpura vibrante
  gold:        '#ffbe0b',  // dorado casino
  green:       '#00ff88',  // verde neón (éxito)
  orange:      '#fb5607',  // naranja fuego (combos)

  // Oscuros
  dark:        '#0a1f3d',
  darkMid:     '#0f2a50',
  textDim:     '#1a3a5c',

  // Texto
  textBright:  '#e8f4ff',
  textMuted:   '#4a7a9b',

  // Bolas de billar
  balls: {
    1:  '#f5c518',
    2:  '#1a6fc4',
    3:  '#e63232',
    4:  '#7b2fff',
    5:  '#ff6b1a',
    6:  '#16a34a',
    7:  '#c2410c',
    8:  '#1a1a1a',
    9:  '#f5c518',
    10: '#1a6fc4',
    11: '#e63232',
    12: '#7b2fff',
    13: '#ff6b1a',
    14: '#16a34a',
    15: '#c2410c',
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

export const typography = {
  gameTitle: {
    fontSize: 48,
    fontFamily: 'm6x11',
    letterSpacing: 6,
    textTransform: 'uppercase' as const,
  },
  heading: {
    fontSize: 28,
    fontFamily: 'm6x11',
    letterSpacing: 4,
    textTransform: 'uppercase' as const,
  },
  button: {
    fontSize: 20,
    fontFamily: 'm6x11',
    letterSpacing: 3,
    textTransform: 'uppercase' as const,
  },
  label: {
    fontSize: 16,
    fontFamily: 'VT323',
    letterSpacing: 3,
    textTransform: 'uppercase' as const,
  },
  body: {
    fontSize: 18,
    fontFamily: 'VT323',
    letterSpacing: 1,
  },
  mono: {
    fontSize: 16,
    fontFamily: 'VT323',
    letterSpacing: 2,
  },
  small: {
    fontSize: 14,
    fontFamily: 'VT323',
    letterSpacing: 2,
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