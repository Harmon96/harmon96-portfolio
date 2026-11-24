import { useEffect, useState, type ReactNode } from 'react';
import { profile } from '../content/portfolio';
import { Arrow } from './Arrow';
import { hrefFor } from '../lib/routes';
import { useActiveSection } from '../hooks/useActiveSection';
import { PageEffects } from './PageEffects';
import { WaterIntro } from './WaterIntro';

const homeSections = ['projects', 'about'];

export function Layout({ children, base, home = false }: { children: ReactNode; base: string; home?: boolean }) {
  const current = useActiveSection(homeSections);
  const [hash, setHash] = useState('');
  useEffect(() => {
    const update = () => setHash(location.hash);
    update();
    window.addEventListener('hashchange', update);
    return () => window.removeEventListener('hashchange', update);
  }, []);
  const active = current === 'projects' && hash === '#experiments' ? 'experiments' : current;
  return (
    <>
      <PageEffects />
      <a className="skip-link" href="#main">
        본문으로 건너뛰기
      </a>
      <header className={`site-header wrap ${home ? 'workspace-header' : ''}`}>
        <a className="wordmark" href={base} aria-label="임재혁 포트폴리오 홈">
          <span>{profile.name}<span className="wordmark-role">Portfolio</span></span>
        </a>
        <nav aria-label="주요 메뉴">
          <a
            aria-current={active === 'projects' ? 'location' : undefined}
            href={hrefFor('/#projects', base)}
          >
            작업
          </a>
          <a
            aria-current={active === 'experiments' ? 'location' : undefined}
            href={hrefFor('/#experiments', base)}
          >
            실험
          </a>
          <a
            aria-current={active === 'about' ? 'location' : undefined}
            href={hrefFor('/#about', base)}
          >
            소개
          </a>
        </nav>
      </header>
      <main id="main" tabIndex={-1} className={home ? 'workspace-main' : undefined}>
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
          {home && <WaterIntro />}
          <a href="#main">
            맨 위로
            <Arrow direction="up-right" />
          </a>
        </div>
      </footer>
    </>
  );
}
