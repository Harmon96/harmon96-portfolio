import { Layout } from './components/Layout';
import { allProjects } from './content/portfolio';
import { playgroundPath, projectPath } from './lib/routes';
import { SpatialWorkspace } from './components/SpatialWorkspace';
import { Home } from './pages/Home';
import { ProjectPage } from './pages/ProjectPage';

export function pageMetadata(path: string) {
  const project = allProjects.find((project) => projectPath(project.slug) === path);
  if (path === playgroundPath) {
    return { title: 'Playground — 임재혁', description: '3D 조형물을 돌려보고 열 가지 디자인 테마를 바꿔볼 수 있는 공간입니다.' };
  }
  return {
    title:
      path === '/'
        ? '임재혁 — Product Engineer & Creative Developer'
        : project
          ? `${project.name} — 임재혁의 프로젝트`
          : '페이지를 찾을 수 없습니다 — 임재혁',
    description:
      project?.description ??
      '프론트엔드 개발자 임재혁의 포트폴리오. 해외 상품 결제와 배송 신청 화면을 만든 과정, 브라우저 확장 프로그램의 로그인 문제를 고친 경험을 담았습니다.',
  };
}

export function App({ path, base }: { path: string; base: string }) {
  const project = allProjects.find((project) => projectPath(project.slug) === path);
  return (
    <Layout base={base} playground={path === playgroundPath}>
      {path === '/' ? (
        <Home base={base} />
      ) : path === playgroundPath ? (
        <>
          <h1 className="sr-only">Playground</h1>
          <SpatialWorkspace base={base} />
        </>
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
