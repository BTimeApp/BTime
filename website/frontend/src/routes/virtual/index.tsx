import type { KPattern, KPuzzle } from "cubing/kpuzzle";

import { Header, HeaderTitle } from "@/components/common/header";
import PageWrapper from "@/components/common/page-wrapper";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { KeyboardListenerKey } from "@/components/virtual/keyboard-key";
import { useIsMobile } from "@/hooks/use-mobile";
import { cn } from "@/lib/utils";
import { useAnimationQueue, VirtualCube } from "@btime/virtual-cubing-react";
import { createFileRoute } from "@tanstack/react-router";
import { Move } from "cubing/alg";
import { cube3x3x3 } from "cubing/puzzles";
import { randomScrambleForEvent } from "cubing/scramble";
import { use, useCallback, useEffect, useMemo, useRef, useState } from "react";

export const Route = createFileRoute("/virtual/")({
  component: VirtualPage,
});

type Keybind = {
  keyCode: string;
  keyBind: string;
};
/**
 * Hardcoded keybinds for virtual cube control.
 * TODO: set up customizable keybinds and store as user preference.
 *
 */
const KEY_TO_MOVE_MAP: Map<string, Keybind> = new Map([
  ["1", { keyCode: "Digit1", keyBind: "S'" }],
  ["2", { keyCode: "Digit2", keyBind: "E" }],
  ["3", { keyCode: "Digit3", keyBind: "" }],
  ["4", { keyCode: "Digit4", keyBind: "" }],
  ["5", { keyCode: "Digit5", keyBind: "M" }],
  ["6", { keyCode: "Digit6", keyBind: "M" }],
  ["7", { keyCode: "Digit7", keyBind: "" }],
  ["8", { keyCode: "Digit8", keyBind: "" }],
  ["9", { keyCode: "Digit9", keyBind: "E'" }],
  ["0", { keyCode: "Digit0", keyBind: "S" }],

  ["Q", { keyCode: "KeyQ", keyBind: "z'" }],
  ["W", { keyCode: "KeyW", keyBind: "B" }],
  ["E", { keyCode: "KeyE", keyBind: "L'" }],
  ["R", { keyCode: "KeyR", keyBind: "Lw'" }],
  ["T", { keyCode: "KeyT", keyBind: "x" }],
  ["Y", { keyCode: "KeyY", keyBind: "x" }],
  ["U", { keyCode: "KeyU", keyBind: "Rw" }],
  ["I", { keyCode: "KeyI", keyBind: "R" }],
  ["O", { keyCode: "KeyO", keyBind: "B'" }],
  ["P", { keyCode: "KeyP", keyBind: "z" }],

  ["A", { keyCode: "KeyA", keyBind: "y'" }],
  ["S", { keyCode: "KeyS", keyBind: "D" }],
  ["D", { keyCode: "KeyD", keyBind: "L" }],
  ["F", { keyCode: "KeyF", keyBind: "U'" }],
  ["G", { keyCode: "KeyG", keyBind: "F'" }],
  ["H", { keyCode: "KeyH", keyBind: "F" }],
  ["J", { keyCode: "KeyJ", keyBind: "U" }],
  ["K", { keyCode: "KeyK", keyBind: "R'" }],
  ["L", { keyCode: "KeyL", keyBind: "D'" }],
  [";", { keyCode: "Semicolon", keyBind: "y" }],

  ["Z", { keyCode: "KeyZ", keyBind: "Dw" }],
  ["X", { keyCode: "KeyX", keyBind: "M'" }],
  ["C", { keyCode: "KeyC", keyBind: "Uw'" }],
  ["V", { keyCode: "KeyV", keyBind: "Lw" }],
  ["B", { keyCode: "KeyB", keyBind: "x'" }],
  ["N", { keyCode: "KeyN", keyBind: "x'" }],
  ["M", { keyCode: "KeyM", keyBind: "Rw'" }],
  [",", { keyCode: "Comma", keyBind: "Uw" }],
  [".", { keyCode: "Period", keyBind: "M'" }],
  ["/", { keyCode: "Slash", keyBind: "Dw'" }],
]);

// cache the kpuzzle on browser like is done in virtual-cubing-react
let kpuzzlePromise: Promise<KPuzzle>;
export function get3x3x3(): Promise<KPuzzle> {
  if (!kpuzzlePromise) {
    kpuzzlePromise = cube3x3x3.kpuzzle();
  }
  return kpuzzlePromise;
}

function VirtualPage() {
  const [setupAlg, setSetupAlg] = useState<string>("");
  const [alg, setAlg] = useState<string>("");

  const {
    currentMove,
    animationQueue,
    addToAnimationQueue,
    processAnimationQueue,
    handleAnimationComplete,
  } = useAnimationQueue();

  useEffect(() => {
    processAnimationQueue();
  }, [animationQueue, currentMove, processAnimationQueue]);

  const handleKeyboardBoundMove = useCallback(
    (move: string) => {
      if (
        algInputRef.current === document.activeElement ||
        setupAlgInputRef.current === document.activeElement
      ) {
        // do not process moves when either input is focused
        return;
      }

      addToAnimationQueue(new Move(move));
      // setAlg((alg) => alg + " " + move);
    },
    [addToAnimationQueue]
  );

  const onFinishAnimating = useCallback(() => {
    setAlg((alg) => alg + " " + currentMove);
    handleAnimationComplete();
  }, [currentMove, handleAnimationComplete]);

  const generateScramble = useCallback(async () => {
    const scrambleAlg = await randomScrambleForEvent("333");
    return scrambleAlg.toString();
  }, []);

  const setupAlgInputRef = useRef<HTMLInputElement>(null);
  const algInputRef = useRef<HTMLInputElement>(null);

  const [inErrorState, setInErrorState] = useState<boolean>(false);

  const kpuzzle: KPuzzle = use<KPuzzle>(get3x3x3());

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

  const isMobile = useIsMobile();

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
                }}
              >
                Reset
              </Button>
              <Button
                variant="primary"
                className="text-md"
                onClick={async () => {
                  setSetupAlg(await generateScramble());
                }}
              >
                Scramble
              </Button>
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

            <div className="flex flex-col gap-1 h-full w-full">
              {/* TODO: add a little info icon with a tooltip linking to cubing.js KPattern API */}
              <h2 className="text-2xl text-bold">Cube State Representation</h2>
              <div
                className={cn(
                  "border border-3 font-mono overflow-y-auto",
                  inErrorState ? "bg-error/30 border-error" : ""
                )}
              >
                <pre>
                  {JSON.stringify(
                    kpattern.toJSON(),
                    (_key, value) => {
                      if (Array.isArray(value)) {
                        return JSON.stringify(value);
                      }
                      return value;
                    },
                    2
                  )}
                </pre>
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
      const mappedMove = KEY_TO_MOVE_MAP.get(keyName)?.keyBind;
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
          {[...KEY_TO_MOVE_MAP.keys()].map((key) => (
            <KeyboardListenerKey
              key={key}
              keyName={KEY_TO_MOVE_MAP.get(key)?.keyCode ?? ""}
              primaryText={key}
              secondaryText={KEY_TO_MOVE_MAP.get(key)?.keyBind ?? ""}
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
