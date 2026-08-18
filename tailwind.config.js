/** @type {import('tailwindcss').Config} */
import tailwindcssAnimate from 'tailwindcss-animate';

// Draftly design tokens: Unified Light Geometric Cobalt Identity
//  - Canvas: #F9F8F6 (warm off-white)
//  - Surface: #FFFFFF (crisp white cards & panels)
//  - Line: #E5E7EB (fine border)
//  - Primary: #0047FF (Cobalt Blue with #0038CC hover)
//  - Fonts: Plus Jakarta Sans for interface, JetBrains Mono for monospace, Georgia for editorial serif
export default {
  content: ['./index.html', './src/**/*.{js,jsx,ts,tsx}'],
  theme: {
    extend: {
      colors: {
        primary: {
          50: '#eef4ff',
          100: '#dbe7fe',
          200: '#bfd6fe',
          300: '#93beff',
          400: '#6099fa',
          500: '#3b7af6',
          600: '#0047FF', // Official Draftly Cobalt
          700: '#0038CC', // Hover
          800: '#002a99',
          900: '#001f70',
        },
        canvas: '#F9F8F6',
        surface: '#FFFFFF',
        line: '#E5E7EB',
      },
      fontFamily: {
        sans: ['"Plus Jakarta Sans Variable"', 'system-ui', 'sans-serif'],
        mono: ['JetBrains Mono', 'monospace'],
        serif: ['Georgia', 'Iowan Old Style', 'Times New Roman', 'serif'],
        brand: ['"Plus Jakarta Sans Variable"', 'system-ui', 'sans-serif'],
      },
    },
  },
  plugins: [tailwindcssAnimate],
};