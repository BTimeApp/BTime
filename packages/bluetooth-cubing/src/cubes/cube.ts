import type {
  CubeMoveEventListener,
  CubeOrientationEventListener,
  CubeStateEventListener,
  MoveEvent,
  OrientationEvent,
  Quaternion,
  StateEvent,
} from "../types/cube-types";
import type { KPattern } from "cubing/kpuzzle";

import {
  applyQuaternion,
  IDENTITY_QUATERNION,
  invertQuaternion,
} from "../utils";
import { Alg, experimentalAppendMove } from "cubing/alg";

export const CUBE_MOVE_EVENT = "CUBE_MOVE_EVENT";
export const CUBE_STATE_EVENT = "CUBE_STATE_EVENT";
export const CUBE_ORIENTATION_EVENT = "CUBE_ORIENTATION_EVENT";
export const CUBE_DISCONNECT_EVENT = "CUBE_DISCONNECT_EVENT";

/**
 * An abstract parent class that represents the public API for bluetooth cube connection.
 */
export abstract class BluetoothCube extends EventTarget {
  protected device!: BluetoothDevice;
  protected server!: BluetoothRemoteGATTServer;
  private kpattern!: KPattern;
  /**
   * Orientation information will be stored (and emitted) by this base class with the following reference frame:
   * x right
   * y up
   * z front
   */
  private quaternion!: Quaternion;

  private syncQuaternion: Quaternion = IDENTITY_QUATERNION;
  private moveEvents: MoveEvent[] = []; //sorted by timestamp
  private orientationEvents: OrientationEvent[] = []; //sorted by timestamp

  private moveListeners: Map<CubeMoveEventListener, EventListener> = new Map<
    CubeMoveEventListener,
    EventListener
  >();
  private orientationListeners: Map<
    CubeOrientationEventListener,
    EventListener
  > = new Map<CubeOrientationEventListener, EventListener>();
  private stateListeners: Map<CubeStateEventListener, EventListener> = new Map<
    CubeStateEventListener,
    EventListener
  >();

  private disconnectListeners: Map<(event: Event) => void, EventListener> =
    new Map<(event: Event) => void, EventListener>();

  private syncLock: boolean = false;

  constructor(device: BluetoothDevice) {
    super();
    this.device = device;
    this.disconnect = this.disconnect.bind(this);
  }

  /**
   * Getters for read-only synchronous access to properties.
   * We highly recommend not relying on these and attaching your own event listeners instead */

  get name(): string {
    return this.device?.name ?? "";
  }

  get moveHistory(): MoveEvent[] {
    return this.moveEvents;
  }

  get orientationHistory(): OrientationEvent[] {
    return this.orientationEvents;
  }

  get alg(): Alg {
    const alg = new Alg();
    this.moveHistory.forEach((moveEvent: MoveEvent) => {
      experimentalAppendMove(alg, moveEvent.move);
    });

    return alg;
  }

  get orientation(): Quaternion {
    return this.quaternion;
  }

  get state(): KPattern {
    return this.kpattern;
  }

  public async init(): Promise<void> {
    await this.setup();

    this.device.addEventListener("gattserverdisconnected", this.disconnect);
  }

  /**
   * "Synchronizes" the cube. Meant to be offered as a refresh option to end users.
   *
   * The current implementation will:
   *   1) clear move and orientation event history
   *   2) set up the sync quaternion s.t. the current final adjusted quaternion is the identity (i.e. assume that the user is holding with green front white up)
   *
   * Resetting bluetooth characteristics is delegated to the subclass.
   *
   * Since we have observed bad behavior (browser crash) on calling sync twice in quick succession, we will provide a lock in this class as a precaution.
   * However, it is important that subclasses fully await any bluetooth operations that they perform in onSync() (which is the root cause of such crashes).
   */
  public async sync(): Promise<void> {
    if (this.syncLock) {
      return Promise.reject();
    } else {
      this.syncLock = true;

      try {
        this.moveEvents = [];
        this.orientationEvents = [];

        /**
         * final_quat = sync_quat x btime_quat
         * sync_quat' x final_quat = btime_quat
         *
         * we want to find new_sync_quat s.t.
         * IDENTITY = new_sync_quat x btime_quat
         *
         * IDENTITY = new_sync_quat x (sync_quat' x final_quat)
         * new_sync_quat = final_quat' x sync_quat
         */

        this.syncQuaternion = applyQuaternion(
          invertQuaternion(this.quaternion),
          this.syncQuaternion
        );

        await this.onSync();
        //don't reset quaternion and kpattern - these should be handled in onsync/via normal events
      } finally {
        this.syncLock = false;
      }
    }
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

  public onStateEvent(cb: CubeStateEventListener) {
    const handler = (event: Event) => {
      cb((event as CustomEvent<StateEvent>).detail);
    };
    this.stateListeners.set(cb, handler);
    this.addEventListener(CUBE_STATE_EVENT, handler);

    return () => {
      this.removeEventListener(CUBE_STATE_EVENT, handler);
      this.stateListeners.delete(cb);
    };
  }

  public onDisconnectEvent(cb: (event: Event) => void) {
    const handler = (event: Event) => {
      cb(event);
    };

    this.disconnectListeners.set(cb, handler);
    this.addEventListener(CUBE_DISCONNECT_EVENT, handler);

    return () => {
      this.removeEventListener(CUBE_DISCONNECT_EVENT, handler);
      this.disconnectListeners.delete(cb);
    };
  }

  /** Event dispatchers for subclasses to call*/

  protected processMoveEvent(event: MoveEvent) {
    this.moveEvents.push(event);

    this.dispatchEvent(
      new CustomEvent<MoveEvent>(CUBE_MOVE_EVENT, {
        detail: event,
      })
    );
  }

  /**
   * We expect quaternions passed into this function to represent the cube's rotation
   * relative to the BTime canonical reference frame: (x right, y up, z front).
   */
  protected processOrientationEvent(event: OrientationEvent) {
    // final_quat = sync_quat x quat_btime_frame

    const transformedQuaternion = applyQuaternion(
      this.syncQuaternion,
      event.quaternion
    );

    this.quaternion = transformedQuaternion;
    event.quaternion = transformedQuaternion;
    this.orientationEvents.push(event);

    this.dispatchEvent(
      new CustomEvent<OrientationEvent>(CUBE_ORIENTATION_EVENT, {
        detail: event,
      })
    );
  }

  protected processStateEvent(event: StateEvent) {
    this.kpattern = event.kpattern;

    this.dispatchEvent(
      new CustomEvent<StateEvent>(CUBE_STATE_EVENT, {
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
    for (const listener of this.stateListeners.values()) {
      this.removeEventListener(CUBE_STATE_EVENT, listener);
    }

    for (const listener of this.disconnectListeners.values()) {
      this.removeEventListener(CUBE_DISCONNECT_EVENT, listener);
    }

    this.moveListeners.clear();
    this.orientationListeners.clear();
    this.stateListeners.clear();

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
   * Runs implementation-specific synchronization.
   * This method is expected to:
   *  1) refresh relevant bluetooth characteristics
   *  2) reset internal state
   */
  protected async onSync(): Promise<void> {}

  /**
   * Runs brand/model-specific cleanup.
   */
  protected async onDisconnect(): Promise<void> {}
}
