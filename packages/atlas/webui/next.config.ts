import type { NextConfig } from "next";

// eslint-disable-next-line @typescript-eslint/no-require-imports
const path = require("path");
const monorepoRoot = path.resolve(__dirname, "../../..").replace(/\\/g, "/");
const rootReact = `${monorepoRoot}/node_modules/react`;
const rootReactDom = `${monorepoRoot}/node_modules/react-dom`;

const nextConfig: NextConfig = {
  turbopack: {
    root: monorepoRoot,
    resolveAlias: {
      react: rootReact,
      "react-dom": rootReactDom,
      "react/jsx-runtime": `${rootReact}/jsx-runtime`,
      "react/jsx-dev-runtime": `${rootReact}/jsx-dev-runtime`,
      "react-dom/client": `${rootReactDom}/client`,
    },
  },
  serverExternalPackages: ["pg"],
  webpack: (config) => {
    config.resolve.alias = {
      ...config.resolve.alias,
      react: rootReact,
      "react-dom": rootReactDom,
    };
    config.resolve.fallback = {
      ...config.resolve.fallback,
      pg: false,
      "pg-native": false,
    };
    return config;
  },
};

export default nextConfig;
