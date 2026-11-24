import { useEffect, useRef, useState, type CSSProperties } from 'react';
import { spatialWorks } from '../content/spatial';
import { useReducedMotion } from '../hooks/useReducedMotion';
import type { CaseScene } from '../scene/case-scene';

export function CaseSculpture({ slug }: { slug: string }) {
  const work = spatialWorks.find((item) => item.slug === slug);
  const canvas = useRef<HTMLCanvasElement>(null);
  const guide = useRef<HTMLElement>(null);
  const scene = useRef<CaseScene | null>(null);
  const reduced = useReducedMotion();
  const motion = useRef(reduced);
  const [status, setStatus] = useState<'loading' | 'ready' | 'fallback'>('loading');

  useEffect(() => {
    motion.current = reduced;
    scene.current?.setReducedMotion(reduced);
  }, [reduced]);

  useEffect(() => {
    if (!work || !canvas.current || !guide.current) return;
    const element = canvas.current;
    const ring = guide.current;
    let cancelled = false;
    setStatus('loading');

    import('../scene/case-scene')
      .then(({ createCaseScene }) => {
        if (cancelled) return;
        scene.current = createCaseScene({
          canvas: element,
          guide: ring,
          kind: work.kind,
          rotation: work.rotation,
          reducedMotion: motion.current,
          onError: () => {
            if (!cancelled) setStatus('fallback');
          },
        });
        setStatus('ready');
      })
      .catch(() => {
        if (!cancelled) setStatus('fallback');
      });

    return () => {
      cancelled = true;
      scene.current?.dispose();
      scene.current = null;
    };
  }, [work]);

  if (!work) return null;

  return (
    <div className="case-sculpture-wrap wrap">
      <figure
        className="case-sculpture"
        data-scene-state={status}
        style={{ '--case-accent': work.color } as CSSProperties}
      >
        <div className="case-sculpture-fallback" aria-hidden="true">
          <span className="case-sculpture-fallback-shape" />
          <span>{work.shortName}</span>
        </div>
        <canvas
          ref={canvas}
          className="case-sculpture-canvas"
          tabIndex={status === 'ready' ? 0 : -1}
          role="img"
          aria-label={`${work.shortName} 프로젝트를 위한 조형물. 방향키로 돌리고 Home 키로 처음 방향으로 돌아갈 수 있습니다.`}
          aria-describedby={`case-sculpture-${slug}-caption`}
          aria-hidden={status !== 'ready'}
        />
        <i ref={guide} className="sculpture-drag-guide" data-exhibit={slug} aria-hidden="true" hidden />
        <figcaption id={`case-sculpture-${slug}-caption`} className="case-sculpture-caption">
          <span><i aria-hidden="true" />{work.shortName}</span>
          <span>{status === 'ready' ? '드래그해서 돌려보세요' : '프로젝트 조형물'}</span>
        </figcaption>
      </figure>
    </div>
  );
}
