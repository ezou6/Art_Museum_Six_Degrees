/** @type {import('tailwindcss').Config} */
module.exports = {
  content: [
    "./src/**/*.{js,jsx,ts,tsx}",
  ],
  theme: {
    extend: {
      colors: {
        primary: {
          light: '#667eea',
          DEFAULT: '#667eea',
          dark: '#764ba2',
        },
        accent: {
          light: '#f8c146',
          DEFAULT: '#ffd700',
        },
      },
    },
  },
  plugins: [],
}

