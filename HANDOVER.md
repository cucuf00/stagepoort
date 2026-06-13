# Stagepoort — Volledige Project Handover

> Geschreven op 13 juni 2026. Dit document beschrijft het volledige project van A tot Z zodat een nieuwe AI zonder problemen kan verderbouwen.

---

## 1. Projectoverzicht

**Stagepoort** is een multi-tenant SaaS-platform voor VMBO/MBO-scholen dat het stageproces volledig digitaliseert: van leerlingimport en intakeformulier tot urenregistratie, opdrachten, weekstories en officiële evaluaties.

### Verdienmodel
- Jaarlicentie per school: €2.000–€25.000
- Elke school is een aparte tenant met volledige data-isolatie via Row Level Security

### Doelgroep
- **Stagecoördinatoren** — beheren het volledige stageproces
- **Leerlingen (studenten)** — dienen uren in, maken opdrachten, vullen weekstories in
- **Stagecoaches (docenten)** — begeleiden studenten, nakijken, evalueren
- **Stagebegeleiders (bedrijf)** — toekomst: eigen dashboard (nog niet gebouwd)

---

## 2. Tech Stack

| Component | Keuze |
|-----------|-------|
| Framework | Next.js 16 (App Router) |
| React | 19.2.4 |
| Database + Auth | Supabase (PostgreSQL + RLS) |
| Hosting | Vercel |
| Email | Resend |
| Styling | Puur inline CSS (geen Tailwind actief) |

### Credentials & Omgevingsvariabelen

| Variabele | Waarde |
|-----------|--------|
| `NEXT_PUBLIC_SUPABASE_URL` | `https://vnarhxsxbbmbowtvzfaj.supabase.co` |
| `NEXT_PUBLIC_SUPABASE_ANON_KEY` | `sb_publishable_-brPYXovkOjOf1yZaZ791Q_ibksTM3R` |
| `RESEND_API_KEY` | `re_M9QBuczq_39MSEjK2fWNbQ6LybpEkobwb` |
| `NEXT_PUBLIC_SITE_URL` | `https://stagepoort.vercel.app` |

### Repositories & Services
- **GitHub:** `github.com/cucuf00/stagepoort`
- **Vercel project:** `stagepoort-s-projects/stagepoort`
- **Live URL:** `https://stagepoort.vercel.app`
- **Supabase project ID:** `vnarhxsxbbmbowtvzfaj` (regio EU Frankfurt)
- **Resend domein:** `stagepoort.nl` (geverifieerd via TransIP DNS)
- **Supabase SMTP:** `smtp.resend.com:465`, sender: `noreply@stagepoort.nl`

---

## 3. Bestandsstructuur

```
stagepoort/
├── app/
│   ├── api/
│   │   ├── import-studenten/route.js    Server-side CSV/plak import (RLS bypass)
│   │   ├── intake/route.js              Anonieme intake submit (geen auth nodig)
│   │   ├── send-invite/route.js         Email invullink naar leerling
│   │   └── send-supervisor/route.js     Email naar stagebegeleider bij goedkeuring
│   ├── auth/callback/page.js            Magic link callback + rol-routing
│   ├── components/
│   │   └── CoordinatorLayout.js         Gedeelde sidebar (donkerblauw) voor coordinator
│   ├── dashboard/
│   │   ├── coach/page.js                Coach dashboard (4 tabs)
│   │   ├── coordinator/
│   │   │   ├── page.js                  Dashboard + studenten gecombineerd
│   │   │   ├── koppelingen/page.js      Stagekoppeling beheer (4 secties)
│   │   │   ├── beoordelen/page.js       Uren + opdrachten beoordelen
│   │   │   ├── opdrachten/page.js       Opdrachten/evaluaties/badges beheer
│   │   │   └── beheer/page.js           Periodes + coordinatoren + email template
│   │   └── student/page.js              Student dashboard (donker thema, 4 tabs)
│   ├── intake/[token]/page.js           Anoniem intakeformulier (4 stappen)
│   ├── login/page.js                    Magic link loginpagina
│   ├── onboarding/page.js               Klas invullen bij eerste login student
│   ├── layout.js
│   └── page.js                         Landingspagina / redirect
├── lib/supabase/
│   ├── client.js                        Browser Supabase client
│   └── server.js                        Server-side Supabase client (service role)
├── middleware.js                         Leeg (auth is volledig client-side)
├── package.json
└── HANDOVER.md                          Dit document
```

---

## 4. Auth & Rollen

### Inlogmethode
Volledig **magic link** via Supabase Auth + Resend SMTP. Geen wachtwoorden.

### Rollen (opgeslagen in `profiles.role`)
```
student       → /dashboard/student
coordinator   → /dashboard/coordinator
coach         → /dashboard/coach
company       → (nog geen dashboard)
super_admin   → (nog geen dashboard)
```

### Auth Flow
1. Gebruiker vult email in op `/login`
2. Supabase stuurt magic link via `noreply@stagepoort.nl`
3. Link opent `/auth/callback` → `verifyOtp` → `exchangeCodeForSession`
4. Profiel ophalen op `user_id` → rol-routing naar juist dashboard
5. **Trigger:** als `profiles.user_id IS NULL` (CSV-import leerling) en email matcht → trigger koppelt `user_id` automatisch

### Trigger: `handle_new_user()`
Bij elke nieuwe auth.user kijkt de trigger of er al een profiel bestaat met hetzelfde email en `user_id IS NULL`. Zo ja: update dat profiel met de nieuwe `user_id`. Dit is essentieel voor de CSV-import flow.

---

## 5. Database Schema

### Multi-tenant architectuur
Elke tabel heeft een `school_id` kolom. RLS helper functies:
- `get_my_school_id()` → haalt school_id op van ingelogde user
- `get_my_role()` → haalt rol op
- `get_my_profile_id()` → haalt profile id op
- `is_super_admin()` → boolean check

### Alle tabellen (23 stuks)

#### `schools`
Tenant root. Eén school = één tenant.
```
id, name, slug (uniek), city, active, license_status, max_students, subscription_ends_at, created_at
```
**Testdata:** ROC Rotterdam, id = `00000000-0000-0000-0000-000000000001`

#### `profiles`
Centrale gebruikerstabel voor alle rollen. `user_id` is nullable (CSV-import leerlingen hebben nog geen auth account).
```
id, user_id (nullable FK auth.users), school_id, company_id,
name, role (student/coordinator/coach/company/super_admin),
phone, klas, email,
xp, level, streak, last_story_week, last_story_year,
created_at
```
**Constraint:** `UNIQUE(user_id, school_id)` (maar user_id nullable!)

#### `placements`
Kern van het systeem. Eén placement = één stage van een leerling.
Een leerling kan meerdere placements hebben (één per schooljaar).
```
id, school_id, student_id, coach_id (FK profiles), coordinator_id,
company_id, academic_year_id, period_id (FK stage_periods),
status (pending/invited/review/active/rejected/halfway/completed/cancelled),
start_date, end_date, hours_required,
first_name, infix, last_name, student_phone,
company_name, company_address, company_postcode, company_city,
company_phone, company_email, supervisor_name,
green_stage (bool), rejection_reason,
invited_at, submitted_at, approved_at, completed_at,
final_grade, coach_name, coach_email,
created_at
```

**Placement statussen:**
- `pending` → aangemaaklt, nog geen invullink verstuurd
- `invited` → invullink verstuurd naar leerling
- `review` → leerling heeft intake ingevuld, wacht op coordinator
- `active` → goedgekeurd, stage actief
- `rejected` → afgewezen met reden
- `halfway` → halverwege (tussenevaluatie gedaan)
- `completed` → afgerond
- `cancelled` → geannuleerd

#### `stage_periods`
Stageperiodes per school (Leerjaar 3, Leerjaar 4 etc.)
```
id, school_id, name, start_date, end_date, hours_goal, created_by, created_at
```
**Testdata:** Leerjaar 3 oriëntatiestage (160u) + Leerjaar 4 beroepsstage (320u)

#### `hours`
Urenregistratie per leerling.
```
id, school_id, placement_id, student_id,
date, hours, description,
status (pending/approved/rejected), rejection_reason,
approved_by, approved_at, created_at
```

#### `assignments`
Opdrachten klaargezet door coordinator, per periode.
```
id, school_id, period_id, placement_id (legacy),
title, description, question (legacy), deadline,
max_points, xp_reward, weging, sort_order,
questions (jsonb: [{id, v, hint, punten}]),
status (open/submitted/approved/rejected — legacy veld),
answer (legacy), created_at
```

#### `student_assignments`
Inleveringen van studenten per opdracht.
```
id, school_id, assignment_id, student_id, placement_id,
status (open/submitted/graded),
answer, points, grade,
xp_awarded, submitted_at,
graded_by, graded_at, feedback, created_at
```

#### `week_stories`
Wekelijkse reflecties van studenten. 4 vragen.
```
id, school_id, student_id, placement_id,
week_number, year,
mood (emoji), answer_1, answer_2, answer_3,
xp_awarded, created_at
```
**UNIQUE:** (student_id, week_number, year)

**De 4 vragen:**
1. Hoe was je stageweek? (mood emoji)
2. Wat is het tofste dat je deze week hebt gedaan?
3. Waar liep je tegenaan?
4. Wat wil je volgende week anders aanpakken?

#### `badges`
Badges aanpasbaar door coordinator.
```
id, school_id, emoji, name, description,
type (streak/hours/assignments/grade/weekstory/manual),
threshold, xp_reward, sort_order, created_at
```
**9 default badges** voor ROC Rotterdam aangemaakt.

#### `student_badges`
Behaalde badges per student.
```
id, school_id, student_id, badge_id, awarded_at
```

#### `evaluation_moments`
Toetsmomenten (tussenevaluatie/eindevaluatie) aanpasbaar door coordinator.
```
id, school_id, period_id,
name, week_label,
type (midterm/final/custom),
questions (jsonb: [{id, type, tekst}]), — type: slider/sterren/tekst
sort_order, created_at
```
**2 default momenten:** Tussenevaluatie (week 26) + Eindevaluatie (week 38)

#### `evaluation_responses`
Coach vult evaluatieformulier in per leerling per moment.
```
id, school_id, placement_id, moment_id, coach_id,
responses (jsonb: {0: value, 1: value, ...}),
coach_signed_at, created_at, updated_at
```
**UNIQUE:** (placement_id, moment_id)

#### `coach_praise`
Bijhouden van "👊 Goed bezig" knop (max 3x per student per coach).
```
id, school_id, coach_id, student_id,
count (max 3), last_given_at
```
**UNIQUE:** (coach_id, student_id)

#### `coordinator_invites`
Mede-coordinatoren uitnodigen.
```
id, school_id, email, period_id, invited_by,
status (invited/active), invited_at
```

#### `email_templates`
E-mailtemplate per school, aanpasbaar door coordinator.
```
id, school_id, type (supervisor_welcome/hours_reminder/assignment_reminder),
subject, body, updated_at
```
**Variabelen in templates:** `{{begeleider_naam}}`, `{{leerling_naam}}`, `{{bedrijfsnaam}}`, `{{startdatum}}`, `{{link}}`, `{{coordinator_naam}}`, `{{coordinator_email}}`, `{{school_naam}}`

#### Overige tabellen (minder actief gebruikt)
- `companies` — stagebedrijven database
- `academic_years` — schooljaren
- `audit_logs` — actielog (coordinator acties)
- `documents` — uploads (nog niet in gebruik)
- `evaluations` — oudere evaluatietabel (vervangen door evaluation_responses)
- `skills` + `student_skills` — competenties (nog niet in gebruik)
- `period_classes` — klassen gekoppeld aan periodes

---

## 6. RLS Policies

### Aanpak
Alle tabellen hebben RLS enabled. Helper functies zijn SECURITY DEFINER.

### Kritieke policies

**profiles:**
- SELECT: anon + authenticated (iedereen kan profielen lezen binnen school)
- INSERT: coordinator + service_role
- UPDATE: coordinator (binnen school) OF student (eigen profiel via user_id)
- DELETE: coordinator (alleen students)

**placements:**
- SELECT: authenticated (binnen school)
- INSERT: authenticated (binnen school)
- UPDATE: coordinator (alles) OF student (eigen pending/invited/rejected)
- DELETE: coordinator + super_admin

**hours:**
- ALL: authenticated (binnen school via school_id)

**assignments, student_assignments, badges, week_stories, stage_periods:**
- ALL: authenticated (binnen school)

**audit_logs:**
- INSERT: service_role
- SELECT: public
- UPDATE: authenticated (binnen school) — nodig voor ON DELETE SET NULL cascade

### Bekende issue (opgelost)
`audit_logs` had een FK naar `placements` zonder UPDATE policy, waardoor `ON DELETE SET NULL` cascade faalde bij leerling verwijderen. Dit is opgelost door een UPDATE policy toe te voegen.

---

## 7. API Routes

Alle server-side routes gebruiken de **service role** Supabase client om RLS te bypassen.

### `POST /api/import-studenten`
Importeert leerlingen uit geplakte tekst of CSV.
- Verwacht: `{ tekst: string, schoolId: string, coordinatorId: string }`
- Maakt profiel aan **zonder** `user_id` (wordt gekoppeld bij eerste login via trigger)
- Maakt een `pending` placement aan

### `POST /api/intake`
Slaat intakeformulier op van anonieme leerling.
- Verwacht: `{ placementId: string, data: { voornaam, tussenvoegsel, achternaam, telefoon_leerling, bedrijfsnaam, bezoekadres, postcode, plaats, telefoon_bedrijf, email_bedrijf, stagebegeleider, groene_stage } }`
- Zet placement status naar `review`
- Werkt zonder authenticatie (leerling is niet ingelogd)

### `POST /api/send-invite`
Stuurt invullink email naar leerling.
- Verwacht: `{ placementId: string }`
- Verstuurt via Resend vanuit `noreply@stagepoort.nl`
- Zet placement status naar `invited`

### `POST /api/send-supervisor`
Stuurt welkomstmail naar stagebegeleider bij goedkeuring.
- Verwacht: `{ placementId: string }`
- Haalt email template op uit database
- Vult variabelen in
- Verstuurt via Resend
- Zet placement status naar `active`

---

## 8. Functionaliteiten per pagina

### `/login`
Magic link loginpagina. Eenvoudig emailformulier. Werkt voor alle rollen.

### `/auth/callback`
Client-side callback. Verwerkt magic link token, haalt profiel op, routeert naar juist dashboard.

### `/intake/[token]`
**Anoniem** 4-staps intakeformulier voor leerlingen.
- token = placement_id
- Stap 1: Persoonlijke gegevens (voornaam, tussenvoegsel, achternaam, telefoon)
- Stap 2: Stagebedrijf (naam, adres, postcode, plaats, telefoon, email)
- Stap 3: Stagebegeleider (naam)
- Stap 4: Groene stage (ja/nee) + bevestiging
- Submit via `/api/intake`

---

### Coordinator Dashboard (`/dashboard/coordinator`)

**Gecombineerd Dashboard + Studenten:**
- Begroeting met tijdstip
- KPI tegels: Studenten / Actieve stages / Uren te keuren / Aandacht nodig
- Filters: zoekbalk + periode dropdown + klas dropdown + CSV export
- Status tabs: Alle / Geen stage / Achterstand / Aandacht / Op koers / Bijna klaar
- Studententabel: naam, klas, status, bedrijf, uren + ✏️ 📧 🗑️ knoppen
- **Uitklapdetail per student:** student info + bedrijfsinfo + stageperiode + **stagehistorie** (vorige stages)
- **Edit modal:** naam, email, klas, stageperiode dropdown (koppelt period_id aan placement)
- **Verwijder:** bevestigingsmodal → verwijdert profiel + placements
- **🎓 Nieuw schooljaar:** sluit huidige placement af als `completed`, maakt nieuwe `pending` aan

---

### Koppelingen (`/dashboard/coordinator/koppelingen`)

4 secties op basis van placement status:

**🔴 Link nog versturen (pending)**
- Leerling is geïmporteerd maar heeft nog geen link
- Knop: "📨 Stuur invullink" → roept `/api/send-invite` aan

**🟡 Wacht op leerling (invited)**
- Link verstuurd, leerling nog niet ingevuld

**🟠 Ter beoordeling (review)**
- Leerling heeft intake ingevuld
- Uitklapbaar: alle ingevulde gegevens tonen
- Knoppen: ✅ Goedkeuren (→ `/api/send-supervisor`) | ❌ Afwijzen (met reden)

**🟢 Actieve koppelingen (active/halfway)**
- Stage loopt
- Uitklapbaar: alle gegevens
- Knop: "✏️ Gegevens aanpassen" → aanpassen modal (alle intake velden + groene stage)

**Import leerlingen (onderaan):**
- Tekstvak: plak naam + email + klas (tab-separated of kommagescheiden)
- Preview tabel → "Importeer X leerlingen" → roept `/api/import-studenten` aan

---

### Beoordelen (`/dashboard/coordinator/beoordelen`)

**Tab: ⏱ Uren keuren**
- Alle pending uren in de school
- Per regel: leerlingnaam + klas + bedrijf, datum, omschrijving, uren
- ✅ Goedkeuren | ❌ Afwijzen (met reden, zichtbaar voor leerling)
- "Keur alles goed" bulk knop
- Badge teller in tab

**Tab: 📁 Opdrachten beoordelen**
- Alle ingediende (submitted) opdrachten
- Uitklapbaar: antwoord leerling, cijfer 1-10 invullen, feedback
- Voldoende/onvoldoende indicator
- Badge teller in tab

---

### Opdrachten (`/dashboard/coordinator/opdrachten`)

**Periode tabs** bovenaan (switchen tussen Leerjaar 3 / Leerjaar 4 etc.)

**Opdrachten per periode:**
- Lijst met titel, omschrijving preview, deadline, aantal vragen, XP
- Uitklapbare editor:
  - Titel, deadline, XP beloning, weging
  - Omschrijving
  - Vragen editor: vraagtekst, hint (optioneel), punten per vraag

**Punten & Normering:**
- Tabel: opdracht, max punten (som van vraagpunten), weging
- Formule: `cijfer = 1 + 9 × (behaald / max)`

**Evaluatievragen stagebegeleider:**
- Tabs: Tussenevaluatie | Eindevaluatie | + Nieuw toetsmoment
- Per toetsmoment: naam, week-label, vragen (type: slider/sterren/tekst)

**Badges:**
- Alle badges aanpasbaar: emoji, naam, drempel
- + Nieuwe badge toevoegen

---

### Beheer (`/dashboard/coordinator/beheer`)

**Tab: 📅 Stageperiodes**
- Overzicht tabel: naam, looptijd, urendoel
- Nieuw aanmaken: naam, urendoel, startdatum, einddatum
- Verwijderen

**Tab: 👥 Mede-coördinatoren**
- Email invoeren + welke periode ze beheren
- Uitnodigen → staat in `coordinator_invites`
- Overzicht met status (Verstuurd / Geactiveerd) + Herinnering knop

**Tab: 📧 E-mailtemplate**
- Onderwerp + berichttekst bewerken
- Klik op variabele om toe te voegen aan tekst
- Preview: zo ziet de begeleider de mail
- Opslaan per school

---

### Student Dashboard (`/dashboard/student`)

**Donker thema** (#0B0F14 achtergrond, #F26B1D oranje accent). TikTok/Instagram-stijl. Bottom navigation bar.

**Tab: 🧭 Mijn stage**
- Hero: avatar initialen, naam, Yo [voornaam] 👋
- Statistieken: streak 🔥 / XP + level / goedgekeurde uren
- XP voortgangsbalk naar volgend level (300 XP per level)
- Stagecoach kaartje + stagebegeleider kaartje
- Stageroute: Gestart → Uren & opdrachten → Tussenevaluatie → Eindgesprek
- Badges grid: behaald = oranje glow, vergrendeld = grijs met voortgangsbalkje
- **Klassement** (scrollbaar):
  - Tabs: 🏫 School / 👥 Mijn klas
  - Types: ⚡ XP / 🔥 Streak
  - Eigen positie gemarkeerd (ook op plek 50)
  - Alleen scores zichtbaar — nooit cijfers of reflecties
- Laatste 3 uren onderaan

**Tab: ⏱ Uren**
- Formulier: datum, aantal uren, omschrijving → indienen
- Weekoverzicht met statussen: Wacht op goedkeuring / Goedgekeurd / Afgekeurd (met reden)

**Tab: 📁 Opdrachten**
- Lijst van coordinator-opdrachten per periode
- Open → "Start opdracht + XP" knop → uitklapbaar tekstveld
- Ingeleverd → wacht op beoordeling
- Beoordeeld → cijfer + feedback zichtbaar
- Bij inleveren: XP direct bijgewerkt in UI

**Tab: ✨ Weekstory**
- 4 swipe-stappen met voortgangsbalkjes
- Stap 1: Mood emoji kiezen (5 opties: 😴😐🙂😎🔥)
- Stap 2: Tofste moment
- Stap 3: Waar tegenaan gelopen
- Stap 4: Wat volgende week anders
- +100 XP animatie bij verzenden
- Streak +1, level berekend, alles direct in UI bijgewerkt
- Overzicht eerdere weken

---

### Coach Dashboard (`/dashboard/coach`)

Licht thema (coordinator-stijl). Horizontale tab-navigatie in header.

**Tab: 🧭 Mijn studenten**
- KPI tegels: Mijn studenten / Op koers / Actie nodig
- Per student een kaart:
  - Voortgangsbalk uren (altijd zichtbaar)
  - 🚨 Slimme alerts:
    - Rode tag: geen uren 2+ weken
    - Oranje tag: deadline gemist
    - Grijze tag: nog geen stage
  - Uitklapbaar:
    - Stageroute (4 stappen)
    - Leerling info (naam, klas, telefoon, email)
    - Bedrijf info (naam, begeleider, adres, **Google Maps link**, telefoon, email)
    - Weekstory preview (laatste week, mood + antwoorden)
    - 👊 **Goed bezig** knop (max 3x, bijgehouden in `coach_praise`)
    - 📧 Mail student knop

**Tab: ✅ Nakijken**
- Nakijkstapel (alleen eigen studenten)
- Nakijkscherm:
  - Per vraag: vraagtekst + antwoord leerling + punten knoppen (0 tot max)
  - Cijfer live berekend: `1 + 9 × (behaald / max)`, sticky header
  - Feedback tekstveld
  - Knop "Cijfer vaststellen" → zichtbaar voor student + coordinator

**Tab: 📋 Evaluaties**
- Per student kaart met alle evaluatiemomenten
- Status per moment: ✅ Ingevuld / ⏳ Nog te doen
- Invulscherm:
  - Slider (1-10)
  - Sterren (Onvoldoende/Voldoende/Goed/Uitstekend)
  - Tekstveld
- Digitaal ondertekenen bij opslaan
- Opgeslagen in `evaluation_responses`

**Tab: 📝 Inschrijven**
- Tabel van alle actieve placements in school
- Status: Jij / Nog vrij / Andere coach (naam)
- Inschrijven / Uitschrijven met één klik
- Update `placements.coach_id` + `coach_name` + `coach_email`

---

## 9. Gamification

| Element | Hoe het werkt |
|---------|---------------|
| XP | Weekstory +100, Opdracht inleveren = `xp_reward` van opdracht |
| Level | 300 XP per level, berekend als `floor(xp / 300) + 1` |
| Streak | +1 bij elke weekstory, wordt opgeslagen in `profiles.streak` |
| Badges | 9 types: streak/hours/assignments/grade/weekstory/manual |
| Klassement | Gebaseerd op `profiles.xp` en `profiles.streak`, gefilterd op school of klas |

**Let op:** Badge-toekenning is nog niet geautomatiseerd. Drempels zijn opgeslagen in `badges.threshold` maar er is nog geen achtergrondproces dat checkt of een badge behaald is.

---

## 10. Testdata

**School:** ROC Rotterdam
- School ID: `00000000-0000-0000-0000-000000000001`

**Coordinator:**
- Yusuf Bagcivan
- Email: `yusuf.bagcivan@hotmail.com` of `cucuf@live.nl`
- Profile ID: `0fc5500d-a299-4496-a7f1-be9ccef06657`

**Test studenten:**
- Jan (`cucuf00@gmail.com`) — klas 3F
- mkmk (`ybagcivan01@lentiz.nl`) — klas 3f
- Yusu (`zm@live.nl`) — klas B6G — heeft `user_id` gekoppeld, 100 XP, streak 1
- Yuf Deir (`ybagcivan01@lentiz.nl`)
- Yusuf Demir (`yusuf.bagcivan@hotmail.com`) — klas SD4B

---

## 11. Bekende Limitaties & TODO

### Nog niet gebouwd
- [ ] **Stagebegeleider dashboard** — begeleider op bedrijf heeft eigen portaal (`/begeleider/[placement_id]`) maar die pagina bestaat nog niet
- [ ] **Automatische badge-toekenning** — badges hebben een drempel maar er is geen achtergrondproces
- [ ] **Coach toewijzen via coordinator** — coach kan zichzelf inschrijven via inschrijven-tab, maar coordinator kan geen coach toewijzen
- [ ] **Uren zichtbaar in coordinator dashboard** — de "uren" kolom toont altijd "0 / X u" (echte data niet opgehaald)
- [ ] **Notifications/reminders** — geen pushnotificaties of email reminders
- [ ] **Super admin dashboard** — multi-school beheer
- [ ] **Onboarding voor nieuwe scholen** — handmatig aanmaken

### Technische schuld
- `assignments` tabel heeft twee parallelle systemen: oud (`placement_id`, `status`, `answer`) en nieuw (`period_id`, `questions jsonb`). Nieuwe code gebruikt het nieuwe systeem.
- `CoordinatorLayout.js` gebruikt `window.location.href` (harde navigatie) i.p.v. Next.js `Link` component vanwege cache-issues.
- `studenten/page.js` bestaat nog maar is vervangen door de gecombineerde `coordinator/page.js`. De aparte studenten pagina is dead code.
- Middleware is leeg — auth is volledig client-side per pagina.

### Bekende workarounds
- **Intake is server-side** via `/api/intake` omdat leerling niet ingelogd is en directe Supabase call geblokkeerd wordt door RLS
- **Import is server-side** via `/api/import-studenten` om profielen zonder `user_id` te kunnen aanmaken

---

## 12. Deployment

### Vercel
- Automatische deploy bij push naar `main` branch
- Environment variables ingesteld in Vercel dashboard

### Supabase
- Auth provider: Email (magic link)
- SMTP: Resend (`smtp.resend.com:465`, SSL)
- Auth callback URL: `https://stagepoort.vercel.app/auth/callback`

---

## 13. Volgend te bouwen (prioriteit)

1. **Uren ophalen in coordinator dashboard** — de tabel toont nu `0 / X u`, echte goedgekeurde uren query moet worden toegevoegd
2. **Stagebegeleider dashboard** — `/begeleider/[placement_id]` — begeleider keurt uren goed en vult evaluaties in
3. **Automatische badge-toekenning** — na goedkeuring uren / na inleveren opdracht / na weekstory check of drempel bereikt
4. **Coach toewijzen door coordinator** — dropdown in edit modal van student
5. **Opnieuw uitnodigen knop** — op koppelingenpagina voor verlopen magic links
6. **Stagehistorie per leerling** — al deels gebouwd (completed placements worden getoond in uitklapdetail)

---

*Dit document is gegenereerd op 13 juni 2026 op basis van de live codebase en database.*
