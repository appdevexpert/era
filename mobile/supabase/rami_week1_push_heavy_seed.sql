-- Clean seed derived from Rami's training journal and the current Figma workout view.
-- Scope: one template program with Week 1 split and full Day 1 Push - Heavy details.
-- This is structured program data, not the raw journal log.

with seeded_exercises as (
  insert into public.exercise_library (
    slug,
    name,
    name_translations,
    modality,
    category,
    equipment,
    primary_muscles,
    secondary_muscles,
    instructions,
    instructions_translations,
    coaching_cues,
    coaching_cues_translations,
    default_rest_seconds,
    default_weight_unit,
    measurement_config,
    is_active
  )
  values
    (
      'incline_dumbbell_press',
      'Incline Dumbbell Press',
      '{"en":"Incline Dumbbell Press","nb":"Skrå hantelpress"}'::jsonb,
      'strength',
      'compound',
      'dumbbells, incline bench',
      array['chest'],
      array['shoulders','triceps'],
      'Press dumbbells from an incline bench with controlled depth and stable shoulders.',
      '{"en":"Press dumbbells from an incline bench with controlled depth and stable shoulders.","nb":"Press hantlene fra en skråbenk med kontrollert dybde og stabile skuldre."}'::jsonb,
      'Control the lowering phase and keep shoulder blades set.',
      '{"en":"Control the lowering phase and keep shoulder blades set.","nb":"Kontroller senkefasen og hold skulderbladene stabile."}'::jsonb,
      60,
      'kg',
      '{"tracks_weight":true,"tracks_reps":true}'::jsonb,
      true
    ),
    (
      'bench_press',
      'Bench Press',
      '{"en":"Bench Press","nb":"Benkpress"}'::jsonb,
      'strength',
      'compound',
      'barbell, bench',
      array['chest'],
      array['triceps','shoulders'],
      'Lower the bar under control, pause briefly, then press with a stable upper back.',
      '{"en":"Lower the bar under control, pause briefly, then press with a stable upper back.","nb":"Senk stangen kontrollert, stopp kort, og press med stabil øvre rygg."}'::jsonb,
      'Keep feet planted and press evenly through both arms.',
      '{"en":"Keep feet planted and press evenly through both arms.","nb":"Hold føttene plantet og press jevnt med begge armer."}'::jsonb,
      60,
      'kg',
      '{"tracks_weight":true,"tracks_reps":true}'::jsonb,
      true
    ),
    (
      'rope_pushdown',
      'Rope Pushdown',
      '{"en":"Rope Pushdown","nb":"Triceps pushdown med tau"}'::jsonb,
      'strength',
      'isolation',
      'cable rope',
      array['triceps'],
      array[]::text[],
      'Keep elbows fixed by your sides and extend fully at the bottom.',
      '{"en":"Keep elbows fixed by your sides and extend fully at the bottom.","nb":"Hold albuene fast inntil siden og strekk helt ut nederst."}'::jsonb,
      'Do not swing the torso; let the triceps do the work.',
      '{"en":"Do not swing the torso; let the triceps do the work.","nb":"Ikke sving overkroppen; la triceps gjøre jobben."}'::jsonb,
      60,
      'kg',
      '{"tracks_weight":true,"tracks_reps":true}'::jsonb,
      true
    ),
    (
      'skull_crushers',
      'Skull Crushers',
      '{"en":"Skull Crushers","nb":"Skull crushers"}'::jsonb,
      'strength',
      'isolation',
      'ez bar or dumbbells',
      array['triceps'],
      array[]::text[],
      'Lower the weight toward the forehead with elbows controlled, then extend.',
      '{"en":"Lower the weight toward the forehead with elbows controlled, then extend.","nb":"Senk vekten mot pannen med kontrollerte albuer, og strekk ut igjen."}'::jsonb,
      'Keep the upper arms steady through the full set.',
      '{"en":"Keep the upper arms steady through the full set.","nb":"Hold overarmene stabile gjennom hele settet."}'::jsonb,
      60,
      'kg',
      '{"tracks_weight":true,"tracks_reps":true}'::jsonb,
      true
    ),
    (
      'overhead_press',
      'Overhead Press',
      '{"en":"Overhead Press","nb":"Skulderpress"}'::jsonb,
      'strength',
      'compound',
      'barbell or dumbbells',
      array['shoulders'],
      array['triceps','upper_chest'],
      'Press overhead without leaning back, then lower under control.',
      '{"en":"Press overhead without leaning back, then lower under control.","nb":"Press over hodet uten å lene deg bakover, og senk kontrollert."}'::jsonb,
      'Brace your core and finish with the weight stacked overhead.',
      '{"en":"Brace your core and finish with the weight stacked overhead.","nb":"Spenn kjernen og avslutt med vekten stabilt over hodet."}'::jsonb,
      60,
      'kg',
      '{"tracks_weight":true,"tracks_reps":true}'::jsonb,
      true
    ),
    (
      'leg_raises',
      'Leg Raises',
      '{"en":"Leg Raises","nb":"Beinhev"}'::jsonb,
      'core',
      'core',
      'bodyweight',
      array['abs'],
      array['hip_flexors'],
      'Raise legs with control and avoid swinging.',
      '{"en":"Raise legs with control and avoid swinging.","nb":"Løft beina kontrollert og unngå sving."}'::jsonb,
      'Keep tension in the lower abs.',
      '{"en":"Keep tension in the lower abs.","nb":"Hold spenning i nedre del av magen."}'::jsonb,
      45,
      'kg',
      '{"tracks_reps":true}'::jsonb,
      true
    ),
    (
      'cable_crunch',
      'Cable Crunch',
      '{"en":"Cable Crunch","nb":"Cable crunch"}'::jsonb,
      'core',
      'core',
      'cable machine',
      array['abs'],
      array[]::text[],
      'Crunch down by flexing the spine, not by pulling with the arms.',
      '{"en":"Crunch down by flexing the spine, not by pulling with the arms.","nb":"Crunch ned ved å bøye ryggen, ikke ved å dra med armene."}'::jsonb,
      'Exhale hard at the bottom.',
      '{"en":"Exhale hard at the bottom.","nb":"Pust kraftig ut nederst."}'::jsonb,
      45,
      'kg',
      '{"tracks_weight":true,"tracks_reps":true}'::jsonb,
      true
    ),
    (
      'plank',
      'Plank',
      '{"en":"Plank","nb":"Planke"}'::jsonb,
      'core',
      'core',
      'bodyweight',
      array['abs'],
      array['glutes','lower_back'],
      'Hold a straight body line while breathing calmly.',
      '{"en":"Hold a straight body line while breathing calmly.","nb":"Hold kroppen rett mens du puster rolig."}'::jsonb,
      'Do not let hips drop.',
      '{"en":"Do not let hips drop.","nb":"Ikke la hoftene falle ned."}'::jsonb,
      45,
      'kg',
      '{"tracks_duration":true}'::jsonb,
      true
    ),
    (
      'incline_walk',
      'Incline Walk',
      '{"en":"Incline Walk","nb":"Gange i motbakke"}'::jsonb,
      'cardio',
      'cardio',
      'treadmill',
      array['cardio'],
      array['legs'],
      'Walk on an incline at a moderate to fast pace.',
      '{"en":"Walk on an incline at a moderate to fast pace.","nb":"Gå i motbakke i moderat til raskt tempo."}'::jsonb,
      'Stay tall and keep pace consistent.',
      '{"en":"Stay tall and keep pace consistent.","nb":"Hold deg oppreist og hold jevnt tempo."}'::jsonb,
      null,
      'kg',
      '{"tracks_duration":true,"tracks_speed":true,"tracks_incline":true}'::jsonb,
      true
    )
  on conflict (slug) do update set
    name = excluded.name,
    name_translations = excluded.name_translations,
    modality = excluded.modality,
    category = excluded.category,
    equipment = excluded.equipment,
    primary_muscles = excluded.primary_muscles,
    secondary_muscles = excluded.secondary_muscles,
    instructions = excluded.instructions,
    instructions_translations = excluded.instructions_translations,
    coaching_cues = excluded.coaching_cues,
    coaching_cues_translations = excluded.coaching_cues_translations,
    default_rest_seconds = excluded.default_rest_seconds,
    default_weight_unit = excluded.default_weight_unit,
    measurement_config = excluded.measurement_config,
    is_active = excluded.is_active,
    updated_at = now()
  returning id, slug
),
exercise_ids as (
  select id, slug from seeded_exercises
  union
  select id, slug
  from public.exercise_library
  where slug in (
    'incline_dumbbell_press',
    'bench_press',
    'rope_pushdown',
    'skull_crushers',
    'overhead_press',
    'leg_raises',
    'cable_crunch',
    'plank',
    'incline_walk'
  )
),
program_seed as (
  insert into public.workout_programs (
    id,
    title,
    title_translations,
    subtitle,
    subtitle_translations,
    description,
    description_translations,
    duration_weeks,
    days_per_week,
    program_goal,
    program_goal_translations,
    status,
    is_template,
    published_at
  )
  values (
    '2a87094c-260a-4a1b-95f6-7de8d5300001',
    '12 Week Personalized',
    '{"en":"12 Week Personalized","nb":"12 uker personlig"}'::jsonb,
    'Male Advanced - Rami Reference',
    '{"en":"Male Advanced - Rami Reference","nb":"Mann avansert - Rami-referanse"}'::jsonb,
    'Clean structured seed based on Rami''s training journal. Week 1 starts with Push - Heavy.',
    '{"en":"Clean structured seed based on Rami''s training journal. Week 1 starts with Push - Heavy.","nb":"Ren strukturert seed basert på Ramis treningsjournal. Uke 1 starter med Push - tung."}'::jsonb,
    12,
    6,
    'Build strength and hypertrophy with top sets, back-off work, core finishers, and treadmill conditioning.',
    '{"en":"Build strength and hypertrophy with top sets, back-off work, core finishers, and treadmill conditioning.","nb":"Bygg styrke og hypertrofi med toppsett, back-off-sett, kjerneavslutninger og kondisjon på mølle."}'::jsonb,
    'active',
    true,
    now()
  )
  on conflict (id) do update set
    title = excluded.title,
    title_translations = excluded.title_translations,
    subtitle = excluded.subtitle,
    subtitle_translations = excluded.subtitle_translations,
    description = excluded.description,
    description_translations = excluded.description_translations,
    duration_weeks = excluded.duration_weeks,
    days_per_week = excluded.days_per_week,
    program_goal = excluded.program_goal,
    program_goal_translations = excluded.program_goal_translations,
    status = excluded.status,
    is_template = excluded.is_template,
    published_at = excluded.published_at,
    updated_at = now()
  returning id
),
week_seed as (
  insert into public.program_weeks (
    id,
    program_id,
    week_number,
    title,
    title_translations,
    focus,
    focus_translations,
    notes,
    notes_translations
  )
  values
    ('2a87094c-260a-4a1b-95f6-7de8d5300101','2a87094c-260a-4a1b-95f6-7de8d5300001',1,'Week 1','{"en":"Week 1","nb":"Uke 1"}'::jsonb,'Hypertrophy','{"en":"Hypertrophy","nb":"Hypertrofi"}'::jsonb,'Foundation week using top set plus back-off structure.','{"en":"Foundation week using top set plus back-off structure.","nb":"Grunnuke med toppsett og back-off-struktur."}'::jsonb),
    ('2a87094c-260a-4a1b-95f6-7de8d5300102','2a87094c-260a-4a1b-95f6-7de8d5300001',2,'Week 2','{"en":"Week 2","nb":"Uke 2"}'::jsonb,'Hypertrophy','{"en":"Hypertrophy","nb":"Hypertrofi"}'::jsonb,null,'{}'::jsonb),
    ('2a87094c-260a-4a1b-95f6-7de8d5300103','2a87094c-260a-4a1b-95f6-7de8d5300001',3,'Week 3','{"en":"Week 3","nb":"Uke 3"}'::jsonb,'Hypertrophy','{"en":"Hypertrophy","nb":"Hypertrofi"}'::jsonb,null,'{}'::jsonb),
    ('2a87094c-260a-4a1b-95f6-7de8d5300104','2a87094c-260a-4a1b-95f6-7de8d5300001',4,'Week 4','{"en":"Week 4","nb":"Uke 4"}'::jsonb,'Hypertrophy','{"en":"Hypertrophy","nb":"Hypertrofi"}'::jsonb,null,'{}'::jsonb),
    ('2a87094c-260a-4a1b-95f6-7de8d5300105','2a87094c-260a-4a1b-95f6-7de8d5300001',5,'Week 5','{"en":"Week 5","nb":"Uke 5"}'::jsonb,'Strength','{"en":"Strength","nb":"Styrke"}'::jsonb,null,'{}'::jsonb),
    ('2a87094c-260a-4a1b-95f6-7de8d5300106','2a87094c-260a-4a1b-95f6-7de8d5300001',6,'Week 6','{"en":"Week 6","nb":"Uke 6"}'::jsonb,'Strength','{"en":"Strength","nb":"Styrke"}'::jsonb,null,'{}'::jsonb),
    ('2a87094c-260a-4a1b-95f6-7de8d5300107','2a87094c-260a-4a1b-95f6-7de8d5300001',7,'Week 7','{"en":"Week 7","nb":"Uke 7"}'::jsonb,'Strength','{"en":"Strength","nb":"Styrke"}'::jsonb,null,'{}'::jsonb),
    ('2a87094c-260a-4a1b-95f6-7de8d5300108','2a87094c-260a-4a1b-95f6-7de8d5300001',8,'Week 8','{"en":"Week 8","nb":"Uke 8"}'::jsonb,'Strength','{"en":"Strength","nb":"Styrke"}'::jsonb,null,'{}'::jsonb),
    ('2a87094c-260a-4a1b-95f6-7de8d5300109','2a87094c-260a-4a1b-95f6-7de8d5300001',9,'Week 9','{"en":"Week 9","nb":"Uke 9"}'::jsonb,'Peak','{"en":"Peak","nb":"Topp"}'::jsonb,null,'{}'::jsonb),
    ('2a87094c-260a-4a1b-95f6-7de8d5300110','2a87094c-260a-4a1b-95f6-7de8d5300001',10,'Week 10','{"en":"Week 10","nb":"Uke 10"}'::jsonb,'Peak','{"en":"Peak","nb":"Topp"}'::jsonb,null,'{}'::jsonb),
    ('2a87094c-260a-4a1b-95f6-7de8d5300111','2a87094c-260a-4a1b-95f6-7de8d5300001',11,'Week 11','{"en":"Week 11","nb":"Uke 11"}'::jsonb,'Peak','{"en":"Peak","nb":"Topp"}'::jsonb,null,'{}'::jsonb),
    ('2a87094c-260a-4a1b-95f6-7de8d5300112','2a87094c-260a-4a1b-95f6-7de8d5300001',12,'Week 12','{"en":"Week 12","nb":"Uke 12"}'::jsonb,'Peak','{"en":"Peak","nb":"Topp"}'::jsonb,null,'{}'::jsonb)
  on conflict (id) do update set
    title = excluded.title,
    title_translations = excluded.title_translations,
    focus = excluded.focus,
    focus_translations = excluded.focus_translations,
    notes = excluded.notes,
    notes_translations = excluded.notes_translations,
    updated_at = now()
  returning id, week_number
),
day_seed as (
  insert into public.program_days (
    id,
    program_id,
    week_id,
    day_number,
    weekday,
    workout_kind,
    title,
    title_translations,
    subtitle,
    subtitle_translations,
    target_muscles,
    estimated_minutes,
    points_available,
    is_rest_day,
    sort_order
  )
  values
    ('2a87094c-260a-4a1b-95f6-7de8d5300201','2a87094c-260a-4a1b-95f6-7de8d5300001','2a87094c-260a-4a1b-95f6-7de8d5300101',1,1,'push','Push - Heavy','{"en":"Push - Heavy","nb":"Push - tung"}'::jsonb,'Week 1 - Monday','{"en":"Week 1 - Monday","nb":"Uke 1 - mandag"}'::jsonb,array['chest','triceps','shoulders','core'],75,100,false,1),
    ('2a87094c-260a-4a1b-95f6-7de8d5300202','2a87094c-260a-4a1b-95f6-7de8d5300001','2a87094c-260a-4a1b-95f6-7de8d5300101',2,2,'pull','Pull - Heavy','{"en":"Pull - Heavy","nb":"Pull - tung"}'::jsonb,'Week 1 - Tuesday','{"en":"Week 1 - Tuesday","nb":"Uke 1 - tirsdag"}'::jsonb,array['back','biceps','forearms','core'],80,100,false,2),
    ('2a87094c-260a-4a1b-95f6-7de8d5300203','2a87094c-260a-4a1b-95f6-7de8d5300001','2a87094c-260a-4a1b-95f6-7de8d5300101',3,3,'legs','Legs - Heavy','{"en":"Legs - Heavy","nb":"Bein - tung"}'::jsonb,'Week 1 - Wednesday','{"en":"Week 1 - Wednesday","nb":"Uke 1 - onsdag"}'::jsonb,array['quads','glutes','hamstrings','calves','core'],80,100,false,3),
    ('2a87094c-260a-4a1b-95f6-7de8d5300204','2a87094c-260a-4a1b-95f6-7de8d5300001','2a87094c-260a-4a1b-95f6-7de8d5300101',4,4,'shoulders','Shoulders / Neck','{"en":"Shoulders / Neck","nb":"Skuldre / nakke"}'::jsonb,'Week 1 - Thursday','{"en":"Week 1 - Thursday","nb":"Uke 1 - torsdag"}'::jsonb,array['shoulders','traps','neck'],80,100,false,4),
    ('2a87094c-260a-4a1b-95f6-7de8d5300205','2a87094c-260a-4a1b-95f6-7de8d5300001','2a87094c-260a-4a1b-95f6-7de8d5300101',5,5,'cardio','Cardio 4x4','{"en":"Cardio 4x4","nb":"Kondisjon 4x4"}'::jsonb,'Week 1 - Friday','{"en":"Week 1 - Friday","nb":"Uke 1 - fredag"}'::jsonb,array['cardio'],45,80,false,5),
    ('2a87094c-260a-4a1b-95f6-7de8d5300206','2a87094c-260a-4a1b-95f6-7de8d5300001','2a87094c-260a-4a1b-95f6-7de8d5300101',6,6,'legs','Legs - Volume','{"en":"Legs - Volume","nb":"Bein - volum"}'::jsonb,'Week 1 - Saturday','{"en":"Week 1 - Saturday","nb":"Uke 1 - lørdag"}'::jsonb,array['glutes','hamstrings','calves','neck'],80,100,false,6),
    ('2a87094c-260a-4a1b-95f6-7de8d5300207','2a87094c-260a-4a1b-95f6-7de8d5300001','2a87094c-260a-4a1b-95f6-7de8d5300101',7,7,'rest','Rest + Walk','{"en":"Rest + Walk","nb":"Hvile + gåtur"}'::jsonb,'Week 1 - Sunday','{"en":"Week 1 - Sunday","nb":"Uke 1 - søndag"}'::jsonb,array['recovery'],30,25,true,7)
  on conflict (id) do update set
    title = excluded.title,
    title_translations = excluded.title_translations,
    subtitle = excluded.subtitle,
    subtitle_translations = excluded.subtitle_translations,
    target_muscles = excluded.target_muscles,
    estimated_minutes = excluded.estimated_minutes,
    points_available = excluded.points_available,
    is_rest_day = excluded.is_rest_day,
    sort_order = excluded.sort_order,
    updated_at = now()
  returning id, day_number
),
section_seed as (
  insert into public.program_day_sections (
    id,
    program_day_id,
    section_kind,
    title,
    title_translations,
    description,
    description_translations,
    sort_order
  )
  values
    ('2a87094c-260a-4a1b-95f6-7de8d5300301','2a87094c-260a-4a1b-95f6-7de8d5300201','main_exercises','Exercises','{"en":"Exercises","nb":"Øvelser"}'::jsonb,'Main push work using top set and back-off sets.','{"en":"Main push work using top set and back-off sets.","nb":"Hovedarbeid for push med toppsett og back-off-sett."}'::jsonb,1),
    ('2a87094c-260a-4a1b-95f6-7de8d5300302','2a87094c-260a-4a1b-95f6-7de8d5300201','core_finisher','Core Finisher','{"en":"Core Finisher","nb":"Kjerneavslutning"}'::jsonb,'Core work from Rami''s journal structure.','{"en":"Core work from Rami''s journal structure.","nb":"Kjernearbeid fra strukturen i Ramis journal."}'::jsonb,2),
    ('2a87094c-260a-4a1b-95f6-7de8d5300303','2a87094c-260a-4a1b-95f6-7de8d5300201','treadmill_walk','Treadmill Walk','{"en":"Treadmill Walk","nb":"Gange på tredemølle"}'::jsonb,'Moderate incline walk after strength work.','{"en":"Moderate incline walk after strength work.","nb":"Moderat gange i motbakke etter styrkeøkten."}'::jsonb,3)
  on conflict (id) do update set
    title = excluded.title,
    title_translations = excluded.title_translations,
    description = excluded.description,
    description_translations = excluded.description_translations,
    sort_order = excluded.sort_order,
    updated_at = now()
  returning id, section_kind
),
exercise_seed as (
  insert into public.program_day_exercises (
    id,
    program_day_id,
    section_id,
    exercise_id,
    sort_order,
    display_name,
    display_name_translations,
    initial_weight_value,
    initial_weight_unit,
    default_rest_seconds,
    coach_notes,
    coach_notes_translations
  )
  select
    rows.id,
    rows.program_day_id,
    rows.section_id,
    exercise_ids.id,
    rows.sort_order,
    rows.display_name,
    rows.display_name_translations,
    rows.initial_weight_value,
    rows.initial_weight_unit,
    rows.default_rest_seconds,
    rows.coach_notes,
    rows.coach_notes_translations
  from (
    values
      ('2a87094c-260a-4a1b-95f6-7de8d5300401'::uuid,'2a87094c-260a-4a1b-95f6-7de8d5300201'::uuid,'2a87094c-260a-4a1b-95f6-7de8d5300301'::uuid,'incline_dumbbell_press',1,'Incline Dumbbell Press','{"en":"Incline Dumbbell Press","nb":"Skrå hantelpress"}'::jsonb,32.5::numeric,'kg'::public.weight_unit,60,'Rami journal reference: incline pressing appears as the first major push movement.','{"en":"Rami journal reference: incline pressing appears as the first major push movement.","nb":"Rami-journalen bruker skråpress som første store push-øvelse."}'::jsonb),
      ('2a87094c-260a-4a1b-95f6-7de8d5300402'::uuid,'2a87094c-260a-4a1b-95f6-7de8d5300201'::uuid,'2a87094c-260a-4a1b-95f6-7de8d5300301'::uuid,'bench_press',2,'Bench Press','{"en":"Bench Press","nb":"Benkpress"}'::jsonb,30::numeric,'kg'::public.weight_unit,60,'Top set plus back-off structure from the new-program phase.','{"en":"Top set plus back-off structure from the new-program phase.","nb":"Toppsett og back-off-struktur fra perioden med nytt program."}'::jsonb),
      ('2a87094c-260a-4a1b-95f6-7de8d5300403'::uuid,'2a87094c-260a-4a1b-95f6-7de8d5300201'::uuid,'2a87094c-260a-4a1b-95f6-7de8d5300301'::uuid,'rope_pushdown',3,'Rope Pushdown','{"en":"Rope Pushdown","nb":"Triceps pushdown med tau"}'::jsonb,40::numeric,'kg'::public.weight_unit,60,'Triceps isolation after pressing work.','{"en":"Triceps isolation after pressing work.","nb":"Triceps-isolasjon etter pressarbeid."}'::jsonb),
      ('2a87094c-260a-4a1b-95f6-7de8d5300404'::uuid,'2a87094c-260a-4a1b-95f6-7de8d5300201'::uuid,'2a87094c-260a-4a1b-95f6-7de8d5300301'::uuid,'skull_crushers',4,'Skull Crushers','{"en":"Skull Crushers","nb":"Skull crushers"}'::jsonb,7.5::numeric,'kg'::public.weight_unit,60,'Rami logged skull crushers repeatedly on push days.','{"en":"Rami logged skull crushers repeatedly on push days.","nb":"Rami loggførte skull crushers ofte på push-dager."}'::jsonb),
      ('2a87094c-260a-4a1b-95f6-7de8d5300405'::uuid,'2a87094c-260a-4a1b-95f6-7de8d5300201'::uuid,'2a87094c-260a-4a1b-95f6-7de8d5300301'::uuid,'overhead_press',5,'Overhead Press','{"en":"Overhead Press","nb":"Skulderpress"}'::jsonb,20::numeric,'kg'::public.weight_unit,60,'Shoulder press pattern kept from the design list.','{"en":"Shoulder press pattern kept from the design list.","nb":"Skulderpress beholdt fra designlisten."}'::jsonb),
      ('2a87094c-260a-4a1b-95f6-7de8d5300406'::uuid,'2a87094c-260a-4a1b-95f6-7de8d5300201'::uuid,'2a87094c-260a-4a1b-95f6-7de8d5300302'::uuid,'leg_raises',1,'Leg Raises','{"en":"Leg Raises","nb":"Beinhev"}'::jsonb,null::numeric,'kg'::public.weight_unit,45,'Core finisher exercise from the journal.','{"en":"Core finisher exercise from the journal.","nb":"Kjerneøvelse fra journalen."}'::jsonb),
      ('2a87094c-260a-4a1b-95f6-7de8d5300407'::uuid,'2a87094c-260a-4a1b-95f6-7de8d5300201'::uuid,'2a87094c-260a-4a1b-95f6-7de8d5300302'::uuid,'cable_crunch',2,'Cable Crunch','{"en":"Cable Crunch","nb":"Cable crunch"}'::jsonb,32::numeric,'kg'::public.weight_unit,45,'Core finisher cable work.','{"en":"Core finisher cable work.","nb":"Kabelarbeid for kjernen."}'::jsonb),
      ('2a87094c-260a-4a1b-95f6-7de8d5300408'::uuid,'2a87094c-260a-4a1b-95f6-7de8d5300201'::uuid,'2a87094c-260a-4a1b-95f6-7de8d5300302'::uuid,'plank',3,'Plank','{"en":"Plank","nb":"Planke"}'::jsonb,null::numeric,'kg'::public.weight_unit,45,'Timed core hold.','{"en":"Timed core hold.","nb":"Tidsbasert kjernehold."}'::jsonb),
      ('2a87094c-260a-4a1b-95f6-7de8d5300409'::uuid,'2a87094c-260a-4a1b-95f6-7de8d5300201'::uuid,'2a87094c-260a-4a1b-95f6-7de8d5300303'::uuid,'incline_walk',1,'Incline Walk','{"en":"Incline Walk","nb":"Gange i motbakke"}'::jsonb,null::numeric,'kg'::public.weight_unit,null,'Rami frequently finished strength sessions with incline treadmill walking.','{"en":"Rami frequently finished strength sessions with incline treadmill walking.","nb":"Rami avsluttet ofte styrkeøkter med gange i motbakke på mølle."}'::jsonb)
  ) as rows (
    id,
    program_day_id,
    section_id,
    exercise_slug,
    sort_order,
    display_name,
    display_name_translations,
    initial_weight_value,
    initial_weight_unit,
    default_rest_seconds,
    coach_notes,
    coach_notes_translations
  )
  join exercise_ids on exercise_ids.slug = rows.exercise_slug
  on conflict (id) do update set
    display_name = excluded.display_name,
    display_name_translations = excluded.display_name_translations,
    initial_weight_value = excluded.initial_weight_value,
    initial_weight_unit = excluded.initial_weight_unit,
    default_rest_seconds = excluded.default_rest_seconds,
    coach_notes = excluded.coach_notes,
    coach_notes_translations = excluded.coach_notes_translations,
    updated_at = now()
  returning id, display_name
)
insert into public.planned_exercise_sets (
  id,
  program_day_exercise_id,
  set_number,
  set_kind,
  target_weight_value,
  target_weight_unit,
  target_reps_exact,
  target_reps_min,
  target_reps_max,
  target_duration_seconds,
  target_speed_value,
  target_incline_percent,
  rest_seconds,
  rpe_target,
  rir_target,
  notes,
  display_label_translations
)
values
  ('2a87094c-260a-4a1b-95f6-7de8d5300501','2a87094c-260a-4a1b-95f6-7de8d5300401',1,'top_set',32.5,'kg',10,null,null,null,null,null,60,8.00,2.00,'Top set from Rami-style progression.','{"en":"Top set","nb":"Toppsett"}'::jsonb),
  ('2a87094c-260a-4a1b-95f6-7de8d5300502','2a87094c-260a-4a1b-95f6-7de8d5300401',2,'backoff',30,'kg',10,null,null,null,null,null,60,7.00,3.00,'Back-off set around 90%.','{"en":"Back-off","nb":"Back-off"}'::jsonb),
  ('2a87094c-260a-4a1b-95f6-7de8d5300503','2a87094c-260a-4a1b-95f6-7de8d5300401',3,'backoff',30,'kg',10,null,null,null,null,null,60,7.00,3.00,'Back-off set around 90%.','{"en":"Back-off","nb":"Back-off"}'::jsonb),

  ('2a87094c-260a-4a1b-95f6-7de8d5300504','2a87094c-260a-4a1b-95f6-7de8d5300402',1,'top_set',30,'kg',10,null,null,null,null,null,60,8.00,2.00,'Rami journal 28 Feb: bench top set 30 x 10.','{"en":"Top set","nb":"Toppsett"}'::jsonb),
  ('2a87094c-260a-4a1b-95f6-7de8d5300505','2a87094c-260a-4a1b-95f6-7de8d5300402',2,'backoff',25,'kg',10,null,null,null,null,null,60,7.00,3.00,'Rami journal 28 Feb: back-off 25 x 10.','{"en":"Back-off","nb":"Back-off"}'::jsonb),
  ('2a87094c-260a-4a1b-95f6-7de8d5300506','2a87094c-260a-4a1b-95f6-7de8d5300402',3,'backoff',25,'kg',10,null,null,null,null,null,60,7.00,3.00,'Rami journal 28 Feb: back-off 25 x 10.','{"en":"Back-off","nb":"Back-off"}'::jsonb),

  ('2a87094c-260a-4a1b-95f6-7de8d5300507','2a87094c-260a-4a1b-95f6-7de8d5300403',1,'working',40,'kg',10,null,null,null,null,null,60,7.00,3.00,null,'{}'::jsonb),
  ('2a87094c-260a-4a1b-95f6-7de8d5300508','2a87094c-260a-4a1b-95f6-7de8d5300403',2,'working',40,'kg',10,null,null,null,null,null,60,7.00,3.00,null,'{}'::jsonb),
  ('2a87094c-260a-4a1b-95f6-7de8d5300509','2a87094c-260a-4a1b-95f6-7de8d5300403',3,'working',40,'kg',10,null,null,null,null,null,60,7.00,3.00,null,'{}'::jsonb),

  ('2a87094c-260a-4a1b-95f6-7de8d5300510','2a87094c-260a-4a1b-95f6-7de8d5300404',1,'working',7.5,'kg',null,10,12,null,null,null,60,7.00,3.00,'Journal uses 7.5 kg skull crushers in early new-program phase.','{}'::jsonb),
  ('2a87094c-260a-4a1b-95f6-7de8d5300511','2a87094c-260a-4a1b-95f6-7de8d5300404',2,'working',7.5,'kg',null,10,12,null,null,null,60,7.00,3.00,null,'{}'::jsonb),
  ('2a87094c-260a-4a1b-95f6-7de8d5300512','2a87094c-260a-4a1b-95f6-7de8d5300404',3,'working',5,'kg',null,10,12,null,null,null,60,7.00,3.00,null,'{}'::jsonb),

  ('2a87094c-260a-4a1b-95f6-7de8d5300513','2a87094c-260a-4a1b-95f6-7de8d5300405',1,'top_set',20,'kg',10,null,null,null,null,null,60,8.00,2.00,null,'{"en":"Top set","nb":"Toppsett"}'::jsonb),
  ('2a87094c-260a-4a1b-95f6-7de8d5300514','2a87094c-260a-4a1b-95f6-7de8d5300405',2,'backoff',17.5,'kg',10,null,null,null,null,null,60,7.00,3.00,null,'{"en":"Back-off","nb":"Back-off"}'::jsonb),
  ('2a87094c-260a-4a1b-95f6-7de8d5300515','2a87094c-260a-4a1b-95f6-7de8d5300405',3,'backoff',17.5,'kg',10,null,null,null,null,null,60,7.00,3.00,null,'{"en":"Back-off","nb":"Back-off"}'::jsonb),

  ('2a87094c-260a-4a1b-95f6-7de8d5300516','2a87094c-260a-4a1b-95f6-7de8d5300406',1,'core',null,'kg',null,15,20,null,null,null,45,7.00,3.00,null,'{}'::jsonb),
  ('2a87094c-260a-4a1b-95f6-7de8d5300517','2a87094c-260a-4a1b-95f6-7de8d5300406',2,'core',null,'kg',null,15,20,null,null,null,45,7.00,3.00,null,'{}'::jsonb),
  ('2a87094c-260a-4a1b-95f6-7de8d5300518','2a87094c-260a-4a1b-95f6-7de8d5300406',3,'core',null,'kg',null,15,20,null,null,null,45,7.00,3.00,null,'{}'::jsonb),

  ('2a87094c-260a-4a1b-95f6-7de8d5300519','2a87094c-260a-4a1b-95f6-7de8d5300407',1,'core',32,'kg',null,15,20,null,null,null,45,7.00,3.00,null,'{}'::jsonb),
  ('2a87094c-260a-4a1b-95f6-7de8d5300520','2a87094c-260a-4a1b-95f6-7de8d5300407',2,'core',32,'kg',null,15,20,null,null,null,45,7.00,3.00,null,'{}'::jsonb),
  ('2a87094c-260a-4a1b-95f6-7de8d5300521','2a87094c-260a-4a1b-95f6-7de8d5300407',3,'core',32,'kg',null,15,20,null,null,null,45,7.00,3.00,null,'{}'::jsonb),

  ('2a87094c-260a-4a1b-95f6-7de8d5300522','2a87094c-260a-4a1b-95f6-7de8d5300408',1,'core',null,'kg',null,null,null,60,null,null,45,7.00,3.00,null,'{}'::jsonb),
  ('2a87094c-260a-4a1b-95f6-7de8d5300523','2a87094c-260a-4a1b-95f6-7de8d5300408',2,'core',null,'kg',null,null,null,60,null,null,45,7.00,3.00,null,'{}'::jsonb),
  ('2a87094c-260a-4a1b-95f6-7de8d5300524','2a87094c-260a-4a1b-95f6-7de8d5300408',3,'core',null,'kg',null,null,null,60,null,null,45,7.00,3.00,null,'{}'::jsonb),

  ('2a87094c-260a-4a1b-95f6-7de8d5300525','2a87094c-260a-4a1b-95f6-7de8d5300409',1,'cardio',null,'kg',null,null,null,1200,5.40,8.00,null,6.00,4.00,'20 min moderate incline walk.','{"en":"20 min","nb":"20 min"}'::jsonb)
on conflict (id) do update set
  set_kind = excluded.set_kind,
  target_weight_value = excluded.target_weight_value,
  target_weight_unit = excluded.target_weight_unit,
  target_reps_exact = excluded.target_reps_exact,
  target_reps_min = excluded.target_reps_min,
  target_reps_max = excluded.target_reps_max,
  target_duration_seconds = excluded.target_duration_seconds,
  target_speed_value = excluded.target_speed_value,
  target_incline_percent = excluded.target_incline_percent,
  rest_seconds = excluded.rest_seconds,
  rpe_target = excluded.rpe_target,
  rir_target = excluded.rir_target,
  notes = excluded.notes,
  display_label_translations = excluded.display_label_translations,
  updated_at = now();
