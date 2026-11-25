import { mkdir, readFile, writeFile } from 'node:fs/promises';
import { resolve } from 'node:path';
import { build } from 'vite';
import { renderToString } from 'react-dom/server';
import { App, pageMetadata } from '../src/App';
import { allProjects } from '../src/content/portfolio';
import { normalizeBase, playgroundPath, projectPath } from '../src/lib/routes';

const base = normalizeBase(process.env.PORTFOLIO_BASE_PATH ?? '/');
await build({ base });
const template = await readFile('dist/index.html', 'utf8');
const marker = '<div id="root"></div>';
if (!template.includes(marker))
  throw new Error('Static render failed: root placeholder is missing.');
const escape = (value: string) =>
  value.replace(
    /[&<>"']/g,
    (char) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' })[char]!,
  );
const paths = ['/', playgroundPath, ...allProjects.map((project) => projectPath(project.slug)), '/404/'];
for (const path of paths) {
  const metadata = pageMetadata(path);
  const html = template
    .replace('<html lang="ko">', path === playgroundPath ? '<html lang="ko" data-theme="spatial">' : '<html lang="ko">')
    .replace(
      marker,
      () => `<div id="root">${renderToString(<App path={path} base={base} />)}</div>`,
    )
    .replace(/<title>.*?<\/title>/, () => `<title>${escape(metadata.title)}</title>`)
    .replace(
      /<meta\b(?=[^>]*\bname="description")[^>]*>/,
      () => `<meta name="description" content="${escape(metadata.description)}" />`,
    )
    .replace(
      '</head>',
      `<meta property="og:title" content="${escape(metadata.title)}" /><meta property="og:description" content="${escape(metadata.description)}" /><meta property="og:type" content="website" /><meta property="og:locale" content="ko_KR" />${path === '/404/' ? '<meta name="robots" content="noindex" />' : ''}</head>`,
    );
  const destination =
    path === '/404/' ? 'dist/404.html' : resolve('dist', `.${path}`, 'index.html');
  await mkdir(resolve(destination, '..'), { recursive: true });
  await writeFile(destination, html);
}
await writeFile('dist/.nojekyll', '');
await writeFile('dist/.build-info.json', JSON.stringify({ base, paths }));
console.log(`Generated ${paths.length} HTML pages with base ${base}`);
