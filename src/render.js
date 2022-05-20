// TODO use async?
import * as params from './params.js';
import * as utils from './util.js';

export class Render3D {
  constructor() {
    this.renderer = new THREE.WebGLRenderer({
      antialias: true
    });
    // TODO use domelement and get size
    this.w = 960
    this.h = 500;
    this.renderer.setSize(this.w, this.h);

    document.body.appendChild(this.renderer.domElement);
    this.renderer.setClearColor(params.RENDER_BG_COLOR, 1.0);

    this.camera = new THREE.PerspectiveCamera(45, this.w/this.h, 1, 10000);
    this.camera.position.z = 200;
    this.camera.position.x = -100;
    this.camera.position.y = 100;

    this.scene = new THREE.Scene();
    this.scatterPlot = new THREE.Object3D();
    this.scatterPlot.rotation.y = 0;
    this.scene.add(this.scatterPlot)

    this.drawAxis();

    this.renderer.render(this.scene, this.camera);
    this.down = false;
    this.sx = 0,
    this.sy = 0;

    let pose = this.createPose();
    this.joints = pose[0]
    this.skeleton = pose[1]

    // TODO change to canvas events
    this.renderer.domElement.onmousedown = (ev) => this.onmousedown(ev)
    this.renderer.domElement.onmouseup = () => this.onmouseup()
    this.renderer.domElement.onmousemove = (ev) => this.onmousemove(ev)


    this.animate();
  }

  onmousedown(ev) {
    this.down = true;
    this.sx = ev.clientX;
    this.sy = ev.clientY;
  }

  onmouseup() {
    this.down = false;
  }

  onmousemove(ev) {
    if (this.down) {
      var dx = ev.clientX - this.sx;
      var dy = ev.clientY - this.sy;
      this.scatterPlot.rotation.y += dx * 0.01;
      this.camera.position.y += dy;
      this.sx += dx;
      this.sy += dy;
    }
  }

  animate() {
    this.renderer.clear();
    this.camera.lookAt(this.scene.position);
    this.renderer.render(this.scene, this.camera);
    window.requestAnimationFrame(() => this.animate(), this.renderer.domElement);
  }

  drawPoint(x, y, z, r=2, color=0x000000) {
    const pointGeo = new THREE.SphereGeometry(r, 32, 16);
    const mat = new THREE.MeshBasicMaterial({
      color: color
    });
    const point = new THREE.Mesh(pointGeo, mat);
    point.position.set(x, y, z);
    this.scatterPlot.add(point);
    return point;
  }

  drawLine(x1, y1, z1, x2, y2, z2, color=0xff0000) {
    const linePoints = [
      new THREE.Vector3(x1, y1, z1),
      new THREE.Vector3(x2, y2, z2),
    ];
    let lineGeo = new THREE.BufferGeometry().setFromPoints(linePoints);
    let lineMat = new THREE.LineBasicMaterial({
      color: color
    });
    let line = new THREE.Line(lineGeo, lineMat);
    this.scatterPlot.add(line)
    return line
  }

  drawAxis(x=0, y=0, z=0, s=50) {
    this.drawLine(x, y, z, x+s, y, z, 0xFF0000);
    this.drawLine(x, y, z, x, y+s, z, 0x00FF00);
    this.drawLine(x, y, z, x, y, z+s, 0x0000FF);
  }

  drawJoint(p, r=2, color=0x000000) {
    return this.drawPoint(p.x*50, -p.y*50, -p.z*50, r=r, color=color);
  }

  drawBone(p1, p2) {
    return this.drawLine(p1.x*50, -p1.y*50, -p1.z*50,
                         p2.x*50, -p2.y*50, -p2.z*50);
  }

  drawPose(pose) {
    let keypoints = pose.keypoints3D
    keypoints.forEach(point => {
      this.drawJoint(point);
    })

    poseDetection.util.getAdjacentPairs(params.STATE.model).forEach(([i,j]) => {
      const kp1 = keypoints[i];
      const kp2 = keypoints[j];

      // If score is null, just show the keypoint.
      const score1 = kp1.score != null ? kp1.score : 1;
      const score2 = kp2.score != null ? kp2.score : 1;
      const scoreThreshold = params.STATE.modelConfig.scoreThreshold || 0;

      if (score1 >= scoreThreshold && score2 >= scoreThreshold) {
        this.drawBone(kp1, kp2);
      }
    })
  }

  updatePose(pose) {
    let keypoints = pose.keypoints3D
    keypoints.forEach((point, i) => {
      this.joints[i].position.set(point.x*50, -point.y*50, -point.z*50);
    })

    // TODO use group
    poseDetection.util.getAdjacentPairs(params.STATE.model).forEach(
      ([j,k], i) => {
        const kp1 = keypoints[j];
        const kp2 = keypoints[k];
        let bone = this.skeleton[i];
        // https://threejs.org/docs/#manual/en/introduction/How-to-update-things
        this.scatterPlot.remove(bone)
        this.skeleton[i] = this.drawBone(kp1, kp2);
    })
  }

  createPose() {
    let joints = [];
    let skeleton = [];

    const pointGeo = new THREE.SphereGeometry(2, 32, 16);
    const mat = new THREE.MeshBasicMaterial({
      color: 0x000000
    });
    const linePoints = [
      new THREE.Vector3(0, 0, 0),
      new THREE.Vector3(30, 30, 30),
    ];
    const lineGeo = new THREE.BufferGeometry().setFromPoints(linePoints);
    const lineMat = new THREE.LineBasicMaterial({
      color: 0xff0000
    });

    for (var i = 0; i <= 32; i++) {
      let point = new THREE.Mesh(pointGeo, mat);
      this.scatterPlot.add(point);
      joints.push(point)
    }

    poseDetection.util.getAdjacentPairs(params.STATE.model).forEach(([i,j]) => {
      let line = new THREE.Line(lineGeo, lineMat);
      this.scatterPlot.add(line);
      skeleton.push(line)
    })

    return [joints, skeleton]
  }

}

