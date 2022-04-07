/**
 * @license
 * Copyright 2021 Google LLC. All Rights Reserved.
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 * https://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 * =============================================================================
 */

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
