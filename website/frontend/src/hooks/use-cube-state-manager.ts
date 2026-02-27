import type { Move } from "cubing/alg";
import type { KPattern } from "cubing/kpuzzle";

import {
  useCallback,
  useEffect,
  useEffectEvent,
  useRef,
  useState,
} from "react";

export function checkSolved(pattern: KPattern | undefined) {
  return (
    pattern?.experimentalIsSolved({
      ignoreCenterOrientation: true,
      ignorePuzzleOrientation: true,
    }) ?? false
  );
}

export function useCubeStateManager(
  initialState?: KPattern,
  initialAlg: string = ""
) {
  const [alg, setAlg] = useState<string>(initialAlg);
  const [pattern, setPattern] = useState<KPattern | undefined>(() =>
    initialState?.applyAlg(initialAlg)
  );

  const [solved, setSolved] = useState<boolean>(
    pattern?.experimentalIsSolved({
      ignoreCenterOrientation: true,
      ignorePuzzleOrientation: true,
    }) ?? false
  );

  const lastInitialStateRef = useRef<KPattern>(initialState);
  const lastInitialAlgRef = useRef<string>(initialAlg);

  const refreshParamsEvent = useEffectEvent(() => {
    setAlg(initialAlg);
    const newPattern = initialState?.applyAlg(initialAlg);
    setPattern(newPattern);
    setSolved(checkSolved(newPattern));
  });

  useEffect(() => {
    if (lastInitialAlgRef.current !== initialAlg) {
      lastInitialAlgRef.current = initialAlg;
      refreshParamsEvent();
    }
  }, [initialAlg]);

  useEffect(() => {
    if (
      (lastInitialStateRef.current != null && initialState == null) ||
      (lastInitialStateRef.current == null && initialState != null) ||
      (lastInitialStateRef.current != null &&
        initialState != null &&
        !lastInitialStateRef.current.isIdentical(initialState))
    ) {
      lastInitialStateRef.current = initialState;
      refreshParamsEvent();
    }
  }, [initialState]);

  const applyMove = useCallback((move: Move) => {
    // Update alg string
    setAlg((prev) => {
      return prev + " " + move.toString();
    });

    setPattern((prevPattern) => {
      const newPattern = prevPattern?.applyMove(move);
      const solved = checkSolved(newPattern);
      setSolved(solved);

      return newPattern;
    });
  }, []);

  const updateAlg = useCallback(
    (newAlg: string) => {
      setAlg(newAlg);

      try {
        const base = initialState;
        const newPattern = base?.applyAlg(newAlg);
        setPattern(newPattern);
        setSolved(checkSolved(newPattern));
      } catch {
        console.warn("something went wrong applying new alg");
      }
    },
    [initialState]
  );

  const resetCube = useCallback(() => {
    setAlg("");
    setPattern(initialState);
    setSolved(checkSolved(initialState));

    lastInitialAlgRef.current = "";
    lastInitialStateRef.current = initialState;
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
