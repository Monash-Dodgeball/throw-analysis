/*
 * Put all global parameters here for easy modification.
 */

export const MEDIAPIPE = false;

export const STATE = {
  backend: 'tfjs-webgl',
  flags: {},
  modelConfig: {},
  model: poseDetection.SupportedModels.BlazePose,
};

export const BLAZEPOSE_CONFIG = {
  maxPoses: 1,
  type: 'heavy', // in ['heavy', 'full', 'lite']
  //scoreThreshold: 0.65,
  scoreThreshold: 0.3,
};

STATE.modelConfig = {...BLAZEPOSE_CONFIG};

// Params for overlay
export const DEFAULT_LINE_WIDTH = 2;
export const DEFAULT_RADIUS = 4;
