export const PENALTIES = ['ok', '+2', 'DNF'];
export type Penalty = (typeof PENALTIES)[number];

export interface IResult {
    time: number,
    penalty: Penalty,
}

export interface ISolve {
    id: number,
    scramble: string,
    results: Record<string, IResult>, //user ID : result
};