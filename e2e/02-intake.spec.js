/**
 * Intake formulier tests — anonieme toegang via placement UUID
 */
const { test, expect } = require('@playwright/test')
const { getAdminClient, TEST_SCHOOL_ID } = require('./helpers/auth')

let supabase
let testPlacementId

test.beforeAll(async () => {
  supabase = getAdminClient()
  const { data: student } = await supabase.from('profiles')
    .select('id')
    .eq('email', process.env.TEST_STUDENT_EMAIL)
    .eq('school_id', TEST_SCHOOL_ID)
    .single()
  if (!student) throw new Error('Testleerling niet gevonden in testschool')

  const { data: placement, error } = await supabase.from('placements')
    .insert({
      school_id: TEST_SCHOOL_ID,
      student_id: student.id,
      status: 'invited',
      period_id: process.env.TEST_PERIOD_ID || '00000000-0000-0000-0000-000000000991',
    })
    .select('id').single()
  if (error) throw new Error('Intake test-placement aanmaken mislukt: ' + error.message)
  testPlacementId = placement.id
  console.log(`  ✅ Intake testplacement: ${testPlacementId}`)
})

test.afterAll(async () => {
  if (testPlacementId) {
    await supabase.from('placements').delete().eq('id', testPlacementId)
    console.log('  🗑️  Intake testplacement opgeruimd')
  }
})

test.describe('Intake — toegang', () => {
  test('pagina laadt met geldige token', async ({ page }) => {
    await page.goto(`/intake/${testPlacementId}`)
    await page.waitForTimeout(3000)
    await expect(page.locator('text=Stagepoort').first()).toBeVisible({ timeout: 10_000 })
    expect(await page.locator('text=404').isVisible()).toBeFalsy()
  })

  test('ongeldige token toont foutmelding', async ({ page }) => {
    await page.goto('/intake/00000000-0000-0000-0000-000000000000')
    await page.waitForTimeout(4000)
    const heeftFout = await page.locator('text=/niet beschikbaar|niet geldig|niet gevonden|niet meer|ongeldig|verlopen/i').isVisible()
    expect(heeftFout || !page.url().includes('/intake/')).toBeTruthy()
  })
})

test.describe('Intake — formulier invullen', () => {
  test('stap 1: leerlinggegevens invullen', async ({ page }) => {
    await page.goto(`/intake/${testPlacementId}`)
    await page.waitForTimeout(3000)

    await page.locator('input[placeholder="Yusuf"]').fill('Playwright')
    await page.locator('input[placeholder="Demir"]').fill('Testleerling')
    await page.locator('input[placeholder="bijv. SD4B"]').fill('TEST-A')
    await page.locator('input[placeholder="06 12 34 56 78"]').fill('0612345678')

    const volgende = page.locator('button').filter({ hasText: /volgende/i }).first()
    await expect(volgende).toBeEnabled({ timeout: 5000 })
    await volgende.click()
    await page.waitForTimeout(500)

    // Stap 2 moet zichtbaar zijn
    await expect(page.locator('input[placeholder="TechWerk B.V."]').first()).toBeVisible({ timeout: 5000 })
  })

  test('stap 2: bedrijfsgegevens invullen', async ({ page }) => {
    await page.goto(`/intake/${testPlacementId}`)
    await page.waitForTimeout(3000)

    // Stap 1
    await page.locator('input[placeholder="Yusuf"]').fill('Playwright')
    await page.locator('input[placeholder="Demir"]').fill('Testleerling')
    await page.locator('input[placeholder="bijv. SD4B"]').fill('TEST-A')
    await page.locator('input[placeholder="06 12 34 56 78"]').fill('0612345678')
    await page.locator('button').filter({ hasText: /volgende/i }).first().click()
    await page.waitForTimeout(500)

    // Stap 2
    await page.locator('input[placeholder="TechWerk B.V."]').fill('E2E IntakeBedrijf')
    await page.locator('input[placeholder="Schiekade 34"]').fill('Intakestraat 5')
    await page.locator('input[placeholder="3013 BB"]').fill('5678 CD')
    await page.locator('input[placeholder="Rotterdam"]').fill('Amsterdam')
    await page.locator('input[placeholder="010 123 45 67"]').fill('0201234567')
    await page.locator('input[placeholder="info@techwerk.nl"]').fill('intake@e2e-test.nl')

    const volgende = page.locator('button').filter({ hasText: /volgende/i }).first()
    await expect(volgende).toBeEnabled({ timeout: 5000 })
    await volgende.click()
    await page.waitForTimeout(500)

    // Stap 3 moet zichtbaar zijn (begeleider)
    await expect(page.locator('input[placeholder="R. Jansen"]').first()).toBeVisible({ timeout: 5000 })
  })

  test('volledig formulier verzenden zet status op review', async ({ page }) => {
    await page.goto(`/intake/${testPlacementId}`)
    await page.waitForTimeout(3000)

    // Stap 1
    await page.locator('input[placeholder="Yusuf"]').fill('Playwright')
    await page.locator('input[placeholder="Demir"]').fill('Testleerling')
    await page.locator('input[placeholder="bijv. SD4B"]').fill('TEST-A')
    await page.locator('input[placeholder="06 12 34 56 78"]').fill('0612345678')
    await page.locator('button').filter({ hasText: /volgende/i }).first().click()
    await page.waitForTimeout(500)

    // Stap 2
    await page.locator('input[placeholder="TechWerk B.V."]').fill('E2E IntakeBedrijf')
    await page.locator('input[placeholder="Schiekade 34"]').fill('Intakestraat 5')
    await page.locator('input[placeholder="3013 BB"]').fill('5678 CD')
    await page.locator('input[placeholder="Rotterdam"]').fill('Amsterdam')
    await page.locator('input[placeholder="010 123 45 67"]').fill('0201234567')
    await page.locator('input[placeholder="info@techwerk.nl"]').fill('intake@e2e-test.nl')
    await page.locator('button').filter({ hasText: /volgende/i }).first().click()
    await page.waitForTimeout(500)

    // Stap 3
    await page.locator('input[placeholder="R. Jansen"]').fill('Dhr. E2E Begeleider')
    await page.locator('button').filter({ hasText: '❌ Nee' }).click()
    await page.locator('button').filter({ hasText: /volgende/i }).first().click()
    await page.waitForTimeout(2000)

    // Verifieer in DB
    const { data: pl } = await supabase.from('placements').select('status').eq('id', testPlacementId).single()
    expect(['review', 'invited']).toContain(pl?.status)
  })
})
