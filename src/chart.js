import * as utils from './util.js';

let myChart;

export function drawChart(poseList, frameCount, keypoint_names) {
  let velocityFunction = $("#chartVelocityDim").is(":checked") ? utils.velocity3D : utils.velocity2D;

  let labels = [...Array(frameCount).keys()]
  let data = keypoint_names.map((keypoint_name) => {
    return {
      x: labels,
      y: labels.map((i) => velocityFunction(poseList, i, keypoint_name)),
      type: 'scatter'
    }
  })

  Plotly.newPlot('chart', data);
}
