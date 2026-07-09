import type { Config } from 'tailwindcss';

const config: Config = {
  darkMode: 'class',
  content: ['./src/**/*.{ts,tsx}'],
  theme: {
    extend: {
      colors: {
        ink: 'rgb(var(--color-ink) / <alpha-value>)',
        mist: 'rgb(var(--color-mist) / <alpha-value>)',
        line: 'rgb(var(--color-line) / <alpha-value>)',
        surface: 'rgb(var(--color-surface) / <alpha-value>)',
        leaf: 'rgb(var(--color-leaf) / <alpha-value>)',
        sun: 'rgb(var(--color-sun) / <alpha-value>)',
        iris: 'rgb(var(--color-iris) / <alpha-value>)',
        cyan: 'rgb(var(--color-cyan) / <alpha-value>)',
        blush: 'rgb(var(--color-blush) / <alpha-value>)',
      },
      boxShadow: {
        soft: '0 18px 45px rgb(var(--color-shadow) / 0.14)',
        glass: '0 22px 70px rgb(var(--color-shadow) / 0.16)',
        glow: '0 18px 55px rgb(var(--color-iris) / 0.20)',
      },
    },
  },
  plugins: [],
};

export default config;
