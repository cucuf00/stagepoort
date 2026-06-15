-- ============================================================
-- STAGEPOORT SEED DATA
-- Standaard sjablonen — beschikbaar voor alle scholen
-- Gebruik: psql ... < supabase/seed.sql
-- ON CONFLICT DO NOTHING = veilig om opnieuw uit te voeren
-- ============================================================

INSERT INTO public.assignment_templates (id, title, description, questions, max_points, xp_reward, sort_order)
VALUES
(
  '2c774270-f5db-46a5-a4cc-05087aee5e3f',
  'Het bedrijf leren kennen',
  'Onderzoek het bedrijf waar je stage loopt en beantwoord alle vragen zo volledig mogelijk.',
  '[{"id":1001,"v":"Wat is de naam van het bedrijf en wat doen ze?","hint":"Beschrijf het in je eigen woorden","punten":2},{"id":1002,"v":"Hoeveel medewerkers werken er (ongeveer)?","hint":"Vraag dit aan je begeleider","punten":1},{"id":1003,"v":"In welke afdeling doe jij stage en wat doet die afdeling?","hint":"Wat zijn de taken van jouw afdeling?","punten":2},{"id":1004,"v":"Hoe ziet een normale werkdag eruit bij dit bedrijf?","hint":"Beschrijf een dag van begin tot eind","punten":2},{"id":1005,"v":"Wat vind jij interessant aan dit bedrijf of deze branche?","hint":"Geef jouw eigen mening","punten":3}]'::jsonb,
  10, 150, 0
),
(
  '07109a95-4cca-43dd-a809-346b2d3871af',
  'Interview met een medewerker',
  'Voer een gesprek met een medewerker van het bedrijf. Stel minstens 5 vragen en schrijf de antwoorden op.',
  '[{"id":2001,"v":"Wie heb je geinterviewd? Wat is zijn/haar naam en functie?","hint":"Vermeld naam, functie en afdeling","punten":1},{"id":2002,"v":"Welke opleiding heeft hij/zij gedaan?","hint":"Welk niveau en richting?","punten":1},{"id":2003,"v":"Wat vindt hij/zij het leukst aan zijn/haar werk?","hint":"Laat hem/haar in eigen woorden antwoorden","punten":2},{"id":2004,"v":"Wat zijn de uitdagingen of moeilijke kanten van het werk?","hint":"Vraag naar concrete voorbeelden","punten":3},{"id":2005,"v":"Welk advies geeft hij/zij aan jou als stagiair?","hint":"Schrijf het advies letterlijk op","punten":3}]'::jsonb,
  10, 200, 1
),
(
  '556b3581-18fb-43e4-80f3-2569ecae02fa',
  'Zelfreflectie',
  'Kijk terug op je stageperiode en schrijf een eerlijke reflectie. Wees specifiek en gebruik voorbeelden.',
  '[{"id":3001,"v":"Wat heb je geleerd tijdens je stage? Noem minstens 3 dingen.","hint":"Denk aan vakkennis, sociale vaardigheden en werkhouding","punten":3},{"id":3002,"v":"Wat vond je het leukst en waarom?","hint":"Beschrijf een concreet moment of taak","punten":2},{"id":3003,"v":"Wat vond je het moeilijkst en hoe heb je dat aangepakt?","hint":"Laat zien dat je hebt nagedacht over oplossingen","punten":2},{"id":3004,"v":"Welke kwaliteiten heb je ontwikkeld of ingezet?","hint":"Denk aan samenwerken, communiceren, zelfstandigheid","punten":1},{"id":3005,"v":"Past dit beroep bij jou? Leg uit waarom wel of niet.","hint":"Wees eerlijk - er is geen goed of fout antwoord","punten":2}]'::jsonb,
  10, 250, 2
)
ON CONFLICT (id) DO NOTHING;
