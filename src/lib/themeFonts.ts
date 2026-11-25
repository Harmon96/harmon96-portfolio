import type { ThemeId } from './theme';

// Measure the new layout with its own fonts, including on the first visit to an edition.
export async function prepareThemeFonts(theme: ThemeId) {
  if (!document.fonts) return;
  const probe = document.createElement('span');
  probe.className = 'theme-font-probe';
  probe.dataset.theme = theme;
  probe.hidden = true;
  document.body.append(probe);
  const style = getComputedStyle(probe);
  const roles = new Set(['--body-face', '--display-face', '--reading-face', '--mono'].map(role => style.getPropertyValue(role).trim()));
  probe.remove();
  const fonts = [...roles].map(face => document.fonts.load(`400 16px ${face}`, '임재혁 WORK'));
  // Keep the dice usable if a font request stalls. CSS can still finish loading later.
  let timer = 0;
  const deadline = new Promise<void>(resolve => { timer = window.setTimeout(resolve, 650); });
  try { await Promise.race([Promise.allSettled(fonts), deadline]); }
  finally { window.clearTimeout(timer); }
}
