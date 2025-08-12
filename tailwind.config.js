/** @type {import('tailwindcss').Config} */
module.exports = {
  content: [
    "./app/**/*.{js,ts,jsx,tsx}",    // your app directory files
    "./components/**/*.{js,ts,jsx,tsx}", // your components
  ],
  theme: {
    extend: {},
  },
  plugins: [],
  darkMode: "class", // optional: enable class-based dark mode
}

