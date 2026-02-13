import type { Move } from "cubing/alg";
import type { KPattern, KPuzzle } from "cubing/kpuzzle";

import { useCallback, useMemo, useState } from "react";

export function useCubeStateManager(kpuzzle: KPuzzle, onSolved?: () => void) {
  const [setupAlg, setSetupAlg] = useState("");
  const [alg, setAlg] = useState("");
  const [pattern, setPattern] = useState<KPattern>(() =>
    kpuzzle.defaultPattern()
  );

  const isSolved = useMemo(() => {
    return pattern.experimentalIsSolved({
      ignoreCenterOrientation: true,
      ignorePuzzleOrientation: true,
    });
  }, [pattern]);

  const applyMove = useCallback(
    (move: Move) => {
      // Update alg string
      setAlg((prev) => prev + " " + move.toString());

      setPattern((prevPattern) => {
        const newPattern = prevPattern.applyMove(move);

        const solved = newPattern.experimentalIsSolved({
          ignoreCenterOrientation: true,
          ignorePuzzleOrientation: true,
        });

        if (solved) {
          onSolved?.();
        }

        return newPattern;
      });
    },
    [onSolved]
  );

  const updateSetupAlg = useCallback(
    (newSetupAlg: string) => {
      setSetupAlg(newSetupAlg);

      try {
        const newPattern = kpuzzle.defaultPattern().applyAlg(newSetupAlg);
        setPattern(newPattern);
      } catch {
        setPattern(kpuzzle.defaultPattern());
      }
    },
    [kpuzzle]
  );

  const updateAlg = useCallback(
    (newAlg: string) => {
      setAlg(newAlg);

      try {
        const base = kpuzzle.defaultPattern();
        const newPattern = base.applyAlg(setupAlg).applyAlg(newAlg);
        setPattern(newPattern);
      } catch {
        setPattern(kpuzzle.defaultPattern());
      }
    },
    [kpuzzle, setupAlg]
  );

  const resetCube = useCallback(() => {
    setSetupAlg("");
    setAlg("");
    setPattern(kpuzzle.defaultPattern());
  }, [kpuzzle]);

  return {
    setupAlg,
    alg,
    kpattern: pattern,
    isSolved,
    applyMove,
    setSetupAlg: updateSetupAlg,
    setAlg: updateAlg,
    resetCube,
  };
}
