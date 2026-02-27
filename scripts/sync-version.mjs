#!/usr/bin/env node

/**
 * Sync version across plugin files.
 * Called by semantic-release @semantic-release/exec during prepare step.
 *
 * Usage: node scripts/sync-version.mjs <version>
 */

import { readFileSync, writeFileSync } from 'fs';
import { resolve, dirname } from 'path';
import { fileURLToPath } from 'url';

const __dirname = dirname(fileURLToPath(import.meta.url));
const version = process.argv[2];

if (!version) {
  console.error('Usage: node scripts/sync-version.mjs <version>');
  process.exit(1);
}

const files = [
  resolve(__dirname, '../plugin/package.json'),
  resolve(__dirname, '../plugin/openclaw.plugin.json'),
];

for (const filePath of files) {
  const content = JSON.parse(readFileSync(filePath, 'utf8'));
  const oldVersion = content.version;
  content.version = version;
  writeFileSync(filePath, JSON.stringify(content, null, 2) + '\n');
  console.log(`${filePath}: ${oldVersion} → ${version}`);
}
