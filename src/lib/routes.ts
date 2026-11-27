export const playgroundPath = '/playground/';

export function normalizeBase(value: string) {
  const path = value.trim().replace(/^\/+|\/+$/g, '');
  if (path && !/^[a-zA-Z0-9_/-]+$/.test(path)) {
    throw new Error('PORTFOLIO_BASE_PATH must be a URL path, for example /harmon96-portfolio/.');
  }
  return path ? `/${path}/` : '/';
}

export function localPath(pathname: string, base: string) {
  if (!pathname.startsWith(base)) return '/404/';
  const path = pathname.slice(base.length).replace(/index\.html$/, '');
  return path ? `/${path.replace(/\/+$/, '')}/` : '/';
}

export function projectPath(slug: string, source: 'home' | 'playground' = 'home') {
  return `${source === 'playground' ? playgroundPath : '/'}projects/${slug}/`;
}

export function hrefFor(path: string, base: string) {
  return `${base}${path.replace(/^\//, '')}`;
}
