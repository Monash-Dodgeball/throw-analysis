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

tf.wasm.setWasmPaths(
    `https://cdn.jsdelivr.net/npm/@tensorflow/tfjs-backend-wasm@${
        tf.wasm.version_wasm}/dist/`);

let detector, camera;
let lastPanelUpdate = 0;
let rafId;
const statusElement = document.getElementById('status');
let frameText = document.getElementById('current_frame')

let poseData = "";

async function createDetector() {
  const runtime = "tfjs";
  return poseDetection.createDetector(
    STATE.model, {runtime, modelType: STATE.modelConfig.type, enableSmoothing: true});
  //const runtime = "mediapipe";
  //return poseDetection.createDetector(STATE.model, {
  //  runtime,
  //  modelType: STATE.modelConfig.type,
  //  solutionPath: `https://cdn.jsdelivr.net/npm/@mediapipe/pose@{VERSION}`
  //})
}


async function updateVideo(event) {
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

  const videoWidth = camera.video.videoWidth;
  const videoHeight = camera.video.videoHeight;
  // Must set below two lines, otherwise video element doesn't show.
  camera.video.width = videoWidth;
  camera.video.height = videoHeight;
  camera.canvas.width = videoWidth;
  camera.canvas.height = videoHeight;

  statusElement.innerHTML = 'Video is loaded.';

  camera.redrawCanvas()
  timerCallback()

  document.getElementById("range_scroll").style.width = `${videoWidth}px`
}

// To extract framerate
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
        console.log(result.media.track[1].FrameRate)
        console.log(result.media.track[1].FrameCount)

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


function timerCallback() {
  //camera.redrawCanvas()
  updateUi()
  requestAnimationFrame(timerCallback)
}

function updateUi() {
  frameText.textContent = `Current Frame: ${camera.currentFrame}/${camera.frameCount-1}`
}

async function runFrame() {
  if (camera.currentFrame >= camera.frameCount-1) {
    // video has finished

    // For download
    let data = "frame,name,x2d,y2d,x,y,z,score\n"
    for (let i = 0; i < camera.frameCount; i++) {
      if (!camera.poseList[i]) {
        continue;
      }
      let keypoints = camera.poseList[i].keypoints;
      let keypoints3D = camera.poseList[i].keypoints3D;
      for (let j = 0; j < keypoints.length; j++) {
        let obj = keypoints[j];
        let obj3D = keypoints3D[j];
        let row = [i, obj.name, obj.x, obj.y, obj3D.x,
                   obj3D.y, obj3D.z, obj3D.score].join(",");
        data += row + "\n"
      }
    }

    poseData = data;

    return;
  }

  // Wait for video to be loaded
  const poses = await detector.estimatePoses(
      camera.video,
      {maxPoses: STATE.modelConfig.maxPoses, flipHorizontal: false});

  camera.poseList[camera.currentFrame] = poses[0]

  // Reordering of camera.nextFrame so that poses get drawn for current frame
  camera.redrawCanvas()
  camera.currentFrame += 1
  camera.loadCurrentFrameData()

  /* TODO For some reason this seeems to be required, despite the same
   * code being in camera.loadCurrentFrameData()
   */
  await new Promise((resolve) => {
    camera.video.onseeked = () => {
      resolve(video);
    };
  });

  runFrame()
}

async function run() {
  camera.poseList = {};

  statusElement.innerHTML = 'Warming up model.';

  // Warm up model
  // TODO can/should I do this when detector is created?
  const warmUpTensor =
      tf.fill([camera.video.height, camera.video.width, 3], 0, 'float32');
  await detector.estimatePoses(
      warmUpTensor,
      {maxPoses: STATE.modelConfig.maxPoses, flipHorizontal: false});
  warmUpTensor.dispose();
  statusElement.innerHTML = 'Model is warmed up.';

  //camera.mediaRecorder.start();
  camera.firstFrame();

  await new Promise((resolve) => {
    camera.video.onseeked = () => {
      resolve(video);
    };
  });

  await runFrame();
}

async function downloadVideo() {
  console.log(camera.videoData)
  const blob = new Blob(camera.videoData, {type: 'video/webm'});
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  document.body.appendChild(a);
  a.style = 'display: none';
  a.href = url;
  a.download = 'pose.webm';
  a.click();
  window.URL.revokeObjectURL(url);
}

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

async function app() {
  detector = await createDetector();
  camera = new Context();

  const runButton = document.getElementById('submit');
  runButton.onclick = run;

  const uploadButton = document.getElementById('videofile');
  uploadButton.onchange = updateVideo;

  const downloadVideoButton = document.getElementById('downloadVideo')
  downloadVideoButton.onclick = downloadVideo;

  const downloadPoseButton = document.getElementById('downloadPose')
  downloadPoseButton.onclick = downloadPose;

  document.getElementById('prevFrame').addEventListener('click', e => {
    camera.prevFrame()
  })

  document.getElementById('nextFrame').addEventListener('click', e => {
    camera.nextFrame()
  })

  document.getElementById('range_scroll').addEventListener('input', function (e) {
    let frameId = Number(document.getElementById('range_scroll').value)
    camera.goToFrame(frameId)
  })

  document.getElementById('fieldFrame').addEventListener('input', function (e) {
    let value = Number(document.getElementById('fieldFrame').value)
    camera.goToFrame(value)
  })

  // To extract framerate
  MediaInfo({ format: 'object' }, (mediainfo) => {
    document.getElementById("videofile").addEventListener('change', () => onChangeFile(mediainfo))
  })

};

app();
