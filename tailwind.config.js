/** @type {import('tailwindcss').Config} */
export default {
  content: ['./index.html', './src/**/*.{js,ts,jsx,tsx}'],
  theme: {
    extend: {
      colors: {
        charcoal: {
          DEFAULT: '#1E1E1E',
          light: '#2D2D2D',
          dark: '#141414',
        },
        olive: {
          DEFAULT: '#6A6A4B',
          light: '#8B8B63',
          dark: '#4A4A2B',
        },
        cream: {
          DEFAULT: '#FFFFD5',
          light: '#FFFFF0',
        },
        text: {
          primary: '#E1E1E1',
          secondary: '#A1A1A1',
        },
        bg: {
          card: '#2D2D2D',
          input: '#363636',
        }
      },
      fontFamily: {
        sans: [
          'ui-sans-serif',
          'system-ui',
          '-apple-system',
          'BlinkMacSystemFont',
          '"Segoe UI"',
          'Roboto',
          '"Helvetica Neue"',
          'Arial',
          '"Noto Sans"',
          'sans-serif',
          '"Apple Color Emoji"',
          '"Segoe UI Emoji"',
          '"Segoe UI Symbol"',
          '"Noto Color Emoji"'
        ],
      },
    },
  },
  plugins: [],
};