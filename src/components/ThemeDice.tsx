import { useEffect, useRef, useState, type KeyboardEvent } from 'react';
import { applyTheme, drawTheme, readThemeDeck, selectTheme, storeThemeDeck, themeIds, themeNames, type ThemeDeck, type ThemeId } from '../lib/theme';
import { transitionTheme } from '../lib/themeTransition';

const toastDuration = 2200;
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
  const toggle = useRef<HTMLButtonElement>(null);
  const menu = useRef<HTMLDivElement>(null);
  const icon = useRef<SVGSVGElement>(null);
  const [theme, setTheme] = useState<ThemeId | null>(null);
  const [toastTheme, setToastTheme] = useState<ThemeId | null>(null);
  const [moving, setMoving] = useState(false);
  const [open, setOpen] = useState(false);

  useEffect(() => {
    function restore() {
      setToastTheme(null);
      setOpen(false);
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

  function closeMenu(restoreFocus: boolean) {
    if (restoreFocus) toggle.current?.focus({ preventScroll: true });
    setOpen(false);
  }

  function openMenu() {
    if (operation.current) return;
    setToastTheme(null);
    setOpen(true);
  }

  useEffect(() => {
    const list = menu.current;
    if (!open || !list) return;
    const selected = list.querySelector<HTMLButtonElement>('[aria-checked="true"]');
    if (selected) focusOption(list, selected);
    const events = new AbortController();
    const { signal } = events;
    const startScroll = window.scrollY;

    function closeOutside(event: Event) {
      if (event.target instanceof Node && !toggle.current?.contains(event.target) && !list?.contains(event.target)) {
        closeMenu(false);
      }
    }
    function dismiss() { closeMenu(!!list?.contains(document.activeElement)); }

    document.addEventListener('pointerdown', closeOutside, { signal, capture: true });
    document.addEventListener('focusin', closeOutside, { signal });
    document.addEventListener('keydown', event => {
      if (event.key === 'Escape') { event.preventDefault(); event.stopPropagation(); closeMenu(true); }
    }, { signal, capture: true });
    window.addEventListener('scroll', () => {
      if (Math.abs(window.scrollY - startScroll) > 8) dismiss();
    }, { signal, passive: true });
    window.addEventListener('hashchange', dismiss, { signal });
    window.addEventListener('pagehide', dismiss, { signal });
    window.addEventListener('blur', dismiss, { signal });
    document.addEventListener('visibilitychange', () => { if (document.hidden) dismiss(); }, { signal });
    return () => events.abort();
  }, [open]);

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

  function roll() {
    if (!deck.current || operation.current) return;
    setOpen(false);
    void change(drawTheme(deck.current));
  }

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
        <button type="button" className="theme-dice" aria-label="무작위 테마로 변경"
          aria-describedby="current-portfolio-theme" aria-disabled={moving} onClick={roll}>
          <svg ref={icon} width="22" height="22" viewBox="0 0 24 24" fill="none" aria-hidden="true">
            <rect x="3" y="3" width="18" height="18" rx="4" stroke="currentColor" strokeWidth="1.6" />
            <g fill="currentColor">
              <circle cx="7.8" cy="7.8" r="1.4" /><circle cx="16.2" cy="7.8" r="1.4" />
              <circle cx="12" cy="12" r="1.4" />
              <circle cx="7.8" cy="16.2" r="1.4" /><circle cx="16.2" cy="16.2" r="1.4" />
            </g>
          </svg>
        </button>
        <button type="button" ref={toggle} className="theme-picker-toggle" aria-label="테마 선택"
          aria-haspopup="menu" aria-expanded={open} aria-controls={open ? 'portfolio-theme-menu' : undefined}
          aria-describedby="current-portfolio-theme" aria-disabled={moving}
          onClick={() => open ? closeMenu(true) : openMenu()}
          onKeyDown={event => {
            if (event.key === 'ArrowDown') { event.preventDefault(); openMenu(); }
          }}>
          <svg width="16" height="16" viewBox="0 0 16 16" fill="none" aria-hidden="true">
            <path d="m3 6 5 5 5-5" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round" />
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
      {toastTheme && (
        <span key={toastTheme} className="theme-toast" data-theme-toast="" data-theme={toastTheme}
          style={{ animationDuration: `${toastDuration}ms` }} aria-hidden="true">
          {themeNames[toastTheme]} 테마
        </span>
      )}
    </>
  );
}
