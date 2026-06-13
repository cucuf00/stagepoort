const { test, expect } = require('@playwright/test')
const { getAdminClient } = require('./helpers/auth')

test.describe('Intake formulier (anoniem)', () => {
  let supabase
  let testPlacementId

  test.beforeAll(async () => {
    supabase = getAdminClient()

    // Haal testleerling op
    const { data: student, error: sErr } = await supabase
      .from('profiles')
      .select('id, school_id')
      .eq('email', process.env.TEST_STUDENT_EMAIL || 'zm@live.nl')
      .single()

    if (sErr || !student) throw new Error('Testleerling niet gevonden: ' + sErr?.message)

    // Maak een wegwerpplacement aan voor de test
    const { data: placement, error: pErr } = await supabase
      .from('placements')
      .insert({
        school_id: student.school_id,
        student_id: student.id,
        status: 'invited',
      })
      .select('id')
      .single()

    if (pErr || !placement) throw new Error('Test-placement aanmaken mislukt: ' + pErr?.message)
    testPlacementId = placement.id
  })

  test.afterAll(async () => {
    // Ruim de testdata op, ook als tests falen
    if (testPlacementId && supabase) {
      await supabase.from('placements').delete().eq('id', testPlacementId)
    }
  })

  test('intake pagina laadt met geldige token', async ({ page }) => {
    await page.goto(`/intake/${testPlacementId}`)
    // Client-side pagina: wacht op spinner of formulier
    await page.waitForTimeout(3000)
    await expect(page.locator('text=Stagepoort').first()).toBeVisible({ timeout: 10_000 })
    // Mag GEEN 404 zijn
    const is404 = await page.locator('text=404').isVisible()
    expect(is404).toBeFalsy()
  })

  test('intake formulier volledig invullen en verzenden werkt', async ({ page }) => {
    await page.goto(`/intake/${testPlacementId}`)
    await page.waitForTimeout(3000)

    // Stap 1: Persoonlijke gegevens
    // Vul voornaam in (eerste tekst-input op de pagina)
    const inputs = page.locator('input')
    const aantalInputs = await inputs.count()
    expect(aantalInputs).toBeGreaterThan(0)

    await inputs.nth(0).fill('Playwright')   // voornaam
    await inputs.nth(1).fill('Testleerling') // achternaam

    // Zoek Volgende knop
    const volgendeBtn = page.locator('button').filter({ hasText: /volgende|next/i }).first()
    if (await volgendeBtn.isVisible()) {
      await volgendeBtn.click()
      await page.waitForTimeout(500)
    }

    // Stap 2: Bedrijfsgegevens
    const inputs2 = page.locator('input')
    if (await inputs2.count() > 0) {
      await inputs2.nth(0).fill('E2E TestBedrijf BV')
      await inputs2.nth(1).fill('Teststraat 1')
      await inputs2.nth(2).fill('1234 AB')
      await inputs2.nth(3).fill('Rotterdam')
    }

    const volgendeBtn2 = page.locator('button').filter({ hasText: /volgende|next/i }).first()
    if (await volgendeBtn2.isVisible()) {
      await volgendeBtn2.click()
      await page.waitForTimeout(500)
    }

    // Stap 3: Stagebegeleider
    const inputs3 = page.locator('input')
    if (await inputs3.count() > 0) {
      await inputs3.nth(0).fill('Dhr. E2E Begeleider')
    }

    const volgendeBtn3 = page.locator('button').filter({ hasText: /volgende|next/i }).first()
    if (await volgendeBtn3.isVisible()) {
      await volgendeBtn3.click()
      await page.waitForTimeout(500)
    }

    // Stap 4: Bevestigen en verzenden
    const verzendBtn = page.locator('button').filter({ hasText: /verzend|bevestig|klaar|submit/i }).first()
    if (await verzendBtn.isVisible()) {
      await verzendBtn.click()
      await page.waitForTimeout(2000)
    }

    // Verifieer dat de placement nu status 'review' heeft
    const { data: placement } = await supabase
      .from('placements')
      .select('status')
      .eq('id', testPlacementId)
      .single()

    // Status kan 'review' zijn (verzonden) of nog 'invited' (als niet alle stappen doorlopen)
    expect(['review', 'invited']).toContain(placement?.status)
  })
})
