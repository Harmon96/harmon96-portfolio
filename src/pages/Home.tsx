import { Arrow } from '../components/Arrow';
import { homeProjects, profile } from '../content/portfolio';
import { hrefFor, projectPath } from '../lib/routes';

export function Home({ base }: { base: string }) {
  return (
    <div className="portfolio-home wrap">
      <section className="portfolio-profile" id="about" aria-labelledby="profile-name">
        <h1 id="profile-name">{profile.name}</h1>
        <p className="portfolio-role">{profile.role}</p>
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
          {homeProjects.map((project) => (
            <article className="portfolio-project" key={project.slug} id={`work-${project.slug}`}>
              <h3>
                {project.details ? (
                  <a href={hrefFor(projectPath(project.slug), base)}>
                    {project.name}
                    <span className="portfolio-case-link">사례 읽기 <Arrow /></span>
                  </a>
                ) : project.name}
              </h3>
              <p>{project.homeSummary}</p>
            </article>
          ))}
        </section>

        <section id="experience" aria-labelledby="experience-title">
          <h2 id="experience-title">경력</h2>
          {profile.careers.map((career) => (
            <article className="portfolio-employer" key={career.company}>
              <h3>{career.company}</h3>
              <p className="portfolio-tenure">{career.role} · {career.period}</p>
              {career.description.map(paragraph => <p key={paragraph}>{paragraph}</p>)}
            </article>
          ))}
        </section>
      </div>
    </div>
  );
}
