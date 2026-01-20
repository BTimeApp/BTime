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
   * The animation progress for the current animated move. Must fall in range [0, 1] or get clamped.
   * The layer above the cube component should be responsible for handling animation.
   */
  animationProgress?: number;
}

export const VirtualCube3x3x3 = ({
  setupAlg = "",
  alg = "",
  orientation = new Quaternion(0, 0, 0, 1),
  animationMove = undefined,
  animationProgress = 0,
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
  const cubieRefs = useRef<Map<string, Group>>(new Map<string, Group>());

  const prevAnimationProgressRef = useRef<number | null>(null);

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

  // reset relevant refs when animationMove updates
  useEffect(() => {
    animationGroupRef.current?.quaternion.identity();
    prevAnimationProgressRef.current = null;
  }, [animationMove]);

  /**
   * Main animation loop.
   */
  useFrame(() => {
    if (!animationMove || animationProgress == null) return;
    // make sure refs exist
    const mainGroup = mainGroupRef.current;
    const animationGroup = animationGroupRef.current;
    if (!mainGroup || !animationGroup) return;

    if (prevAnimationProgressRef.current === animationProgress) return;
    prevAnimationProgressRef.current = animationProgress;

    // Apply rotation to animation group
    const currentAngle =
      (finalAxisAngle?.angle ?? 0) * clamp(animationProgress, 0, 1);
    animationGroup.quaternion.setFromAxisAngle(
      finalAxisAngle!.axis!, //this is ugly, but have to deal with it for now
      currentAngle
    );
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
