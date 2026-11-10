import type { Config } from 'tailwindcss';
export default {
  content: ['./src/**/*.{js,ts,jsx,tsx}'],
  theme: {
    extend: {
      colors: { jokerBlue:'#116eaa', cobalt:'#145d92', cream:'#fff7e4', rose:'#cf5b82', sunshine:'#ffd430', ink:'#15202a' },
      fontFamily:{ display:['Arial Black','Arial','sans-serif'], body:['Arial','sans-serif'] }
    }
  },
  plugins: []
} satisfies Config;
