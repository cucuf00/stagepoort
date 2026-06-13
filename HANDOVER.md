# Stagepoort — Volledige Project Handover (v2)

> Geschreven op 13 juni 2026. Volledig gecheckt aan de hand van de live codebase.

---

## 1. Projectoverzicht

**Stagepoort** is een multi-tenant SaaS-platform voor VMBO/MBO-scholen dat het stageproces volledig digitaliseert: van leerlingimport en intakeformulier tot urenregistratie, opdrachten, weekstories, officiële evaluaties en coach-begeleiding.

### Verdienmodel
- Jaarlicentie per school: €2.000–€25.000
- Elke school is een aparte tenant met volledige data-isolatie via Row Level Security

### Doelgroep
| Rol | Dashboard |
|-----|-----------|
| coordinator | `/dashboard/coordinator` |
| student | `/dashboard/student` |
| coach | `/dashboard/coach` |
| company | nog niet gebouwd |
| super_admin | nog niet gebouwd |

---

## 2. Tech Stack & Credentials

| Component | Waarde |
|-----------|--------|
| Framework | Next.js 16 (App Router), TypeScript config, JavaScript pages |
| React | 19.2.4 |
| Database + Auth | Supabase — project `vnarhxsxbbmbowtvzfaj`, EU Frankfurt |
| Hosting | Vercel — `stagepoort-s-projects/stagepoort` |
| Email | Resend — domein `stagepoort.nl` |
| Styling | Puur inline CSS — geen Tailwind actief ondanks aanwezigheid in devDependencies |

### Omgevingsvariabelen (in Vercel dashboard)
```
NEXT_PUBLIC_SUPABASE_URL      = https://vnarhxsxbbmbowtvzfaj.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY = sb_publishable_-brPYXovkOjOf1yZaZ791Q_ibksTM3R
RESEND_API_KEY                = re_M9QBuczq_39MSEjK2fWNbQ6LybpEkobwb
NEXT_PUBLIC_SITE_URL          = https://stagepoort.vercel.app
```

> ⚠️ Er is **GEEN** `SUPABASE_SERVICE_ROLE_KEY` geconfigureerd — zie kritieke bug #1 hieronder.

### Resend SMTP (geconfigureerd in Supabase Auth)
- Host: `smtp.resend.com`, Port: 465, SSL
- Sender: `noreply@stagepoort.nl`
- Auth: username = `resend`, password = Resend API key

### Supabase Clients (`lib/supabase/`)
- `client.js` → `createBrowserClient` met `NEXT_PUBLIC_SUPABASE_ANON_KEY`
- `server.js` → `createServerClient` met `NEXT_PUBLIC_SUPABASE_ANON_KEY` + cookies

> ⚠️ **Beide clients gebruiken de ANON key.** Er is geen service role client. Zie bug #1.

---

## 3. Bestandsstructuur

```
stagepoort/
├── app/
│   ├── api/
│   │   ├── import-studenten/route.js    Server-side import (gebruikt coordinator auth)
│   │   ├── intake/route.js              ⚠️ BUG: anonieme intake werkt mogelijk niet
│   │   ├── send-invite/route.js         Email invullink naar leerling (Resend)
│   │   └── send-supervisor/route.js     Email naar stagebegeleider bij goedkeuring
│   ├── auth/callback/page.js            Magic link afhandeling + rol-routing
│   ├── components/
│   │   └── CoordinatorLayout.js         Sidebar voor coordinator (donkerblauw #0E3A5C)
│   ├── dashboard/
│   │   ├── coach/page.js                ✅ Volledig coach dashboard (4 tabs)
│   │   ├── coordinator/
│   │   │   ├── page.js                  ✅ Gecombineerd dashboard + studenten
│   │   │   ├── koppelingen/page.js      ✅ Stagekoppeling flow (4 secties)
│   │   │   ├── beoordelen/page.js       ✅ Uren + opdrachten beoordelen
│   │   │   ├── opdrachten/page.js       ✅ Opdrachten/evaluaties/badges beheer
│   │   │   ├── beheer/page.js           ✅ Periodes/coordinatoren/emailtemplate
│   │   │   └── studenten/
│   │   │       ├── page.js              ⚠️ DEAD CODE — gebruik coordinator/page.js
│   │   │       └── StudentenClient.js   ⚠️ DEAD CODE — oud prototype met demo data
│   │   └── student/
│   │       ├── page.js                  ✅ Volledig student dashboard (donker thema)
│   │       └── StudentClient.js         ⚠️ DEAD CODE — oud prototype
│   ├── intake/[token]/page.js           ✅ Anoniem intakeformulier (4 stappen)
│   ├── login/page.js                    ✅ Magic link loginpagina
│   ├── onboarding/page.js               ✅ Klas kiezen bij eerste login student
│   ├── layout.js
│   └── page.js                         Redirect naar /login
├── lib/supabase/
│   ├── client.js                        Browser client (anon key)
│   └── server.js                        Server client (anon key + cookies)
├── middleware.js                         LEEG — auth is volledig client-side
├── next.config.ts                        Leeg (geen speciale config)
├── package.json
└── HANDOVER.md
```

---

## 4. Auth & Rollen

### Inlogmethode
Magic link via Supabase Auth + Resend SMTP. Geen wachtwoorden.

### Callback flow (`/auth/callback/page.js`)
1. Leest `token_hash` of `code` uit URL params
2. `verifyOtp` of `exchangeCodeForSession`
3. Haalt profiel op via `user_id`
4. **Speciale case:** student zonder `klas` → `/onboarding`
5. Rol-routing:
   ```
   coordinator → /dashboard/coordinator
   student     → /dashboard/student
   coach       → /dashboard/coach
   company     → /dashboard/company (NIET GEBOUWD)
   super_admin → /dashboard/admin (NIET GEBOUWD)
   ```

### Onboarding (`/onboarding/page.js`)
Wordt getriggerd als `profiles.klas IS NULL` na eerste login van student.
- Toont beschikbare klassen uit `period_classes` tabel
- Student kiest klas → systeem bepaalt automatisch de juiste periode via datumlogica
- Werkt zo: kijk welke `period_classes.klas` matches heeft met `stage_periods`, dan pak de meest relevante periode (toekomstig > actief > verlopen)
- Slaat klas op in `profiles.klas` en koppelt `period_id` aan bestaande/nieuwe placement

### Trigger: `handle_new_user()`
```sql
BEGIN
  IF EXISTS (
    SELECT 1 FROM public.profiles WHERE email = NEW.email AND user_id IS NULL
  ) THEN
    UPDATE public.profiles SET user_id = NEW.id
    WHERE email = NEW.email AND user_id IS NULL;
  END IF;
  RETURN NEW;
END;
```
Werkt voor CSV-geïmporteerde leerlingen die later inloggen via magic link.

---

## 5. Kritieke Bugs & Workarounds

### Bug #1 — Intake route werkt alleen als leerling al een sessie heeft (KRITIEK)
**Probleem:** `app/api/intake/route.js` importeert `createClient` van `lib/supabase/server.js`. Die client gebruikt de ANON key met cookies. Als een leerling NIET is ingelogd (wat normaal is bij intake), zijn er geen auth cookies. De `placements` SELECT en UPDATE policies vereisen `authenticated`. Dus de route zou een 404 teruggeven ("Placement niet gevonden").

**Hoe het toch werkt:** De intake flow werkt momenteel alleen als de persoon die het formulier invult een actieve auth sessie heeft (bijv. coordinator die test, of student die al ooit ingelogd was). In productie zal dit falen voor gewone studenten.

**Fix:**
Optie A — Anon policies toevoegen:
```sql
CREATE POLICY "placements_intake_select_anon" ON public.placements
  FOR SELECT TO anon
  USING (status IN ('pending', 'invited', 'rejected'));

CREATE POLICY "placements_intake_update_anon" ON public.placements
  FOR UPDATE TO anon
  USING (status IN ('pending', 'invited', 'rejected'))
  WITH CHECK (status = 'review');
```

Optie B — Service role key toevoegen:
1. Zet `SUPABASE_SERVICE_ROLE_KEY` in Vercel environment variables
2. Maak `lib/supabase/admin.js`:
```js
import { createClient } from '@supabase/supabase-js'
export const supabaseAdmin = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
)
```
3. Gebruik `supabaseAdmin` in `intake/route.js` in plaats van `createClient()`

**Aanbeveling:** Optie A is veiliger (beperktere toegang) en eenvoudiger.

### Bug #2 — Uren kolom toont altijd "0 / X u" in dashboard
**Probleem:** In `coordinator/page.js` toont de tabel `0 / {pl?.hours_required || 320} u`. Er wordt geen query gedaan om echte goedgekeurde uren op te halen per leerling.

**Fix:** Voeg een uren-query toe die de SUM van approved hours per placement ophaalt, bijv. via een Supabase RPC of een join.

### Bug #3 — Dead code bestanden
De volgende bestanden worden nergens geïmporteerd maar bestaan wel:
- `app/dashboard/coordinator/studenten/StudentenClient.js` — oud CSS/demo prototype
- `app/dashboard/student/StudentClient.js` — oud CSS/demo prototype
- `app/dashboard/coordinator/studenten/page.js` — vervangen door `coordinator/page.js`

Deze kunnen veilig verwijderd worden.

---

## 6. Database Schema (23 tabellen)

### Testdata
- **School ID:** `00000000-0000-0000-0000-000000000001` (ROC Rotterdam)
- **Coordinator:** Yusuf Bagcivan, email `yusuf.bagcivan@hotmail.com` / `cucuf@live.nl`
- **Studenten:** Jan (`cucuf00@gmail.com`), Yusu (`zm@live.nl`, 100 XP, streak 1), mkmk, Yuf Deir, Yusuf Demir

### Multi-tenant aanpak
Elke tabel heeft `school_id`. RLS helper functies (SECURITY DEFINER):
- `get_my_school_id()` — school_id van ingelogde user
- `get_my_role()` — rol van ingelogde user
- `get_my_profile_id()` — profile id van ingelogde user
- `is_super_admin()` — boolean

### Tabellen

#### `schools`
```
id (uuid PK), name, slug (unique), city, active (bool),
license_status (trial/active/expired/suspended),
max_students, subscription_ends_at, created_at
```

#### `profiles` — alle gebruikers
```
id (uuid PK), user_id (nullable FK auth.users), school_id, company_id,
name, role (student/coordinator/coach/company/super_admin),
phone, klas, email,
xp (default 0), level (default 1), streak (default 0),
last_story_week, last_story_year, created_at
```
Constraint: `UNIQUE(user_id, school_id)` maar user_id nullable (CSV-import leerlingen).

#### `placements` — kern van het systeem
Eén placement = één stage. Leerling kan meerdere placements hebben (per schooljaar/periode).
```
id, school_id, student_id (FK profiles), coach_id (FK profiles),
coordinator_id (FK profiles), company_id, academic_year_id, period_id (FK stage_periods),
status (pending/invited/review/active/rejected/halfway/completed/cancelled),
start_date, end_date, hours_required (default 200),
first_name, infix, last_name, student_phone,
company_name, company_address, company_postcode, company_city,
company_phone, company_email, supervisor_name,
green_stage (bool default false), rejection_reason,
invited_at, submitted_at, approved_at, completed_at,
final_grade, coach_name, coach_email, created_at
```

**Statussen stroom:**
```
pending → invited → review → active/rejected
active → halfway → completed/cancelled
```

#### `stage_periods` — stageperiodes per school
```
id, school_id, name, start_date, end_date,
hours_goal (default 160), created_by, created_at
```
Default: Leerjaar 3 (160u) + Leerjaar 4 (320u).

#### `period_classes` — klassen gekoppeld aan periodes
```
id, school_id, period_id (FK stage_periods), klas (text), created_at
```
UNIQUE(period_id, klas). Gebruikt door onboarding om student aan juiste periode te koppelen.
SELECT toegankelijk voor anon + authenticated.

#### `hours` — urenregistratie
```
id, school_id, placement_id, student_id (FK profiles),
date, hours (numeric), description,
status (pending/approved/rejected), rejection_reason,
approved_by (FK profiles), approved_at, created_at
```

#### `assignments` — opdrachten (door coordinator klaargezet per periode)
```
id, school_id, period_id, placement_id (legacy, niet meer gebruikt),
title, description, question (legacy), deadline,
max_points (default 10), xp_reward (default 100),
weging (default 1), sort_order (default 0),
questions (jsonb: [{id, v, hint, punten}]),
status/answer (legacy velden, niet meer gebruikt), created_at
```
> Let op: `placement_id` en `status`/`answer` zijn legacy kolommen uit de initiële opzet. De nieuwe aanpak gebruikt `period_id` en de aparte `student_assignments` tabel.

#### `student_assignments` — inleveringen per student
```
id, school_id, assignment_id (FK assignments), student_id (FK profiles),
placement_id, status (open/submitted/graded),
answer (tekst), points (behaalde punten), grade (numeric 1-10),
xp_awarded, submitted_at,
graded_by (FK profiles), graded_at, feedback, created_at
```
UNIQUE(assignment_id, student_id).

#### `week_stories` — wekelijkse reflecties
```
id, school_id, student_id, placement_id,
week_number, year,
mood (emoji string), answer_1, answer_2, answer_3,
xp_awarded (default 100), created_at
```
UNIQUE(student_id, week_number, year).

De 4 vragen:
1. Hoe was je stageweek? (mood emoji: 😴😐🙂😎🔥)
2. Wat is het tofste dat je deze week hebt gedaan?
3. Waar liep je tegenaan?
4. Wat wil je volgende week anders aanpakken?

#### `badges` — badges aanpasbaar door coordinator
```
id, school_id, emoji, name, description,
type (streak/hours/assignments/grade/weekstory/manual),
threshold, xp_reward (default 50), sort_order, created_at
```
9 defaults aangemaakt voor ROC Rotterdam.
> ⚠️ Badge-toekenning is NIET geautomatiseerd — geen achtergrondproces.

#### `student_badges` — behaalde badges
```
id, school_id, student_id, badge_id, awarded_at
```
UNIQUE(student_id, badge_id).

#### `evaluation_moments` — toetsmomenten (door coordinator beheerd)
```
id, school_id, period_id,
name, week_label,
type (midterm/final/custom),
questions (jsonb: [{id, type (slider/sterren/tekst), tekst}]),
sort_order, created_at
```
Defaults: Tussenevaluatie week 26 (midterm) + Eindevaluatie week 38 (final).

#### `evaluation_responses` — coach vult evaluatieformulier in
```
id, school_id, placement_id, moment_id, coach_id,
responses (jsonb: {0: waarde, 1: waarde, ...}),
coach_signed_at, created_at, updated_at
```
UNIQUE(placement_id, moment_id).

#### `coach_praise` — 👊 Goed bezig knop (max 3x per student per coach)
```
id, school_id, coach_id, student_id,
count (integer max 3), last_given_at
```
UNIQUE(coach_id, student_id).

#### `coordinator_invites` — mede-coordinatoren uitnodigen
```
id, school_id, email, period_id, invited_by,
status (invited/active), invited_at
```
UNIQUE(school_id, email).

#### `email_templates` — per school aanpasbaar
```
id, school_id,
type (supervisor_welcome/hours_reminder/assignment_reminder),
subject, body, updated_at
```
Variabelen in templates: `{{begeleider_naam}}`, `{{leerling_naam}}`, `{{bedrijfsnaam}}`, `{{startdatum}}`, `{{link}}`, `{{coordinator_naam}}`, `{{coordinator_email}}`, `{{school_naam}}`

#### Minder gebruikte tabellen
- `companies` — stagebedrijven (aanwezig, niet actief gebruikt in UI)
- `academic_years` — schooljaren (aanwezig, FK op placements, niet actief gebruikt)
- `audit_logs` — actielog (INSERT via service_role, UPDATE voor ON DELETE SET NULL cascade)
- `documents` — uploads (tabel aanwezig, geen UI)
- `evaluations` — oudere evaluatietabel (vervangen door `evaluation_responses`)
- `skills` + `student_skills` — competenties (tabel aanwezig, geen UI)

---

## 7. RLS Policies — Volledig Overzicht

| Tabel | Policy | Cmd | Rollen |
|-------|--------|-----|--------|
| academic_years | academic_years_insert | INSERT | public |
| academic_years | academic_years_select | SELECT | public |
| assignments | assignments_school | ALL | authenticated |
| audit_logs | audit_logs_insert_service | INSERT | service_role |
| audit_logs | audit_logs_select | SELECT | public |
| audit_logs | audit_logs_update | UPDATE | authenticated (voor ON DELETE SET NULL) |
| badges | badges_school | ALL | authenticated |
| coach_praise | praise_school | ALL | authenticated |
| companies | companies_insert/select/update | ALL | public |
| coordinator_invites | coordinator_invites_school | ALL | authenticated |
| documents | documents_insert/select | INSERT/SELECT | public |
| email_templates | email_templates_school | ALL | authenticated |
| evaluation_moments | eval_moments_school | ALL | authenticated |
| evaluation_responses | eval_responses_school | ALL | authenticated |
| evaluations | evaluations_insert/select | INSERT/SELECT | public |
| hours | hours_school | ALL | authenticated |
| period_classes | period_classes_coordinator | ALL | authenticated (coordinator only) |
| period_classes | period_classes_select_all | SELECT | anon + authenticated |
| placements | placements_delete | DELETE | authenticated (coordinator/super_admin) |
| placements | placements_insert | INSERT | authenticated |
| placements | placements_select | SELECT | authenticated |
| placements | placements_update | UPDATE | authenticated |
| profiles | profiles_inserten_coordinator | INSERT | authenticated |
| profiles | profiles_inserten_service | INSERT | service_role |
| profiles | profiles_lezen | SELECT | anon + authenticated |
| profiles | profiles_updaten | UPDATE | authenticated |
| profiles | profiles_verwijderen_coordinator | DELETE | authenticated |
| schools | schools_select | SELECT | public |
| skills | skills_select | SELECT | public |
| stage_periods | stage_periods_school | ALL | authenticated |
| student_assignments | student_assignments_school | ALL | authenticated |
| student_badges | student_badges_school | ALL | authenticated |
| student_skills | student_skills_select | SELECT | public |
| week_stories | week_stories_school | ALL | authenticated |

---

## 8. API Routes

### `POST /api/send-invite`
Stuurt intake-link email naar leerling.
- Auth: vereist coordinator sessie via cookies
- Haalt placement + student + school op via Supabase join
- Email verstuurd door Resend van `noreply@stagepoort.nl`
- Zet placement status → `invited` + `invited_at`
- Terugvalt op 400 als student geen email heeft

### `POST /api/send-supervisor`
Stuurt welkomstmail naar stagebegeleider bij goedkeuring.
- Auth: vereist coordinator sessie
- Haalt email template op uit `email_templates` (valt terug op default als niet ingesteld)
- Vult alle template variabelen in
- Zet placement status → `active` + `approved_at`
- Schrijft naar `audit_logs`

### `POST /api/import-studenten`
Importeert leerlingen uit geplakt of CSV tekst.
- Auth: vereist coordinator sessie
- Input: `{ leerlingen: [{naam, email, klas}], schoolId, coordinatorId }`
- Maakt profiel aan **zonder** `user_id` (trigger koppelt later)
- Als profiel al bestaat op email: update naam/klas
- Als al een actieve placement bestaat: sla over
- Maakt `pending` placement aan
- Retourneert `{ aangemaakt, overgeslagen }`

### `POST /api/intake` ⚠️
Slaat intakeformulier op (bedoeld voor anonieme leerling).
- Input: `{ placementId, data: { voornaam, tussenvoegsel, achternaam, telefoon_leerling, bedrijfsnaam, bezoekadres, postcode, plaats, telefoon_bedrijf, email_bedrijf, stagebegeleider, groene_stage } }`
- **BUG:** gebruikt anon key zonder service role. Werkt alleen met actieve auth sessie.
- Zet placement status → `review`

---

## 9. Coordinator Dashboard — Alle Functies

### `/dashboard/coordinator` — Dashboard (gecombineerd met studenten)

**Data geladen:**
- profiles (studenten van school)
- placements (alle, incl. completed voor stagehistorie)
- stage_periods
- Counts: actieve placements, pending uren

**Functies:**
- Begroeting met tijdstip (goedemorgen/middag/avond)
- KPI tegels: Studenten / Actieve stages / Uren te keuren / Aandacht nodig
- Filters: zoek, periode dropdown, klas dropdown
- Status tabs: Alle / Geen stage / Achterstand / Aandacht / Op koers / Bijna klaar (met counts)
- CSV export van gefilterde studenten
- Studententabel met uitklapdetail
- **Edit modal** — naam, email, klas + stageperiode dropdown (koppelt `period_id` aan placement)
- **Uitklapdetail** — student info + bedrijfsinfo + stageperiode naam + stagehistorie (completed placements)
- **Nieuw schooljaar** — sluit actieve placement af als `completed`, maakt nieuwe `pending` aan
- **Verwijder** — bevestigingsmodal, verwijdert placements dan profiel

**Status bepaling `bepaalStatus()`:**
- pending/invited → 'geen stage'
- review → 'aandacht'
- active/halfway → 'op koers'
- overige → 'geen stage'

### `/dashboard/coordinator/koppelingen`

**4 secties op basis van placement status:**

**🔴 pending** — "Link nog versturen"
- Knop "📨 Stuur invullink" → `POST /api/send-invite` → status wordt `invited`

**🟡 invited** — "Wacht op leerling"
- Leerling heeft link maar nog niet ingevuld

**🟠 review** — "Ter beoordeling"
- Uitklapbaar: alle ingevulde intakegegevens
- ✅ Goedkeuren → `POST /api/send-supervisor` → status `active`, email naar begeleider
- ❌ Afwijzen → reden invullen, status `rejected`

**🟢 active/halfway** — "Actieve koppelingen"
- Uitklapbaar: alle gegevens
- ✏️ "Gegevens aanpassen" modal — alle intake velden + groene stage toggle

**Import (onderaan pagina):**
- Tab "Kopiëren & plakken": tekstvak, herkent tabs/komma's/nieuwe regels als separator
- Tab "CSV uploaden": file input, parseert CSV
- Preview tabel → "Importeer X leerlingen" → `POST /api/import-studenten`

### `/dashboard/coordinator/beoordelen`

**Tab ⏱ Uren keuren** (badge teller toont aantal pending):
- Query: `hours WHERE status = 'pending' AND school_id`
- Per regel: initialen avatar, naam + klas + bedrijf, datum, uren, omschrijving
- ✅ Goedkeuren: `status = 'approved'`, `approved_by`, `approved_at`
- ❌ Afwijzen: textarea voor reden, `status = 'rejected'`, `rejection_reason`
- "Keur alles goed" bulk: `.in('id', ids)`

**Tab 📁 Opdrachten beoordelen** (badge teller):
- Query: `student_assignments WHERE status = 'submitted' AND school_id`
- Uitklapbaar: antwoord leerling
- Cijfer 1-10 + voldoende/onvoldoende indicator
- Feedback tekstveld
- Opslaan: `status = 'graded'`, `grade`, `graded_by`, `graded_at`, `feedback`

### `/dashboard/coordinator/opdrachten`

**Periode tabs** — switcht actieve periode ID

**Opdrachten per periode:**
- Filter: `assignments WHERE period_id = actievePeriode AND school_id`
- "+ Nieuwe opdracht" → insert met lege defaults
- Uitklapbare editor per opdracht:
  - Titel, deadline, XP reward, weging
  - Omschrijving
  - Vragen editor: vraagtekst, hint, punten per vraag (opgeslagen als JSONB `questions`)
- Normering sectie: tabel met max punten (som vraagpunten) + weging per opdracht
  - Weging direct bewerkbaar en auto-saved via `onBlur`
  - Formule: `cijfer = 1 + 9 × (behaald / max)`

**Evaluatievragen:**
- Tabs per evaluatiemoment (tussenevaluatie/eindevaluatie/custom)
- Per vraag: type (slider/sterren/tekst), vraagtekst
- + Vraag toevoegen, + Nieuw toetsmoment

**Badges:**
- Alle school badges: emoji, naam, drempel aanpasbaar
- + Nieuwe badge toevoegen, verwijderen

### `/dashboard/coordinator/beheer`

**Tab 📅 Stageperiodes:**
- Overzicht: naam, looptijd, urendoel
- Aanmaken: naam + urendoel + startdatum + einddatum
- Verwijderen

**Tab 👥 Mede-coördinatoren:**
- Email + periode → insert in `coordinator_invites`
- Overzicht: email, periode, status (Verstuurd/Geactiveerd)
- Herinnering knop (toont toast, verstuurt nog geen echte mail)

**Tab 📧 E-mailtemplate:**
- Bewerkt `email_templates` voor `type = 'supervisor_welcome'`
- Variabelen sidebar: klik om toe te voegen aan body tekst
- Preview knop: vult VOORBEELD waarden in en toont HTML render
- Opslaan: upsert (insert als nieuw, update als bestaat)

---

## 10. Student Dashboard — Alle Functies

**Thema:** Donker (#0B0F14 bg, #F26B1D oranje). Bottom navigation bar (4 tabs).

**Data geladen bij init:**
- Profile (eigen), placement (niet cancelled/completed, meest recent)
- Badges + student_badges
- Hours (eigen)
- Assignments (school) + student_assignments (eigen)
- Week stories (eigen, desc)
- Klassement (alle students van school: id, name, xp, streak, klas)

### Tab 🧭 Mijn stage

**Hero blok:**
- Avatar met initialen, "Yo [voornaam] 👋"
- Bedrijfsnaam + begeleider naam
- 3 statistieken: streak 🔥 / XP + level / goedgekeurde uren van max uren
- XP voortgangsbalk: `300 XP per level`, level = `floor(xp/300)+1`

**Kaartjes:**
- Stagecoach: naam + email + "✉️ Mail coach" knop
- Stagebegeleider: naam + bedrijf + "📨 Link opnieuw" knop (alleen visueel, geen functie)

**Stageroute** (4 stappen visueel): Gestart → Uren & opdrachten → Tussenevaluatie → Eindgesprek

**Badges grid:**
- Behaald: oranje glow border
- Niet behaald: grijs met voortgangsbalkje (hours: goedgekeurde uren / drempel, streak: streak / drempel)

**Klassement:**
- Tabs: 🏫 School / 👥 Mijn klas (filter op `klas = profile.klas`)
- Types: ⚡ XP / 🔥 Streak (gesorteerd desc)
- Eigen positie gemarkeerd in oranje
- Volledig scrollbaar (niet beperkt)
- Disclaimer: "Alleen scores zichtbaar — nooit cijfers of reflecties"

**Laatste uren** (3 meest recente, met status badge)

### Tab ⏱ Uren

**Formulier:** datum + uren (step 0.5) + omschrijving → insert in `hours`
- Vereist placement.id (placement wordt bij alle statussen geladen behalve cancelled/completed)
- Direct toevoegen aan lokale state

**Weekoverzicht:** gegroepeerd per weeknummer, met statussen:
- Wacht op goedkeuring (geel), Goedgekeurd (groen), Afgekeurd (rood + rejection_reason)

### Tab 📁 Opdrachten

- Lijst van `assignments` gefilterd op `school_id` + `period_id` van actieve placement
- Per opdracht: titel, omschrijving, deadline, status
- Open: "Start opdracht +[xp] XP ⚡" → uitklapbaar tekstveld → inleveren
  - Upsert `student_assignments` met `status = 'submitted'`
  - XP update: `profiles.xp += xp_reward`, level herberekend
  - Beide direct bijgewerkt in lokale state via `setProfile` prop
- Ingeleverd: "Ingeleverd" badge
- Beoordeeld: cijfer + eventuele feedback

### Tab ✨ Weekstory

**4 swipe-stappen:**
1. Mood emoji kiezen (😴😐🙂😎🔥)
2. Tofste moment (tekst)
3. Waar tegenaan gelopen (tekst)
4. Wat volgende week anders (tekst)

**Bij verzenden:**
- Insert in `week_stories`
- `profiles.xp += 100`, `profiles.streak += 1`, level herberekend
- `profiles.last_story_week` + `profiles.last_story_year` bijgewerkt
- +100 XP animatie
- Alles direct bijgewerkt in lokale state via `setProfile` prop

**Na invullen:** overzicht van eerdere weken (mood + highlight)

---

## 11. Coach Dashboard — Alle Functies

**Thema:** Licht (coordinator-stijl, #F7F3EE bg). Horizontale tab-navigatie in sticky header.

**Data geladen:**
- Coach profile
- Alle placements van school (niet cancelled/completed)
- Alle studenten van school
- Alle uren van school
- Alle assignments van school
- Ingeleverde student_assignments (status = submitted)
- Evaluation_moments + evaluation_responses
- Coach_praise (eigen)
- Week_stories (alle, gesorteerd desc)

### Tab 🧭 Mijn studenten

Filter: `placements WHERE coach_id = profile.id`

**KPI tegels:** Mijn studenten / Op koers / Actie nodig

**Per student kaart:**
- Voortgangsbalk uren (goedgekeurd / hours_required) altijd zichtbaar
- Slimme alerts (berekend client-side):
  - 🔴 Geen uren 2+ weken: laatste `hours.created_at` ouder dan 14 dagen
  - 🟠 Deadline gemist: `assignments.deadline < today` + geen student_assignment voor die opdracht
  - Grijs: Nog geen stage (geen company_name)
- Uitklapbaar:
  - Stageroute visueel (fase bepaald door placement.status)
  - Leerling info: naam, klas, telefoon, email (als link)
  - Bedrijf info: naam, begeleider, adres als **Google Maps link**, telefoon, email
  - Weekstory preview: meest recente week, mood + antwoord_1 + antwoord_2
  - 👊 Goed bezig knop:
    - Leest `coach_praise WHERE coach_id = profile.id AND student_id = student.id`
    - Max 3x per student: als count >= 3 → disabled
    - Increment count in `coach_praise` (upsert)
  - 📧 Mail student (mailto link)

### Tab ✅ Nakijken

Filter: `student_assignments WHERE status = 'submitted'` + student in mijn placements.

**Nakijkstapel:** tabel met student, opdracht, indiendatum, max punten, "Nakijken" knop

**Nakijkscherm (per opdracht):**
- Sticky header: opdrachtnaam + student + `behaald / max punten` + live cijfer
- Per vraag uit `assignments.questions` JSONB:
  - Vraagtekst + antwoord uit `student_assignments.answer`
  - Punten knoppen (0 tot max per vraag)
- Als geen vragen (max_points-only): direct cijfer 1-10 invullen
- Feedback tekstveld
- Formule: `cijfer = 1 + 9 × (behaald / max)`, altijd 1 decimaal
- "Cijfer vaststellen" → update `student_assignments`: `status = 'graded'`, `grade`, `graded_by`, `graded_at`, `feedback`

### Tab 📋 Evaluaties

Per student (met company_name) een kaart met alle evaluatiemomenten.

**Per moment:**
- Status: ✅ Ingevuld (groen) / ⏳ Nog te doen (oranje)
- Knop: "Invullen" of "Bekijken/Bewerken"

**Invulscherm per moment:**
- Vragen uit `evaluation_moments.questions` JSONB:
  - `slider` → range input 1-10, toont getal
  - `sterren` → 4 knoppen (Onvoldoende/Voldoende/Goed/Uitstekend met ⭐⭐⭐⭐)
  - `tekst` → textarea
- Antwoorden opgeslagen als `{0: waarde, 1: waarde, ...}` in `evaluation_responses.responses`
- "Opslaan & Ondertekenen" → upsert `evaluation_responses` + `coach_signed_at`

### Tab 📝 Inschrijven

Tabel van alle actieve placements in school (niet pending/cancelled/completed).

**Per rij:** student naam+klas, bedrijf, huidige coach status:
- 👋 Jij (oranje) — coach is al ingeschreven
- [coach naam] (blauw) — andere coach
- Nog vrij (groen) — geen coach

**Acties:**
- "Schrijf mij in": update `placements.coach_id = profile.id`, `coach_name`, `coach_email`
- "Uitschrijven": set `coach_id/coach_name/coach_email = null`
- Lokale state direct bijgewerkt

---

## 12. Gamification Systeem

| Element | Hoe het werkt |
|---------|---------------|
| XP | Weekstory +100, Opdracht inleveren +xp_reward van opdracht |
| Level | `floor(xp / 300) + 1`, bijgewerkt bij elke XP mutatie |
| Streak | +1 per weekstory, opgeslagen in `profiles.streak` |
| Badges | 9 types, coordinator aanpasbaar |
| Klassement | `profiles.xp` en `profiles.streak`, school of klas |

### Badge types
| Type | Drempel betekenis |
|------|-------------------|
| streak | Aantal weken streak |
| hours | Aantal goedgekeurde uren |
| assignments | Aantal ingeleverde opdrachten |
| grade | Minimaal cijfer (bijv. drempel 8 = eerste 8+) |
| weekstory | Niet actief gebruikt |
| manual | Handmatig toe te kennen (nog geen UI) |

> ⚠️ **Badge-toekenning is niet geautomatiseerd.** Drempels zijn opgeslagen maar er is geen trigger of achtergrondproces.

---

## 13. Intakeformulier (`/intake/[token]`)

Token = placement_id. Anonieme pagina (geen login vereist).

**4 stappen:**
1. Persoonlijk: voornaam, tussenvoegsel, achternaam, telefoonnummer
2. Stagebedrijf: naam, bezoekadres, postcode, plaats, telefoon, email
3. Stagebegeleider: naam
4. Bevestiging + groene stage vraag (ja/nee knoppen)

**Bij laden:** plaatst eerst een SELECT op placement om:
- Te checken of token geldig is
- Pre-fill formulier als al eerder ingevuld (bijv. na afwijzing)
- Foutmelding als status niet pending/invited/rejected is

**Bij verzenden:** `POST /api/intake` (zie bug #1!)

---

## 14. Deployment & Configuratie

### Vercel
- Automatisch deploy bij push naar `main` branch van `github.com/cucuf00/stagepoort`
- Alle env vars in Vercel dashboard ingesteld
- `next.config.ts` is leeg (geen speciale configuratie)
- Geen middleware actief (middleware.js is leeg)

### Supabase Auth
- Email Auth provider: magic link ingeschakeld
- SMTP: custom via Resend
- Callback URL: `https://stagepoort.vercel.app/auth/callback`
- Auth rate limits: standaard Supabase instellingen

### Navigation
- Coordinator gebruikt `CoordinatorLayout.js` sidebar
- Navigatie via `window.location.href` (harde navigatie) i.p.v. Next.js `router.push` of `Link` — om cache-problemen te vermijden

---

## 15. Wat Nog Niet Gebouwd Is (Prioriteit)

### Kritiek (werkt niet zonder fix)
1. **Intake flow voor anonieme studenten** — fix bug #1 (anon RLS policies of service role key)

### Hoog (core functionaliteit mist)
2. **Uren ophalen in coordinator dashboard** — tabel toont altijd `0 / X u`
3. **Stagebegeleider dashboard** — `/begeleider/[placement_id]` bestaat niet; begeleider kan nergens inloggen
4. **Automatische badge-toekenning** — triggers of achtergrondproces bij XP/uren/opdrachten drempel

### Middel
5. **Coach toewijzen door coordinator** — coordinator kan coach_id niet instellen; coach schrijft zichzelf in
6. **Opnieuw uitnodigen knop** — als magic link verlopen is (geen UI op koppelingenpagina)
7. **Herinnering mede-coördinator** — knop bestaat maar verstuurt geen echte email
8. **Weekstory bevestiging** — na weekstory staat "+100 XP" animatie maar het profielpaneel (streak, XP) in "Mijn stage" tab wordt pas bijgewerkt na tab-wissel, niet live

### Laag
9. **Dead code opruimen** — verwijder `StudentenClient.js`, `StudentClient.js`, `studenten/page.js`
10. **Super admin dashboard** — multi-school beheer
11. **Bulk email herinnering** — via selectiebalk in studententabel
12. **Auto-email bij uren ingediend** — email naar stagebegeleider/coach

---

*Handover v2 — 13 juni 2026 — volledig gecontroleerd aan de hand van live codebase, database schema en RLS policies.*
