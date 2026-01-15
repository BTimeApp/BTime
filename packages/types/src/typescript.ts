export type ExtractArgs<T> = T extends { args: infer A } ? A : never;
