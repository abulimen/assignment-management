/** @type {import('tailwindcss').Config} */
// Draftly design tokens. The `primary` scale is the Plum Ink aubergine ramp
// (OKLCH-derived, see DESIGN.md); `canvas`/`line` are the warm paper neutrals
// the app chrome sits on. Semantic ok/warn/danger intentionally sit far from
// the brand hue so verdicts and flags never read as buttons.
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
      },
      fontFamily: {
        sans: ['Inter', 'system-ui', 'sans-serif'],
        mono: ['JetBrains Mono', 'monospace'],
        // Display headings (hero, auth, page titles). System serifs only, so
        // the literary voice ships with no extra font files.
        serif: ['Georgia', 'Iowan Old Style', 'Times New Roman', 'serif'],
      },
    },
  },
  plugins: [],
};