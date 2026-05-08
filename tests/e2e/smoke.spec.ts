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
  await expect(page.getByRole('cell', { name: 'North' }).first()).toBeVisible({
    timeout: 30_000,
  })

  await page.getByRole('button', { name: 'Add tile' }).click()
  await expect(page.getByRole('heading', { name: /revenue by region/i })).toBeVisible({
    timeout: 30_000,
  })

  await page.getByRole('button', { name: 'Save' }).click()
  await expect(page.getByText('Saved locally')).toBeVisible()
})
