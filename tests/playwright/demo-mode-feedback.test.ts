import { expect, test, type Page } from '@playwright/test';

const origin = process.env.DEMO_TEST_ORIGIN;
test.skip(!origin, 'Set DEMO_TEST_ORIGIN to a dedicated read-only demo.');

async function refused(page: Page, action: () => Promise<unknown>) {
  const response = page.waitForResponse(
    (result) =>
      ['POST', 'PATCH'].includes(result.request().method()) &&
      result.status() === 400,
  );
  await action();
  expect((await (await response).json()).error.reason).toBe('DEMO_READ_ONLY');
  const toast = page.locator('[data-slot="toast"]:not([data-ending-style])');
  await expect(toast).toHaveCount(1);
  await expect(toast).toContainText('This is a demo. Changes cannot be saved.');
  await expect(
    page.locator('main [role="alert"], [role="dialog"] [role="alert"]'),
  ).toHaveCount(0);
  await expect(
    page.getByText('Demo mode is enabled. Data cannot be modified.', {
      exact: true,
    }),
  ).toHaveCount(0);
  return toast;
}

test('demo refusals restore autosaved fields and leave submitted drafts with one toast', async ({
  page,
  context,
}) => {
  page.setDefaultTimeout(15000);
  const api = `${origin}/main/api`;
  expect(
    (
      await context.request.post(`${api}/demoMode/accounts/admin/signIn`, {
        headers: { Origin: origin! },
      })
    ).ok(),
  ).toBeTruthy();
  const document = await (await context.request.get(`${api}/swagger`)).json();
  expect(document.paths['/api/leads']).toBeDefined();
  expect(document.paths['/api/leads/{leadId}']).toBeDefined();
  expect(
    (await (await context.request.get(`${api}/demoMode/status`)).json()).data
      .enabled,
  ).toBe(true);
  const records = (
    await (await context.request.get(`${api}/leads?pageSize=100`)).json()
  ).data as { id: string; status: string }[];
  const lead = records.find((record) => record.status === 'new')!;
  expect(lead).toBeDefined();
  const before = (
    await (await context.request.get(`${api}/leads/${lead.id}`)).json()
  ).data.record;
  await context.addInitScript(() =>
    localStorage.setItem('nocobase.locale:/main/', 'en-US'),
  );
  const errors: string[] = [];
  page.on('pageerror', (error) => errors.push(error.message));
  await page.goto(`${origin}/main/leads/${lead.id}`);
  const name = page.locator('[data-edit-trigger][aria-label="Name"]').first();
  await expect(name).toHaveText(before.name, { timeout: 60000 });
  await name.dblclick();
  const input = page.getByRole('textbox', { name: 'Name', exact: true });
  await input.press('End');
  await input.pressSequentially(' demo edit');
  await refused(page, () =>
    page.getByRole('tab', { name: 'Timeline', exact: true }).click(),
  );
  await expect(input).toHaveCount(0);
  await expect(name).toHaveText(before.name);
  await page.screenshot({
    path: 'storage/demo-mode-verification/feedback/autosave.png',
    fullPage: true,
  });

  const source = page.locator('[data-edit-trigger][aria-label="Source"]');
  const oldSource = await source.innerText();
  await source.dblclick();
  await page.getByRole('combobox', { name: 'Source', exact: true }).click();
  await refused(page, () =>
    page
      .getByRole('option', {
        name: oldSource === 'Other' ? 'Website' : 'Other',
        exact: true,
      })
      .click(),
  );
  await expect(source).toHaveText(oldSource, { useInnerText: true });

  const introduction = page.locator(
    '[data-edit-trigger][aria-label="Introduction"]',
  );
  const oldIntroduction = await introduction.innerText();
  await introduction.press('Enter');
  const longText = page.getByRole('textbox', {
    name: 'Introduction',
    exact: true,
  });
  await longText.press('End');
  await longText.pressSequentially(' demo introduction');
  await refused(page, () => longText.press('Control+Enter'));
  await expect(longText).toHaveCount(0);
  await expect(introduction).toHaveText(oldIntroduction, {
    useInnerText: true,
  });
  const status = page.locator('[data-edit-trigger][aria-label="Status"]');
  const oldStatus = await status.innerText();
  await status.click();
  await refused(page, () =>
    page.getByRole('menuitem', { name: 'Working', exact: true }).click(),
  );
  await expect(status).toHaveText(oldStatus, { useInnerText: true });

  const amount = page.locator(
    '[data-edit-trigger][aria-label="Annual revenue"]',
  );
  const oldAmount = await amount.innerText();
  await amount.click();
  const amountInput = page.getByRole('textbox', {
    name: 'Annual revenue',
    exact: true,
  });
  await amountInput.fill('123456789');
  await refused(page, () => amountInput.press('Enter'));
  await expect(amountInput).toHaveCount(0);
  await expect(amount).toHaveText(oldAmount, { useInnerText: true });

  const location = page.locator('[data-edit-trigger][aria-label="Location"]');
  const oldLocation = await location.innerText();
  await location.click();
  const city = page.getByRole('textbox', { name: 'City', exact: true });
  await city.fill('Demo city');
  await refused(page, () =>
    page.getByRole('tab', { name: 'Timeline', exact: true }).click(),
  );
  await expect(city).toHaveCount(0);
  await expect(location).toHaveText(oldLocation, { useInnerText: true });

  const after = (
    await (await context.request.get(`${api}/leads/${lead.id}`)).json()
  ).data.record;
  expect(after).toEqual(before);

  await page.goto(`${origin}/main/leads`);
  await page.locator('a[href*="leads/"]').first().waitFor();
  await page.getByRole('button', { name: 'New lead', exact: true }).click();
  const dialog = page.getByRole('dialog', { name: 'New lead', exact: true });
  await expect(dialog).toBeVisible();
  const manual = dialog.getByRole('tab', {
    name: 'Fill in a form',
    exact: true,
  });
  if (await manual.isVisible()) await manual.click();
  await dialog
    .getByLabel('Name', { exact: true })
    .fill('Demo feedback verification');
  await dialog.getByRole('combobox', { name: 'Source', exact: true }).click();
  await page.getByRole('option', { name: 'Website', exact: true }).click();
  // The public demo admin may not sell; choose the required owner explicitly.
  await dialog.getByRole('combobox', { name: 'Owner', exact: true }).click();
  await page
    .getByRole('option')
    .filter({ hasNotText: /^Select…$/ })
    .first()
    .click();
  await expect(
    dialog.getByRole('combobox', { name: 'Owner', exact: true }),
  ).not.toHaveText('Select…');
  await refused(page, () =>
    dialog.getByRole('button', { name: 'Save', exact: true }).click(),
  );
  await expect(dialog).toBeVisible();
  await expect(dialog.getByLabel('Name', { exact: true })).toHaveValue(
    'Demo feedback verification',
  );
  await expect(
    dialog.getByRole('button', { name: 'Save', exact: true }),
  ).toBeEnabled();
  await page.screenshot({
    path: 'storage/demo-mode-verification/feedback/submission.png',
    fullPage: true,
  });
  expect(errors).toEqual([]);
});
