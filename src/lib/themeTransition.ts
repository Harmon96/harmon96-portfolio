import type { ThemeId } from './theme';
import { prepareThemeFonts } from './themeFonts';

// Animate the pieces people can actually see. These are leaf surfaces so a
// paragraph and its containing article never receive the same movement twice.
const pieces = [
  '.wordmark', '.header-actions nav', '.workspace-word', '.workspace-gesture',
  '.workspace-plates i', '.workspace-labels button', '.workspace-detail', '.workspace-direct a',
  '.workspace-loading-shape', '.spatial-stage', '.about-heading', '.about-story > p',
  '.about-more', '.exhibition-careers article', '.case-header > :not(h1)', '.case-title-line', '.case-toc',
  '.case-article section > h2', '.case-article section > p', '.flow-diagram figcaption',
  '.flow-steps li', '.flow-detail', '.case-note', '.case-sculpture', '.next-case > a',
  '.site-footer > div', '.not-found > *',
].join(',');

const readingBlocks = [
  '.case-header h1', '.case-description', '.case-meta', '.case-article h2', '.case-article p',
  '.case-note', '.case-sculpture', '.next-case',
  '.about-heading h2', '.about-story > p', '.about-more', '.exhibition-careers article', '.site-footer',
].join(',');

function readingPosition() {
  if (window.scrollY < 2) return;
  const header = document.querySelector('header');
  const line = (header?.getBoundingClientRect().bottom ?? 0) + 16;
  const step = document.querySelector<HTMLElement>('.flow-steps button[aria-pressed="true"]');
  if (step) {
    const { top, bottom } = step.getBoundingClientRect();
    if (bottom > line && top < window.innerHeight) return { element: step, top };
  }
  let closest: { element: HTMLElement; top: number; distance: number } | undefined;
  for (const element of document.querySelectorAll<HTMLElement>(readingBlocks)) {
    const { top, bottom } = element.getBoundingClientRect();
    if (bottom <= line || top >= window.innerHeight) continue;
    const distance = Math.max(0, top - line);
    if (!closest || distance < closest.distance) closest = { element, top, distance };
  }
  return closest;
}

type Piece = { element: HTMLElement; rect: DOMRect; opacity: string };
function visiblePieces(): Piece[] {
  const visible: Piece[] = [];
  for (const element of document.querySelectorAll<HTMLElement>(pieces)) {
    const rect = element.getBoundingClientRect();
    if (!rect.width || !rect.height || rect.bottom <= 0 || rect.top >= innerHeight ||
      rect.right <= 0 || rect.left >= innerWidth) continue;
    const style = getComputedStyle(element);
    if (style.visibility !== 'visible' || Number(style.opacity) < .06) continue;
    visible.push({ element, rect, opacity: style.opacity });
  }
  return visible;
}

function outward(rect: DOMRect, compact: boolean) {
  const edges = [-rect.right, innerWidth - rect.left, -rect.bottom, innerHeight - rect.top];
  const edge = edges.reduce((best, n, i) => Math.abs(n) < Math.abs(edges[best]) ? i : best, 0);
  const distance = edges[edge] * (compact ? .45 : 1);
  return edge < 2 ? `${distance}px 0` : `0 ${distance}px`;
}

// The visible canvas and its WebGL pieces complete the same entrance before the dice unlocks.
export const sceneEntranceDuration = {
  spatial: 660, glass: 525, clay: 680, minimal: 155, type: 470,
  blueprint: 645, retro: 438, collage: 615, cinema: 570, organic: 705,
} satisfies Record<ThemeId, number>;

type Entrance = { frames: Keyframe[]; duration: number; delay: number; easing: string };

function entrance(theme: ThemeId, piece: Piece, row: number, compact: boolean): Entrance {
  const { element, rect, opacity } = piece;
  const stage = element.matches('canvas,.case-sculpture');
  const plate = element.matches('.workspace-plates i');
  const label = element.matches('.workspace-labels button,.workspace-gesture');
  const chrome = element.matches('.wordmark,.header-actions nav');
  const title = element.matches('.workspace-word,.case-title-line,.about-heading,.not-found h1');
  const strength = Number(opacity);
  const end = { opacity: strength, translate: '0 0', rotate: '0deg', scale: '1' };
  const eased = 'cubic-bezier(.16,.75,.25,1)';
  const order = element.matches('.workspace-direct a,.workspace-plates i,.case-title-line,.flow-steps li') && element.parentElement
    ? Array.from(element.parentElement.children).indexOf(element)
    : row;
  const slot = Math.min(order, compact ? 4 : 6);

  // Give Three.js the full stage from the first frame. Its individual pieces carry the choreography.
  if (stage) {
    const ready = element.dataset.ready === 'true' || element.dataset.sceneState === 'ready';
    const duration = ready ? sceneEntranceDuration[theme] : 145;
    if (theme === 'cinema') {
      // Two shutter blades open from the center; neither blade emits a bright frame.
      return {
        frames: [{ clipPath: 'inset(49% 0)' }, { clipPath: 'inset(8% 0)', offset: .54 }, { clipPath: 'inset(0% 0)' }],
        duration, delay: 0, easing: 'cubic-bezier(.32,.02,.19,1)',
      };
    }
    return {
      frames: [{ opacity: 0 }, { opacity: strength, offset: 80 / duration }, { opacity: strength }],
      duration, delay: 0, easing: 'linear',
    };
  }
  if (chrome) return { frames: [{ opacity: strength * .7 }, { opacity: strength }], duration: 140, delay: 0, easing: 'ease-out' };

  switch (theme) {
    case 'spatial': {
      const side = rect.left + rect.width / 2 < innerWidth / 2 ? -1 : 1;
      const depth = (row % 2 === 0) ? .52 : 1.38;
      const distance = compact ? 38 : 102;
      return {
        frames: [
          { translate: `${side * distance}px ${row % 2 ? -distance * .48 : distance * .65}px`, scale: String(depth), rotate: `${side * 8}deg`, opacity: 0 },
          { ...end, offset: .82, scale: '1.018' }, end,
        ],
        duration: 470, delay: (label ? 150 : title ? 0 : 64) + slot * 24, easing: eased,
      };
    }
    case 'glass': {
      // Stack the panes back-to-front along the same diagonal, then set their captions in place.
      const distance = plate ? (compact ? 74 : 150) : title ? 44 : 22;
      return {
        frames: [
          { translate: `${distance}px -${distance * .58}px`, rotate: plate ? '-7deg' : '0deg', opacity: 0 },
          { translate: `${distance * .16}px -${distance * .1}px`, rotate: plate ? '-2deg' : '0deg', opacity: strength * .85, offset: .6 },
          end,
        ],
        duration: plate ? 475 : 330, delay: (plate ? 0 : label ? 190 : 90) + slot * 32, easing: 'cubic-bezier(.25,.56,.28,1)',
      };
    }
    case 'clay': {
      const drop = plate ? (compact ? 68 : 115) : title ? 36 : 19;
      const impact = plate || title;
      return {
        frames: [
          { translate: `0 -${drop}px`, scale: impact ? '.96 1.08' : '1', opacity: 0, easing: 'ease-in' },
          { translate: '0 0', scale: '1', opacity: strength, offset: .48, easing: 'ease-out' },
          { translate: '0 3px', scale: impact ? '1.10 .82' : '1.018 .96', transformOrigin: 'center bottom', offset: .57, easing: 'ease-out' },
          { translate: impact ? '0 -10px' : '0 -2px', scale: impact ? '.98 1.035' : '1', offset: .75, easing: 'ease-in' },
          { ...end, offset: .90 }, end,
        ],
        duration: impact ? 570 : 390, delay: (label ? 145 : 0) + slot * 29, easing: 'linear',
      };
    }
    case 'minimal':
      return {
        frames: [{ opacity: strength * .58 }, { opacity: strength }],
        duration: 155, delay: slot * 6, easing: 'ease-out',
      };
    case 'type':
      // Reveal each line in its final coordinates; the discrete edge suggests an ink impression.
      return {
        frames: [
          { clipPath: 'inset(0 100% 0 0)', opacity: strength },
          { clipPath: 'inset(0 0% 0 0)', opacity: strength },
        ],
        duration: title ? 295 : 205, delay: slot * (compact ? 39 : 52),
        easing: title ? 'steps(18, end)' : 'steps(12, end)',
      };
    case 'blueprint':
      // Open a narrow drafting line first, then expose the elevation above it.
      return {
        frames: [
          { clipPath: 'inset(96% 100% 0 0)' },
          { clipPath: 'inset(96% 0% 0 0)', offset: .4 },
          { clipPath: 'inset(0% 0% 0 0)' },
        ],
        duration: title ? 465 : 335, delay: (label ? 155 : 0) + slot * 31, easing: 'linear',
      };
    case 'retro':
      return {
        frames: [
          { clipPath: 'inset(0 95% 91% 0)' },
          { clipPath: 'inset(0 0% 91% 0)', offset: .37 },
          { clipPath: 'inset(0 0% 0% 0)' },
        ],
        duration: title ? 335 : 240, delay: slot * 24, easing: 'steps(6, end)',
      };
    case 'collage': {
      const side = order % 2 ? -1 : 1;
      const reach = plate ? (compact ? 59 : 96) : title ? 42 : 20;
      return {
        frames: [
          { translate: `${side * reach}px -${reach * .8}px`, rotate: `${side * (plate ? 17 : 7)}deg`, scale: '1.08', opacity: 0 },
          { translate: `${side * 4}px 0`, rotate: `${-side * 1.6}deg`, scale: '1', opacity: strength, offset: .73 }, end,
        ],
        duration: plate ? 490 : 360, delay: (label ? 125 : 0) + slot * 31, easing: eased,
      };
    }
    case 'cinema':
      return {
        frames: [{ clipPath: 'inset(45% 0 55%)' }, { clipPath: 'inset(0% 0 0%)' }],
        duration: title ? 330 : 215, delay: (title ? 12 : 95) + slot * 42, easing: 'cubic-bezier(.58,0,.28,1)',
      };
    case 'organic': {
      const origin = rect.left + rect.width / 2 < innerWidth / 2 ? '30% 65%' : '70% 65%';
      return {
        frames: [
          { clipPath: `circle(0% at ${origin})`, translate: '0 7px' },
          { clipPath: `circle(85% at ${origin})`, translate: '0 -1px', offset: .73 },
          { clipPath: `circle(148% at ${origin})`, translate: '0 0' },
        ],
        duration: title ? 560 : 475, delay: slot * 28, easing: 'cubic-bezier(.25,.48,.25,1)',
      };
    }
  }
}

export async function transitionTheme(
  theme: ThemeId, dice: SVGSVGElement | null, commit: (animate: boolean) => void, signal: AbortSignal,
) {
  await prepareThemeFonts(theme);
  if (signal.aborted) return;
  const root = document.documentElement;
  const reduced = window.matchMedia('(prefers-reduced-motion: reduce)');
  const compact = window.matchMedia('(max-width: 767px)').matches;
  const active = new Set<Animation>();
  const finish = () => { for (const animation of active) animation.finish(); };
  const onPreference = () => { if (reduced.matches) finish(); };
  const onVisibility = () => { if (document.hidden) finish(); };
  const canMove = () => !signal.aborted && !document.hidden && !reduced.matches && typeof root.animate === 'function';
  const change = (animate: boolean) => {
    const anchor = readingPosition();
    commit(animate);
    if (anchor) {
      const shift = anchor.element.getBoundingClientRect().top - anchor.top;
      if (Math.abs(shift) > 1) window.scrollBy({ top: shift, behavior: 'instant' });
    }
  };
  if (!canMove()) { if (!signal.aborted) change(false); return; }

  function play(el: Element, frames: Keyframe[], duration: number, delay = 0, easing = 'cubic-bezier(.19,.78,.23,1)') {
    const animation = el.animate(frames, { duration, delay, easing, fill: 'both' });
    active.add(animation);
    return animation;
  }
  async function complete(animations: Animation[]) {
    await Promise.allSettled(animations.map(animation => animation.finished));
    for (const animation of animations) { animation.cancel(); active.delete(animation); }
  }
  let committed = false;
  signal.addEventListener('abort', finish, { once: true });
  reduced.addEventListener('change', onPreference);
  document.addEventListener('visibilitychange', onVisibility);
  try {
    root.dataset.themeTransitioning = 'exit';
    const brief = theme === 'minimal';
    const exitDuration = brief ? 105 : 175;
    window.dispatchEvent(new CustomEvent('portfolio:themeexit', { detail: { duration: exitDuration, signal } }));
    if (dice) play(dice, [
      { transform: 'rotate(0) scale(1)' }, { transform: 'rotate(115deg) scale(.83)', offset: .4 },
      { transform: 'rotate(180deg) scale(1)' },
    ], brief ? 340 : 470);
    const departing = visiblePieces().map(({ element, rect, opacity }) => {
      const stage = element.matches('canvas,.case-sculpture');
      return play(element, [
        { opacity }, { opacity: 0, translate: stage ? '0 0' : outward(rect, compact), scale: stage ? '.94' : '.98' },
      ], exitDuration, 0, 'cubic-bezier(.58,.02,.91,.54)');
    });
    await complete(departing);
    if (signal.aborted) return;
    root.dataset.themeTransitioning = 'enter';
    change(canMove());
    committed = true;
    if (!canMove()) return;
    const incoming = visiblePieces().sort((a, b) => a.rect.top - b.rect.top || a.rect.left - b.rect.left);
    let row = -1;
    let rowTop = -Infinity;
    const arriving = incoming.map(piece => {
      if (piece.rect.top - rowTop > 14) { row++; rowTop = piece.rect.top; }
      const { frames, duration, delay, easing } = entrance(theme, piece, row, compact);
      return play(piece.element, frames, duration, delay, easing);
    });
    await complete(arriving);
  } catch (error) {
    // A browser can support WAAPI but reject a particular transform keyframe.
    if (!(error instanceof TypeError || error instanceof DOMException)) throw error;
  } finally {
    for (const animation of active) animation.cancel();
    delete root.dataset.themeTransitioning;
    signal.removeEventListener('abort', finish);
    reduced.removeEventListener('change', onPreference);
    document.removeEventListener('visibilitychange', onVisibility);
    // Even a browser that rejects an individual keyframe can switch themes.
    if (!committed && !signal.aborted) change(false);
  }
}
