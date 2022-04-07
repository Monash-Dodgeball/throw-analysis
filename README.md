# Throw-Analysis
Code mainly lifted from [here](https://github.com/tensorflow/tfjs-models/tree/master/pose-detection/demos).

Site available here https://monash-dodgeball.github.io/throw-analysis/index.html.

## Running a local testing server
Navigate to project directory and run `python3 -m http.server 8000` in a terminal.

Now navigate to [localhost:8000](http://localhost:8000/) in your browser.

Sometimes the browser caches the page and you have to do a hard refresh (usually Ctrl+Shift+R) to see changes.

## Pose object format
After pose generation has finished running, pose data for frame `i` is stored in `poseData[i]` (in index.js).

Each pose contains:
- `score`: Overall score? I'm not entirely sure how it's defined
- `keypoints`:
    - `name`: The name of the specific keypoint (e.g. `left_elbow`
    - `score`: The model's confidence that this is in fact a keypoint
    - `x`: The x coordinate given in pixels
    - `y`: The y coordinate given in pixels
    - `z`: I have no idea what this coordinate is for
- `keypoints3D
    - `name`: 
    - `score`: The model's confidence that this is in fact a keypoint
    - `x`: The x coordinate
    - `y`: The y coordinate
    - `z`: The z coordinate

For `keypoints3D`, x, y and z represent distance in a 2 x 2 x 2 meter cubic space. The range for each coordinat is from -1 to 1. The z-axis is always perpendicular to the xy-plane that passes through the center of the hip, so the coordinate for the hip center is (0, 0, 0).

## BlazePose Keypoints:

![image](https://user-images.githubusercontent.com/11014229/162218093-1dee7d85-db41-45c1-8757-4625a128e7f8.png)

0: nose

1: left_eye_inner

2: left

3: left_eye_outer

4: right_eye_inner

5: right_eye

6: right_eye_outer

7: left_ear

8: right_ear

9: mouth_left

10: mouth_right

11: left_shoulder

12: right_shoulder

13: left_elbow

14: right_elbow

15: left_wrist

16: right_wrist

17: left_pinky

18: right_pinky

19: left_index

20: right_index

21: left_thumb

22: right_thumb

23: left_hip

24: right_hip

25: left_knee

26: right_knee

27: left_ankle

28: right_ankle

29: left_heel

30: right_heel

31: left_foot_index

32: right_foot_index
