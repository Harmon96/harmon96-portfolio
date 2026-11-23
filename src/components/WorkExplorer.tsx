import { useEffect, useRef, useState, type CSSProperties, type PointerEvent } from 'react';
import { projects, type Project } from '../content/portfolio';
import { exhibition } from '../content/exhibition';
import { useReducedMotion } from '../hooks/useReducedMotion';
import { hrefFor, projectPath } from '../lib/routes';
import { Arrow } from './Arrow';
import { ProjectArtwork } from './ProjectArtwork';

const clamp = (value: number, limit: number) => Math.max(-limit, Math.min(limit, value));

function Exhibit({ project, index, onOpen }: {
  project: Project;
  index: number;
  onOpen: (project: Project, opener: HTMLButtonElement) => void;
}) {
  const reduced = useReducedMotion();
  const surface = useRef<HTMLDivElement>(null);
  const frame = useRef(0);
  const pointer = useRef<{ id: number; x: number; y: number } | null>(null);
  const suppressedClick = useRef(false);
  const values = useRef({ x: 0, y: 0, rx: 0, ry: 0 });
  const visual = exhibition[project.slug]!;

  function paint() {
    frame.current = 0;
    const element = surface.current;
    if (!element) return;
    const { x, y, rx, ry } = values.current;
    element.style.setProperty('--drag-x', `${x}px`);
    element.style.setProperty('--drag-y', `${y}px`);
    element.style.setProperty('--tilt-x', `${rx}deg`);
    element.style.setProperty('--tilt-y', `${ry}deg`);
  }

  function schedule() {
    if (!frame.current) frame.current = requestAnimationFrame(paint);
  }

  function reset() {
    values.current = { x: 0, y: 0, rx: 0, ry: 0 };
    surface.current?.classList.remove('is-dragging');
    schedule();
  }

  useEffect(() => {
    if (reduced) {
      pointer.current = null;
      values.current = { x: 0, y: 0, rx: 0, ry: 0 };
      surface.current?.classList.remove('is-dragging');
      paint();
    }
    return () => { cancelAnimationFrame(frame.current); frame.current = 0; };
  }, [reduced]);

  function pointerDown(event: PointerEvent<HTMLButtonElement>) {
    suppressedClick.current = false;
    if (reduced || event.pointerType !== 'mouse' || event.button !== 0 || !event.isPrimary) return;
    pointer.current = { id: event.pointerId, x: event.clientX, y: event.clientY };
    event.currentTarget.setPointerCapture(event.pointerId);
    surface.current?.classList.add('is-dragging');
  }

  function pointerMove(event: PointerEvent<HTMLButtonElement>) {
    if (reduced || event.pointerType !== 'mouse') return;
    if (pointer.current) {
      if (pointer.current.id !== event.pointerId) return;
      const dx = event.clientX - pointer.current.x;
      const dy = event.clientY - pointer.current.y;
      if (Math.hypot(dx, dy) > 8) suppressedClick.current = true;
      values.current = { x: clamp(dx, 32), y: clamp(dy, 32), rx: clamp(-dy / 12, 5), ry: clamp(dx / 12, 5) };
    } else {
      const bounds = event.currentTarget.getBoundingClientRect();
      values.current = {
        x: 0, y: 0,
        rx: clamp(-((event.clientY - bounds.top) / bounds.height - 0.5) * 10, 5),
        ry: clamp(((event.clientX - bounds.left) / bounds.width - 0.5) * 10, 5),
      };
    }
    schedule();
  }

  function pointerEnd(event: PointerEvent<HTMLButtonElement>, cancelled = false) {
    if (!pointer.current || pointer.current.id !== event.pointerId) return;
    pointer.current = null;
    if (cancelled) suppressedClick.current = true;
    if (event.currentTarget.hasPointerCapture(event.pointerId)) event.currentTarget.releasePointerCapture(event.pointerId);
    reset();
  }

  return (
    <figure className={`exhibit exhibit--${visual.kind}`} style={{ '--exhibit-angle': `${[-3, 3, -2, 2][index]}deg` } as CSSProperties}>
      <div className="exhibit-motion" ref={surface}>
        <button
          className="exhibit-trigger"
          type="button"
          aria-label={`${project.name} 펼쳐보기`}
          aria-haspopup="dialog"
          onPointerDown={pointerDown}
          onPointerMove={pointerMove}
          onPointerUp={(event) => pointerEnd(event)}
          onPointerCancel={(event) => pointerEnd(event, true)}
          onLostPointerCapture={(event) => pointerEnd(event, true)}
          onPointerLeave={() => { if (!pointer.current) reset(); }}
          onClick={(event) => {
            if (suppressedClick.current && event.detail !== 0) {
              suppressedClick.current = false;
              return;
            }
            suppressedClick.current = false;
            onOpen(project, event.currentTarget);
          }}
        >
          <ProjectArtwork kind={visual.kind} />
          <span className="exhibit-open-label">펼쳐보기 <Arrow direction="up-right" /></span>
        </button>
      </div>
      <figcaption className="exhibit-caption">
        <span className="exhibit-number">{project.number}</span>
        <div><h3>{project.name}</h3><p>{visual.caption}</p></div>
        <span className="exhibit-medium">{visual.medium}</span>
      </figcaption>
    </figure>
  );
}

export function WorkExplorer({ base }: { base: string }) {
  const [selected, setSelected] = useState<Project | null>(null);
  const dialog = useRef<HTMLDialogElement>(null);
  const opener = useRef<HTMLButtonElement | null>(null);
  const origin = useRef<DOMRect | null>(null);
  const animation = useRef<Animation | null>(null);
  const closing = useRef(false);
  const reduced = useReducedMotion();

  function finishClose() {
    animation.current?.cancel();
    animation.current = null;
    dialog.current?.close();
    closing.current = false;
    setSelected(null);
    opener.current?.focus({ preventScroll: true });
  }

  function close() {
    if (closing.current || !dialog.current?.open) return;
    closing.current = true;
    animation.current?.cancel();
    if (reduced) { finishClose(); return; }
    const effect = dialog.current.animate(
      [{ opacity: 1, transform: 'scale(1)' }, { opacity: 0, transform: 'scale(.97)' }],
      { duration: 180, easing: 'ease-out', fill: 'forwards' },
    );
    animation.current = effect;
    effect.finished.then(finishClose).catch(() => {});
  }

  useEffect(() => {
    const element = dialog.current;
    if (!selected || !element) return;
    const previousOverflow = document.documentElement.style.overflow;
    document.documentElement.style.overflow = 'hidden';
    element.showModal();
    element.scrollTop = 0;
    closing.current = false;
    const bounds = element.getBoundingClientRect();
    const source = origin.current;
    if (!reduced && source) {
      const dx = source.left + source.width / 2 - (bounds.left + bounds.width / 2);
      const dy = source.top + source.height / 2 - (bounds.top + bounds.height / 2);
      const effect = element.animate(
        [
          { opacity: 0.5, transform: `translate(${dx}px, ${dy}px) scale(${source.width / bounds.width}, ${source.height / bounds.height})` },
          { opacity: 1, transform: 'translate(0, 0) scale(1)' },
        ],
        { duration: 420, easing: 'cubic-bezier(.2,.7,.2,1)' },
      );
      animation.current = effect;
      effect.finished.catch(() => {});
    }
    return () => {
      animation.current?.cancel();
      animation.current = null;
      if (element.open) element.close();
      document.documentElement.style.overflow = previousOverflow;
    };
  }, [selected, reduced]);

  const backdropPress = useRef(false);

  return (
    <div className="exhibition-gallery">
      <div className="exhibition-grid">
        {projects.map((project, index) => (
          <Exhibit key={project.slug} project={project} index={index} onOpen={(item, trigger) => {
            opener.current = trigger;
            origin.current = trigger.getBoundingClientRect();
            setSelected(item);
          }} />
        ))}
      </div>
      <div className="exhibition-gallery-note"><span>설명용 재구성</span><span className="exhibition-drag-note">살짝 움직이거나, 눌러서 펼쳐보세요.</span></div>
      <div className="exhibition-direct-links" aria-label="프로젝트 바로 읽기">
        <span>바로 읽기</span>
        {projects.map((project) => <a key={project.slug} href={hrefFor(projectPath(project.slug), base)} aria-label={`${project.name} 상세 보기`}>{project.name}<Arrow direction="up-right" /></a>)}
      </div>
      <dialog
        className="exhibit-dialog"
        ref={dialog}
        aria-labelledby="exhibit-dialog-title"
        onKeyDown={(event) => {
          if (event.key !== 'Tab') return;
          const controls = event.currentTarget.querySelectorAll<HTMLElement>('button:not([disabled]), a[href]');
          const first = controls[0];
          const last = controls[controls.length - 1];
          if (event.shiftKey && document.activeElement === first) {
            event.preventDefault();
            last?.focus();
          } else if (!event.shiftKey && document.activeElement === last) {
            event.preventDefault();
            first?.focus();
          }
        }}
        onCancel={(event) => { event.preventDefault(); close(); }}
        onPointerDown={(event) => { backdropPress.current = event.target === event.currentTarget; }}
        onClick={(event) => {
          if (backdropPress.current && event.target === event.currentTarget) close();
          backdropPress.current = false;
        }}
      >
        {selected && (
          <>
            <div className="exhibit-dialog-top"><span>SELECTED WORK / {selected.number}</span><button type="button" onClick={close} autoFocus>닫기 <span aria-hidden="true">×</span></button></div>
            <div className="exhibit-dialog-layout">
              <div className="exhibit-dialog-art"><ProjectArtwork kind={exhibition[selected.slug]!.kind} /><span>설명용 재구성</span></div>
              <div className="exhibit-dialog-copy">
                <p className="exhibit-dialog-category">{exhibition[selected.slug]!.medium}</p>
                <h2 id="exhibit-dialog-title">{selected.name}</h2>
                <p className="exhibit-dialog-description">{selected.description}</p>
                <dl><dt>담당 역할</dt><dd>{selected.role}</dd></dl>
                <div className="exhibit-dialog-questions"><h3>함께 다룬 문제</h3><ul>{selected.questions.map((question) => <li key={question}>{question}</li>)}</ul></div>
                <a className="exhibit-case-link" href={hrefFor(projectPath(selected.slug), base)}>자세히 보기 <Arrow direction="up-right" /></a>
              </div>
            </div>
          </>
        )}
      </dialog>
    </div>
  );
}
