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
        paper: "#F5F0E8",
        ink: {
          DEFAULT: "#1A1613",
          light: "#3D3530",
          muted: "#6B5E54",
          faint: "#9A8E82",
        },
        rule: "#C4B8A8",
        accent: "#8B2E1A",
        ad: {
          bg: "#EDE8DF",
          border: "#B8AA98",
        },
      },
      fontFamily: {
        headline: ["var(--font-playfair)", "Georgia", "serif"],
        body: ["Georgia", "Times New Roman", "serif"],
        ui: ["var(--font-dm-sans)", "system-ui", "sans-serif"],
        mono: ["var(--font-dm-mono)", "monospace"],
      },
    },
  },
  plugins: [],
};
export default config;
