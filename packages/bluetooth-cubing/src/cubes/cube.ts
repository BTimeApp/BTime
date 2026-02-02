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

  // private _initialStateInitialized: boolean = false;
  // private _initialState: KPattern | undefined;

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

  // get initialStateInitialized(): boolean {
  //   return this._initialStateInitialized;
  // }

  // get initialState(): KPattern | undefined {
  //   return this._initialState;
  // }

  public async init(): Promise<void> {
    await this.setup();

    this.device.addEventListener("gattserverdisconnected", this.disconnect);
  }

  public async sync(): Promise<void> {
    this.moveEvents = [];
    this.orientationEvents = [];

    // this._initialStateInitialized = false;
    // this._initialState = undefined;

    await this.onSync();
    //don't reset quaternion and kpattern - these should be handled in onsync/via normal events
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

  /** Event dispatchers for subclasses to call*/

  protected processMoveEvent(event: MoveEvent) {
    experimentalAppendMove(this.alg, event.move);
    this.moveEvents.push(event);

    this.dispatchEvent(
      new CustomEvent<MoveEvent>(CUBE_MOVE_EVENT, {
        detail: event,
      })
    );
  }

  protected processOrientationEvent(event: OrientationEvent) {
    this.quaternion = event.quaternion;
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
   * Runs implementation-specific synchronization. Expected to update state.
   */
  protected async onSync(): Promise<void> {}

  /**
   * Runs brand/model-specific cleanup.
   */
  protected async onDisconnect(): Promise<void> {}
}
