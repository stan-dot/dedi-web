export interface Detector {
  resolution: { height: number; width: number };
  pixelSize: number;
}

export interface SerialisedVector2 {
  x?: number | null;
  y?: number | null;
}

export interface CircularDevice {
  centre: SerialisedVector2;
  diameter: number;
}

export interface BeamlineConfig {
  angle: number | null;
  cameraLength: number;
  minWavelength: number;
  maxWavelength: number;
  minCameraLength: number;
  maxCameraLength: number;
}
