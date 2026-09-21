declare global {
  interface Window { __MOON_ASSETS__?: Record<string, string> }
}

/** The collected edition embeds its assets; the web edition uses local files. */
export const asset = (path: string): string => window.__MOON_ASSETS__?.[path] ?? `${import.meta.env.BASE_URL}${path}`;
