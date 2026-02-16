import type { Move } from "cubing/alg";
import type { KPattern } from "cubing/kpuzzle";

import {
  useCallback,
  useEffect,
  useEffectEvent,
  useRef,
  useState,
} from "react";

export function useCubeStateManager(
  initialState: KPattern,
  initialAlg: string = ""
) {
  const [alg, setAlg] = useState<string>(initialAlg);
  const [pattern, setPattern] = useState<KPattern>(() =>
    initialState.applyAlg(initialAlg)
  );

  const [solved, setSolved] = useState<boolean>(
    pattern.experimentalIsSolved({
      ignoreCenterOrientation: true,
      ignorePuzzleOrientation: true,
    })
  );

  const lastInitialStateRef = useRef<KPattern>(initialState);
  const lastInitialAlgRef = useRef<string>(initialAlg);

  const refreshParamsEvent = useEffectEvent(() => {
    setAlg(initialAlg);
    const newPattern = initialState.applyAlg(initialAlg);
    setPattern(newPattern);
    setSolved(
      newPattern.experimentalIsSolved({
        ignoreCenterOrientation: true,
        ignorePuzzleOrientation: true,
      })
    );
  });

  useEffect(() => {
    if (
      !lastInitialStateRef.current.isIdentical(initialState) ||
      lastInitialAlgRef.current !== initialAlg
    ) {
      lastInitialStateRef.current = initialState;
      lastInitialAlgRef.current = initialAlg;
      refreshParamsEvent();
    }
  }, [initialState, initialAlg]);

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
        const base = initialState;
        const newPattern = base.applyAlg(newAlg);
        setPattern(newPattern);
        checkSolved(newPattern);
      } catch {
        console.warn("something went wrong applying new alg");
      }
    },
    [checkSolved, initialState]
  );

  const resetCube = useCallback(() => {
    setAlg("");
    setPattern(initialState);
    setSolved(true);
  }, [initialState]);

  return {
    alg,
    kpattern: pattern,
    isSolved: solved,
    applyMove,
    setAlg: updateAlg,
    resetCube,
  };
}
