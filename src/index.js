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
// TODO select model type based on device
// TODO scrubber

import {Context} from './camera.js';
import {STATE} from './params.js';

let detector, camera;
let lastPanelUpdate = 0;
let rafId;
const statusElement = document.getElementById('status');

let poseList = [];

async function createDetector() {
  console.log(STATE.modelConfig.type)
  switch (STATE.model) {
    case poseDetection.SupportedModels.BlazePose:
      const runtime = "tfjs";
      return poseDetection.createDetector(
            STATE.model, {runtime, modelType: STATE.modelConfig.type});
    case poseDetection.SupportedModels.MoveNet:
      const modelType = STATE.modelConfig.type == 'lightning' ?
          poseDetection.movenet.modelType.SINGLEPOSE_LIGHTNING :
          poseDetection.movenet.modelType.SINGLEPOSE_THUNDER;
      // TODO Model smoothing
      return poseDetection.createDetector(STATE.model, {modelType});
  }
}

async function renderResult() {
  const poses = await detector.estimatePoses(
      camera.video,
      {maxPoses: STATE.modelConfig.maxPoses, flipHorizontal: false});
  console.log(poses)

  poseList.push(poses)

  camera.drawCtx();
  camera.drawResults(poses);
}

async function checkUpdate() {
  requestAnimationFrame(checkUpdate);
};

async function updateVideo(event) {
  // Clear reference to any previous uploaded video.
  URL.revokeObjectURL(camera.video.currentSrc);
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
}

async function runFrame() {
  if (video.paused) {
    // video has finished.
    camera.mediaRecorder.stop();
    camera.clearCtx();
    camera.video.style.visibility = 'visible';
    return;
  }
  await renderResult();
  rafId = requestAnimationFrame(runFrame);
}

async function run() {
  poseList = [];

  statusElement.innerHTML = 'Warming up model.';

  // Warm up model
  const warmUpTensor =
      tf.fill([camera.video.height, camera.video.width, 3], 0, 'float32');
  await detector.estimatePoses(
      warmUpTensor,
      {maxPoses: STATE.modelConfig.maxPoses, flipHorizontal: false});
  warmUpTensor.dispose();
  statusElement.innerHTML = 'Model is warmed up.';

  camera.video.style.visibility = 'hidden';
  video.pause();
  video.currentTime = 0;
  video.play();
  camera.mediaRecorder.start();

  await new Promise((resolve) => {
    camera.video.onseeked = () => {
      resolve(video);
    };
  });

  await runFrame();
}

async function downloadVideo() {
  const a = document.getElementById('newvideo');
  a.click();
  window.URL.revokeObjectURL(a.url);
}

async function downloadPose() {
  console.log('meme')
  // TODO parse output into csv or some other form
  const blob = new Blob(poseList, {type: 'text/plain'});
  //console.log(blob)
  //console.log(poseList)
  const url = URL.createObjectURL(blob);
  const b = document.createElement('b');
  document.body.appendChild(b)
  b.style = 'display: none';
  b.href = url;
  b.download = 'pose.csv';
  b.click();
  window.URL.revokeObjectURL(url);

  //var csvContent = JSON.stringify(poseList[0]);
  //console.log(poseList)
  ////console.log(csvContent);
  //var encodedUri = encodeURI(csvContent);
  //var link = document.createElement("a");
  //link.setAttribute("href", encodedUri);
  //link.setAttribute("download", "my_data.csv");
  //document.body.appendChild(link); // Required for FF

  //link.click(); // This will download the data file named "my_data.csv".

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

  checkUpdate();
};

app();
