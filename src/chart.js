import * as utils from './util.js';

let myChart;

export function drawChart(poseList, frameCount, keypoint_names) {
  for (const keypoint_name of keypoint_names) {
    // TODO multiple joints selected
    let labels = [...Array(frameCount).keys()]
    let velocityFunction =  $("#chartVelocityDim").is(":checked") ? utils.velocity3D : utils.velocity2D
    let yValues = labels.map((i) => velocityFunction(poseList, i, keypoint_name))

    // TODO update data, shouldn't need to call new Chart
    if (myChart) myChart.destroy();
    myChart = new Chart("chart", {
      type: "line",
      data: {
        labels: labels,
        datasets: [{
          fill: false,
          backgroundColor: "rgba(0,0,0,1.0)",
          borderColor: "rgba(0,0,0,0.1)",
          data: yValues
        }]
      },
      options: {}
    });
  }
}
