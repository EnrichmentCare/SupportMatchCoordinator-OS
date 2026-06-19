/** @type {import('tailwindcss').Config} */
export default {
  content: ["./index.html", "./src/**/*.{ts,tsx}"],
  theme: {
    extend: {
      colors: {
        brand: {
          50: "var(--brand-50)",
          100: "var(--brand-100)",
          200: "var(--brand-200)",
          400: "var(--brand-400)",
          500: "var(--brand-500)",
          600: "var(--brand-600)",
          700: "var(--brand-700)",
        },
        accent: {
          100: "var(--accent-100)",
          400: "var(--accent-400)",
          500: "var(--accent-500)",
          600: "var(--accent-600)",
        },
        ink: {
          DEFAULT: "var(--ink-900)",
          500: "var(--ink-500)",
        },
        line: "var(--line)",
        canvas: "var(--canvas)",
        surface: "var(--surface)",
        status: {
          green: "var(--status-green)",
          amber: "var(--status-amber)",
          red: "var(--status-red)",
          info: "var(--status-info)",
        },
      },
      borderRadius: {
        sm: "6px",
        md: "10px",
        lg: "14px",
        xl: "20px",
      },
      boxShadow: {
        card: "0 1px 2px rgba(26,21,35,0.04), 0 1px 3px rgba(26,21,35,0.06)",
        pop: "0 8px 24px rgba(26,21,35,0.12)",
      },
      fontFamily: {
        sans: ["Inter", "ui-sans-serif", "system-ui", "sans-serif"],
      },
    },
  },
  plugins: [],
};
