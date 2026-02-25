import type { Move } from "cubing/alg";
import type { KPattern } from "cubing/kpuzzle";

export type Quaternion = {
  x: number;
  y: number;
  z: number;
  w: number;
};

export const IDENTITY_QUATERNION: Quaternion = {
  w: 1,
  x: 0,
  y: 0,
  z: 0,
} as const;

export type TimedEvent = {
  timestamp: number; //ms
  duration?: number; //ms
};

export type MoveEvent = TimedEvent & {
  move: Move;
};

export type OrientationEvent = TimedEvent & {
  quaternion: Quaternion;
};

export type StateEvent = TimedEvent & {
  kpattern: KPattern;
};

export type CubeMoveEventListener = (event: MoveEvent) => void;
export type CubeOrientationEventListener = (event: OrientationEvent) => void;
export type CubeStateEventListener = (event: StateEvent) => void;
