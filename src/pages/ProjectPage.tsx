import { useMemo } from 'react';
import { projects, type Project } from '../content/portfolio';
import { useActiveSection } from '../hooks/useActiveSection';
import { Arrow } from '../components/Arrow';
import { FlowDiagram } from '../components/FlowDiagram';
import { CaseSculpture } from '../components/CaseSculpture';
import { hrefFor, projectPath } from '../lib/routes';

export function ProjectPage({ project, base }: { project: Project; base: string }) {
  const next = projects[(projects.indexOf(project) + 1) % projects.length]!;
  const sectionIds = useMemo(
    () => ['scope', ...project.sections.map((section) => section.id)],
    [project],
  );
  const active = useActiveSection(sectionIds);
  const scopeTitle = project.questions.length ? '담당 범위와 핵심 쟁점' : '담당 범위';
  return (
    <>
      <div className="case-header wrap">
        <a className="back-link" href={hrefFor('/#projects', base)}>
          <Arrow direction="left" />
          프로젝트 목록
        </a>
        <p className="eyebrow">
          {project.number} / {project.category}
        </p>
        <p className="case-name">{project.name}</p>
        <h1>
          {project.title.split('\n').map((line, index) => (
            <span key={line}>
              {index > 0 && <br />}
              {line}
            </span>
          ))}
        </h1>
        <p className="case-description">{project.description}</p>
        <dl className="case-meta">
          <div>
            <dt>담당 범위</dt>
            <dd>{project.role}</dd>
          </div>
          <div>
            <dt>확인된 결과</dt>
            <dd>{project.milestone}</dd>
          </div>
        </dl>
      </div>
      <div className="case-flow wrap">
        <FlowDiagram project={project} />
      </div>
      <div className="case-body wrap">
        <aside className="case-toc">
          <nav aria-label="사례 목차">
            <p className="eyebrow">IN THIS CASE</p>
            <a aria-current={active === 'scope' ? 'location' : undefined} href="#scope">
              {scopeTitle}
            </a>
            {project.sections.map((section) => (
              <a
                aria-current={active === section.id ? 'location' : undefined}
                key={section.id}
                href={`#${section.id}`}
              >
                {section.title}
              </a>
            ))}
          </nav>
        </aside>
        <article className="case-article" aria-label={`${project.name} 사례 본문`}>
          <section id="scope" className="scope-section">
            <p className="eyebrow">AT A GLANCE</p>
            <h2>{scopeTitle}</h2>
            <ul className="scope-list">
              {project.scope.map((item) => (
                <li key={item}>{item}</li>
              ))}
            </ul>
            {project.questions.length > 0 && (
              <div className="questions">
                <h3>함께 다룬 문제</h3>
                <ul>
                  {project.questions.map((question) => (
                    <li key={question}>{question}</li>
                  ))}
                </ul>
              </div>
            )}
          </section>
          {project.sections.map((section) => (
            <section key={section.id} id={section.id}>
              <p className="eyebrow">{section.eyebrow}</p>
              <h2>{section.title}</h2>
              {section.paragraphs.map((paragraph) => (
                <p key={paragraph}>{paragraph}</p>
              ))}
              {section.points && (
                <dl className="implementation-points">
                  {section.points.map((point) => (
                    <div key={point.title}>
                      <dt>{point.title}</dt>
                      <dd>{point.text}</dd>
                    </div>
                  ))}
                </dl>
              )}
            </section>
          ))}
          {project.outcome && (
            <div className="outcome">
              <span className="eyebrow">TAKEAWAY</span>
              <p>{project.outcome}</p>
            </div>
          )}
        </article>
      </div>
      <CaseSculpture slug={project.slug} />
      <div className="next-case wrap">
        <span className="eyebrow">NEXT CASE / {next.number}</span>
        <a href={hrefFor(projectPath(next.slug), base)}>
          <span>
            {next.name}
            <small>{next.title.replace('\n', ' ')}</small>
          </span>
          <Arrow direction="up-right" />
        </a>
        <a className="text-link" href={hrefFor('/#projects', base)}>
          전체 프로젝트 보기
          <Arrow />
        </a>
      </div>
    </>
  );
}
