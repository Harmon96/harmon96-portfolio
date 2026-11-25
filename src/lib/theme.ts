export const themeNames = {
  spatial: '3D',
  glass: '글래스모피즘',
  clay: '클레이모피즘',
  minimal: '미니멀리즘',
  type: '타이포그래픽',
  blueprint: '블루프린트',
  retro: '레트로 데스크톱',
  collage: '종이 콜라주',
  cinema: '시네마틱',
  organic: '오가닉',
} as const;

export type ThemeId = keyof typeof themeNames;
export type ThemeDeck = { theme: ThemeId; remaining: ThemeId[] };
// Append new themes after the existing IDs so saved decks can draw the additions.
export const themeIds = Object.keys(themeNames) as ThemeId[];
export const themeStorageKey = 'harmon96-portfolio:theme:v1';
const originalThemeCount = 5;

export function isThemeId(value: unknown): value is ThemeId {
  return typeof value === 'string' && Object.hasOwn(themeNames, value);
}

export function readThemeDeck(): ThemeDeck {
  const applied = document.documentElement.dataset.theme;
  const theme = isThemeId(applied) ? applied : 'spatial';
  try {
    const saved = JSON.parse(localStorage.getItem(themeStorageKey) ?? 'null');
    if (isThemeId(saved?.theme)) {
      const { remaining } = saved;
      if (Array.isArray(remaining) && remaining.every(isThemeId)
        && !remaining.includes(saved.theme) && new Set(remaining).size === remaining.length) {
        const deck = { theme: saved.theme, remaining };
        if (saved.themeCount === themeIds.length) return deck;
        const originalIds = themeIds.slice(0, originalThemeCount);
        const isOriginalDeck = originalIds.includes(saved.theme) && remaining.every(id => originalIds.includes(id));
        const unversionedCount = isOriginalDeck ? originalThemeCount : themeIds.length;
        const count = Number.isInteger(saved.themeCount) && saved.themeCount > 0
          ? saved.themeCount : unversionedCount;
        const additions = themeIds.slice(count).filter(id => id !== saved.theme && !remaining.includes(id));
        const migrated = { theme: saved.theme, remaining: [...remaining, ...additions] };
        storeThemeDeck(migrated);
        return migrated;
      }
      return { theme: saved.theme, remaining: themeIds.filter(id => id !== saved.theme) };
    }
  } catch { /* Storage is optional. */ }
  return { theme, remaining: themeIds.filter(id => id !== theme) };
}

export function selectTheme(deck: ThemeDeck, theme: ThemeId): ThemeDeck {
  if (theme === deck.theme) return deck;
  const pool = deck.remaining.length ? deck.remaining : themeIds;
  return { theme, remaining: pool.filter(id => id !== theme) };
}

export function drawTheme(deck: ThemeDeck): ThemeDeck {
  const pool = deck.remaining.length ? deck.remaining : themeIds.filter(id => id !== deck.theme);
  return selectTheme(deck, pool[Math.floor(Math.random() * pool.length)]);
}

export function storeThemeDeck(deck: ThemeDeck) {
  try { localStorage.setItem(themeStorageKey, JSON.stringify({ ...deck, themeCount: themeIds.length })); } catch { /* Continue in memory. */ }
}

export function applyTheme(theme: ThemeId, animate: boolean) {
  document.documentElement.dataset.theme = theme;
  window.dispatchEvent(new CustomEvent('portfolio:themechange', { detail: { theme, animate } }));
}
