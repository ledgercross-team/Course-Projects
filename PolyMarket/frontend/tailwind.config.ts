import type { Config } from "tailwindcss";

/**
 * Palette mirrors Polymarket's dark theme design tokens (sampled live from the site):
 *   neutral-0 #15191d (bg) · neutral-50 #1e2428 (surface) · neutral-100 #242b32 (border)
 *   text #dee3e7 / muted #7b8996 · blue #1452f0 · green #3db468 · red #cb3131 · yellow #d0b226
 */
const config: Config = {
  content: ["./app/**/*.{ts,tsx}", "./components/**/*.{ts,tsx}", "./lib/**/*.{ts,tsx}"],
  theme: {
    extend: {
      colors: {
        bg: "#15191d",
        surface: "#181d22",
        card: "#1e2428",
        cardhover: "#242b32",
        elevate: "#272f37",
        border: "#252c33",
        borderstrong: "#333c45",
        text: "#dee3e7",
        textbright: "#f4f6f8",
        subtle: "#afbac5",
        muted: "#7b8996",
        faint: "#5a6672",
        blue: {
          DEFAULT: "#1452f0",
          hover: "#0f45d1",
          soft: "#1a2740",
          text: "#5b8dff",
        },
        yes: {
          DEFAULT: "#3db468",
          strong: "#27ae60",
          soft: "#16321f",
          text: "#5fbe82",
        },
        no: {
          DEFAULT: "#e64848",
          strong: "#cb3131",
          soft: "#331a1c",
          text: "#f07777",
        },
        gold: "#d0b226",
      },
      fontFamily: {
        sans: ["var(--font-sans)", "system-ui", "sans-serif"],
      },
      boxShadow: {
        card: "0 1px 2px rgba(0,0,0,0.28)",
        pop: "0 8px 30px rgba(0,0,0,0.45)",
        widget: "0 2px 16px rgba(0,0,0,0.35)",
        glow: "0 0 0 1px rgba(20,82,240,0.4), 0 8px 24px rgba(20,82,240,0.18)",
      },
      keyframes: {
        fadeUp: {
          "0%": { opacity: "0", transform: "translateY(10px)" },
          "100%": { opacity: "1", transform: "translateY(0)" },
        },
        fadeIn: { "0%": { opacity: "0" }, "100%": { opacity: "1" } },
        shimmer: {
          "100%": { transform: "translateX(100%)" },
        },
      },
      animation: {
        fadeUp: "fadeUp 0.5s cubic-bezier(0.16,1,0.3,1) both",
        fadeIn: "fadeIn 0.4s ease-out both",
        shimmer: "shimmer 1.4s infinite",
      },
    },
  },
  plugins: [],
};

export default config;
