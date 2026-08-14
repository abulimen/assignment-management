/** @type {import('tailwindcss').Config} */
// Draftly design tokens. Two identities live side by side:
//  - Plum Ink (primary ramp + canvas/surface/line): the app interior.
//  - Flight Recorder (graphite/sheet/cobalt/signal): landing + auth, OKLCH.
// See DESIGN.md. Semantic ok/warn/danger intentionally sit far from the brand
// hue so verdicts and flags never read as buttons.
export default {
  content: ['./index.html', './src/**/*.{js,jsx}'],
  theme: {
    extend: {
      colors: {
        primary: {
          50: '#f4f2fb', 100: '#ece8fe', 200: '#d9d2f6', 300: '#bdb2e6',
          400: '#9583ca', 500: '#735cad', 600: '#593f91', 700: '#462f75',
          800: '#36265a', 900: '#292040',
        },
        canvas: '#f3f0e9',
        surface: '#fcfaf5',
        line: '#dedad2',
        // Flight Recorder: dark graphite chassis (cool neutrals tinted toward
        // the cobalt hue ~255deg), one luminous sheet, cobalt telemetry, and
        // an electric cyan signal. `signal` is never text on a cobalt fill.
        graphite: {
          950: 'oklch(0.145 0.012 255)',
          900: 'oklch(0.185 0.014 255)',
          800: 'oklch(0.225 0.016 255)',
          700: 'oklch(0.30 0.018 255)',
          600: 'oklch(0.40 0.02 255)',
          500: 'oklch(0.55 0.02 250)',
          400: 'oklch(0.66 0.018 250)',
          300: 'oklch(0.76 0.015 250)',
          200: 'oklch(0.87 0.012 250)',
        },
        sheet: 'oklch(0.972 0.007 228)',
        cobalt: {
          300: 'oklch(0.72 0.12 262)',
          400: 'oklch(0.62 0.16 262)',
          500: 'oklch(0.545 0.18 266)',
          600: 'oklch(0.485 0.185 266)',
        },
        signal: 'oklch(0.86 0.12 202)',
        // Dark-tinted semantics for the Flight Recorder surfaces.
        error: { bg: 'oklch(0.25 0.05 25)', fg: 'oklch(0.78 0.14 25)' },
        ok: { bg: 'oklch(0.27 0.045 155)', fg: 'oklch(0.80 0.13 155)' },
      },
      fontFamily: {
        sans: ['Inter', 'system-ui', 'sans-serif'],
        mono: ['JetBrains Mono', 'monospace'],
        // Display headings (hero, auth, page titles). System serifs only, so
        // the literary voice ships with no extra font files.
        serif: ['Georgia', 'Iowan Old Style', 'Times New Roman', 'serif'],
        // Flight Recorder voice: Archivo Variable (wght + wdth axes). Display
        // uses heavy weights stretched wide; body stays at normal width.
        instrument: ['"Archivo Variable"', 'Archivo', 'system-ui', 'sans-serif'],
      },
    },
  },
  plugins: [],
};