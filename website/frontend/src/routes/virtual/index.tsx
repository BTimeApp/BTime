import type { KPattern, KPuzzle } from "cubing/kpuzzle";

import { Header, HeaderTitle } from "@/components/common/header";
import PageWrapper from "@/components/common/page-wrapper";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { KeyboardListenerKey } from "@/components/virtual/keyboard-key";
import { useIsMobile } from "@/hooks/use-mobile";
import { useTimer } from "@/hooks/use-timer";
import { get3x3x3 } from "@/lib/get-kpuzzle";
import { cn } from "@/lib/utils";
import { isValidMoveForPuzzle } from "@/lib/valid-move-for-puzzle";
import { DEFAULT_VIRTUAL_KEYBINDS } from "@/lib/virtual-keybinds";
import { Result } from "@btime/lib";
import { useAnimationQueue, VirtualCube } from "@btime/virtual-cubing-react";
import { createFileRoute } from "@tanstack/react-router";
import { Move } from "cubing/alg";
import { randomScrambleForEvent } from "cubing/scramble";
import { use, useCallback, useMemo, useRef, useState } from "react";

export const Route = createFileRoute("/virtual/")({
  component: VirtualPage,
});

const ROTATIONS = new Set<string>(["x", "y", "z"]);

function VirtualPage() {
  /**
   * TODO - support more than just 3x3 :)
   */
  const kpuzzle: KPuzzle = use<KPuzzle>(get3x3x3());

  const [setupAlg, setSetupAlg] = useState<string>("");
  const [alg, setAlg] = useState<string>("");

  const { time, startTimer, stopTimer, isRunning } = useTimer();
  const [latestTime, setLatestTime] = useState<number>(0);
  const solveFirstMoveDoneRef = useRef<boolean>(false);

  const { queue: animationQueue, currentElem: currentMove } =
    useAnimationQueue<Move>();

  const handleKeyboardBoundMove = useCallback(
    (move: string) => {
      if (
        algInputRef.current === document.activeElement ||
        setupAlgInputRef.current === document.activeElement
      ) {
        // do not process moves when either input is focused
        return;
      }
      const timestamp = performance.now();

      const moveObj = new Move(move);

      if (!isValidMoveForPuzzle(moveObj, kpuzzle)) {
        // early return - validates moves before we add them to the animation queue!
        return;
      }

      animationQueue.enqueue(moveObj);
      if (
        !solveFirstMoveDoneRef.current &&
        !ROTATIONS.has(moveObj.quantum.family)
      ) {
        solveFirstMoveDoneRef.current = true;
        startTimer(timestamp);
      }
    },
    [animationQueue, kpuzzle, startTimer]
  );

  const generateScramble = useCallback(async () => {
    const scrambleAlg = await randomScrambleForEvent("333");
    return scrambleAlg.toString();
  }, []);

  const handleScramble = useCallback(async () => {
    setSetupAlg(await generateScramble());
    setAlg(""); //resets the current alg!
    animationQueue.clear();

    solveFirstMoveDoneRef.current = false;
  }, [generateScramble, animationQueue]);

  const setupAlgInputRef = useRef<HTMLInputElement>(null);
  const algInputRef = useRef<HTMLInputElement>(null);

  const [inErrorState, setInErrorState] = useState<boolean>(false);

  const kpattern: KPattern = useMemo(() => {
    const defaultKPattern: KPattern = kpuzzle.defaultPattern();

    try {
      const setupKPattern = defaultKPattern.applyAlg(setupAlg);
      const algKPattern = setupKPattern.applyAlg(alg);
      return algKPattern;
    } catch {
      return defaultKPattern;
    }
  }, [setupAlg, alg, kpuzzle]);

  const isSolved: boolean = useMemo(() => {
    return kpattern.experimentalIsSolved({
      ignoreCenterOrientation: true,
      ignorePuzzleOrientation: true,
    });
  }, [kpattern]);

  const applyMove = useCallback(
    (move: Move) => {
      // Apply the move to your alg state
      setAlg((prev) => prev + " " + move.toString());

      // Check if solved after this move
      const newKPattern = kpattern.applyMove(move);
      const nowSolved = newKPattern.experimentalIsSolved({
        ignoreCenterOrientation: true,
        ignorePuzzleOrientation: true,
      });

      if (isRunning && nowSolved) {
        setLatestTime(stopTimer());
      }
    },
    [kpattern, isRunning, stopTimer]
  );

  const onFinishAnimating = useCallback(() => {
    if (currentMove) {
      applyMove(currentMove);
    }
    animationQueue.completeCurrent();
  }, [applyMove, currentMove, animationQueue]);

  const isMobile = useIsMobile();

  const kpatternJSON = useMemo(() => {
    return JSON.stringify(
      kpattern.toJSON(),
      (_key, value) => {
        if (Array.isArray(value)) {
          return JSON.stringify(value);
        }
        return value;
      },
      2
    );
  }, [kpattern]);

  return (
    <PageWrapper>
      <Header>
        <HeaderTitle title="Virtual Cube" />
      </Header>
      <div className="flex flex-col h-full w-full px-2 py-3">
        {isMobile && (
          <h2 className="text-2xl font-bold">
            WARNING: This page is not meant for smaller screens or mobile
            devices.
          </h2>
        )}
        <div className="grid grid-cols-2 gap-5">
          <div className="flex flex-col gap-1 p-4 items-center">
            <div
              className={cn(
                "h-60 w-full border border-3 rounded-lg",
                inErrorState ? "bg-error/30 border-error" : ""
              )}
            >
              <VirtualCube
                event="3x3x3"
                setupAlg={setupAlg}
                alg={alg}
                onError={() => {
                  setInErrorState(true);
                }}
                onErrorClear={() => {
                  setInErrorState(false);
                }}
                animationMove={currentMove}
                onFinishAnimating={onFinishAnimating}
              />
            </div>
            <div className="flex flex-row gap-2 justify-start w-full">
              <Button
                variant="destructive"
                className="text-md"
                onClick={() => {
                  setAlg("");
                  setSetupAlg("");
                  setLatestTime(0);
                  solveFirstMoveDoneRef.current = false;
                }}
              >
                Reset
              </Button>
              <Button
                variant="primary"
                className="text-md"
                onClick={async () => {
                  await handleScramble();
                }}
              >
                Scramble
              </Button>
            </div>
            <div className="flex flex-row w-full justify-center">
              <div className="flex font-bold text-2xl">
                Time:{" "}
                {isSolved || !isRunning
                  ? Result.timeToString(latestTime)
                  : Result.timeToString(time)}
              </div>
            </div>
          </div>
          <div className="flex flex-col max-h-[50vh] gap-1 p-4 items-center">
            <div className="flex flex-row gap-1 w-full items-center">
              <p className="whitespace-nowrap">Setup Alg</p>
              <Input
                placeholder="Type setup alg here..."
                value={setupAlg}
                onChange={(event) => setSetupAlg(event.target.value)}
                ref={setupAlgInputRef}
              />
            </div>

            <div className="flex flex-row gap-1 w-full items-center">
              <p>Alg</p>
              <Input
                placeholder="Type alg here..."
                value={alg}
                onChange={(event) => setAlg(event.target.value)}
                ref={algInputRef}
              />
            </div>

            <div className="flex flex-row gap-1 w-full items-center">
              <p>Solved: {isSolved.toString().toUpperCase()}</p>
            </div>

            <div className="flex flex-col gap-1 h-full w-full">
              {/* TODO: add a little info icon with a tooltip linking to cubing.js KPattern API */}
              <h2 className="text-2xl text-bold">Cube State Representation</h2>
              <div
                className={cn(
                  "border border-3 font-mono overflow-y-auto",
                  inErrorState ? "bg-error/30 border-error" : ""
                )}
              >
                <pre>{kpatternJSON}</pre>
              </div>
            </div>
          </div>
        </div>
        <div className="flex flex-col p-4 gap-2">
          <KeyboardWithCubeControls onExecuteMove={handleKeyboardBoundMove} />
        </div>
      </div>
    </PageWrapper>
  );
}

function KeyboardWithCubeControls({
  onExecuteMove,
}: {
  onExecuteMove?: (move: string) => void;
}) {
  const executeKeyboundMove = useCallback(
    (keyName: string) => {
      const mappedMove = DEFAULT_VIRTUAL_KEYBINDS.get(keyName)?.keyBind;
      if (!mappedMove) return;

      onExecuteMove?.(mappedMove);
    },
    [onExecuteMove]
  );

  return (
    <>
      <h2 className="text-2xl text-bold">Keyboard</h2>
      <div className="flex flex-row">
        <div className="grid grid-cols-10 grid-rows-4 gap-1">
          {[...DEFAULT_VIRTUAL_KEYBINDS.keys()].map((key) => (
            <KeyboardListenerKey
              key={key}
              keyName={DEFAULT_VIRTUAL_KEYBINDS.get(key)?.keyCode ?? ""}
              primaryText={key}
              secondaryText={DEFAULT_VIRTUAL_KEYBINDS.get(key)?.keyBind ?? ""}
              onKeyDown={() => {
                executeKeyboundMove(key);
              }}
            />
          ))}
        </div>
      </div>
    </>
  );
}
