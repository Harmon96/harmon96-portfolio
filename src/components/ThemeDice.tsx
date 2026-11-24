import { useEffect, useEffectEvent, useRef, useState, type KeyboardEvent } from 'react';
import { applyTheme, drawTheme, readThemeDeck, selectTheme, storeThemeDeck, themeIds, themeNames, type ThemeDeck, type ThemeId } from '../lib/theme';
import { transitionTheme } from '../lib/themeTransition';

const toastDuration = 2200;
const clickInterval = 300;
const holdDuration = 500;
const hoverDuration = 2000;
const instructions = '마우스를 2초간 올려 두거나 세 번 빠르게 누르면 테마 목록이 열립니다. 터치 화면에서는 길게 누르고, 키보드에서는 아래 방향키를 누르세요.';

type MenuOpener = 'hover' | 'activation';

function focusOption(menu: HTMLElement, item: HTMLButtonElement) {
  item.focus({ preventScroll: true });
  const bounds = menu.getBoundingClientRect();
  const option = item.getBoundingClientRect();
  if (option.bottom > bounds.bottom) menu.scrollTop += option.bottom - bounds.bottom;
  if (option.top < bounds.top) menu.scrollTop -= bounds.top - option.top;
}

export function ThemeDice() {
  const deck = useRef<ThemeDeck | null>(null);
  const operation = useRef<AbortController | null>(null);
  const trigger = useRef<HTMLButtonElement>(null);
  const menu = useRef<HTMLDivElement>(null);
  const icon = useRef<SVGSVGElement>(null);
  const [theme, setTheme] = useState<ThemeId | null>(null);
  const [toastTheme, setToastTheme] = useState<ThemeId | null>(null);
  const [moving, setMoving] = useState(false);
  const [openedBy, setOpenedBy] = useState<MenuOpener | null>(null);
  const open = openedBy !== null;
  const ready = theme !== null;

  useEffect(() => {
    function restore() {
      setToastTheme(null);
      setOpenedBy(null);
      deck.current = readThemeDeck();
      if (document.documentElement.dataset.theme !== deck.current.theme) applyTheme(deck.current.theme, false);
      setTheme(deck.current.theme);
    }
    function onPageShow(event: PageTransitionEvent) {
      if (event.persisted) { restore(); setMoving(false); }
    }
    function stop() { operation.current?.abort(); }
    restore();
    window.addEventListener('pageshow', onPageShow);
    window.addEventListener('pagehide', stop);
    return () => {
      stop();
      window.removeEventListener('pageshow', onPageShow);
      window.removeEventListener('pagehide', stop);
    };
  }, []);

  useEffect(() => {
    if (!toastTheme) return;
    const timer = window.setTimeout(() => setToastTheme(null), toastDuration);
    return () => window.clearTimeout(timer);
  }, [toastTheme]);

  useEffect(() => {
    const selected = menu.current?.querySelector<HTMLButtonElement>('[aria-checked="true"]');
    if (openedBy === 'activation' && menu.current && selected) focusOption(menu.current, selected);
  }, [openedBy]);

  function closeMenu(restoreFocus: boolean) {
    if (restoreFocus) trigger.current?.focus({ preventScroll: true });
    setOpenedBy(null);
  }

  async function change(next: ThemeDeck) {
    if (operation.current || deck.current?.theme === next.theme) return;
    const controller = new AbortController();
    operation.current = controller;
    setMoving(true);
    try {
      await transitionTheme(next.theme, icon.current, animate => {
        deck.current = next;
        storeThemeDeck(next);
        applyTheme(next.theme, animate);
        setTheme(next.theme);
        setToastTheme(next.theme);
      }, controller.signal);
    } finally {
      operation.current = null;
      if (!controller.signal.aborted) setMoving(false);
    }
  }

  const roll = useEffectEvent(() => {
    if (deck.current && !operation.current) void change(drawTheme(deck.current));
  });
  const showMenu = useEffectEvent((opener: MenuOpener) => {
    if (!operation.current) { setToastTheme(null); setOpenedBy(opener); }
  });

  useEffect(() => {
    const button = trigger.current;
    if (!ready || !button) return;
    const events = new AbortController();
    const { signal } = events;
    let clicks = 0;
    let pending = 0;
    let hold = 0;
    let hover = 0;
    let press: { id: number; x: number; y: number } | undefined;
    let startScroll = 0;
    let skipClick = false;

    const cancelHover = () => {
      clearTimeout(hover);
      delete button.dataset.hoverPending;
    };
    function cancel() {
      clearTimeout(pending);
      clearTimeout(hold);
      cancelHover();
      clicks = 0;
      press = undefined;
    }
    function dismiss() {
      skipClick = true;
      cancel();
      if (menu.current) closeMenu(menu.current.contains(document.activeElement));
    }
    function openPicker() {
      cancel();
      skipClick = true;
      showMenu('activation');
    }

    button.addEventListener('pointerenter', event => {
      if (event.pointerType !== 'mouse' || event.buttons || document.hidden || operation.current || menu.current) return;
      startScroll = window.scrollY;
      cancelHover();
      button.dataset.hoverPending = '';
      hover = window.setTimeout(() => {
        cancelHover();
        showMenu('hover');
      }, hoverDuration);
    }, { signal });
    button.addEventListener('pointerleave', cancelHover, { signal });
    button.addEventListener('pointerdown', event => {
      cancelHover();
      if (!event.isPrimary || event.button !== 0 || operation.current) return;
      clearTimeout(pending);
      clearTimeout(hold);
      skipClick = false;
      startScroll = window.scrollY;
      press = { id: event.pointerId, x: event.clientX, y: event.clientY };
      if (event.pointerType === 'touch' || event.pointerType === 'pen') hold = window.setTimeout(openPicker, holdDuration);
    }, { signal });
    window.addEventListener('pointermove', event => {
      if (press?.id === event.pointerId && Math.hypot(event.clientX - press.x, event.clientY - press.y) > 10) {
        skipClick = true;
        cancel();
      }
    }, { signal, passive: true });
    window.addEventListener('pointerup', event => {
      if (press?.id !== event.pointerId) return;
      clearTimeout(hold);
      press = undefined;
      if (event.target instanceof Node && !button.contains(event.target)) { skipClick = true; cancel(); }
    }, { signal });
    button.addEventListener('pointercancel', dismiss, { signal });
    // Touch browsers synthesize a mouse event on release, after the hold has already focused the menu.
    button.addEventListener('mousedown', event => {
      if (skipClick && menu.current) event.preventDefault();
    }, { signal });
    button.addEventListener('contextmenu', event => { event.preventDefault(); openPicker(); }, { signal });
    button.addEventListener('keydown', event => {
      if (event.key === 'ArrowDown' || event.key === 'ContextMenu' || (event.shiftKey && event.key === 'F10')) {
        event.preventDefault();
        openPicker();
      }
    }, { signal });
    button.addEventListener('click', event => {
      if (operation.current) return;
      if (event.detail === 0) { cancel(); closeMenu(false); roll(); return; }
      if (skipClick) return;
      if (menu.current) { cancel(); closeMenu(true); return; }
      clearTimeout(pending);
      if (++clicks === 3) { openPicker(); return; }
      pending = window.setTimeout(() => { cancel(); roll(); }, clickInterval);
    }, { signal });

    const closeOutside = (event: Event) => {
      if (!(event.target instanceof Node) || button.contains(event.target) || menu.current?.contains(event.target)) return;
      cancel();
      if (menu.current) closeMenu(false);
    };
    document.addEventListener('pointerdown', closeOutside, { signal, capture: true });
    document.addEventListener('focusin', closeOutside, { signal });
    document.addEventListener('keydown', event => {
      cancelHover();
      if (event.key === 'Escape') {
        cancel();
        if (menu.current) { event.stopPropagation(); closeMenu(menu.current.contains(document.activeElement)); }
      }
    }, { signal, capture: true });
    window.addEventListener('scroll', () => {
      if (Math.abs(window.scrollY - startScroll) > 8) dismiss();
    }, { signal, passive: true });
    window.addEventListener('hashchange', dismiss, { signal });
    window.addEventListener('pagehide', dismiss, { signal });
    window.addEventListener('blur', dismiss, { signal });
    document.addEventListener('visibilitychange', () => { if (document.hidden) dismiss(); }, { signal });
    return () => { cancel(); events.abort(); };
  }, [ready]);

  function navigateOptions(event: KeyboardEvent<HTMLDivElement>) {
    const list = event.currentTarget;
    const items = Array.from(list.querySelectorAll<HTMLButtonElement>('button'));
    const current = items.indexOf(document.activeElement as HTMLButtonElement);
    let next: number;
    switch (event.key) {
      case 'ArrowDown': next = (current + 1) % items.length; break;
      case 'ArrowUp': next = (current + items.length - 1) % items.length; break;
      case 'Home': next = 0; break;
      case 'End': next = items.length - 1; break;
      case 'Tab': closeMenu(true); return;
      default: return;
    }
    event.preventDefault();
    focusOption(list, items[next]);
  }

  if (!theme) return null;
  const currentTheme = `현재 ${themeNames[theme]} 테마`;
  return (
    <>
      <div className="theme-picker">
        <button type="button" ref={trigger} className="theme-dice" aria-label="무작위 테마로 변경"
          aria-haspopup="menu" aria-expanded={open} aria-controls={open ? 'portfolio-theme-menu' : undefined}
          aria-describedby="current-portfolio-theme portfolio-theme-help" aria-disabled={moving}>
          <svg ref={icon} width="22" height="22" viewBox="0 0 24 24" fill="none" aria-hidden="true">
            <rect className="theme-dice-outline" x="3" y="3" width="18" height="18" rx="4" stroke="currentColor" strokeWidth="1.6" />
            <rect className="theme-dice-progress" x="3" y="3" width="18" height="18" rx="4" pathLength="100"
              stroke="currentColor" strokeWidth="2.6" strokeDasharray="100" strokeDashoffset="100" aria-hidden="true"
              style={{ animationDuration: `${hoverDuration}ms` }} />
            <g fill="currentColor">
              <circle cx="7.8" cy="7.8" r="1.4" /><circle cx="16.2" cy="7.8" r="1.4" />
              <circle cx="12" cy="12" r="1.4" />
              <circle cx="7.8" cy="16.2" r="1.4" /><circle cx="16.2" cy="16.2" r="1.4" />
            </g>
          </svg>
        </button>
        {open && (
          <div id="portfolio-theme-menu" ref={menu} className="theme-picker-menu" role="menu" aria-label="테마 선택"
            data-lenis-prevent="" onKeyDown={navigateOptions}>
            {themeIds.map(id => (
              <button type="button" key={id} role="menuitemradio" aria-checked={theme === id} tabIndex={-1}
                onClick={() => { closeMenu(true); if (deck.current) void change(selectTheme(deck.current, id)); }}>
                <span className="theme-swatch" data-swatch={id} aria-hidden="true" />
                <span>{themeNames[id]}</span>
                {theme === id && <span aria-hidden="true">✓</span>}
              </button>
            ))}
          </div>
        )}
      </div>
      <span id="current-portfolio-theme" className="sr-only" role="status">{currentTheme}</span>
      <span id="portfolio-theme-help" className="sr-only">{instructions}</span>
      {toastTheme && (
        <span key={toastTheme} className="theme-toast" data-theme-toast="" data-theme={toastTheme}
          style={{ animationDuration: `${toastDuration}ms` }} aria-hidden="true">
          {themeNames[toastTheme]} 테마
        </span>
      )}
    </>
  );
}
