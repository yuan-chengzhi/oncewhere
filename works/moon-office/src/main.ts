import './style.css';
import { chapters, speakers, storyMeta, openingLabel, closingLabel, ticketPieces, ticketFeedback, claspPieces, echoLines, echoFeedback, sceneDetails, journeyLines, birdCoda, endingRecord, type DialogueLine } from './story';
import { broochSvg, claspSvg, ticketSvg, birdSvg, moonMark } from './objects';
import { freshNight, readNight, writeNight, type NightState } from './state';
import { NightAudio } from './audio';
import { makeAtmosphere } from './atmosphere';
import { asset } from './assets';

const app = document.querySelector<HTMLElement>('#app')!;
const esc = (value: string) => value.replace(/[&<>"']/g, char => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[char]!));
const saved = readNight();
let state: NightState = saved ?? freshNight();
let hasSave = !!saved;
let inNight = false;
let storageWorks = true;
let transitionBusy = false;
let selectedTicket: number | null = null;
let feedback = '';
let hintLevel = 0;
let echoTravel = false;
let echoTimer: ReturnType<typeof setTimeout> | undefined;
let echoRemaining = 0;
let echoStarted = 0;
let journey = false;
let audioFailed = false;
let activeDetail: { lines: readonly DialogueLine[]; index: number } | null = null;
const sceneNames = ['office', 'station', 'echo', 'market', 'office'];
const sceneAlt = [
  '月光照进旧木柜里的拾遗司，小狐狸翻看标签，小狗认真登记，第七号抽屉透出暖光。',
  '许多钟围着一张长椅；小狐狸看车票，小狗举灯，门外是一片星光。',
  '小狐狸与小狗并肩坐在月面，远方山谷之间有细长的星光路径。',
  '暖灯照亮月背首饰街，小狐狸为小狗别上一颗星星，柜台上摆着修理托盘。',
  '回到熟悉的拾遗司，窗外留下三盏灯，小狗衣领上还别着一颗星星。',
];
const soundIcon = '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="m11 5-6 4H2v6h3l6 4V5Zm5 3c3 2 3 6 0 8m3-11c5 4 5 10 0 14"/></svg>';
const bookIcon = '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M12 5C8 2 4 3 2 4v15c3-1 6-1 10 1 4-2 7-2 10-1V4c-2-1-6-2-10 1Zm0 0v15"/></svg>';
const settingsIcon = '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M4 7h16M4 17h16"/><circle cx="9" cy="7" r="3"/><circle cx="15" cy="17" r="3"/></svg>';
const arrow = '<span aria-hidden="true">↗</span>';

app.innerHTML = `
  <div class="theatre is-cover">
    <div class="scene"><img id="scene-image" src="${asset('art/office.webp')}" alt="${sceneAlt[0]}" fetchpriority="high"/><div class="scene-shade"></div><div class="lamplight"></div><canvas id="dust" aria-hidden="true"></canvas><div id="scene-marks"></div></div>
    <div class="frame-corners" aria-hidden="true"></div>
    <header class="topbar"><button class="brand" data-action="cover" aria-label="回到封面">${moonMark}<span>月背拾遗司</span><i>第一夜</i></button><nav aria-label="作品选项"><button class="icon-button" id="sound-toggle" data-action="sound" aria-label="关闭声音" aria-pressed="true">${soundIcon}<span>声音</span></button><button class="icon-button" data-action="journal" aria-label="翻开值班簿">${bookIcon}<span>值班簿</span></button><button class="icon-button small-icon" data-action="settings" aria-label="声音与阅读设置">${settingsIcon}</button></nav></header>
    <div id="content"></div>
    <footer class="bottom-bar"><span id="footer-note">月亮背面，今晚有人值班。</span><button data-action="credits">制作与鸣谢 <span aria-hidden="true">✦</span></button></footer>
    <div id="chapter-transition" aria-hidden="true"><span class="transition-moon">${moonMark}</span><p></p><h2></h2></div>
    <p class="sr-only" id="announcement" aria-live="polite"></p>
  </div>
  <dialog id="object-dialog" class="object-dialog" aria-labelledby="object-title"></dialog>
  <dialog id="book-dialog" class="book-dialog" aria-labelledby="book-title"></dialog>
  <dialog id="settings-dialog" class="settings-dialog" aria-labelledby="settings-title"></dialog>
`;

const theatre = app.querySelector<HTMLElement>('.theatre')!;
const content = app.querySelector<HTMLElement>('#content')!;
const sceneImage = app.querySelector<HTMLImageElement>('#scene-image')!;
const objectDialog = app.querySelector<HTMLDialogElement>('#object-dialog')!;
const bookDialog = app.querySelector<HTMLDialogElement>('#book-dialog')!;
const settingsDialog = app.querySelector<HTMLDialogElement>('#settings-dialog')!;
const announce = (text: string) => { app.querySelector('#announcement')!.textContent = text; };
const audio = new NightAudio((enabled, failed) => {
  audioFailed = failed;
  const button = app.querySelector<HTMLButtonElement>('#sound-toggle')!;
  button.setAttribute('aria-pressed', String(enabled));
  button.setAttribute('aria-label', enabled ? '关闭声音' : '开启声音');
  button.classList.toggle('is-muted', !enabled);
  button.querySelector('span')!.textContent = enabled ? '声音' : '静音';
  if (failed) announce('声音暂时没有加载好，故事仍可以继续。可在设置中重试。');
});
makeAtmosphere(app.querySelector<HTMLCanvasElement>('#dust')!);

function save() { hasSave = true; storageWorks = writeNight(state); }
function focusAction(action: string, root: ParentNode = app) { requestAnimationFrame(() => root.querySelector<HTMLButtonElement>(`[data-action="${action}"]`)?.focus({ preventScroll: true })); }
function closeDialogs() { for (const dialog of app.querySelectorAll<HTMLDialogElement>('dialog[open]')) dialog.close(); }
function setScene(index: number) {
  const isEnding = inNight && (state.phase === 'birds' || state.phase === 'finished');
  const url = asset(`art/${isEnding ? 'ending-final' : sceneNames[index]}.webp`);
  if (sceneImage.getAttribute('src') !== url) sceneImage.src = url;
  sceneImage.alt = sceneAlt[index];
  theatre.dataset.scene = sceneNames[index];
  const preload = new Image(); preload.src = asset(`art/${index < 4 ? sceneNames[index + 1] : 'ending-final'}.webp`);
}

function render() {
  theatre.classList.toggle('is-cover', !inNight);
  theatre.classList.toggle('is-finished', inNight && state.phase === 'finished');
  setScene(inNight ? state.chapter : 0);
  app.querySelector('#footer-note')!.textContent = inNight ? '今晚不用赶路。' : storyMeta.invitation;
  app.querySelector('#scene-marks')!.innerHTML = inNight && (state.phase === 'birds' || state.phase === 'finished')
    ? `<div class="free-bird bird-one">${birdSvg(1)}</div><div class="free-bird bird-two">${birdSvg(-1)}</div>`
    : inNight && state.chapter === 4
      ? `<svg class="returning-details" viewBox="0 0 1586 992" preserveAspectRatio="xMidYMid slice" aria-hidden="true"><path d="m950 321 2 7 8 2-7 3-2 8-3-7-8-2 7-3Z" fill="#d7d4bc" stroke="#8a9181" stroke-width=".7"/>${[[1258, 309], [1320, 276], [1370, 262]].map(([x, y]) => `<g><circle cx="${x}" cy="${y}" r="13" fill="#ecba6722"/><circle cx="${x}" cy="${y}" r="5" fill="#e9bd75"/><circle cx="${x}" cy="${y - 1}" r="2" fill="#ffe4ad"/></g>`).join('')}</svg>`
      : '';
  if (!inNight) return renderCover();
  if (state.phase === 'finished') return renderEnding();
  const chapter = chapters[state.chapter];
  const isDialogue = state.phase !== 'explore';
  const lines = state.phase === 'intro' ? chapter.intro : state.phase === 'birds' ? birdCoda : chapter.outro;
  const line = lines[Math.min(state.line, lines.length - 1)];
  content.innerHTML = `<section class="night-content" aria-label="${esc(chapter.title)}">
    <div class="chapter-heading"><p class="eyebrow">${chapter.kicker}</p><h1>${chapter.title}</h1><div class="chapter-dots" aria-label="第 ${state.chapter + 1} 章，共五章">${chapters.map((_, i) => `<span class="${i <= state.chapter ? 'lit' : ''}" aria-hidden="true"></span>`).join('')}</div></div>
    ${!isDialogue ? `<div class="hotspots"><button class="hotspot primary-hotspot" data-action="inspect" aria-label="${chapter.actionLabel}"><span class="hotspot-ring" aria-hidden="true">✦</span><span>${chapter.actionLabel}</span></button></div><div class="details-row">${sceneDetails[chapter.id].map((detail, i) => `<button class="detail-link" data-action="detail" data-index="${i}"><span aria-hidden="true">◇</span> ${detail.label}</button>`).join('')}</div>` : ''}
    <div class="dialogue-dock ${!isDialogue ? 'task-dock' : ''}">
      ${isDialogue ? `<div class="speaker-seal ${line.speaker}" aria-hidden="true">${line.speaker === 'fox' ? '狐' : line.speaker === 'dog' ? '犬' : '簿'}</div><div class="speech"><p class="speaker-name">${speakers[line.speaker]}</p><p class="speech-text" id="speech-text">${line.text}</p><p class="speech-counter">${String(state.line + 1).padStart(2, '0')} <span>/ ${String(lines.length).padStart(2, '0')}</span></p></div><button class="next-line" data-action="next-line" aria-label="继续对白"><span aria-hidden="true">→</span></button>` : `<div class="task-moon" aria-hidden="true">${moonMark}</div><div class="speech"><p class="speaker-name">今夜的小事</p><p class="task-description">${chapter.description}</p></div><button class="text-button" data-action="inspect">近一点看 ${arrow}</button>`}
    </div>
  </section>`;
  if (isDialogue) announce(`${speakers[line.speaker]}：${line.text}`);
}

function renderCover() {
  content.innerHTML = `<section class="cover-content"><div class="case-label"><span></span> 第〇〇七号遗失物 <span></span></div><h1><span>月背</span><span>拾遗司</span></h1><p class="cover-subtitle">小狐狸和小狗的第一夜值班</p><div class="cover-rule"></div><p class="cover-description">有些东西并没有丢失，<br/>只是还在抵达的路上。</p><button class="start-button" data-action="start"><span>${hasSave ? state.phase === 'finished' ? '再打开第七号柜' : '接着今晚的值班' : '开始今夜值班'}</span><span class="button-arrow" aria-hidden="true">→</span></button><p class="cover-note">一件迟到的东西 · 一个恰好的夜晚</p>${hasSave ? '<button class="restart-link" data-action="restart">重新过这一夜</button>' : ''}</section><p class="cover-side-note" aria-hidden="true">保管所有 · 尚未抵达的心意</p>`;
}

function renderEnding() {
  content.innerHTML = `<section class="ending-content"><p class="eyebrow">第一夜 · 已妥善收存</p><h1>下次一起打开。</h1><p class="ending-intro">第七号柜里，一枚小小的月亮。<br/>它已经不再迟到了。</p><button class="keepsake" data-action="keepsake" aria-label="再次打开保存的抽屉">${broochSvg(false, true, 'ending')}<span>第七号柜 <i>↗</i></span></button><div class="ending-actions"><button class="start-button" data-action="journal"><span>翻看本夜记录</span><span aria-hidden="true">→</span></button><button class="text-button" data-action="download">留一份在身边 ↓</button></div><p class="ending-footnote">东西还在原处。灯也是。</p></section>`;
}

async function startNight() {
  inNight = true;
  closeDialogs();
  void audio.setEnabled(state.sound);
  save(); render();
  focusAction(state.phase === 'finished' ? 'keepsake' : state.phase === 'explore' ? 'inspect' : 'next-line');
}

function nextLine() {
  if (transitionBusy || activeDetail) return;
  const chapter = chapters[state.chapter];
  const lines = state.phase === 'intro' ? chapter.intro : state.phase === 'birds' ? birdCoda : chapter.outro;
  if (state.line < lines.length - 1) { state.line++; save(); render(); focusAction('next-line'); return; }
  if (state.phase === 'intro') { state.phase = 'explore'; state.line = 0; save(); render(); focusAction('inspect'); }
  else if (state.phase === 'outro') {
    if (state.chapter === 3) showJourney();
    else if (state.chapter === 4) { state.phase = 'birds'; state.line = 0; save(); void audio.play('drawer-close'); render(); focusAction('next-line'); }
    else void changeChapter(state.chapter + 1);
  } else if (state.phase === 'birds') { state.phase = 'finished'; state.line = 0; save(); render(); focusAction('keepsake'); }
}

async function changeChapter(index: number) {
  if (transitionBusy) return;
  transitionBusy = true;
  stopEcho(); closeDialogs(); journey = false;
  const overlay = app.querySelector<HTMLElement>('#chapter-transition')!;
  overlay.querySelector('p')!.textContent = chapters[index].kicker;
  overlay.querySelector('h2')!.textContent = chapters[index].title;
  overlay.classList.add('visible');
  const reduced = matchMedia('(prefers-reduced-motion: reduce)').matches;
  await new Promise(resolve => setTimeout(resolve, reduced ? 30 : 480));
  state.chapter = index; state.phase = 'intro'; state.line = 0;
  selectedTicket = null; hintLevel = 0; feedback = '';
  save(); render();
  await new Promise(resolve => setTimeout(resolve, reduced ? 30 : 800));
  overlay.classList.remove('visible'); transitionBusy = false;
  focusAction('next-line');
}

function solve() {
  stopEcho(); journey = false;
  if (!state.completed.includes(state.chapter)) state.completed.push(state.chapter);
  if (state.chapter === 0) state.flipped = true;
  if (state.chapter === 1) state.tickets = ['left', 'middle', 'right'];
  if (state.chapter === 2) state.echo = 2;
  if (state.chapter === 4) state.placed = true;
  state.phase = 'outro'; state.line = 0;
  closeDialogs(); save(); render();
  void audio.play(state.chapter === 3 ? 'clasp' : 'little-bell');
  focusAction('next-line');
}

function showObject() {
  hintLevel = 0; feedback = ''; selectedTicket = null; journey = false;
  renderObject();
  objectDialog.showModal();
  void audio.play(state.chapter === 0 || state.chapter === 4 ? 'drawer-open' : 'paper-turn');
}

function objectHeader(title: string, subtitle: string) {
  return `<header class="object-header"><div><p class="eyebrow">${subtitle}</p><h2 id="object-title">${title}</h2></div><button class="close-button" data-action="close-object" aria-label="收起近看">×</button></header>`;
}

function renderObject(focus?: string) {
  const chapter = chapters[state.chapter];
  objectDialog.className = `object-dialog object-${chapter.id}`;
  let body = '';
  if (chapter.id === 'cabinet') {
    body = `<div class="inspection-layout"><div class="brooch-plinth"><button class="brooch-touch ${state.flipped ? 'is-back' : ''}" data-action="flip" aria-label="${state.flipped ? '翻回胸针正面' : '翻到胸针背面'}">${broochSvg(state.flipped, false, 'inspect')}</button><p class="object-caption">${state.flipped ? '背面 · 少了一枚小扣件' : '银色胸针 · 轻触翻面'} <span aria-hidden="true">↻</span></p></div><div class="archive-tag"><span class="tag-hole"></span><p class="tag-number">拾遗第〇〇七号</p><dl>${openingLabel.map(row => `<div><dt>${row.label}</dt><dd>${row.value}</dd></div>`).join('')}</dl><span class="small-seal">待领</span></div></div><div class="object-response"><p>${state.flipped ? '两只小孔，一个方形缺口。记住它的样子。' : '月亮的背面，也许藏着一点线索。'}</p>${state.flipped ? '<button class="ink-button" data-action="solve">记下缺口，收好胸针 →</button>' : '<button class="ink-button" data-action="flip">翻到背面 ↻</button>'}</div>`;
  } else if (chapter.id === 'tickets') {
    const pieces = state.tickets.map(id => ticketPieces.find(piece => piece.id === id)!);
    const joins = [pieces[0].rightEdge.toString() === pieces[1].leftEdge.toString(), pieces[1].rightEdge.toString() === pieces[2].leftEdge.toString()];
    const complete = state.tickets.join() === 'left,middle,right';
    body = `<p class="object-instruction">点两张票，交换它们的位置。<br/><span>让月光细线与深色椅背，都穿过接缝。</span></p><div class="ticket-board"><div class="ticket-edge left-edge" aria-hidden="true"><svg viewBox="0 0 24 100" preserveAspectRatio="none"><path d="M0 46H24" class="moon-line"/><path d="M0 78H24" class="bench-line"/></svg></div>${pieces.map((piece, index) => `<button class="ticket ${selectedTicket === index ? 'selected' : ''}" data-action="ticket" data-index="${index}" aria-pressed="${selectedTicket === index}" aria-label="${piece.title}，${piece.backText}"><span class="ticket-head">月背铁道 <i>${['21', '04', '17'][ticketPieces.indexOf(piece)]}</i></span>${ticketSvg(piece)}<span class="ticket-title">${piece.title}</span><span class="ticket-date">${piece.date}</span></button>${index < 2 ? `<span class="seam ${joins[index] ? 'joined' : ''}" aria-label="第${index + 1}道接缝${joins[index] ? '已接上' : '未接上'}">${joins[index] ? '✧' : '·'}</span>` : ''}`).join('')}<div class="ticket-edge right-edge" aria-hidden="true"><svg viewBox="0 0 24 100" preserveAspectRatio="none"><path d="M0 38H24" class="moon-line"/><path d="M0 70H24" class="bench-line"/></svg></div></div><div class="object-response"><p role="status">${feedback || (complete ? ticketFeedback.complete : joins.some(Boolean) ? ticketFeedback.oneJoined : ticketFeedback.noneJoined)}</p>${complete ? '<button class="ink-button" data-action="solve">拾起扶手旁的银光 →</button>' : '<p class="fine-print">票面上的年份，可以先放一边。</p>'}</div>`;
  } else if (chapter.id === 'echo') {
    body = `<div class="echo-landscape"><svg class="echo-route" viewBox="0 0 600 220" role="img" aria-label="话语绕过山谷，沿弧线走到另一端"><path class="echo-mountain" d="M80 205 165 98 207 146 320 33 420 178 486 120 550 205Z"/><path id="echo-line" d="M45 180 C100 -8 500 -8 555 180"/><circle cx="45" cy="180" r="7"/><circle cx="555" cy="180" r="7"/>${echoTravel ? `<circle class="echo-spark" r="5"><animateMotion dur="${matchMedia('(prefers-reduced-motion: reduce)').matches ? 1.5 : 4.2}s" fill="freeze" path="${state.echo === 0 ? 'M45 180 C100 -8 500 -8 555 180' : 'M555 180 C500 -8 100 -8 45 180'}"/></circle>` : ''}</svg><span class="echo-person echo-dog">小狗<span>我在这里</span></span><span class="echo-person echo-fox">小狐狸<span>我知道</span></span><p class="echo-message">${echoTravel ? echoLines[Math.min(state.echo, 1)].text : state.echo === 2 ? '我在这里。　我知道。' : '一句话，正在等一个出发的时刻。'}</p></div><div class="object-response"><p role="status">${feedback || (state.echo === 0 ? '让小狗先说一句话。' : state.echo === 1 ? echoFeedback.arrived : echoFeedback.complete)}</p>${state.echo === 2 ? '<button class="ink-button" data-action="solve">收下透明的小石头 →</button>' : `<button class="ink-button" data-action="send-echo" ${echoTravel ? 'disabled' : ''}>${echoTravel ? '这句话还在路上…' : echoLines[state.echo].sendLabel + '「' + echoLines[state.echo].text + '」'}</button>`}${echoTravel ? '<button class="subtle-button" data-action="finish-echo">让这一句先抵达</button>' : ''}</div>`;
  } else if (chapter.id === 'clasp') {
    body = `<div class="clasp-reference"><div class="clasp-brooch">${broochSvg(true, false, 'repair')}</div><div><p class="reference-label">胸针背面的空扣座</p><p>两只孔的距离。<br/>下方缺口的形状。</p><div class="socket-sample">${claspSvg(28, 'square', 'reference')}<span>对照这里</span></div></div></div><div class="clasp-choices">${claspPieces.map(piece => `<button class="clasp-choice" data-action="clasp" data-id="${piece.id}" aria-label="${piece.label}，${piece.holeSpacing === 44 ? '宽孔距' : '窄孔距'}，${piece.notch === 'round' ? '圆缺口' : '方缺口'}">${claspSvg(piece.holeSpacing, piece.notch, piece.id)}<span>${piece.label}</span></button>`).join('')}</div><div class="object-response"><p role="status">${feedback || '试一枚。合适的扣件，不需要用力。'}</p></div>`;
  } else {
    body = `<div class="home-drawer ${state.placed ? 'placed' : ''}"><div class="drawer-paper"><span>第一夜</span><small>三张车票<br/>一段回声<br/>一个位置</small></div><button class="moon-rest" data-action="place" aria-label="${state.placed ? '月亮已安放在软布上' : '将胸针放到软布上'}">${state.placed ? broochSvg(false, true, 'home') : `<span class="moon-outline">${moonMark}</span><span>给月亮留的位置</span>`}</button><div class="kept-stone" aria-label="回声星球的小石头"></div></div><div class="object-response"><p>${state.placed ? '这里，小狐狸和小狗都够得到。' : '软布铺好了。慢慢放下就好。'}</p>${state.placed ? '<button class="ink-button" data-action="solve">贴上「下次一起打开」的标签 →</button>' : '<button class="ink-button" data-action="place">安放月亮 ↓</button>'}</div>`;
  }
  objectDialog.innerHTML = `${objectHeader(chapter.title, chapter.kicker)}<div class="object-body">${body}</div><footer class="object-footer"><button class="subtle-button" data-action="hint">${hintLevel ? '再给一点提示' : '问问值班员'}</button><span>${hintLevel ? (hintLevel > 1 ? chapter.directHint : chapter.hint) : '可以慢慢来，也可以请他们帮忙。'}</span><button class="subtle-button" data-action="skip">${chapter.skipLabel} ↗</button></footer>`;
  if (focus) focusAction(focus, objectDialog);
}

function swapTicket(index: number) {
  if (selectedTicket === null) { selectedTicket = index; feedback = ticketFeedback.selected; }
  else if (selectedTicket === index) { selectedTicket = null; feedback = ''; }
  else {
    [state.tickets[selectedTicket], state.tickets[index]] = [state.tickets[index], state.tickets[selectedTicket]];
    selectedTicket = null;
    const p = state.tickets.map(id => ticketPieces.find(piece => piece.id === id)!);
    const count = Number(p[0].rightEdge.toString() === p[1].leftEdge.toString()) + Number(p[1].rightEdge.toString() === p[2].leftEdge.toString());
    feedback = state.tickets.join() === 'left,middle,right' ? ticketFeedback.complete : count === 0 ? ticketFeedback.noneJoined : ticketFeedback.oneJoined;
    save(); void audio.play('paper-turn');
  }
  renderObject(); announce(feedback);
  requestAnimationFrame(() => objectDialog.querySelector<HTMLButtonElement>(`[data-action="ticket"][data-index="${index}"]`)?.focus({ preventScroll: true }));
}

function sendEcho() {
  if (echoTravel || state.echo >= 2) return;
  echoTravel = true; feedback = echoFeedback.waiting;
  echoRemaining = echoLines[state.echo].travelMs;
  if (matchMedia('(prefers-reduced-motion: reduce)').matches) echoRemaining = 1500;
  echoStarted = performance.now();
  echoTimer = setTimeout(finishEcho, echoRemaining);
  void audio.play('little-bell'); renderObject(); focusAction('finish-echo', objectDialog);
}

function finishEcho() {
  if (!echoTravel) return;
  clearTimeout(echoTimer); echoTravel = false;
  state.echo = Math.min(2, state.echo + 1);
  feedback = state.echo === 2 ? echoFeedback.complete : echoFeedback.arrived;
  save(); renderObject(state.echo === 2 ? 'solve' : 'send-echo'); announce(feedback);
  void audio.play('little-bell');
}

function stopEcho() { clearTimeout(echoTimer); echoTravel = false; }
document.addEventListener('visibilitychange', () => {
  if (!echoTravel) return;
  if (document.hidden) { clearTimeout(echoTimer); echoRemaining = Math.max(0, echoRemaining - (performance.now() - echoStarted)); objectDialog.classList.add('paused'); objectDialog.querySelector<SVGSVGElement>('.echo-route')?.pauseAnimations(); }
  else { echoStarted = performance.now(); echoTimer = setTimeout(finishEcho, echoRemaining); objectDialog.classList.remove('paused'); objectDialog.querySelector<SVGSVGElement>('.echo-route')?.unpauseAnimations(); }
});

function showJourney() {
  journey = true;
  objectDialog.className = 'object-dialog journey-dialog';
  objectDialog.innerHTML = `${objectHeader('回去的路，一直亮着', '归途 · 月面')}<div class="journey-art"><svg viewBox="0 0 600 180" aria-hidden="true"><path d="M20 150C190 130 110 48 310 77S395 147 580 28"/></svg>${[0, 1, 2].map((_, i) => `<button class="path-lamp lamp-${i} ${state.lamps > i ? 'is-lit' : ''}" data-action="lamp" data-index="${i}" ${i > state.lamps ? 'disabled' : ''} aria-label="${state.lamps > i ? '已经点亮' : '点亮'}第${i + 1}盏灯"><span class="lantern"><i></i></span><span>${state.lamps > i ? '亮着' : '留一盏灯'}</span></button>`).join('')}</div><div class="journey-dialogue">${journeyLines.map(line => `<p><span>${speakers[line.speaker]}</span>${line.text}</p>`).join('')}</div><div class="object-response">${state.lamps === 3 ? '<button class="ink-button" data-action="go-home">循着灯，回到第七号柜 →</button>' : '<button class="subtle-button" data-action="all-lamps">和他们一起点亮三盏灯</button>'}</div>`;
  if (!objectDialog.open) objectDialog.showModal();
}

function showDetail(index: number) {
  const detail = sceneDetails[chapters[state.chapter].id][index];
  activeDetail = { lines: detail.lines, index: 0 };
  renderDetail(detail.label); bookDialog.showModal(); void audio.play('paper-turn');
}

function renderDetail(title?: string) {
  if (!activeDetail) return;
  const line = activeDetail.lines[activeDetail.index];
  const oldTitle = bookDialog.querySelector('#book-title')?.textContent ?? '值班间隙';
  bookDialog.innerHTML = `<div class="book-head"><p class="eyebrow">值班间隙</p><button class="close-button" data-action="close-book" aria-label="合上值班簿">×</button></div><h2 id="book-title">${title ?? oldTitle}</h2><div class="detail-illustration">${moonMark}</div><p class="speaker-name">${speakers[line.speaker]}</p><p class="detail-line">${line.text}</p><button class="ink-button" data-action="detail-next">${activeDetail.index < activeDetail.lines.length - 1 ? '听他们接着说 →' : '继续看一看 ↗'}</button>`;
}

function showJournal() {
  activeDetail = null;
  const done = state.phase === 'finished';
  bookDialog.className = 'book-dialog journal';
  bookDialog.innerHTML = `<div class="book-head"><p class="eyebrow">月背拾遗司 · 夜班登记簿</p><button class="close-button" data-action="close-book" aria-label="合上值班簿">×</button></div><h2 id="book-title">${done ? '第一夜，妥善收存。' : '一件迟到的月光'}</h2><dl class="journal-fields">${(done ? closingLabel : openingLabel).map(row => `<div><dt>${row.label}</dt><dd>${row.value}</dd></div>`).join('')}</dl><div class="journal-chapters">${chapters.map((chapter, i) => `<button data-action="revisit" data-index="${i}" ${state.completed.includes(i) ? '' : 'disabled'}><span class="journal-check">${state.completed.includes(i) ? '✧' : '·'}</span><span>${chapter.title}</span><small>${state.completed.includes(i) ? '重访 ↗' : i === state.chapter && hasSave ? '正在值班' : '尚未抵达'}</small></button>`).join('')}</div>${done ? `<div class="ending-record">${endingRecord.map(line => `<p>${line.text}<span>—— ${speakers[line.speaker]}</span></p>`).join('')}</div><button class="ink-button" data-action="download">保存本夜记录 ↓</button>` : '<p class="fine-print">已经走过的地方，可以随时回来看看。</p>'}${!storageWorks ? '<p class="save-warning">此浏览器暂时无法保存进度。完成后可以下载一份本夜记录。</p>' : ''}`;
  bookDialog.showModal(); void audio.play('paper-turn');
}

function showSettings() {
  settingsDialog.innerHTML = `<div class="book-head"><p class="eyebrow">把这一夜调到舒服的样子</p><button class="close-button" data-action="close-settings" aria-label="关闭设置">×</button></div><h2 id="settings-title">声音与阅读</h2><label class="setting-row"><span>今夜的音乐与声音</span><input id="sound-checkbox" type="checkbox" ${state.sound ? 'checked' : ''}/></label><label class="volume-control"><span>音乐轻一点，或响一点</span><input id="music-volume" type="range" min="0" max="80" value="${Math.round(state.musicVolume * 100)}" aria-label="音乐音量"/></label><p class="fine-print">静音也能完整体验。每一句回声，都有可见的去向。</p><p class="fine-print">若系统启用了“减少动态效果”，这里会自动放轻动作。</p>${audioFailed ? '<p class="save-warning">声音暂未加载。<button class="subtle-button" data-action="retry-audio">再试一次</button></p>' : ''}<button class="subtle-button settings-restart" data-action="restart">重新过这一夜</button>`;
  settingsDialog.showModal();
}

function showCredits() {
  activeDetail = null;
  bookDialog.className = 'book-dialog credits';
  bookDialog.innerHTML = `<div class="book-head"><p class="eyebrow">oncewhere · 第一件作品</p><button class="close-button" data-action="close-book" aria-label="合上制作与鸣谢">×</button></div><h2 id="book-title">留在月亮背面的名字</h2><p>故事源自《月背拾遗司》初稿。<br/>画面、机关与对白为本次互动改编。</p><h3>画面</h3><p>场景由 AI 辅助生成，再统一角色、材料与构图。可交互的月牙、票据和扣件分别绘制。</p><h3>音乐 ·《第一夜》</h3><p>本作原创旋律与音序，三拍钢琴小品。钢琴采样来自 Alexander Holm 的 <a href="https://github.com/sfzinstruments/SalamanderGrandPiano" target="_blank" rel="noreferrer">Salamander Grand Piano v3</a>，采用 <a href="https://creativecommons.org/licenses/by/3.0/" target="_blank" rel="noreferrer">CC BY 3.0</a>。原采样经变调、包络处理与混音。物件音效为本作合成。</p><h3>文字</h3><p>Noto Serif SC · SIL Open Font License 1.1。<br/>谢谢每一个愿意在这里停一会儿的人。</p><p class="credits-colophon">下次一起打开。</p>`;
  bookDialog.showModal();
}

function showRestart() {
  closeDialogs(); activeDetail = null;
  settingsDialog.innerHTML = `<div class="book-head"><p class="eyebrow">重新值班</p><button class="close-button" data-action="close-settings" aria-label="取消重新开始">×</button></div><h2 id="settings-title">重新过这一夜？</h2><p>这会替换当前浏览器中的值班进度。已下载的记录会留下。</p><div class="confirm-actions"><button class="ink-button" data-action="confirm-restart">从第七号柜开始</button><button class="subtle-button" data-action="close-settings">先留着这一夜</button></div>`;
  settingsDialog.showModal();
}

function showKeepsake() {
  objectDialog.className = 'object-dialog keepsake-dialog';
  objectDialog.innerHTML = `${objectHeader('下次一起打开', '第七号柜 · 第一夜')}<div class="home-drawer placed"><div class="drawer-paper"><span>第一夜</span><small>所有物件<br/>已妥善安放</small></div><div class="moon-rest">${broochSvg(false, true, 'kept')}</div><div class="kept-stone"></div></div><p class="keepsake-line">小狐狸：还在原来的位置。<br/>小狗：灯也是。</p><div class="object-response"><button class="ink-button" data-action="close-object">轻轻合上</button></div>`;
  objectDialog.showModal(); void audio.play('drawer-open');
}

function downloadRecord() {
  const html = `<!doctype html><html lang="zh-CN"><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>月背拾遗司 · 第一夜值班记录</title><style>body{margin:0;padding:60px 24px;background:#eee8d8;color:#263c38;font:18px/1.9 Georgia,'Songti SC',serif}main{max-width:620px;margin:auto}h1{font-weight:400;letter-spacing:.12em}small{letter-spacing:.25em;color:#7f6b49}dt{float:left;width:7em;color:#84765f}dd{margin-left:7em}section{margin:48px 0;border-top:1px solid #b8ae98;padding-top:24px}footer{margin-top:60px;color:#857456}svg{display:block;width:200px;margin:20px auto}</style><main><small>第〇〇七号 · 妥善收存</small><h1>月背拾遗司</h1><p>小狐狸和小狗的第一夜值班</p>${broochSvg(false, true, 'record')}<dl>${closingLabel.map(row => `<dt>${row.label}</dt><dd>${row.value}</dd>`).join('')}</dl><section>${endingRecord.map(line => `<p>${line.text}<br><small>—— ${speakers[line.speaker]}</small></p>`).join('')}</section><section><p>回去的路上，三盏灯还亮着。月牙胸针、车票与透明的小石头，都收在第七号柜里。</p><h2>下次一起打开。</h2></section><footer>oncewhere · 这是一份可以独立打开的静态值班记录。<br>它保留本夜文字与月牙图样；互动场景和音乐由作品原包另行保存。</footer></main></html>`;
  const url = URL.createObjectURL(new Blob([html], { type: 'text/html;charset=utf-8' }));
  const link = document.createElement('a'); link.href = url; link.download = '月背拾遗司-第一夜值班记录.html'; link.click();
  setTimeout(() => URL.revokeObjectURL(url), 1000);
  announce('本夜记录已准备下载，可以独立保存和打开。');
}

app.addEventListener('click', event => {
  const button = (event.target as Element).closest<HTMLButtonElement>('[data-action]');
  if (!button || button.disabled || transitionBusy) return;
  const action = button.dataset.action;
  if (action === 'start') void startNight();
  else if (action === 'cover') { if (inNight) save(); inNight = false; closeDialogs(); render(); focusAction('start'); }
  else if (action === 'next-line') nextLine();
  else if (action === 'inspect') showObject();
  else if (action === 'sound') { state.sound = !state.sound; if (hasSave) save(); void audio.setEnabled(state.sound); }
  else if (action === 'journal') showJournal();
  else if (action === 'settings') showSettings();
  else if (action === 'credits') showCredits();
  else if (action === 'close-object') { stopEcho(); journey = false; objectDialog.close(); focusAction(state.phase === 'finished' ? 'keepsake' : state.phase === 'outro' ? 'next-line' : 'inspect'); }
  else if (action === 'close-book') { activeDetail = null; bookDialog.close(); }
  else if (action === 'close-settings') settingsDialog.close();
  else if (action === 'flip') { state.flipped = !state.flipped; save(); void audio.play('paper-turn'); renderObject(state.flipped ? 'solve' : 'flip'); }
  else if (action === 'solve' || action === 'skip') solve();
  else if (action === 'hint') { hintLevel++; renderObject('hint'); announce(hintLevel > 1 ? chapters[state.chapter].directHint : chapters[state.chapter].hint); }
  else if (action === 'ticket') swapTicket(Number(button.dataset.index));
  else if (action === 'send-echo') sendEcho();
  else if (action === 'finish-echo') finishEcho();
  else if (action === 'clasp') {
    const piece = claspPieces.find(item => item.id === button.dataset.id)!;
    feedback = piece.feedback;
    if (piece.fits) {
      objectDialog.querySelector('.object-body')!.innerHTML = `<div class="repair-complete">${broochSvg(false, true, 'repaired')}<p>${piece.feedback}</p><button class="ink-button" data-action="solve">轻轻合拢，咔哒 →</button></div>`;
      focusAction('solve', objectDialog); void audio.play('clasp');
    } else { renderObject(); announce(feedback); focusAction('clasp', objectDialog); }
  } else if (action === 'place') { state.placed = true; save(); void audio.play('clasp'); renderObject('solve'); }
  else if (action === 'lamp') { state.lamps = Number(button.dataset.index) === state.lamps ? Math.min(3, state.lamps + 1) : state.lamps; save(); void audio.play('little-bell'); showJourney(); if (state.lamps === 3) focusAction('go-home', objectDialog); }
  else if (action === 'all-lamps') { state.lamps = 3; save(); showJourney(); focusAction('go-home', objectDialog); }
  else if (action === 'go-home') void changeChapter(4);
  else if (action === 'detail') showDetail(Number(button.dataset.index));
  else if (action === 'detail-next' && activeDetail) { if (++activeDetail.index < activeDetail.lines.length) { renderDetail(); focusAction('detail-next', bookDialog); } else { activeDetail = null; bookDialog.close(); } }
  else if (action === 'keepsake') showKeepsake();
  else if (action === 'download') downloadRecord();
  else if (action === 'restart') showRestart();
  else if (action === 'confirm-restart') { const sound = state.sound; const musicVolume = state.musicVolume; state = freshNight(); state.sound = sound; state.musicVolume = musicVolume; hasSave = false; stopEcho(); void startNight(); }
  else if (action === 'revisit') {
    const index = Number(button.dataset.index);
    if (!state.completed.includes(index)) return;
    activeDetail = null;
    bookDialog.className = 'book-dialog';
    bookDialog.innerHTML = `<div class="book-head"><p class="eyebrow">已经走过的一段时间</p><button class="close-button" data-action="close-book" aria-label="合上重访记录">×</button></div><h2 id="book-title">${chapters[index].title}</h2><img class="revisit-image" src="${asset(`art/${sceneNames[index]}.webp`)}" alt="${sceneAlt[index]}"/><div class="revisit-lines">${chapters[index].outro.map(line => `<p><span>${speakers[line.speaker]}</span>${line.text}</p>`).join('')}</div><button class="ink-button" data-action="close-book">把这一页收好</button>`;
  } else if (action === 'retry-audio') void audio.unlock();
});

app.addEventListener('input', event => {
  const input = event.target as HTMLInputElement;
  if (input.id === 'music-volume') { state.musicVolume = Number(input.value) / 100; audio.setVolume(state.musicVolume); if (hasSave) save(); }
  if (input.id === 'sound-checkbox') { state.sound = input.checked; if (hasSave) save(); void audio.setEnabled(state.sound); }
});
objectDialog.addEventListener('cancel', () => { stopEcho(); journey = false; });
bookDialog.addEventListener('close', () => { activeDetail = null; });
for (const dialog of [objectDialog, bookDialog, settingsDialog]) {
  dialog.addEventListener('click', event => {
    if (event.target !== dialog) return;
    const rect = dialog.getBoundingClientRect();
    if (event.clientX < rect.left || event.clientX > rect.right || event.clientY < rect.top || event.clientY > rect.bottom) { dialog.close(); if (dialog === objectDialog) stopEcho(); }
  });
}
render();
audio.setVolume(state.musicVolume);
if (!state.sound) { const sound = app.querySelector('#sound-toggle')!; sound.classList.add('is-muted'); sound.setAttribute('aria-label', '开启声音'); sound.setAttribute('aria-pressed', 'false'); sound.querySelector('span')!.textContent = '静音'; }

// Keep the painted composition steady; only the light follows the pointer a little.
theatre.addEventListener('pointermove', event => {
  if (event.pointerType !== 'mouse' || matchMedia('(prefers-reduced-motion: reduce)').matches) return;
  const rect = theatre.getBoundingClientRect();
  theatre.style.setProperty('--light-x', `${((event.clientX - rect.left) / rect.width - 0.5) * 8}px`);
});
