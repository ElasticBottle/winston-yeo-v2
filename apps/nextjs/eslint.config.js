import baseConfig, { restrictEnvAccess } from "@winston/eslint-config/base";
import nextjsConfig from "@winston/eslint-config/nextjs";
import reactConfig from "@winston/eslint-config/react";

/** @type {import('typescript-eslint').Config} */
export default [
  {
    ignores: [".next/**"],
  },
  ...baseConfig,
  ...reactConfig,
  ...nextjsConfig,
  ...restrictEnvAccess,
];
