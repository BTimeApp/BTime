import type { Move } from "cubing/alg";
import type { KPattern, KPuzzle } from "cubing/kpuzzle";

import { useCallback, useState } from "react";

export function useCubeStateManager(kpuzzle: KPuzzle, initialAlg: string = "") {
  const [alg, setAlg] = useState<string>(initialAlg);
  const [pattern, setPattern] = useState<KPattern>(() =>
    kpuzzle.defaultPattern().applyAlg(initialAlg)
  );

  const [solved, setSolved] = useState<boolean>(true);

  const checkSolved = useCallback((pattern: KPattern) => {
    const solved = pattern.experimentalIsSolved({
      ignoreCenterOrientation: true,
      ignorePuzzleOrientation: true,
    });
    setSolved(solved);
    return solved;
  }, []);

  const applyMove = useCallback(
    (move: Move) => {
      // Update alg string
      setAlg((prev) => {
        return prev + " " + move.toString();
      });

      setPattern((prevPattern) => {
        const newPattern = prevPattern.applyMove(move);
        const solved = checkSolved(newPattern);
        setSolved(solved);

        return newPattern;
      });
    },
    [checkSolved]
  );

  const updateAlg = useCallback(
    (newAlg: string) => {
      setAlg(newAlg);

      try {
        const base = kpuzzle.defaultPattern();
        const newPattern = base.applyAlg(newAlg);
        setPattern(newPattern);
        checkSolved(newPattern);
      } catch {
        console.warn("something went wrong applying new alg");
      }
    },
    [checkSolved, kpuzzle]
  );

  const resetCube = useCallback(() => {
    setAlg("");
    setPattern(kpuzzle.defaultPattern());
    setSolved(true);
  }, [kpuzzle]);

  return {
    alg,
    kpattern: pattern,
    isSolved: solved,
    applyMove,
    setAlg: updateAlg,
    resetCube,
  };
}
