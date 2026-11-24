import { useId, useState } from 'react';
import type { DecisionFlow } from '../content/interactions';

export function FlowDiagram({ flow }: { flow: DecisionFlow }) {
  const [selected, setSelected] = useState(0);
  const panelId = useId();
  return (
    <figure className="flow-diagram">
      <figcaption>{flow.caption}</figcaption>
      <ol className="flow-steps">
        {flow.steps.map((step, index) => (
          <li key={step.label} className={selected === index ? 'is-selected' : ''}>
            <button
              type="button"
              aria-pressed={selected === index}
              aria-controls={panelId}
              onClick={() => setSelected(index)}
            >
              <span className="flow-label">{step.label}</span>
              <span className="flow-note">{step.note}</span>
            </button>
          </li>
        ))}
      </ol>
      <div className="flow-detail" id={panelId} aria-live="polite" aria-atomic="true">
        <p>{flow.steps[selected].detail}</p>
      </div>
    </figure>
  );
}
