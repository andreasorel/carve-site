import type { Config } from "tailwindcss";

const config: Config = {
  content: [
    "./src/pages/**/*.{js,ts,jsx,tsx,mdx}",
    "./src/components/**/*.{js,ts,jsx,tsx,mdx}",
    "./src/app/**/*.{js,ts,jsx,tsx,mdx}",
  ],
  theme: {
    extend: {
      colors: {
        // ── New design system tokens ──
        surface: {
          DEFAULT: "#F7F5F0",
          elevated: "#FAF9F5",
          subtle: "#F0EDE6",
          muted: "#E8E5DD",
          inverse: "#1A1917",
          "inverse-soft": "#252422",
        },
        text: {
          DEFAULT: "#1A1917",
          secondary: "#6B6860",
          tertiary: "#9E9A90",
          "on-dark": "#F5F4F1",
          "on-dark-muted": "#A8A49C",
        },
        accent: {
          DEFAULT: "#C2553A",
          hover: "#A8462E",
          soft: "rgba(194,85,58,0.1)",
        },
        border: {
          DEFAULT: "#E8E6E1",
          subtle: "#F0EEE9",
          strong: "#D4D0C8",
        },
        functional: {
          success: "#3D7A4A",
          warning: "#B8862B",
          error: "#C2553A",
          info: "#4A6B8A",
        },

        // ── Legacy aliases (backward compat for sub-pages) ──
        paper: "#FAFAF8",
        ink: {
          DEFAULT: "#1A1917",
          light: "#3D3530",
          muted: "#6B6860",
          faint: "#9E9A90",
        },
        rule: "#E8E6E1",
        ad: {
          bg: "#F5F4F1",
          border: "#D4D0C8",
        },
      },
      fontFamily: {
        display: ["var(--font-playfair)", "Georgia", "serif"],
        sans: ["var(--font-dm-sans)", "system-ui", "sans-serif"],
        mono: ["var(--font-dm-sans)", "system-ui", "sans-serif"],
        // Legacy aliases
        headline: ["var(--font-playfair)", "Georgia", "serif"],
        body: ["var(--font-dm-sans)", "system-ui", "sans-serif"],
        ui: ["var(--font-dm-sans)", "system-ui", "sans-serif"],
      },
      borderRadius: {
        xs: "3px",
        sm: "6px",
        DEFAULT: "10px",
        lg: "16px",
        pill: "999px",
      },
      boxShadow: {
        soft: "0 1px 2px rgba(26,25,23,0.04)",
        card: "0 2px 8px rgba(26,25,23,0.06), 0 1px 2px rgba(26,25,23,0.04)",
        elevated: "0 8px 24px rgba(26,25,23,0.08), 0 2px 8px rgba(26,25,23,0.04)",
      },
    },
  },
  plugins: [],
};
export default config;
