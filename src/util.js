export function isMobile() {
  const isAndroid = /Android/i.test(navigator.userAgent);
  const isiOS = /iPhone|iPad|iPod/i.test(navigator.userAgent);
  return isAndroid || isiOS;
}

export function poseToCSV(poseList, frameCount) {
  let data = "frame,name,x2d,y2d,x,y,z,score\n"
  for (let i = 0; i < frameCount; i++) {
    if (!poseList[i]) {
      continue;
    }
    let keypoints = poseList[i].keypoints;
    let keypoints3D = poseList[i].keypoints3D;
    for (let j = 0; j < keypoints.length; j++) {
      let obj = keypoints[j];
      let obj3D = keypoints3D[j];
      let row = [i, obj.name, obj.x, obj.y, obj3D.x,
                 obj3D.y, obj3D.z, obj3D.score].join(",");
      data += row + "\n"
    }
  }

  return data;
}
