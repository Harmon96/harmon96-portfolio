import { useMemo } from 'react';
import { projects, type CaseStudy, type Project } from '../content/portfolio';
import { useActiveSection } from '../hooks/useActiveSection';
import { Arrow } from '../components/Arrow';
import { FlowDiagram } from '../components/FlowDiagram';
import { CaseSculpture } from '../components/CaseSculpture';
import { hrefFor, projectPath } from '../lib/routes';

function CaseBody({ project }: { project: CaseStudy }) {
  const sectionIds = useMemo(() => project.sections.map((section) => section.id), [project]);
  const active = useActiveSection(sectionIds);

  return (
    <div className="case-body wrap">
      <aside className="case-toc">
        <nav aria-label="사례 목차">
          {project.sections.map((section) => (
            <a
              key={section.id}
              aria-current={active === section.id ? 'location' : undefined}
              href={`#${section.id}`}
            >
              {section.title}
            </a>
          ))}
        </nav>
      </aside>
      <article className="case-article" aria-label={`${project.name} 사례 본문`}>
        {project.sections.map((section) => (
          <section key={section.id} id={section.id}>
            <h2>{section.title}</h2>
            {section.paragraphs.map((paragraph) => <p key={paragraph}>{paragraph}</p>)}
            {section.id === 'implementation' && (
              <div className="case-flow">
                <FlowDiagram flow={project.flow} />
              </div>
            )}
          </section>
        ))}
      </article>
    </div>
  );
}

export function ProjectPage({ project, base }: { project: Project; base: string }) {
  const next = projects[(projects.indexOf(project) + 1) % projects.length]!;

  return (
    <>
      <div className="case-header wrap" id="scope">
        <a className="back-link" href={hrefFor('/#projects', base)}>
          <Arrow direction="left" />
          프로젝트 목록
        </a>
        <p className="case-name">{project.name}</p>
        <h1>
          {project.title.split('\n').map((line, index) => (
            <span key={line}>
              {index > 0 && <br />}
              {line}
            </span>
          ))}
        </h1>
        {project.kind === 'case' && (
          <>
            <p className="case-description">{project.lead}</p>
            <dl className="case-meta">
              <div><dt>담당 범위</dt><dd>{project.role}</dd></div>
              <div><dt>결과</dt><dd>{project.milestone}</dd></div>
            </dl>
          </>
        )}
      </div>
      {project.kind === 'case' ? (
        <CaseBody project={project} />
      ) : (
        <article id="result" className="case-note wrap" aria-label={`${project.name} 경력 소개`}>
          <p>{project.note}</p>
        </article>
      )}
      <CaseSculpture slug={project.slug} />
      <div className="next-case wrap">
        <a href={hrefFor(projectPath(next.slug), base)}>
          <span>
            <small>다음 프로젝트</small>
            {next.name}
          </span>
          <Arrow direction="right" />
        </a>
        <a className="text-link" href={hrefFor('/#projects', base)}>
          전체 프로젝트 보기
          <Arrow />
        </a>
      </div>
    </>
  );
}
