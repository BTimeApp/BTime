import { CallbackInput } from "@/components/ui/callback-input";
import { useRoomStore } from "@/context/room-context";

type TypingTimerProps = {
  onFinishTimer: (timerValue: string) => void;
};
export default function TypingTimer({ onFinishTimer }: TypingTimerProps) {
  const localResult = useRoomStore((s) => s.localResult);
  const localSolveStatus = useRoomStore((s) => s.localSolveStatus);

  switch (localSolveStatus) {
    case "IDLE":
    // Make idle (should be illegal) fall back to the solving state.
    // Currently possible to be in IDLE state if joining an already-started room with timertype TYPING in dev mode b/c of react's strict mode (the second render causes the default localSolveStatus to be IDLE)
    // eslint-disable-next-line no-fallthrough
    case "SOLVING":
      return (
        <>
          <div>Press Enter to submit time</div>
          <CallbackInput
            type="text"
            className="text-center text-4xl mx-auto bg-container-1/70 border-none"
            onEnter={onFinishTimer}
          />
        </>
      );
    case "SUBMITTING":
      return <div className="text-4xl">{localResult.toString()}</div>;
    case "FINISHED":
    default:
      return (
        <>
          <div>Waiting for others to finish</div>
          <div className="text-4xl">{localResult.toString()}</div>
        </>
      );
  }
}
