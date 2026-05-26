/**
 * Leaderboard reads. Backed by security-definer RPCs because profiles +
 * user_reward_state both have self-only RLS.
 */

import { supabase } from "@/app/utils/auth";

export interface LeaderboardEntry {
  rank: number;
  userId: string;
  displayName: string | null;
  avatarUrl: string | null;
  totalPoints: number;
  currentStreak: number;
}

export interface MyLeaderboardRank {
  rank: number;
  totalPoints: number;
  totalUsers: number;
}

interface LeaderboardRowRaw {
  rank: number;
  user_id: string;
  display_name: string | null;
  avatar_url: string | null;
  total_points: number;
  current_streak_days: number;
}

interface MyRankRowRaw {
  rank: number;
  total_points: number;
  total_users: number;
}

export async function fetchLeaderboardPage(
  limit: number,
  offset: number,
): Promise<LeaderboardEntry[]> {
  const { data, error } = await supabase.rpc("get_leaderboard_page", {
    p_limit: limit,
    p_offset: offset,
  });
  if (error) throw new Error(error.message);
  return ((data ?? []) as LeaderboardRowRaw[]).map((row) => ({
    rank: row.rank,
    userId: row.user_id,
    displayName: row.display_name,
    avatarUrl: row.avatar_url,
    totalPoints: row.total_points,
    currentStreak: row.current_streak_days,
  }));
}

export async function fetchMyLeaderboardRank(): Promise<MyLeaderboardRank> {
  const { data, error } = await supabase.rpc("get_my_leaderboard_rank");
  if (error) throw new Error(error.message);
  const row = (data?.[0] ?? null) as MyRankRowRaw | null;
  return {
    rank: row?.rank ?? 0,
    totalPoints: row?.total_points ?? 0,
    totalUsers: row?.total_users ?? 0,
  };
}
