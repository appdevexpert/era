import type { RootState } from "@/app/stores/store";

export const selectLatestPRs = (state: RootState) => state.pr.latestPRs;
export const selectWeeklyPRCount = (state: RootState) => state.pr.weeklyCount;
export const selectPRStatus = (state: RootState) => state.pr.status;
