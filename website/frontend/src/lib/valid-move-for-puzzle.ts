import type { Move } from "cubing/alg";
import type { KPuzzle } from "cubing/kpuzzle";

/**
 * helper function to check if a move is valid for a kpuzzle.
 *
 * Unfortunately, there are some (kpuzzle, move) combinations where the move is valid,
 * but it isn't listed in the kpuzzle definition's moves or derivedMoves. For example,
 * 3R, 2Rw are valid on 4x4 and up, but these moves aren't listed in moves or derivedMoves.
 *
 * The choices are either to manually account for these moves (which is too much effort)
 * or to wrap moveToTransformation in a try/catch. For now, we will go with try/catch
 *
 * TODO: find an official "will this puzzle accept this move" API to use.
 */
export function isValidMoveForPuzzle(move: Move, kpuzzle: KPuzzle): boolean {
  const family = move.quantum.family;

  if (
    family in kpuzzle.definition.moves ||
    family in (kpuzzle.definition.derivedMoves ?? {})
  ) {
    return true;
  }

  try {
    kpuzzle.moveToTransformation(move);
    return true;
  } catch {
    return false;
  }
}
