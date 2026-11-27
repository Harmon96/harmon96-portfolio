import { useEffect, useRef, useState } from 'react';
import { playgroundDescription, playgroundProjects, spatialWorks } from '../content/spatial';
import { useReducedMotion } from '../hooks/useReducedMotion';
import { hrefFor, projectPath } from '../lib/routes';
import type { WorldController } from '../scene/world';

export function SpatialWorkspace({ base }: { base: string }) {
  const canvas = useRef<HTMLCanvasElement>(null);
  const labels = useRef<HTMLDivElement>(null);
  const guides = useRef<HTMLDivElement>(null);
  const controller = useRef<WorldController | null>(null);
  const [selected, setSelected] = useState<string | null>(null);
  const [ready, setReady] = useState(false);
  const [failed, setFailed] = useState(false);
  const reduced = useReducedMotion();
  const reducedRef = useRef(reduced);
  reducedRef.current = reduced;
  const opener = useRef<{ slug: string; control: HTMLElement | null } | null>(null);
  const returnFocus = useRef<HTMLElement | null>(null);
  const summary = useRef<HTMLElement>(null);
  const selectedProject = playgroundProjects.find((project) => project.slug === selected);

  useEffect(() => {
    let cancelled = false;
    import('../scene/world').then(({ createWorld }) => {
      if (cancelled || !canvas.current || !labels.current || !guides.current) return;
      try {
        controller.current = createWorld({
          canvas: canvas.current, labels: labels.current, guides: guides.current, reduced: reducedRef.current,
          onSelect: (slug) => selectWork(slug, canvas.current),
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
  useEffect(() => { controller.current?.focus(selected); }, [selected, ready]);
  useEffect(() => {
    const navigate = () => {
      const project = playgroundProjects.find(({ slug }) => location.hash === `#work-${slug}`);
      setSelected(project?.slug ?? null);
    };
    navigate();
    window.addEventListener('hashchange', navigate);
    return () => window.removeEventListener('hashchange', navigate);
  }, []);
  useEffect(() => {
    if (selected) {
      canvas.current?.closest('section')?.scrollIntoView({ behavior: 'instant', block: 'start' });
      summary.current?.focus({ preventScroll: true });
    } else if (returnFocus.current) {
      returnFocus.current.focus();
      returnFocus.current = null;
    }
    const close = (event: KeyboardEvent) => { if (event.key === 'Escape' && selected) clearSelection(); };
    window.addEventListener('keydown', close);
    return () => window.removeEventListener('keydown', close);
  }, [selected, ready]);

  function selectWork(slug: string, control: HTMLElement | null) {
    opener.current = { slug, control };
    location.hash = `work-${slug}`;
  }

  function clearSelection() {
    const source = opener.current?.slug === selected && ready ? opener.current.control : null;
    returnFocus.current = source ?? document.getElementById(ready ? `work-${selected}-link` : `work-${selected}`);
    opener.current = null;
    location.hash = 'projects';
  }

  return (
    <section className={`workspace ${ready ? 'is-ready' : ''} ${failed ? 'is-fallback' : ''} ${selected ? 'has-selection' : ''}`} id="projects" data-mode="work" aria-label="작업 전시">
      {ready && spatialWorks.map(({ slug }) => <span key={slug} id={`work-${slug}`} className="workspace-work-anchor" aria-hidden="true" />)}
      <div className="workspace-stage" aria-hidden="true">
        <div className="workspace-word">WORK</div>
        <div className="workspace-plates">
          {spatialWorks.map(work => <i key={work.slug} data-anchor={work.slug} />)}
        </div>
        {!ready && <div className="workspace-loading-shape" />}
      </div>
      <canvas ref={canvas} className="spatial-stage" tabIndex={ready ? 0 : -1} role="img" aria-describedby="workspace-keyboard-guide" aria-label="작품을 잡아 돌려보는 전시장" data-ready="false" data-view-yaw="0" />
      <div className="workspace-drag-guides" ref={guides} aria-hidden="true">
        {spatialWorks.map(work =>
          <i key={work.slug} className="sculpture-drag-guide" data-exhibit={work.slug} hidden />)}
      </div>
      <span className="sr-only" id="workspace-keyboard-guide">작품을 선택한 뒤 캔버스에서 방향키로 돌릴 수 있습니다. Home 키로 작품을 처음 방향으로 돌립니다.</span>
      {ready && !selected && (
        <p className="workspace-gesture">{playgroundDescription}</p>
      )}
      <div className="workspace-labels" ref={labels} hidden={!ready || !!selected}>
        {spatialWorks.map((item) => (
          <button type="button" data-anchor={item.slug} key={item.slug}
            aria-label={`${item.shortName} 미리보기`} onClick={(event) => selectWork(item.slug, event.currentTarget)}>
            <span className="workspace-label-dot" aria-hidden="true" style={{ background: item.color }} />
            {item.shortName}
          </button>
        ))}
      </div>
      {selectedProject && (
        <aside className="workspace-detail" ref={summary} tabIndex={-1} aria-labelledby="workspace-detail-title">
          <button type="button" className="workspace-back" aria-label="전체 작업" onClick={clearSelection}>← 전체 작업</button>
          <h2 id="workspace-detail-title">{selectedProject.name}</h2>
          <p className="workspace-description">{selectedProject.description}</p>
          {selectedProject.details && (
            <a className="workspace-case-link" href={hrefFor(projectPath(selectedProject.slug, 'playground'), base)}>사례 읽기 <span aria-hidden="true">→</span></a>
          )}
        </aside>
      )}
      <div className="workspace-bottom">
        <nav className="workspace-direct" aria-label="프로젝트 목록">
          {playgroundProjects.map((project) => (
            <a key={project.slug} id={ready ? `work-${project.slug}-link` : `work-${project.slug}`}
              href={ready ? `#work-${project.slug}` : hrefFor(projectPath(project.slug, 'playground'), base)}
              aria-label={`${project.name} ${ready ? '미리보기' : '상세 보기'}`}
              aria-current={selected === project.slug ? 'location' : undefined}
              onClick={(event) => {
                if (!ready || event.metaKey || event.ctrlKey || event.shiftKey || event.altKey) return;
                opener.current = { slug: project.slug, control: event.currentTarget };
                if (selected === project.slug) {
                  event.preventDefault();
                  summary.current?.focus();
                }
              }}>
              {project.name}<span aria-hidden="true">→</span>
            </a>
          ))}
        </nav>
      </div>
    </section>
  );
}
