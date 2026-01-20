import type { CubieType } from "../../primitives";
import type { AxisAngle } from "../../types/angle";
import type { Alg, Move } from "cubing/alg";
import type { KPattern, KPatternData, KPuzzle } from "cubing/kpuzzle";
import type { Group } from "three";

import { CenterCubie, CornerCubie, EdgeCubie } from "./333-cubie-types";
import { get3x3x3 } from "./333-loader";
import { useFrame } from "@react-three/fiber";
import { use, useEffect, useMemo, useRef } from "react";
import { Quaternion, Vector3 } from "three";
import { clamp } from "three/src/math/MathUtils.js";

const ORBIT_NAME_CUBIE_MAPPING: Record<string, CubieType> = {
  CENTERS: CenterCubie,
  EDGES: EdgeCubie,
  CORNERS: CornerCubie,
};

function getCubieKey(orbitName: string, id: number) {
  return orbitName + "-" + id.toString();
}

/**
 * TODO - this mapping is specific to 3x3, but we need to make a general Move -> Quaternion mapping function
 * once we generalize the VirtualCube into its own component
 *
 *
 */
const moveTransforms3x3: Map<string, AxisAngle> = new Map<string, AxisAngle>([
  ["U", { axis: new Vector3(0, 1, 0), angle: -Math.PI / 2 }],
  ["D", { axis: new Vector3(0, 1, 0), angle: Math.PI / 2 }],
  ["F", { axis: new Vector3(0, 0, 1), angle: -Math.PI / 2 }],
  ["B", { axis: new Vector3(0, 0, 1), angle: Math.PI / 2 }],
  ["R", { axis: new Vector3(1, 0, 0), angle: -Math.PI / 2 }],
  ["L", { axis: new Vector3(1, 0, 0), angle: Math.PI / 2 }],

  ["M", { axis: new Vector3(1, 0, 0), angle: Math.PI / 2 }],
  ["E", { axis: new Vector3(0, 1, 0), angle: Math.PI / 2 }],
  ["S", { axis: new Vector3(0, 0, 1), angle: -Math.PI / 2 }],

  ["u", { axis: new Vector3(0, 1, 0), angle: -Math.PI / 2 }],
  ["d", { axis: new Vector3(0, 1, 0), angle: Math.PI / 2 }],
  ["f", { axis: new Vector3(0, 0, 1), angle: -Math.PI / 2 }],
  ["b", { axis: new Vector3(0, 0, 1), angle: Math.PI / 2 }],
  ["r", { axis: new Vector3(1, 0, 0), angle: -Math.PI / 2 }],
  ["l", { axis: new Vector3(1, 0, 0), angle: Math.PI / 2 }],

  ["x", { axis: new Vector3(1, 0, 0), angle: -Math.PI / 2 }],
  ["y", { axis: new Vector3(0, 1, 0), angle: -Math.PI / 2 }],
  ["z", { axis: new Vector3(0, 1, 0), angle: -Math.PI / 2 }],
]);

/**
 * TODO Move animation start, duration, easing function, and onFinishAnimating up a layer. These
 * should not be the responsibility of the rendered puzzle, but the player!
 */
interface VirtualCubeProps {
  /**
   * An alg to be run as setup before the main algorithm. Default empty
   */
  setupAlg?: Alg | string;
  /**
   * The alg to be executed as the main algorithm. Default empty
   */
  alg?: Alg | string;
  /**
   * The orientation of the cube as a whole. Defaults to identity rotation.
   * TODO: accept non-quaternion representations
   */
  orientation?: Quaternion;

  // Animation-related props. Animation is enabled when animationMove is non-null.

  /**
   * The current move to be animated. Default null, which is also indicator to render static cube.
   */
  animationMove?: Move;

  /**
   * The time to consider the start of animating, in ms. Should be taken with performance.now() in the parent.
   * Defaults to null, but will be internally set to performance.now() if animationMove is non-null.
   */
  animationStart?: number;

  /**
   * The length of time to animate the current move for, in ms. Defaults to 100ms (10tps).
   */
  animationDuration?: number;

  /**
   * The easing function to use for animating the current move. The easing function maps normalized time progress to normalized animation progress.
   * For this component, the only functional requirement of the easing function (although not strictly enforced) is:
   *  - exists everywhere on the domain [0, 1]
   *
   * Highly recommended that the easing function also:
   *  - is continuous on the domain [0, 1]
   *  - exists in the range [0, 1] on domain [0, 1]
   *  - starts at 0 and ends at 1
   *
   * As long as your function meets the requirement, VirtualCube should work, but it might not look great unless it also meets the recommendations.
   *
   * The default easing function is f(t) = t.
   *
   * See:
   *  - https://developer.mozilla.org/en-US/docs/Web/CSS/Reference/Values/easing-function
   *  - https://easings.net/
   */
  animationEasingFunction?: (t: number) => number;

  /**
   * A callback function to run upon the current animated move "finishing" its animation.
   * Recommended to be used to notify the parent component that animation is over and state should be updated.
   */
  onFinishAnimating?: () => void;
}

export const VirtualCube3x3x3 = ({
  setupAlg = "",
  alg = "",
  orientation = new Quaternion(0, 0, 0, 1),
  animationMove = undefined,
  animationStart = undefined,
  animationDuration = 100,
  animationEasingFunction = (x) => x,
  onFinishAnimating = undefined,
}: VirtualCubeProps) => {
  const kpuzzle: KPuzzle = use<KPuzzle>(get3x3x3());
  const kpattern: KPattern = kpuzzle.defaultPattern();

  /**
   * applyAlg does not apply any validation to string parameters.
   * We rely on parent components to handle either validation, or error handling.
   */
  const setupKPattern = kpattern.applyAlg(setupAlg);
  const updatedKPattern = setupKPattern.applyAlg(alg);
  const kPatternData: KPatternData = updatedKPattern.patternData;

  const mainGroupRef = useRef<Group>(null);
  const animationGroupRef = useRef<Group>(null);
  const startTimeRef = useRef<number>(null);
  const cubieRefs = useRef<Map<string, Group>>(new Map<string, Group>());

  const animationFinishedRef = useRef<boolean>(false);

  const moveFamily = animationMove
    ? kpuzzle.definition.derivedMoves?.[animationMove.quantum.family] ??
      animationMove.quantum.family
    : undefined;

  const moveTransformDefinition = moveFamily
    ? kpuzzle.definition.moves[moveFamily]
    : undefined;

  const finalAxisAngle =
    animationMove && moveFamily
      ? {
          ...moveTransforms3x3.get(moveFamily),
          angle:
            (moveTransforms3x3.get(moveFamily)?.angle ?? 0) *
            animationMove.amount,
        }
      : undefined;

  const animationAffectedCubies: Set<string> = useMemo(() => {
    if (moveTransformDefinition == null) {
      return new Set<string>();
    }

    const affectedCubieKeys = new Set<string>();

    for (const [orbitName, orbitDefn] of Object.entries(
      moveTransformDefinition
    )) {
      // permutation - how pieces get shuffled. The indices where permutation[i] != i are affected ids
      orbitDefn.permutation
        .filter((id, posn) => id != posn)
        .forEach((id) => {
          affectedCubieKeys.add(
            getCubieKey(orbitName, kPatternData[orbitName].pieces[id])
          );
        });

      // orientation - pieces at indices where orientationDelta[i] != 0 are affected ids.
      orbitDefn.orientationDelta.forEach((delta, idx) => {
        if (delta != 0) {
          affectedCubieKeys.add(
            getCubieKey(
              orbitName,
              kPatternData[orbitName].pieces[orbitDefn.permutation[idx]]
            )
          );
        }
      });
    }

    return affectedCubieKeys;
  }, [kPatternData, moveTransformDefinition]);

  // Set animation start time properly upon prop change
  useEffect(() => {
    if (animationMove) {
      startTimeRef.current =
        animationStart == null ? performance.now() : animationStart;
    } else {
      startTimeRef.current = null;
    }
  }, [animationMove, animationStart]);

  // Handle conditions for cubies in the correct animation group.
  useEffect(() => {
    if (!animationMove) return;

    const mainGroup = mainGroupRef.current;
    const animationGroup = animationGroupRef.current;
    const cubies = cubieRefs.current;

    // Move cubies to animation group
    animationAffectedCubies.forEach((key) => {
      const group = cubies.get(key);
      if (group) {
        animationGroup?.add(group);
      }
    });

    // Cleanup: return cubies to main group if animation is interrupted
    return () => {
      animationAffectedCubies.forEach((key) => {
        const group = cubies.get(key);
        if (group) {
          mainGroup?.add(group);
        }
      });

      animationGroup?.quaternion.identity();
    };
  }, [animationMove, animationAffectedCubies]);

  // Reset animation finish flag, animation group's rotation upon new animationMove
  useEffect(() => {
    animationGroupRef.current?.quaternion.identity();
    animationFinishedRef.current = false;
  }, [animationMove]);

  /**
   * Main animation loop
   */
  useFrame(() => {
    //TODO move as much of this out of the animation loop as possible (saves compute)

    if (!animationMove || !startTimeRef.current) return;
    // make sure refs exist
    const mainGroup = mainGroupRef.current;
    const animationGroup = animationGroupRef.current;
    if (!mainGroup || !animationGroup) return;

    // Calculate animation progress
    const elapsed = performance.now() - startTimeRef.current;
    const t = clamp(elapsed / animationDuration, 0, 1);
    const progress = clamp(animationEasingFunction(t), 0, 1);

    // Apply rotation to animation group
    const currentAngle = (finalAxisAngle?.angle ?? 0) * progress;
    animationGroup.quaternion.setFromAxisAngle(
      finalAxisAngle!.axis!, //this is ugly, but have to deal with it for now
      currentAngle
    );

    // Check if animation is complete
    if (t >= 1 && !animationFinishedRef.current) {
      animationFinishedRef.current = true;
      onFinishAnimating?.();
    }
  });

  return (
    <group quaternion={orientation} ref={mainGroupRef}>
      {/* animation group */}
      <group ref={animationGroupRef} />

      {/* Generically render cubies from kPatternData */}
      {Object.entries(kPatternData).map(([orbitName, orbitData]) => {
        const CubieComponent = ORBIT_NAME_CUBIE_MAPPING[orbitName];

        return orbitData.pieces.map((id, position) => {
          const cubieKey = orbitName + "-" + id.toString();
          return (
            <CubieComponent
              key={cubieKey}
              position={position}
              orientation={orbitData.orientation[position]}
              id={id}
              ref={(group) => {
                if (group) {
                  cubieRefs.current.set(cubieKey, group);
                } else {
                  cubieRefs.current.delete(cubieKey);
                }
              }}
            />
          );
        });
      })}
    </group>
  );
};
