import type { Alg } from "cubing/alg";
import type {
  KPattern,
  KPatternData,
  KPatternOrbitData,
  KPuzzle,
} from "cubing/kpuzzle";

import { CenterCubie, CornerCubie, EdgeCubie } from "./333-cubie-types";
import { get3x3x3 } from "./333-loader";
import { use } from "react";
import { Quaternion } from "three";

interface VirtualCubeProps {
  setupAlg?: Alg | string;
  alg?: Alg | string;
  orientation?: Quaternion;
}

export const VirtualCube3x3x3 = ({
  setupAlg = "",
  alg = "",
  orientation = new Quaternion(0, 0, 0, 1),
}: VirtualCubeProps) => {
  const kpuzzle: KPuzzle = use<KPuzzle>(get3x3x3());
  const kpattern: KPattern = kpuzzle.defaultPattern();
  const setupKPattern = kpattern.applyAlg(setupAlg);
  const updatedKPattern = setupKPattern.applyAlg(alg);
  const kPatternData: KPatternData = updatedKPattern.patternData;

  const centerOrbitData: KPatternOrbitData = kPatternData["CENTERS"];
  const edgeOrbitData: KPatternOrbitData = kPatternData["EDGES"];
  const cornerOrbitData: KPatternOrbitData = kPatternData["CORNERS"];

  return (
    <group quaternion={orientation}>
      {centerOrbitData.pieces.map((id, position) => (
        <CenterCubie
          key={id}
          position={position}
          id={id}
          orientation={centerOrbitData.orientation[position]}
        />
      ))}
      {edgeOrbitData.pieces.map((id, position) => (
        <EdgeCubie
          key={id}
          position={position}
          id={id}
          orientation={edgeOrbitData.orientation[position]}
        />
      ))}
      {cornerOrbitData.pieces.map((id, position) => (
        <CornerCubie
          key={id}
          position={position}
          id={id}
          orientation={cornerOrbitData.orientation[position]}
        />
      ))}
    </group>
  );
};
