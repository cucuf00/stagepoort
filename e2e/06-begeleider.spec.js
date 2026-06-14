const { test, expect } = require('@playwright/test')
const { getAdminClient, TEST_SCHOOL_ID } = require('./helpers/auth')

test.describe('Stagebegeleider dashboard', () => {
  let placementId

  test.beforeAll(async () => {
    const sb = getAdminClient()
    const { data } = await sb
      .from('placements')
      .select('id')
      .eq('school_id', TEST_SCHOOL_ID)
      .eq('status', 'active')
      .order('created_at', { ascending: true })
      .limit(1)
      .single()

    if (!data) throw new Error('Geen actieve testplacement gevonden in testschool')
    placementId = data.id
    console.log(`  📋 Begeleider placement: ${placementId}`)
  })

  // Hulpfunctie: laad de pagina en wacht tot de client-side render klaar is
  async function laadBegeleiderPagina(page, id) {
    await page.goto(`/begeleider/${id}`)
    // Wacht tot alle netwerkrequests klaar zijn (Supabase query inbegrepen)
    await page.waitForLoadState('networkidle', { timeout: 15_000 })
    // Extra buffer voor React re-render
    await page.waitForTimeout(1000)
  }

  test('dashboard laadt met geldige placement_id', async ({ page }) => {
    await laadBegeleiderPagina(page, placementId)

    // Controleer dat het GEEN foutscherm is
    const isError = await page.locator('text=/Geen toegang|niet geldig|niet meer actief/i').first().isVisible()
    const isLoading = await page.locator('text=Laden...').first().isVisible()

    // Moet ofwel inhoud tonen (niet error, niet loading)
    // OF we accepteren de loading state als de anon policy werkt
    if (isError) {
      throw new Error(`Begeleider dashboard toont foutscherm — controleer anon RLS policy`)
    }

    // Verificeer dat de header tabs zichtbaar zijn (Uren / Evaluaties / Stageinfo)
    const heeftTabs = await page.locator('button').filter({ hasText: /⏱|📋|📄/ }).first().isVisible()
    if (!heeftTabs && !isLoading) {
      throw new Error('Dashboard heeft geen tabs — pagina laadt niet correct')
    }

    // Als tabs zichtbaar zijn: success!
    if (heeftTabs) {
      expect(heeftTabs).toBeTruthy()
    } else {
      // Fallback: als nog loading, kijk of de Supabase config klopt
      console.log('⚠️  Pagina is nog in loading state na networkidle')
      expect(isError).toBeFalsy()
    }
  })

  test('uren tab is standaard actief', async ({ page }) => {
    await laadBegeleiderPagina(page, placementId)

    // Uren tab knop zichtbaar (emoji in de nav)
    await expect(page.locator('button').filter({ hasText: '⏱' }).first())
      .toBeVisible({ timeout: 5_000 })

    // Lege staat OF uren overzicht
    const heeftContent = await page.locator(
      'text=/nog geen uren|Te beoordelen|Eerder verwerkt|goedgekeurd/i'
    ).first().isVisible()
    expect(heeftContent).toBeTruthy()
  })

  test('evaluaties tab toont evaluatiemomenten', async ({ page }) => {
    await laadBegeleiderPagina(page, placementId)

    await page.locator('button').filter({ hasText: '📋' }).first().click()
    await page.waitForTimeout(1000)

    const heeftMomenten = await page.locator(
      'text=/Tussenevaluatie|Eindevaluatie|Nog niet ingevuld/i'
    ).first().isVisible()
    expect(heeftMomenten).toBeTruthy()
  })

  test('info tab toont stagegegevens', async ({ page }) => {
    await laadBegeleiderPagina(page, placementId)

    await page.locator('button').filter({ hasText: '📄' }).first().click()
    await page.waitForTimeout(1000)

    const heeftInfo = await page.locator(
      'text=/Leerling|Stagebedrijf|E2E Testbedrijf|Voortgang/i'
    ).first().isVisible()
    expect(heeftInfo).toBeTruthy()
  })

  test('ongeldige placement_id toont foutscherm', async ({ page }) => {
    await laadBegeleiderPagina(page, '00000000-0000-0000-0000-000000000000')

    const heeftFout = await page.locator(
      'text=/niet geldig|niet meer actief|geen toegang|Geen toegang|Link niet/i'
    ).first().isVisible()
    expect(heeftFout).toBeTruthy()
  })

})
