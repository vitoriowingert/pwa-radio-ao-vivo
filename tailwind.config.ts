import type { Config } from "tailwindcss";

// Tailwind v4 pode funcionar sem config, mas criamos um arquivo mínimo
// para manter compatibilidade e cumprir o requisito do entregável.
const config: Config = {
  content: [
    "./app/**/*.{js,ts,jsx,tsx,mdx}",
    "./components/**/*.{js,ts,jsx,tsx,mdx}",
  ],
  theme: {
    extend: {},
  },
  plugins: [],
};

export default config;

