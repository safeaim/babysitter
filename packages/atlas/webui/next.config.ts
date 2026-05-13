import type { NextConfig } from "next";

// eslint-disable-next-line @typescript-eslint/no-require-imports
const path = require("path");
const fs = require("fs");
const monorepoRoot = path.resolve(__dirname, "../../..").replace(/\\/g, "/");
// Detect Docker: production build without the monorepo lockfile present
const isDockerBuild = process.env.NODE_ENV === "production" && !fs.existsSync(path.join(monorepoRoot, "package-lock.json"));
const rootReact = `${monorepoRoot}/node_modules/react`;
const rootReactDom = `${monorepoRoot}/node_modules/react-dom`;

const nextConfig: NextConfig = {
  turbopack: {
    // Monorepo root + react aliases only needed in dev/CI where react is hoisted
    // to root node_modules. In Docker the deps are flat under /app/node_modules.
    ...(isDockerBuild ? {} : {
      root: monorepoRoot,
      resolveAlias: {
        react: rootReact,
        "react-dom": rootReactDom,
        "react/jsx-runtime": `${rootReact}/jsx-runtime`,
        "react/jsx-dev-runtime": `${rootReact}/jsx-dev-runtime`,
        "react-dom/client": `${rootReactDom}/client`,
      },
    }),
  },
  serverExternalPackages: ["pg"],
  webpack: (config) => {
    if (!isDockerBuild) {
      config.resolve.alias = {
        ...config.resolve.alias,
        react: rootReact,
        "react-dom": rootReactDom,
      };
    }
    config.resolve.fallback = {
      ...config.resolve.fallback,
      pg: false,
      "pg-native": false,
    };
    config.watchOptions = {
      ignored: [
        "**/node_modules/**",
        "**/packages/atlas/src/**",
        "**/packages/atlas/graph/**",
        "**/.git/**",
        "**/.a5c/**",
        "**/library/**",
      ],
    };
    return config;
  },
};

export default nextConfig;
