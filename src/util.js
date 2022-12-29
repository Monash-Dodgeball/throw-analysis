export function norm3D(poseList, frame_id, keypoint_name, dims) {
  if (frame_id == 0) {
    return 0
  }

  let id = kpNameMap[keypoint_name];
  let joint1 = poseList[frame_id-1].keypoints3D[id];
  let joint2 = poseList[frame_id].keypoints3D[id];
  let v2 = 0;

  for (const dim of dims) {
    v2 += (joint2[dim] - joint1[dim])**2;
  }

  return Math.sqrt(v2);
}

export function norm2D(poseList, frame_id, keypoint_name, dims) {
  if (frame_id == 0) {
    return 0
  }

  let id = kpNameMap[keypoint_name];
  let joint1 = poseList[frame_id-1].keypoints[id];
  let joint2 = poseList[frame_id].keypoints[id];
  let v2 = 0;

  for (const dim of dims) {
    v2 += (joint2[dim] - joint1[dim])**2;
  }

  return Math.sqrt(v2);
}

export function velocity3D(poseList, frame_id, keypoint_name) {
  return norm3D(poseList, frame_id, keypoint_name, ['x', 'y', 'z'])
}

export function velocity2D(poseList, frame_id, keypoint_name) {
  return norm2D(poseList, frame_id, keypoint_name, ['x', 'y'])
}

/*
 * Put any miscellaneous functions here.
 */

export function isMobile() {
  const isAndroid = /Android/i.test(navigator.userAgent);
  const isiOS = /iPhone|iPad|iPod/i.test(navigator.userAgent);
  return isAndroid || isiOS;
}

/* Converts pose data to csv string for download */
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

/* Converts pose data to JSON format for download */
export function poseToJSON(poseList) {
  let poseJSON = JSON.stringify(poseList)
  return poseJSON
}

/* Converts pose JSON string to object */
export function jsonToPose(poseJSON) {
  let pose = JSON.parse(poseJSON)
  return pose
}

/* Maps keypoint name to index */
export const kpNameMap = {
  'nose':             0,
  'left_eye_inner':   1,
  'left':             2,
  'left_eye_outer':   3,
  'right_eye_inner':  4,
  'right_eye':        5,
  'right_eye_outer':  6,
  'left_ear':         7,
  'right_ear':        8,
  'mouth_left':       9,
  'mouth_right':     10,
  'left_shoulder':   11,
  'right_shoulder':  12,
  'left_elbow':      13,
  'right_elbow':     14,
  'left_wrist':      15,
  'right_wrist':     16,
  'left_pinky':      17,
  'right_pinky':     18,
  'left_index':      19,
  'right_index':     20,
  'left_thumb':      21,
  'right_thumb':     22,
  'left_hip':        23,
  'right_hip':       24,
  'left_knee':       25,
  'right_knee':      26,
  'left_ankle':      27,
  'right_ankle':     28,
  'left_heel':       29,
  'right_heel':      30,
  'left_foot_index': 31,
  'right_foot_index': 32
}

/* Maps keypoint index to name */
export const kpIdxMap = {
  0: 'nose',
  1: 'left_eye_inner',
  2: 'left',
  3: 'left_eye_outer',
  4: 'right_eye_inner',
  5: 'right_eye',
  6: 'right_eye_outer',
  7: 'left_ear',
  8: 'right_ear',
  9: 'mouth_left',
  10: 'mouth_right',
  11: 'left_shoulder',
  12: 'right_shoulder',
  13: 'left_elbow',
  14: 'right_elbow',
  15: 'left_wrist',
  16: 'right_wrist',
  17: 'left_pinky',
  18: 'right_pinky',
  19: 'left_index',
  20: 'right_index',
  21: 'left_thumb',
  22: 'right_thumb',
  23: 'left_hip',
  24: 'right_hip',
  25: 'left_knee',
  26: 'right_knee',
  27: 'left_ankle',
  28: 'right_ankle',
  29: 'left_heel',
  30: 'right_heel',
  31: 'left_foot_index',
  32: 'right_foot_index'
}
