import { useCallback, useEffect, useRef, useState, type MouseEvent } from 'react';
import { useReducedMotion } from '../hooks/useReducedMotion';

const seenKey = 'harmon96-portfolio:intro-seen:v1';
type Drop = { x: number; y: number };

function LakeReflections() {
  const canvas = useRef<HTMLCanvasElement>(null);
  useEffect(() => {
    const surface = canvas.current;
    const context = surface?.getContext('2d');
    if (!surface || !context) return;

    // Paint a field of curved reflections once per resize. The surface is still between drops.
    function draw() {
      if (!surface || !context) return;
      const { width, height } = surface.getBoundingClientRect();
      if (!width || !height) return;
      surface.width = Math.ceil(width);
      surface.height = Math.ceil(height);
      let seed = 1408;
      const random = () => ((seed = (seed * 1664525 + 1013904223) >>> 0) / 4294967296);
      for (let i = 0; i < 1350; i++) {
        const y = random();
        const x = random() * 1.16 - .08;
        const wave = Math.sin(y * 16 + Math.cos(x * 8)) + .45 * Math.sin(x * 13 + y * 31);
        const start = x * width;
        const level = (y + wave * .027) * height;
        const span = (8 + random() ** 2 * 95) * (.42 + y);
        const bend = span * (random() - .5) * .16;
        const drift = Math.cos(y * 11 + x * 2) * span * .18;
        const light = Math.max(0, 1 - Math.abs(x - (.64 - y * .32)) * 2.7);
        const opacity = .035 + random() ** 2 * (.13 + light * .31);
        context.fillStyle = wave > -.45 ? `rgba(255,255,237,${opacity})` : `rgba(48,99,110,${opacity * .51})`;
        context.beginPath();
        context.moveTo(start, level);
        context.quadraticCurveTo(start + span * .55, level + bend, start + span, level + drift);
        context.quadraticCurveTo(start + span * .42, level + bend + (.4 + random() * 2.1) * (.6 + y), start, level);
        context.fill();
      }
    }
    draw();
    const observer = new ResizeObserver(draw);
    observer.observe(surface);
    return () => observer.disconnect();
  }, []);
  return <canvas className="water-reflections" ref={canvas} aria-hidden="true" />;
}

export function WaterIntro() {
  const dialog = useRef<HTMLDialogElement>(null);
  const [available, setAvailable] = useState(false);
  const [open, setOpen] = useState(false);
  const [drops, setDrops] = useState<Drop[]>([]);
  const reducedMotion = useReducedMotion();

  useEffect(() => {
    if (typeof HTMLDialogElement === 'undefined' || typeof HTMLDialogElement.prototype.showModal !== 'function') return;
    setAvailable(true);
    try {
      if (!location.hash && !localStorage.getItem(seenKey)) setOpen(true);
    } catch {
      // Storage may be disabled. The replay control still works.
    }
  }, []);

  useEffect(() => {
    const node = dialog.current;
    if (!open || !node) return;
    node.showModal();
    return () => node.close();
  }, [open]);

  const enter = useCallback(() => {
    dialog.current?.close();
    setOpen(false);
    setDrops([]);
    try {
      localStorage.setItem(seenKey, '1');
    } catch {
      // Entering the gallery does not depend on storage.
    }
    document.getElementById('main')?.focus({ preventScroll: true });
    window.scrollTo({ top: 0, behavior: 'instant' });
  }, []);

  useEffect(() => {
    if (drops.length !== 3) return;
    const timer = window.setTimeout(enter, reducedMotion ? 0 : 1050);
    return () => window.clearTimeout(timer);
  }, [drops.length, reducedMotion, enter]);

  function ripple(event: MouseEvent<HTMLButtonElement>) {
    const bounds = event.currentTarget.getBoundingClientRect();
    const drop = event.detail === 0
      ? { x: 50, y: 62 }
      : { x: (event.clientX - bounds.left) / bounds.width * 100, y: (event.clientY - bounds.top) / bounds.height * 100 };
    setDrops((previous) => previous.length === 3 ? previous : [...previous, drop]);
  }

  if (!available) return null;
  return (
    <>
      <button className="water-replay" type="button" onClick={() => setOpen(true)}>인트로 다시 보기</button>
      {open && (
        <dialog className="water-intro" ref={dialog} data-lenis-prevent data-entering={drops.length === 3}
          aria-labelledby="water-title" onCancel={(event) => { event.preventDefault(); enter(); }}>
          <LakeReflections />
          <button className="water-surface" type="button" aria-label="물방울 떨어뜨리기" aria-describedby="water-progress" onClick={ripple}>
            {drops.map((drop, index) => <span key={index} className="water-ring" style={{ left: drop.x + '%', top: drop.y + '%' }} />)}
          </button>
          <span className="water-signature" aria-hidden="true">임재혁 <span>Portfolio</span></span>
          <button className="water-skip" type="button" onClick={enter}>건너뛰기 <span aria-hidden="true">↗</span></button>
          <div className="water-prompt">
            <h2 id="water-title">물방울을 떨어뜨려 주세요</h2>
            <p lang="en">Touch the water three times to enter.</p>
            <div className="water-count" aria-hidden="true">
              {[1, 2, 3].map((n) => <i key={n} data-filled={drops.length >= n} />)}
            </div>
          </div>
          <p id="water-progress" className="sr-only" aria-live="polite">물방울 세 개 중 {drops.length}개</p>
        </dialog>
      )}
    </>
  );
}
