import { expect, test, type Page } from '@playwright/test';

const cases = [
  ['1688-direct-purchase', '해외 상품 직접구매'],
  ['delivery-logistics', '배송·물류 신청 서비스'],
  ['style-label', '의류 사입 커머스'],
  ['frontend-reliability', '확장 프로그램 로그인 오류'],
] as const;

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

test('홈: 입체 공간의 네 작업 선택, 사례 링크와 전체 작업 복귀', async ({ page, baseURL }) => {
  const errors: string[] = [];
  page.on('pageerror', (error) => errors.push(error.message));
  page.on('console', (message) => { if (message.type() === 'error') errors.push(message.text()); });
  await page.goto('./');
  const canvas = await readyWorkspace(page);
  await expect(page).toHaveTitle('임재혁 — Product Engineer & Creative Developer');
  const pageHeading = page.getByRole('heading', { level: 1 });
  await expect(pageHeading).toHaveText('임재혁 포트폴리오');
  await expect(pageHeading).toHaveClass(/\bsr-only\b/);
  await expect(page.locator('header .wordmark')).toHaveText('임재혁');
  const summary = page.locator('.workspace-detail');
  const projectList = page.getByRole('navigation', { name: '프로젝트 목록', exact: true });
  await expect(projectList.getByRole('link')).toHaveCount(4);
  for (const label of ['직접구매', '배송·물류', '의류 사입', '확장 로그인']) {
    await expect(page.getByRole('button', { name: label + ' 미리보기' })).toHaveText(label);
  }
  for (const [slug, name] of cases) {
    const chooser = page.locator(`button[data-anchor="${slug}"]`);
    const link = page.getByRole('link', { name: name + ' 상세 보기', exact: true });
    const path = new URL('projects/' + slug + '/', baseURL).pathname;
    await expect(link).toBeVisible();
    await expect(link).toHaveAttribute('href', path);
    await chooser.click();
    await expect(chooser).toBeHidden();
    await expect(canvas).toHaveAttribute('data-selected', slug);
    await expect(canvas).toHaveAttribute('data-settled', 'true');
    await expect(summary.getByRole('heading', { name, exact: true })).toBeVisible();
    await expect(summary).toBeFocused();
    await expect(summary.getByRole('link', { name: '사례 읽기', exact: true })).toHaveAttribute('href', path);
    await summary.getByRole('link', { name: '사례 읽기', exact: true }).click({ trial: true });
    await summary.getByRole('button', { name: /전체 작업/ }).click();
    await expect(summary).not.toBeVisible();
    await expect(canvas).toHaveAttribute('data-selected', '');
    await expect(canvas).toHaveAttribute('data-settled', 'true');
    await expect(chooser).toBeVisible();
    await expect(chooser).toBeFocused();
  }
  await expect(page.getByRole('dialog')).toHaveCount(0);
  await page.getByRole('navigation', { name: '주요 메뉴' }).getByRole('link', { name: '소개' }).click();
  const about = page.locator('#about');
  await expect(about).toBeInViewport();
  await expect(about.getByRole('link', { name: /GitHub/ })).toHaveAttribute('href', /^https:\/\/github\.com\/harmon96\/?$/i);
  await expect(about.getByRole('link', { name: /Velog/ })).toHaveAttribute('href', 'https://velog.io/@harmon/posts');
  await expect(about.locator('a[href="mailto:jaehyeok1584@gmail.com"]')).toBeVisible();
  await expect(about).toContainText('JointJS');
  await page.locator('summary').click();
  await expect(page.locator('.about-more')).toHaveAttribute('open', '');
  await expect(page.locator('.about-more p').first()).toBeVisible();
  expect(errors).toEqual([]);
});

for (const [slug, name] of cases) {
  test(name + ': 직접 접근, 새로고침, 단계 탐색, 목차와 복귀', async ({ page, isMobile }) => {
    const errors: string[] = [];
    page.on('pageerror', (error) => errors.push(error.message));
    page.on('console', (message) => { if (message.type() === 'error') errors.push(message.text()); });
    const response = await page.goto('./projects/' + slug + '/');
    expect(response?.status()).toBe(200);
    await expect(page).toHaveTitle(name + ' — 임재혁의 프로젝트');
    await expect(page.getByRole('heading', { level: 1 })).toBeVisible();
    await page.reload();
    if (slug === '1688-direct-purchase' || slug === 'frontend-reliability') {
      await expect(page.getByRole('heading', { level: 1 })).toHaveText(name);
      await expect(page.locator('.case-name')).toHaveCount(0);
    } else {
      await expect(page.locator('.case-name')).toHaveText(name);
    }
    const sculpture = page.locator('.case-sculpture-canvas');
    await expect(page.locator('.case-sculpture')).toHaveAttribute('data-scene-state', 'ready');
    await expect(sculpture).toHaveAttribute('data-rotation-y', /-?\d+\.\d+/);
    const rotation = await sculpture.getAttribute('data-rotation-y');
    await sculpture.scrollIntoViewIfNeeded();
    const guide = page.locator('.case-sculpture > .sculpture-drag-guide');
    await expect(guide).toBeVisible();
    const rim = (await guide.boundingBox())!;
    await dragCanvas(page, isMobile, rim.x + rim.width * .18, rim.y + rim.height * .19, 44);
    await expect(sculpture).not.toHaveAttribute('data-rotation-y', rotation!);
    await sculpture.focus();
    await page.keyboard.press('Home');
    await expect(sculpture).toHaveAttribute('data-rotation-y', rotation!);
    await page.keyboard.press('ArrowRight');
    await expect(sculpture).not.toHaveAttribute('data-rotation-y', rotation!);
    await page.keyboard.press('Home');
    await expect(sculpture).toHaveAttribute('data-rotation-y', rotation!);
    const toc = page.getByRole('navigation', { name: '사례 목차' });
    if (slug === 'style-label') {
      await expect(toc).toHaveCount(0);
      await expect(page.locator('.flow-diagram')).toHaveCount(0);
      await expect(page.locator('#result p')).toBeVisible();
    } else {
      const diagram = page.locator('#implementation .flow-diagram');
      const detail = diagram.locator('.flow-detail');
      const firstStep = await detail.innerText();
      await diagram.locator('button').last().click();
      await expect(diagram.locator('button').last()).toHaveAttribute('aria-pressed', 'true');
      await expect(detail).toContainText(/\S/);
      await expect(detail).not.toHaveText(firstStep);
      await toc.getByRole('link').last().click();
      await expect(page).toHaveURL(/#result$/);
      await expect(page.locator('#result h2')).toBeVisible();
    }
    await page.getByRole('link', { name: '프로젝트 목록', exact: true }).click();
    await expect(page).toHaveURL(/\/#projects$/);
    await expect(page.locator('.workspace')).toHaveAttribute('data-mode', 'work');
    await expect(page.getByRole('navigation', { name: '프로젝트 목록', exact: true })).toBeVisible();
    expect(errors).toEqual([]);
  });
}

test('모션 감소: 키보드 선택·Escape 복귀와 자동 움직임 없는 실험 조작', async ({ page }) => {
  await page.emulateMedia({ reducedMotion: 'reduce' });
  await page.goto('./');
  const canvas = await readyWorkspace(page);
  await page.keyboard.press('Tab');
  await expect(page.getByRole('link', { name: '본문으로 건너뛰기' })).toBeFocused();
  await page.keyboard.press('Enter');
  await expect(page.locator('#main')).toBeFocused();
  const chooser = page.getByRole('button', { name: '확장 로그인 미리보기', exact: true });
  await chooser.focus();
  await page.keyboard.press('Enter');
  await expect(canvas).toHaveAttribute('data-selected', 'frontend-reliability');
  await expect(canvas).toHaveAttribute('data-settled', 'true');
  await expect(page.locator('.workspace-detail')).toBeFocused();
  const yaw = await canvas.getAttribute('data-view-yaw');
  await waitFrames(page);
  await expect(canvas).toHaveAttribute('data-view-yaw', yaw!);
  await page.keyboard.press('Escape');
  await expect(page.locator('.workspace-detail')).not.toBeVisible();
  await expect(chooser).toBeFocused();
  const playLink = page.getByRole('navigation', { name: '주요 메뉴' }).getByRole('link', { name: '실험', exact: true });
  await playLink.focus();
  await page.keyboard.press('Enter');
  await expect(page.locator('.workspace')).toHaveAttribute('data-mode', 'play');
  const ribbon = page.getByRole('group', { name: '실험 선택', exact: true }).getByRole('button', { name: /비틀어보기/ });
  await ribbon.focus();
  await page.keyboard.press('Space');
  await expect(canvas).toHaveAttribute('data-selected', 'ribbon');
  await expect(canvas).toHaveAttribute('data-settled', 'true');
  const slider = page.getByRole('slider', { name: '띠 비틀기', exact: true });
  await slider.focus();
  await page.keyboard.press('ArrowRight');
  await expect(slider).toHaveValue('36');
  await expect(canvas).toHaveAttribute('data-twist', '36');
  expect(await page.evaluate(() => document.getAnimations().filter((animation) => animation.playState === 'running').length)).toBe(0);
  expect(await page.evaluate(() => getComputedStyle(document.documentElement).scrollBehavior)).toBe('auto');
});

test('휠 스크롤 중에도 소개 앵커와 읽기 진행률이 함께 이동한다', async ({ page, isMobile }) => {
  test.skip(isMobile, '휠 입력은 데스크톱에서 확인합니다.');
  await page.goto('./#projects');
  await readyWorkspace(page);
  await page.mouse.wheel(0, 320);
  await page.waitForFunction(() => window.scrollY > 0);
  const aboutLink = page.getByRole('navigation', { name: '주요 메뉴' }).getByRole('link', { name: '소개' });
  await aboutLink.click();
  await expect(page).toHaveURL(/#about$/);
  await waitFrames(page, 30);
  await expect(aboutLink).toHaveAttribute('aria-current', 'location');
  await expect(page.locator('#about h2')).toBeInViewport();
  const { actual, expected } = await page.evaluate(() => ({
    actual: new DOMMatrixReadOnly(getComputedStyle(document.querySelector('.reading-progress')!).transform).a,
    expected: scrollY / (document.documentElement.scrollHeight - innerHeight),
  }));
  expect(actual).toBeCloseTo(expected, 2);
  await page.goBack();
  await expect(page).toHaveURL(/#projects$/);
});

test('선택 상태: 빠른 작업 전환, 상세 이동 후 뒤로가기와 재선택', async ({ page }) => {
  const errors: string[] = [];
  page.on('pageerror', (error) => errors.push(error.message));
  await page.goto('./');
  const canvas = await readyWorkspace(page);
  await canvas.click({ position: await canvas.evaluate((element) => ({
    x: element.clientWidth * .2, y: element.clientHeight * .24,
  })) });
  await expect(page.locator('.workspace-detail h2')).toHaveText(cases[0][1]);
  for (const [slug, name] of [cases[1], cases[0]]) {
    await page.keyboard.press('Escape');
    await expect(canvas).toHaveAttribute('data-settled', 'true');
    await page.locator(`button[data-anchor="${slug}"]`).click();
    await expect(canvas).toHaveAttribute('data-selected', slug);
    await expect(page.locator('.workspace-detail h2')).toHaveText(name);
  }
  await page.getByRole('link', { name: '사례 읽기', exact: true }).click();
  await expect(page).toHaveURL(/\/projects\/1688-direct-purchase\/$/);
  await page.goBack();
  await readyWorkspace(page);
  if (await page.locator('.workspace-detail').isVisible()) await page.keyboard.press('Escape');
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
  await page.goto('./');
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
  const handles = await Promise.all(cases.map(async ([slug]) => {
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
      const check = expect(fraction, `${cases[index][0]} drag / ${cases[other][0]} image`);
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
    await page.goto('./#projects');
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
  await page.goto('./');
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
  await page.goto('./');
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

test('실험: 띠 변형·초기화, 글자 이동 유지·초기화와 작업 모드 복귀', async ({ page }) => {
  await page.goto('./#experiments');
  const canvas = await readyWorkspace(page);
  await expect(page.locator('.workspace')).toHaveAttribute('data-mode', 'play');
  const chooser = page.getByRole('group', { name: '실험 선택', exact: true });
  await chooser.getByRole('button', { name: /비틀어보기/ }).click();
  await expect(canvas).toHaveAttribute('data-selected', 'ribbon');
  await expect(canvas).toHaveAttribute('data-settled', 'true');
  const slider = page.getByRole('slider', { name: '띠 비틀기', exact: true });
  await expect(slider).toHaveValue('35');
  await slider.focus();
  await page.keyboard.press('End');
  await expect(slider).toHaveValue('100');
  await expect(canvas).toHaveAttribute('data-twist', '100');
  await page.getByRole('button', { name: /처음으로/ }).click();
  await expect(slider).toHaveValue('35');
  await expect(canvas).toHaveAttribute('data-twist', '35');

  await chooser.getByRole('button', { name: /글자 흩뜨리기/ }).click();
  await expect(canvas).toHaveAttribute('data-selected', 'type');
  await expect(canvas).toHaveAttribute('data-settled', 'true');
  await page.getByRole('combobox', { name: '움직일 글자', exact: true }).selectOption({ label: 'A' });
  await page.getByRole('button', { name: '글자 오른쪽으로', exact: true }).click();
  await expect(canvas).toHaveAttribute('data-letter-position', /^2:/);
  const onceMoved = await canvas.getAttribute('data-letter-position');
  await page.getByRole('button', { name: '글자 위로', exact: true }).click();
  await expect(canvas).not.toHaveAttribute('data-letter-position', onceMoved!);
  const moved = await canvas.getAttribute('data-letter-position');
  await waitFrames(page);
  await expect(canvas).toHaveAttribute('data-letter-position', moved!);
  await page.getByRole('button', { name: /처음으로/ }).click();
  await page.getByRole('button', { name: '글자 오른쪽으로', exact: true }).click();
  await expect(canvas).toHaveAttribute('data-letter-position', onceMoved!);

  await page.getByRole('navigation', { name: '주요 메뉴' }).getByRole('link', { name: '작업', exact: true }).click();
  await expect(page.locator('.workspace')).toHaveAttribute('data-mode', 'work');
  await expect(canvas).toHaveAttribute('data-selected', '');
  await expect(page.getByRole('navigation', { name: '프로젝트 목록', exact: true })).toBeVisible();
});

test('실험에서 키보드 시점 이동과 드래그 중단 후 띠 조절값 유지', async ({ page }) => {
  await page.goto('./#experiments');
  const canvas = await readyWorkspace(page);
  const original = await canvas.getAttribute('data-view-yaw');
  await canvas.focus();
  await page.keyboard.press('ArrowRight');
  await expect(canvas).toHaveAttribute('data-settled', 'true');
  await expect(canvas).not.toHaveAttribute('data-view-yaw', original!);
  await page.keyboard.press('Home');
  await expect(canvas).toHaveAttribute('data-view-yaw', original!);
  const choose = page.getByRole('group', { name: '실험 선택' });
  await choose.getByRole('button', { name: '비틀어보기', exact: true }).click();
  await expect(canvas).toHaveAttribute('data-settled', 'true');
  const box = (await canvas.boundingBox())!;
  const header = (await page.locator('header').boundingBox())!;
  const x = box.x + box.width * .7;
  const y = Math.max(box.y + box.height * .1, header.y + header.height + 40);
  expect(await page.evaluate(({ x, y }) => document.elementFromPoint(x, y)?.classList.contains('spatial-stage'), { x, y })).toBe(true);
  await page.mouse.move(x, y);
  await page.mouse.down();
  await page.mouse.move(x + 60, y, { steps: 8 });
  await expect(canvas).not.toHaveAttribute('data-twist', '35');
  await page.keyboard.press('Escape');
  await page.mouse.up();
  const value = await canvas.getAttribute('data-twist');
  await choose.getByRole('button', { name: '비틀어보기', exact: true }).click();
  await expect(page.getByRole('slider', { name: '띠 비틀기' })).toHaveValue(value!);
});

test('WebGL을 사용할 수 없어도 작업 설명과 상세 링크를 읽을 수 있음', async ({ page, baseURL }) => {
  const errors: string[] = [];
  page.on('pageerror', (error) => errors.push(error.message));
  await page.addInitScript(() => {
    const original = HTMLCanvasElement.prototype.getContext;
    HTMLCanvasElement.prototype.getContext = function (this: HTMLCanvasElement, contextId: string, ...args: unknown[]) {
      if (contextId === 'webgl2' || contextId === 'webgl' || contextId === 'experimental-webgl') return null;
      return Reflect.apply(original, this, [contextId, ...args]);
    } as typeof HTMLCanvasElement.prototype.getContext;
  });
  await page.goto('./');
  await expect(page.locator('.workspace')).toHaveClass(/is-fallback/);
  await expect(page.locator('.workspace-gesture')).toHaveCount(0);
  for (const [slug, name] of cases) {
    const link = page.getByRole('link', { name: name + ' 상세 보기', exact: true });
    await expect(link).toBeVisible();
    await expect(link).toHaveAttribute('href', new URL('projects/' + slug + '/', baseURL).pathname);
  }
  await page.getByRole('link', { name: '배송·물류 신청 서비스 상세 보기', exact: true }).click();
  await expect(page).toHaveURL(/\/projects\/delivery-logistics\/$/);
  await expect(page.locator('.case-name')).toHaveText('배송·물류 신청 서비스');
  expect(errors).toEqual([]);
});

test('320~1440px 화면에서 가로 넘침과 잘린 조작 없음', async ({ page }) => {
  for (const width of [320, 390, 768, 1024, 1440]) {
    await page.setViewportSize({ width, height: 900 });
    for (const path of ['./', './projects/delivery-logistics/']) {
      await page.goto(path);
      if (path === './') await readyWorkspace(page);
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

test('JavaScript 없이도 사례 본문과 모든 상세 링크 제공', async ({ browser, baseURL }) => {
  const context = await browser.newContext({ javaScriptEnabled: false });
  const page = await context.newPage();
  await page.goto(baseURL!);
  for (const [slug, name] of cases) {
    const link = page.getByRole('link', { name: `${name} 상세 보기` });
    await expect(link).toBeVisible();
    await expect(link).toHaveAttribute('href', new URL(`projects/${slug}/`, baseURL).pathname);
  }
  for (const [slug, name] of cases) {
    await page.goto(new URL(`projects/${slug}/`, baseURL).href);
    await expect(page).toHaveTitle(`${name} — 임재혁의 프로젝트`);
    await expect(page.locator('#result p').last()).toHaveText(/\S/);
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
  for (const path of ['./', ...cases.map(([slug]) => `./projects/${slug}/`)]) {
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
