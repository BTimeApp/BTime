import type { Alg, Move } from "cubing/alg";

import { VirtualCube3x3x3 } from ".";
import { ErrorBoundary } from "../utils/error-boundary";
import { OrbitControls } from "@react-three/drei";
import { Canvas } from "@react-three/fiber";
import { EffectComposer, Vignette } from "@react-three/postprocessing";
import { Suspense, useState } from "react";

export type VirtualCubeProps = {
  setupAlg: Alg | string;
  alg: Alg | string;
  viewerControlsEnabled?: boolean;
  animationMove?: Move;
  onFinishAnimating?: () => void;
  onError?: () => void;
  onErrorClear?: () => void;
};

export function VirtualCube({
  setupAlg = "",
  alg,
  viewerControlsEnabled = true,
  animationMove,
  onFinishAnimating,
  onError,
  onErrorClear,
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
            return <VirtualCube3x3x3 />;
          }}
          onReset={() => {
            setInErrorState(false);
            onErrorClear?.();
          }}
          resetKey={{ alg: alg, setupAlg: setupAlg }}
        >
          <VirtualCube3x3x3
            setupAlg={setupAlg}
            alg={alg}
            animationMove={animationMove}
            onFinishAnimating={onFinishAnimating}
          />
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
