import { ticketInitialOrder, type TicketPiece } from './story';

export interface NightState {
  version: 1;
  chapter: number;
  phase: 'intro' | 'explore' | 'outro' | 'birds' | 'finished';
  line: number;
  completed: number[];
  tickets: TicketPiece['id'][];
  flipped: boolean;
  echo: number;
  placed: boolean;
  lamps: number;
  sound: boolean;
  musicVolume: number;
}

export const SAVE_KEY = 'oncewhere.moon-office.night.v1';
export const freshNight = (): NightState => ({ version: 1, chapter: 0, phase: 'intro', line: 0, completed: [], tickets: [...ticketInitialOrder], flipped: false, echo: 0, placed: false, lamps: 0, sound: true, musicVolume: 0.6 });

export function readNight(): NightState | null {
  try {
    const text = localStorage.getItem(SAVE_KEY);
    if (!text) return null;
    const data = JSON.parse(text) as Partial<NightState>;
    if (data.version !== 1 || !Number.isInteger(data.chapter) || data.chapter! < 0 || data.chapter! > 4) return null;
    if (!['intro', 'explore', 'outro', 'birds', 'finished'].includes(data.phase ?? '')) return null;
    if (!Array.isArray(data.tickets) || [...data.tickets].sort().join() !== 'left,middle,right') return null;
    const state = { ...freshNight(), ...data } as NightState;
    state.line = Number.isInteger(state.line) ? Math.max(0, Math.min(state.line, 10)) : 0;
    state.completed = Array.isArray(data.completed) ? [...new Set(data.completed.filter(n => Number.isInteger(n) && n >= 0 && n <= 4))] : [];
    state.echo = Number.isInteger(state.echo) ? Math.max(0, Math.min(2, state.echo)) : 0;
    state.lamps = Number.isInteger(state.lamps) ? Math.max(0, Math.min(3, state.lamps)) : 0;
    state.sound = state.sound !== false;
    state.musicVolume = Number.isFinite(state.musicVolume) ? Math.max(0, Math.min(0.8, state.musicVolume)) : 0.6;
    state.flipped = state.flipped === true;
    state.placed = state.placed === true;
    return state;
  } catch { return null; }
}

export function writeNight(state: NightState): boolean {
  try { localStorage.setItem(SAVE_KEY, JSON.stringify(state)); return true; }
  catch { return false; }
}
