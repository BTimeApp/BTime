import type { Move } from "cubing/alg";
import type { KPuzzle } from "cubing/kpuzzle";

export function isValidMoveForPuzzle(move: Move, kpuzzle: KPuzzle): boolean {
  const family = move.quantum.family;
  return (
    family in kpuzzle.definition.moves ||
    family in (kpuzzle.definition.derivedMoves ?? {})
  );
}
