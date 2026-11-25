import { expect, test, type Locator, type Page } from '@playwright/test';

const storageKey = 'harmon96-portfolio:theme:v1';
const dice = (page: Page) => page.getByRole('button', { name: '무작위 테마로 변경', exact: true });
const toggle = (page: Page) => page.getByRole('button', { name: '테마 선택', exact: true });
const menu = (page: Page) => page.getByRole('menu', { name: '테마 선택', exact: true });

function activate(control: Locator, isMobile: boolean) {
  return isMobile ? control.tap() : control.click();
}

test('320px에서 주사위와 화살표가 독립적으로 눌리고 주사위는 클릭 즉시 무작위 테마를 고른다', async ({ page, isMobile }) => {
  await page.setViewportSize({ width: 320, height: 740 });
  await page.emulateMedia({ reducedMotion: 'reduce' });
  await page.clock.install({ time: new Date('2030-01-01T00:00:00Z') });
  await page.goto('./playground/#projects');
  const random = dice(page), picker = toggle(page);
  await expect(picker).toBeInViewport({ ratio: 1 });
  const die = (await random.boundingBox())!, arrow = (await picker.boundingBox())!;
  for (const box of [die, arrow]) {
    expect(box.width).toBeGreaterThanOrEqual(44);
    expect(box.height).toBeGreaterThanOrEqual(44);
  }
  expect(arrow.x).toBeGreaterThanOrEqual(die.x + die.width);
  expect(arrow.x + arrow.width).toBeLessThanOrEqual(320);

  await page.clock.pauseAt(new Date('2030-01-01T00:01:00Z'));
  const x = die.x + die.width / 2, y = die.y + die.height / 2;
  if (isMobile) {
    const session = await page.context().newCDPSession(page);
    try {
      await session.send('Input.dispatchTouchEvent', { type: 'touchStart', touchPoints: [{ x, y }] });
      await page.clock.fastForward(2500);
      await expect(menu(page)).toHaveCount(0);
      await session.send('Input.dispatchTouchEvent', { type: 'touchCancel', touchPoints: [] });
    } finally {
      await session.detach();
    }
  } else {
    await page.mouse.move(x, y);
    await page.clock.fastForward(2500);
    await expect(menu(page)).toHaveCount(0);
    await page.mouse.move(arrow.x + arrow.width / 2, y);
    await page.clock.fastForward(2500);
    await expect(menu(page)).toHaveCount(0);
  }

  // With timers paused, a deferred multi-click handler would never start the change.
  await expect(page.locator('html')).toHaveAttribute('data-theme', 'spatial');
  if (isMobile) await page.touchscreen.tap(x, y);
  else await page.mouse.click(x, y);
  await expect(page.locator('html')).not.toHaveAttribute('data-theme', 'spatial');
  await expect(page.locator('[data-theme-toast]')).toBeVisible();
  await expect(picker).toHaveAttribute('aria-expanded', 'false');
});

test('화살표로 목록을 열고 테마를 직접 선택하며 새로고침해도 선택이 유지된다', async ({ page, isMobile }) => {
  await page.emulateMedia({ reducedMotion: 'reduce' });
  await page.goto('./playground/#projects');
  const picker = toggle(page), list = menu(page);
  await activate(picker, isMobile);
  await expect(picker).toHaveAttribute('aria-expanded', 'true');
  await expect(list.getByRole('menuitemradio')).toHaveCount(10);
  await expect(list.getByRole('menuitemradio', { checked: true, name: '3D', exact: true })).toBeFocused();
  await expect(page.locator('[data-theme-toast]')).toHaveCount(0);
  await activate(picker, isMobile);
  await expect(list).toHaveCount(0);
  await expect(picker).toBeFocused();

  await activate(picker, isMobile);
  const organic = list.getByRole('menuitemradio', { name: '오가닉', exact: true });
  await activate(organic, isMobile);
  await expect(page.locator('html')).toHaveAttribute('data-theme', 'organic');
  await expect(page.locator('[data-theme-toast]')).toHaveText('오가닉 테마');
  await expect(list).toHaveCount(0);
  await expect(picker).toBeFocused();

  await page.reload();
  await picker.press('ArrowDown');
  await expect(organic).toBeFocused();
  await expect(organic).toBeChecked();
  await page.keyboard.press('Escape');
  await expect(list).toHaveCount(0);
  await expect(picker).toBeFocused();
  await picker.press('Space');
  await page.keyboard.press('Home');
  await page.keyboard.press('ArrowDown');
  const glass = list.getByRole('menuitemradio', { name: '글래스모피즘', exact: true });
  await expect(glass).toBeFocused();
  await page.keyboard.press('Enter');
  await expect(page.locator('html')).toHaveAttribute('data-theme', 'glass');
  await expect(picker).toBeFocused();
});

test('메뉴에서 탭으로 나가거나 바깥을 누르면 포커스를 가두지 않는다', async ({ page, isMobile }) => {
  await page.goto('./playground/#projects');
  const picker = toggle(page), list = menu(page);
  await picker.press('Enter');
  await page.keyboard.press('Shift+Tab');
  await expect(list).toHaveCount(0);
  await expect(dice(page)).toBeFocused();
  await page.keyboard.press('Tab');
  await expect(picker).toBeFocused();
  await picker.press('ArrowDown');
  await page.keyboard.press('Tab');
  await expect(list).toHaveCount(0);
  await expect(picker).not.toBeFocused();

  await activate(picker, isMobile);
  const experiments = page.getByRole('navigation', { name: '주요 메뉴' }).getByRole('link', { name: '실험', exact: true });
  await activate(experiments, isMobile);
  await expect(page).toHaveURL(/#experiments$/);
  await expect(list).toHaveCount(0);
  await expect(picker).not.toBeFocused();
});

test('기존 5종 기록의 현재 테마와 남은 순서를 유지하고 신규 테마만 추첨 목록에 더한다', async ({ page }) => {
  await page.addInitScript(key => {
    if (!localStorage.getItem(key)) localStorage.setItem(key, JSON.stringify({ theme: 'clay', remaining: ['minimal', 'glass'] }));
  }, storageKey);
  await page.emulateMedia({ reducedMotion: 'reduce' });
  await page.goto('./playground/#projects');
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
