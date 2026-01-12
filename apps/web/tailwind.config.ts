import type { Config } from 'tailwindcss';

export default {
  content: ['./src/**/*.{ts,tsx}'],
  theme: {
    extend: {
      colors: {
        ink: '#0A0A0E',
        neon: '#7CFFB2',
        laser: '#FF4F9A',
        cyan: '#41F0FF',
        slate: '#11151C',
      },
      fontFamily: {
        display: ['"Space Grotesk"', 'sans-serif'],
        mono: ['"IBM Plex Mono"', 'monospace'],
      },
      boxShadow: {
        glow: '0 0 30px rgba(124, 255, 178, 0.35)',
        neon: '0 0 12px rgba(124, 255, 178, 0.5)',
      },
      backgroundImage: {
        'hero-gradient':
          'radial-gradient(circle at 20% 20%, rgba(124,255,178,0.2), transparent 40%), radial-gradient(circle at 80% 20%, rgba(255,79,154,0.18), transparent 35%), radial-gradient(circle at 50% 80%, rgba(65,240,255,0.18), transparent 40%)',
      },
    },
  },
  plugins: [],
} satisfies Config;
