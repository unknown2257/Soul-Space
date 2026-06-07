import type { Config } from 'tailwindcss';

export default {
  content: ['./index.html', './src/**/*.{ts,tsx}'],
  theme: {
    extend: {
      colors: {
        obsidian: '#09060f',
        amethyst: '#7c3aed',
        violetDeep: '#2b124c',
        silver: '#c7c9d3',
      },
      boxShadow: {
        glow: '0 0 50px rgba(124, 58, 237, 0.35)',
      },
      fontFamily: {
        display: ['Inter', 'ui-sans-serif', 'system-ui'],
      },
    },
  },
  plugins: [],
} satisfies Config;
