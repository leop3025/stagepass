import type { Config } from "tailwindcss";

const config: Config = {
  content: [
    "./pages/**/*.{js,ts,jsx,tsx,mdx}",
    "./components/**/*.{js,ts,jsx,tsx,mdx}",
    "./app/**/*.{js,ts,jsx,tsx,mdx}",
  ],
  theme: {
    extend: {
      colors: {
        gold: { DEFAULT: "#e8b86d", light: "#f3d7a1" },
        ink: "#0c0a09",
        cream: "#f7f1e7",
      },
    },
  },
  plugins: [],
};
export default config;
