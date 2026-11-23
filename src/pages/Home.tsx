import { profile, workingPrinciples } from '../content/portfolio';
import { Arrow } from '../components/Arrow';
import { SpatialWorkspace } from '../components/SpatialWorkspace';

export function Home({ base }: { base: string }) {
  return (
    <>
      <SpatialWorkspace base={base} />
      <section className="exhibition-about wrap" id="about" aria-labelledby="about-title">
        <div className="about-heading">
          <p className="section-kicker">ABOUT</p>
          <h2 id="about-title" data-reveal>안녕하세요.<br />임재혁입니다.</h2>
          <div className="about-links">
            {profile.links.filter((link) => link.href.trim()).map((link) => (
              <a className="text-link" href={link.href} key={link.label} target={link.href.startsWith('mailto:') ? undefined : '_blank'} rel="noreferrer">
                {link.label}<span className="sr-only">{link.href.startsWith('mailto:') ? ' (메일 작성)' : ' (새 탭)'}</span><Arrow direction="up-right" />
              </a>
            ))}
          </div>
        </div>
        <div className="about-story">
          <p className="about-lead" data-reveal>상품을 고르고, 결제하고, 배송을 기다리는 과정.<br />그 사이의 화면과 흐름을 만들어왔습니다.</p>
          <p data-reveal>{profile.introduction}</p>
          <details className="about-more">
            <summary>일하는 방식<span aria-hidden="true">+</span></summary>
            {workingPrinciples.map((principle) => (
              <div className="about-principle" key={principle.title}>
                <h3>{principle.title}</h3><p>{principle.text}</p>
              </div>
            ))}
            <p>AI는 코드 탐색과 수정안 검토에 활용합니다. 수정 범위는 직접 정하고, 테스트한 내용과 아직 확인하지 못한 내용을 구분해 기록합니다.</p>
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
          <p className="exhibition-writing-note" data-reveal>기술 글은 Velog에 기록하고 있습니다. 이곳에는 작업과 실험을 모읍니다.</p>
        </div>
      </section>
    </>
  );
}
