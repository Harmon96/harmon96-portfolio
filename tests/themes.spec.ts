import { expect, test, type Page } from '@playwright/test';

const themes = ['spatial', 'glass', 'clay', 'minimal', 'type', 'blueprint', 'retro', 'collage', 'cinema', 'organic'] as const;
type ThemeId = (typeof themes)[number];
const toastNames: Record<ThemeId, string> = {
  spatial: '3D', glass: '글래스모피즘', clay: '클레이모피즘', minimal: '미니멀리즘', type: '타이포그래픽',
  blueprint: '블루프린트', retro: '레트로 데스크톱', collage: '종이 콜라주', cinema: '시네마틱', organic: '오가닉',
};

function themeButton(page: Page) {
  return page.getByRole('button', { name: '무작위 테마로 변경', exact: true });
}

async function waitForThemeTransition(page: Page) {
  await expect(page.locator('html[data-theme-transitioning]:not([data-theme-transitioning="false"])')).toHaveCount(0);
  await expect(themeButton(page)).toBeEnabled();
}

async function changeTheme(page: Page, input: 'click' | 'Enter' | 'Space' = 'click') {
  const root = page.locator('html');
  const previous = await root.getAttribute('data-theme');
  expect(themes).toContain(previous);
  if (input === 'click') await themeButton(page).click();
  else await themeButton(page).press(input);
  await expect(root).not.toHaveAttribute('data-theme', previous!);
  await waitForThemeTransition(page);
  const current = await root.getAttribute('data-theme');
  expect(themes).toContain(current);
  return current as ThemeId;
}

async function expectThemeToast(page: Page, theme: ThemeId) {
  const toast = page.locator('[data-theme-toast]');
  await expect(toast).toBeVisible();
  await expect(toast).toHaveAttribute('data-theme', theme);
  await expect(toast).toContainText(toastNames[theme]);
  await expect(toast).toHaveAttribute('aria-hidden', 'true');
  const placement = await toast.evaluate(element => {
    const rect = element.getBoundingClientRect();
    const x = rect.left + rect.width / 2;
    const y = rect.top + rect.height / 2;
    return {
      offCenter: Math.abs(innerWidth / 2 - x),
      withinTopThird: rect.top >= 0 && y < innerHeight / 3,
      blocksPointer: element.contains(document.elementFromPoint(x, y)),
    };
  });
  expect(placement.offCenter).toBeLessThanOrEqual(3);
  expect(placement.withinTopThird).toBe(true);
  expect(placement.blocksPointer).toBe(false);
}

test('첫 방문에서 키보드로 열 가지 테마를 한 바퀴 돌고, 다음 전환에도 직전 테마를 반복하지 않는다', async ({ page }) => {
  await page.emulateMedia({ reducedMotion: 'reduce' });
  await page.goto('./playground/#projects');
  await expect(page.locator('html')).toHaveAttribute('data-theme', 'spatial');
  await expect(themeButton(page)).toBeVisible();
  await expect(page.locator('[data-theme-toast]')).toBeHidden();
  const seen = ['spatial'];
  for (let i = 1; i < themes.length; i++) {
    seen.push(await changeTheme(page, i % 2 ? 'Enter' : 'Space'));
    await expect(themeButton(page)).toBeFocused();
    await expect(page).toHaveURL(/#projects$/);
  }
  expect(seen.sort()).toEqual([...themes].sort());
  await changeTheme(page, 'Enter');
  expect(await page.evaluate(() => document.getAnimations().some((animation) => animation.playState === 'running'))).toBe(false);
});

test('정상 모션에서 빠르게 연타하면 한 번만 테마를 바꾸고 전환이 끝난 뒤 다시 입력을 받는다', async ({ page, isMobile }) => {
  await page.emulateMedia({ reducedMotion: 'no-preference' });
  await page.goto('./playground/#projects');
  await expect(themeButton(page)).toBeEnabled();
  await expect(page.locator('html')).toHaveAttribute('data-theme', 'spatial');
  const observed = await page.evaluateHandle(() => {
    const previousThemes: (string | null)[] = [];
    const observer = new MutationObserver((entries) => {
      previousThemes.push(...entries.map((entry) => entry.oldValue));
    });
    observer.observe(document.documentElement, { attributeFilter: ['data-theme'], attributeOldValue: true });
    return { previousThemes, observer };
  });
  if (isMobile) {
    const bounds = (await themeButton(page).boundingBox())!;
    const x = bounds.x + bounds.width / 2;
    const y = bounds.y + bounds.height / 2;
    await page.touchscreen.tap(x, y);
    await page.touchscreen.tap(x, y);
  } else {
    await themeButton(page).dblclick({ delay: 20 });
  }
  await expect(page.locator('html')).not.toHaveAttribute('data-theme', 'spatial');
  await waitForThemeTransition(page);
  const changes = await observed.evaluate(({ previousThemes, observer }) => {
    observer.disconnect();
    const history = [...previousThemes, document.documentElement.dataset.theme];
    return previousThemes.filter((theme, index) => theme !== history[index + 1]);
  });
  expect(changes).toEqual(['spatial']);
  await observed.dispose();
  await changeTheme(page);
});

test('테마를 바꿔도 선택한 작품의 미리보기와 사례 링크가 유지된다', async ({ page }) => {
  await page.goto('./playground/#projects');
  const canvas = page.locator('.spatial-stage');
  await expect(canvas).toHaveAttribute('data-ready', 'true');
  await page.getByRole('button', { name: '직접구매 미리보기', exact: true }).click();
  const preview = page.locator('.workspace-detail');
  await expect(preview.getByRole('heading')).toHaveText('해외 상품 직접구매');
  await changeTheme(page);
  await expect(preview.getByRole('heading')).toHaveText('해외 상품 직접구매');
  await expect(preview.getByRole('link', { name: '사례 읽기' })).toBeVisible();
  await expect(canvas).toHaveAttribute('data-selected', '1688-direct-purchase');
});

test('선택한 테마는 Playground에서만 적용되고 다시 방문해도 유지된다', async ({ page }) => {
  await page.goto('./playground/#projects');
  const chosen = await changeTheme(page);
  await page.getByRole('link', { name: '해외 상품 직접구매 미리보기' }).click();
  await page.getByRole('link', { name: '사례 읽기' }).click();
  await expect(page.getByRole('heading', { level: 1 })).toHaveText('해외 상품 직접구매');
  await expect(page.locator('html[data-theme]')).toHaveCount(0);
  await expect(themeButton(page)).toHaveCount(0);
  await page.reload();
  await expect(page.locator('html[data-theme]')).toHaveCount(0);
  await page.getByRole('link', { name: '전시로 돌아가기', exact: true }).click();
  await expect(page).toHaveURL(/\/playground\/#projects$/);
  await expect(page.locator('html')).toHaveAttribute('data-theme', chosen);
  await expect(themeButton(page)).toBeVisible();
});

test('320px에서 WebGL을 쓸 수 없어도 모든 테마의 프로젝트 목록과 상세 본문을 읽을 수 있다', async ({ page }) => {
  await page.setViewportSize({ width: 320, height: 740 });
  await page.emulateMedia({ reducedMotion: 'reduce' });
  await page.addInitScript(() => {
    const original = HTMLCanvasElement.prototype.getContext;
    HTMLCanvasElement.prototype.getContext = function (this: HTMLCanvasElement, contextId: string, ...args: unknown[]) {
      if (contextId.includes('webgl')) return null;
      return Reflect.apply(original, this, [contextId, ...args]);
    } as typeof HTMLCanvasElement.prototype.getContext;
  });
  await page.goto('./playground/#projects');
  await expect(page.locator('.workspace')).toHaveClass(/is-fallback/);
  const list = page.getByRole('navigation', { name: '프로젝트 목록', exact: true });
  const link = list.getByRole('link', { name: '해외 상품 직접구매 상세 보기' });
  const playgroundThemes: string[] = [];
  for (let index = 0; index < themes.length; index++) {
    const theme = index === 0 ? await page.locator('html').getAttribute('data-theme') : await changeTheme(page, 'Enter');
    playgroundThemes.push(theme!);
    expect(await page.evaluate(() => document.documentElement.scrollWidth)).toBeLessThanOrEqual(320);
    await expect(list.getByRole('link')).toHaveCount(4);
    await expect(link).toBeVisible();
    await expect(themeButton(page)).toBeInViewport();
  }
  expect(playgroundThemes.sort()).toEqual([...themes].sort());
  await link.click();
  await expect(page.getByRole('heading', { level: 1 })).toHaveText('해외 상품 직접구매');
  await expect(page.locator('html[data-theme]')).toHaveCount(0);
  expect(await page.evaluate(() => document.documentElement.scrollWidth)).toBeLessThanOrEqual(320);
  await expect(page.getByRole('main').getByText('Zustand')).toBeVisible();
});

test('연속 전환 시 마지막 테마의 알림만 남았다가 자동으로 닫힌다', async ({ page }) => {
  await page.emulateMedia({ reducedMotion: 'reduce' });
  await page.goto('./playground/#projects');
  const dice = themeButton(page);
  await expect(dice).toBeVisible();

  const start = new Date('2026-01-01T12:00:00Z');
  await page.clock.install({ time: start });
  await page.clock.pauseAt(new Date(start.getTime() + 1000));
  await expectThemeToast(page, await changeTheme(page, 'Enter'));
  await page.clock.fastForward(1400);
  const latest = await changeTheme(page, 'Enter');
  await page.clock.fastForward(900);
  await expectThemeToast(page, latest);
  await expect(page.getByRole('status')).toHaveCount(1);
  await expect(dice).toBeFocused();
  await page.clock.fastForward(2200);
  await expect(page.locator('[data-theme-toast]')).toBeHidden();
  await expect(page.locator('html')).toHaveAttribute('data-theme', latest);
});

test.describe('JavaScript 비활성화', () => {
  test.use({ javaScriptEnabled: false });
  test('포트폴리오에서 프로젝트 목록과 직접구매 본문을 읽을 수 있다', async ({ page }) => {
    await page.goto('./#projects');
    await expect(page.locator('html[data-theme]')).toHaveCount(0);
    await expect(themeButton(page)).toBeHidden();
    await page.locator('#projects').getByRole('link', { name: /해외 상품 직접구매/ }).click();
    await expect(page.getByRole('heading', { level: 1 })).toHaveText('해외 상품 직접구매');
    await expect(page.getByRole('main').getByText('Zustand')).toBeVisible();
  });
});

test('열 가지 테마의 한글 미리보기 제목과 본문, 선택 목록에 지정한 웹폰트가 렌더링된다', async ({ page }) => {
  const display: Record<ThemeId, string> = {
    spatial: 'Gugi', glass: 'Orbit', clay: 'Jua', minimal: 'Hahmlet',
    type: 'BlackHanSans', blueprint: 'NanumGothicCoding', retro: 'Galmuri11',
    collage: 'Gaegu', cinema: 'SongMyung', organic: 'GowunBatang',
  };
  await page.emulateMedia({ reducedMotion: 'reduce' });
  await page.goto('./playground/#projects');
  await page.getByRole('button', { name: '직접구매 미리보기', exact: true }).click();
  const client = await page.context().newCDPSession(page);
  await client.send('DOM.enable');
  await client.send('CSS.enable');
  const { root } = await client.send('DOM.getDocument');

  async function expectRenderedFamily(selector: string, family: string) {
    const { nodeId } = await client.send('DOM.querySelector', { nodeId: root.nodeId, selector });
    const { fonts } = await client.send('CSS.getPlatformFontsForNode', { nodeId });
    expect(fonts.length, selector).toBeGreaterThan(0);
    for (const font of fonts) {
      expect(font.isCustomFont, `${selector} rendered with ${font.familyName}`).toBe(true);
      expect(font.familyName.replaceAll(' ', ''), selector).toMatch(new RegExp('^' + family));
    }
  }
  for (const theme of themes) {
    await page.getByRole('button', { name: '테마 선택', exact: true }).click();
    await page.getByRole('menuitemradio', { name: toastNames[theme], exact: true }).click();
    await expect(page.locator('html')).toHaveAttribute('data-theme', theme);
    await waitForThemeTransition(page);
    await page.getByRole('button', { name: '테마 선택', exact: true }).click();
    await expect(page.getByRole('menu')).toBeVisible();
    await page.evaluate(() => document.fonts.ready);
    const bodyFamily = ['collage', 'organic'].includes(theme) ? 'GowunDodum' : 'IBMPlexSansKR';
    const readingFamily = theme === 'minimal' ? 'Hahmlet' : bodyFamily;
    const menuFamily = theme === 'retro' ? 'Galmuri11' : bodyFamily;
    await expectRenderedFamily('.workspace-detail h2', display[theme]);
    await expectRenderedFamily('.workspace-description', readingFamily);
    await expectRenderedFamily('.theme-picker-menu button:nth-child(2) > span:nth-child(2)', menuFamily);
    await page.keyboard.press('Escape');
  }
  await client.detach();
});
