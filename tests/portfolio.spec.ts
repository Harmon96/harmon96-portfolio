import { expect, test, type Page } from '@playwright/test';

const homeCases = [
  ['1688-direct-purchase', '해외 상품 직접구매', 'Zustand'],
  ['delivery-logistics', '배송·물류 신청 서비스', '같은 트래킹번호의 상품'],
  ['style-label', '의류 사입 커머스', '2026년 재구축'],
] as const;

const loginCase = ['frontend-reliability', '확장 프로그램 로그인 오류', '5초 안에 응답하지 않으면'] as const;
const smartGrid = ['smart-grid', '스마트 그리드', 'Vue 3와 Pinia'] as const;
const playgroundCases = [...homeCases, smartGrid] as const;
const allCases = [...playgroundCases, loginCase] as const;

// The workspace tests exercise return visits. intro.spec.ts covers first-time visitors.
test.beforeEach(async ({ page }) => {
  await page.addInitScript(() => localStorage.setItem('harmon96-portfolio:intro-seen:v1', '1'));
});

async function readyWorkspace(page: Page) {
  const canvas = page.locator('.spatial-stage');
  await expect(canvas).toHaveAttribute('data-ready', 'true');
  await expect(canvas).toHaveAttribute('data-settled', 'true');
  return canvas;
}

async function waitFrames(page: Page, count = 12) {
  await page.evaluate((frames) => new Promise<void>((resolve) => {
    const next = () => { if (--frames <= 0) resolve(); else requestAnimationFrame(next); };
    requestAnimationFrame(next);
  }), count);
}

test('홈에서 직접 맡은 일과 경력을 읽고 Playground를 왕복한다', async ({ page, baseURL }) => {
  await page.goto('./');
  await expect(page.getByRole('heading', { level: 1 })).toContainText('임재혁');
  await expect(page.getByRole('heading', { level: 1 })).toBeInViewport();
  await expect(page.locator('canvas, [data-theme-toast], .theme-dice')).toHaveCount(0);
  const work = page.locator('#projects');
  for (const [slug, name] of homeCases) {
    await expect(work.locator('#work-' + slug).getByRole('heading')).toContainText(name);
  }
  await expect(work.getByRole('link')).toHaveCount(1);
  const purchase = work.getByRole('link', { name: /해외 상품 직접구매.*사례 읽기/ });
  await purchase.click();
  await expect(page.getByRole('main').getByText('Zustand')).toBeVisible();
  await page.getByRole('link', { name: /다음 작업.*배송·물류 신청 서비스/ }).click();
  await expect(page).toHaveURL(new URL('#work-delivery-logistics', baseURL).href);
  await expect(work.getByRole('heading', { name: '배송·물류 신청 서비스' })).toBeInViewport();
  await expect(page.locator('main')).toContainText('JointJS');
  const footer = page.getByRole('contentinfo');
  await expect(footer.getByRole('link', { name: /GitHub/ })).toHaveAttribute('href', /^https:\/\/github\.com\/harmon96\/?$/i);
  await expect(footer.getByRole('link', { name: /Velog/ })).toHaveAttribute('href', 'https://velog.io/@harmon/posts');
  await expect(footer.locator('a[href="mailto:jaehyeok1584@gmail.com"]')).toBeVisible();

  await page.getByRole('navigation', { name: '주요 메뉴' }).getByRole('link', { name: /Playground/i }).click();
  await expect(page).toHaveURL(/\/playground\/$/);
  await readyWorkspace(page);
  await expect(page.getByRole('button', { name: '테마 선택', exact: true })).toBeVisible();
  await page.getByRole('link', { name: '임재혁 포트폴리오 홈', exact: true }).click();
  await expect(page).toHaveURL(baseURL!);
  await expect(work).toBeVisible();
});

test('Playground: 입체 공간의 네 작업 선택, 사례 링크와 전체 작업 복귀', async ({ page, baseURL }) => {
  const errors: string[] = [];
  page.on('pageerror', (error) => errors.push(error.message));
  page.on('console', (message) => { if (message.type() === 'error') errors.push(message.text()); });
  await page.goto('./playground/');
  const canvas = await readyWorkspace(page);
  await expect(page).toHaveTitle(/Playground/i);
  await expect(page.getByRole('heading', { level: 1 })).toContainText(/Playground/i);
  const summary = page.locator('.workspace-detail');
  const projectList = page.getByRole('navigation', { name: '프로젝트 목록', exact: true });
  await expect(projectList.getByRole('link')).toHaveCount(4);
  for (const label of ['직접구매', '배송·물류', '의류 사입', '스마트 그리드']) {
    await expect(page.getByRole('button', { name: label + ' 미리보기' })).toHaveText(label);
  }
  for (const [slug, name] of playgroundCases) {
    const chooser = page.locator(`button[data-anchor="${slug}"]`);
    const link = projectList.getByRole('link', { name: name + ' 미리보기', exact: true });
    await expect(link).toBeVisible();
    await expect(link).toHaveAttribute('href', '#work-' + slug);
    await chooser.click();
    await expect(chooser).toBeHidden();
    await expect(canvas).toHaveAttribute('data-selected', slug);
    await expect(canvas).toHaveAttribute('data-settled', 'true');
    await expect(summary.getByRole('heading', { name, exact: true })).toBeVisible();
    await expect(summary).toBeFocused();
    const caseLink = summary.getByRole('link', { name: '사례 읽기', exact: true });
    if (slug === '1688-direct-purchase') {
      await expect(caseLink).toHaveAttribute('href', new URL('playground/projects/' + slug + '/', baseURL).pathname);
    } else {
      await expect(caseLink).toHaveCount(0);
    }
    await summary.getByRole('button', { name: /전체 작업/ }).click();
    await expect(summary).not.toBeVisible();
    await expect(canvas).toHaveAttribute('data-selected', '');
    await expect(canvas).toHaveAttribute('data-settled', 'true');
    await expect(chooser).toBeVisible();
    await expect(chooser).toBeFocused();
  }
  const grid = projectList.getByRole('link', { name: '스마트 그리드 미리보기', exact: true });
  await grid.press('Enter');
  await expect(summary.getByRole('heading')).toHaveText('스마트 그리드');
  await page.keyboard.press('Escape');
  await expect(grid).toBeFocused();
  await expect(page.getByRole('dialog')).toHaveCount(0);
  expect(errors).toEqual([]);
});

for (const [slug, name, excerpt] of allCases) {
  test(name + ': 직접 접근과 새로고침 후 본문을 읽고 목록으로 돌아간다', async ({ page, baseURL }) => {
    const errors: string[] = [];
    page.on('pageerror', (error) => errors.push(error.message));
    page.on('console', (message) => { if (message.type() === 'error') errors.push(message.text()); });
    const response = await page.goto('./projects/' + slug + '/');
    expect(response?.status()).toBe(200);
    await expect(page).toHaveTitle(name + ' — 임재혁의 프로젝트');
    await expect(page.getByRole('heading', { level: 1 })).toBeVisible();
    await page.reload();
    await expect(page.getByRole('heading', { level: 1 })).toHaveText(name);
    await expect(page.getByRole('main').getByText(excerpt)).toBeVisible();
    await expect(page.locator('canvas')).toHaveCount(0);
    await expect(page.getByRole('button', { name: '테마 선택', exact: true })).toHaveCount(0);
    await expect(page.getByRole('navigation', { name: '사례 목차' })).toHaveCount(0);
    await expect(page.locator('.flow-diagram')).toHaveCount(0);
    if (slug === 'delivery-logistics') {
      await expect(page.getByRole('link', { name: /다음 작업.*의류 사입 커머스/ }))
        .toHaveAttribute('href', new URL(baseURL!).pathname + '#work-style-label');
    } else if (slug === 'frontend-reliability') {
      await expect(page.getByRole('link', { name: /다음 작업/ })).toHaveCount(0);
    }
    await page.getByRole('link', { name: slug === 'smart-grid' ? '전시로 돌아가기' : '주요 작업으로', exact: true }).click();
    await expect(page).toHaveURL(new URL(slug === 'smart-grid' ? 'playground/#projects' : '#projects', baseURL).href);
    await expect(page.locator('#projects')).toBeInViewport();
    expect(errors).toEqual([]);
  });
}

test('모션 감소 설정에서 키보드로 작품을 선택하고 Escape로 복귀한다', async ({ page }) => {
  await page.emulateMedia({ reducedMotion: 'reduce' });
  await page.goto('./playground/');
  const canvas = await readyWorkspace(page);
  await page.keyboard.press('Tab');
  await expect(page.getByRole('link', { name: '본문으로 건너뛰기' })).toBeFocused();
  await page.keyboard.press('Enter');
  await expect(page.locator('#main')).toBeFocused();
  const chooser = page.getByRole('button', { name: '스마트 그리드 미리보기', exact: true });
  await chooser.focus();
  await page.keyboard.press('Enter');
  await expect(canvas).toHaveAttribute('data-selected', 'smart-grid');
  await expect(canvas).toHaveAttribute('data-settled', 'true');
  await expect(page.locator('.workspace-detail')).toBeFocused();
  const yaw = await canvas.getAttribute('data-view-yaw');
  await waitFrames(page);
  await expect(canvas).toHaveAttribute('data-view-yaw', yaw!);
  await page.keyboard.press('Escape');
  await expect(page.locator('.workspace-detail')).not.toBeVisible();
  await expect(chooser).toBeFocused();
  expect(await page.evaluate(() => document.getAnimations().filter((animation) => animation.playState === 'running').length)).toBe(0);
  expect(await page.evaluate(() => getComputedStyle(document.documentElement).scrollBehavior)).toBe('auto');
});

test('홈에서 경력 앵커로 이동하고 뒤로가기로 작업 목록에 복귀한다', async ({ page }) => {
  await page.goto('./#projects');
  const careerLink = page.getByRole('navigation', { name: '주요 메뉴' }).getByRole('link', { name: '경력', exact: true });
  await careerLink.click();
  await expect(page).toHaveURL(/#experience$/);
  await expect(page.getByRole('heading', { name: '경력', exact: true })).toBeInViewport();
  await expect.poll(() => page.evaluate(() => {
    const scale = new DOMMatrixReadOnly(getComputedStyle(document.querySelector('.reading-progress')!).transform).a;
    return Math.abs(scale - scrollY / (document.documentElement.scrollHeight - innerHeight));
  })).toBeLessThan(.01);
  await page.goBack();
  await expect(page).toHaveURL(/#projects$/);
  await expect(page.locator('#projects')).toBeInViewport();
});

test('선택 상태: 빠른 작업 전환, 상세 이동 후 뒤로가기와 재선택', async ({ page }) => {
  const errors: string[] = [];
  page.on('pageerror', (error) => errors.push(error.message));
  await page.goto('./playground/#projects');
  const canvas = await readyWorkspace(page);
  await canvas.click({ position: await canvas.evaluate((element) => ({
    x: element.clientWidth * .2, y: element.clientHeight * .24,
  })) });
  await expect(page.locator('.workspace-detail h2')).toHaveText(playgroundCases[0][1]);
  for (const [slug, name] of [playgroundCases[1], playgroundCases[0]]) {
    await page.keyboard.press('Escape');
    await expect(canvas).toHaveAttribute('data-settled', 'true');
    await page.locator(`button[data-anchor="${slug}"]`).click();
    await expect(canvas).toHaveAttribute('data-selected', slug);
    await expect(page.locator('.workspace-detail h2')).toHaveText(name);
  }
  await page.getByRole('link', { name: '사례 읽기', exact: true }).click();
  await expect(page).toHaveURL(/\/playground\/projects\/1688-direct-purchase\/$/);
  await page.goBack();
  await readyWorkspace(page);
  await expect(page.locator('.workspace-detail h2')).toHaveText('해외 상품 직접구매');
  await page.goForward();
  await page.getByRole('link', { name: /다음 작업.*배송·물류 신청 서비스/ }).click();
  await expect(page).toHaveURL(/\/playground\/#work-delivery-logistics$/);
  await page.reload();
  await readyWorkspace(page);
  await expect(page.locator('.workspace-detail h2')).toHaveText('배송·물류 신청 서비스');
  await page.getByRole('navigation', { name: '주요 메뉴' }).getByRole('link', { name: '작업', exact: true }).click();
  await expect(page).toHaveURL(/\/playground\/#projects$/);
  await expect(page.locator('.workspace-detail')).toHaveCount(0);
  await page.getByRole('button', { name: '의류 사입 미리보기', exact: true }).click();
  await expect(page.locator('.workspace-detail h2')).toHaveText('의류 사입 커머스');
  await page.getByRole('button', { name: /전체 작업/ }).click();
  await expect(page.locator('.spatial-stage')).toHaveAttribute('data-selected', '');
  expect(errors).toEqual([]);
});

async function dragCanvas(page: Page, isMobile: boolean, x: number, y: number, distance: number) {
  if (isMobile) {
    const session = await page.context().newCDPSession(page);
    try {
      await session.send('Input.dispatchTouchEvent', { type: 'touchStart', touchPoints: [{ x, y }] });
      for (let step = 1; step <= 10; step += 1)
        await session.send('Input.dispatchTouchEvent', { type: 'touchMove', touchPoints: [{ x: x + distance * step / 10, y }] });
      await session.send('Input.dispatchTouchEvent', { type: 'touchEnd', touchPoints: [] });
    } finally { await session.detach(); }
  } else {
    await page.mouse.move(x, y);
    await page.mouse.down();
    await page.mouse.move(x + distance, y + 10, { steps: 12 });
    await page.mouse.up();
  }
}

test('네 작품의 표면과 원형 손잡이 안쪽을 드래그하면 잡은 작품만 회전한다', async ({ page, isMobile }) => {
  await page.goto('./playground/');
  const canvas = await readyWorkspace(page);
  await canvas.scrollIntoViewIfNeeded();
  const bounds = (await canvas.boundingBox())!;
  const yaw = await canvas.getAttribute('data-view-yaw');
  // Sample a visible surface on each model. The mobile layout uses a taller gallery.
  const surfaces = isMobile
    ? [[.2, .24], [.735, .213], [.285, .507], [.706, .556]]
    : [[.2, .24], [.766, .205], [.29, .578], [.70, .63]];
  const points = surfaces.map(([x, y]) => ({
    x: Math.round(bounds.x + bounds.width * x),
    y: Math.round(bounds.y + bounds.height * y),
  }));
  const handles = await Promise.all(playgroundCases.map(async ([slug]) => {
    const guide = page.locator(`.sculpture-drag-guide[data-exhibit="${slug}"]`);
    await expect(guide).toBeVisible();
    const circle = (await guide.boundingBox())!;
    expect(circle.width).toBeCloseTo(circle.height, 1);
    expect(circle.width).toBeGreaterThanOrEqual(44);
    // Start just inside the upper-left rim, in the space around the mesh.
    return { x: circle.x + circle.width * .16, y: circle.y + circle.height * .16 };
  }));
  const capture = async () => (await page.screenshot({ scale: 'css' })).toString('base64');
  let before = await capture();
  for (const [i, point] of [...points, ...handles].entries()) {
    const index = i % points.length;
    const distance = i < points.length ? 65 : 46;
    await dragCanvas(page, isMobile, point.x, point.y, distance);
    await page.mouse.move(0, 0);
    await expect(canvas).toHaveAttribute('data-settled', 'true');
    await expect(canvas).toHaveAttribute('data-selected', '');
    await expect(canvas).toHaveAttribute('data-view-yaw', yaw!);
    const after = await capture();
    const changes = await page.evaluate(async ({ before, after, points }) => {
      const images = await Promise.all([before, after].map(async (png) => {
        const image = new Image();
        image.src = 'data:image/png;base64,' + png;
        await image.decode();
        return image;
      }));
      const sample = document.createElement('canvas');
      sample.width = sample.height = 40;
      const ctx = sample.getContext('2d', { willReadFrequently: true })!;
      return points.map(({ x, y }) => {
        const [first, last] = images.map((image) => {
          ctx.drawImage(image, x - 20, y - 20, 40, 40, 0, 0, 40, 40);
          return ctx.getImageData(0, 0, 40, 40).data;
        });
        let changed = 0;
        for (let i = 0; i < first.length; i += 4) {
          if ([0, 1, 2].some((channel) => Math.abs(first[i + channel] - last[i + channel]) > 8)) changed++;
        }
        return changed / (40 * 40);
      });
    }, { before, after, points });
    for (const [other, fraction] of changes.entries()) {
      const check = expect(fraction, `${playgroundCases[index][0]} drag / ${playgroundCases[other][0]} image`);
      if (other === index) check.toBeGreaterThan(.03);
      else check.toBeLessThan(.01);
    }
    before = after;
  }
});

test('작품을 확대해도 원형 손잡이가 캔버스와 설명 패널 사이에 들어간다', async ({ page, isMobile }) => {
  await page.emulateMedia({ reducedMotion: 'reduce' });
  for (const width of isMobile ? [320, 390] : [768, 960]) {
    await page.setViewportSize({ width, height: isMobile ? 700 : 900 });
    await page.goto('./playground/#projects');
    const canvas = await readyWorkspace(page);
    const slug = 'delivery-logistics';
    await page.locator(`button[data-anchor="${slug}"]`).click();
    await expect(canvas).toHaveAttribute('data-selected', slug);
    await expect(canvas).toHaveAttribute('data-settled', 'true');
    const visible = page.locator('.workspace-drag-guides > i:not([hidden])');
    await expect(visible).toHaveCount(1);
    const circle = (await visible.boundingBox())!;
    const stage = (await canvas.boundingBox())!;
    const panel = (await page.locator('.workspace-detail').boundingBox())!;
    const radius = circle.width / 2;
    const x = circle.x + radius, y = circle.y + radius;
    const dx = Math.max(panel.x - x, 0, x - (panel.x + panel.width));
    const dy = Math.max(panel.y - y, 0, y - (panel.y + panel.height));
    expect(Math.hypot(dx, dy) - radius, `${width}px panel clearance`).toBeGreaterThanOrEqual(-1);
    expect(Math.min(circle.x - stage.x, circle.y - stage.y,
      stage.x + stage.width - circle.x - circle.width,
      stage.y + stage.height - circle.y - circle.height), `${width}px canvas clearance`).toBeGreaterThanOrEqual(-1);
    await page.getByRole('button', { name: /전체 작업/ }).click();
    await expect(canvas).toHaveAttribute('data-selected', '');
  }
});

test('빈 공간을 드래그하거나 방향키를 눌러도 작품 전체가 돌지 않는다', async ({ page, isMobile }) => {
  await page.goto('./playground/');
  const canvas = await readyWorkspace(page);
  await canvas.scrollIntoViewIfNeeded();
  const yaw = await canvas.getAttribute('data-view-yaw');
  const bounds = (await canvas.boundingBox())!;
  await dragCanvas(page, isMobile, bounds.x + bounds.width * .5, bounds.y + bounds.height * .28, 65);
  await canvas.focus();
  await page.keyboard.press('ArrowRight');
  await waitFrames(page);
  await expect(canvas).toHaveAttribute('data-settled', 'true');
  await expect(canvas).toHaveAttribute('data-view-yaw', yaw!);
  await expect(canvas).toHaveAttribute('data-selected', '');
});

test('모바일: 캔버스 위의 세로 스와이프는 작품 선택 없이 페이지 스크롤', async ({ page, isMobile }) => {
  test.skip(!isMobile, '터치 스크롤은 모바일 컨텍스트에서 검증합니다.');
  await page.goto('./playground/');
  const canvas = await readyWorkspace(page);
  await canvas.scrollIntoViewIfNeeded();
  const bounds = (await canvas.boundingBox())!;
  const before = await page.evaluate(() => window.scrollY);
  const session = await page.context().newCDPSession(page);
  try {
    await session.send('Input.synthesizeScrollGesture', {
      x: Math.round(bounds.x + bounds.width * .5),
      y: Math.round(bounds.y + bounds.height * .35),
      yDistance: -180,
      speed: 500,
      gestureSourceType: 'touch',
    });
  } finally { await session.detach(); }
  await expect.poll(() => page.evaluate(() => window.scrollY)).toBeGreaterThan(before + 30);
  await expect(canvas).toHaveAttribute('data-selected', '');
  await expect(page.locator('.workspace-detail')).not.toBeVisible();
  await page.getByRole('button', { name: '직접구매 미리보기', exact: true }).tap();
  await expect(canvas).toHaveAttribute('data-selected', '1688-direct-purchase');
});

test('WebGL 없이도 전시 상세를 읽고 다음 작품과 전시 목록으로 이동한다', async ({ page, baseURL }) => {
  const errors: string[] = [];
  page.on('pageerror', (error) => errors.push(error.message));
  await page.addInitScript(() => {
    const original = HTMLCanvasElement.prototype.getContext;
    HTMLCanvasElement.prototype.getContext = function (this: HTMLCanvasElement, contextId: string, ...args: unknown[]) {
      if (contextId === 'webgl2' || contextId === 'webgl' || contextId === 'experimental-webgl') return null;
      return Reflect.apply(original, this, [contextId, ...args]);
    } as typeof HTMLCanvasElement.prototype.getContext;
  });
  await page.goto('./playground/');
  await expect(page.locator('.workspace')).toHaveClass(/is-fallback/);
  await expect(page.locator('.workspace-gesture')).toHaveCount(0);
  for (const [slug, name] of playgroundCases) {
    const link = page.getByRole('link', { name: name + ' 상세 보기', exact: true });
    await expect(link).toBeVisible();
    await expect(link).toHaveAttribute('href', new URL('playground/projects/' + slug + '/', baseURL).pathname);
  }
  await page.getByRole('link', { name: '스마트 그리드 상세 보기', exact: true }).click();
  await expect(page).toHaveURL(/\/playground\/projects\/smart-grid\/$/);
  await expect(page.getByRole('heading', { level: 1 })).toHaveText('스마트 그리드');
  await expect(page.getByRole('main').getByText('Vue 3와 Pinia')).toBeVisible();
  await page.getByRole('link', { name: /다음 작업.*해외 상품 직접구매/ }).click();
  await expect(page.locator('.workspace-detail h2')).toHaveText('해외 상품 직접구매');
  await page.getByRole('link', { name: '사례 읽기', exact: true }).click();
  await page.getByRole('link', { name: '전시로 돌아가기', exact: true }).click();
  await expect(page).toHaveURL(/\/playground\/#projects$/);
  expect(errors).toEqual([]);
});

test('320~1440px 화면에서 가로 넘침과 잘린 조작 없음', async ({ page }) => {
  for (const width of [320, 390, 768, 1024, 1440]) {
    await page.setViewportSize({ width, height: 900 });
    for (const path of ['./', './playground/#projects', './projects/delivery-logistics/']) {
      await page.goto(path);
      if (path === './playground/#projects') await readyWorkspace(page);
      expect(
        await page.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth),
      ).toBe(true);
      for (const button of await page.locator('button:visible').all()) {
        const box = await button.boundingBox();
        expect(box?.width).toBeGreaterThanOrEqual(24);
        expect(box?.height).toBeGreaterThanOrEqual(24);
        expect(box!.x).toBeGreaterThanOrEqual(0);
        expect(box!.x + box!.width).toBeLessThanOrEqual(width + 1);
      }
    }
  }
});

test('JavaScript 없이도 홈과 전시에서 사례를 읽고 원래 목록으로 돌아간다', async ({ browser, baseURL, viewport, isMobile }) => {
  const context = await browser.newContext({ javaScriptEnabled: false, viewport, isMobile, hasTouch: isMobile });
  const page = await context.newPage();
  await page.goto(baseURL!);
  await page.locator('#projects').getByRole('link', { name: /해외 상품 직접구매.*사례 읽기/ }).click();
  await page.getByRole('link', { name: '주요 작업으로', exact: true }).press('Enter');
  await expect(page).toHaveURL(new URL('#projects', baseURL).href);
  await page.getByRole('link', { name: 'Playground', exact: true }).click();
  const list = page.getByRole('navigation', { name: '프로젝트 목록' });
  for (const [slug, name] of playgroundCases) {
    const link = list.getByRole('link', { name: name + ' 상세 보기', exact: true });
    await expect(link).toHaveAttribute('href', new URL(`playground/projects/${slug}/`, baseURL).pathname);
  }
  await list.getByRole('link', { name: '해외 상품 직접구매 상세 보기' }).click();
  await expect(page.getByRole('main').getByText('Zustand')).toBeVisible();
  await page.getByRole('link', { name: /다음 작업.*배송·물류 신청 서비스/ }).click();
  const delivery = list.getByRole('link', { name: '배송·물류 신청 서비스 상세 보기' });
  await expect(page).toHaveURL(new URL('playground/#work-delivery-logistics', baseURL).href);
  await expect(delivery).toBeInViewport();
  await delivery.click();
  await page.getByRole('link', { name: '전시로 돌아가기', exact: true }).press('Enter');
  await expect(page).toHaveURL(new URL('playground/#projects', baseURL).href);
  for (const [slug, name, excerpt] of allCases) {
    await page.goto(new URL(`projects/${slug}/`, baseURL).href);
    await expect(page).toHaveTitle(`${name} — 임재혁의 프로젝트`);
    await expect(page.getByRole('main').getByText(excerpt)).toBeVisible();
    const summary = await page.locator('meta[name="description"]').getAttribute('content');
    expect(summary).toMatch(/\S/);
    expect(await page.locator('meta[property="og:description"]').getAttribute('content')).toBe(summary);
  }
  await context.close();
});

test('올바른 정적 경로·자산·404와 깨지지 않은 앵커', async ({ page, request, baseURL }) => {
  const response = await request.get(new URL('missing-page/', baseURL).href);
  expect(response.status()).toBe(404);
  expect(await response.text()).toContain('이 페이지는 찾을 수 없어요');
  for (const path of ['./', './playground/', ...allCases.map(([slug]) => `./projects/${slug}/`)]) {
    await page.goto(path);
    expect(await page.locator('h1').count()).toBe(1);
    const brokenAnchors = await page
      .locator('a[href^="#"]')
      .evaluateAll((links) =>
        links
          .filter((link) => !document.getElementById(link.getAttribute('href')!.slice(1)))
          .map((link) => link.getAttribute('href')),
      );
    expect(brokenAnchors).toEqual([]);
    const resources = await page
      .locator('link[rel="stylesheet"], script[src], link[rel="icon"]')
      .evaluateAll((elements) =>
        elements.map((el) => el.getAttribute('href') ?? el.getAttribute('src')),
      );
    for (const resource of resources)
      expect((await request.get(new URL(resource!, page.url()).href)).status()).toBe(200);
  }
});
