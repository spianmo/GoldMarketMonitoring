import type { Config } from 'tailwindcss';

const config: Config = {
  content: ['./src/**/*.{ts,tsx,html}'],
  theme: {
    extend: {
      colors: {
        gold: {
          50: '#FAF8F3',
          100: '#FBF0D4',
          200: '#F5DCA0',
          300: '#EFC76C',
          400: '#E9B33B',
          500: '#E0A82E',
          600: '#C28F1F',
          700: '#9A7218',
          800: '#735514',
          900: '#4C390D',
        },
        ink: {
          900: '#1F2937',
          700: '#374151',
          500: '#6B7280',
          300: '#D1D5DB',
          100: '#F3F4F6',
        },
      },
      boxShadow: {
        card: '0 1px 3px rgba(15, 23, 42, 0.04), 0 1px 2px rgba(15, 23, 42, 0.06)',
        soft: '0 4px 24px rgba(15, 23, 42, 0.06)',
      },
      fontFamily: {
        sans: [
          '-apple-system',
          'BlinkMacSystemFont',
          '"PingFang SC"',
          '"Hiragino Sans GB"',
          '"Microsoft YaHei"',
          'sans-serif',
        ],
        mono: ['"SF Mono"', 'Menlo', 'Consolas', 'monospace'],
      },
    },
  },
  plugins: [],
};

export default config;
