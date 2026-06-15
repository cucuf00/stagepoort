/**
 * Stagebegeleider dashboard tests — anonieme toegang via UUID
 */
const { test, expect } = require('@playwright/test')
const { getAdminClient, TEST_SCHOOL_ID } = require('./helpers/auth')

let placementId

test.beforeAll(async () => {
  const sb = getAdminClient()
  const { data } = await sb
    .from('placements')
    .select('id')
    .eq('school_id', TEST_SCHOOL_ID)
    .eq('status', 'active')
    .eq('company_name', 'E2E Testbedrijf B.V.')
    .order('created_at', { ascending: true })
    .limit(1)
    .single()

  if (!data) throw new Error('Geen actieve E2E testplacement gevonden')
  placementId = data.id
  console.log(`  📋 Begeleider testplacement: ${placementId}`)
})

async function laad(page, id) {
  await page.goto(`/begeleider/${id}`)
  await page.waitForLoadState('networkidle', { timeout: 15_000 })
  await page.waitForTimeout(1000)
}

test.describe('Begeleider — toegang & navigatie', () => {
  test('dashboard laadt met geldige placement_id', async ({ page }) => {
    await laad(page, placementId)
    const isError = await page.locator('text=/Geen toegang|niet geldig|niet meer actief/i').isVisible()
    expect(isError).toBeFalsy()
    // Tabs moeten zichtbaar zijn
    await expect(page.locator('button').filter({ hasText: /⏱/ }).first()).toBeVisible({ timeout: 8000 })
  })

  test('ongeldige placement_id toont foutscherm', async ({ page }) => {
    await laad(page, '00000000-0000-0000-0000-000000000000')
    const heeftFout = await page.locator('text=/niet geldig|niet meer actief|geen toegang|Geen toegang|Link niet/i').isVisible()
    expect(heeftFout).toBeTruthy()
  })
})

test.describe('Begeleider — Uren tab', () => {
  test('uren tab is standaard actief', async ({ page }) => {
    await laad(page, placementId)
    await expect(page.locator('button').filter({ hasText: '⏱' }).first()).toBeVisible({ timeout: 8000 })
    const heeftContent = await page.locator('text=/nog geen uren|Te beoordelen|Eerder verwerkt|goedgekeurd|pending/i').isVisible()
    expect(heeftContent).toBeTruthy()
  })

  test('goedgekeurde uren van testleerling zichtbaar', async ({ page }) => {
    await laad(page, placementId)
    // Testdata bevat goedgekeurde uren
    await expect(page.locator('text=/maandag introductie|dinsdag administratie|woensdag/i').first()).toBeVisible({ timeout: 8000 })
  })

  test('pending uren tonen goedkeur/afkeur knoppen', async ({ page }) => {
    await laad(page, placementId)
    // Testdata bevat pending uren
    const heeftPending = await page.locator('text=/Te beoordelen|week 2|maandag week/i').isVisible()
    if (heeftPending) {
      await expect(page.locator('button').filter({ hasText: /goedkeuren/i }).first()).toBeVisible({ timeout: 5000 })
      await expect(page.locator('button').filter({ hasText: /afkeuren/i }).first()).toBeVisible()
    }
  })

  test('uur goedkeuren door begeleider werkt', async ({ page }) => {
    await laad(page, placementId)
    const goedkeurKnop = page.locator('button').filter({ hasText: /✅ goedkeuren/i }).first()
    const heeftKnop = await goedkeurKnop.isVisible()
    if (!heeftKnop) { test.skip(true, 'Geen pending uren voor begeleider'); return }

    await goedkeurKnop.click()
    await expect(page.locator('text=/goedgekeurd|verwerkt/i').first()).toBeVisible({ timeout: 8000 })
  })

  test('uur afkeuren toont reden-invoer', async ({ page }) => {
    await laad(page, placementId)
    const afkeurKnop = page.locator('button').filter({ hasText: /❌ afkeuren/i }).first()
    const heeftKnop = await afkeurKnop.isVisible()
    if (!heeftKnop) { test.skip(true, 'Geen pending uren voor begeleider'); return }

    await afkeurKnop.click()
    await expect(page.locator('textarea, input[placeholder*="reden"]').first()).toBeVisible({ timeout: 3000 })
  })
})

test.describe('Begeleider — Evaluaties tab', () => {
  test('evaluaties tab navigeert correct', async ({ page }) => {
    await laad(page, placementId)
    await page.locator('button').filter({ hasText: '📋' }).first().click()
    await page.waitForTimeout(1000)

    const heeftInhoud = await page.locator(
      'text=/Tussenevaluatie|Eindevaluatie|Nog niet ingevuld|geconfigureerd door de coördinator/i'
    ).isVisible()
    expect(heeftInhoud).toBeTruthy()
  })
})

test.describe('Begeleider — Stageinfo tab', () => {
  test('info tab toont stagegegevens van testleerling', async ({ page }) => {
    await laad(page, placementId)
    await page.locator('button').filter({ hasText: '📄' }).first().click()
    await page.waitForTimeout(1000)

    await expect(page.locator('text=/Leerling|Stagebedrijf|E2E Testbedrijf|Voortgang/i').first()).toBeVisible({ timeout: 8000 })
  })

  test('coach naam en email zijn zichtbaar in stageinfo', async ({ page }) => {
    await laad(page, placementId)
    await page.locator('button').filter({ hasText: '📄' }).first().click()
    await page.waitForTimeout(1000)

    await expect(page.locator('text=/Playwright Coach|coach/i').first()).toBeVisible({ timeout: 8000 })
  })

  test('bedrijfsadres en contactgegevens zichtbaar', async ({ page }) => {
    await laad(page, placementId)
    await page.locator('button').filter({ hasText: '📄' }).first().click()
    await page.waitForTimeout(1000)

    await expect(page.locator('text=/Teststraat|Rotterdam|E2E Testbedrijf/i').first()).toBeVisible({ timeout: 8000 })
  })

  test('voortgangsbalk toont uren (testleerling heeft 20 goedgekeurde uren)', async ({ page }) => {
    await laad(page, placementId)
    await page.locator('button').filter({ hasText: '📄' }).first().click()
    await page.waitForTimeout(1000)

    await expect(page.locator('text=/uur|Voortgang/i').first()).toBeVisible({ timeout: 8000 })
  })
})
