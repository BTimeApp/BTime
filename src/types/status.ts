export const SOLVE_STATUSES = ['IDLE', 'INSPECTING', 'SOLVING', 'SUBMITTING', 'FINISHED'];
export type SolveStatus = (typeof SOLVE_STATUSES)[number];