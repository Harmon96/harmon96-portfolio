import { useEffect, useRef, useState } from 'react';
import { projects } from '../content/portfolio';
import { spatialWorks } from '../content/spatial';
import { useReducedMotion } from '../hooks/useReducedMotion';
import { hrefFor, projectPath } from '../lib/routes';
import type { WorldController, WorldMode } from '../scene/world';

const playItems = [
  { id: 'ribbon', title: '비틀어보기', description: '띠를 잡고 좌우로 움직이면 비틀리는 정도가 달라집니다.' },
  { id: 'type', title: '글자 흩뜨리기', description: 'PLAY에서 글자 하나를 잡아 원하는 자리에 놓아 보세요.' },
];

export function SpatialWorkspace({ base }: { base: string }) {
  const canvas = useRef<HTMLCanvasElement>(null);
  const labels = useRef<HTMLDivElement>(null);
  const guides = useRef<HTMLDivElement>(null);
  const controller = useRef<WorldController | null>(null);
  const [mode, setMode] = useState<WorldMode>('work');
  const [selected, setSelected] = useState<string | null>(null);
  const [ready, setReady] = useState(false);
  const [failed, setFailed] = useState(false);
  const [twist, setTwist] = useState(35);
  const [letterIndex, setLetterIndex] = useState(0);
  const reduced = useReducedMotion();
  const reducedRef = useRef(reduced);
  reducedRef.current = reduced;
  const returnFocus = useRef<HTMLElement | null>(null);
  const summary = useRef<HTMLElement>(null);
  const chooser = useRef<HTMLDivElement>(null);
  const selectedProject = projects.find((project) => project.slug === selected);
  const selectedPlay = playItems.find((item) => item.id === selected);

  useEffect(() => {
    let cancelled = false;
    import('../scene/world').then(({ createWorld }) => {
      if (cancelled || !canvas.current || !labels.current || !guides.current) return;
      try {
        controller.current = createWorld({
          canvas: canvas.current, labels: labels.current, guides: guides.current, reduced: reducedRef.current,
          onSelect: setSelected,
          onTwist: setTwist,
          onError: () => { controller.current?.dispose(); controller.current = null; setFailed(true); setReady(false); setSelected(null); },
        });
        setReady(true);
      } catch {
        setFailed(true);
      }
    }).catch(() => { if (!cancelled) setFailed(true); });
    return () => { cancelled = true; controller.current?.dispose(); controller.current = null; };
  }, []);

  useEffect(() => { controller.current?.setReduced(reduced); }, [reduced, ready]);
  useEffect(() => { controller.current?.setMode(mode); }, [mode, ready]);
  useEffect(() => { controller.current?.focus(selected); }, [selected, ready]);
  useEffect(() => { controller.current?.setTwist(twist); }, [twist, ready]);
  useEffect(() => {
    const navigate = () => {
      if (location.hash === '#experiments') { setMode('play'); setSelected(null); }
      if (location.hash === '#projects') { setMode('work'); setSelected(null); }
    };
    navigate();
    window.addEventListener('hashchange', navigate);
    return () => window.removeEventListener('hashchange', navigate);
  }, []);
  useEffect(() => {
    if (selected) {
      // Keep the sculpture visible after a mobile tap lower down the gallery.
      if (matchMedia('(max-width: 767px)').matches) {
        const section = canvas.current?.closest('section');
        const headerHeight = document.querySelector('header')?.getBoundingClientRect().height ?? 80;
        if (section) window.scrollTo({ top: section.getBoundingClientRect().top + window.scrollY - headerHeight, behavior: 'instant' });
      }
      summary.current?.focus({ preventScroll: true });
    } else if (returnFocus.current) {
      returnFocus.current.focus({ preventScroll: true });
      returnFocus.current = null;
    }
    const close = (event: KeyboardEvent) => { if (event.key === 'Escape' && selected) clearSelection(); };
    window.addEventListener('keydown', close);
    return () => window.removeEventListener('keydown', close);
  }, [selected]);

  function clearSelection() {
    returnFocus.current = mode === 'work'
      ? labels.current?.querySelector<HTMLButtonElement>(`[data-anchor="${selected}"]`) ?? null
      : chooser.current?.querySelector<HTMLButtonElement>(`[data-work="${selected}"]`) ?? null;
    setSelected(null);
  }
  function resetPlay() { setTwist(35); controller.current?.resetPlay(); }
  function moveLetter(direction: 'left' | 'right' | 'up' | 'down') {
    controller.current?.moveLetter(letterIndex, direction);
  }

  return (
    <section className={`workspace ${ready ? 'is-ready' : ''} ${failed ? 'is-fallback' : ''} ${selected ? 'has-selection' : ''}`} id="projects" data-mode={mode} aria-label="작업과 실험을 둘러보는 공간">
      <span id="experiments" className="workspace-anchor" />
      <div className="workspace-stage" aria-hidden="true">
        <div className="workspace-word">{mode === 'work' ? 'WORK' : 'PLAY'}</div>
        <div className="workspace-plates">
          {spatialWorks.map(work => <i key={work.slug} data-anchor={work.slug} />)}
        </div>
        {!ready && <div className="workspace-loading-shape" />}
      </div>
      <canvas ref={canvas} className="spatial-stage" tabIndex={ready ? 0 : -1} role="img" aria-describedby="workspace-keyboard-guide" aria-label={mode === 'work' ? '작품을 잡아 돌려보는 전시장' : '직접 조작하는 입체 실험 공간'} data-ready="false" data-view-yaw="0" />
      <div className="workspace-drag-guides" ref={guides} aria-hidden="true">
        {[...spatialWorks.map(work => work.slug), ...playItems.map(item => item.id)].map(id =>
          <i key={id} className="sculpture-drag-guide" data-exhibit={id} hidden />)}
      </div>
      <span className="sr-only" id="workspace-keyboard-guide">{mode === 'work' ? '작품을 선택한 뒤 캔버스에서 방향키로 돌릴 수 있습니다. Home 키로 작품을 처음 방향으로 돌립니다.' : '방향키로 실험 공간을 돌리고 Home 키로 처음 방향으로 돌아갑니다. 띠를 선택하면 좌우 방향키로 비틀 수 있습니다.'}</span>
      {ready && !selected && (
        <p className="workspace-gesture">
          {mode === 'work' ? '드래그해 회전 · 눌러서 보기' : '작품을 눌러 실험해 보세요.'}
        </p>
      )}
      <div className="workspace-labels" ref={labels} hidden={!ready || !!selected}>
        {mode === 'work' ? spatialWorks.map((item) => (
          <button type="button" data-anchor={item.slug} key={item.slug}
            aria-label={`${item.shortName} 미리보기`} onClick={() => setSelected(item.slug)}>
            <span className="workspace-label-dot" aria-hidden="true" style={{ background: item.color }} />
            {item.shortName}
          </button>
        )) : playItems.map((item) => (
          <button type="button" data-anchor={item.id} key={item.id}
            onClick={() => setSelected(item.id)}>{item.title}</button>
        ))}
      </div>
      {selected && (
        <aside className="workspace-detail" ref={summary} tabIndex={-1} aria-labelledby="workspace-detail-title">
          <button type="button" className="workspace-back" aria-label={`전체 ${mode === 'work' ? '작업' : '실험'}`} onClick={clearSelection}>← 전체 {mode === 'work' ? '작업' : '실험'}</button>
          <h2 id="workspace-detail-title">{selectedProject?.name ?? selectedPlay?.title}</h2>
          <p className="workspace-description">{selectedProject?.description ?? selectedPlay?.description}</p>
          {selectedProject && <a className="workspace-case-link" href={hrefFor(projectPath(selectedProject.slug), base)}>사례 읽기 <span aria-hidden="true">↗</span></a>}
          {selectedPlay && ready && <div className="workspace-play-controls">
            {selected === 'ribbon' && <label>띠 비틀기<input type="range" min="0" max="100" value={twist} onChange={(event) => { const next = Number(event.target.value); setTwist(next); controller.current?.setTwist(next); }} /></label>}
            {selected === 'type' && <div className="letter-controls"><label>움직일 글자<select value={letterIndex} onChange={(event) => setLetterIndex(Number(event.target.value))}>{['P', 'L', 'A', 'Y'].map((letter, i) => <option key={letter} value={i}>{letter}</option>)}</select></label><div className="letter-directions"><button type="button" aria-label="글자 왼쪽으로" onClick={() => moveLetter('left')}>←</button><button type="button" aria-label="글자 오른쪽으로" onClick={() => moveLetter('right')}>→</button><button type="button" aria-label="글자 위로" onClick={() => moveLetter('up')}>↑</button><button type="button" aria-label="글자 아래로" onClick={() => moveLetter('down')}>↓</button></div></div>}
            <button type="button" aria-label="처음으로" onClick={resetPlay}>처음으로 ↺</button>
          </div>}
          {selectedPlay && !ready && <p className="workspace-description">{failed ? '이 환경에서는 실험을 실행할 수 없습니다. 작업 목록에서 프로젝트를 읽어보세요.' : '작품을 준비하고 있습니다.'}</p>}
        </aside>
      )}
      <div className="workspace-bottom">
        {mode === 'work' ? (
          <nav className="workspace-direct" aria-label="프로젝트 목록">
            {projects.map((project) => (
              <a key={project.slug} href={hrefFor(projectPath(project.slug), base)}
                aria-label={`${project.name} 상세 보기`}>
                {project.name}<span aria-hidden="true">↗</span>
              </a>
            ))}
          </nav>
        ) : (
          <div className="workspace-chooser" ref={chooser} role="group" aria-label="실험 선택">
            {playItems.map((item) => (
              <button type="button" key={item.id} data-work={item.id}
                aria-pressed={selected === item.id} onClick={() => setSelected(item.id)}>
                {item.title}
              </button>
            ))}
          </div>
        )}
      </div>
    </section>
  );
}
