-- Seed: Week 1, Days 2-6 exercises, sections, and planned sets.
-- Based on Rami's training journal (Phase B, "Nytt Program" / top-set + back-off).
-- Day 1 (Push-Heavy) is already seeded in rami_week1_push_heavy_seed.sql.

-- ============================================================
-- 1. New exercise library entries
-- ============================================================
INSERT INTO public.exercise_library (slug, name, name_translations, modality, category, equipment, primary_muscles, secondary_muscles, default_rest_seconds, default_weight_unit, measurement_config, is_active)
VALUES
  ('pull_ups', 'Pull-ups', '{"en":"Pull-ups","nb":"Pullups"}'::jsonb, 'strength', 'compound', 'pull-up bar', ARRAY['back','biceps'], ARRAY['forearms'], 90, 'kg', '{"tracks_weight":true,"tracks_reps":true}'::jsonb, true),
  ('barbell_row', 'Barbell Row', '{"en":"Barbell Row","nb":"Stangroing"}'::jsonb, 'strength', 'compound', 'barbell', ARRAY['back'], ARRAY['biceps','forearms'], 90, 'kg', '{"tracks_weight":true,"tracks_reps":true}'::jsonb, true),
  ('seated_cable_row', 'Seated Cable Row', '{"en":"Seated Cable Row","nb":"Sittende kabelroing"}'::jsonb, 'strength', 'compound', 'cable machine', ARRAY['back'], ARRAY['biceps'], 60, 'kg', '{"tracks_weight":true,"tracks_reps":true}'::jsonb, true),
  ('lat_pulldown', 'Lat Pulldown', '{"en":"Lat Pulldown","nb":"Nedtrekk"}'::jsonb, 'strength', 'compound', 'cable machine', ARRAY['back'], ARRAY['biceps'], 60, 'kg', '{"tracks_weight":true,"tracks_reps":true}'::jsonb, true),
  ('hammer_curl', 'Hammer Curl', '{"en":"Hammer Curl","nb":"Hammercurl"}'::jsonb, 'strength', 'isolation', 'dumbbells', ARRAY['biceps'], ARRAY['forearms'], 60, 'kg', '{"tracks_weight":true,"tracks_reps":true}'::jsonb, true),
  ('preacher_curl', 'Preacher Curl', '{"en":"Preacher Curl","nb":"Preacher curl"}'::jsonb, 'strength', 'isolation', 'barbell, preacher bench', ARRAY['biceps'], ARRAY['forearms'], 60, 'kg', '{"tracks_weight":true,"tracks_reps":true}'::jsonb, true),
  ('squat', 'Squat', '{"en":"Squat","nb":"Knebøy"}'::jsonb, 'strength', 'compound', 'barbell, squat rack', ARRAY['quads','glutes'], ARRAY['hamstrings','core'], 120, 'kg', '{"tracks_weight":true,"tracks_reps":true}'::jsonb, true),
  ('romanian_deadlift', 'Romanian Deadlift', '{"en":"Romanian Deadlift","nb":"Rumensk markløft"}'::jsonb, 'strength', 'compound', 'barbell', ARRAY['hamstrings','glutes'], ARRAY['back'], 90, 'kg', '{"tracks_weight":true,"tracks_reps":true}'::jsonb, true),
  ('lunges', 'Lunges', '{"en":"Lunges","nb":"Utfall"}'::jsonb, 'strength', 'compound', 'dumbbells', ARRAY['quads','glutes'], ARRAY['hamstrings'], 60, 'kg', '{"tracks_weight":true,"tracks_reps":true}'::jsonb, true),
  ('leg_curl', 'Leg Curl', '{"en":"Leg Curl","nb":"Bencurl"}'::jsonb, 'strength', 'isolation', 'machine', ARRAY['hamstrings'], ARRAY[]::text[], 60, 'kg', '{"tracks_weight":true,"tracks_reps":true}'::jsonb, true),
  ('lateral_raise', 'Lateral Raise', '{"en":"Lateral Raise","nb":"Sidehev"}'::jsonb, 'strength', 'isolation', 'dumbbells', ARRAY['shoulders'], ARRAY[]::text[], 60, 'kg', '{"tracks_weight":true,"tracks_reps":true}'::jsonb, true),
  ('rear_delt_flyes', 'Rear Delt Flyes', '{"en":"Rear Delt Flyes","nb":"Bakre deltoid flyes"}'::jsonb, 'strength', 'isolation', 'dumbbells, bench', ARRAY['shoulders'], ARRAY['back'], 60, 'kg', '{"tracks_weight":true,"tracks_reps":true}'::jsonb, true),
  ('shrugs', 'Shrugs', '{"en":"Shrugs","nb":"Shrugs"}'::jsonb, 'strength', 'isolation', 'smith machine', ARRAY['traps'], ARRAY['shoulders'], 60, 'kg', '{"tracks_weight":true,"tracks_reps":true}'::jsonb, true),
  ('face_pulls', 'Face Pulls', '{"en":"Face Pulls","nb":"Face pulls"}'::jsonb, 'strength', 'isolation', 'cable machine', ARRAY['shoulders'], ARRAY['traps','back'], 60, 'kg', '{"tracks_weight":true,"tracks_reps":true}'::jsonb, true),
  ('neck_headband', 'Neck Headband', '{"en":"Neck Headband","nb":"Nakkeband"}'::jsonb, 'strength', 'isolation', 'headband', ARRAY['neck'], ARRAY[]::text[], 60, 'kg', '{"tracks_weight":true,"tracks_reps":true}'::jsonb, true),
  ('treadmill_4x4', 'Treadmill 4x4 Intervals', '{"en":"Treadmill 4×4 Intervals","nb":"Tredemølle 4×4 intervaller"}'::jsonb, 'cardio', 'cardio', 'treadmill', ARRAY['cardio'], ARRAY[]::text[], 0, 'kg', '{"tracks_duration":true,"tracks_speed":true}'::jsonb, true),
  ('hip_thrust', 'Hip Thrust', '{"en":"Hip Thrust","nb":"Hip thrust"}'::jsonb, 'strength', 'compound', 'barbell, bench', ARRAY['glutes'], ARRAY['hamstrings'], 90, 'kg', '{"tracks_weight":true,"tracks_reps":true}'::jsonb, true),
  ('bulgarian_split_squat', 'Bulgarian Split Squat', '{"en":"Bulgarian Split Squat","nb":"Bulgarsk utfall"}'::jsonb, 'strength', 'compound', 'dumbbells, bench', ARRAY['quads','glutes'], ARRAY['hamstrings'], 60, 'kg', '{"tracks_weight":true,"tracks_reps":true}'::jsonb, true),
  ('standing_calf_raises', 'Standing Calf Raises', '{"en":"Standing Calf Raises","nb":"Stående tåhev"}'::jsonb, 'strength', 'isolation', 'smith machine', ARRAY['calves'], ARRAY[]::text[], 60, 'kg', '{"tracks_weight":true,"tracks_reps":true}'::jsonb, true),
  ('seated_calf_raises', 'Seated Calf Raises', '{"en":"Seated Calf Raises","nb":"Sittende tåhev"}'::jsonb, 'strength', 'isolation', 'machine', ARRAY['calves'], ARRAY[]::text[], 60, 'kg', '{"tracks_weight":true,"tracks_reps":true}'::jsonb, true)
ON CONFLICT (slug) DO NOTHING;

-- ============================================================
-- 2. Sections for Days 2-6
-- ============================================================
-- Day 2 (Pull): Exercises + Core Finisher + Treadmill Walk
-- Day 3 (Legs Heavy): Exercises + Core Finisher + Treadmill Walk
-- Day 4 (Shoulders): Exercises + Treadmill Walk
-- Day 5 (Cardio): 4x4 Interval + Core
-- Day 6 (Legs Volume): Exercises + Treadmill Walk

INSERT INTO public.program_day_sections (program_day_id, section_kind, title, title_translations, sort_order)
VALUES
  -- Day 2 Pull
  ('2a87094c-260a-4a1b-95f6-7de8d5300202', 'main_exercises', 'Exercises', '{"en":"Exercises","nb":"Øvelser"}'::jsonb, 1),
  ('2a87094c-260a-4a1b-95f6-7de8d5300202', 'core_finisher', 'Core Finisher', '{"en":"Core Finisher","nb":"Kjerneavslutning"}'::jsonb, 2),
  ('2a87094c-260a-4a1b-95f6-7de8d5300202', 'treadmill_walk', 'Treadmill Walk', '{"en":"Treadmill Walk","nb":"Gange på tredemølle"}'::jsonb, 3),
  -- Day 3 Legs Heavy
  ('2a87094c-260a-4a1b-95f6-7de8d5300203', 'main_exercises', 'Exercises', '{"en":"Exercises","nb":"Øvelser"}'::jsonb, 1),
  ('2a87094c-260a-4a1b-95f6-7de8d5300203', 'core_finisher', 'Core Finisher', '{"en":"Core Finisher","nb":"Kjerneavslutning"}'::jsonb, 2),
  ('2a87094c-260a-4a1b-95f6-7de8d5300203', 'treadmill_walk', 'Treadmill Walk', '{"en":"Treadmill Walk","nb":"Gange på tredemølle"}'::jsonb, 3),
  -- Day 4 Shoulders
  ('2a87094c-260a-4a1b-95f6-7de8d5300204', 'main_exercises', 'Exercises', '{"en":"Exercises","nb":"Øvelser"}'::jsonb, 1),
  ('2a87094c-260a-4a1b-95f6-7de8d5300204', 'treadmill_walk', 'Treadmill Walk', '{"en":"Treadmill Walk","nb":"Gange på tredemølle"}'::jsonb, 2),
  -- Day 5 Cardio
  ('2a87094c-260a-4a1b-95f6-7de8d5300205', 'custom', '4×4 Intervals', '{"en":"4×4 Intervals","nb":"4×4 intervaller"}'::jsonb, 1),
  ('2a87094c-260a-4a1b-95f6-7de8d5300205', 'core_finisher', 'Core', '{"en":"Core","nb":"Kjerne"}'::jsonb, 2),
  -- Day 6 Legs Volume
  ('2a87094c-260a-4a1b-95f6-7de8d5300206', 'main_exercises', 'Exercises', '{"en":"Exercises","nb":"Øvelser"}'::jsonb, 1),
  ('2a87094c-260a-4a1b-95f6-7de8d5300206', 'treadmill_walk', 'Treadmill Walk', '{"en":"Treadmill Walk","nb":"Gange på tredemølle"}'::jsonb, 2);

-- ============================================================
-- 3. Exercises assigned to days (using section IDs from above)
-- We need the section IDs, so we use a CTE to look them up.
-- ============================================================
WITH sections AS (
  SELECT id, program_day_id, section_kind, sort_order
  FROM public.program_day_sections
  WHERE program_day_id IN (
    '2a87094c-260a-4a1b-95f6-7de8d5300202',
    '2a87094c-260a-4a1b-95f6-7de8d5300203',
    '2a87094c-260a-4a1b-95f6-7de8d5300204',
    '2a87094c-260a-4a1b-95f6-7de8d5300205',
    '2a87094c-260a-4a1b-95f6-7de8d5300206'
  )
),
exercises AS (
  SELECT id, slug FROM public.exercise_library
),
day2_main AS (SELECT id FROM sections WHERE program_day_id = '2a87094c-260a-4a1b-95f6-7de8d5300202' AND section_kind = 'main_exercises'),
day2_core AS (SELECT id FROM sections WHERE program_day_id = '2a87094c-260a-4a1b-95f6-7de8d5300202' AND section_kind = 'core_finisher'),
day2_walk AS (SELECT id FROM sections WHERE program_day_id = '2a87094c-260a-4a1b-95f6-7de8d5300202' AND section_kind = 'treadmill_walk'),
day3_main AS (SELECT id FROM sections WHERE program_day_id = '2a87094c-260a-4a1b-95f6-7de8d5300203' AND section_kind = 'main_exercises'),
day3_core AS (SELECT id FROM sections WHERE program_day_id = '2a87094c-260a-4a1b-95f6-7de8d5300203' AND section_kind = 'core_finisher'),
day3_walk AS (SELECT id FROM sections WHERE program_day_id = '2a87094c-260a-4a1b-95f6-7de8d5300203' AND section_kind = 'treadmill_walk'),
day4_main AS (SELECT id FROM sections WHERE program_day_id = '2a87094c-260a-4a1b-95f6-7de8d5300204' AND section_kind = 'main_exercises'),
day4_walk AS (SELECT id FROM sections WHERE program_day_id = '2a87094c-260a-4a1b-95f6-7de8d5300204' AND section_kind = 'treadmill_walk'),
day5_cardio AS (SELECT id FROM sections WHERE program_day_id = '2a87094c-260a-4a1b-95f6-7de8d5300205' AND section_kind = 'custom'),
day5_core AS (SELECT id FROM sections WHERE program_day_id = '2a87094c-260a-4a1b-95f6-7de8d5300205' AND section_kind = 'core_finisher'),
day6_main AS (SELECT id FROM sections WHERE program_day_id = '2a87094c-260a-4a1b-95f6-7de8d5300206' AND section_kind = 'main_exercises'),
day6_walk AS (SELECT id FROM sections WHERE program_day_id = '2a87094c-260a-4a1b-95f6-7de8d5300206' AND section_kind = 'treadmill_walk'),
inserted_exercises AS (
  INSERT INTO public.program_day_exercises (
    program_day_id, section_id, exercise_id, sort_order,
    display_name, display_name_translations,
    initial_weight_value, initial_weight_unit, default_rest_seconds
  )
  VALUES
    -- ========== DAY 2: PULL - HEAVY ==========
    -- Main exercises
    ('2a87094c-260a-4a1b-95f6-7de8d5300202', (SELECT id FROM day2_main), (SELECT id FROM exercises WHERE slug='pull_ups'), 1, 'Pull-ups', '{"en":"Pull-ups","nb":"Pullups"}'::jsonb, NULL, 'kg', 90),
    ('2a87094c-260a-4a1b-95f6-7de8d5300202', (SELECT id FROM day2_main), (SELECT id FROM exercises WHERE slug='barbell_row'), 2, 'Barbell Row', '{"en":"Barbell Row","nb":"Stangroing"}'::jsonb, 22.5, 'kg', 90),
    ('2a87094c-260a-4a1b-95f6-7de8d5300202', (SELECT id FROM day2_main), (SELECT id FROM exercises WHERE slug='seated_cable_row'), 3, 'Seated Cable Row', '{"en":"Seated Cable Row","nb":"Sittende kabelroing"}'::jsonb, 52, 'kg', 60),
    ('2a87094c-260a-4a1b-95f6-7de8d5300202', (SELECT id FROM day2_main), (SELECT id FROM exercises WHERE slug='lat_pulldown'), 4, 'Lat Pulldown', '{"en":"Lat Pulldown","nb":"Nedtrekk"}'::jsonb, 45, 'kg', 60),
    ('2a87094c-260a-4a1b-95f6-7de8d5300202', (SELECT id FROM day2_main), (SELECT id FROM exercises WHERE slug='hammer_curl'), 5, 'Hammer Curl', '{"en":"Hammer Curl","nb":"Hammercurl"}'::jsonb, 17.5, 'kg', 60),
    ('2a87094c-260a-4a1b-95f6-7de8d5300202', (SELECT id FROM day2_main), (SELECT id FROM exercises WHERE slug='preacher_curl'), 6, 'Preacher Curl', '{"en":"Preacher Curl","nb":"Preacher curl"}'::jsonb, 10, 'kg', 60),
    -- Core finisher
    ('2a87094c-260a-4a1b-95f6-7de8d5300202', (SELECT id FROM day2_core), (SELECT id FROM exercises WHERE slug='leg_raises'), 1, 'Leg Raises', '{"en":"Leg Raises","nb":"Beinhev"}'::jsonb, NULL, 'kg', 45),
    ('2a87094c-260a-4a1b-95f6-7de8d5300202', (SELECT id FROM day2_core), (SELECT id FROM exercises WHERE slug='cable_crunch'), 2, 'Cable Crunch', '{"en":"Cable Crunch","nb":"Cable crunch"}'::jsonb, 32, 'kg', 45),
    ('2a87094c-260a-4a1b-95f6-7de8d5300202', (SELECT id FROM day2_core), (SELECT id FROM exercises WHERE slug='plank'), 3, 'Plank', '{"en":"Plank","nb":"Planke"}'::jsonb, NULL, 'kg', 45),
    -- Treadmill
    ('2a87094c-260a-4a1b-95f6-7de8d5300202', (SELECT id FROM day2_walk), (SELECT id FROM exercises WHERE slug='incline_walk'), 1, 'Incline Walk', '{"en":"Incline Walk","nb":"Gange i motbakke"}'::jsonb, NULL, 'kg', 0),

    -- ========== DAY 3: LEGS - HEAVY ==========
    -- Main exercises
    ('2a87094c-260a-4a1b-95f6-7de8d5300203', (SELECT id FROM day3_main), (SELECT id FROM exercises WHERE slug='squat'), 1, 'Squat', '{"en":"Squat","nb":"Knebøy"}'::jsonb, 30, 'kg', 120),
    ('2a87094c-260a-4a1b-95f6-7de8d5300203', (SELECT id FROM day3_main), (SELECT id FROM exercises WHERE slug='romanian_deadlift'), 2, 'Romanian Deadlift', '{"en":"Romanian Deadlift","nb":"Rumensk markløft"}'::jsonb, 20, 'kg', 90),
    ('2a87094c-260a-4a1b-95f6-7de8d5300203', (SELECT id FROM day3_main), (SELECT id FROM exercises WHERE slug='lunges'), 3, 'Lunges', '{"en":"Lunges","nb":"Utfall"}'::jsonb, 12, 'kg', 60),
    ('2a87094c-260a-4a1b-95f6-7de8d5300203', (SELECT id FROM day3_main), (SELECT id FROM exercises WHERE slug='leg_curl'), 4, 'Leg Curl', '{"en":"Leg Curl","nb":"Bencurl"}'::jsonb, 54, 'kg', 60),
    -- Core finisher
    ('2a87094c-260a-4a1b-95f6-7de8d5300203', (SELECT id FROM day3_core), (SELECT id FROM exercises WHERE slug='leg_raises'), 1, 'Leg Raises', '{"en":"Leg Raises","nb":"Beinhev"}'::jsonb, NULL, 'kg', 45),
    ('2a87094c-260a-4a1b-95f6-7de8d5300203', (SELECT id FROM day3_core), (SELECT id FROM exercises WHERE slug='plank'), 2, 'Plank', '{"en":"Plank","nb":"Planke"}'::jsonb, NULL, 'kg', 45),
    -- Treadmill
    ('2a87094c-260a-4a1b-95f6-7de8d5300203', (SELECT id FROM day3_walk), (SELECT id FROM exercises WHERE slug='incline_walk'), 1, 'Incline Walk', '{"en":"Incline Walk","nb":"Gange i motbakke"}'::jsonb, NULL, 'kg', 0),

    -- ========== DAY 4: SHOULDERS / NECK ==========
    -- Main exercises
    ('2a87094c-260a-4a1b-95f6-7de8d5300204', (SELECT id FROM day4_main), (SELECT id FROM exercises WHERE slug='overhead_press'), 1, 'Overhead Press', '{"en":"Overhead Press","nb":"Skulderpress"}'::jsonb, 17.5, 'kg', 90),
    ('2a87094c-260a-4a1b-95f6-7de8d5300204', (SELECT id FROM day4_main), (SELECT id FROM exercises WHERE slug='lateral_raise'), 2, 'Lateral Raise', '{"en":"Lateral Raise","nb":"Sidehev"}'::jsonb, 12.5, 'kg', 60),
    ('2a87094c-260a-4a1b-95f6-7de8d5300204', (SELECT id FROM day4_main), (SELECT id FROM exercises WHERE slug='rear_delt_flyes'), 3, 'Rear Delt Flyes', '{"en":"Rear Delt Flyes","nb":"Bakre deltoid flyes"}'::jsonb, 12.5, 'kg', 60),
    ('2a87094c-260a-4a1b-95f6-7de8d5300204', (SELECT id FROM day4_main), (SELECT id FROM exercises WHERE slug='shrugs'), 4, 'Shrugs', '{"en":"Shrugs","nb":"Shrugs"}'::jsonb, 35, 'kg', 60),
    ('2a87094c-260a-4a1b-95f6-7de8d5300204', (SELECT id FROM day4_main), (SELECT id FROM exercises WHERE slug='face_pulls'), 5, 'Face Pulls', '{"en":"Face Pulls","nb":"Face pulls"}'::jsonb, 50, 'kg', 60),
    ('2a87094c-260a-4a1b-95f6-7de8d5300204', (SELECT id FROM day4_main), (SELECT id FROM exercises WHERE slug='neck_headband'), 6, 'Neck Headband', '{"en":"Neck Headband","nb":"Nakkeband"}'::jsonb, 10, 'kg', 60),
    -- Treadmill
    ('2a87094c-260a-4a1b-95f6-7de8d5300204', (SELECT id FROM day4_walk), (SELECT id FROM exercises WHERE slug='incline_walk'), 1, 'Incline Walk', '{"en":"Incline Walk","nb":"Gange i motbakke"}'::jsonb, NULL, 'kg', 0),

    -- ========== DAY 5: CARDIO 4x4 ==========
    -- 4x4 interval
    ('2a87094c-260a-4a1b-95f6-7de8d5300205', (SELECT id FROM day5_cardio), (SELECT id FROM exercises WHERE slug='treadmill_4x4'), 1, 'Treadmill 4×4', '{"en":"Treadmill 4×4","nb":"Tredemølle 4×4"}'::jsonb, NULL, 'kg', 0),
    -- Core
    ('2a87094c-260a-4a1b-95f6-7de8d5300205', (SELECT id FROM day5_core), (SELECT id FROM exercises WHERE slug='leg_raises'), 1, 'Leg Raises', '{"en":"Leg Raises","nb":"Beinhev"}'::jsonb, NULL, 'kg', 45),
    ('2a87094c-260a-4a1b-95f6-7de8d5300205', (SELECT id FROM day5_core), (SELECT id FROM exercises WHERE slug='cable_crunch'), 2, 'Cable Crunch', '{"en":"Cable Crunch","nb":"Cable crunch"}'::jsonb, 32, 'kg', 45),
    ('2a87094c-260a-4a1b-95f6-7de8d5300205', (SELECT id FROM day5_core), (SELECT id FROM exercises WHERE slug='plank'), 3, 'Plank', '{"en":"Plank","nb":"Planke"}'::jsonb, NULL, 'kg', 45),

    -- ========== DAY 6: LEGS - VOLUME ==========
    -- Main exercises
    ('2a87094c-260a-4a1b-95f6-7de8d5300206', (SELECT id FROM day6_main), (SELECT id FROM exercises WHERE slug='squat'), 1, 'Squat', '{"en":"Squat","nb":"Knebøy"}'::jsonb, 85, 'kg', 120),
    ('2a87094c-260a-4a1b-95f6-7de8d5300206', (SELECT id FROM day6_main), (SELECT id FROM exercises WHERE slug='hip_thrust'), 2, 'Hip Thrust', '{"en":"Hip Thrust","nb":"Hip thrust"}'::jsonb, 60, 'kg', 90),
    ('2a87094c-260a-4a1b-95f6-7de8d5300206', (SELECT id FROM day6_main), (SELECT id FROM exercises WHERE slug='bulgarian_split_squat'), 3, 'Bulgarian Split Squat', '{"en":"Bulgarian Split Squat","nb":"Bulgarsk utfall"}'::jsonb, 15, 'kg', 60),
    ('2a87094c-260a-4a1b-95f6-7de8d5300206', (SELECT id FROM day6_main), (SELECT id FROM exercises WHERE slug='leg_curl'), 4, 'Leg Curl', '{"en":"Leg Curl","nb":"Bencurl"}'::jsonb, 59, 'kg', 60),
    ('2a87094c-260a-4a1b-95f6-7de8d5300206', (SELECT id FROM day6_main), (SELECT id FROM exercises WHERE slug='standing_calf_raises'), 5, 'Standing Calf Raises', '{"en":"Standing Calf Raises","nb":"Stående tåhev"}'::jsonb, 60, 'kg', 60),
    ('2a87094c-260a-4a1b-95f6-7de8d5300206', (SELECT id FROM day6_main), (SELECT id FROM exercises WHERE slug='seated_calf_raises'), 6, 'Seated Calf Raises', '{"en":"Seated Calf Raises","nb":"Sittende tåhev"}'::jsonb, 40, 'kg', 60),
    -- Treadmill
    ('2a87094c-260a-4a1b-95f6-7de8d5300206', (SELECT id FROM day6_walk), (SELECT id FROM exercises WHERE slug='incline_walk'), 1, 'Incline Walk', '{"en":"Incline Walk","nb":"Gange i motbakke"}'::jsonb, NULL, 'kg', 0)
  RETURNING id, program_day_id, sort_order, display_name, exercise_id
)
-- ============================================================
-- 4. Planned sets for every exercise
-- ============================================================
INSERT INTO public.planned_exercise_sets (
  program_day_exercise_id, set_number, set_kind,
  target_weight_value, target_weight_unit,
  target_reps_exact, target_reps_min, target_reps_max,
  target_duration_seconds, rest_seconds
)
SELECT ie.id, s.set_number, s.set_kind,
       s.target_weight, 'kg', s.reps_exact, s.reps_min, s.reps_max,
       s.duration_sec, s.rest_sec
FROM inserted_exercises ie
JOIN (VALUES
  -- ========== DAY 2: PULL ==========
  -- Pull-ups: 3 sets bodyweight
  ('2a87094c-260a-4a1b-95f6-7de8d5300202', 1, 1, 'working'::public.planned_set_kind, NULL::numeric, NULL::int, NULL::int, NULL::int, NULL::int, 90),
  ('2a87094c-260a-4a1b-95f6-7de8d5300202', 1, 2, 'working', NULL, NULL, NULL, NULL, NULL, 90),
  ('2a87094c-260a-4a1b-95f6-7de8d5300202', 1, 3, 'working', NULL, NULL, NULL, NULL, NULL, 90),
  -- Barbell Row: top set 22.5 + 2 backoff 20
  ('2a87094c-260a-4a1b-95f6-7de8d5300202', 2, 1, 'top_set', 22.5, 10, NULL, NULL, NULL, 90),
  ('2a87094c-260a-4a1b-95f6-7de8d5300202', 2, 2, 'backoff', 20, 12, NULL, NULL, NULL, 90),
  ('2a87094c-260a-4a1b-95f6-7de8d5300202', 2, 3, 'backoff', 20, 12, NULL, NULL, NULL, 90),
  -- Seated Cable Row: 3 working sets
  ('2a87094c-260a-4a1b-95f6-7de8d5300202', 3, 1, 'working', 52, 12, NULL, NULL, NULL, 60),
  ('2a87094c-260a-4a1b-95f6-7de8d5300202', 3, 2, 'working', 59, 10, NULL, NULL, NULL, 60),
  ('2a87094c-260a-4a1b-95f6-7de8d5300202', 3, 3, 'working', 52, 10, NULL, NULL, NULL, 60),
  -- Lat Pulldown: 3 x 45 x 10
  ('2a87094c-260a-4a1b-95f6-7de8d5300202', 4, 1, 'working', 45, 10, NULL, NULL, NULL, 60),
  ('2a87094c-260a-4a1b-95f6-7de8d5300202', 4, 2, 'working', 45, 10, NULL, NULL, NULL, 60),
  ('2a87094c-260a-4a1b-95f6-7de8d5300202', 4, 3, 'working', 45, 10, NULL, NULL, NULL, 60),
  -- Hammer Curl: 3 x 17.5 x 12
  ('2a87094c-260a-4a1b-95f6-7de8d5300202', 5, 1, 'working', 17.5, 12, NULL, NULL, NULL, 60),
  ('2a87094c-260a-4a1b-95f6-7de8d5300202', 5, 2, 'working', 17.5, 12, NULL, NULL, NULL, 60),
  ('2a87094c-260a-4a1b-95f6-7de8d5300202', 5, 3, 'working', 17.5, 12, NULL, NULL, NULL, 60),
  -- Preacher Curl: 3 x 10 x 10
  ('2a87094c-260a-4a1b-95f6-7de8d5300202', 6, 1, 'working', 10, 10, NULL, NULL, NULL, 60),
  ('2a87094c-260a-4a1b-95f6-7de8d5300202', 6, 2, 'working', 10, 10, NULL, NULL, NULL, 60),
  ('2a87094c-260a-4a1b-95f6-7de8d5300202', 6, 3, 'working', 10, 10, NULL, NULL, NULL, 60),
  -- Core: Leg Raises 3x15, Cable Crunch 3x15, Plank 3x60s
  ('2a87094c-260a-4a1b-95f6-7de8d5300202', 7, 1, 'core', NULL, NULL, 10, 15, NULL, 45),
  ('2a87094c-260a-4a1b-95f6-7de8d5300202', 7, 2, 'core', NULL, NULL, 10, 15, NULL, 45),
  ('2a87094c-260a-4a1b-95f6-7de8d5300202', 7, 3, 'core', NULL, NULL, 10, 15, NULL, 45),
  ('2a87094c-260a-4a1b-95f6-7de8d5300202', 8, 1, 'core', 32, NULL, 10, 15, NULL, 45),
  ('2a87094c-260a-4a1b-95f6-7de8d5300202', 8, 2, 'core', 32, NULL, 10, 15, NULL, 45),
  ('2a87094c-260a-4a1b-95f6-7de8d5300202', 8, 3, 'core', 32, NULL, 10, 15, NULL, 45),
  ('2a87094c-260a-4a1b-95f6-7de8d5300202', 9, 1, 'core', NULL, NULL, NULL, NULL, 60, 45),
  ('2a87094c-260a-4a1b-95f6-7de8d5300202', 9, 2, 'core', NULL, NULL, NULL, NULL, 60, 45),
  ('2a87094c-260a-4a1b-95f6-7de8d5300202', 9, 3, 'core', NULL, NULL, NULL, NULL, 60, 45),
  -- Treadmill: 1 x 20 min
  ('2a87094c-260a-4a1b-95f6-7de8d5300202', 10, 1, 'cardio', NULL, NULL, NULL, NULL, 1200, 0),

  -- ========== DAY 3: LEGS HEAVY ==========
  -- Squat: top set 30x10 + 2 backoff 25x10
  ('2a87094c-260a-4a1b-95f6-7de8d5300203', 1, 1, 'top_set', 30, 10, NULL, NULL, NULL, 120),
  ('2a87094c-260a-4a1b-95f6-7de8d5300203', 1, 2, 'backoff', 25, 10, NULL, NULL, NULL, 120),
  ('2a87094c-260a-4a1b-95f6-7de8d5300203', 1, 3, 'backoff', 25, 10, NULL, NULL, NULL, 120),
  -- RDL: 3 x 20 x 10
  ('2a87094c-260a-4a1b-95f6-7de8d5300203', 2, 1, 'working', 20, 10, NULL, NULL, NULL, 90),
  ('2a87094c-260a-4a1b-95f6-7de8d5300203', 2, 2, 'working', 20, 10, NULL, NULL, NULL, 90),
  ('2a87094c-260a-4a1b-95f6-7de8d5300203', 2, 3, 'working', 20, 10, NULL, NULL, NULL, 90),
  -- Lunges: 3 x 12kg x 10/foot
  ('2a87094c-260a-4a1b-95f6-7de8d5300203', 3, 1, 'working', 12, 10, NULL, NULL, NULL, 60),
  ('2a87094c-260a-4a1b-95f6-7de8d5300203', 3, 2, 'working', 12, 10, NULL, NULL, NULL, 60),
  ('2a87094c-260a-4a1b-95f6-7de8d5300203', 3, 3, 'working', 12, 10, NULL, NULL, NULL, 60),
  -- Leg Curl: 3 sets
  ('2a87094c-260a-4a1b-95f6-7de8d5300203', 4, 1, 'working', 63, 12, NULL, NULL, NULL, 60),
  ('2a87094c-260a-4a1b-95f6-7de8d5300203', 4, 2, 'working', 54, 10, NULL, NULL, NULL, 60),
  ('2a87094c-260a-4a1b-95f6-7de8d5300203', 4, 3, 'working', 54, 12, NULL, NULL, NULL, 60),
  -- Core: Leg Raises 3x10, Plank 3x60s
  ('2a87094c-260a-4a1b-95f6-7de8d5300203', 5, 1, 'core', NULL, NULL, 10, 15, NULL, 45),
  ('2a87094c-260a-4a1b-95f6-7de8d5300203', 5, 2, 'core', NULL, NULL, 10, 15, NULL, 45),
  ('2a87094c-260a-4a1b-95f6-7de8d5300203', 5, 3, 'core', NULL, NULL, 10, 15, NULL, 45),
  ('2a87094c-260a-4a1b-95f6-7de8d5300203', 6, 1, 'core', NULL, NULL, NULL, NULL, 60, 45),
  ('2a87094c-260a-4a1b-95f6-7de8d5300203', 6, 2, 'core', NULL, NULL, NULL, NULL, 60, 45),
  ('2a87094c-260a-4a1b-95f6-7de8d5300203', 6, 3, 'core', NULL, NULL, NULL, NULL, 60, 45),
  -- Treadmill: 20 min
  ('2a87094c-260a-4a1b-95f6-7de8d5300203', 7, 1, 'cardio', NULL, NULL, NULL, NULL, 1200, 0),

  -- ========== DAY 4: SHOULDERS / NECK ==========
  -- Overhead Press: top 17.5x7 + 2 backoff
  ('2a87094c-260a-4a1b-95f6-7de8d5300204', 1, 1, 'top_set', 17.5, 7, NULL, NULL, NULL, 90),
  ('2a87094c-260a-4a1b-95f6-7de8d5300204', 1, 2, 'backoff', 12.5, 10, NULL, NULL, NULL, 90),
  ('2a87094c-260a-4a1b-95f6-7de8d5300204', 1, 3, 'backoff', 12.5, 10, NULL, NULL, NULL, 90),
  -- Lateral Raise: 3 x 12.5 x 12
  ('2a87094c-260a-4a1b-95f6-7de8d5300204', 2, 1, 'working', 12.5, 12, NULL, NULL, NULL, 60),
  ('2a87094c-260a-4a1b-95f6-7de8d5300204', 2, 2, 'working', 12.5, 12, NULL, NULL, NULL, 60),
  ('2a87094c-260a-4a1b-95f6-7de8d5300204', 2, 3, 'working', 12.5, 12, NULL, NULL, NULL, 60),
  -- Rear Delt Flyes: 3 x 12.5
  ('2a87094c-260a-4a1b-95f6-7de8d5300204', 3, 1, 'working', 12.5, 12, NULL, NULL, NULL, 60),
  ('2a87094c-260a-4a1b-95f6-7de8d5300204', 3, 2, 'working', 12.5, 12, NULL, NULL, NULL, 60),
  ('2a87094c-260a-4a1b-95f6-7de8d5300204', 3, 3, 'working', 12.5, 12, NULL, NULL, NULL, 60),
  -- Shrugs: 3 sets
  ('2a87094c-260a-4a1b-95f6-7de8d5300204', 4, 1, 'working', 20, 20, NULL, NULL, NULL, 60),
  ('2a87094c-260a-4a1b-95f6-7de8d5300204', 4, 2, 'working', 35, 12, NULL, NULL, NULL, 60),
  ('2a87094c-260a-4a1b-95f6-7de8d5300204', 4, 3, 'working', 40, 10, NULL, NULL, NULL, 60),
  -- Face Pulls: 3 x 50 x 10
  ('2a87094c-260a-4a1b-95f6-7de8d5300204', 5, 1, 'working', 54, 10, NULL, NULL, NULL, 60),
  ('2a87094c-260a-4a1b-95f6-7de8d5300204', 5, 2, 'working', 50, 10, NULL, NULL, NULL, 60),
  ('2a87094c-260a-4a1b-95f6-7de8d5300204', 5, 3, 'working', 50, 10, NULL, NULL, NULL, 60),
  -- Neck Headband: 3 x 10 x 12
  ('2a87094c-260a-4a1b-95f6-7de8d5300204', 6, 1, 'working', 10, 12, NULL, NULL, NULL, 60),
  ('2a87094c-260a-4a1b-95f6-7de8d5300204', 6, 2, 'working', 10, 12, NULL, NULL, NULL, 60),
  ('2a87094c-260a-4a1b-95f6-7de8d5300204', 6, 3, 'working', 10, 12, NULL, NULL, NULL, 60),
  -- Treadmill: 20 min
  ('2a87094c-260a-4a1b-95f6-7de8d5300204', 7, 1, 'cardio', NULL, NULL, NULL, NULL, 1200, 0),

  -- ========== DAY 5: CARDIO 4x4 ==========
  -- 4x4 intervals: 4 rounds of 4 min
  ('2a87094c-260a-4a1b-95f6-7de8d5300205', 1, 1, 'cardio', NULL, NULL, NULL, NULL, 240, 180),
  ('2a87094c-260a-4a1b-95f6-7de8d5300205', 1, 2, 'cardio', NULL, NULL, NULL, NULL, 240, 180),
  ('2a87094c-260a-4a1b-95f6-7de8d5300205', 1, 3, 'cardio', NULL, NULL, NULL, NULL, 240, 180),
  ('2a87094c-260a-4a1b-95f6-7de8d5300205', 1, 4, 'cardio', NULL, NULL, NULL, NULL, 240, 0),
  -- Core: Leg Raises 3x, Cable Crunch 3x, Plank 3x60s
  ('2a87094c-260a-4a1b-95f6-7de8d5300205', 2, 1, 'core', NULL, NULL, 10, 15, NULL, 45),
  ('2a87094c-260a-4a1b-95f6-7de8d5300205', 2, 2, 'core', NULL, NULL, 10, 15, NULL, 45),
  ('2a87094c-260a-4a1b-95f6-7de8d5300205', 2, 3, 'core', NULL, NULL, 10, 15, NULL, 45),
  ('2a87094c-260a-4a1b-95f6-7de8d5300205', 3, 1, 'core', 32, NULL, 10, 15, NULL, 45),
  ('2a87094c-260a-4a1b-95f6-7de8d5300205', 3, 2, 'core', 32, NULL, 10, 15, NULL, 45),
  ('2a87094c-260a-4a1b-95f6-7de8d5300205', 3, 3, 'core', 32, NULL, 10, 15, NULL, 45),
  ('2a87094c-260a-4a1b-95f6-7de8d5300205', 4, 1, 'core', NULL, NULL, NULL, NULL, 60, 45),
  ('2a87094c-260a-4a1b-95f6-7de8d5300205', 4, 2, 'core', NULL, NULL, NULL, NULL, 60, 45),
  ('2a87094c-260a-4a1b-95f6-7de8d5300205', 4, 3, 'core', NULL, NULL, NULL, NULL, 60, 45),

  -- ========== DAY 6: LEGS VOLUME ==========
  -- Squat: 3 x 85 x 10
  ('2a87094c-260a-4a1b-95f6-7de8d5300206', 1, 1, 'working', 85, 10, NULL, NULL, NULL, 120),
  ('2a87094c-260a-4a1b-95f6-7de8d5300206', 1, 2, 'working', 85, 10, NULL, NULL, NULL, 120),
  ('2a87094c-260a-4a1b-95f6-7de8d5300206', 1, 3, 'working', 85, 10, NULL, NULL, NULL, 120),
  -- Hip Thrust: 3 x 60 x 10
  ('2a87094c-260a-4a1b-95f6-7de8d5300206', 2, 1, 'working', 60, 10, NULL, NULL, NULL, 90),
  ('2a87094c-260a-4a1b-95f6-7de8d5300206', 2, 2, 'working', 60, 10, NULL, NULL, NULL, 90),
  ('2a87094c-260a-4a1b-95f6-7de8d5300206', 2, 3, 'working', 60, 10, NULL, NULL, NULL, 90),
  -- Bulgarian Split Squat: 3 x 15 x 10/foot
  ('2a87094c-260a-4a1b-95f6-7de8d5300206', 3, 1, 'working', 15, 10, NULL, NULL, NULL, 60),
  ('2a87094c-260a-4a1b-95f6-7de8d5300206', 3, 2, 'working', 15, 10, NULL, NULL, NULL, 60),
  ('2a87094c-260a-4a1b-95f6-7de8d5300206', 3, 3, 'working', 15, 10, NULL, NULL, NULL, 60),
  -- Leg Curl: 3 x 59 x 10
  ('2a87094c-260a-4a1b-95f6-7de8d5300206', 4, 1, 'working', 59, 10, NULL, NULL, NULL, 60),
  ('2a87094c-260a-4a1b-95f6-7de8d5300206', 4, 2, 'working', 59, 10, NULL, NULL, NULL, 60),
  ('2a87094c-260a-4a1b-95f6-7de8d5300206', 4, 3, 'working', 59, 10, NULL, NULL, NULL, 60),
  -- Standing Calf Raises: 3 x 60 x 12
  ('2a87094c-260a-4a1b-95f6-7de8d5300206', 5, 1, 'working', 60, 12, NULL, NULL, NULL, 60),
  ('2a87094c-260a-4a1b-95f6-7de8d5300206', 5, 2, 'working', 60, 12, NULL, NULL, NULL, 60),
  ('2a87094c-260a-4a1b-95f6-7de8d5300206', 5, 3, 'working', 60, 12, NULL, NULL, NULL, 60),
  -- Seated Calf Raises: 3 x 40 x 12
  ('2a87094c-260a-4a1b-95f6-7de8d5300206', 6, 1, 'working', 40, 12, NULL, NULL, NULL, 60),
  ('2a87094c-260a-4a1b-95f6-7de8d5300206', 6, 2, 'working', 40, 12, NULL, NULL, NULL, 60),
  ('2a87094c-260a-4a1b-95f6-7de8d5300206', 6, 3, 'working', 40, 12, NULL, NULL, NULL, 60),
  -- Treadmill: 20 min
  ('2a87094c-260a-4a1b-95f6-7de8d5300206', 7, 1, 'cardio', NULL, NULL, NULL, NULL, 1200, 0)
) AS s(day_id, exercise_sort, set_number, set_kind, target_weight, reps_exact, reps_min, reps_max, duration_sec, rest_sec)
ON ie.program_day_id = s.day_id AND ie.sort_order = s.exercise_sort;
