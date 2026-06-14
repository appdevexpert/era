// Module-level constant for the global "reset every slice" action.
// Lives in its own file so authSlice and store can both reach it without
// importing each other (cycle would leave authReducer undefined at module
// init time, breaking persistReducer).
export const RESET_ALL = "app/RESET_ALL" as const;
