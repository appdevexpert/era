-- ------------------------------------------------------------
-- Bro Split program seed (Cycle 2 — post-12-week alternative)
-- ------------------------------------------------------------
-- Source: Rami's "ERA · Golden Era Bro Split" spec (2026-06).
-- Idempotent: program ID is fixed; if it already exists, the seed
-- skips re-insert. Day-level exercise inserts are guarded by an
-- existence check on program_day_exercises.
--
-- Requires: bro_split_exercises_seed.sql to be applied first.
-- ------------------------------------------------------------

-- 1) Exercise library entries used by Bro Split that did NOT exist
--    in cycle 1's Push/Pull/Legs split. 26 entries, EN + NB.

INSERT INTO public.exercise_library
  (slug, name, modality, category, primary_muscles, default_rest_seconds, is_active, name_translations)
VALUES
  ('incline_barbell_press',     'Incline Barbell Press',       'strength', 'compound',  ARRAY['chest'],                    90, true, '{"en":"Incline Barbell Press","nb":"Skrå benkpress med stang"}'::jsonb),
  ('decline_bench_press',       'Decline Bench Press',         'strength', 'compound',  ARRAY['chest'],                    90, true, '{"en":"Decline Bench Press","nb":"Dekline benkpress"}'::jsonb),
  ('pec_deck',                  'Pec Deck',                    'strength', 'isolation', ARRAY['chest'],                    60, true, '{"en":"Pec Deck","nb":"Pec deck"}'::jsonb),
  ('cable_crossover',           'Cable Crossover',             'strength', 'isolation', ARRAY['chest'],                    60, true, '{"en":"Cable Crossover","nb":"Kabelkryss"}'::jsonb),
  ('dumbbell_pullover',         'Dumbbell Pullover',           'strength', 'isolation', ARRAY['chest','back'],             60, true, '{"en":"Dumbbell Pullover","nb":"Hantelpullover"}'::jsonb),
  ('t_bar_row',                 'T-Bar Row',                   'strength', 'compound',  ARRAY['back'],                     90, true, '{"en":"T-Bar Row","nb":"T-stang roing"}'::jsonb),
  ('one_arm_dumbbell_row',      'One-Arm Dumbbell Row',        'strength', 'compound',  ARRAY['back'],                     60, true, '{"en":"One-Arm Dumbbell Row","nb":"Enarms hantelroing"}'::jsonb),
  ('wide_grip_pulldown',        'Wide-Grip Pulldown',          'strength', 'compound',  ARRAY['back'],                     60, true, '{"en":"Wide-Grip Pulldown","nb":"Bredt grep nedtrekk"}'::jsonb),
  ('straight_arm_pulldown',     'Straight-Arm Pulldown',       'strength', 'isolation', ARRAY['back'],                     60, true, '{"en":"Straight-Arm Pulldown","nb":"Strakarms nedtrekk"}'::jsonb),
  ('hyperextensions',           'Hyperextensions',             'strength', 'isolation', ARRAY['lower_back','glutes'],      60, true, '{"en":"Hyperextensions","nb":"Hyperekstensjon"}'::jsonb),
  ('walking_lunges_barbell',    'Walking Lunges with Barbell', 'strength', 'compound',  ARRAY['quads','glutes'],           90, true, '{"en":"Walking Lunges with Barbell","nb":"Gående utfall med stang"}'::jsonb),
  ('leg_extension',             'Leg Extension',               'strength', 'isolation', ARRAY['quads'],                    60, true, '{"en":"Leg Extension","nb":"Beinekstensjon"}'::jsonb),
  ('sissy_squat',               'Sissy Squat',                 'strength', 'isolation', ARRAY['quads'],                    60, true, '{"en":"Sissy Squat","nb":"Sissy knebøy"}'::jsonb),
  ('behind_neck_press',         'Behind-the-Neck Press',       'strength', 'compound',  ARRAY['shoulders'],                90, true, '{"en":"Behind-the-Neck Press","nb":"Bak-nakke press (Smith)"}'::jsonb),
  ('cable_lateral_raise',       'Cable Lateral Raise',         'strength', 'isolation', ARRAY['shoulders'],                45, true, '{"en":"Cable Lateral Raise","nb":"Kabel sidehev"}'::jsonb),
  ('reverse_pec_deck',          'Reverse Pec Deck',            'strength', 'isolation', ARRAY['rear_delts'],               60, true, '{"en":"Reverse Pec Deck","nb":"Revers pec deck"}'::jsonb),
  ('front_raise_plate',         'Front Raise with Plate',      'strength', 'isolation', ARRAY['shoulders'],                60, true, '{"en":"Front Raise with Plate","nb":"Frontheving med vektplate"}'::jsonb),
  ('upright_row',               'Upright Row',                 'strength', 'compound',  ARRAY['shoulders','traps'],        60, true, '{"en":"Upright Row","nb":"Stående roing"}'::jsonb),
  ('ez_bar_curl',               'EZ-Bar Curl',                 'strength', 'isolation', ARRAY['biceps'],                   60, true, '{"en":"EZ-Bar Curl","nb":"EZ-stang curl"}'::jsonb),
  ('concentration_curl',        'Concentration Curl',          'strength', 'isolation', ARRAY['biceps'],                   60, true, '{"en":"Concentration Curl","nb":"Konsentrasjonscurl"}'::jsonb),
  ('incline_dumbbell_curl',     'Incline Dumbbell Curl',       'strength', 'isolation', ARRAY['biceps'],                   60, true, '{"en":"Incline Dumbbell Curl","nb":"Skrå hantelcurl"}'::jsonb),
  ('close_grip_bench_press',    'Close-Grip Bench Press',      'strength', 'compound',  ARRAY['triceps','chest'],          90, true, '{"en":"Close-Grip Bench Press","nb":"Smalt grep benkpress"}'::jsonb),
  ('overhead_tricep_extension', 'Overhead Tricep Extension',   'strength', 'isolation', ARRAY['triceps'],                  60, true, '{"en":"Overhead Tricep Extension","nb":"Triceps strekk over hode"}'::jsonb),
  ('tricep_kickback',           'Tricep Kickback',             'strength', 'isolation', ARRAY['triceps'],                  45, true, '{"en":"Tricep Kickback","nb":"Triceps kickback"}'::jsonb),
  ('hanging_leg_raises',        'Hanging Leg Raises',          'core',     'core',      ARRAY['abs'],                      45, true, '{"en":"Hanging Leg Raises","nb":"Hengende beinhev"}'::jsonb),
  ('side_plank',                'Side Plank',                  'core',     'core',      ARRAY['obliques'],                 45, true, '{"en":"Side Plank","nb":"Sideplanke"}'::jsonb)
ON CONFLICT (slug) DO NOTHING;

-- 2) Bro Split program structure: 1 program + 12 weeks + 84 days +
--    section per working day + 5–7 exercises per working day +
--    3–4 planned sets per exercise. Sunday is rest (no section).

CREATE OR REPLACE FUNCTION public._tmp_seed_bs_ex(
  p_day_id uuid,
  p_section_id uuid,
  p_slug text,
  p_sort int,
  p_top_set_count int,
  p_total_sets int,
  p_reps_min int,
  p_reps_max int,
  p_reps_exact int,
  p_duration_sec int,
  p_rest_sec int,
  p_display_name text,
  p_display_name_nb text
) RETURNS void
LANGUAGE plpgsql
AS $fn$
DECLARE
  v_ex_id uuid;
  v_pde_id uuid;
  v_set_num int;
  v_kind public.planned_set_kind;
BEGIN
  SELECT id INTO v_ex_id FROM public.exercise_library WHERE slug = p_slug;
  IF v_ex_id IS NULL THEN
    RAISE EXCEPTION 'exercise_library missing slug: %', p_slug;
  END IF;
  INSERT INTO public.program_day_exercises
    (program_day_id, section_id, exercise_id, sort_order, display_name, display_name_translations, default_rest_seconds)
  VALUES
    (p_day_id, p_section_id, v_ex_id, p_sort, p_display_name,
     jsonb_build_object('en', p_display_name, 'nb', p_display_name_nb), p_rest_sec)
  RETURNING id INTO v_pde_id;
  FOR v_set_num IN 1..p_total_sets LOOP
    IF v_set_num <= p_top_set_count THEN
      v_kind := 'top_set';
    ELSE
      v_kind := 'working';
    END IF;
    INSERT INTO public.planned_exercise_sets
      (program_day_exercise_id, set_number, set_kind, target_reps_min, target_reps_max, target_reps_exact, target_duration_seconds, rest_seconds)
    VALUES
      (v_pde_id, v_set_num, v_kind, p_reps_min, p_reps_max, p_reps_exact, p_duration_sec, p_rest_sec);
  END LOOP;
END;
$fn$;

DO $$
DECLARE
  v_program_id uuid := '88888888-8888-8888-8888-888888888888';
  v_week_id uuid;
  v_day_id uuid;
  v_section_id uuid;
  v_week_num int;
  v_day_num int;
  v_phase text;
  v_phase_nb text;
  v_title text;
  v_title_nb text;
  v_workout_kind public.workout_day_kind;
  v_is_rest boolean;
  v_muscles text[];
  v_exists boolean;
BEGIN
  SELECT EXISTS(SELECT 1 FROM public.workout_programs WHERE id = v_program_id) INTO v_exists;
  IF NOT v_exists THEN
    INSERT INTO public.workout_programs
      (id, title, duration_weeks, days_per_week, gender, level, kind, title_translations)
    VALUES
      (v_program_id, 'Golden Era Bro Split', 12, 6, 'male', 'advanced', 'bro_split',
       '{"en":"Golden Era Bro Split","nb":"Golden Era Bro Split"}'::jsonb);

    FOR v_week_num IN 1..12 LOOP
      IF v_week_num <= 4 THEN
        v_phase := 'Hypertrophy'; v_phase_nb := 'Hypertrofi';
      ELSIF v_week_num <= 8 THEN
        v_phase := 'Strength'; v_phase_nb := 'Styrke';
      ELSE
        v_phase := 'Peak'; v_phase_nb := 'Topp';
      END IF;

      INSERT INTO public.program_weeks
        (program_id, week_number, title, focus, title_translations, focus_translations)
      VALUES
        (v_program_id, v_week_num, 'Week ' || v_week_num, v_phase,
         jsonb_build_object('en','Week ' || v_week_num,'nb','Uke ' || v_week_num),
         jsonb_build_object('en',v_phase,'nb',v_phase_nb))
      RETURNING id INTO v_week_id;

      FOR v_day_num IN 1..7 LOOP
        v_is_rest := false;
        CASE v_day_num
          WHEN 1 THEN v_title := 'Chest';              v_title_nb := 'Bryst';              v_workout_kind := 'push';      v_muscles := ARRAY['chest','triceps'];
          WHEN 2 THEN v_title := 'Back';               v_title_nb := 'Rygg';               v_workout_kind := 'pull';      v_muscles := ARRAY['back','biceps'];
          WHEN 3 THEN v_title := 'Legs';               v_title_nb := 'Bein';               v_workout_kind := 'legs';      v_muscles := ARRAY['quads','glutes','hamstrings'];
          WHEN 4 THEN v_title := 'Shoulders';          v_title_nb := 'Skuldre';            v_workout_kind := 'shoulders'; v_muscles := ARRAY['shoulders','traps'];
          WHEN 5 THEN v_title := 'Arms';               v_title_nb := 'Armer';              v_workout_kind := 'custom';    v_muscles := ARRAY['biceps','triceps'];
          WHEN 6 THEN v_title := 'Legs Light + Core';  v_title_nb := 'Bein Lett + Kjerne'; v_workout_kind := 'legs';      v_muscles := ARRAY['glutes','calves','abs'];
          WHEN 7 THEN v_title := 'Rest';               v_title_nb := 'Hvile';              v_workout_kind := 'rest';      v_is_rest := true; v_muscles := ARRAY[]::text[];
        END CASE;

        INSERT INTO public.program_days
          (program_id, week_id, day_number, weekday, workout_kind, title, target_muscles, is_rest_day, sort_order, title_translations)
        VALUES
          (v_program_id, v_week_id, v_day_num, v_day_num, v_workout_kind, v_title, v_muscles, v_is_rest, v_day_num,
           jsonb_build_object('en',v_title,'nb',v_title_nb))
        RETURNING id INTO v_day_id;

        IF NOT v_is_rest THEN
          INSERT INTO public.program_day_sections
            (program_day_id, section_kind, title, sort_order, title_translations)
          VALUES
            (v_day_id, 'main_exercises', 'Main Exercises', 0,
             '{"en":"Main Exercises","nb":"Hovedøvelser"}'::jsonb)
          RETURNING id INTO v_section_id;

          CASE v_day_num
          WHEN 1 THEN
            PERFORM public._tmp_seed_bs_ex(v_day_id, v_section_id, 'incline_barbell_press', 0, 1, 4,  8, 10, NULL, NULL, 90,  'Incline Barbell Press', 'Skrå benkpress med stang');
            PERFORM public._tmp_seed_bs_ex(v_day_id, v_section_id, 'decline_bench_press',   1, 0, 3,  NULL, NULL, 10, NULL, 90,  'Decline Bench Press', 'Dekline benkpress');
            PERFORM public._tmp_seed_bs_ex(v_day_id, v_section_id, 'pec_deck',              2, 0, 3,  NULL, NULL, 12, NULL, 60,  'Pec Deck', 'Pec deck');
            PERFORM public._tmp_seed_bs_ex(v_day_id, v_section_id, 'cable_crossover',       3, 0, 3,  12, 15, NULL, NULL, 60,  'Cable Crossover', 'Kabelkryss');
            PERFORM public._tmp_seed_bs_ex(v_day_id, v_section_id, 'dumbbell_pullover',     4, 0, 3,  NULL, NULL, 12, NULL, 60,  'Dumbbell Pullover', 'Hantelpullover');
          WHEN 2 THEN
            PERFORM public._tmp_seed_bs_ex(v_day_id, v_section_id, 't_bar_row',             0, 1, 4,  8, 10, NULL, NULL, 90,  'T-Bar Row', 'T-stang roing');
            PERFORM public._tmp_seed_bs_ex(v_day_id, v_section_id, 'one_arm_dumbbell_row',  1, 0, 3,  NULL, NULL, 10, NULL, 60,  'One-Arm Dumbbell Row', 'Enarms hantelroing');
            PERFORM public._tmp_seed_bs_ex(v_day_id, v_section_id, 'wide_grip_pulldown',    2, 0, 3,  10, 12, NULL, NULL, 60,  'Wide-Grip Pulldown', 'Bredt grep nedtrekk');
            PERFORM public._tmp_seed_bs_ex(v_day_id, v_section_id, 'straight_arm_pulldown', 3, 0, 3,  12, 15, NULL, NULL, 60,  'Straight-Arm Pulldown', 'Strakarms nedtrekk');
            PERFORM public._tmp_seed_bs_ex(v_day_id, v_section_id, 'hyperextensions',       4, 0, 3,  12, 15, NULL, NULL, 60,  'Hyperextensions', 'Hyperekstensjon');
          WHEN 3 THEN
            PERFORM public._tmp_seed_bs_ex(v_day_id, v_section_id, 'front_squat',            0, 1, 4,  8, 10, NULL, NULL, 120, 'Front Squat', 'Frontknebøy');
            PERFORM public._tmp_seed_bs_ex(v_day_id, v_section_id, 'walking_lunges_barbell', 1, 0, 3,  NULL, NULL, 12, NULL, 90,  'Walking Lunges with Barbell', 'Gående utfall med stang');
            PERFORM public._tmp_seed_bs_ex(v_day_id, v_section_id, 'romanian_deadlift',      2, 0, 3,  NULL, NULL, 10, NULL, 90,  'Romanian Deadlift', 'Rumensk markløft');
            PERFORM public._tmp_seed_bs_ex(v_day_id, v_section_id, 'leg_extension',          3, 0, 3,  12, 15, NULL, NULL, 60,  'Leg Extension', 'Beinekstensjon');
            PERFORM public._tmp_seed_bs_ex(v_day_id, v_section_id, 'sissy_squat',            4, 0, 3,  NULL, NULL, 12, NULL, 60,  'Sissy Squat', 'Sissy knebøy');
          WHEN 4 THEN
            PERFORM public._tmp_seed_bs_ex(v_day_id, v_section_id, 'behind_neck_press',     0, 1, 4,  8, 10, NULL, NULL, 90,  'Behind-the-Neck Press', 'Bak-nakke press');
            PERFORM public._tmp_seed_bs_ex(v_day_id, v_section_id, 'cable_lateral_raise',   1, 0, 4,  12, 15, NULL, NULL, 45,  'Cable Lateral Raise', 'Kabel sidehev');
            PERFORM public._tmp_seed_bs_ex(v_day_id, v_section_id, 'reverse_pec_deck',      2, 0, 3,  12, 15, NULL, NULL, 60,  'Reverse Pec Deck', 'Revers pec deck');
            PERFORM public._tmp_seed_bs_ex(v_day_id, v_section_id, 'front_raise_plate',     3, 0, 3,  NULL, NULL, 12, NULL, 60,  'Front Raise with Plate', 'Frontheving med vektplate');
            PERFORM public._tmp_seed_bs_ex(v_day_id, v_section_id, 'upright_row',           4, 0, 3,  10, 12, NULL, NULL, 60,  'Upright Row', 'Stående roing');
          WHEN 5 THEN
            PERFORM public._tmp_seed_bs_ex(v_day_id, v_section_id, 'ez_bar_curl',               0, 1, 4,  NULL, NULL, 10, NULL, 60,  'EZ-Bar Curl', 'EZ-stang curl');
            PERFORM public._tmp_seed_bs_ex(v_day_id, v_section_id, 'concentration_curl',        1, 0, 3,  10, 12, NULL, NULL, 60,  'Concentration Curl', 'Konsentrasjonscurl');
            PERFORM public._tmp_seed_bs_ex(v_day_id, v_section_id, 'incline_dumbbell_curl',     2, 0, 3,  NULL, NULL, 12, NULL, 60,  'Incline Dumbbell Curl', 'Skrå hantelcurl');
            PERFORM public._tmp_seed_bs_ex(v_day_id, v_section_id, 'close_grip_bench_press',    3, 1, 4,  NULL, NULL, 10, NULL, 90,  'Close-Grip Bench Press', 'Smalt grep benkpress');
            PERFORM public._tmp_seed_bs_ex(v_day_id, v_section_id, 'overhead_tricep_extension', 4, 0, 3,  10, 12, NULL, NULL, 60,  'Overhead Tricep Extension', 'Triceps strekk over hode');
            PERFORM public._tmp_seed_bs_ex(v_day_id, v_section_id, 'tricep_kickback',           5, 0, 3,  NULL, NULL, 12, NULL, 45,  'Tricep Kickback', 'Triceps kickback');
          WHEN 6 THEN
            PERFORM public._tmp_seed_bs_ex(v_day_id, v_section_id, 'hip_thrust',           0, 0, 3,  NULL, NULL, 12, NULL, 90,  'Hip Thrust', 'Hip thrust');
            PERFORM public._tmp_seed_bs_ex(v_day_id, v_section_id, 'cable_glute_kickback', 1, 0, 3,  NULL, NULL, 12, NULL, 60,  'Cable Glute Kickback', 'Kabel rumpe spark');
            PERFORM public._tmp_seed_bs_ex(v_day_id, v_section_id, 'standing_calf_raises', 2, 0, 3,  NULL, NULL, 15, NULL, 60,  'Standing Calf Raises', 'Stående tåhev');
            PERFORM public._tmp_seed_bs_ex(v_day_id, v_section_id, 'seated_calf_raises',   3, 0, 3,  NULL, NULL, 15, NULL, 60,  'Seated Calf Raises', 'Sittende tåhev');
            PERFORM public._tmp_seed_bs_ex(v_day_id, v_section_id, 'hanging_leg_raises',   4, 0, 3,  12, 15, NULL, NULL, 45,  'Hanging Leg Raises', 'Hengende beinhev');
            PERFORM public._tmp_seed_bs_ex(v_day_id, v_section_id, 'cable_crunch',         5, 0, 3,  NULL, NULL, 15, NULL, 45,  'Cable Crunch', 'Cable crunch');
            PERFORM public._tmp_seed_bs_ex(v_day_id, v_section_id, 'side_plank',           6, 0, 3,  NULL, NULL, NULL, 45, 45,  'Side Plank', 'Sideplanke');
          END CASE;
        END IF;
      END LOOP;
    END LOOP;
  ELSE
    RAISE NOTICE 'Bro Split program already seeded; skipping.';
  END IF;
END $$;

DROP FUNCTION IF EXISTS public._tmp_seed_bs_ex(uuid, uuid, text, int, int, int, int, int, int, int, int, text, text);
