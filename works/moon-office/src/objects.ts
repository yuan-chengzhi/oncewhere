import type { TicketPiece } from './story';

/** Small, controllable foreground objects; the illustrated scenes live elsewhere. */
let instance = 0;

const safe = (value: string): string => value
  .replaceAll('&', '&amp;')
  .replaceAll('<', '&lt;')
  .replaceAll('>', '&gt;')
  .replaceAll('"', '&quot;')
  .replaceAll("'", '&#39;');

const prefix = (name: string, supplied?: string): string =>
  `moon-${name}-${(supplied ?? 'object').replace(/[^a-zA-Z0-9_-]/g, '')}-${++instance}`;

const crescent = 'M 164 31 C 111 13 48 41 34 100 C 17 163 63 213 124 215 C 164 216 195 191 208 156 C 175 171 140 160 121 138 C 93 104 111 53 164 31 Z';

/** The bottom cutout uses the exact same geometry on the socket and all clasps. */
const platePath = (notch: 'square' | 'round'): string => {
  const cutout = notch === 'square'
    ? 'H 58 V 48 H 42 V 58'
    : 'H 60 V 57 A 10 10 0 0 0 40 57 V 58';
  return `M 20 12 H 80 Q 88 12 88 20 V 50 Q 88 58 80 58 ${cutout} H 20 Q 12 58 12 50 V 20 Q 12 12 20 12 Z`;
};

const holes = (spacing: number, socket: boolean): string => {
  const shade = socket ? '#0d252a' : '#1e3437';
  return [50 - spacing / 2, 50 + spacing / 2].map(x => `
    <circle cx="${x}" cy="32" r="5.4" fill="${shade}" stroke="#d4d5b7" stroke-width="1.3"/>
    <path d="M ${x - 3.7} 33.5 A 4 4 0 0 0 ${x + 3.7} 33.5" fill="none" stroke="#576f6b" stroke-width=".8"/>
  `).join('');
};

const plate = (key: string, spacing: number, notch: 'square' | 'round', socket = false): string => `
  <path d="${platePath(notch)}" fill="${socket ? '#344b4a' : `url(#${key}-metal)`}"
    stroke="${socket ? '#b5b89b' : '#526861'}" stroke-width="1.5"/>
  <path d="M 20 15 H 80 Q 85 15 85 21 V 48" fill="none" stroke="#f0e4ba" stroke-opacity="${socket ? '.25' : '.72'}" stroke-width=".9"/>
  <path d="M 17 23 V 49 Q 17 53 22 53 H 36 M 64 53 H 79" fill="none" stroke="#152e32" stroke-opacity=".35" stroke-width=".8"/>
  ${holes(spacing, socket)}
  <path d="M 23 23 L 26 21 M 72 45 L 76 43 M 21 46 L 24 47 M 64 18 L 67 17" fill="none" stroke="#f7e7b9" stroke-opacity=".3" stroke-width=".6"/>
`;

export function broochSvg(back: boolean, repaired: boolean, id?: string): string {
  const key = prefix('brooch', id);
  const label = back
    ? repaired
      ? '月牙胸针背面，旧银扣已经合拢，两个孔与方形缺口严丝合缝。'
      : '月牙胸针背面，下方空扣座有两个相距二十八单位的圆孔，底部有一个方形缺口。'
    : repaired
      ? '修好的氧化银月牙胸针，细密星纹之间嵌着一颗透亮的玻璃石。'
      : '氧化银月牙胸针，表面刻有星辰与细线，月光停在一道细小的裂缝旁。';
  const surface = back ? '#607771' : `url(#${key}-silver)`;
  return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 240 240" role="img" aria-label="${label}" class="brooch-svg${back ? ' is-back' : ''}${repaired ? ' is-repaired' : ''}">
  <defs>
    <linearGradient id="${key}-silver" x1=".08" y1=".08" x2=".91" y2=".94" gradientUnits="objectBoundingBox">
      <stop offset="0" stop-color="#e9e1bf"/>
      <stop offset=".24" stop-color="#a7b7a9"/>
      <stop offset=".43" stop-color="#597677"/>
      <stop offset=".64" stop-color="#a5b8ac"/>
      <stop offset=".79" stop-color="#e8dfba"/>
      <stop offset="1" stop-color="#516b6e"/>
    </linearGradient>
    <linearGradient id="${key}-rim" x1=".1" y1="0" x2=".8" y2="1">
      <stop stop-color="#fff0c9"/>
      <stop offset=".45" stop-color="#6f8983"/>
      <stop offset=".75" stop-color="#f4e0ad"/>
      <stop offset="1" stop-color="#75938a"/>
    </linearGradient>
    <linearGradient id="${key}-metal" x1="0" y1="0" x2=".65" y2="1">
      <stop stop-color="#d9debe"/>
      <stop offset=".38" stop-color="#95aaa0"/>
      <stop offset=".65" stop-color="#c6ccab"/>
      <stop offset="1" stop-color="#6c837a"/>
    </linearGradient>
    <radialGradient id="${key}-glass" cx=".32" cy=".24" r=".8">
      <stop stop-color="#fff7d4"/>
      <stop offset=".23" stop-color="#cce3d4"/>
      <stop offset=".65" stop-color="#6faba7"/>
      <stop offset="1" stop-color="#244d5a"/>
    </radialGradient>
    <radialGradient id="${key}-ground"><stop stop-color="#04151c" stop-opacity=".6"/><stop offset="1" stop-color="#04151c" stop-opacity="0"/></radialGradient>
    <filter id="${key}-shadow" x="-35%" y="-30%" width="170%" height="180%"><feDropShadow dx="1" dy="8" stdDeviation="5" flood-color="#00111a" flood-opacity=".42"/></filter>
    <clipPath id="${key}-clip"><path d="${crescent}"/></clipPath>
    <pattern id="${key}-hammer" width="17" height="19" patternUnits="userSpaceOnUse">
      <circle cx="3" cy="5" r=".6" fill="#f7edca" fill-opacity=".15"/>
      <circle cx="12" cy="13" r="1.1" fill="#29494b" fill-opacity=".1"/>
      <path d="M 8 2 L 10 3 M 2 15 L 4 14" stroke="#e4dfbe" stroke-opacity=".13" stroke-width=".5"/>
    </pattern>
  </defs>
  <ellipse cx="120" cy="216" rx="91" ry="17" fill="url(#${key}-ground)"/>
  <g filter="url(#${key}-shadow)">
    <path d="${crescent}" transform="translate(0 2.4)" fill="#344d50" stroke="#203d43" stroke-width="2.5"/>
    <path d="${crescent}" fill="${surface}" stroke="url(#${key}-rim)" stroke-width="1.8"/>
    <path d="${crescent}" fill="url(#${key}-hammer)"/>
    <path d="M 148 32 C 95 25 46 56 39 110 C 31 165 72 207 126 208 C 157 209 184 191 199 167" fill="none" stroke="#ecdfb3" stroke-width=".8" stroke-opacity=".8"/>
    <path d="M 139 44 C 108 66 102 105 121 135 C 143 164 171 170 197 162" fill="none" stroke="#203f44" stroke-width="1.7" stroke-opacity=".7"/>
    ${back ? `
      <g clip-path="url(#${key}-clip)" stroke="#293f40" fill="none" opacity=".44">
        <path d="M 46 109 C 63 88 71 56 110 44 M 45 125 C 76 107 81 85 94 66 M 50 141 C 67 130 79 119 89 104" stroke-width=".7"/>
        <path d="M 70 195 C 92 207 119 209 145 202" stroke-width="1"/>
      </g>
      <g transform="rotate(-18 79 118)">
        <rect x="72" y="70" width="14" height="12" rx="4" fill="url(#${key}-metal)" stroke="#344d4c" stroke-width="1.2"/>
        <path d="M 75 72 V 81 M 83 72 V 81" stroke="#edf0cd" stroke-opacity=".5" stroke-width=".7"/>
        <path d="M 79 81 L 79 153" fill="none" stroke="#314a4b" stroke-width="4.5" stroke-linecap="round"/>
        <path d="M 78.3 81 L 78.3 151" fill="none" stroke="#dfdfbb" stroke-width="1.5" stroke-linecap="round"/>
      </g>
      <g transform="translate(55 137)">
        <path d="${platePath('square')}" fill="#203b40" stroke="#244044" stroke-width="5" opacity=".5"/>
        ${plate(key, 28, 'square', !repaired)}
        ${!repaired ? '<path d="M 42 58 V 48 H 58 V 58" fill="none" stroke="#f3db9b" stroke-width="2" stroke-linecap="round"/>' : '<path d="M 42 32 H 58" stroke="#e3e2bd" stroke-width="2.2" stroke-linecap="round"/>'}
      </g>
      <path d="M 58 151 L 62 148 M 54 146 L 55 142" fill="none" stroke="#e8dcb6" stroke-width=".7" opacity=".45"/>
    ` : `
      <g clip-path="url(#${key}-clip)" fill="none" stroke-linecap="round">
        <path d="M 48 133 C 59 102 80 84 90 56 M 53 149 C 69 114 88 117 95 87 M 71 184 C 101 194 139 194 160 182" stroke="#344f53" stroke-width=".9" opacity=".7"/>
        <path d="M 51 134 C 62 103 83 85 93 57 M 56 149 C 72 115 91 118 98 88 M 73 187 C 103 197 141 197 162 185" stroke="#dce3bf" stroke-width=".5" opacity=".65"/>
        <path d="M 65 101 L 86 117 L 72 144 L 96 170 L 123 181 L 147 177" stroke="#2a4f54" stroke-width=".8"/>
        <path d="M 64 100 L 85 116 L 71 143 L 95 169 L 122 180 L 146 176" stroke="#eae5ba" stroke-width=".5" opacity=".8"/>
        <path d="M 48 160 L 58 168 L 64 179" stroke="#37565a" stroke-width=".6"/>
      </g>
      <g fill="#eae5c4" stroke="#34575b" stroke-width=".7">
        <circle cx="65" cy="101" r="2"/><circle cx="86" cy="117" r="2.7"/><circle cx="72" cy="144" r="1.9"/>
        <circle cx="123" cy="181" r="2.5"/><circle cx="147" cy="177" r="1.5"/>
      </g>
      <g fill="#e8e0b9" stroke="#456766" stroke-width=".65">
        <path d="M 69 66 L 71 72 L 77 74 L 71 76 L 69 82 L 67 76 L 61 74 L 67 72 Z"/>
        <path d="M 53 118 L 54.6 122.4 L 59 124 L 54.6 125.6 L 53 130 L 51.4 125.6 L 47 124 L 51.4 122.4 Z"/>
        <path d="M 117 195 L 118 198 L 121 199 L 118 200 L 117 203 L 116 200 L 113 199 L 116 198 Z"/>
      </g>
      <path d="M 57 175 L 67 166 L 73 173 L 84 163" fill="none" stroke="${repaired ? '#e5ce8a' : '#304951'}" stroke-width="${repaired ? '1.3' : '1.2'}" stroke-linejoin="round"/>
      <circle cx="96" cy="168" r="13" fill="#2c4a50" stroke="#d6d5af" stroke-width="1.1"/>
      <circle cx="96" cy="168" r="10.5" fill="${repaired ? `url(#${key}-glass)` : '#40666a'}" stroke="#a6beb0" stroke-width=".7"/>
      ${repaired ? `
        <path d="M 96 158 L 104 165 L 99 176 L 90 173 L 88 163 Z M 96 158 L 99 176 M 88 163 L 104 165 L 90 173" fill="none" stroke="#e1f0d0" stroke-width=".65" opacity=".52"/>
        <path d="M 91 163 L 94 161" stroke="#fff4ce" stroke-width="2" stroke-linecap="round"/>
      ` : '<path d="M 90 172 L 101 161 M 94 176 L 104 166" stroke="#94b1a3" stroke-width=".55" opacity=".5"/>'}
      <g fill="#eee4bb" opacity=".72"><circle cx="54" cy="151" r=".8"/><circle cx="88" cy="190" r=".9"/><circle cx="103" cy="199" r=".7"/><circle cx="79" cy="88" r=".7"/><circle cx="47" cy="111" r=".8"/></g>
    `}
  </g>
</svg>`;
}

export function claspSvg(holeSpacing: number, notch: 'square' | 'round', id?: string): string {
  const key = prefix('clasp', id);
  const spacing = Number.isFinite(holeSpacing) ? Math.max(0, Math.min(56, holeSpacing)) : 28;
  const brass = spacing > 28;
  const label = `一枚${brass ? '黄铜' : '旧银'}扣件，双孔间距${spacing}，底部是${notch === 'square' ? '方形' : '圆形'}缺口。`;
  return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 100 76" role="img" aria-label="${label}" class="clasp-svg">
  <defs>
    <linearGradient id="${key}-metal" x1=".2" y1="0" x2=".7" y2="1">
      <stop stop-color="${brass ? '#edce8f' : '#dfdec1'}"/>
      <stop offset=".29" stop-color="${brass ? '#ae8950' : '#91a69c'}"/>
      <stop offset=".61" stop-color="${brass ? '#d8b571' : '#cad1b4'}"/>
      <stop offset="1" stop-color="${brass ? '#7c6345' : '#637e76'}"/>
    </linearGradient>
    <filter id="${key}-shadow" x="-25%" y="-30%" width="150%" height="180%"><feDropShadow dx="0" dy="4" stdDeviation="2.2" flood-color="#0c2529" flood-opacity=".38"/></filter>
  </defs>
  <g filter="url(#${key}-shadow)">
    <path d="${platePath(notch)}" transform="translate(0 1.8)" fill="#344c47" stroke="#304944" stroke-width="1.8"/>
    ${plate(key, spacing, notch)}
  </g>
</svg>`;
}

export function ticketSvg(piece: TicketPiece): string {
  const key = prefix('ticket', piece.id);
  const label = `${piece.title}的票背。${piece.backText}左边月光线高度${piece.leftEdge[0]}、椅背线高度${piece.leftEdge[1]}；右边分别为${piece.rightEdge[0]}、${piece.rightEdge[1]}。`;
  const ends = [
    ...piece.leftEdge.map((y, i) => ({ x: 0, y, type: i })),
    ...piece.rightEdge.map((y, i) => ({ x: 160, y, type: i })),
  ];
  return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 160 100" role="img" aria-label="${safe(label)}" class="ticket-svg">
  <defs>
    <linearGradient id="${key}-paper" x1="0" y1="0" x2="1" y2=".9"><stop stop-color="#f0e7cd"/><stop offset=".55" stop-color="#e2d4b4"/><stop offset="1" stop-color="#eee1be"/></linearGradient>
    <pattern id="${key}-fiber" width="23" height="19" patternUnits="userSpaceOnUse"><path d="M 2 6 L 6 5.6 M 14 14 L 18 15 M 18 3 L 20 2" stroke="#937c5a" stroke-width=".4" opacity=".12"/></pattern>
  </defs>
  <path d="M 0 0 H 160 V 100 H 0 Z" fill="url(#${key}-paper)"/>
  <path d="M 0 0 H 160 V 100 H 0 Z" fill="url(#${key}-fiber)"/>
  <path d="M 0 1 H 160 M 0 99 H 160" fill="none" stroke="#a98e62" stroke-opacity=".28" stroke-width="1"/>
  <path d="M 9 13 H 151" stroke="#9c8057" stroke-width=".65" stroke-dasharray="1 3" opacity=".29"/>
  <g fill="#a38550" opacity=".18"><circle cx="22" cy="24" r=".75"/><circle cx="66" cy="18" r=".6"/><circle cx="120" cy="45" r=".7"/><circle cx="139" cy="21" r=".85"/><circle cx="49" cy="43" r=".6"/><circle cx="101" cy="17" r=".6"/></g>
  <g stroke="#a38550" opacity=".19" stroke-width=".55"><path d="M 34 18 V 22 M 32 20 H 36 M 123 18 V 24 M 120 21 H 126"/></g>
  <path d="${safe(piece.detailPath)}" fill="none" stroke="#698072" stroke-width=".72" opacity=".59"/>
  <path d="${safe(piece.benchPath)}" fill="none" stroke="#4a6b61" stroke-width="1.7" stroke-linejoin="round"/>
  <path d="${safe(piece.moonPath)}" fill="none" stroke="#ae854a" stroke-width="3.4" stroke-opacity=".13"/>
  <path d="${safe(piece.moonPath)}" fill="none" stroke="#98703d" stroke-width="1.8"/>
  <path d="${safe(piece.moonPath)}" transform="translate(0 -.45)" fill="none" stroke="#f7e6b8" stroke-width=".55" opacity=".9"/>
  ${ends.map(end => `<circle cx="${end.x}" cy="${end.y}" r="2.1" fill="#eadcba" stroke="${end.type === 0 ? '#98703d' : '#4a6b61'}" stroke-width="1"/>`).join('')}
  ${piece.id === 'right' ? '<path d="M 121 52 C 112 51 107 57 109 63 C 112 70 120 70 125 65 C 119 66 116 62 117 58 C 117 55 119 53 121 52 Z" fill="#c5c4a2" stroke="#657d73" stroke-width=".7"/>' : ''}
</svg>`;
}

export function birdSvg(direction = 1): string {
  const key = prefix('bird');
  return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 100 100" role="img" aria-label="一只纸做的时光鸟，胸前有细小的钟盘花纹，正踮着脚看热闹。" class="bird-svg">
  <defs>
    <linearGradient id="${key}-feather" x1="0" y1="0" x2=".8" y2="1"><stop stop-color="#eee4c1"/><stop offset=".48" stop-color="#a7bdb0"/><stop offset="1" stop-color="#688d85"/></linearGradient>
    <linearGradient id="${key}-wing" x1="0" y1="0" x2="1" y2="1"><stop stop-color="#cad0ae"/><stop offset="1" stop-color="#547c76"/></linearGradient>
  </defs>
  <g ${direction < 0 ? 'transform="translate(100 0) scale(-1 1)"' : ''}>
    <ellipse cx="47" cy="87" rx="27" ry="4" fill="#0d2a31" opacity=".16"/>
    <path d="M 37 58 L 9 44 L 17 64 L 33 71" fill="#7a9990" stroke="#426860" stroke-width=".9"/>
    <path d="M 13 49 L 28 63 M 17 59 L 31 68" stroke="#d2d6b9" stroke-width=".7" opacity=".6"/>
    <path d="M 48 73 L 45 84 L 39 87 M 45 84 L 49 87 M 62 72 L 63 84 L 69 86 M 63 84 L 59 88" fill="none" stroke="#b9a77b" stroke-width="1.5" stroke-linecap="round"/>
    <path d="M 28 53 C 29 39 39 37 51 40 C 50 26 62 20 73 25 C 80 28 82 36 79 44 C 84 65 71 77 51 77 C 35 76 25 68 28 53 Z" fill="url(#${key}-feather)" stroke="#577d73" stroke-width="1"/>
    <path d="M 79 35 L 91 40 L 79 44 Z" fill="#caac72" stroke="#9b855f" stroke-width=".7"/>
    <path d="M 80 40 L 88 40" stroke="#715f48" stroke-width=".55"/>
    <path d="M 53 26 L 53 17 L 58 24 L 62 19 L 64 24" fill="#c7caa7" stroke="#6e8f7e" stroke-width=".8" stroke-linejoin="round"/>
    <path d="M 30 53 C 40 46 52 47 62 55 C 55 70 40 73 30 63 Z" fill="url(#${key}-wing)" stroke="#628478" stroke-width=".7"/>
    <path d="M 32 56 C 39 58 45 60 52 61 M 32 60 C 38 63 44 64 48 65 M 38 52 L 43 60" fill="none" stroke="#dbe0ba" stroke-width=".65" opacity=".65"/>
    <path d="M 58 47 C 64 45 71 48 72 55 C 73 62 68 68 61 67" fill="none" stroke="#edf0c9" stroke-width=".7" opacity=".75"/>
    <path d="M 63 50 V 56 L 68 59 M 69 51 L 68 52 M 72 57 H 70 M 68 63 L 67 62 M 63 66 V 64" fill="none" stroke="#789589" stroke-width=".75" stroke-linecap="round"/>
    <circle cx="72" cy="34" r="2.4" fill="#153940"/>
    <circle cx="72.6" cy="33.3" r=".65" fill="#fff1ca"/>
    <path d="M 57 31 C 61 27 67 26 72 29" fill="none" stroke="#f6ebc9" stroke-width=".8" opacity=".7"/>
    <circle cx="72" cy="44" r="2.8" fill="#d5b494" opacity=".45"/>
  </g>
</svg>`;
}

export const moonMark = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 32 32" role="img" aria-label="月背拾遗司的小月亮" class="moon-mark"><path d="M 22 3 C 13 0 4 6 4 15 C 4 24 12 30 20 27 C 25 26 28 22 29 18 C 24 21 18 19 15 15 C 12 10 15 5 22 3 Z" fill="currentColor"/><path d="M 23 8 L 23.8 10.2 L 26 11 L 23.8 11.8 L 23 14 L 22.2 11.8 L 20 11 L 22.2 10.2 Z" fill="currentColor" opacity=".7"/></svg>`;
