/** @type {import('tailwindcss').Config} */
export default {
  content: ['./index.html', './src/**/*.{js,ts,jsx,tsx}'],
  theme: {
    extend: {
      colors: {
        honey: {
          50: '#FFF8E1',
          100: '#FFECB3',
          200: '#FFD54F',
          300: '#FFCA28',
          400: '#FFC107',
          500: '#D4A017',
          600: '#B8860B',
          700: '#8B6914',
          800: '#6D4C00',
          900: '#3E2C00'
        },
        cream: '#FFFDF7',
        amber: {
          800: '#92400E',
          900: '#78350F'
        }
      },
      fontFamily: {
        sans: ['Inter', 'system-ui', 'sans-serif']
      }
    }
  },
  plugins: []
};
