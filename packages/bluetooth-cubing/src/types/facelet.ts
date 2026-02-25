export type EdgeFacelet = [number, number];
export type CornerFacelet = [number, number, number];

export type PieceData = { id: number; orientation: number };

export const EDGE_FACELET_PIECEDATA_MAPPING_333: Map<string, PieceData> =
  new Map<string, PieceData>([
    ["UF", { id: 0, orientation: 0 }],
    ["FU", { id: 0, orientation: 1 }],

    ["UR", { id: 1, orientation: 0 }],
    ["RU", { id: 1, orientation: 1 }],

    ["UB", { id: 2, orientation: 0 }],
    ["BU", { id: 2, orientation: 1 }],

    ["UL", { id: 3, orientation: 0 }],
    ["LU", { id: 3, orientation: 1 }],

    ["DF", { id: 4, orientation: 0 }],
    ["FD", { id: 4, orientation: 1 }],

    ["DR", { id: 5, orientation: 0 }],
    ["RD", { id: 5, orientation: 1 }],

    ["DB", { id: 6, orientation: 0 }],
    ["BD", { id: 6, orientation: 1 }],

    ["DL", { id: 7, orientation: 0 }],
    ["LD", { id: 7, orientation: 1 }],

    ["FR", { id: 8, orientation: 0 }],
    ["RF", { id: 8, orientation: 1 }],

    ["FL", { id: 9, orientation: 0 }],
    ["LF", { id: 9, orientation: 1 }],

    ["BR", { id: 10, orientation: 0 }],
    ["RB", { id: 10, orientation: 1 }],

    ["BL", { id: 11, orientation: 0 }],
    ["LB", { id: 11, orientation: 1 }],
  ]);

export const CORNER_FACELET_PIECEDATA_MAPPING_333: Map<string, PieceData> =
  new Map<string, PieceData>([
    ["URF", { id: 0, orientation: 0 }],
    ["FUR", { id: 0, orientation: 1 }],
    ["RFU", { id: 0, orientation: 2 }],

    ["UBR", { id: 1, orientation: 0 }],
    ["RUB", { id: 1, orientation: 1 }],
    ["BRU", { id: 1, orientation: 2 }],

    ["ULB", { id: 2, orientation: 0 }],
    ["BUL", { id: 2, orientation: 1 }],
    ["LBU", { id: 2, orientation: 2 }],

    ["UFL", { id: 3, orientation: 0 }],
    ["LUF", { id: 3, orientation: 1 }],
    ["FLU", { id: 3, orientation: 2 }],

    ["DFR", { id: 4, orientation: 0 }],
    ["RDF", { id: 4, orientation: 1 }],
    ["FRD", { id: 4, orientation: 2 }],

    ["DLF", { id: 5, orientation: 0 }],
    ["FDL", { id: 5, orientation: 1 }],
    ["LFD", { id: 5, orientation: 2 }],

    ["DBL", { id: 6, orientation: 0 }],
    ["LDB", { id: 6, orientation: 1 }],
    ["BLD", { id: 6, orientation: 2 }],

    ["DRB", { id: 7, orientation: 0 }],
    ["BDR", { id: 7, orientation: 1 }],
    ["RBD", { id: 7, orientation: 2 }],
  ]);
