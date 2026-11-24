import { expect, test, type Page } from '@playwright/test';

const storageKey = 'harmon96-portfolio:theme:v1';
const dice = (page: Page) => page.getByRole('button', { name: '무작위 테마로 변경', exact: true });
const menu = (page: Page) => page.getByRole('menu', { name: '테마 선택', exact: true });

async function buttonCenter(page: Page) {
  await expect(dice(page)).toBeInViewport({ ratio: 1 });
  const bounds = (await dice(page).boundingBox())!;
  return { x: bounds.x + bounds.width / 2, y: bounds.y + bounds.height / 2 };
}

test('마우스를 2초간 올렸을 때만 목록이 열리고, 다른 링크의 포커스를 지키며 테마를 고를 수 있다', async ({ page, isMobile }) => {
  test.skip(isMobile, '마우스 입력을 검증합니다.');
  await page.emulateMedia({ reducedMotion: 'no-preference' });
  await page.clock.install({ time: new Date('2030-01-01T00:00:00Z') });
  await page.goto('./#projects');
  const { x, y } = await buttonCenter(page);
  const link = page.getByRole('navigation').getByRole('link', { name: '소개', exact: true });
  await link.focus();
  await page.clock.pauseAt(new Date('2030-01-01T00:01:00Z'));
  const trace = dice(page).locator('.theme-dice-progress');
  const originalBounds = await dice(page).boundingBox();
  await page.mouse.move(x, y);
  await expect(dice(page)).toHaveAttribute('data-hover-pending', '');
  await expect(trace).toBeVisible();
  const midpoint = await trace.evaluate(rect => {
    const animation = rect.getAnimations()[0];
    animation.pause();
    animation.currentTime = 1000;
    return parseFloat(getComputedStyle(rect).strokeDashoffset);
  });
  expect(midpoint).toBeCloseTo(50);
  expect(await dice(page).boundingBox()).toEqual(originalBounds);
  await page.clock.fastForward(1999);
  await expect(menu(page)).toHaveCount(0);
  await page.mouse.move(1, 1);
  await expect(dice(page)).not.toHaveAttribute('data-hover-pending', '');
  await expect(trace).toBeHidden();
  await page.clock.fastForward(2000);
  await expect(menu(page)).toHaveCount(0);

  await page.mouse.move(x, y);
  await page.clock.fastForward(2000);
  await expect(menu(page)).toBeVisible();
  await expect(trace).toBeHidden();
  await expect(link).toBeFocused();
  await page.keyboard.press('Escape');
  await page.clock.fastForward(2200);
  await expect(menu(page)).toHaveCount(0);
  await expect(link).toBeFocused();

  await page.emulateMedia({ reducedMotion: 'reduce' });
  await page.mouse.move(1, 1);
  await page.mouse.move(x, y);
  await expect(dice(page)).toHaveAttribute('data-hover-pending', '');
  await expect(trace).toBeHidden();
  await page.clock.fastForward(2000);
  const item = menu(page).getByRole('menuitemradio', { name: '레트로 데스크톱', exact: true });
  await expect(item).toBeVisible();
  const bounds = (await item.boundingBox())!;
  const point = { x: bounds.x + bounds.width / 2, y: bounds.y + bounds.height / 2 };
  await page.mouse.move(point.x, point.y, { steps: 16 });
  await page.mouse.click(point.x, point.y);
  await expect(page.locator('html')).toHaveAttribute('data-theme', 'retro');
  await expect(menu(page)).toHaveCount(0);
  await expect(dice(page)).toBeFocused();
});

test('펜 호버, 다른 탭으로 이동, 주사위를 한 번 클릭한 뒤에는 목록이 열리지 않는다', async ({ page, context, isMobile }) => {
  test.skip(isMobile, '데스크톱 포인터와 브라우저 탭 전환을 검증합니다.');
  await page.emulateMedia({ reducedMotion: 'reduce' });
  await page.clock.install();
  await page.goto('./#projects');
  const { x, y } = await buttonCenter(page);
  const device = await context.newCDPSession(page);
  const other = await context.newPage();
  try {
    // Playwright otherwise keeps every tab focused, even when another tab is in front.
    await device.send('Emulation.setFocusEmulationEnabled', { enabled: false });
    await page.bringToFront();
    await device.send('Input.dispatchMouseEvent', { type: 'mouseMoved', pointerType: 'pen', x, y });
    await page.clock.fastForward(2200);
    await expect(menu(page)).toHaveCount(0);

    await page.mouse.move(1, 1);
    await page.mouse.move(x, y);
    await other.bringToFront();
    await expect.poll(() => page.evaluate(() => document.hasFocus())).toBe(false);
    await page.clock.fastForward(2200);
    await page.bringToFront();
    await expect(menu(page)).toHaveCount(0);

    await page.mouse.move(1, 1);
    await page.mouse.click(x, y);
    await expect(dice(page)).not.toHaveAttribute('data-hover-pending', '');
    await page.clock.fastForward(350);
    await expect(page.locator('html')).not.toHaveAttribute('data-theme', 'spatial');
    await page.clock.fastForward(2200);
    await expect(menu(page)).toHaveCount(0);
  } finally {
    await other.close();
    await device.detach();
  }
});

test('세 번 누르면 랜덤 전환 없이 목록이 열리고 직접 고른 테마가 저장된다', async ({ page, isMobile }) => {
  await page.goto('./#projects');
  const { x, y } = await buttonCenter(page);
  if (isMobile) {
    for (let i = 0; i < 3; i++) await page.touchscreen.tap(x, y);
  } else {
    await page.mouse.click(x, y, { clickCount: 3, delay: 20 });
  }
  const picker = menu(page);
  await expect(dice(page)).toHaveAttribute('aria-expanded', 'true');
  await expect(picker.getByRole('menuitemradio')).toHaveCount(10);
  const initial = picker.getByRole('menuitemradio', { name: '3D', checked: true, exact: true });
  await expect(initial).toBeFocused();
  await expect(page.locator('[data-theme-toast]')).toHaveCount(0);
  await expect(page.locator('html')).toHaveAttribute('data-theme', 'spatial');

  await page.keyboard.press('End');
  const organic = picker.getByRole('menuitemradio', { name: '오가닉', exact: true });
  await expect(organic).toBeFocused();
  await expect(organic).not.toBeChecked();
  await page.keyboard.press('Enter');
  await expect(page.locator('html')).toHaveAttribute('data-theme', 'organic');
  await expect(page.locator('[data-theme-toast]')).toHaveText('오가닉 테마');
  await expect(picker).toHaveCount(0);
  await expect(dice(page)).toBeFocused();
  await page.reload();
  await expect(page.locator('html')).toHaveAttribute('data-theme', 'organic');
  await expect(page.locator('[data-theme-toast]')).toHaveCount(0);
  await dice(page).press('ArrowDown');
  await expect(organic).toBeChecked();
  await expect(organic).toBeFocused();
  await page.keyboard.press('Escape');
  await expect(picker).toHaveCount(0);
  await expect(dice(page)).toBeFocused();

  await dice(page).press('Shift+F10');
  await expect(organic).toBeFocused();
  await organic.click();
  await expect(dice(page)).toHaveAttribute('aria-expanded', 'false');
  await expect(page.locator('[data-theme-toast]')).toHaveCount(0);
  await expect(page.locator('html')).toHaveAttribute('data-theme', 'organic');
});

test('모바일에서 누르다 취소하면 조용히 끝나고 길게 누르면 현재 테마에 포커스한다', async ({ page, isMobile }) => {
  test.skip(!isMobile, '모바일 터치 입력을 검증합니다.');
  await page.clock.install();
  await page.goto('./#projects');
  const point = await buttonCenter(page);
  const touch = await page.context().newCDPSession(page);
  try {
    await touch.send('Input.dispatchTouchEvent', { type: 'touchStart', touchPoints: [point] });
    await touch.send('Input.dispatchTouchEvent', { type: 'touchCancel', touchPoints: [] });
    // Cross both the hold and multi-tap deadlines before asserting cancellation.
    await page.clock.fastForward(750);
    await expect(menu(page)).toHaveCount(0);
    await expect(page.locator('html')).toHaveAttribute('data-theme', 'spatial');
    await touch.send('Input.dispatchTouchEvent', { type: 'touchStart', touchPoints: [point] });
    await expect(menu(page)).toBeVisible();
    await touch.send('Input.dispatchTouchEvent', { type: 'touchEnd', touchPoints: [] });
    await page.clock.fastForward(750);
    await expect(menu(page).getByRole('menuitemradio', { checked: true, name: '3D', exact: true })).toBeFocused();
    await expect(page.locator('[data-theme-toast]')).toHaveCount(0);
    await expect(page.locator('html')).toHaveAttribute('data-theme', 'spatial');
    await page.getByRole('navigation', { name: '주요 메뉴' }).getByRole('link', { name: '소개', exact: true }).tap();
    await expect(page).toHaveURL(/#about$/);
    await expect(menu(page)).toHaveCount(0);
  } finally {
    await touch.detach();
  }
});

test('기존 5종 기록의 현재 테마와 남은 순서를 유지하고 신규 테마만 추첨 목록에 더한다', async ({ page }) => {
  await page.addInitScript(key => {
    if (!localStorage.getItem(key)) localStorage.setItem(key, JSON.stringify({ theme: 'clay', remaining: ['minimal', 'glass'] }));
  }, storageKey);
  await page.emulateMedia({ reducedMotion: 'reduce' });
  await page.goto('./#projects');
  await expect(dice(page)).toBeVisible();
  await expect(page.locator('html')).toHaveAttribute('data-theme', 'clay');
  const remaining = ['minimal', 'glass', 'blueprint', 'retro', 'collage', 'cinema', 'organic'];
  const stored = () => page.evaluate(key => JSON.parse(localStorage.getItem(key)!), storageKey);
  await expect.poll(stored).toEqual({ theme: 'clay', remaining, themeCount: 10 });
  await dice(page).press('Enter');
  await expect(page.locator('html')).not.toHaveAttribute('data-theme', 'clay');
  const drawn = await page.locator('html').getAttribute('data-theme');
  expect(remaining).toContain(drawn);
  await page.reload();
  await expect(dice(page)).toBeVisible();
  await expect.poll(stored).toEqual({ theme: drawn, remaining: remaining.filter(id => id !== drawn), themeCount: 10 });
});
