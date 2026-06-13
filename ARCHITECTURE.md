# Stagepoort — Architectuurdocument

> **Dit is de Bron van Waarheid voor het Stagepoort-project.**  
> Elke toekomstige wijziging — of het nu een nieuwe feature, database-aanpassing of beveiligingsregel is — moet teruggevonden kunnen worden in dit document.  
> Houd dit bestand actueel bij elke significante wijziging.

---

## 1. Project Overzicht

**Stagepoort** is een multi-tenant SaaS-platform voor VMBO/MBO-scholen dat het volledige stageproces digitaliseert: van leerlingimport en intakeformulier tot urenregistratie, opdrachten, weekreflecties en officiële evaluaties.

| Component | Technologie | Details |
|-----------|-------------|---------|
| Frontend | **Next.js 16** (App Router) | JavaScript (geen TypeScript in gebruik) |
| Database + Auth | **Supabase** (PostgreSQL) | Project: `vnarhxsxbbmbowtvzfaj`, regio EU Frankfurt |
| Hosting | **Vercel** | Auto-deploy bij push naar `main` |
| E-mail | **Resend** | Verzend domein: `stagepoort.nl` |
| Styling | Inline CSS | Geen Tailwind actief ondanks aanwezigheid in devDependencies |
| Testen | **Playwright** | E2E tests via GitHub Actions, draait op Node.js 24 |

### Omgevingsvariabelen

```
NEXT_PUBLIC_SUPABASE_URL       https://vnarhxsxbbmbowtvzfaj.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY  sb_publishable_...   (publieke sleutel)
RESEND_API_KEY                 re_...               (e-mail verzending)
NEXT_PUBLIC_SITE_URL           https://stagepoort.vercel.app
```

> ⚠️ Er is **geen** `SUPABASE_SERVICE_ROLE_KEY` geconfigureerd in Vercel. De service role key staat alleen in **GitHub Secrets** voor de Playwright-teststraat.

---

## 2. Rollen & Rechten Matrix

Het systeem kent vijf rollen. De rol wordt opgeslagen in `profiles.role`.

| Actie | Anoniem | Student | Coach | Coördinator | Super Admin |
|-------|:-------:|:-------:|:-----:|:-----------:|:-----------:|
| Intake formulier invullen | ✅¹ | — | — | — | — |
| Eigen dashboard bekijken | — | ✅ | ✅ | ✅ | ✅ |
| Uren indienen | — | ✅ | — | — | — |
| Uren goedkeuren/afwijzen | — | — | ✅² | ✅ | ✅ |
| Weekstory invullen | — | ✅ | — | — | — |
| Opdrachten inleveren | — | ✅ | — | — | — |
| Opdrachten nakijken | — | — | ✅² | ✅ | ✅ |
| Evaluaties invullen | — | — | ✅² | — | — |
| Leerlingen importeren | — | — | — | ✅ | ✅ |
| Koppelingen goedkeuren | — | — | — | ✅ | ✅ |
| Stageperiodes beheren | — | — | — | ✅ | ✅ |
| Badges/opdrachten beheren | — | — | — | ✅ | ✅ |
| E-mailtemplate bewerken | — | — | — | ✅ | ✅ |
| Leerlingen verwijderen | — | — | — | ✅ | ✅ |
| Alle scholen beheren | — | — | — | — | ✅ |

> ¹ Anonieme toegang werkt via een unieke UUID-token in de URL (`/intake/[placement_id]`). Dit is beveiligd via een Supabase RPC-functie met server-side validatie.  
> ² Coach heeft beperkte rechten: alleen voor studenten waarbij `placements.coach_id = eigen profile_id`.

### Auth-flow

```
Gebruiker vult e-mail in op /login
        ↓
Supabase stuurt magic link via noreply@stagepoort.nl
        ↓
/auth/callback?token_hash=...&type=email
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

---

## 3. Database Architectuur

### Multi-tenant aanpak

Elke tabel heeft een `school_id` kolom. Alle RLS-policies filteren automatisch op `school_id = get_my_school_id()`. Geen data van de ene school is ooit zichtbaar voor een andere school.

### Helper-functies (SECURITY DEFINER)

```sql
get_my_school_id()    -- school_id van de ingelogde gebruiker
get_my_role()         -- rol (student/coordinator/coach/...)
get_my_profile_id()   -- profile id van de ingelogde gebruiker
is_super_admin()      -- boolean check voor super admin
bereken_streak()      -- berekent aaneengesloten weekstreak (zie §5)
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
        └── week_stories (N)
        └── evaluation_responses (N)
  └── student_badges (N)
  └── coach_praise (N)
```

### Tabellen — kerntabellen

#### `schools`
De tenant-root. Eén school = één volledig geïsoleerde omgeving.
```
id, name, slug, city, active, license_status, max_students,
subscription_ends_at, created_at
```

#### `profiles`
Alle gebruikers (studenten, coordinatoren, coaches). `user_id` is nullable — geïmporteerde leerlingen krijgen eerst een profiel zonder auth-account. Zodra ze inloggen koppelt de `handle_new_user()` trigger het account.
```
id, user_id (nullable FK → auth.users), school_id, name,
role (student/coordinator/coach/company/super_admin),
email, klas, xp, level, streak,
last_story_week, last_story_year, created_at
```

#### `placements`
Het hart van het systeem. Eén placement = één stage. Een leerling kan meerdere placements hebben (één per schooljaar).

**Statusflow:**
```
pending → invited → review → active → halfway → completed
                          ↘ rejected
```

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
Stageperiodes per school. Elke periode heeft eigen opdrachten, uren-doel en evaluatiemomenten.
```
id, school_id, name, start_date, end_date, hours_goal, created_by
```

#### `period_classes`
Koppelt klassen aan periodes. Gebruikt door de onboarding om nieuwe leerlingen automatisch aan de juiste periode te koppelen.
```
id, school_id, period_id, klas
```

#### `hours`
Urenregistraties per leerling.
```
id, school_id, placement_id, student_id,
date, hours, description,
status (pending/approved/rejected), rejection_reason,
approved_by, approved_at
```

#### `assignments`
Opdrachten aangemaakt door de coördinator per periode.
```
id, school_id, period_id, title, description, deadline,
max_points, xp_reward, weging, sort_order,
questions (jsonb: [{id, v, hint, punten}])
```

> ⚠️ Legacy-kolommen `placement_id`, `status` en `answer` staan nog in de tabel maar worden niet meer gebruikt. Nieuwe code gebruikt altijd `period_id` en `student_assignments`.

#### `student_assignments`
Inleveringen en beoordelingen per leerling per opdracht.
```
id, school_id, assignment_id, student_id, placement_id,
status (open/submitted/graded),
answer, points, grade, xp_awarded,
submitted_at, graded_by, graded_at, feedback
```

#### `week_stories`
Wekelijkse reflecties (weekstory) van leerlingen.
```
id, school_id, student_id, placement_id,
week_number, year,
mood, answer_1, answer_2, answer_3,
xp_awarded
```
**UNIQUE:** `(student_id, week_number, year)` — één story per week per leerling.

#### `badges` + `student_badges`
Badges zijn aanpasbaar door de coördinator per school.
```
badges:         id, school_id, emoji, name, type, threshold, xp_reward, sort_order
student_badges: id, school_id, student_id, badge_id, awarded_at
```

#### `evaluation_moments` + `evaluation_responses`
Formele toetsmomenten (tussenevaluatie, eindevaluatie) met vragen die de coach invult.
```
evaluation_moments:   id, school_id, period_id, name, week_label, type, questions (jsonb)
evaluation_responses: id, school_id, placement_id, moment_id, coach_id,
                      responses (jsonb), coach_signed_at
```

#### `coach_praise`
Bijhoudt hoe vaak een coach op "👊 Goed bezig" heeft geklikt per leerling. Maximum 3×.
```
id, school_id, coach_id, student_id, count, last_given_at
```
**UNIQUE:** `(coach_id, student_id)`

#### `email_templates`
E-mailtemplate aanpasbaar per school.
```
id, school_id, type (supervisor_welcome), subject, body
```
**Template-variabelen:** `{{begeleider_naam}}`, `{{leerling_naam}}`, `{{bedrijfsnaam}}`, `{{startdatum}}`, `{{link}}`, `{{coordinator_naam}}`, `{{coordinator_email}}`, `{{school_naam}}`

#### `approved_hours_per_placement` (VIEW)
Aggregatieview voor goedgekeurde uren per placement. Herbruikbaar door coordinator- en coach-dashboard.
```sql
SELECT placement_id, school_id, SUM(hours) AS total_approved_hours
FROM public.hours
WHERE status = 'approved'
GROUP BY placement_id, school_id;
```

---

## 4. RLS — Row Level Security

### Principes

1. **RLS staat aan op alle tabellen.** Geen enkele tabel is vrij toegankelijk zonder policy.
2. **School-isolatie is verplicht.** Elke policy filtert op `school_id = get_my_school_id()`.
3. **Anon rol heeft minimale toegang.** Alleen wat nodig is voor het intake formulier.
4. **Publieke tabellen zijn er niet.** Na de Fase 0 security-migratie zijn alle `public`-policies verwijderd.

### Overzicht per tabel

| Tabel | SELECT | INSERT | UPDATE | DELETE |
|-------|--------|--------|--------|--------|
| `profiles` | eigen profiel + zelfde school | coordinator + service_role | coordinator (school) of student (eigen) | coordinator (alleen students) |
| `placements` | authenticated (school) | authenticated (school) | authenticated (school) | coordinator/super_admin |
| `placements` (anon) | status pending/invited/rejected | — | via `submit_intake()` RPC | — |
| `hours` | authenticated (school) | authenticated (school) | authenticated (school) | authenticated (school) |
| `assignments` | authenticated (school) | authenticated (school) | authenticated (school) | authenticated (school) |
| `student_assignments` | authenticated (school) | authenticated (school) | authenticated (school) | authenticated (school) |
| `week_stories` | authenticated (school) | authenticated (school) | authenticated (school) | authenticated (school) |
| `badges` | authenticated (school) | authenticated (school) | authenticated (school) | authenticated (school) |
| `audit_logs` | coordinator/super_admin | service_role | authenticated (voor ON DELETE SET NULL cascade) | — |
| `companies` | authenticated (school) | coordinator | coordinator | coordinator |
| `period_classes` | anon + authenticated | coordinator | coordinator | coordinator |
| `schools` | public | — | — | — |

### Kritieke beveiligingskeuze: intake via RPC

Het intake formulier werkt anoniem (leerling is niet ingelogd). Een directe `UPDATE` op `placements` als anon-rol faalde door een conflict met de `WITH CHECK` van de authenticatied UPDATE-policy.

**Oplossing:** Een `SECURITY DEFINER` functie `submit_intake()` die:
1. Server-side de placement status valideert (`pending`/`invited`/`rejected`)
2. De data schrijft en status naar `review` zet
3. Draait als de Postgres-superuser — volledig buiten RLS

```sql
GRANT EXECUTE ON FUNCTION public.submit_intake TO anon;
```

---

## 5. Applicatie Structuur (Next.js)

```
app/
├── api/                          Server-side API routes (omzeilen RLS waar nodig)
│   ├── import-studenten/         CSV/plak-import van leerlingen (vereist coordinator auth)
│   ├── intake/                   Anonieme intake-verwerking (via submit_intake RPC)
│   ├── send-invite/              Magic link e-mail naar leerling (vereist coordinator auth)
│   └── send-supervisor/          Welkomstmail stagebegeleider bij goedkeuring
│
├── auth/callback/                Magic link afhandeling → token_hash → verifyOtp → rol-routing
│
├── components/
│   └── CoordinatorLayout.js      Gedeelde sidebar voor alle coordinator-pagina's
│
├── dashboard/
│   ├── coach/page.js             Coach: studenten, nakijken, evaluaties, inschrijven
│   ├── coordinator/
│   │   ├── page.js               Dashboard + studenten gecombineerd (KPI's, filters, tabel)
│   │   ├── koppelingen/          4-fasen flow: pending → invited → review → active
│   │   ├── beoordelen/           Uren keuren + opdrachten beoordelen
│   │   ├── opdrachten/           Opdrachten + evaluatievragen + badges beheren
│   │   └── beheer/               Stageperiodes + mede-coordinatoren + e-mailtemplate
│   └── student/page.js           Donker thema, 4 tabs: stage/uren/opdrachten/weekstory
│
├── intake/[token]/page.js        Anoniem intakeformulier — token = placement_id (UUID)
├── login/page.js                 Magic link loginpagina
├── onboarding/page.js            Klas kiezen bij eerste login student
└── page.js                       Root → redirect naar /login

lib/supabase/
├── client.js                     createBrowserClient — gebruikt in alle client components
└── server.js                     createServerClient met cookies — gebruikt in API routes
```

### Supabase Client-keuze

| Situatie | Client | Reden |
|----------|--------|-------|
| Client component (`'use client'`) | `lib/supabase/client.js` | Browser, localStorage/cookies |
| API route (`route.js`) | `lib/supabase/server.js` | Server-side, cookies voor auth |
| Anonieme API (intake) | `@supabase/supabase-js` direct | Geen cookies, opereert als `anon` rol |

> ⚠️ De server-client gebruikt de **anon key**, niet de service role key. Er is geen service role key geconfigureerd in Vercel. De service role key bestaat alleen in GitHub Secrets voor de teststraat.

### Kritieke API Routes

| Route | Auth vereist | Wat het doet |
|-------|-------------|--------------|
| `POST /api/intake` | ❌ Anoniem | Roept `submit_intake()` RPC aan — valideert en schrijft intake data |
| `POST /api/send-invite` | ✅ Coordinator | Verstuurt magic link e-mail naar leerling via Resend |
| `POST /api/send-supervisor` | ✅ Coordinator | Verstuurt welkomstmail naar stagebegeleider, zet placement op `active` |
| `POST /api/import-studenten` | ✅ Coordinator | Importeert leerlingen uit CSV/geplakte tekst |

---

## 6. Core Logica & Berekeningen

### 6.1 Streak-berekening

De streak telt het aantal **aaneengesloten** weken dat een leerling een weekstory heeft ingevuld. Een week overgeslagen = streak reset naar 1.

**Postgres-functie: `bereken_streak(p_student_id, p_week_number, p_year)`**

```sql
-- Logica (vereenvoudigd):
1. Bepaal de vorige week (week_number - 1, of week 52 van vorig jaar als week = 1)
2. Kijk of er een week_story bestaat voor die vorige week
3. Als ja: return huidige_streak + 1
4. Als nee: return 1  (streak gereset)
```

De functie wordt aangeroepen vanuit de student dashboard **vóórdat** de weekstory wordt opgeslagen:

```js
// e2e/student/page.js — WeekstoryTab
const { data: streakData } = await supabase
  .rpc('bereken_streak', { p_student_id: profile.id, p_week_number: weekNr, p_year: jaar })
const nieuweStreak = streakData ?? 1
```

### 6.2 XP & Level berekening

```
XP wordt toegekend bij:
  - Weekstory invullen:       +100 XP
  - Opdracht inleveren:       +xp_reward van de opdracht (variabel)

Level berekening:
  level = Math.floor(xp / 300) + 1
  (elke 300 XP = een level omhoog)

XP voortgangsbalk:
  voortgang = xp % 300
  percentage = (voortgang / 300) * 100
```

### 6.3 Uren goedkeuringsflow

```
Student dient uren in → status: 'pending'
        ↓
Coordinator of Coach keurt goed → status: 'approved' + approved_by + approved_at
        of
Coordinator of Coach wijst af  → status: 'rejected' + rejection_reason
        ↓ (bij afwijzing)
Student ziet de reden en kan opnieuw indienen
```

De `approved_hours_per_placement` VIEW aggregeert alle goedgekeurde uren:
```sql
SELECT SUM(hours) AS total_approved_hours
FROM hours
WHERE status = 'approved' AND placement_id = [id]
```

### 6.4 Intake-flow (compleet)

```
1. Coördinator importeert leerling via /api/import-studenten
   → profiel aangemaakt zonder user_id (geen auth-account nodig)
   → placement aangemaakt met status: 'pending'

2. Coördinator klikt "Stuur invullink" → /api/send-invite
   → e-mail verstuurd via Resend
   → placement.status → 'invited'

3. Leerling opent /intake/[placement_id] in browser (anoniem)
   → vult 4 stappen in (persoonlijk, bedrijf, begeleider, bevestiging)
   → POST /api/intake → submit_intake() RPC
   → placement.status → 'review'

4. Coördinator ziet leerling in "Ter beoordeling"
   → keurt goed → /api/send-supervisor
   → welkomstmail naar stagebegeleider
   → placement.status → 'active'

5. Leerling logt voor eerste keer in via magic link
   → handle_new_user() trigger koppelt auth.user aan bestaand profiel (op e-mail)
   → als klas ontbreekt: /onboarding (klas kiezen)
   → dashboard toont actieve stage
```

---

## 7. Teststraat (Playwright + GitHub Actions)

### Structuur

```
e2e/
├── helpers/
│   └── auth.js                   loginAs() via hashed_token (geen PKCE)
├── 01-publieke-paginas.spec.js   Login, root redirect, ongeldige intake token
├── 02-intake.spec.js             Volledig intake formulier invullen
├── 03-coordinator.spec.js        Dashboard, koppelingen, beoordelen, beheer
└── 04-student.spec.js            Login, bottom nav, uren tab, weekstory

.github/workflows/e2e.yml         Automatisch bij elke push naar main
```

### Auth-strategie in tests

Magic links gebruiken normaal een PKCE-flow waarbij de browser een `code_verifier` in localStorage opslaat. In Playwright is deze er niet. Oplossing: de `hashed_token` uit de admin API direct naar onze callback sturen:

```js
// auth.js helper
const { data } = await supabase.auth.admin.generateLink({ type: 'magiclink', email })
await page.goto(`${BASE_URL}/auth/callback?token_hash=${data.properties.hashed_token}&type=email`)
// → verifyOtp() — vereist geen PKCE
```

### GitHub Secrets (vereist voor teststraat)

| Secret | Gebruik |
|--------|---------|
| `SUPABASE_SERVICE_ROLE_KEY` | Admin client voor test-placements aanmaken en magic links genereren |
| `TEST_COORDINATOR_EMAIL` | E-mail van de testcoördinator |

---

## 8. Richtlijnen voor Toekomstige Updates

### Database-wijzigingen

> **Regel: Elke database-wijziging gaat via een Supabase migratie — nooit handmatig in de SQL Editor zonder documentatie.**

```
1. Schrijf de SQL-migratie met een beschrijvende naam
   (bijv. "add_final_grade_to_placements")
2. Voer de migratie uit via Supabase → SQL Editor of via de MCP-tool
3. Update ARCHITECTURE.md als de wijziging een tabelstructuur of RLS-policy betreft
4. Push de migratie-SQL ook op in een commit-bericht zodat de git history
   als auditlog dient
```

**Checklist bij nieuwe tabel:**
- [ ] `school_id` kolom aanwezig (multi-tenant vereiste)
- [ ] `RLS ENABLE` uitgevoerd op de tabel
- [ ] GRANT gegeven aan `authenticated` en/of `service_role`
- [ ] Policy gebaseerd op `get_my_school_id()` helper

### Nieuwe features

> **Regel: Elke nieuwe gebruikersfunctie krijgt minimaal één Playwright-test.**

```
Nieuwe feature gebouwd?
  → Voeg test toe in e2e/[relevant-bestand].spec.js
  → Test dekt minimaal: laadt de pagina correct? Werkt de kernactie?
  → Push → GitHub Actions draait automatisch → groen = veilig deployen
```

### RLS-wijzigingen

> **Regel: Bij elke nieuwe tabel of nieuwe rol eerst de rechtenmatrix in §2 updaten.**

Volgorde:
1. Bepaal welke rollen toegang nodig hebben (zie §2)
2. Schrijf de minimale policy (`least privilege`)
3. Test zowel de toegestane als de verboden acties
4. Nooit `public` of `anon` zonder expliciete reden

### Omgevingsvariabelen toevoegen

Bij een nieuwe secret/variabele:
1. Toevoegen in Vercel Dashboard (voor productie)
2. Toevoegen als GitHub Secret (als de teststraat hem nodig heeft)
3. Documenteren in §1 van dit bestand

---

## 9. Bekende Technische Schuld

| Item | Ernst | Beschrijving |
|------|-------|--------------|
| Legacy kolommen `assignments` | Laag | `placement_id`, `status`, `answer` in assignments tabel zijn niet meer in gebruik |
| Dead code | Laag | `StudentenClient.js`, `StudentClient.js`, `studenten/page.js` worden nergens geïmporteerd |
| Geen service role key in Vercel | Middel | Intake werkt via RPC workaround. Overweeg service role key toe te voegen voor toekomstige server-side logica |
| Badge-toekenning niet geautomatiseerd | Middel | Badges hebben drempelwaarden maar er is geen trigger die ze automatisch toekent |
| Uren kolom coordinator dashboard | Laag | Toont nu echte data via de `approved_hours_per_placement` VIEW ✅ (opgelost) |
| Stagebegeleider dashboard | Hoog | Stagebegeleiders hebben geen eigen dashboard — ze worden per e-mail uitgenodigd maar kunnen nergens inloggen |

---

*Laatste update: juni 2026 — gegenereerd op basis van de live codebase en database.*
