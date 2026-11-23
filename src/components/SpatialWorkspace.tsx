import { useEffect, useRef, useState } from 'react';
import { profile, projects } from '../content/portfolio';
import { spatialWorks } from '../content/spatial';
import { useReducedMotion } from '../hooks/useReducedMotion';
import { hrefFor, projectPath } from '../lib/routes';
import type { WorldController, WorldMode } from '../scene/world';

const playItems = [
  { id: 'ribbon', title: '비틀어보기', description: '띠를 잡고 좌우로 움직여보세요. 같은 형태가 다르게 보입니다.' },
  { id: 'type', title: '글자 흩뜨리기', description: '글자 하나를 집어서 옮겨보세요. 놓은 곳에 머무릅니다.' },
];

export function SpatialWorkspace({ base }: { base: string }) {
  const canvas = useRef<HTMLCanvasElement>(null);
  const labels = useRef<HTMLDivElement>(null);
  const controller = useRef<WorldController | null>(null);
  const [mode, setMode] = useState<WorldMode>('work');
  const [selected, setSelected] = useState<string | null>(null);
  const [ready, setReady] = useState(false);
  const [failed, setFailed] = useState(false);
  const [interacted, setInteracted] = useState(false);
  const [twist, setTwist] = useState(35);
  const [letterIndex, setLetterIndex] = useState(0);
  const reduced = useReducedMotion();
  const reducedRef = useRef(reduced);
  reducedRef.current = reduced;
  const didInteract = useRef(false);
  const summary = useRef<HTMLElement>(null);
  const chooser = useRef<HTMLDivElement>(null);
  const selectedProject = projects.find((project) => project.slug === selected);
  const selectedPlay = playItems.find((item) => item.id === selected);

  useEffect(() => {
    let cancelled = false;
    import('../scene/world').then(({ createWorld }) => {
      if (cancelled || !canvas.current || !labels.current) return;
      try {
        controller.current = createWorld({
          canvas: canvas.current, labels: labels.current, reduced: reducedRef.current,
          onSelect: setSelected,
          onInteract: () => { if (!didInteract.current) { didInteract.current = true; setInteracted(true); } },
          onTwist: setTwist,
          onError: () => { controller.current?.dispose(); controller.current = null; setFailed(true); setReady(false); },
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
      // Small browser viewports may scroll the chooser into view before selection.
      // Bring the actual artwork back below the fixed header before revealing its copy.
      if (matchMedia('(max-width: 767px)').matches) {
        const section = canvas.current?.closest('section');
        const headerHeight = document.querySelector('header')?.getBoundingClientRect().height ?? 80;
        if (section) window.scrollTo({ top: section.getBoundingClientRect().top + window.scrollY - headerHeight, behavior: 'instant' });
      }
      summary.current?.focus({ preventScroll: true });
    }
    const close = (event: KeyboardEvent) => { if (event.key === 'Escape' && selected) clearSelection(); };
    window.addEventListener('keydown', close);
    return () => window.removeEventListener('keydown', close);
  }, [selected]);

  function clearSelection() {
    const previous = selected;
    setSelected(null);
    chooser.current?.querySelector<HTMLButtonElement>(`[data-work="${previous}"]`)?.focus({ preventScroll: true });
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
        {!ready && <div className="workspace-loading-shape" />}
      </div>
      <canvas ref={canvas} className="spatial-stage" tabIndex={ready ? 0 : -1} role="img" aria-describedby="workspace-keyboard-guide" aria-label={mode === 'work' ? '드래그해서 돌려보는 입체 작업 공간' : '직접 조작하는 입체 실험 공간'} data-ready="false" data-view-yaw="0" />
      <span className="sr-only" id="workspace-keyboard-guide">방향키로 공간이나 선택한 작품을 돌릴 수 있습니다. Home 키로 처음 방향으로 돌아갑니다. 띠를 선택하면 좌우 방향키로 비틀 수 있습니다.</span>
      <div className="workspace-topline"><span>{mode === 'work' ? 'SELECTED WORK / 01—04' : 'SMALL EXPERIMENTS / 01—02'}</span><span>임재혁의 작업과 실험</span></div>
      <div className="workspace-labels" ref={labels}>
        {spatialWorks.map((item) => <button type="button" data-anchor={item.slug} key={item.slug} aria-label={`${projects.find((p) => p.slug === item.slug)!.name} 작품 보기`} onClick={() => setSelected(item.slug)}><span className="workspace-label-dot" style={{ background: item.color }} /><span>{item.shortName}</span><span aria-hidden="true">↗</span></button>)}
        {playItems.map((item) => <button type="button" data-anchor={item.id} key={item.id} onClick={() => setSelected(item.id)}>{item.title}<span aria-hidden="true">↗</span></button>)}
      </div>
      <div className="workspace-introduction">
        <p>{profile.role}</p>
        <h1>제품을 만드는 개발자입니다.<br />재미있는 인터랙션을 좋아합니다.</h1>
      </div>
      {selected && (
        <aside className="workspace-detail" ref={summary} tabIndex={-1} aria-labelledby="workspace-detail-title">
          <button type="button" className="workspace-back" aria-label={`전체 ${mode === 'work' ? '작업' : '실험'}`} onClick={clearSelection}>← 전체 {mode === 'work' ? '작업' : '실험'}</button>
          <p className="workspace-detail-kicker">{selectedProject ? `SELECTED WORK / ${selectedProject.number}` : 'PLAY WITH IT'}</p>
          <h2 id="workspace-detail-title">{selectedProject?.name ?? selectedPlay?.title}</h2>
          <p className="workspace-description">{selectedProject?.description ?? selectedPlay?.description}</p>
          {selectedProject && <><p className="workspace-role">{selectedProject.role}</p><a className="workspace-case-link" href={hrefFor(projectPath(selectedProject.slug), base)}>사례 읽기 <span aria-hidden="true">↗</span></a></>}
          {selectedPlay && ready && <div className="workspace-play-controls">
            {selected === 'ribbon' && <label>띠 비틀기<input type="range" min="0" max="100" value={twist} onChange={(event) => { const next = Number(event.target.value); setTwist(next); controller.current?.setTwist(next); }} /></label>}
            {selected === 'type' && <div className="letter-controls"><label>움직일 글자<select value={letterIndex} onChange={(event) => setLetterIndex(Number(event.target.value))}>{['P', 'L', 'A', 'Y'].map((letter, i) => <option key={letter} value={i}>{letter}</option>)}</select></label><div className="letter-directions"><button type="button" aria-label="글자 왼쪽으로" onClick={() => moveLetter('left')}>←</button><button type="button" aria-label="글자 오른쪽으로" onClick={() => moveLetter('right')}>→</button><button type="button" aria-label="글자 위로" onClick={() => moveLetter('up')}>↑</button><button type="button" aria-label="글자 아래로" onClick={() => moveLetter('down')}>↓</button></div></div>}
            <button type="button" aria-label="처음으로" onClick={resetPlay}>처음으로 ↺</button>
          </div>}
          {selectedPlay && !ready && <p className="workspace-description">{failed ? '이 환경에서는 실험을 실행할 수 없습니다. 작업 목록에서 프로젝트를 읽어보세요.' : '작품을 준비하고 있습니다.'}</p>}
        </aside>
      )}
      <div className="workspace-bottom">
        <p className="workspace-gesture">{failed ? '작업 이름을 눌러 살펴보세요.' : interacted ? '원하는 작업을 선택해보세요.' : '드래그해서 둘러보세요.'}<span aria-hidden="true">↔</span></p>
        <div className="workspace-chooser" ref={chooser} role="group" aria-label={mode === 'work' ? '프로젝트 선택' : '실험 선택'}>
          {mode === 'work' ? projects.map((project) => <button type="button" key={project.slug} data-work={project.slug} aria-label={`${project.name} 선택`} aria-pressed={selected === project.slug} onClick={() => setSelected(project.slug)}><span>{project.number}</span>{project.name}</button>) : playItems.map((item, i) => <button type="button" key={item.id} data-work={item.id} aria-label={item.title} aria-pressed={selected === item.id} onClick={() => setSelected(item.id)}><span>0{i + 1}</span>{item.title}</button>)}
        </div>
      </div>
      <div className="workspace-direct"><span>바로 읽기</span>{projects.map((project) => <a key={project.slug} href={hrefFor(projectPath(project.slug), base)} aria-label={`${project.name} 상세 보기`}>{project.name} ↗</a>)}</div>
    </section>
  );
}
