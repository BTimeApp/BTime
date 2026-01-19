import type { CubieType } from "../../primitives";
import type { Alg, Move } from "cubing/alg";
import type { KPattern, KPatternData, KPuzzle } from "cubing/kpuzzle";
import type { Group } from "three";

import { CenterCubie, CornerCubie, EdgeCubie } from "./333-cubie-types";
import { get3x3x3 } from "./333-loader";
import { use, useEffect, useRef } from "react";
import { Quaternion } from "three";

const ORBIT_NAME_CUBIE_MAPPING: Record<string, CubieType> = {
  CENTERS: CenterCubie,
  EDGES: EdgeCubie,
  CORNERS: CornerCubie,
};

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

  // Set animation start time properly upon prop change
  useEffect(() => {
    if (animationMove) {
      startTimeRef.current =
        animationStart == null ? performance.now() : animationStart;
    } else {
      startTimeRef.current = null;
    }
  }, [animationMove, animationStart]);

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
