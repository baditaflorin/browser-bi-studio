import { expect, test } from '@playwright/test'

test('loads sample data, runs SQL, adds a chart, and saves locally', async ({ page }) => {
  await page.goto('/browser-bi-studio/')

  await expect(page.getByRole('heading', { name: 'Browser BI Studio' })).toBeVisible()
  await expect(page.getByRole('link', { name: /Star/ })).toHaveAttribute(
    'href',
    'https://github.com/baditaflorin/browser-bi-studio',
  )
  await expect(page.getByRole('link', { name: /Support/ })).toHaveAttribute(
    'href',
    'https://www.paypal.com/paypalme/florinbadita',
  )

  await page.getByRole('button', { name: 'Sample' }).click()
  await expect(page.locator('.dataset-summary strong')).toHaveText('sample_sales.csv', {
    timeout: 30_000,
  })

  await page.getByRole('button', { name: 'Run SQL' }).click()
  await expect(page.getByRole('cell', { name: '18420' }).first()).toBeVisible({
    timeout: 30_000,
  })

  await page.getByRole('button', { name: 'Add tile' }).click()
  await expect(page.getByRole('heading', { name: /revenue by date/i })).toBeVisible({
    timeout: 30_000,
  })

  await page.getByRole('button', { name: 'Save' }).click()
  await expect(page.getByText('Saved locally', { exact: true })).toBeVisible()

  const outputPanel = page
    .locator('section')
    .filter({ has: page.getByRole('heading', { name: 'Output' }) })
  const csvDownloadPromise = page.waitForEvent('download')
  await outputPanel.getByRole('button', { name: 'CSV', exact: true }).click()
  const csvDownload = await csvDownloadPromise
  expect(csvDownload.suggestedFilename()).toMatch(/sample-sales-\d{4}-\d{2}-\d{2}\.csv/)

  const stateDownloadPromise = page.waitForEvent('download')
  await outputPanel.getByRole('button', { name: 'State', exact: true }).click()
  const stateDownload = await stateDownloadPromise
  const statePath = await stateDownload.path()
  expect(statePath).toBeTruthy()

  await page.getByRole('button', { name: 'Reset', exact: true }).click()
  await expect(page.getByText('Local dashboard cleared')).toBeVisible()
  await page
    .locator('label.file-button')
    .filter({ hasText: 'State' })
    .locator('input')
    .setInputFiles(statePath ?? '')
  await expect(page.locator('.dataset-summary strong')).toHaveText('sample_sales.csv', {
    timeout: 30_000,
  })
})

test('imports pasted CSV text and renders a useful first result', async ({ page }) => {
  await page.goto('/browser-bi-studio/')

  await page.getByLabel('Paste CSV or TSV rows').fill('region,revenue\nEast,5\nWest,9')
  await page.getByRole('button', { name: 'Import text' }).click()

  await expect(page.locator('.dataset-summary strong')).toHaveText('pasted-table.csv', {
    timeout: 30_000,
  })
  await expect(page.getByRole('cell', { name: 'East' }).first()).toBeVisible({
    timeout: 30_000,
  })
})
