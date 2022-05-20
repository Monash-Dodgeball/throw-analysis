/*
 * Defines the Context class, used for interfacing with the video.
 * Also used for drawing the overlay on top of the video
 */

import * as params from './params.js';
import * as utils from './util.js';
import * as render from './render.js'

// ???
// These anchor points allow the pose pointcloud to resize according to its
// position in the input.
const ANCHOR_POINTS = [[0, 0, 0], [0, 1, 0], [-1, 0, 0], [-1, -1, 0]];


export class Context {
  constructor() {
    this.video = document.getElementById('video');
    this.canvas = document.getElementById('output');
    this.source = document.getElementById('currentVID');
    this.ctx = this.canvas.getContext('2d');

    this.currentFrame = 0;
    this.frameCount = 40; // TODO
    this.framerate = 15;
    this.poseList = {};

    const stream = this.canvas.captureStream();

    // Hack to get vp9 to work on firefox
    let options;
    if (navigator.userAgent.match(/firefox|fxios/i)) {
      options = {mimeType: 'video/webm; codecs=vp8'};
    } else {
      options = {mimeType: 'video/webm; codecs=vp9'};
    }

    // For converting canvas to video
    this.mediaRecorder = new MediaRecorder(stream, options);
    this.mediaRecorder.ondataavailable = this.handleDataAvailable;

    // TODO Move this elsewhere
    this.render3D = new render.Render3D();
  }

  /* Forces video to seek to current frame */
  async loadCurrentFrameData() {
    // Adding 1ms makes behaviour consistent on firefox and chrome
    this.video.currentTime = this.currentFrame / this.framerate + 0.001

    await new Promise((resolve) => {
      this.video.onseeked = () => {
        resolve(video);
      };
    });
  }

  /* Seek to first frame */
  async firstFrame() {
    this.currentFrame = 0
    await this.loadCurrentFrameData()
    this.redrawCanvas()
  }

  /* Seek to next frame */
  async nextFrame() {
    if (this.currentFrame +1 >= this.frameCount) return
    this.currentFrame += 1
    await this.loadCurrentFrameData()
    this.redrawCanvas()
  }

  /* Seek to previous frame */
  async prevFrame() {
    if (this.currentFrameIndex <= 0) return
    this.currentFrame -= 1
    await this.loadCurrentFrameData()
    this.redrawCanvas()
  }

  /* Jump to frame specified by id */
  async goToFrame(id) {
    this.currentFrame = id
    await this.loadCurrentFrameData()
    this.redrawCanvas()
  }

  /* Draws all necessary data for current frame */
  async redrawCanvas() {
    this.clearCtx();
    this.drawFrame();
    // Draw pose for current frame if it exists
    if (this.poseList[this.currentFrame]) {
      // Draw pose
      this.drawResult(this.poseList[this.currentFrame]);

      // Draw overlay
      this.drawOverlay();

      // TODO remove below when actually doing something with pose infomation
      //document.getElementById("testtext").textContent = JSON.stringify(this.poseList[this.currentFrame]);

      // TODO Move this logic elsewhere
      this.render3D.updatePose(this.poseList[this.currentFrame]);
    }
  }

  /* Draw current frame of video */
  drawFrame() {
    this.ctx.drawImage(
      this.video, 0, 0, this.video.width, this.video.height);
  }

  /* Clear canvas */
  clearCtx() {
    this.ctx.clearRect(0, 0, this.video.width, this.video.height);
  }

  /*
   * Draws overlay details.
   * Currently just a basic test example.
   */
  drawOverlay() {
    let pose = this.poseList[this.currentFrame];
    let id = utils.kpNameMap['right_elbow']
    let elbow = pose.keypoints[id];
    let elbow3D = pose.keypoints3D[id];

    // Draw text
    let string = `Left elbow: x = ${elbow3D.x}, y = ${elbow3D.y}, z = ${elbow3D.x}`;
    this.ctx.fillStyle = 'red';
    this.ctx.fillText(string, 10, 20);

    // Draw circle
    this.ctx.strokeStyle = 'red';
    this.ctx.beginPath();
    this.ctx.arc(elbow.x, elbow.y, 12, 0, 2 * Math.PI);
    this.ctx.stroke();
  }

  /*
   * Captures data from canvas/MediaRecorder and readies data for downloading
   */
  handleDataAvailable(event) {
    if (event.data.size > 0) {
      const recordedChunks = [event.data];
      const blob = new Blob(recordedChunks, {type: 'video/mp4'});
      const url = URL.createObjectURL(blob);

      let a = document.getElementById('videodata');
      if (a) {
        window.URL.revokeObjectURL(a.href);
      } else {
        a = document.createElement('a');
        a.setAttribute("id", "videodata")
        document.body.appendChild(a);
        a.style = 'display: none';
        a.download = 'pose.mp4';
      }

      a.href = url;
    }
  }

  /*
   * Below code is used for drawing poses, basically unmodified from source
   */

  /**
   * Draw the keypoints and skeleton on the video.
   * @param poses A list of poses to render.
   */
  drawResults(poses) {
    for (const pose of poses) {
      this.drawResult(pose);
    }
  }

  /**
   * Draw the keypoints and skeleton on the video.
   * @param pose A pose with keypoints to render.
   */
  drawResult(pose) {
    if (pose.keypoints != null) {
      this.drawKeypoints(pose.keypoints);
      this.drawSkeleton(pose.keypoints);
    }
  }

  /**
   * Draw the keypoints on the video.
   * @param keypoints A list of keypoints.
   */
  drawKeypoints(keypoints) {
    const keypointInd =
        poseDetection.util.getKeypointIndexBySide(params.STATE.model);
    this.ctx.fillStyle = 'White';
    this.ctx.strokeStyle = 'White';
    this.ctx.lineWidth = params.DEFAULT_LINE_WIDTH;

    for (const i of keypointInd.middle) {
      this.drawKeypoint(keypoints[i]);
    }

    this.ctx.fillStyle = 'Green';
    for (const i of keypointInd.left) {
      this.drawKeypoint(keypoints[i]);
    }

    this.ctx.fillStyle = 'Orange';
    for (const i of keypointInd.right) {
      this.drawKeypoint(keypoints[i]);
    }
  }

  drawKeypoint(keypoint) {
    // If score is null, just show the keypoint.
    const score = keypoint.score != null ? keypoint.score : 1;
    const scoreThreshold = params.STATE.modelConfig.scoreThreshold || 0;

    if (score >= scoreThreshold) {
      const circle = new Path2D();
      circle.arc(keypoint.x, keypoint.y, params.DEFAULT_RADIUS, 0, 2 * Math.PI);
      this.ctx.fill(circle);
      this.ctx.stroke(circle);
    }
  }

  /**
   * Draw the skeleton of a body on the video.
   * @param keypoints A list of keypoints.
   */
  drawSkeleton(keypoints) {
    this.ctx.fillStyle = 'White';
    this.ctx.strokeStyle = 'White';
    this.ctx.lineWidth = params.DEFAULT_LINE_WIDTH;

    poseDetection.util.getAdjacentPairs(params.STATE.model).forEach(([i, j]) => {
      const kp1 = keypoints[i];
      const kp2 = keypoints[j];

      // If score is null, just show the keypoint.
      const score1 = kp1.score != null ? kp1.score : 1;
      const score2 = kp2.score != null ? kp2.score : 1;
      const scoreThreshold = params.STATE.modelConfig.scoreThreshold || 0;

      if (score1 >= scoreThreshold && score2 >= scoreThreshold) {
        this.ctx.beginPath();
        this.ctx.moveTo(kp1.x, kp1.y);
        this.ctx.lineTo(kp2.x, kp2.y);
        this.ctx.stroke();
      }
    });
  }

  start() {
    this.mediaRecorder.start();
  }

  stop() {
    this.mediaRecorder.stop();
  }

  drawKeypoints3D(keypoints) {
    const scoreThreshold = params.STATE.modelConfig.scoreThreshold || 0;
    const pointsData =
        keypoints.map(keypoint => ([-keypoint.x, -keypoint.y, -keypoint.z]));

    const dataset =
        new ScatterGL.Dataset([...pointsData, ...ANCHOR_POINTS]);

    const keypointInd =
        poseDetection.util.getKeypointIndexBySide(params.STATE.model);
    this.scatterGL.setPointColorer((i) => {
      if (keypoints[i] == null || keypoints[i].score < scoreThreshold) {
        // hide anchor points and low-confident points.
        return '#ffffff';
      }
      if (i === 0) {
        return '#ff0000' /* Red */;
      }
      if (keypointInd.left.indexOf(i) > -1) {
        return '#00ff00' /* Green */;
      }
      if (keypointInd.right.indexOf(i) > -1) {
        return '#ffa500' /* Orange */;
      }
    });
  }
}
