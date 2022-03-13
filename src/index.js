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
  switch (STATE.model) {
    case poseDetection.SupportedModels.BlazePose:
      const runtime = "tfjs";
      return poseDetection.createDetector(
        STATE.model, {runtime, modelType: STATE.modelConfig.type, enableSmoothing: true});
      //const runtime = "mediapipe";
      //return poseDetection.createDetector(STATE.model, {
      //  runtime,
      //  modelType: STATE.modelConfig.type,
      //  solutionPath: `https://cdn.jsdelivr.net/npm/@mediapipe/pose@{VERSION}`
      //})
    case poseDetection.SupportedModels.MoveNet:
      const modelType = STATE.modelConfig.type == 'lightning' ?
          poseDetection.movenet.modelType.SINGLEPOSE_LIGHTNING :
          poseDetection.movenet.modelType.SINGLEPOSE_THUNDER;
      // TODO Model smoothing
      return poseDetection.createDetector(STATE.model, {modelType});
  }
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

  timerCallback()

  camera.frameCount = Math.round(camera.video.duration * camera.framerate)
  document.getElementById("range_scroll").max = camera.frameCount - 1
  document.getElementById("range_scroll").style.width = `${videoWidth}px`
}

function timerCallback() {
  camera.redrawCanvas()
  updateUi()
  requestAnimationFrame(timerCallback)
}

function updateUi() {
  frameText.textContent = `Current Frame: ${camera.currentFrame}/${camera.frameCount}`
}

async function runFrame() {
  if (camera.currentFrame >= camera.frameCount-1) {
  //if (video.paused) {
    console.log(camera.poseList)
    // video has finished.
    //camera.mediaRecorder.stop();
    //camera.clearCtx();
    //camera.video.style.visibility = 'visible';

    // Download
    // TODO Need to update this code
    let data = "frame,name,x2d,y2d,x,y,z,score\n"
    for (let i = 0; i < camera.poseList.length; i++) {
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

    document.getElementById("testtext").textContent = JSON.stringify(camera.poseList)
    return;
  }

  // Wait for video to be loaded

  //await new Promise(r => setTimeout(r, 1000/camera.framerate));

  await camera.nextFrame();

  //camera.video.load();
  await new Promise((resolve) => {
    camera.video.onseeked = () => {
      resolve(video);
    };
  });

  //camera.currentFrame += 1
  //camera.loadCurrentFrameData()
  const poses = await detector.estimatePoses(
      camera.video,
      {maxPoses: STATE.modelConfig.maxPoses, flipHorizontal: false});

  // TODO Handle maxposes > 1?
  camera.poseList[camera.currentFrame] = poses[0]

  //rafId = requestAnimationFrame(runFrame);
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

  //camera.video.style.visibility = 'hidden';
  video.pause();
  video.currentTime = 0;
  //video.play();
  //camera.mediaRecorder.start();
  camera.firstFrame();

  //await new Promise((resolve) => {
  //  camera.video.onseeked = () => {
  //    resolve(video);
  //  };
  //});

  await runFrame();
}

async function downloadVideo() {
  console.log(camera.videoData)
  // TODO set visibility of buttons
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
  //const a = document.getElementById('newpose');
  const blob = new Blob([poseData], {type: 'text/csv'});
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  document.body.appendChild(a);
  a.style = 'display: none';
  a.href = url;
  a.download = 'pose.csv';
  a.click();
  window.URL.revokeObjectURL(a.url);
  console.log(camera.poseList);
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
    console.log('test')
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

};

app();
