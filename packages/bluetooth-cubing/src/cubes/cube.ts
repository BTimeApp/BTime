//cube.ts
import type { Move } from "cubing/alg";
import type { KPattern } from "cubing/kpuzzle";

import { Alg, experimentalAppendMove } from "cubing/alg";

export const CUBE_MOVE_EVENT = "CUBE_MOVE_EVENT";
export const CUBE_STATE_EVENT = "CUBE_STATE_EVENT";
export const CUBE_ORIENTATION_EVENT = "CUBE_ORIENTATION_EVENT";
export const CUBE_DISCONNECT_EVENT = "CUBE_DISCONNECT_EVENT";

export type Quaternion = {
  x: number;
  y: number;
  z: number;
  w: number;
};

export type BluetoothEvent = {
  timestamp?: number;
};

export type MoveEvent = BluetoothEvent & {
  move: Move;
};

export type OrientationEvent = BluetoothEvent & {
  quaternion: Quaternion;
};

export type CubeMoveEventListener = (event: MoveEvent) => void;
export type CubeOrientationEventListener = (
  orientation: OrientationEvent
) => void;

export abstract class BluetoothCube extends EventTarget {
  protected device!: BluetoothDevice;
  protected server!: BluetoothRemoteGATTServer;
  protected alg!: Alg;
  protected kPattern!: KPattern;
  protected quaternion!: Quaternion;

  private moveListeners: Map<CubeMoveEventListener, EventListener> = new Map<
    CubeMoveEventListener,
    EventListener
  >();
  private orientationListeners: Map<
    CubeOrientationEventListener,
    EventListener
  > = new Map<CubeOrientationEventListener, EventListener>();

  constructor(device: BluetoothDevice) {
    super();
    this.device = device;
    this.disconnect = this.disconnect.bind(this);
  }

  getName() {
    return this.device?.name ?? "";
  }

  async init(): Promise<void> {
    // we do not call gatt setup before setup here since some cubes need a MAC discovery + encryption setup step.
    await this.setup();

    this.device.addEventListener("gattserverdisconnected", this.disconnect);
  }

  // get current KPattern (cube state)
  public getPattern(): KPattern {
    return this.kPattern;
  }

  public resetAlg() {
    // Resets the internal alg state. We expect the consumer to reset it themselves from the application side.
    this.alg = new Alg();
  }

  /** Public APIs to offer managed subscriptions to events */

  public onMoveEvent(cb: CubeMoveEventListener) {
    const handler = (event: Event) => {
      cb((event as CustomEvent<MoveEvent>).detail);
    };
    this.moveListeners.set(cb, handler);
    this.addEventListener(CUBE_MOVE_EVENT, handler);

    return () => {
      this.removeEventListener(CUBE_MOVE_EVENT, handler);
      this.moveListeners.delete(cb);
    };
  }

  public onOrientationEvent(cb: CubeOrientationEventListener) {
    const handler = (event: Event) => {
      cb((event as CustomEvent<OrientationEvent>).detail);
    };
    this.orientationListeners.set(cb, handler);
    this.addEventListener(CUBE_ORIENTATION_EVENT, handler);

    return () => {
      this.removeEventListener(CUBE_ORIENTATION_EVENT, handler);
      this.orientationListeners.delete(cb);
    };
  }

  /** Event dispatchers for subclasses to safely emit */

  protected processMoveEvent(event: MoveEvent) {
    experimentalAppendMove(this.alg, event.move);

    this.dispatchEvent(
      new CustomEvent(CUBE_MOVE_EVENT, {
        detail: event,
      })
    );
  }

  protected processOrientationEvent(event: MoveEvent) {
    experimentalAppendMove(this.alg, event.move);

    this.dispatchEvent(
      new CustomEvent(CUBE_MOVE_EVENT, {
        detail: event,
      })
    );
  }

  async disconnect() {
    this.device?.removeEventListener("gattserverdisconnected", this.disconnect);

    this.dispatchEvent(new CustomEvent(CUBE_DISCONNECT_EVENT));

    for (const listener of this.moveListeners.values()) {
      this.removeEventListener(CUBE_MOVE_EVENT, listener);
    }

    for (const listener of this.orientationListeners.values()) {
      this.removeEventListener(CUBE_ORIENTATION_EVENT, listener);
    }
    this.moveListeners.clear();
    this.orientationListeners.clear();

    await this.onDisconnect();

    if (this.server.connected) {
      this.server.disconnect();
    }
  }

  /**
   * Runs brand/model-specific logic for handling connection, setting up listeners, etc.
   */
  protected abstract setup(): Promise<void>;

  /**
   * Runs brand/model-specific cleanup.
   */
  protected abstract onDisconnect(): Promise<void>;
}
