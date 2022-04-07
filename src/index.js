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

import {Context} from './camera.js';
import {STATE} from './params.js';
import * as utils from './util.js';


// For mediapipe backend
tf.wasm.setWasmPaths(
    `https://cdn.jsdelivr.net/npm/@tensorflow/tfjs-backend-wasm@${
        tf.wasm.version_wasm}/dist/`);

let detector, camera;
const statusElement = document.getElementById('status');
const frameText = document.getElementById('current_frame')
let poseData;


/*
 * Create the detector object.
 */
async function createDetector() {
  const runtime = "tfjs";
  return poseDetection.createDetector(
    STATE.model, {runtime, modelType: STATE.modelConfig.type, enableSmoothing: true});
  // Uncomment below for mediapipe backend
  //const runtime = "mediapipe";
  //return poseDetection.createDetector(STATE.model, {
  //  runtime,
  //  modelType: STATE.modelConfig.type,
  //  solutionPath: `https://cdn.jsdelivr.net/npm/@mediapipe/pose@{VERSION}`
  //})
}

/*
 * Auxiliary function for run().
 * Each recursion generates pose for current frame.
 */
async function runFrame() {
  // Generate pose for current frame
  const poses = await detector.estimatePoses(
      camera.video,
      {maxPoses: STATE.modelConfig.maxPoses,
       flipHorizontal: false});

  // Add new pose to list
  camera.poseList[camera.currentFrame] = poses[0]

  // If video has finished
  if (camera.currentFrame >= camera.frameCount - 1) {
    camera.stop()

    // For download
    poseData = utils.poseToCSV(camera.poseList, camera.frameCount);

    return;
  }

  // camera.nextFrame, but reordered so that poses get drawn for current frame
  camera.redrawCanvas()
  camera.currentFrame += 1
  await camera.loadCurrentFrameData()
  frameText.textContent = `Current Frame: ${camera.currentFrame}/${camera.frameCount-1}`

  runFrame()
}


/*
 * Prepare app for detecting poses, then begin processing
 */
async function run() {
  // Clear any previous pose data
  camera.poseList = {};

  statusElement.innerHTML = 'Warming up model.';

  // Warm up model
  // TODO can/should this be done when detector is created?
  const warmUpTensor =
      tf.fill([camera.video.height, camera.video.width, 3], 0, 'float32');
  await detector.estimatePoses(
      warmUpTensor,
      {maxPoses: STATE.modelConfig.maxPoses, flipHorizontal: false});
  warmUpTensor.dispose();

  statusElement.innerHTML = 'Model is warmed up.';

  camera.start();
  camera.firstFrame();

  // Wait for video to load
  await new Promise((resolve) => {
    camera.video.onseeked = () => {
      resolve(video);
    };
  });

  // Begin generation of poses
  await runFrame();
}


/*
 * Downloads video data from camera.
 */
async function downloadVideo() {
  // Similar to downloadPose, but split between
  // here and camera.handleDataAvailable
  let a = document.getElementById("videodata")
  a.click();
}


/*
 * Downloads pose data.
 */
async function downloadPose() {
  const blob = new Blob([poseData], {type: 'text/csv'});
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  document.body.appendChild(a);
  a.style = 'display: none';
  a.href = url;
  a.download = 'pose.csv';
  a.click();
  window.URL.revokeObjectURL(a.url);
}


/*
 * Update/reset app when video file is changed
 */
async function updateVideo(event) {
  // Clear any previous poses
  camera.poseList = {};

  // Clear reference to any previous uploaded video.
  URL.revokeObjectURL(camera.source.src)
  const file = event.target.files[0];
  camera.source.src = URL.createObjectURL(file);

  // Wait for video to be loaded.
  camera.video.load();
  await new Promise((resolve) => {
    camera.video.onloadeddata = () => {
      resolve(video);
    };
  });

  // Update canvas dimensions
  const videoWidth = camera.video.videoWidth;
  const videoHeight = camera.video.videoHeight;
  // Must set below two lines, otherwise video element doesn't show.
  camera.video.width = videoWidth;
  camera.video.height = videoHeight;
  camera.canvas.width = videoWidth;
  camera.canvas.height = videoHeight;

  statusElement.innerHTML = 'Video is loaded.';

  // Draw first frame
  camera.redrawCanvas()

  // Update width of scrubber
  document.getElementById("range_scroll").style.width = `${videoWidth}px`
}


/*
 * Used to extract framerate from new video
 * See https://github.com/buzz/mediainfo.js/blob/master/examples/browser-simple/example.js
 */
const onChangeFile = (mediainfo) => {
  const file = document.getElementById("videofile").files[0]
  if (file) {
    const getSize = () => file.size

    const readChunk = (chunkSize, offset) =>
      new Promise((resolve, reject) => {
        const reader = new FileReader()
        reader.onload = (event) => {
          if (event.target.error) {
            reject(event.target.error)
          }
          resolve(new Uint8Array(event.target.result))
        }
        reader.readAsArrayBuffer(file.slice(offset, offset + chunkSize))
      })

    mediainfo
      .analyzeData(getSize, readChunk)
      .then((result) => {
        // TODO Make sure track[1] is always correct
        camera.framerate = result.media.track[1].FrameRate
        camera.frameCount = result.media.track[1].FrameCount
        document.getElementById("range_scroll").max = camera.frameCount - 1
        // Not rounding, in case framerate is non integer
      })
      .catch((error) => {
        // TODO
      })
  }
}


/*
 * Initializes detector, camera, and event listeners.
 */
async function app() {
  detector = await createDetector();
  camera = new Context();

  document.getElementById('submit').addEventListener('click', run);

  document.getElementById('videofile').addEventListener('change', updateVideo);

  document.getElementById('downloadVideo').addEventListener('click', downloadVideo);

  document.getElementById('downloadPose').addEventListener('click', downloadPose);

  document.getElementById('prevFrame').addEventListener('click', (e) => {
    camera.prevFrame();
    frameText.textContent = `Current Frame: ${camera.currentFrame}/${camera.frameCount-1}`
  });

  document.getElementById('nextFrame').addEventListener('click', (e) => {
    camera.nextFrame();
    frameText.textContent = `Current Frame: ${camera.currentFrame}/${camera.frameCount-1}`
  });

  document.getElementById('range_scroll').addEventListener('input', function (e) {
    let frameId = Number(document.getElementById('range_scroll').value)
    camera.goToFrame(frameId)
    frameText.textContent = `Current Frame: ${camera.currentFrame}/${camera.frameCount-1}`
  })

  document.getElementById('fieldFrame').addEventListener('input', function (e) {
    let value = Number(document.getElementById('fieldFrame').value)
    camera.goToFrame(value)
    frameText.textContent = `Current Frame: ${camera.currentFrame}/${camera.frameCount-1}`
  })

  // To extract framerate
  // https://github.com/buzz/mediainfo.js/blob/master/examples/browser-simple/example.js
  MediaInfo({ format: 'object' }, (mediainfo) => {
    document.getElementById("videofile").addEventListener('change', () => onChangeFile(mediainfo))
  })
};

app();
