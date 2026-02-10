import type { Move } from "cubing/alg";
import type { KPattern, KPuzzle } from "cubing/kpuzzle";

import { useCallback, useMemo, useReducer } from "react";

type Action =
  | { type: "APPLY_MOVE"; move: Move }
  | { type: "SETUP_ALG"; alg: string }
  | { type: "SET_ALG"; alg: string }
  | { type: "RESET" };

type State = {
  setupAlg: string;
  alg: string;
  pattern: KPattern;
};

function reducer(
  kpuzzle: KPuzzle,
  onSolved?: () => void,
  resetOnSolved: boolean = true
) {
  return (state: State, action: Action): State => {
    switch (action.type) {
      case "APPLY_MOVE": {
        const newAlg = state.alg + " " + action.move.toString();

        const newPattern = state.pattern.applyMove(action.move);

        const solved = newPattern.experimentalIsSolved({
          ignoreCenterOrientation: true,
          ignorePuzzleOrientation: true,
        });

        if (solved) {
          onSolved?.();
          if (resetOnSolved) {
            return { setupAlg: "", alg: "", pattern: kpuzzle.defaultPattern() };
          }
        }

        return { ...state, alg: newAlg, pattern: newPattern };
      }

      case "SETUP_ALG": {
        const base = kpuzzle.defaultPattern();
        const newPattern = base.applyAlg(action.alg);
        return { setupAlg: action.alg, alg: "", pattern: newPattern };
      }

      case "SET_ALG": {
        const base = kpuzzle.defaultPattern();
        const newPattern = base.applyAlg(state.setupAlg).applyAlg(action.alg);
        return { ...state, alg: action.alg, pattern: newPattern };
      }

      case "RESET": {
        return {
          setupAlg: "",
          alg: "",
          pattern: kpuzzle.defaultPattern(),
        };
      }
    }
  };
}

export function useCubeStateManager(
  kpuzzle: KPuzzle,
  onSolved?: () => void,
  resetOnSolved: boolean = true
) {
  const [state, dispatch] = useReducer(
    reducer(kpuzzle, onSolved, resetOnSolved),
    { setupAlg: "", alg: "", pattern: kpuzzle.defaultPattern() }
  );

  const kpattern: KPattern = useMemo(() => {
    const base = kpuzzle.defaultPattern();
    try {
      return base.applyAlg(state.setupAlg).applyAlg(state.alg);
    } catch {
      return base;
    }
  }, [kpuzzle, state.setupAlg, state.alg]);

  const isSolved = useMemo(() => {
    return kpattern.experimentalIsSolved({
      ignoreCenterOrientation: true,
      ignorePuzzleOrientation: true,
    });
  }, [kpattern]);

  const applyMove = useCallback(
    (move: Move) => dispatch({ type: "APPLY_MOVE", move }),
    []
  );

  const setSetupAlg = useCallback(
    (alg: string) => dispatch({ type: "SETUP_ALG", alg }),
    []
  );

  const setAlg = useCallback(
    (alg: string) => dispatch({ type: "SET_ALG", alg }),
    []
  );

  const resetCube = useCallback(() => dispatch({ type: "RESET" }), []);

  return {
    // state
    setupAlg: state.setupAlg,
    alg: state.alg,
    kpattern,
    isSolved,

    // actions
    applyMove,
    setSetupAlg,
    setAlg,
    resetCube,
  };
}
