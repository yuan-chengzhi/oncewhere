import { build } from 'esbuild';
import { copyFile } from 'node:fs/promises';
import { fileURLToPath } from 'node:url';

const directory = fileURLToPath(new URL('.', import.meta.url));
await build({
  absWorkingDir: directory,
  entryPoints: ['viewer-source.js'],
  outfile: 'viewer.js',
  bundle: true,
  format: 'iife',
  platform: 'browser',
  target: 'es2020',
  minify: true,
  legalComments: 'inline',
  banner: { js: '/* Three.js 0.180.0 (MIT). See Three-LICENSE.txt. Geometry probe, not production art. */' },
});
await copyFile(new URL('node_modules/three/LICENSE', import.meta.url), new URL('Three-LICENSE.txt', import.meta.url));
