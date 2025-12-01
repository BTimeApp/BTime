import { SmartTimer, TimeMS, TimerEvent, TimerState } from "./timer";
import { TimerRegistry } from "./timer-registry";

/**
 * From gan-web-bluetooth (afedotov)
 */
const GAN_TIMER_NAME_PREFIXES: string[] = ["GAN", "Gan", "gan"];
const GAN_TIMER_SERVICE: BluetoothServiceUUID =
  "0000fff0-0000-1000-8000-00805f9b34fb";
const GAN_TIMER_TIME_CHARACTERISTIC: string =
  "0000fff2-0000-1000-8000-00805f9b34fb";
const GAN_TIMER_STATE_CHARACTERISTIC: string =
  "0000fff5-0000-1000-8000-00805f9b34fb";

// Concrete implementations
class GanTimer extends SmartTimer {
  private timeCharacteristic!: BluetoothRemoteGATTCharacteristic;
  private stateCharacteristic!: BluetoothRemoteGATTCharacteristic;

  async setup() {
    // GAN-specific connection logic
    const timerService = await this.server.getPrimaryService(GAN_TIMER_SERVICE);
    this.timeCharacteristic = await timerService.getCharacteristic(
      GAN_TIMER_TIME_CHARACTERISTIC
    );
    this.stateCharacteristic = await timerService.getCharacteristic(
      GAN_TIMER_STATE_CHARACTERISTIC
    );

    // before setting up event handlers, read initial values
    const initTime = GanTimer.timeFromData(
      await this.timeCharacteristic.readValue(),
      0
    );
    // const initState = GanTimer.stateFromData(
    //   await this.stateCharacteristic.readValue()
    // );
    this.time = initTime;
    // this.state = initState;

    console.debug(`Values read: ${this.time, this.state}`);

    await this.stateCharacteristic.startNotifications();
    this.stateCharacteristic.addEventListener(
      "characteristicvaluechanged",
      this.handleStateValueChanged.bind(this));
  }

  handleStateValueChanged(event: Event) {
    const view: DataView = (event.target as BluetoothRemoteGATTCharacteristic)
      .value!;
    this.updateStateEvent(GanTimer.buildTimerEvent(view));
  }

  async onDisconnect() {
    this.stateCharacteristic.removeEventListener(
      "characteristicvaluechanged",
      this.handleStateValueChanged.bind(this));
    await this.stateCharacteristic.stopNotifications().catch(() => {});
  }

  /**
   * TODO: define a method to get all the recorded times from the timer and return it, and figure out a way to expose this outside the library
   */

  /**
   * Construct a time in ms from raw data
   */
  static timeFromData(data: DataView, offset: number): TimeMS {
    const min = data.getUint8(offset);
    const sec = data.getUint8(offset + 1);
    const ms = data.getUint16(offset + 2, true);
    return 60000 * min + 1000 * sec + ms;
  }

  static stateFromData(data: DataView): TimerState {
    return data.getUint8(3);
  }

  /**
   * Construct timer event object from raw data
   */
  static buildTimerEvent(data: DataView): TimerEvent {
    const evt: TimerEvent = {
      state: GanTimer.stateFromData(data),
    };
    if (evt.state == TimerState.STOPPED) {
      //TODO set up the recordedTime
      evt.recordedTime = GanTimer.timeFromData(data, 4);
    }
    return evt;
  }
}

TimerRegistry.register({
  namePrefixes: GAN_TIMER_NAME_PREFIXES,
  primaryServices: [GAN_TIMER_SERVICE],
  factory: (device: BluetoothDevice) => new GanTimer(device),
});
