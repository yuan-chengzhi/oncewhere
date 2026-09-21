import { expect, test, type Page, type TestInfo } from '@playwright/test';
import { readFile } from 'node:fs/promises';
import { resolve } from 'node:path';
import { pathToFileURL } from 'node:url';

const SAVE_KEY = 'oncewhere.moon-office.night.v1';
const action = (page: Page, name: string) => page.locator(`[data-action="${name}"]`).filter({ visible: true });
const object = (page: Page) => page.locator('#object-dialog');
const saved = (page: Page) => page.evaluate(key => JSON.parse(localStorage.getItem(key) || 'null'), SAVE_KEY);

function watchErrors(page: Page) {
  const errors: string[] = [];
  page.on('pageerror', error => errors.push(error.message));
  page.on('console', message => { if (message.type() === 'error') errors.push(message.text()); });
  page.on('requestfailed', request => {
    if (request.failure()?.errorText !== 'net::ERR_ABORTED') errors.push(`${request.url()}: ${request.failure()?.errorText}`);
  });
  page.on('response', response => { if (response.status() >= 400) errors.push(`${response.status()} ${response.url()}`); });
  return errors;
}

async function auditAudio(page: Page) {
  await page.addInitScript(() => {
    const audit = { gains: [] as GainNode[], started: [] as { duration: number; loop: boolean }[] };
    (window as unknown as { audioAudit: typeof audit }).audioAudit = audit;
    const createGain = AudioContext.prototype.createGain;
    AudioContext.prototype.createGain = function () {
      const gain = createGain.call(this); audit.gains.push(gain); return gain;
    };
    const start = AudioBufferSourceNode.prototype.start;
    AudioBufferSourceNode.prototype.start = function (...args: Parameters<typeof start>) {
      audit.started.push({ duration: this.buffer?.duration ?? 0, loop: this.loop });
      return start.apply(this, args);
    };
  });
}

async function openNight(page: Page) {
  await page.goto('/');
  await page.locator('#scene-image').evaluate((image: HTMLImageElement) => image.decode());
  await page.evaluate(() => document.fonts.ready);
  await action(page, 'start').click();
}

async function settleTransition(page: Page) {
  await expect(page.locator('#chapter-transition')).not.toHaveClass(/visible/);
}

async function reachExplore(page: Page, chapter: number) {
  for (let step = 0; step < 40; step++) {
    await settleTransition(page);
    const state = await saved(page);
    if (state.chapter === chapter && state.phase === 'explore') {
      await expect(action(page, 'inspect').first()).toBeVisible();
      return;
    }
    await action(page, 'next-line').click();
  }
  throw new Error(`Chapter ${chapter} did not reach its interactive scene`);
}

async function openObject(page: Page) {
  await action(page, 'inspect').first().click();
  await expect(object(page)).toBeVisible();
}

async function finishCabinet(page: Page) {
  await reachExplore(page, 0);
  await openObject(page);
  await action(page, 'flip').first().click();
  await action(page, 'solve').click();
}

async function swap(page: Page, first: number, second: number) {
  await page.locator(`[data-action="ticket"][data-index="${first}"]`).click();
  await page.locator(`[data-action="ticket"][data-index="${second}"]`).click();
}

async function finishTickets(page: Page) {
  await reachExplore(page, 1);
  await openObject(page);
  await swap(page, 0, 1);
  await swap(page, 1, 2);
  await action(page, 'solve').click();
}

async function snapshot(page: Page, info: TestInfo, name: string) {
  await page.screenshot({ path: info.outputPath(`${name}.png`), fullPage: true, animations: 'disabled' });
}

async function noHorizontalOverflow(page: Page) {
  expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth + 1)).toBe(true);
  const dialogs = page.locator('dialog[open]');
  if (await dialogs.count()) {
    const bounds = await dialogs.first().boundingBox();
    expect(bounds!.x).toBeGreaterThanOrEqual(0);
    expect(bounds!.x + bounds!.width).toBeLessThanOrEqual(page.viewportSize()!.width + 1);
    expect(await dialogs.first().evaluate(element => element.scrollWidth <= element.clientWidth + 1)).toBe(true);
  }
}

for (const viewport of [{ width: 1440, height: 900 }, { width: 390, height: 844 }, { width: 844, height: 390 }]) {
test(`完整值班 ${viewport.width}×${viewport.height}：真实解谜、自然回声、归途、保存与独立记录`, async ({ page }, info) => {
  await page.setViewportSize(viewport);
  const errors = watchErrors(page);
  await openNight(page);
  await finishCabinet(page);
  await reachExplore(page, 1);
  await openObject(page);
  await expect(action(page, 'solve')).toHaveCount(0);
  const firstTicket = page.locator('[data-action="ticket"][data-index="0"]');
  await firstTicket.click();
  await expect(firstTicket).toHaveAttribute('aria-pressed', 'true');
  await firstTicket.click();
  await expect(firstTicket).toHaveAttribute('aria-pressed', 'false');
  await swap(page, 1, 2);
  await expect(object(page).locator('.seam.joined')).toHaveCount(0);
  await expect(action(page, 'solve')).toHaveCount(0);
  const wrongOrder = (await saved(page)).tickets;
  await page.reload();
  await expect(action(page, 'start')).toBeVisible();
  await action(page, 'start').click();
  await openObject(page);
  expect((await saved(page)).tickets).toEqual(wrongOrder);
  await swap(page, 0, 2);
  await expect(object(page).locator('.seam.joined')).toHaveCount(2);
  await snapshot(page, info, 'tickets-complete');
  await action(page, 'solve').click();

  await reachExplore(page, 2);
  await openObject(page);
  await noHorizontalOverflow(page);
  await snapshot(page, info, 'echo');
  await action(page, 'send-echo').click();
  await expect(action(page, 'send-echo')).toBeDisabled();
  expect((await saved(page)).echo).toBe(0);
  await expect.poll(async () => (await saved(page)).echo, { timeout: 8_000 }).toBe(1);
  await expect(action(page, 'send-echo')).toBeEnabled();
  await action(page, 'send-echo').click();
  await action(page, 'close-object').click();
  await openObject(page);
  expect((await saved(page)).echo).toBe(1);
  await expect(action(page, 'send-echo')).toBeEnabled();
  await action(page, 'send-echo').click();
  await action(page, 'finish-echo').click();
  expect((await saved(page)).echo).toBe(2);
  await action(page, 'solve').click();

  await reachExplore(page, 3);
  await openObject(page);
  await noHorizontalOverflow(page);
  await snapshot(page, info, 'clasp');
  for (const id of ['wide', 'round']) {
    await page.locator(`[data-action="clasp"][data-id="${id}"]`).click();
    await expect(object(page).getByRole('status')).not.toBeEmpty();
    await expect(action(page, 'solve')).toHaveCount(0);
    expect((await saved(page)).completed).not.toContain(3);
  }
  await page.locator('[data-action="clasp"][data-id="silver"]').click();
  await action(page, 'solve').click();
  for (let step = 0; step < 20 && !(await page.locator('.journey-dialog[open]').count()); step++) {
    await action(page, 'next-line').click();
  }
  await expect(page.locator('.journey-dialog')).toBeVisible();
  await noHorizontalOverflow(page);
  await snapshot(page, info, 'journey');
  await expect(page.locator('[data-action="lamp"][data-index="2"]')).toBeDisabled();
  for (let i = 0; i < 3; i++) {
    await page.locator(`[data-action="lamp"][data-index="${i}"]`).click();
    await expect(page.locator('.path-lamp.is-lit')).toHaveCount(i + 1);
    await page.locator(`[data-action="lamp"][data-index="${i}"]`).click();
    await expect(page.locator('.path-lamp.is-lit')).toHaveCount(i + 1);
  }
  expect((await saved(page)).lamps).toBe(3);
  await action(page, 'go-home').click();
  await reachExplore(page, 4);
  await openObject(page);
  await noHorizontalOverflow(page);
  await expect(action(page, 'solve')).toHaveCount(0);
  await action(page, 'place').first().click();
  await expect(page.locator('.home-drawer')).toHaveClass(/placed/);
  await snapshot(page, info, 'home-drawer');
  await action(page, 'solve').click();
  for (let step = 0; step < 30 && !(await action(page, 'keepsake').count()); step++) {
    await action(page, 'next-line').click();
  }
  await expect(action(page, 'keepsake')).toBeVisible();
  expect((await saved(page)).completed).toEqual([0, 1, 2, 3, 4]);
  await snapshot(page, info, 'ending');
  await action(page, 'keepsake').click();
  await expect(page.locator('.home-drawer.placed')).toBeVisible();
  await action(page, 'close-object').first().click();
  await page.reload();
  await action(page, 'start').click();
  await expect(action(page, 'keepsake')).toBeVisible();
  await action(page, 'journal').first().click();
  await expect(page.locator('[data-action="revisit"]:enabled')).toHaveCount(5);
  await page.locator('[data-action="revisit"][data-index="2"]').click();
  await expect(page.locator('.revisit-image')).toBeVisible();
  expect((await saved(page)).phase).toBe('finished');
  await action(page, 'close-book').first().click();

  const downloadPromise = page.waitForEvent('download');
  await action(page, 'download').click();
  const download = await downloadPromise;
  expect(download.suggestedFilename()).toMatch(/\.html$/);
  const record = await readFile((await download.path())!, 'utf8');
  expect(record).not.toMatch(/<script\b|<link\b|<img\b/i);
  const offlineRecord = await page.context().newPage();
  await offlineRecord.route('**/*', route => route.abort());
  await offlineRecord.setContent(record);
  await expect(offlineRecord.locator('main h1')).not.toBeEmpty();
  await expect(offlineRecord.locator('main svg')).toBeVisible();
  await expect(offlineRecord.locator('main dl dd')).not.toHaveCount(0);
  await offlineRecord.close();
  expect(errors).toEqual([]);
});
}

for (const [name, value] of [
  ['不完整 JSON', '{'],
  ['未知版本', JSON.stringify({ version: 99, chapter: 0, phase: 'intro', tickets: ['right', 'left', 'middle'] })],
  ['损坏票据', JSON.stringify({ version: 1, chapter: 1, phase: 'explore', tickets: ['left', 'left', 'right'] })],
]) {
  test(`损坏存档恢复：${name}`, async ({ page }) => {
    const errors = watchErrors(page);
    await page.addInitScript(({ key, value }) => localStorage.setItem(key, value), { key: SAVE_KEY, value });
    await openNight(page);
    expect((await saved(page)).chapter).toBe(0);
    expect((await saved(page)).phase).toBe('intro');
    await finishCabinet(page);
    expect(errors).toEqual([]);
  });
}

for (const viewport of [{ width: 390, height: 844 }, { width: 844, height: 390 }]) {
  test(`手机尺寸 ${viewport.width}×${viewport.height}：封面、对白、翻面与车票`, async ({ page }, info) => {
    const errors = watchErrors(page);
    await page.setViewportSize(viewport);
    await page.goto('/');
    await page.locator('#scene-image').evaluate((image: HTMLImageElement) => image.decode());
    await page.evaluate(() => document.fonts.ready);
    await noHorizontalOverflow(page);
    await snapshot(page, info, 'cover');
    await action(page, 'start').click();
    if (viewport.width > viewport.height) {
      expect(await page.evaluate(() => document.documentElement.scrollHeight <= innerHeight + 1)).toBe(true);
      await expect(action(page, 'next-line')).toBeInViewport();
    }
    await snapshot(page, info, 'first-dialogue');
    await finishCabinet(page);
    await reachExplore(page, 1);
    await openObject(page);
    await noHorizontalOverflow(page);
    await snapshot(page, info, 'ticket-dialog');
    await swap(page, 0, 1);
    await swap(page, 1, 2);
    await action(page, 'solve').click();
    expect((await saved(page)).completed).toEqual([0, 1]);
    expect(errors).toEqual([]);
  });
}

test('键盘可独立完成第一件物品，原生对话框正确约束焦点', async ({ page }) => {
  await page.goto('/');
  for (let i = 0; i < 12 && !(await action(page, 'start').evaluate(element => element === document.activeElement)); i++) {
    await page.keyboard.press('Tab');
  }
  await expect(action(page, 'start')).toBeFocused();
  await page.keyboard.press('Enter');
  for (let i = 0; i < 20 && (await saved(page)).phase !== 'explore'; i++) {
    await expect(action(page, 'next-line')).toBeFocused();
    await page.keyboard.press('Enter');
  }
  await expect(action(page, 'inspect').first()).toBeFocused();
  await page.keyboard.press('Enter');
  await expect(object(page)).toBeVisible();
  for (let i = 0; i < 12 && !(await action(page, 'flip').first().evaluate(element => element === document.activeElement)); i++) {
    expect(await page.evaluate(() => !!document.activeElement?.closest('dialog[open]'))).toBe(true);
    await page.keyboard.press('Tab');
  }
  await expect(action(page, 'flip').first()).toBeFocused();
  await page.keyboard.press('Enter');
  await expect(action(page, 'solve')).toBeFocused();
  await page.keyboard.press('Enter');
  expect((await saved(page)).completed).toContain(0);
  await expect(action(page, 'next-line')).toBeFocused();
});

test('减少动态效果：不漂移，回声仍可自然抵达', async ({ page }) => {
  await page.emulateMedia({ reducedMotion: 'reduce' });
  await openNight(page);
  await expect(page.locator('#dust')).toBeHidden();
  await finishCabinet(page);
  await finishTickets(page);
  await reachExplore(page, 2);
  await openObject(page);
  await action(page, 'send-echo').click();
  await expect(page.locator('.echo-spark')).toBeHidden();
  await expect.poll(async () => (await saved(page)).echo, { timeout: 4_000 }).toBe(1);
  await action(page, 'send-echo').click();
  await expect.poll(async () => (await saved(page)).echo, { timeout: 4_000 }).toBe(2);
  await action(page, 'solve').click();
  expect((await saved(page)).completed).toContain(2);
});

test('声音真实解码并启动循环，静音保存后可恢复', async ({ page }) => {
  const errors = watchErrors(page);
  await auditAudio(page);
  await openNight(page);
  await expect.poll(() => page.evaluate(() => (window as any).audioAudit.started.filter((source: any) => source.loop && source.duration > 30).length)).toBe(1);
  await finishCabinet(page);
  expect(await page.evaluate(() => (window as any).audioAudit.started.filter((source: any) => !source.loop && source.duration > 0).length)).toBeGreaterThan(0);
  await page.getByRole('button', { name: '关闭声音', exact: true }).click();
  await expect(page.getByRole('button', { name: '开启声音', exact: true })).toHaveAttribute('aria-pressed', 'false');
  await expect.poll(() => page.evaluate(() => (window as any).audioAudit.gains.every((gain: GainNode) => gain.gain.value < 0.001))).toBe(true);
  await page.reload();
  await expect(page.getByRole('button', { name: '开启声音', exact: true })).toHaveAttribute('aria-pressed', 'false');
  await action(page, 'start').click();
  expect(await page.evaluate(() => (window as any).audioAudit.started.length)).toBe(0);
  await page.getByRole('button', { name: '开启声音', exact: true }).click();
  await expect.poll(() => page.evaluate(() => (window as any).audioAudit.started.some((source: any) => source.loop && source.duration > 30))).toBe(true);
  await action(page, 'settings').click();
  await page.getByRole('slider', { name: '音乐音量' }).fill('20');
  await expect.poll(() => page.evaluate(() => (window as any).audioAudit.gains[0].gain.value)).toBeCloseTo(0.2, 2);
  expect((await saved(page)).musicVolume).toBeCloseTo(0.2);
  await action(page, 'close-settings').click();
  await action(page, 'settings').click();
  await expect(page.getByRole('slider', { name: '音乐音量' })).toHaveValue('20');
  await page.reload();
  await action(page, 'start').click();
  await action(page, 'settings').click();
  await expect(page.getByRole('slider', { name: '音乐音量' })).toHaveValue('20');
  await expect.poll(() => page.evaluate(() => (window as any).audioAudit.gains[0]?.gain.value)).toBeCloseTo(0.2, 2);
  expect(errors).toEqual([]);
});

test('旧存档未记录音量时仍继续原进度并使用默认音量', async ({ page }) => {
  const errors = watchErrors(page);
  await openNight(page);
  await finishCabinet(page);
  const previous = await saved(page);
  await page.evaluate(key => {
    const state = JSON.parse(localStorage.getItem(key)!);
    delete state.musicVolume;
    localStorage.setItem(key, JSON.stringify(state));
  }, SAVE_KEY);
  await page.reload();
  await action(page, 'start').click();
  const restored = await saved(page);
  expect(restored.completed).toEqual(previous.completed);
  expect(restored.chapter).toBe(previous.chapter);
  expect(restored.phase).toBe(previous.phase);
  expect(restored.musicVolume).toBe(0.6);
  await action(page, 'settings').click();
  await expect(page.getByRole('slider', { name: '音乐音量' })).toHaveValue('60');
  expect(errors).toEqual([]);
});

test('单文件收藏版：file://断网打开、物件操作、音乐、全夜结尾与记录下载', async ({ page }, info) => {
  const errors = watchErrors(page);
  const attemptedNetwork: string[] = [];
  await page.route(/^https?:\/\//, route => {
    attemptedNetwork.push(route.request().url());
    return route.abort('internetdisconnected');
  });
  await page.context().setOffline(true);
  await auditAudio(page);
  await page.goto(pathToFileURL(resolve('dist/moon-office.html')).href);
  await page.locator('#scene-image').evaluate((image: HTMLImageElement) => image.decode());
  await page.evaluate(() => document.fonts.ready);
  await snapshot(page, info, 'offline-cover');
  await action(page, 'start').click();
  await expect.poll(() => page.evaluate(() => (window as any).audioAudit.started.some((source: any) => source.loop && source.duration > 30))).toBe(true);
  await finishCabinet(page);
  for (const chapter of [1, 2, 3]) {
    await reachExplore(page, chapter);
    await page.locator('#scene-image').evaluate((image: HTMLImageElement) => image.decode());
    await openObject(page);
    await action(page, 'skip').click();
  }
  for (let step = 0; step < 20 && !(await page.locator('.journey-dialog[open]').count()); step++) {
    await action(page, 'next-line').click();
  }
  await expect(page.locator('.journey-dialog')).toBeVisible();
  await action(page, 'all-lamps').click();
  await action(page, 'go-home').click();
  await reachExplore(page, 4);
  await openObject(page);
  await action(page, 'place').first().click();
  await action(page, 'solve').click();
  for (let step = 0; step < 30 && !(await action(page, 'keepsake').count()); step++) {
    await action(page, 'next-line').click();
  }
  await expect(action(page, 'keepsake')).toBeVisible();
  await page.locator('#scene-image').evaluate((image: HTMLImageElement) => image.decode());
  expect((await saved(page)).completed).toEqual([0, 1, 2, 3, 4]);
  expect(await page.evaluate(() => (window as any).audioAudit.started.some((source: any) => !source.loop && source.duration > 0))).toBe(true);
  await snapshot(page, info, 'offline-ending');
  const downloadPromise = page.waitForEvent('download');
  await action(page, 'download').click();
  const download = await downloadPromise;
  expect(download.suggestedFilename()).toMatch(/\.html$/);
  const record = await readFile((await download.path())!, 'utf8');
  expect(record).toMatch(/<main>/);
  expect(record).not.toMatch(/<script\b|<link\b|<img\b/i);
  expect(attemptedNetwork).toEqual([]);
  expect(errors).toEqual([]);
});
