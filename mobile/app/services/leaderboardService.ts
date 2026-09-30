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
  /** 0 when the caller has no reward row yet. */
  rank: number;
  totalPoints: number;
  displayName: string | null;
  avatarUrl: string | null;
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
  display_name: string | null;
  avatar_url: string | null;
}

/** The RPC never returns more than this many rows. */
export const LEADERBOARD_SIZE = 10;

export async function fetchLeaderboardTop(): Promise<LeaderboardEntry[]> {
  const { data, error } = await supabase.rpc("get_leaderboard_page", {
    p_limit: LEADERBOARD_SIZE,
    p_offset: 0,
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
    displayName: row?.display_name ?? null,
    avatarUrl: row?.avatar_url ?? null,
  };
}
