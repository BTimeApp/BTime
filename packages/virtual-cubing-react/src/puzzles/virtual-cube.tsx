import type { Alg, Move } from "cubing/alg";

import { VIRTUAL_CUBE_IMPLEMENTATIONS } from "./virtual-cube-implementation";
import { ErrorBoundary } from "../utils/error-boundary";
import { OrbitControls } from "@react-three/drei";
import { Canvas, useFrame } from "@react-three/fiber";
import { EffectComposer, Vignette } from "@react-three/postprocessing";
import { Suspense, useEffect, useRef, useState } from "react";
import { clamp } from "three/src/math/MathUtils.js";

type VirtualCubeAnimationManagerProps = {
  event?: string;
  setupAlg: Alg | string;
  alg: Alg | string;
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
};

export type VirtualCubeProps = VirtualCubeAnimationManagerProps & {
  viewerControlsEnabled?: boolean;
  onError?: () => void;
  onErrorClear?: () => void;
};

export function VirtualCube({
  //virtual cube only props
  viewerControlsEnabled = true,
  onError,
  onErrorClear,
  ...virtualCubeInternalProps
}: VirtualCubeProps) {
  const [inErrorState, setInErrorState] = useState<boolean>(false);

  return (
    <Canvas
      camera={{
        position: [2, 4, 5],
        fov: 60,
        near: 0.1,
        far: 15,
      }}
      dpr={[1, 2]}
    >
      <Suspense fallback={null}>
        {/* <ambientLight /> */}
        <ErrorBoundary
          fallback={(error: Error) => {
            setInErrorState(true);
            onError?.();

            console.warn(`VirtualCube encountered an error: ${error.message}`);
            return (
              <VirtualCubeAnimationManager
                event={virtualCubeInternalProps.event}
                setupAlg={virtualCubeInternalProps.setupAlg}
                alg={virtualCubeInternalProps.alg}
              />
            );
          }}
          onReset={() => {
            setInErrorState(false);
            onErrorClear?.();
          }}
          resetKey={{
            alg: virtualCubeInternalProps.alg,
            setupAlg: virtualCubeInternalProps.setupAlg,
          }}
        >
          <VirtualCubeAnimationManager {...virtualCubeInternalProps} />
        </ErrorBoundary>

        {viewerControlsEnabled && <OrbitControls />}
        {inErrorState && (
          <EffectComposer>
            <Vignette color={0xff0000} darkness={0.3} />
          </EffectComposer>
        )}
      </Suspense>
    </Canvas>
  );
}

/**
 * Pull out the wrapper of a virtual cube implementation into its own component b/c useFrame has to be within a canvas, not at the same level
 */
function VirtualCubeAnimationManager({
  event = "3x3x3",
  setupAlg = "",
  alg,
  animationMove,
  animationStart = undefined,
  animationDuration = 70, //14 tps seems to be a decent default
  animationEasingFunction = (x) => x,
  onFinishAnimating = undefined,
}: VirtualCubeAnimationManagerProps) {
  const VirtualCubeComponent = VIRTUAL_CUBE_IMPLEMENTATIONS.get(event);

  const [animationProgress, setAnimationProgress] = useState<
    number | undefined
  >(undefined);

  const startTimeRef = useRef<number>(null);
  const animationFinishedRef = useRef<boolean>(false);

  // Set animation start time properly upon prop change
  useEffect(() => {
    if (animationMove) {
      startTimeRef.current =
        animationStart == null ? performance.now() : animationStart;
    } else {
      startTimeRef.current = null;
    }
  }, [animationMove, animationStart]);

  // Reset animation finish flag, animation group's rotation upon new animationMove
  useEffect(() => {
    animationFinishedRef.current = false;
  }, [animationMove]);

  useFrame(() => {
    if (!animationMove || !startTimeRef.current) return;

    // Calculate animation progress
    const elapsed = performance.now() - startTimeRef.current;
    const t = clamp(elapsed / animationDuration, 0, 1);
    const progress = clamp(animationEasingFunction(t), 0, 1);
    setAnimationProgress(progress);

    if (t >= 1 && !animationFinishedRef.current) {
      animationFinishedRef.current = true;
      onFinishAnimating?.();
    }
  });

  if (!VirtualCubeComponent) {
    return null;
  }

  return (
    <VirtualCubeComponent
      setupAlg={setupAlg}
      alg={alg}
      animationMove={animationMove}
      animationProgress={animationProgress}
    />
  );
}
