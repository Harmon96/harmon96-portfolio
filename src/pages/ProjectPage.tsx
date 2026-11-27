import { playgroundProjects } from '../content/spatial';
import { homeProjects, type Project } from '../content/portfolio';
import { Arrow } from '../components/Arrow';
import { hrefFor, playgroundPath, projectPath } from '../lib/routes';

export function ProjectPage({ project, base, fromPlayground }: { project: Project; base: string; fromPlayground: boolean }) {
  const collection = fromPlayground ? playgroundProjects : homeProjects;
  const listPath = fromPlayground ? playgroundPath : '/';
  const index = collection.indexOf(project);
  const next = index >= 0 && collection.length > 1 ? collection[(index + 1) % collection.length] : undefined;
  const { details } = project;

  return (
    <>
      <article className="case-header wrap" id="scope" aria-labelledby="context">
        <a className="back-link" href={hrefFor(listPath + '#projects', base)}>
          <Arrow direction="left" />
          {fromPlayground ? '전시로 돌아가기' : '주요 작업으로'}
        </a>
        <h1 id="context">{project.name}</h1>
        {/* Older shared links point to these sections even in the shortened cases. */}
        <div id={details ? undefined : 'result'}>
          <p className="case-description" id={details ? undefined : 'implementation'}>{project.description}</p>
        </div>
        {details && (
          <>
            <dl className="case-meta">
              <div><dt>담당 범위</dt><dd>{project.role}</dd></div>
              <div><dt>결과</dt><dd>{details.milestone}</dd></div>
            </dl>
            <div className="case-note" id="implementation">
              {details.implementation.map(paragraph => <p key={paragraph}>{paragraph}</p>)}
              <p id="result">{details.followUp}</p>
            </div>
          </>
        )}
      </article>
      {next && (
        <nav className="next-case wrap" aria-label="프로젝트 탐색">
          <a href={hrefFor(
            !fromPlayground && next.details ? projectPath(next.slug) : `${listPath}#work-${next.slug}`, base,
          )}>
            <small>다음 작업</small>
            <span>{next.name}</span>
            <Arrow />
          </a>
        </nav>
      )}
    </>
  );
}
