// Build a small, explicit review package from the existing compiled work.
// No network calls, Git pushes, deployment, source-history export, or model usage.
import { readFile, writeFile, readdir, mkdir, copyFile, lstat } from 'node:fs/promises';
import { dirname, join, relative, resolve, extname } from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';
import { createHash } from 'node:crypto';
import { execFileSync } from 'node:child_process';
import { chromium } from '@playwright/test';

const work = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const repo = resolve(work, '../..');
const output = process.argv[2] && resolve(process.argv[2]);
if (!output || output === repo || output.startsWith(repo + '/')) {
  throw new Error('Provide a new output directory outside this repository.');
}
await mkdir(output, { recursive: false }); // Never overwrite a previous package.
const screenshots = join(output, 'screenshots');
await mkdir(screenshots);
const allowed = new Set(['.html', '.js', '.css', '.webp', '.png', '.jpg', '.svg', '.ogg', '.mp3', '.wav', '.woff2', '.txt']);
async function copyBuilt(from, to) {
  await mkdir(to, { recursive: true });
  for (const entry of await readdir(from, { withFileTypes: true })) {
    if (entry.name.startsWith('.') || entry.isSymbolicLink()) throw new Error('Unexpected hidden file or symlink in build.');
    const src = join(from, entry.name), dst = join(to, entry.name);
    if (entry.isDirectory()) await copyBuilt(src, dst);
    else if (entry.isFile() && allowed.has(extname(entry.name))) {
      if (entry.name !== 'moon-office.html') await copyFile(src, dst);
    } else throw new Error(`Unexpected build file type: ${entry.name}`);
  }
}
await copyBuilt(join(work, 'dist'), join(output, 'web'));
await copyFile(join(work, 'dist/moon-office.html'), join(output, 'moon-office.html'));
for (const name of ['index.html', 'README.md', 'CREDITS.md']) {
  await copyFile(join(repo, 'showcase', name), join(output, name));
}
const browser = await chromium.launch({ headless: true });
const errors = [], network = [];
try {
  for (const [label, viewport] of [['desktop', {width: 1440, height: 900}], ['mobile', {width: 390, height: 844}]]) {
    const context = await browser.newContext({ viewport, offline: true, reducedMotion: 'reduce' });
    const page = await context.newPage();
    page.on('pageerror', e => errors.push(e.message));
    await page.route(/^https?:\/\//, route => { network.push(route.request().url()); return route.abort(); });
    await page.goto(pathToFileURL(join(output, 'moon-office.html')).href);
    await page.locator('#scene-image').evaluate(image => image.decode());
    await page.evaluate(() => document.fonts.ready);
    const overflow = await page.evaluate(() => document.documentElement.scrollWidth > innerWidth + 1);
    if (overflow) throw new Error(`${label}: horizontal overflow`);
    await page.screenshot({ path: join(screenshots, `${label}-cover.png`), animations: 'disabled' });
    if (label === 'desktop') {
      const action = name => page.locator(`[data-action="${name}"]`).filter({ visible: true }).first();
      await action('start').click();
      for (let i = 0; i < 40 && !(await action('inspect').isVisible()); i++) await action('next-line').click();
      await action('inspect').click();
      await action('flip').click();
      await page.screenshot({ path: join(screenshots, 'interaction.png'), animations: 'disabled' });
    }
    await context.close();
  }
  // Check the real presentation page offline, including its local images and main link.
  const context = await browser.newContext({ offline: true, viewport: { width: 1280, height: 900 } });
  const page = await context.newPage();
  page.on('pageerror', e => errors.push(e.message));
  await page.route(/^https?:\/\//, route => { network.push(route.request().url()); return route.abort(); });
  await page.goto(pathToFileURL(join(output, 'index.html')).href);
  await page.locator('img').evaluateAll(images => Promise.all(images.map(image => image.decode())));
  await page.locator('a.primary').click();
  await page.locator('[data-action="start"]').filter({ visible: true }).waitFor();
  await context.close();
} finally { await browser.close(); }
if (errors.length || network.length) throw new Error(`Review package check failed: ${errors.length} page errors, ${network.length} network requests.`);
const files = [];
async function inventory(dir) {
  for (const name of (await readdir(dir)).sort()) {
    const path = join(dir, name), stat = await lstat(path);
    if (stat.isDirectory()) await inventory(path);
    else {
      const bytes = await readFile(path);
      files.push({ path: relative(output, path).replaceAll('\\', '/'), bytes: bytes.length, sha256: createHash('sha256').update(bytes).digest('hex') });
    }
  }
}
await inventory(output);
const manifest = {
  source_commit: execFileSync('git', ['rev-parse', 'HEAD'], { cwd: repo, encoding: 'utf8' }).trim(),
  artifact_kind: 'review-package-not-public-deployment',
  checks: { offline_cover_and_interaction: true, presentation_entry: true, real_phone: false, human_audio_review: false },
  files,
};
await writeFile(join(output, 'MANIFEST.json'), JSON.stringify(manifest, null, 2) + '\n');
console.log(`Prepared ${files.length + 1} files; offline opening, first object interaction, and presentation entry checked.`);
