import { SmartTimer, TimerState } from "./timer";

/**
 * From cstimer (cs0x7f)
 */
const QIYI_TIMER_SERVICE: BluetoothServiceUUID =
  "0000fd50-0000-1000-8000-00805f9b34fb";
const QIYI_CHRCT_WRITE = "00000001-0000-1001-8001-00805f9b07d0";
const QIYI_CHRCT_READ = "00000002-0000-1001-8001-00805f9b07d0";

const QIYI_TIMER_STATE_ORDER = [
    TimerState.IDLE,
    TimerState.INSPECTION,
    TimerState.GET_SET,
    TimerState.RUNNING,
    TimerState.FINISHED,
    TimerState.STOPPED,
    TimerState.DISCONNECT
]

class QiyiTimer extends SmartTimer {
  protected setup(): Promise<void> {
    throw new Error("Method not implemented.");
  }
  protected onDisconnect(): Promise<void> {
    throw new Error("Method not implemented.");
  }
}
