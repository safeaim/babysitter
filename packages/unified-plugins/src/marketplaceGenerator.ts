// Marketplace file generator
// Generates or updates marketplace.json for targets that use marketplace distribution

import * as fs from 'fs';
import * as path from 'path';
import type { A5cPluginManifest } from './types.js';

interface MarketplacePlugin {
  name: string;
  source: string;
  description: string;
  version: string;
  author: { name: string } | string;
}

interface MarketplaceJson {
  name: string;
  owner: { name: string; email?: string };
  plugins: MarketplacePlugin[];
}

export function generateOrUpdateMarketplace(
  manifest: A5cPluginManifest,
  targetOutputDir: string,
  marketplacePath: string
): void {
  let marketplace: MarketplaceJson;

  if (fs.existsSync(marketplacePath)) {
    marketplace = JSON.parse(fs.readFileSync(marketplacePath, 'utf-8')) as MarketplaceJson;
  } else {
    const authorName = typeof manifest.author === 'string'
      ? manifest.author
      : manifest.author.name;
    marketplace = {
      name: authorName,
      owner: { name: authorName },
      plugins: [],
    };
  }

  const relativePath = targetOutputDir;
  const authorObj = typeof manifest.author === 'string'
    ? { name: manifest.author }
    : manifest.author;

  const existingIndex = marketplace.plugins.findIndex(
    (p) => p.name === manifest.name
  );

  const entry: MarketplacePlugin = {
    name: manifest.name,
    source: `./${relativePath}`,
    description: manifest.description,
    version: manifest.version,
    author: authorObj,
  };

  if (existingIndex >= 0) {
    marketplace.plugins[existingIndex] = entry;
  } else {
    marketplace.plugins.push(entry);
  }

  fs.mkdirSync(path.dirname(marketplacePath), { recursive: true });
  fs.writeFileSync(
    marketplacePath,
    JSON.stringify(marketplace, null, 2) + '\n'
  );
}
