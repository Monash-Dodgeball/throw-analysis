/*
 * Initializes and controls any app logic
 */

import {Context} from './camera.js';
import {STATE, MEDIAPIPE} from './params.js';
import * as params from './params.js';
import * as utils from './util.js';
import * as chart from './chart.js';


// For mediapipe backend
if (MEDIAPIPE) {
  tf.wasm.setWasmPaths(
    `https://cdn.jsdelivr.net/npm/@tensorflow/tfjs-backend-wasm@${
      tf.wasm.version_wasm}/dist/`);
}

let detector, camera;
const statusElement = document.getElementById('status');
const frameText = document.getElementById('current_frame')
const scrubber = document.getElementById('range_scroll')
const playButton = document.getElementById('play')
const select = document.getElementById('jointSelect');
let poseData;
let paused = true; // For play button

let playbackSpeed = 1;


/*
 * Create the detector object.
 */
async function createDetector() {
  if (!MEDIAPIPE) {
    const runtime = "tfjs";
    return poseDetection.createDetector(
      STATE.model, {runtime, modelType: STATE.modelConfig.type, enableSmoothing: true});
  } else {
    const runtime = "mediapipe";
    return poseDetection.createDetector(STATE.model, {
      runtime,
      modelType: STATE.modelConfig.type,
      solutionPath: `https://cdn.jsdelivr.net/npm/@mediapipe/pose@{VERSION}`
    })
  }
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
    poseData = utils.poseToJSON(camera.poseList);

    return;
  }

  // camera.nextFrame, but reordered so that poses get drawn for current frame
  camera.redrawCanvas()
  camera.currentFrame += 1
  await camera.loadCurrentFrameData()
  updateUI();

  runFrame();
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


async function updateUI() {
  frameText.textContent = `Current Frame: ${camera.currentFrame}/${camera.frameCount-1}`
  scrubber.value = camera.currentFrame;
  playButton.innerHTML = "Play"
  paused = true;
}


/*
 * Simulates playing the video by advancing frame according to framerate
 * This allows overlay to keep up with video
 */
async function playVideo() {
  // get time
  let startTime = performance.now()

  // TODO Remove wait when loading issue is fixed
  await camera.nextFrame();

  let endTime = performance.now()

  // minus get time
  await new Promise(r => setTimeout(r, 1000/playbackSpeed/camera.framerate - (endTime - startTime)));
  //console.log(endTime-startTime)

  if (camera.currentFrame+1 >= camera.frameCount) {
    paused = true;
    document.getElementById('play').innerHTML = "Play";
  }

  if (paused) {
    return;
  } else {
    updateUI();
    playButton.innerHTML = "Pause"
    paused = false;
    playVideo()
  }
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
  a.download = 'pose.json';
  a.click();
  window.URL.revokeObjectURL(a.url);
}

/*
 * Update/reset app when pose data is changed
 */
async function updatePose(event) {
  // Get data
  const file = event.target.files[0];
  let reader = new FileReader();
  reader.onload = function() {
    let newPose = utils.jsonToPose(reader.result);
    camera.poseList = newPose;
    camera.redrawCanvas();
    chart.drawChart(camera.poseList, camera.frameCount, $('#jointSelect').val())
  }
  reader.readAsText(file);
  // Error handling
  //     TODO Pose coords out of bounds
  //     TODO wrong number of frames
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
  camera.redrawCanvas();

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
        camera.framerate = parseFloat(result.media.track[1].FrameRate)
        camera.frameCount = parseInt(result.media.track[1].FrameCount)
        document.getElementById("range_scroll").max = camera.frameCount - 1
        updateUI();
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

  document.getElementById('poseFile').addEventListener('change', updatePose);

  document.getElementById('prevFrame').addEventListener('click', (e) => {
    camera.prevFrame();
    updateUI();
  });

  document.getElementById('nextFrame').addEventListener('click', (e) => {
    camera.nextFrame();
    updateUI();
  });

  document.getElementById('play').addEventListener('click', async (e) => {
    paused = !paused;
    let button = document.getElementById('play');

    if (button.innerHTML == "Play") {
      button.innerHTML = "Pause"
    } else {
      button.innerHTML = "Play"
    }

    await playVideo();
  });

  document.getElementById('range_scroll').addEventListener('input', function (e) {
    let frameId = Number(document.getElementById('range_scroll').value)
    camera.goToFrame(frameId)
    updateUI();
  })

  document.getElementById('fieldFrame').addEventListener('input', function (e) {
    let value = Number(document.getElementById('fieldFrame').value)
    camera.goToFrame(value)
    updateUI();
  })

  document.getElementById('playbackSpeed').oninput = function() {
    playbackSpeed = this.value;
    document.getElementById("playbackSpeedLabel").innerHTML = "Playback speed: " + this.value;
  }

  // Chart stuff
  for (let i = 0; i <= 32; i++) {
    let opt = document.createElement('option');
    opt.value = utils.kpIdxMap[i];
    opt.innerHTML = utils.kpIdxMap[i];
    select.appendChild(opt);
  }
  select.loadOptions();

  // TODO this event doesn't fire when last option is deselected
  select.addEventListener('change', (e) => {
    chart.drawChart(camera.poseList, camera.frameCount, $('#jointSelect').val())
    camera.redrawCanvas();
  })

  document.getElementById("chartVelocityDim").addEventListener('change', (e) => {
    chart.drawChart(camera.poseList, camera.frameCount, $('#jointSelect').val())
  })

  if ($("#show3DPlot").is(":checked")) {
      $("#renderer").show();
      console.log("test")
    } else {
      $("#renderer").hide();
      console.log("test2")
  }

  $("#show3DPlot").on("change", () => {
    if ($("#show3DPlot").is(":checked")) {
      $("#renderer").show();
      console.log("test")
    } else {
      $("#renderer").hide();
      console.log("test2")
    }
  })

  // To extract framerate
  // https://github.com/buzz/mediainfo.js/blob/master/examples/browser-simple/example.js
  MediaInfo(
  {
    format: 'object',
    locateFile: (path, prefix) => prefix + path, // Make sure WASM file is loaded from CDN location
  },
  (mediainfo) => {
    document.getElementById("videofile").addEventListener('change', () => onChangeFile(mediainfo))
  })
};

app();
