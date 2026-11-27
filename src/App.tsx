import { Layout } from './components/Layout';
import { allProjects, homeProjects, profile } from './content/portfolio';
import { playgroundDescription, playgroundProjects } from './content/spatial';
import { playgroundPath, projectPath } from './lib/routes';
import { SpatialWorkspace } from './components/SpatialWorkspace';
import { Home } from './pages/Home';
import { ProjectPage } from './pages/ProjectPage';

export const projectRoutes = new Map([
  ...allProjects.map(project => [projectPath(project.slug), {
    project,
    fromPlayground: !homeProjects.includes(project) && playgroundProjects.includes(project),
  }] as const),
  ...playgroundProjects.map(project => [
    projectPath(project.slug, 'playground'), { project, fromPlayground: true },
  ] as const),
]);

export function pageMetadata(path: string) {
  const project = projectRoutes.get(path)?.project;
  if (path === playgroundPath) {
    return { title: 'Playground — 임재혁', description: playgroundDescription };
  }
  return {
    title:
      path === '/'
        ? `${profile.name} — ${profile.role}`
        : project
          ? `${project.name} — 임재혁의 프로젝트`
          : '페이지를 찾을 수 없습니다 — 임재혁',
    description: project?.description ?? `${profile.role} ${profile.name}의 포트폴리오`,
    canonical: project && projectPath(project.slug),
  };
}

export function App({ path, base }: { path: string; base: string }) {
  const route = projectRoutes.get(path);
  return (
    <Layout base={base} playground={path === playgroundPath}>
      {path === '/' ? (
        <Home base={base} />
      ) : path === playgroundPath ? (
        <>
          <h1 className="sr-only">Playground</h1>
          <SpatialWorkspace base={base} />
        </>
      ) : route ? (
        <ProjectPage project={route.project} fromPlayground={route.fromPlayground} base={base} />
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
