import { useEffect, useRef, useState, useSyncExternalStore, type PointerEvent } from 'react';
import { cubeFaces, experiments } from '../content/experiments';
import { useReducedMotion } from '../hooks/useReducedMotion';

const subscribeToHydration = () => () => {};
const initialRotation = { x: -22, y: -28 };
type Rotation = typeof initialRotation;
type Gesture = { id: number; x: number; y: number; rotation: Rotation; moved: boolean };

function frontFace({ x, y }: Rotation) {
  const rx = (x * Math.PI) / 180;
  const ry = (y * Math.PI) / 180;
  const visibility = [
    Math.cos(rx) * Math.cos(ry),
    -Math.cos(rx) * Math.sin(ry),
    -Math.cos(rx) * Math.cos(ry),
    Math.cos(rx) * Math.sin(ry),
    -Math.sin(rx),
    Math.sin(rx),
  ];
  return cubeFaces[visibility.indexOf(Math.max(...visibility))]!.text;
}

function TypeCube({ ready }: { ready: boolean }) {
  const reduced = useReducedMotion();
  const [rotation, setRotation] = useState(initialRotation);
  const cube = useRef<HTMLDivElement>(null);
  const gesture = useRef<Gesture | null>(null);
  const frame = useRef(0);
  const pending = useRef(initialRotation);

  const paint = (next: Rotation) => {
    cube.current?.style.setProperty('--cube-x', `${next.x}deg`);
    cube.current?.style.setProperty('--cube-y', `${next.y}deg`);
  };

  const settle = (next: Rotation) => {
    cancelAnimationFrame(frame.current);
    frame.current = 0;
    gesture.current = null;
    cube.current?.removeAttribute('data-dragging');
    pending.current = next;
    paint(next);
    setRotation(next);
  };

  useEffect(() => () => cancelAnimationFrame(frame.current), []);

  useEffect(() => {
    if (!reduced) return;
    cancelAnimationFrame(frame.current);
    frame.current = 0;
    gesture.current = null;
    cube.current?.removeAttribute('data-dragging');
    paint(rotation);
  }, [reduced, rotation]);

  const pointerDown = (event: PointerEvent<HTMLDivElement>) => {
    if (!ready || !event.isPrimary || event.button !== 0) return;
    gesture.current = {
      id: event.pointerId,
      x: event.clientX,
      y: event.clientY,
      rotation,
      moved: false,
    };
    pending.current = rotation;
    event.currentTarget.setPointerCapture(event.pointerId);
  };

  const pointerMove = (event: PointerEvent<HTMLDivElement>) => {
    const start = gesture.current;
    if (!start || start.id !== event.pointerId) return;
    const dx = event.clientX - start.x;
    const dy = event.clientY - start.y;
    if (!start.moved && Math.abs(dy) > 8 && Math.abs(dy) > Math.abs(dx)) {
      settle(start.rotation);
      event.currentTarget.releasePointerCapture(event.pointerId);
      return;
    }
    if (!start.moved && Math.abs(dx) <= 8) return;
    start.moved = true;
    pending.current = { x: start.rotation.x, y: start.rotation.y + dx * 0.7 };
    // Motion-reduced users choose a face on release, without following the pointer.
    if (reduced) return;
    cube.current?.setAttribute('data-dragging', 'true');
    if (!frame.current) {
      frame.current = requestAnimationFrame(() => {
        frame.current = 0;
        paint(pending.current);
      });
    }
  };

  const finishGesture = (event: PointerEvent<HTMLDivElement>, cancelled = false) => {
    const start = gesture.current;
    if (!start || start.id !== event.pointerId) return;
    const next = cancelled || !start.moved
      ? start.rotation
      : { x: start.rotation.x, y: Math.round(pending.current.y / 90) * 90 };
    settle(next);
    if (event.currentTarget.hasPointerCapture(event.pointerId))
      event.currentTarget.releasePointerCapture(event.pointerId);
  };

  return (
    <>
      <div className="experiment-stage cube-stage">
        <span className="experiment-stage-note" aria-hidden="true">TYPE / OBJECT</span>
        <div className="cube-floor-shadow" aria-hidden="true" />
        <div
          className="cube-interaction"
          role="img"
          aria-label={`여섯 면에 글자가 있는 입체 블록. 정면: ${frontFace(rotation)}`}
          aria-describedby="cube-instructions"
          onPointerDown={pointerDown}
          onPointerMove={pointerMove}
          onPointerUp={(event) => finishGesture(event)}
          onPointerCancel={(event) => finishGesture(event, true)}
          onLostPointerCapture={(event) => finishGesture(event, true)}
        >
          <div
            ref={cube}
            className="type-cube"
            data-rotation-x={rotation.x}
            data-rotation-y={rotation.y}
            aria-hidden="true"
          >
            {cubeFaces.map(({ side, text }, index) => (
              <div key={side} className={`cube-face cube-face-${side}`}>
                <span className="cube-face-index">0{index + 1}</span>
                <span className="cube-glyph">{text}</span>
                <span className="cube-face-mark">↗</span>
              </div>
            ))}
          </div>
        </div>
        <span className="experiment-stage-bottom" aria-hidden="true">SIX SIDES. ONE BLOCK.</span>
      </div>
      <div className="experiment-operation">
        <p id="cube-instructions">
          {ready ? '좌우로 드래그하거나, 아래 버튼으로 돌려보세요.' : '여섯 면에 담은 글자와 기호.'}
        </p>
        <div className="cube-controls" role="group" aria-label="입체 블록 회전">
          <button disabled={!ready} type="button" aria-label="왼쪽으로" onClick={() => settle({ ...rotation, y: rotation.y - 90 })}>←</button>
          <button disabled={!ready} type="button" aria-label="오른쪽으로" onClick={() => settle({ ...rotation, y: rotation.y + 90 })}>→</button>
          <button disabled={!ready} type="button" aria-label="위로" onClick={() => settle({ ...rotation, x: rotation.x + 90 })}>↑</button>
          <button disabled={!ready} type="button" aria-label="아래로" onClick={() => settle({ ...rotation, x: rotation.x - 90 })}>↓</button>
          <button disabled={!ready} type="button" className="cube-reset" onClick={() => settle(initialRotation)}>처음으로</button>
        </div>
        <span className="cube-status" role="status" aria-live="polite">정면: {frontFace(rotation)}</span>
      </div>
    </>
  );
}

function FoldingPoster({ ready }: { ready: boolean }) {
  const [open, setOpen] = useState(false);
  return (
    <>
      <button
        type="button"
        className="experiment-stage poster-stage"
        disabled={!ready}
        aria-label={open ? '포스터 접기' : '포스터 펼치기'}
        aria-pressed={open}
        onClick={() => setOpen((current) => !current)}
      >
        <span className="experiment-stage-note" aria-hidden="true">PAPER / MOTION</span>
        <span className="folding-poster" data-open={open} aria-hidden="true">
          <span className="poster-shadow" />
          <span className="poster-paper">
            <span className="poster-leaf poster-leaf-first">
              <span className="poster-word">눌러</span>
              <span className="poster-detail">01 — PRESS</span>
              <span className="poster-leaf poster-leaf-middle">
                <span className="poster-word">펼쳐</span>
                <span className="poster-detail">02 — UNFOLD</span>
                <span className="poster-leaf poster-leaf-last">
                  <span className="poster-word">보세요</span>
                  <span className="poster-detail">03 — PLAY</span>
                </span>
              </span>
            </span>
          </span>
        </span>
        <span className="poster-action" aria-hidden="true">{open ? '접기 −' : '펼치기 ＋'}</span>
      </button>
      <div className="experiment-operation poster-operation">
        <p>{ready ? '포스터를 누르면 접히고 펼쳐집니다.' : '세 면으로 접힌 포스터: 눌러, 펼쳐, 보세요.'}</p>
        <p className="poster-state" role="status" aria-live="polite">{open ? '활짝 펼쳤습니다.' : '접힌 종이 한 장.'}</p>
      </div>
    </>
  );
}

export function Experiments() {
  const ready = useSyncExternalStore(subscribeToHydration, () => true, () => false);
  return (
    <section className="experiments-section wrap" id="experiments" aria-labelledby="experiments-title">
      <div className="experiments-heading">
        <div>
          <p className="experiment-eyebrow">A LITTLE PLAY</p>
          <h2 id="experiments-title">인터랙션 실험</h2>
        </div>
        <p>눌러보고, 돌려보고, 펼쳐보세요.</p>
      </div>
      <div className="experiments-grid">
        {experiments.map((experiment) => (
          <article className="experiment" key={experiment.id} data-experiment={experiment.id} aria-labelledby={`experiment-${experiment.id}-title`}>
            {experiment.id === 'cube' ? <TypeCube ready={ready} /> : <FoldingPoster ready={ready} />}
            <div className="experiment-caption">
              <span className="experiment-number">{experiment.number}</span>
              <div>
                <h3 id={`experiment-${experiment.id}-title`}>{experiment.title}</h3>
                <p>{experiment.description}</p>
              </div>
              <span className="experiment-caption-mark" aria-hidden="true">↗</span>
            </div>
          </article>
        ))}
      </div>
    </section>
  );
}
