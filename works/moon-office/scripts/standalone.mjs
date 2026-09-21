import { readFile, writeFile, readdir } from 'node:fs/promises';
import { dirname, join, extname } from 'node:path';
import { fileURLToPath } from 'node:url';

const root = join(dirname(fileURLToPath(import.meta.url)), '..');
const dist = join(root, 'dist');
const mime = { '.webp': 'image/webp', '.svg': 'image/svg+xml', '.ogg': 'audio/ogg', '.mp3': 'audio/mpeg', '.wav': 'audio/wav', '.woff2': 'font/woff2' };
const assets = {};
for (const directory of ['art', 'audio', 'fonts']) {
  for (const name of await readdir(join(dist, directory))) {
    const type = mime[extname(name)];
    if (!type) continue;
    const bytes = await readFile(join(dist, directory, name));
    assets[`${directory}/${name}`] = `data:${type};base64,${bytes.toString('base64')}`;
  }
}
const favicon = await readFile(join(dist, 'favicon.svg'));
assets['favicon.svg'] = `data:image/svg+xml;base64,${favicon.toString('base64')}`;
let html = await readFile(join(dist, 'index.html'), 'utf8');
const scriptMatch = html.match(/<script\b[^>]*\bsrc="([^"]+)"[^>]*><\/script>/);
const cssMatch = html.match(/<link\b[^>]*rel="stylesheet"[^>]*href="([^"]+)"[^>]*>/);
if (!scriptMatch || !cssMatch) throw new Error('Expected one bundled script and stylesheet.');
const js = await readFile(join(dist, scriptMatch[1]), 'utf8');
let css = await readFile(join(dist, cssMatch[1]), 'utf8');
css = css.replace(/url\([^)]*moon-serif\.woff2[^)]*\)/g, `url("${assets['fonts/moon-serif.woff2']}")`);
html = html.replace(cssMatch[0], `<style>${css}</style>`);
html = html.replace(scriptMatch[0], `<script>window.__MOON_ASSETS__=${JSON.stringify(assets)};<\/script>\n<script type="module">${js.replace(/<\/script/gi, '<\\/script')}<\/script>`);
html = html.replace(/href="\.\/art\/office.webp"/g, `href="${assets['art/office.webp']}"`);
html = html.replace(/href="\.\/favicon.svg"/g, `href="${assets['favicon.svg']}"`);
const fontLicense = await readFile(join(dist, 'fonts/OFL.txt'), 'utf8');
html = html.replace('</body>', `<script type="application/json" id="font-license">${JSON.stringify(fontLicense).replace(/<\//g, '<\\/')}</script></body>`);
await writeFile(join(dist, 'moon-office.html'), html);
console.log(`Collected edition: dist/moon-office.html (${(Buffer.byteLength(html) / 1024 / 1024).toFixed(2)} MiB).`);
