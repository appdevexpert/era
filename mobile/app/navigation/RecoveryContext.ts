import { createContext, useContext } from "react";

export const RecoveryContext = createContext<{
  isRecovery: boolean;
  clearRecovery: () => void;
}>({ isRecovery: false, clearRecovery: () => {} });

export const useRecovery = () => useContext(RecoveryContext);
