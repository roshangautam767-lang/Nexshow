import type { Config } from 'tailwindcss';
// Brand colours live here. Change these 8 values to re-theme the whole site.
const config: Config = {
  content: ['./app/**/*.{ts,tsx}', './components/**/*.{ts,tsx}'],
  theme: {
    extend: {
      colors: {
        bg: '#050000', panel: '#120506', line: '#3a0d10',
        red: '#e50914', red2: '#ff3b3b', deep: '#7a0509', tx: '#f4eeee', mu: '#b39a9a',
      },
      fontFamily: { display: ['var(--font-display)', 'Impact', 'sans-serif'], sans: ['var(--font-body)', 'system-ui', 'sans-serif'] },
    },
  },
  plugins: [],
};
export default config;
