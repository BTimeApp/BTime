import type { Alg } from "cubing/alg";

import { VirtualCube3x3x3 } from "./puzzles";
import { ErrorBoundary } from "./utils/error-boundary";
import { OrbitControls } from "@react-three/drei";
import { Canvas } from "@react-three/fiber";
import { Suspense } from "react";

export function ExampleScene({
  setupAlg = "",
  alg,
  viewerControlsEnabled = true,
  className,
}: {
  setupAlg: Alg | string;
  alg: Alg | string;
  viewerControlsEnabled?: boolean;
  className?: string;
}) {
  return (
    <Canvas
      //   style={{ width: "100%", height: "100%" }}
      camera={{
        position: [2, 4, 5],
        fov: 60,
        near: 0.1,
        far: 15,
      }}
      dpr={[1, 2]}
      className={className}
    >
      <Suspense fallback={null}>
        {/* <ambientLight /> */}
        <ErrorBoundary
          fallback={(error: Error) => {
            console.warn(`VirtualCube encountered an error: ${error.message}`);

            return <VirtualCube3x3x3 />;
          }}
          resetKey={alg}
        >
          <VirtualCube3x3x3 setupAlg={setupAlg} alg={alg} />
        </ErrorBoundary>

        {viewerControlsEnabled && <OrbitControls />}
      </Suspense>
    </Canvas>
  );
}
