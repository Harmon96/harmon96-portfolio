import { Layout } from './components/Layout';
import { projects } from './content/portfolio';
import { projectPath } from './lib/routes';
import { Home } from './pages/Home';
import { ProjectPage } from './pages/ProjectPage';

export function pageMetadata(path: string) {
  const project = projects.find((project) => projectPath(project.slug) === path);
  return {
    title:
      path === '/'
        ? '임재혁 — Product Engineer & Creative Developer'
        : project
          ? `${project.name} — 임재혁의 프로젝트`
          : '페이지를 찾을 수 없습니다 — 임재혁',
    description:
      project?.description ??
      '제품을 만드는 개발자입니다. 재미있는 인터랙션을 좋아합니다. 임재혁의 프로젝트와 인터랙션 실험을 만나보세요.',
  };
}

export function App({ path, base }: { path: string; base: string }) {
  const project = projects.find((project) => projectPath(project.slug) === path);
  return (
    <Layout base={base} home={path === '/'}>
      {path === '/' ? (
        <Home base={base} />
      ) : project ? (
        <ProjectPage project={project} base={base} />
      ) : (
        <section className="not-found wrap">
          <p className="eyebrow">404 / PAGE NOT FOUND</p>
          <h1>이 페이지는 찾을 수 없어요.</h1>
          <p>주소를 확인하거나 프로젝트 목록에서 다시 시작해주세요.</p>
          <a className="primary-link" href={`${base}#projects`}>
            프로젝트로 돌아가기
          </a>
        </section>
      )}
    </Layout>
  );
}
