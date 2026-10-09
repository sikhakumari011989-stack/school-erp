import { useContext } from "react";
import { AppContext } from "./AppContext";

export const useApp = () => {
  const ctx = useContext(AppContext);

  if (!ctx) {
    throw new Error("AppProvider missing");
  }

  return ctx;
};