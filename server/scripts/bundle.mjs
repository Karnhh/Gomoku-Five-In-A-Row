// Bundles the server into one plain JavaScript file for Vercel.
//
// Why: the source is TypeScript that imports ".ts" files directly and pulls the
// rules from the shared/ workspace outside this folder. Node runs that as-is in
// development, but Vercel's function builder does not. One self-contained file
// (our code + shared/ + express + cors + mongodb) has nothing left to resolve.
//
// Vercel runs this through the "vercel-build" script before it packages
// api/index.js, which imports the result.

import { build } from 'esbuild';
import { mkdir, writeFile } from 'node:fs/promises';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

const root = join(dirname(fileURLToPath(import.meta.url)), '..');

const result = await build({
  entryPoints: [join(root, 'src/app.ts')],
  outfile: join(root, 'dist/app.cjs'),
  bundle: true,
  platform: 'node',
  target: 'node20',
  format: 'cjs',
  sourcemap: false,
  legalComments: 'none',
  logLevel: 'warning',
  metafile: true,
  // optional native add-ons of the MongoDB driver: loaded only if installed, and we use none of them
  external: [
    'kerberos', '@mongodb-js/zstd', 'snappy', 'socks', 'aws4', 'mongodb-client-encryption',
    '@aws-sdk/credential-providers', 'gcp-metadata',
  ],
});

// If Vercel treats the build script as a static build it expects an output folder.
await mkdir(join(root, 'public'), { recursive: true });
await writeFile(join(root, 'public/index.html'), '<!doctype html><title>Gomoku API</title><p>Gomoku API. See /api/health</p>\n');

const bytes = Object.values(result.metafile.outputs)[0].bytes;
console.log(`bundled dist/app.cjs (${Math.round(bytes / 1024)} KB)`);
