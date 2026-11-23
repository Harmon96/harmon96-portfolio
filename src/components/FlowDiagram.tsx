import { useId, useState } from 'react';
import type { Project } from '../content/portfolio';
import { stageDetails } from '../content/interactions';

export function FlowDiagram({ project, compact = false }: { project: Project; compact?: boolean }) {
  const [selected, setSelected] = useState(0);
  const panelId = useId();
  return (
    <figure
      className={`flow-diagram ${compact ? 'flow-diagram--compact' : ''} flow-diagram--${project.slug}`}
    >
      <div className="diagram-heading">
        <span className="mono">{project.number} / FLOW EXPLORER</span>
        <span className="diagram-hint">
          <span className="small-dot" /> 단계를 눌러보세요
        </span>
      </div>
      <ol className="flow-steps">
        {project.flow.map((step, index) => (
          <li key={step.label} className={selected === index ? 'is-selected' : ''}>
            <button
              type="button"
              aria-pressed={selected === index}
              aria-controls={panelId}
              onClick={() => setSelected(index)}
            >
              <span className="flow-node mono" aria-hidden="true">
                {String(index + 1).padStart(2, '0')}
              </span>
              <span>
                <span className="flow-label">{step.label}</span>
                <span className="flow-note">{step.note}</span>
              </span>
              <span className="flow-step-arrow" aria-hidden="true">
                ↗
              </span>
            </button>
          </li>
        ))}
      </ol>
      <div className="flow-detail" id={panelId} aria-live="polite" aria-atomic="true">
        <span className="mono">STEP 0{selected + 1}</span>
        <p key={selected}>{stageDetails[project.slug]?.[selected] ?? project.flowNote}</p>
      </div>
      <figcaption>흐름을 설명하기 위한 재구성</figcaption>
    </figure>
  );
}
