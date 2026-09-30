import type { Config } from "tailwindcss";

const config: Config = {
  content: ["./src/**/*.{ts,tsx}"],
  theme: {
    extend: {
      colors: {
        brand: { DEFAULT: "#1453b8", dark: "#0e3f8f", light: "#e8f0fc" },
        ink: "#0f172a",
      },
      fontFamily: {
        sans: ["Inter", "Noto Sans Telugu", "system-ui", "sans-serif"],
      },
      boxShadow: { card: "0 1px 2px rgba(15,23,42,.04), 0 8px 24px rgba(15,23,42,.06)" },
    },
  },
  plugins: [],
};
export default config;
