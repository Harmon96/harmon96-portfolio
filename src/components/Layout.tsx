import { useEffect, useState, type ReactNode } from 'react';
import { profile } from '../content/portfolio';
import { Arrow } from './Arrow';
import { hrefFor, playgroundPath } from '../lib/routes';
import { useActiveSection } from '../hooks/useActiveSection';
import { PageEffects } from './PageEffects';
import { WaterIntro } from './WaterIntro';
import { ThemeDice } from './ThemeDice';

const homeSections = ['projects', 'experience'];

export function Layout({ children, base, playground }: { children: ReactNode; base: string; playground: boolean }) {
  const current = useActiveSection(homeSections);
  const [hash, setHash] = useState('');
  useEffect(() => {
    const update = () => setHash(location.hash);
    update();
    window.addEventListener('hashchange', update);
    return () => window.removeEventListener('hashchange', update);
  }, []);
  const active = playground ? (hash === '#experiments' ? 'experiments' : 'projects') : current;
  return (
    <>
      <PageEffects />
      <a className="skip-link" href="#main">
        본문으로 건너뛰기
      </a>
      <header className={`site-header wrap ${playground ? 'workspace-header' : ''}`}>
        <a className="wordmark" href={base} aria-label="임재혁 포트폴리오 홈">
          <span>{profile.name}{!playground && <span className="wordmark-role">Portfolio</span>}</span>
        </a>
        <div className="header-actions">
          <nav aria-label="주요 메뉴">
            <a aria-current={active === 'projects' ? 'location' : undefined}
              href={playground ? '#projects' : hrefFor('/#projects', base)}>작업</a>
            {playground ? (
              <a aria-current={active === 'experiments' ? 'location' : undefined} href="#experiments">실험</a>
            ) : (
              <>
                <a aria-current={active === 'experience' ? 'location' : undefined}
                  href={hrefFor('/#experience', base)}>경력</a>
                <a href={hrefFor(playgroundPath, base)} lang="en">Playground</a>
              </>
            )}
          </nav>
          {playground && <ThemeDice />}
        </div>
      </header>
      <main id="main" tabIndex={-1} className={playground ? 'workspace-main' : undefined}>
        {children}
      </main>
      <footer className="site-footer wrap">
        <div>
          <a className="footer-name" href={base}>
            {profile.name}
            <span className="mono"> / {profile.role}</span>
          </a>
        </div>
        <div className="footer-links">
          {profile.links
            .filter((link) => link.href.trim())
            .map((link) => (
              <a key={link.label} href={link.href} target={link.href.startsWith('mailto:') ? undefined : '_blank'} rel="noreferrer">
                {link.label}
                <span className="sr-only">{link.href.startsWith('mailto:') ? ' (메일 작성)' : ' (새 탭)'}</span>
                <Arrow direction="up-right" />
              </a>
            ))}
          {playground && <WaterIntro />}
          <a href="#main">
            맨 위로
            <Arrow direction="up-right" />
          </a>
        </div>
      </footer>
    </>
  );
}
