import { supabase } from "@/app/utils/auth";

export type GoalData = {
  user_id: string;
  gender: string | null;
  birth_year: number | null;
  level: string | null;
  goal: string | null;
  focus: string | null;
  advanced_focus: string[];
  friction: string | null;
  weight: number;
  weight_unit: "kg" | "lb";
  height: number;
  height_unit: "cm" | "ft";
};

export async function insertGoal(goalData: GoalData) {
  const { data, error } = await supabase
    .from("goals")
    .upsert(goalData, { onConflict: "user_id" });

  if (error) {
    console.error("Error inserting goal:", error);
    return { error };
  }
  return { data };
}

export async function fetchUserGoalData(userId: string) {
  const { data, error } = await supabase
    .from("goals")
    .select("*")
    .eq("user_id", userId)
    .order("created_at", { ascending: false })
    .limit(1)
    .single();

  if (error) {
    if (error.code === "PGRST116") {
      return { data: null, error: null };
    }
    console.error("Error fetching goal data:", error);
    return { data: null, error };
  }

  return { data, error: null };
}

export async function updateUserGoalData(
  userId: string,
  updates: Partial<Omit<GoalData, "user_id">>,
) {
  const filteredUpdates = Object.fromEntries(
    Object.entries(updates).filter(([, value]) => value !== undefined),
  );

  if (Object.keys(filteredUpdates).length === 0) {
    return { data: null, error: null };
  }

  const { data, error } = await supabase
    .from("goals")
    .update(filteredUpdates)
    .eq("user_id", userId)
    .select();

  if (error) {
    console.error("Error updating goal data:", error);
    return { data: null, error };
  }

  return { data: Array.isArray(data) ? data[0] : data, error: null };
}
