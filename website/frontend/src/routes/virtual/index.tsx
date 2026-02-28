import type { KeybindMap } from "@/types/keybind";
import type { KPattern, KPuzzle } from "cubing/kpuzzle";

import { Header, HeaderTitle } from "@/components/common/header";
import PageWrapper from "@/components/common/page-wrapper";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { KeyboardListenerKey } from "@/components/virtual/keyboard-key";
import { useIsMobile } from "@/hooks/use-mobile";
import { useTimer } from "@/hooks/use-timer";
import { EVENT_KPUZZLE_GETTERS } from "@/lib/get-kpuzzle";
import { cn } from "@/lib/utils";
import { isValidMoveForPuzzle } from "@/lib/valid-move-for-puzzle";
import { DEFAULT_VIRTUAL_KEYBINDS } from "@/lib/virtual-keybinds";
import { Result } from "@btime/lib";
import { ROOM_EVENTS_INFO, type RoomEvent } from "@btime/types";
import { useAnimationQueue, VirtualCube } from "@btime/virtual-cubing-react";
import { createFileRoute } from "@tanstack/react-router";
import { Move } from "cubing/alg";
import { randomScrambleForEvent } from "cubing/scramble";
import {
  use,
  useCallback,
  useDeferredValue,
  useMemo,
  useRef,
  useState,
  Suspense,
} from "react";

export const Route = createFileRoute("/virtual/")({
  component: VirtualPage,
});

const ROTATIONS = new Set<string>(["x", "y", "z"]);

const VALID_EVENTS: RoomEvent[] = [
  ...Object.keys(EVENT_KPUZZLE_GETTERS).map((x) => x as RoomEvent),
];

function VirtualPage() {
  const [event, setEvent] = useState<RoomEvent>("333");

  const deferredEvent = useDeferredValue(event);
  const isStale = event !== deferredEvent;

  return (
    <PageWrapper>
      <Header>
        <HeaderTitle title="Virtual Cube" />
      </Header>
      {/* The event selector lives outside Suspense so it always responds */}
      <div className="px-2 pt-3">
        {/* <EventSelector event={event} onEventChange={setEvent} /> */}
      </div>
      <Suspense fallback={<div className="p-4">Loading puzzle…</div>}>
        <VirtualPageInner
          event={deferredEvent}
          isStale={isStale}
          onEventChange={setEvent}
        />
      </Suspense>
    </PageWrapper>
  );
}

function VirtualPageInner({
  event,
  isStale,
  onEventChange,
}: {
  event: RoomEvent;
  isStale: boolean;
  onEventChange: (e: RoomEvent) => void;
}) {
  const kpuzzlePromise = useMemo(
    () => EVENT_KPUZZLE_GETTERS[event]!(),
    [event]
  );
  const kpuzzle: KPuzzle = use<KPuzzle>(kpuzzlePromise);

  const [setupAlg, setSetupAlg] = useState<string>("");
  const [alg, setAlg] = useState<string>("");

  const { time, startTimer, stopTimer, isRunning } = useTimer();
  const [latestTime, setLatestTime] = useState<number>(0);
  const solveFirstMoveDoneRef = useRef<boolean>(false);

  const reset = useCallback(() => {
    setSetupAlg("");
    setAlg("");
    stopTimer();
    setLatestTime(0);
    solveFirstMoveDoneRef.current = false;
  }, [stopTimer, setLatestTime]);

  const eventChangeHandler = useCallback(
    (newEvent: RoomEvent) => {
      if (newEvent === event) return;

      reset();
      onEventChange(newEvent);
    },
    [event, onEventChange, reset]
  );

  const { queue: animationQueue, currentElem: currentMove } =
    useAnimationQueue<Move>();

  const handleKeyboardBoundMove = useCallback(
    (move: string) => {
      if (
        algInputRef.current === document.activeElement ||
        setupAlgInputRef.current === document.activeElement
      ) {
        return;
      }
      const timestamp = performance.now();
      const moveObj = new Move(move);

      /**
       * TODO - derivedMoves for big cubes don't include Rw, so the helper function we currently use doesn't work...
       */
      if (!isValidMoveForPuzzle(moveObj, kpuzzle)) {
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
    setAlg("");
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
      setAlg((prev) => prev + " " + move.toString());
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
    <div
      className={cn(
        "flex flex-col h-full w-full px-2 py-3 transition-opacity duration-200",
        isStale && "opacity-50 pointer-events-none"
      )}
    >
      {isMobile && (
        <h2 className="text-2xl font-bold">
          WARNING: This page is not meant for smaller screens or mobile devices.
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
              event={ROOM_EVENTS_INFO[event].jsName}
              setupAlg={setupAlg}
              alg={alg}
              onError={() => setInErrorState(true)}
              onErrorClear={() => setInErrorState(false)}
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
          <div className="flex flex-col gap-2">
            <KeyboardWithCubeControls
              mapping={DEFAULT_VIRTUAL_KEYBINDS.get(event)!}
              onExecuteMove={handleKeyboardBoundMove}
            />
          </div>
        </div>
        <div className="flex flex-col max-h-[50vh] gap-1 p-4 items-center">
          <div className="flex flex-row gap-1 w-full items-center">
            <p>Event</p>
            <Select
              value={event}
              onValueChange={(v) => eventChangeHandler(v as RoomEvent)}
            >
              <SelectTrigger>
                <SelectValue placeholder="333" />
              </SelectTrigger>
              <SelectContent>
                {VALID_EVENTS.map((e) => (
                  <SelectItem key={e} value={e}>
                    {ROOM_EVENTS_INFO[e].displayName}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div className="flex flex-row gap-1 w-full items-center">
            <p className="whitespace-nowrap">Setup Alg</p>
            <Input
              placeholder="Type setup alg here..."
              value={setupAlg}
              onChange={(e) => setSetupAlg(e.target.value)}
              ref={setupAlgInputRef}
            />
          </div>

          <div className="flex flex-row gap-1 w-full items-center">
            <p>Alg</p>
            <Input
              placeholder="Type alg here..."
              value={alg}
              onChange={(e) => setAlg(e.target.value)}
              ref={algInputRef}
            />
          </div>

          <div className="flex flex-row gap-1 w-full items-center">
            <p>Solved: {isSolved.toString().toUpperCase()}</p>
          </div>

          <div className="flex flex-col gap-1 h-full w-full">
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
    </div>
  );
}

function KeyboardWithCubeControls({
  mapping,
  onExecuteMove,
}: {
  mapping: KeybindMap<string>;
  onExecuteMove?: (move: string) => void;
}) {
  const executeKeyboundMove = useCallback(
    (keyName: string) => {
      const mappedMove = mapping.get(keyName)?.keyBind;
      if (!mappedMove) return;
      onExecuteMove?.(mappedMove);
    },
    [mapping, onExecuteMove]
  );

  return (
    <>
      <h2 className="text-2xl text-bold">Keyboard</h2>
      <div className="flex flex-row">
        <div className="grid grid-cols-10 grid-rows-4 gap-1">
          {[...mapping.keys()].map((key) => (
            <KeyboardListenerKey
              key={key}
              keyName={mapping.get(key)?.keyCode ?? ""}
              primaryText={key}
              secondaryText={mapping.get(key)?.keyBind ?? ""}
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
