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
import * as params from './params.js';

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

    this.mediaRecorder = new MediaRecorder(stream, options);
    this.mediaRecorder.ondataavailable = this.handleDataAvailable;

    this.range = document.getElementById("range_scroll")
  }

  async loadCurrentFrameData () {
    let index = this.currentFrame

    // Adding 1ms makes behaviour consistent on firefox and chrome
    this.video.currentTime = index / this.framerate + 0.001

    // TODO seems to make scrubber less smooth sometimes
    await new Promise((resolve) => {
      this.video.onseeked = () => {
        resolve(video);
      };
    });
  }

  async firstFrame() {
    this.currentFrame = 0
    await this.loadCurrentFrameData()
    this.redrawCanvas()
  }

  async nextFrame() {
    if (this.currentFrame +1 >= this.frameCount) return
    this.currentFrame += 1
    await this.loadCurrentFrameData()
    this.redrawCanvas()
  }

  async prevFrame() {
    if (this.currentFrameIndex <= 0) return
    this.currentFrame -= 1
    await this.loadCurrentFrameData()
    this.redrawCanvas()
  }

  async goToFrame(id) {
    this.currentFrame = id
    await this.loadCurrentFrameData()
    this.redrawCanvas()
  }

  async redrawCanvas() {
    this.clearCtx();
    this.drawCtx();
    if (this.poseList[this.currentFrame]) {
      this.drawResult(this.poseList[this.currentFrame])
      document.getElementById("testtext").textContent = JSON.stringify(this.poseList[this.currentFrame])
    }
    this.range.value = this.currentFrame;
  }

  drawCtx() {
    this.ctx.drawImage(
      this.video, 0, 0, this.video.width, this.video.height);
  }

  clearCtx() {
    this.ctx.clearRect(0, 0, this.video.width, this.video.height);
  }

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

    poseDetection.util.getAdjacentPairs(params.STATE.model).forEach(([
                                                                      i, j
                                                                    ]) => {
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
}
