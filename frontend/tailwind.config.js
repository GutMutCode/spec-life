/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  theme: {
    extend: {
      colors: {
        // Priority color scheme (from spec.md FR-014)
        priority: {
          highest: '#ef4444', // red - rank 0
          high: '#f97316',    // orange - ranks 1-3
          medium: '#eab308',  // yellow - ranks 4-10
          low: '#3b82f6',     // blue - ranks 11+
        },
      },
    },
  },
  plugins: [],
}
