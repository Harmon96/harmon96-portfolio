import { expect, test } from '@playwright/test';

test('첫 방문에 세 번 물방울을 떨어뜨리면 전시장이 열리고 재방문은 바로 진입한다', async ({ page, isMobile }) => {
  await page.goto('./');
  const dialog = page.getByRole('dialog', { name: '물방울을 떨어뜨려 주세요' });
  const water = dialog.getByRole('button', { name: '물방울 떨어뜨리기' });
  await expect(dialog).toBeVisible();
  const trail = dialog.locator('.water-trail span');
  if (!isMobile) {
    await page.mouse.move(45, 180);
    await page.mouse.move(200, 200, { steps: 10 });
    await expect(trail.first()).toBeVisible();
    await expect(trail.first()).toHaveText(/[·◦]/);
    await expect(dialog.locator('#water-progress')).toHaveText('물방울 세 개 중 0개');
    await expect(trail).toHaveCount(0);
  }
  let firstWidth = 0;
  for (let count = 1; count <= 3; count++) {
    const position = { x: 40 + count * 10, y: 200 };
    if (isMobile) await water.tap({ position });
    else await water.click({ position });
    const ring = water.locator('.water-ring').nth(count - 1);
    await expect(ring).toContainText('·');
    await expect(ring).toContainText('◦');
    const size = await ring.evaluate((element) => {
      const bounds = element.getBoundingClientRect();
      return { x: bounds.x + bounds.width / 2, y: bounds.y + bounds.height / 2, width: element.clientWidth };
    });
    expect(size.x).toBeCloseTo(position.x, 0);
    expect(size.y).toBeCloseTo(position.y, 0);
    if (count === 1) firstWidth = size.width;
    if (count === 3) expect(size.width).toBeGreaterThan(firstWidth);
    if (isMobile) await expect(trail).toHaveCount(0);
    if (count < 3) await expect(dialog.locator('#water-progress')).toHaveText('물방울 세 개 중 ' + count + '개');
  }
  await expect(dialog).toHaveCount(0);
  await expect(page.locator('#main')).toBeFocused();
  await page.reload();
  await expect(page.getByRole('button', { name: '인트로 다시 보기' })).toBeAttached();
  await expect(dialog).toHaveCount(0);
  await page.getByRole('button', { name: '인트로 다시 보기' }).click();
  await expect(dialog.locator('#water-progress')).toHaveText('물방울 세 개 중 0개');
  await dialog.getByRole('button', { name: '건너뛰기' }).click();
  await expect(page.locator('#main')).toBeFocused();
  await expect.poll(() => page.evaluate(() => window.scrollY)).toBe(0);
});

test('모션 감소 설정에서 키보드로 입장하고 Escape로 다시 보기를 닫는다', async ({ page }) => {
  await page.emulateMedia({ reducedMotion: 'reduce' });
  await page.goto('./');
  const dialog = page.getByRole('dialog');
  await expect(dialog.getByRole('button', { name: '물방울 떨어뜨리기' })).toBeFocused();
  await page.mouse.move(200, 200, { steps: 10 });
  await expect(dialog.locator('.water-trail span').first()).toBeHidden();
  await page.keyboard.press('Space');
  await expect(dialog.locator('#water-progress')).toHaveText('물방울 세 개 중 1개');
  await expect(dialog.locator('.water-ring')).toBeHidden();
  await page.keyboard.press('Enter');
  await page.keyboard.press('Enter');
  await expect(dialog).toHaveCount(0);
  await page.getByRole('button', { name: '인트로 다시 보기' }).click();
  await expect(dialog).toBeVisible();
  await page.keyboard.press('Escape');
  await expect(dialog).toHaveCount(0);
});

test('홈의 섹션을 직접 열면 인트로를 거치지 않는다', async ({ page }) => {
  await page.goto('./#about');
  await expect(page.getByRole('button', { name: '인트로 다시 보기' })).toBeAttached();
  await expect(page.getByRole('dialog')).toHaveCount(0);
  await expect(page.locator('#about')).toBeInViewport();
});
