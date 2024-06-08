import baseConfig from "@winston/tailwind-config/web";
/*
 * This file is not used for any compilation purpose, it is only used
 * for Tailwind Intellisense & Autocompletion in the source files
 */
import type { Config } from "tailwindcss";

export default {
	content: ["./src/**/*.tsx"],
	presets: [baseConfig],
} satisfies Config;
