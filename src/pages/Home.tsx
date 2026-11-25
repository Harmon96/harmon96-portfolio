import { Arrow } from '../components/Arrow';
import { profile, projects } from '../content/portfolio';
import { hrefFor, projectPath } from '../lib/routes';

export function Home({ base }: { base: string }) {
  return (
    <div className="portfolio-home wrap">
      <section className="portfolio-profile" id="about" aria-labelledby="profile-name">
        <h1 id="profile-name">{profile.name}</h1>
        <p className="portfolio-role">프론트엔드 개발자</p>
        <p className="portfolio-company">슈퍼레이블에서 일하고 있습니다.</p>
        <div className="portfolio-links">
          {profile.links.filter(({ href }) => href.trim()).map(({ label, href }) => (
            <a key={href} href={href} target={href.startsWith('mailto:') ? undefined : '_blank'} rel="noreferrer">
              {label}<span className="sr-only">{href.startsWith('mailto:') ? ' (메일 작성)' : ' (새 탭)'}</span><Arrow direction="up-right" />
            </a>
          ))}
        </div>
      </section>

      <div className="portfolio-record">
        <section id="projects" aria-labelledby="projects-title">
          <h2 id="projects-title">주요 작업</h2>
          {projects.map((project) => (
            <article className="portfolio-project" key={project.slug}>
              <h3>
                <a href={hrefFor(projectPath(project.slug), base)}>
                  {project.name}<Arrow />
                </a>
              </h3>
              <ul>
                {project.contributions.map((line) => <li key={line}>{line}</li>)}
              </ul>
            </article>
          ))}
        </section>

        <section id="experience" aria-labelledby="experience-title">
          <h2 id="experience-title">경력</h2>
          {profile.careers.map((career) => (
            <article className="portfolio-employer" key={career.company}>
              <h3>{career.company}</h3>
              <p className="portfolio-tenure">{career.role} · {career.period}</p>
              <p>{career.description}</p>
            </article>
          ))}
        </section>
      </div>
    </div>
  );
}
