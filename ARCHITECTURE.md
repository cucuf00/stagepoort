# Stagepoort — Architectuurdocument

> **Dit is de Bron van Waarheid voor het Stagepoort-project.**  
> Elke toekomstige wijziging — of het nu een nieuwe feature, database-aanpassing of beveiligingsregel is — moet teruggevonden kunnen worden in dit document.  
> Houd dit bestand actueel bij elke significante wijziging.

---

## 1. Project Overzicht

**Stagepoort** is een multi-tenant SaaS-platform voor VMBO/MBO-scholen dat het volledige stageproces digitaliseert: van leerlingimport en intakeformulier tot urenregistratie, opdrachten, dagelijkse reflecties en officiële evaluaties.

| Component | Technologie | Details |
|-----------|-------------|---------|
| Frontend | **Next.js 16** (App Router) | JavaScript (geen TypeScript in gebruik) |
| Database + Auth | **Supabase** (PostgreSQL) | Project: `vnarhxsxbbmbowtvzfaj`, regio EU Frankfurt |
| Hosting | **Vercel** | Auto-deploy bij push naar `main` |
| E-mail | **Resend** via custom SMTP | Verzend domein: `stagepoort.nl`, afzender: `noreply@stagepoort.nl` |
| Styling | Inline CSS | Geen Tailwind actief ondanks aanwezigheid in devDependencies |
| Testen | **Playwright** | E2E tests via GitHub Actions, draait op Node.js 24 |
| Monitoring | **Sentry** (EU datacenter) | DSN: `o4511563875811328.ingest.de.sentry.io`, project: `4511563912511568` |

### Omgevingsvariabelen

```
NEXT_PUBLIC_SUPABASE_URL       https://vnarhxsxbbmbowtvzfaj.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY  sb_publishable_...   (publieke sleutel)
RESEND_API_KEY                 re_...               (e-mail verzending)
NEXT_PUBLIC_SITE_URL           https://stagepoort.vercel.app
NEXT_PUBLIC_SENTRY_DSN         https://21b229a5f09e224a627a6e5399f3b084@o4511563875811328.ingest.de.sentry.io/4511563912511568
```

> ⚠️ Er is **geen** `SUPABASE_SERVICE_ROLE_KEY` geconfigureerd in Vercel. De service role key staat alleen in **GitHub Secrets** voor de Playwright-teststraat.

### Supabase SMTP-configuratie

Magic link e-mails gaan via Resend als custom SMTP provider:
```
Host:     smtp.resend.com
Port:     465
Username: resend
Password: RESEND_API_KEY
From:     noreply@stagepoort.nl
```
DNS: DKIM al geverifieerd via Resend voor domein `stagepoort.nl` (provider: TransIP). E-mails van `@lentiz.nl` gaan naar quarantaine door Microsoft 365-beleid — IT-whitelist vereist voor `stagepoort.nl`.

---

## 2. Rollen & Rechten Matrix

Het systeem kent vijf rollen. De rol wordt opgeslagen in `profiles.role`.

| Actie | Anoniem | Student | Coach | Coördinator | Super Admin |
|-------|:-------:|:-------:|:-----:|:-----------:|:-----------:|
| Intake formulier invullen | ✅¹ | — | — | — | — |
| Eigen dashboard bekijken | — | ✅ | ✅ | ✅ | ✅ |
| Uren indienen | — | ✅ | — | — | — |
| Uren goedkeuren/afwijzen | — | — | ✅² | ✅ | ✅ |
| Dagstory invullen | — | ✅ | — | — | — |
| Opdrachten inleveren | — | ✅ | — | — | — |
| Opdrachten nakijken | — | — | ✅² | ✅ | ✅ |
| Evaluaties invullen | — | — | ✅² | — | — |
| Leerlingen importeren | — | — | — | ✅ | ✅ |
| Koppelingen goedkeuren | — | — | — | ✅ | ✅ |
| Stageperiodes beheren | — | — | — | ✅ | ✅ |
| Badges/opdrachten beheren | — | — | — | ✅ | ✅ |
| Sjablonen bibliotheek bekijken | — | — | ✅ | ✅ | ✅ |
| E-mailtemplate bewerken | — | — | — | ✅ | ✅ |
| Leerlingen verwijderen | — | — | — | ✅ | ✅ |
| Alle scholen beheren | — | — | — | — | ✅ |

> ¹ Anonieme toegang werkt via een unieke UUID-token in de URL (`/intake/[placement_id]`).  
> ² Coach heeft beperkte rechten: alleen voor studenten waarbij `placements.coach_id = eigen profile_id`.

### Auth-flow

```
Gebruiker vult e-mail in op /login
        ↓
Supabase stuurt magic link via noreply@stagepoort.nl (Resend SMTP)
        ↓
/auth/callback?token_hash=...&type=email
        ↓
Pagina toont "Inloggen bevestigen →" knop (Microsoft SafeLinks fix)
Gebruiker klikt de knop
        ↓
verifyOtp() → sessie aangemaakt
        ↓
Profiel ophalen op user_id → rol-routing
        ↓
Student zonder klas → /onboarding
Coordinator         → /dashboard/coordinator
Student             → /dashboard/student
Coach               → /dashboard/coach
```

> **Microsoft SafeLinks:** School-emails (bijv. `@lentiz.nl`) scannen magic links automatisch. De bevestigingsknop voorkomt dat de scanner de token verbruikt vóórdat de gebruiker erop klikt.

### Noodoplossing coach login (Supabase Edge Function)

Voor coaches met geblokkeerde mail (Microsoft 365 quarantaine) is er een Supabase Edge Function:
```
GET https://vnarhxsxbbmbowtvzfaj.supabase.co/functions/v1/gen-login-link
  ?email=coach@school.nl&secret=stagepoort2026
→ retourneert { loginUrl } — direct klikbaar, omzeilt e-mail
```

---

## 3. Database Architectuur

### Multi-tenant aanpak

Elke tabel heeft een `school_id` kolom. Alle RLS-policies filteren automatisch op `school_id = get_my_school_id()`. Uitzondering: `assignment_templates` is globaal (geen `school_id`).

### Helper-functies (SECURITY DEFINER)

```sql
get_my_school_id()    -- school_id van de ingelogde gebruiker
get_my_role()         -- rol (student/coordinator/coach/...)
get_my_profile_id()   -- profile id van de ingelogde gebruiker
is_super_admin()      -- boolean check voor super admin
submit_intake()       -- verwerkt intake formulier anoniem (zie §5)
```

### Kernrelaties

```
schools (1)
  └── profiles (N)          -- alle gebruikers van alle rollen
  └── stage_periods (N)     -- stageperiodes (LJ3, LJ4, etc.)
        └── period_classes (N)   -- klassen gekoppeld aan periode
        └── assignments (N)      -- opdrachten per periode
        └── evaluation_moments (N)

profiles (student)
  └── placements (N)        -- één per stage/schooljaar
        └── hours (N)            -- urenregistraties
        └── student_assignments (N)
        └── week_stories (N)     -- dagstories (dagelijks)
        └── evaluation_responses (N)
  └── student_badges (N)
  └── coach_praise (N)

assignment_templates     -- globale sjablonenbiblitheek (geen school_id)
```

### Tabellen — kerntabellen

#### `schools`
```
id, name, slug, city, active, license_status, max_students,
subscription_ends_at, created_at
```

#### `profiles`
```
id, user_id (nullable FK → auth.users), school_id, name,
role (student/coordinator/coach/company/super_admin),
email, klas, xp, level, streak,
last_story_week, last_story_year, created_at
```

#### `placements`
**Statusflow:** `pending → invited → review → active → halfway → completed`

```
id, school_id, student_id, coach_id, coordinator_id,
period_id, status, hours_required,
first_name, infix, last_name, student_phone,
company_name, company_address, company_postcode, company_city,
company_phone, company_email, supervisor_name,
green_stage, rejection_reason,
invited_at, submitted_at, approved_at, completed_at,
final_grade, coach_name, coach_email
```

#### `stage_periods`
```
id, school_id, name, start_date, end_date, hours_goal, created_by
```

#### `hours`
```
id, school_id, placement_id, student_id,
date, hours, description,
status (pending/approved/rejected), rejection_reason,
approved_by, approved_at
```

#### `assignments`
Opdrachten per periode. Vragen worden opgeslagen als JSONB-array.
```
id, school_id, period_id, title, description, deadline,
max_points, xp_reward, weging, sort_order,
questions (jsonb: [{id, v, hint, punten}])
```

#### `assignment_templates` ⭐ NIEUW
Globale sjablonenbiblitheek — niet gekoppeld aan school of periode. Beschikbaar voor alle scholen. Coördinatoren kunnen sjablonen kopiëren naar hun eigen blok via de "Toevoegen" knop.
```
id, title, description, questions (jsonb), max_points, xp_reward, sort_order, created_at
```
**RLS:** `SELECT` voor iedereen (`public`). `INSERT/UPDATE/DELETE` alleen via Supabase admin.  
**Seed:** `supabase/seed.sql` — bevat de 3 standaard sjablonen (idempotent, ON CONFLICT DO NOTHING).

**Standaard sjablonen:**
1. Het bedrijf leren kennen (150 XP, 5 vragen)
2. Interview met een medewerker (200 XP, 5 vragen)
3. Zelfreflectie (250 XP, 5 vragen)

#### `student_assignments`
```
id, school_id, assignment_id, student_id, placement_id,
status (open/submitted/graded),
answer,      -- tekst OF JSON-string met per-vraag antwoorden: {"1001": "...", "1002": "..."}
points, grade, xp_awarded,
submitted_at, graded_by, graded_at, feedback
```
> Als de opdracht `questions` heeft, bevat `answer` een JSON-string met id→antwoord mapping. Zonder vragen is `answer` gewone tekst.

#### `week_stories` → nu gebruikt als **dagstories**
Dagelijkse reflecties van leerlingen. Drie vragen per dag (Voorstel C).
```
id, school_id, student_id, placement_id,
date (DATE),           -- primaire identifier (dagstory)
week_number (nullable), year (nullable),  -- legacy, niet meer gebruikt
mood,                  -- emoji: 🔥 😊 😐 😕 😴
answer_1,              -- "Wat heb ik vandaag gedaan?"
answer_2,              -- "Wat heb ik vandaag geleerd?"
answer_3,              -- legacy, niet meer gebruikt
xp_awarded             -- +50 XP per dag
```
**UNIQUE:** `(student_id, date)` — één dagstory per dag per leerling.

> **Migratie:** `date` kolom toegevoegd. `week_number` en `year` zijn nullable gemaakt (backward-compat). De UI gebruikt alleen `date`.

#### `badges` + `student_badges`
```
badges:         id, school_id, emoji, name, type, threshold, xp_reward, sort_order
student_badges: id, school_id, student_id, badge_id, awarded_at
```

#### `evaluation_moments` + `evaluation_responses`
Formele toetsmomenten met uitgebreide vragen (tussenevaluatie: 7 vragen, eindevaluatie: 11 vragen).

**Tussenevaluatie vragen:** 4 sliders + 1 sterren + 2 tekstvelden  
**Eindevaluatie vragen:** 7 sliders (werkhouding, zelfstandigheid, samenwerking, communicatie, kwaliteit, initiatief, feedback) + 1 sterren + 3 tekstvelden (sterke punten, verbeterpunten, eindoordeel)

```
evaluation_moments:   id, school_id, period_id, name, week_label, type, questions (jsonb)
evaluation_responses: id, school_id, placement_id, moment_id, coach_id,
                      responses (jsonb), coach_signed_at
```

#### `coach_praise`
```
id, school_id, coach_id, student_id, count, last_given_at
```

#### `approved_hours_per_placement` (VIEW)
```sql
SELECT placement_id, school_id, SUM(hours) AS total_approved_hours
FROM public.hours WHERE status = 'approved'
GROUP BY placement_id, school_id;
```

---

## 4. RLS — Row Level Security

### Overzicht per tabel

| Tabel | SELECT | INSERT | UPDATE | DELETE |
|-------|--------|--------|--------|--------|
| `profiles` | eigen + zelfde school | coordinator + service_role | coordinator of student (eigen) | coordinator (students) |
| `placements` | authenticated (school) | authenticated | authenticated | coordinator/super_admin |
| `hours` | authenticated (school) | authenticated | authenticated | authenticated |
| `assignments` | authenticated (school) | authenticated | authenticated | authenticated |
| `student_assignments` | authenticated (school) | authenticated | authenticated | authenticated |
| `week_stories` | authenticated (school) | authenticated | authenticated | authenticated |
| `badges` | authenticated (school) | authenticated | authenticated | authenticated |
| `assignment_templates` | **iedereen (public)** | — | — | — |
| `audit_logs` | coordinator/super_admin | service_role | authenticated | — |
| `schools` | public | — | — | — |

### Kritieke beveiligingskeuze: intake via RPC

```sql
GRANT EXECUTE ON FUNCTION public.submit_intake TO anon;
```

---

## 5. Applicatie Structuur (Next.js)

```
app/
├── api/
│   ├── import-studenten/
│   ├── intake/
│   ├── send-invite/
│   └── send-supervisor/
│
├── auth/callback/     Magic link → "Inloggen bevestigen" knop → verifyOtp → rol-routing
│
├── begeleider/[placement_id]/   Stagebegeleider dashboard (anoniem via UUID)
│   └── page.js                  Tabs: Evaluaties / Uren / Stageinfo (incl. coach naam+mail)
│
├── components/
│   └── CoordinatorLayout.js
│
├── dashboard/
│   ├── coach/page.js
│   ├── coordinator/
│   │   ├── page.js
│   │   ├── koppelingen/
│   │   ├── beoordelen/
│   │   ├── opdrachten/    Opdrachten + 📚 Sjablonen bibliotheek + evaluaties + badges
│   │   └── beheer/
│   └── student/page.js    Donker thema, 4 tabs: 🏠 Stage / 📋 Uren / 📚 Opdrachten / 📖 Dagboek
│
├── intake/[token]/page.js
├── login/page.js
├── onboarding/page.js
└── page.js

lib/supabase/
├── client.js
└── server.js

supabase/
└── seed.sql    Standaard assignment_templates (idempotent)
```

### Student Dashboard — 4 tabs

| Tab | Emoji | Inhoud |
|-----|-------|--------|
| Mijn Stage | 🏠 | KPI's, badges, klassement, laatste uren |
| Uren | 📋 | Uren registreren + history |
| Opdrachten | 📚 | Wizard per vraag (min. 30 tekens), antwoorden als JSON |
| Dagboek | 📖 | Instagram/TikTok-stijl dagstory — 3 vragen, gradient UI, story circles |

### Coordinator Opdrachten pagina

- **Periode-tabs** bovenaan (kies het actieve blok)
- **📚 Sjablonen bibliotheek** (blauw blok) — globale templates met "Toevoegen" knop
- **Opdrachten lijst** — per periode, bewerkbaar
- **Evaluatievragen** — tussenevaluatie en eindevaluatie configureerbaar
- **Badges** — drempels en XP instellen

---

## 6. Core Logica & Berekeningen

### 6.1 Dagstory (vervangt weekstory)

Leerlingen vullen dagelijks 3 vragen in:
1. "Wat heb ik vandaag gedaan?" (`answer_1`)
2. "Hoe voelde ik me vandaag?" (`mood` — emoji: 🔥 😊 😐 😕 😴)
3. "Wat heb ik vandaag geleerd?" (`answer_2`)

- Minimaal 50 tekens per tekstvraag (live teller met voortgangsbalk)
- Één dagstory per dag (UNIQUE constraint op `student_id, date`)
- +50 XP per ingevulde dagstory

### 6.2 XP & Level

```
XP wordt toegekend bij:
  - Dagstory invullen:        +50 XP per dag
  - Opdracht inleveren:       +xp_reward van de opdracht (variabel, 100-250 XP)
  - Badges ontvangen:         +xp_reward van de badge

Level berekening:
  level = Math.floor(xp / 300) + 1
```

### 6.3 Opdrachten wizard (studentzijde)

Als een opdracht `questions` heeft (array lengte > 0):
- Wizard toont vragen één voor één (voortgangsbalk bovenaan)
- Per vraag minimum 30 tekens verplicht
- Antwoorden opgeslagen als JSON: `{"1001": "antwoord q1", "1002": "antwoord q2"}`

Als opdracht geen vragen heeft (legacy):
- Enkelvoudig tekstvak zonder minimum

### 6.4 Intake-flow

```
1. Coördinator importeert → profiel + placement (status: pending)
2. "Stuur invullink" → e-mail via Resend → status: invited
3. Leerling: /intake/[placement_id] → 4 stappen → submit_intake() RPC → status: review
4. Coördinator keurt goed → welkomstmail begeleider → status: active
5. Leerling eerste login → handle_new_user() trigger → koppelt auth.user aan profiel
```

---

## 7. Teststraat (Playwright + GitHub Actions)

```
e2e/
├── helpers/
│   └── auth.js                   loginAs() — genereert magic link + klikt bevestigingsknop
├── globalSetup.js                Testschool isolatie (school_id: ...0099)
├── 01-publieke-paginas.spec.js
├── 02-intake.spec.js
├── 03-coordinator.spec.js
├── 04-student.spec.js            Dagboek tab (niet weekstory)
├── 05-coach.spec.js
└── 06-begeleider.spec.js
```

### Testschool isolatie

| Gegeven | Waarde |
|---------|--------|
| Test school_id | `00000000-0000-0000-0000-000000000099` |
| Test periode_id | `00000000-0000-0000-0000-000000000991` |
| Test coordinator | `playwright-coordinator@stagepoort-test.nl` |
| Test student | `playwright-student@stagepoort-test.nl` |
| Test coach | `playwright-coach@stagepoort-test.nl` |

### Auth-strategie in tests

```js
// loginAs() klikt nu ook de bevestigingsknop (SafeLinks fix)
await page.goto(`${BASE_URL}/auth/callback?token_hash=${token}&type=email`)
await page.locator('button').filter({ hasText: /inloggen bevestigen/i }).click()
await page.waitForURL(/(dashboard|onboarding)/)
```

---

## 8. Bekende Technische Schuld

| Item | Ernst | Beschrijving |
|------|-------|--------------|
| Legacy kolommen `week_stories` | Laag | `week_number`, `year`, `answer_3` niet meer in gebruik maar nog aanwezig |
| Legacy kolommen `assignments` | Laag | `placement_id`, `status`, `answer` in assignments tabel legacy |
| Badge-toekenning niet geautomatiseerd | Middel | Drempelwaarden aanwezig maar geen trigger die badges automatisch toekent |
| `last_story_week/year` in profiles | Laag | Verouderd na dagstory migratie, niet meer bijgehouden |
| Streak herberekening | Middel | Streak-logica was gebaseerd op weeknummers, nu per dag — `bereken_streak()` RPC niet meer in sync |
| Coach login `@lentiz.nl` | Middel | Microsoft 365 quarantaine blokkeert magic links — IT whitelist vereist, workaround via Edge Function |

---

## 9. Monitoring (Sentry)

- **SDK:** `@sentry/nextjs` v10.57.0
- **Datacenter:** EU (`ingest.de.sentry.io`)
- **Configuratie:** `sentry.client.config.js`, `sentry.server.config.js`, `instrumentation.js`
- **Vercel env:** `NEXT_PUBLIC_SENTRY_DSN` ingesteld
- Let op: Brave browser blokkeert Sentry via adblocker — normaal gedrag, werkt wel in productie

---

*Laatste update: juni 2026 — bijgewerkt na dagstory migratie, sjablonenbiblitheek, eindevaluatie uitbreiding en Sentry integratie.*
