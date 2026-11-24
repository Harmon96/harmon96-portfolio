import { profile, workingPrinciples } from '../content/portfolio';
import { Arrow } from '../components/Arrow';
import { SpatialWorkspace } from '../components/SpatialWorkspace';

export function Home({ base }: { base: string }) {
  return (
    <>
      <h1 className="sr-only">{profile.name} 포트폴리오</h1>
      <SpatialWorkspace base={base} />
      <section className="exhibition-about wrap" id="about" aria-labelledby="about-title">
        <div className="about-heading">
          <p className="section-kicker">ABOUT</p>
          <h2 id="about-title" data-reveal>안녕하세요.<br /> 임재혁입니다.</h2>
          <div className="about-links">
            {profile.links.filter((link) => link.href.trim()).map((link) => (
              <a className="text-link" href={link.href} key={link.label} target={link.href.startsWith('mailto:') ? undefined : '_blank'} rel="noreferrer">
                {link.label}<span className="sr-only">{link.href.startsWith('mailto:') ? ' (메일 작성)' : ' (새 탭)'}</span><Arrow direction="up-right" />
              </a>
            ))}
          </div>
        </div>
        <div className="about-story">
          <p data-reveal>{profile.introduction}</p>
          <details className="about-more">
            <summary>일하는 방식<span aria-hidden="true">+</span></summary>
            {workingPrinciples.map((principle) => (
              <div className="about-principle" key={principle.title}>
                <h3>{principle.title}</h3><p>{principle.text}</p>
              </div>
            ))}
            <p>고칠 범위는 제가 정하고, 관련 코드를 찾거나 수정안을 검토할 때 AI를 씁니다.</p>
          </details>
          <div className="exhibition-careers">
            <h3 className="section-kicker">경력</h3>
            {profile.careers.map((career) => (
              <article key={career.company} data-reveal>
                <div><h4>{career.company}</h4><p>{career.role}</p></div>
                <span>{career.period}</span>
                {career.description && <p className="career-description">{career.description}</p>}
              </article>
            ))}
          </div>
        </div>
      </section>
    </>
  );
}
