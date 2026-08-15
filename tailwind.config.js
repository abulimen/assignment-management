/** @type {import('tailwindcss').Config} */
import tailwindcssAnimate from 'tailwindcss-animate';

// Draftly design tokens. Two identities live side by side:
//  - Plum Ink (primary ramp + canvas/surface/line): the app interior.
//  - Light Geometric (paper #F9F8F6 / ink #1A1A1B / cobalt #0047FF, carried as
//    arbitrary values in src/components/landing/* + AuthShell): public
//    landing + auth. `brand` binds the public voice, Plus Jakarta Sans.
// See DESIGN.md. Semantic ok/warn/danger intentionally sit far from the brand
// hue so verdicts and flags never read as buttons.
export default {
  content: ['./index.html', './src/**/*.{js,jsx,ts,tsx}'],
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
        // Public surface voice (landing + auth): the AI Studio source sets
        // font-sans to Plus Jakarta Sans in its @theme; mirrored here so the
        // copied components render as authored.
        sans: ['"Plus Jakarta Sans Variable"', 'system-ui', 'sans-serif'],
        mono: ['JetBrains Mono', 'monospace'],
        // Display headings (interior page titles). System serifs only, so
        // the literary voice ships with no extra font files.
        serif: ['Georgia', 'Iowan Old Style', 'Times New Roman', 'serif'],
        // Public surface voice (landing + auth): self-hosted variable
        // Plus Jakarta Sans (@fontsource-variable/plus-jakarta-sans).
        brand: ['"Plus Jakarta Sans Variable"', 'system-ui', 'sans-serif'],
      },
    },
  },
  plugins: [tailwindcssAnimate],
};