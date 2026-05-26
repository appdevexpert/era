import type { RootState } from "@/app/stores/store";

export const selectTotalPoints = (state: RootState) => state.reward.totalPoints;
export const selectCurrentStreak = (state: RootState) => state.reward.currentStreak;
export const selectLongestStreak = (state: RootState) => state.reward.longestStreak;
export const selectLastStreakDate = (state: RootState) => state.reward.lastStreakDate;
export const selectWeekByDate = (state: RootState) => state.reward.weekByDate;
export const selectRecentPointEvents = (state: RootState) => state.reward.recentEvents;
export const selectRewardStatus = (state: RootState) => state.reward.status;
