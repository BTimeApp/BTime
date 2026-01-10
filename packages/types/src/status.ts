export const SOLVE_STATUSES = [
  "IDLE",
  "INSPECTING",
  "SOLVING",
  "SUBMITTING",
  "FINISHED",
] as const;
export type SolveStatus = (typeof SOLVE_STATUSES)[number];
