// Hand-drawn tooltip theming. Two palettes (default dark) plus the sketchy
// shape primitives — an irregular "wobbly" border-radius and a marker font —
// shared by HoverTooltip and the panel bodies so both modes stay consistent.

export type ThemeName = 'dark' | 'light';

export interface Theme {
  /** Card background. */
  surface: string;
  /** Primary text / hand-drawn ink line colour. */
  ink: string;
  /** Secondary text. */
  sub: string;
  /** Warm accent for labels/counters. */
  accent: string;
  /** Sketch border colour. */
  border: string;
  /** Hairline divider. */
  divider: string;
  /** Counter / status chip. */
  chipBg: string;
  chipText: string;
  /** Top-right toolbar buttons. */
  toolbarBg: string;
  /** Destructive (remove word) action. */
  dangerBg: string;
  dangerText: string;
  /** Drop shadow giving the card its lifted, inked look. */
  shadow: string;
}

export const THEMES: Record<ThemeName, Theme> = {
  dark: {
    surface: 'linear-gradient(160deg, #26233a, #1b1a29)',
    ink: '#f5ecdc',
    sub: '#b6ab97',
    accent: '#ffce8a',
    border: '#f5ecdc',
    divider: 'rgba(245, 236, 220, 0.22)',
    chipBg: 'rgba(255, 179, 71, 0.18)',
    chipText: '#ffce8a',
    toolbarBg: 'rgba(245, 236, 220, 0.1)',
    dangerBg: 'rgba(255, 99, 99, 0.16)',
    dangerText: '#ff9b9b',
    shadow: '5px 6px 0 rgba(0, 0, 0, 0.32)',
  },
  light: {
    surface: 'linear-gradient(160deg, #fffdf7, #fdf1da)',
    ink: '#2c2015',
    sub: '#6d5436',
    accent: '#bf7a29',
    border: '#2c2015',
    divider: 'rgba(44, 32, 21, 0.18)',
    chipBg: '#ffe6b3',
    chipText: '#9b5f12',
    toolbarBg: 'rgba(44, 32, 21, 0.06)',
    dangerBg: 'rgba(255, 92, 92, 0.12)',
    dangerText: '#c43d3d',
    shadow: '4px 5px 0 rgba(44, 32, 21, 0.18)',
  },
};

// Classic CSS hand-drawn box: asymmetric radii on the two axes give a wobbly,
// sketched outline instead of a clean rounded rectangle.
export const SKETCH_RADIUS =
  '255px 15px 225px 15px / 15px 225px 15px 255px';

export const HAND_FONT =
  '"Comic Sans MS", "Comic Sans", "Chalkboard SE", "Comic Neue", "Segoe Print", "Bradley Hand", "PingFang SC", sans-serif';
