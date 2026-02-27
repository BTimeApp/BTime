import type { CubieType } from "../primitives";
import type { AxisAngle } from "../types/angle";
import type { Alg, Move } from "cubing/alg";
import type { KPattern, KPatternData, KPuzzle } from "cubing/kpuzzle";
import type { RefObject } from "react";
import type { Group } from "three";

import { useFrame } from "@react-three/fiber";
import { use, useCallback, useEffect, useMemo, useRef } from "react";
import { Quaternion } from "three";
import { clamp } from "three/src/math/MathUtils.js";

const DEFAULT_ORIENTATION = new Quaternion();

function getCubieKey(orbitName: string, id: number) {
  return orbitName + "-" + id.toString();
}

export type VirtualCubeImplementationProps = {
  /**
   * The initial state (KPattern) that this cube will be in. "Applied" before setupAlg
   */
  initialState?: KPattern;
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
  animationProgressRef?: RefObject<number>;
};
/**
 * A generic type that dictates the API for a new cubie type.
 * Each cubie (piece) according to KPatternData is composed of position and orientation (and optionally, orientationMod).
 * A properly defined CubieType establishes the mapping between those numbers and:
 *  1) the transformation of the cubie relative to the cube's coordinate system
 *  2) the coloring of the cubie (each position defines a coloring)
 *
 *
 */
export type VirtualCubeImplementation = ({
  setupAlg,
  alg,
  orientation,
  animationMove,
  animationProgressRef,
}: VirtualCubeImplementationProps) => React.ReactNode;

export function generateVirtualCubeImplementation(
  /**
   * We would prefer to just pass in the kpuzzle definition normally, but cubing.js's KPuzzle types are loaded async (https://js.cubing.net/cubing/api/interfaces/puzzles.PuzzleLoader.html).
   * Since this library exports as CJS, we can't have a top-level await. The only workable solution is to accept an async function...
   */
  kPuzzleLoader: () => Promise<KPuzzle>,
  /**
   * A mapping of orbit names defined on the puzzle defn to CubieType components.
   */
  orbitCubieMapping: Record<string, CubieType>,
  /**
   * A mapping of move names (move family names specifically) to axis-angle rotations done for the "unit" move (e.g. R rotates a 3x3 face 90 degrees)
   */
  moveAnimationRotation: Record<string, AxisAngle>
): VirtualCubeImplementation {
  return function VirtualCubeImplementation({
    initialState,
    setupAlg = "",
    alg = "",
    orientation = DEFAULT_ORIENTATION,
    animationMove = undefined,
    animationProgressRef,
  }: VirtualCubeImplementationProps) {
    // const kpuzzle: KPuzzle = use<KPuzzle>(kPuzzleLoader());
    const kpuzzlePromise = useMemo(() => kPuzzleLoader(), []);
    const kpuzzle = use<KPuzzle>(kpuzzlePromise);

    const kpattern: KPattern = useMemo(
      () => initialState ?? kpuzzle.defaultPattern(),
      [initialState, kpuzzle]
    );

    /**
     * applyAlg does not apply any validation to string parameters.
     * We rely on parent components to handle either validation, or error handling.
     */
    // const setupKPattern = kpattern.applyAlg(setupAlg);
    // const updatedKPattern = setupKPattern.applyAlg(alg);
    const updatedKPattern = useMemo(() => {
      const setup = kpattern.applyAlg(setupAlg);
      return setup.applyAlg(alg);
    }, [kpattern, setupAlg, alg]);
    // const kPatternData: KPatternData = updatedKPattern.patternData;
    const kPatternData: KPatternData = useMemo(() => {
      return updatedKPattern.patternData;
    }, [updatedKPattern]);

    const mainGroupRef = useRef<Group>(null);
    const animationGroupRef = useRef<Group>(null);
    const cubieRefs = useRef<Map<string, Group>>(new Map<string, Group>());

    const prevAnimationProgressRef = useRef<number | null>(null);

    /**
     * TODO - derivedMoves will not always work. cubing.js's 2x2 definition, for example, has a derivedMoves section with moves like B: [x': U].
     * Our original assumption that derivedMoves provides a simple alias is wrong. At some point, we need to provide a lookup helper.
     * We will get by by defining our own 2x2 KPuzzleDefinition for now.
     */
    const moveFamily = animationMove
      ? kpuzzle.definition.derivedMoves?.[animationMove.quantum.family] ??
        animationMove.quantum.family
      : undefined;

    const moveTransformDefinition = moveFamily
      ? kpuzzle.definition.moves[moveFamily]
      : undefined;

    const finalAxisAngle: AxisAngle | undefined = useMemo(() => {
      if (animationMove && moveFamily) {
        return {
          ...moveAnimationRotation[moveFamily],
          angle:
            (moveAnimationRotation[moveFamily]?.angle ?? 0) *
            animationMove?.amount,
        };
      } else {
        return undefined;
      }
    }, [animationMove, moveFamily]);

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
      if (
        !animationMove ||
        animationProgressRef == null ||
        animationGroupRef.current == null
      )
        return;
      // make sure refs exist
      const mainGroup = mainGroupRef.current;
      const animationGroup = animationGroupRef.current;
      if (!mainGroup || !animationGroup) return;

      if (prevAnimationProgressRef.current === animationProgressRef.current)
        return;
      prevAnimationProgressRef.current = animationProgressRef.current;

      // Apply rotation to animation group
      const currentAngle =
        (finalAxisAngle?.angle ?? 0) *
        clamp(animationProgressRef.current, 0, 1);
      animationGroup.quaternion.setFromAxisAngle(
        finalAxisAngle!.axis!, //this is ugly, but have to deal with it for now
        currentAngle
      );
    });

    const setCubieRef = useCallback(
      (key: string) => (group: Group | null) => {
        if (group) {
          cubieRefs.current.set(key, group);
        } else {
          cubieRefs.current.delete(key);
        }
      },
      []
    );

    return (
      <group quaternion={orientation} ref={mainGroupRef}>
        {/* animation group */}
        <group ref={animationGroupRef} />

        {/* Generically render cubies from kPatternData */}
        {Object.entries(kPatternData).map(([orbitName, orbitData]) => {
          const CubieComponent = orbitCubieMapping[orbitName];

          return orbitData.pieces.map((id, position) => {
            // the cubie "id" is not guaranteed to be unique, but still provides useful debug information. For this reason, we use both id and position (guaranteed unique) in the key.
            const cubieKey =
              orbitName + "-" + id.toString() + "-" + position.toString();
            return (
              <CubieComponent
                key={cubieKey}
                position={position}
                orientation={orbitData.orientation[position]}
                id={id}
                ref={setCubieRef(cubieKey)}
              />
            );
          });
        })}
      </group>
    );
  };
}

export const VIRTUAL_CUBE_IMPLEMENTATIONS = new Map<
  string,
  VirtualCubeImplementation
>([]);
