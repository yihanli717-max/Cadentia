import type { Config } from "tailwindcss";

const config: Config = {
  content: [
    "./node_modules/flowbite-react/lib/**/*.js",
    "./pages/**/*.{js,ts,jsx,tsx,mdx}",
    "./components/**/*.{js,ts,jsx,tsx,mdx}",
    "./app/**/*.{js,ts,jsx,tsx,mdx}",
  ],
  theme: {
    extend: {
      fontSize: {
        "2xs": ["10px", "16px"],
      },
    },
  },
  safelist: [
    {
      pattern:
        /(bg|text|border)-(gray|rose|amber|fuchsia|emerald|cyan|violet)-(50|100|200|300|400|500|600|700|800)/,
      variants: ["hover", "group-hover"],
    },
  ],
  plugins: [
    require("daisyui"),
    require("tailwindcss-inner-border"),
    require("@tailwindcss/aspect-ratio"),
  ],
};

export default config;
