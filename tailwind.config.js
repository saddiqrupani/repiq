/** @type {import('tailwindcss').Config} */
module.exports = {
  content: ['./src/**/*.{js,jsx,ts,tsx}'],
  presets: [require('nativewind/preset')],
  theme: {
    extend: {
      colors: {
        brand: {
          50: '#ecfdf5',
          100: '#d1fae5',
          400: '#34d399',
          500: '#10b981',
          600: '#059669',
          700: '#047857',
        },
        accent: {
          500: '#22c55e',
          600: '#16a34a',
        },
        surface: {
          light: '#ffffff',
          'light-2': '#f4f4f5',
          dark: '#0a0a0a',
          'dark-2': '#18181b',
        },
      },
    },
  },
  plugins: [],
};
