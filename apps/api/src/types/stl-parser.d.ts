declare module 'stl-parser' {
  export interface Vector3 {
    x: number;
    y: number;
    z: number;
  }

  export interface Vertex extends Array<number> {
    0: number;
    1: number;
    2: number;
    length: 3;
  }

  export interface Facet {
    verts: [Vertex, Vertex, Vertex];
    normal: [number, number, number];
  }

  export interface ParsedSTL {
    facets: Facet[];
    positions: number[];
    cells: number[][];
    faceNormals: number[][];
    vertexNormals: number[][];
  }

  export function toObject(buffer: Buffer): ParsedSTL;
}
