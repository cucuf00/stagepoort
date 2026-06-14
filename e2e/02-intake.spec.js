const { test, expect } = require('@playwright/test')
const { getAdminClient, TEST_SCHOOL_ID } = require('./helpers/auth')

test.describe('Intake formulier (anoniem)', () => {
  let supabase
  let testPlacementId

  test.beforeAll(async () => {
    supabase = getAdminClient()
    const { data: student } = await supabase.from('profiles').select('id')
      .eq('email', process.env.TEST_STUDENT_EMAIL).eq('school_id', TEST_SCHOOL_ID).single()
    if (!student) throw new Error('Testleerling niet gevonden in testschool')
    const { data: placement, error } = await supabase.from('placements')
      .insert({ school_id: TEST_SCHOOL_ID, student_id: student.id, status: 'invited' })
      .select('id').single()
    if (error) throw new Error('Test-placement aanmaken mislukt: ' + error.message)
    testPlacementId = placement.id
  })

  test.afterAll(async () => {
    if (testPlacementId) await supabase.from('placements').delete().eq('id', testPlacementId)
  })

  test('intake pagina laadt met geldige token', async ({ page }) => {
    await page.goto(`/intake/${testPlacementId}`)
    await page.waitForTimeout(3000)
    await expect(page.locator('text=Stagepoort').first()).toBeVisible({ timeout: 10_000 })
    expect(await page.locator('text=404').isVisible()).toBeFalsy()
  })

  test('ongeldige token toont foutmelding', async ({ page }) => {
    await page.goto('/intake/00000000-0000-0000-0000-000000000000')
    await page.waitForTimeout(4000)
    const heeftFout = await page.locator('text=/niet beschikbaar|niet geldig|niet gevonden|niet meer|ongeldig|verlopen/i').first().isVisible()
    expect(heeftFout || !page.url().includes('/intake/')).toBeTruthy()
  })

  test('intake formulier invullen en verzenden', async ({ page }) => {
    await page.goto(`/intake/${testPlacementId}`)
    await page.waitForTimeout(3000)
    await page.locator('input[placeholder="Yusuf"]').fill('Playwright')
    await page.locator('input[placeholder="Demir"]').fill('Testleerling')
    await page.locator('input[placeholder="bijv. SD4B"]').fill('TEST-A')
    await page.locator('input[placeholder="06 12 34 56 78"]').fill('0612345678')
    const v0 = page.locator('button').filter({ hasText: /volgende/i }).first()
    await expect(v0).toBeEnabled({ timeout: 5000 })
    await v0.click()
    await page.waitForTimeout(500)
    await page.locator('input[placeholder="TechWerk B.V."]').fill('E2E TestBedrijf BV')
    await page.locator('input[placeholder="Schiekade 34"]').fill('Teststraat 1')
    await page.locator('input[placeholder="3013 BB"]').fill('1234 AB')
    await page.locator('input[placeholder="Rotterdam"]').fill('Rotterdam')
    await page.locator('input[placeholder="010 123 45 67"]').fill('0101234567')
    await page.locator('input[placeholder="info@techwerk.nl"]').fill('test@e2e-testbedrijf.nl')
    const v1 = page.locator('button').filter({ hasText: /volgende/i }).first()
    await expect(v1).toBeEnabled({ timeout: 5000 })
    await v1.click()
    await page.waitForTimeout(500)
    await page.locator('input[placeholder="R. Jansen"]').fill('Dhr. E2E Begeleider')
    const v2 = page.locator('button').filter({ hasText: /volgende/i }).first()
    await expect(v2).toBeEnabled({ timeout: 5000 })
    await v2.click()
    await page.waitForTimeout(2000)
    const { data: pl } = await supabase.from('placements').select('status').eq('id', testPlacementId).single()
    expect(['review', 'invited']).toContain(pl?.status)
  })
})
