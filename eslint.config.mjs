import nextConfig from "eslint-config-next/core-web-vitals";
import nextTypescript from "eslint-config-next/typescript";

const eslintConfig = [
  ...nextConfig,
  ...nextTypescript,
  { ignores: [".next/**", "node_modules/**", "design/**", "next-env.d.ts", "lib/database.types.ts", "public/**"] },
];

export default eslintConfig;
