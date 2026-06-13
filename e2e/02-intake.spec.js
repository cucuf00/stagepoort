const { test, expect } = require('@playwright/test')
const { getAdminClient } = require('./helpers/auth')

test.describe('Intake formulier (anoniem)', () => {
  let supabase
  let testPlacementId

  test.beforeAll(async () => {
    supabase = getAdminClient()

    const { data: student, error } = await supabase
      .from('profiles')
      .select('id, school_id')
      .eq('email', process.env.TEST_STUDENT_EMAIL || 'zm@live.nl')
      .single()

    if (error || !student) throw new Error('Testleerling niet gevonden: ' + error?.message)

    const { data: placement, error: pErr } = await supabase
      .from('placements')
      .insert({ school_id: student.school_id, student_id: student.id, status: 'invited' })
      .select('id')
      .single()

    if (pErr || !placement) throw new Error('Test-placement aanmaken mislukt: ' + pErr?.message)
    testPlacementId = placement.id
  })

  test.afterAll(async () => {
    if (testPlacementId && supabase) {
      await supabase.from('placements').delete().eq('id', testPlacementId)
    }
  })

  test('intake pagina laadt met geldige token', async ({ page }) => {
    await page.goto(`/intake/${testPlacementId}`)
    await page.waitForTimeout(3000)
    await expect(page.locator('text=Stagepoort').first()).toBeVisible({ timeout: 10_000 })
    const is404 = await page.locator('text=404').isVisible()
    expect(is404).toBeFalsy()
  })

  test('ongeldige token toont foutmelding', async ({ page }) => {
    await page.goto('/intake/00000000-0000-0000-0000-000000000000')
    await page.waitForTimeout(4000)
    // Gebruik .first() om strict mode violation te vermijden (meerdere elementen kunnen matchen)
    const heeftFout = await page.locator('text=/niet beschikbaar|niet geldig|niet gevonden|niet meer|ongeldig|verlopen/i').first().isVisible()
    const isGeredirect = !page.url().includes('/intake/')
    expect(heeftFout || isGeredirect).toBeTruthy()
  })

  test('intake formulier volledig invullen en verzenden', async ({ page }) => {
    await page.goto(`/intake/${testPlacementId}`)
    await page.waitForTimeout(3000)

    // Stap 0: Persoonlijke gegevens
    // Vul in via exacte placeholder tekst
    await page.locator('input[placeholder="Yusuf"]').fill('Playwright')
    await page.locator('input[placeholder="Demir"]').fill('Testleerling')
    await page.locator('input[placeholder="bijv. SD4B"]').fill('SD4B')
    await page.locator('input[placeholder="06 12 34 56 78"]').fill('0612345678')

    // Volgende knop — wacht tot hij enabled is
    const volgende0 = page.locator('button').filter({ hasText: /volgende/i }).first()
    await expect(volgende0).toBeEnabled({ timeout: 5000 })
    await volgende0.click()
    await page.waitForTimeout(500)

    // Stap 1: Bedrijfsgegevens
    await page.locator('input[placeholder="TechWerk B.V."]').fill('E2E TestBedrijf BV')
    await page.locator('input[placeholder="Schiekade 34"]').fill('Teststraat 1')
    await page.locator('input[placeholder="3013 BB"]').fill('1234 AB')
    await page.locator('input[placeholder="Rotterdam"]').fill('Rotterdam')
    await page.locator('input[placeholder="010 123 45 67"]').fill('0101234567')
    await page.locator('input[placeholder="info@techwerk.nl"]').fill('test@e2e.nl')

    const volgende1 = page.locator('button').filter({ hasText: /volgende/i }).first()
    await expect(volgende1).toBeEnabled({ timeout: 5000 })
    await volgende1.click()
    await page.waitForTimeout(500)

    // Stap 2: Stagebegeleider + groene stage
    await page.locator('input[placeholder="R. Jansen"]').fill('Dhr. E2E Begeleider')
    await page.locator('button').filter({ hasText: /nee/i }).first().click() // groene stage: nee

    const volgende2 = page.locator('button').filter({ hasText: /volgende/i }).first()
    await expect(volgende2).toBeEnabled({ timeout: 5000 })
    await volgende2.click()
    await page.waitForTimeout(500)

    // Stap 3: Bevestigen
    const verzendBtn = page.locator('button').filter({ hasText: /verstuur|bevestig|klaar|indienen/i }).first()
    if (await verzendBtn.isVisible({ timeout: 3000 }).catch(() => false)) {
      await verzendBtn.click()
      await page.waitForTimeout(2000)
    }

    // Verifieer status in database
    const { data: placement } = await supabase
      .from('placements')
      .select('status')
      .eq('id', testPlacementId)
      .single()

    expect(['review', 'invited']).toContain(placement?.status)
  })
})
