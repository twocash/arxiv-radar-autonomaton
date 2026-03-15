/**
 * E2E Test: Reject Path
 *
 * Tests that rejecting a briefing doesn't stop the pipeline flow.
 */

import { test, expect } from '@playwright/test'

test.describe('Reject Path', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/')
    await page.evaluate(() => localStorage.clear())
    await page.reload()
    await page.waitForLoadState('networkidle')
  })

  test('Rejecting a briefing should not stop the pipeline', async ({ page }) => {
    // Start pipeline
    const runButton = page.locator('button:has-text("RUN")')
    await runButton.click()

    // Wait for and resolve Jidoka
    const jidokaAlert = page.locator('text=PIPELINE HALTED')
    await expect(jidokaAlert).toBeVisible({ timeout: 15000 })

    const kaizenOption = page.locator('button:has-text("Primary claim is constrained-task superiority")')
    await kaizenOption.click()

    // Wait for first briefing to appear
    await page.waitForTimeout(3000)

    // Find and click REJECT on first briefing
    const rejectButton = page.locator('button:has-text("Reject")').first()
    await expect(rejectButton).toBeVisible({ timeout: 10000 })

    console.log('Clicking Reject...')
    await rejectButton.click()

    // Wait and check pipeline state
    await page.waitForTimeout(2000)

    // Pipeline should NOT be stuck - should show more briefings or continue processing
    const approveButtons = await page.locator('button:has-text("Approve")').count()
    const rejectButtons = await page.locator('button:has-text("Reject")').count()

    console.log('After reject - Approve buttons:', approveButtons)
    console.log('After reject - Reject buttons:', rejectButtons)

    // Should still have briefings to process (we rejected one, others should remain)
    expect(approveButtons + rejectButtons).toBeGreaterThan(0)
  })
})
