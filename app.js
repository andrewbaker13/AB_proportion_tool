// app.js
document.addEventListener("DOMContentLoaded", () => {
  updateDisplays();
  updatePlot();

  const inputs = [
    "p1Slider", "p2Slider", "alphaSlider", "powerSlider",
    "p1Number", "p2Number", "alphaNumber", "powerNumber"
  ];

  inputs.forEach((id) => {
    document.getElementById(id).addEventListener("input", () => {
      syncInputs();
      updateDisplays();
      updatePlot();
    });
  });
});

function syncInputs() {
  const pairs = [
    ["p1Slider", "p1Number"],
    ["p2Slider", "p2Number"],
    ["alphaSlider", "alphaNumber"],
    ["powerSlider", "powerNumber"]
  ];

  pairs.forEach(([slider, number]) => {
    const s = document.getElementById(slider);
    const n = document.getElementById(number);
    if (document.activeElement === s) n.value = s.value;
    else if (document.activeElement === n) s.value = n.value;
  });
}

function updateDisplays() {
  const p1 = parseFloat(document.getElementById("p1Slider").value);
  const p2 = parseFloat(document.getElementById("p2Slider").value);
  const alpha = parseFloat(document.getElementById("alphaSlider").value);
  const power = parseFloat(document.getElementById("powerSlider").value);

  document.getElementById("p1Display").textContent = (p1 * 100).toFixed(1) + "%";
  document.getElementById("p2Display").textContent = (p2 * 100).toFixed(1) + "%";
  document.getElementById("alphaDisplay").textContent = alpha.toFixed(2);
  document.getElementById("powerDisplay").textContent = power.toFixed(2);
  document.getElementById("deltaDisplay").textContent = ((p2 - p1) * 100).toFixed(1) + "%";
}

function updatePlot() {
  const p1 = parseFloat(document.getElementById("p1Slider").value);
  const p2 = parseFloat(document.getElementById("p2Slider").value);
  const alpha = parseFloat(document.getElementById("alphaSlider").value);
  const power = parseFloat(document.getElementById("powerSlider").value);

  if ([p1, p2, alpha, power].some((v) => isNaN(v))) return;

  try {
    const zAlpha = inverseNormal(1 - alpha / 2);
    const zPower = inverseNormal(power);
    const pBar = (p1 + p2) / 2;
    const n = (2 * (zAlpha + zPower) ** 2 * pBar * (1 - pBar)) / (p2 - p1) ** 2;

    document.getElementById("sample_size").textContent =
      `Required N per group ≈ ${Math.round(n).toLocaleString()}`;

    const trace = {
      x: [p1, p2],
      y: [0, 1],
      mode: "lines+markers",
      line: { shape: "linear" },
      name: "Conversion Rates",
    };

    const layout = {
      title: `Sample Size Visualization`,
      xaxis: { title: "Conversion Rate (p)", range: [0, 0.4] },
      yaxis: { visible: false },
      showlegend: false,
      margin: { t: 60, b: 50, l: 40, r: 40 },
    };

    Plotly.react("plot", [trace], layout);
  } catch (err) {
    console.error("Plot update failed:", err);
  }
}

function inverseNormal(p) {
  const a1 = -39.6968302866538, a2 = 220.946098424521, a3 = -275.928510446969,
    a4 = 138.357751867269, a5 = -30.6647980661472, a6 = 2.50662827745924;
  const b1 = -54.4760987982241, b2 = 161.585836858041, b3 = -155.698979859887,
    b4 = 66.8013118877197, b5 = -13.2806815528857;
  const c1 = -0.00778489400243029, c2 = -0.322396458041136,
    c3 = -2.40075827716184, c4 = -2.54973253934373,
    c5 = 4.37466414146497, c6 = 2.93816398269878;
  const d1 = 0.00778469570904146, d2 = 0.32246712907004,
    d3 = 2.445134137143, d4 = 3.75440866190742;

  if (p <= 0 || p >= 1) return NaN;
  let q, r;
  if (p < 0.02425) {
    q = Math.sqrt(-2 * Math.log(p));
    return (((((c1 * q + c2) * q + c3) * q + c4) * q + c5) * q + c6) /
      ((((d1 * q + d2) * q + d3) * q + d4) * q + 1) * -1;
  } else if (p > 1 - 0.02425) {
    q = Math.sqrt(-2 * Math.log(1 - p));
    return (((((c1 * q + c2) * q + c3) * q + c4) * q + c5) * q + c6) /
      ((((d1 * q + d2) * q + d3) * q + d4) * q + 1);
  } else {
    q = p - 0.5;
    r = q * q;
    return (((((a1 * r + a2) * r + a3) * r + a4) * r + a5) * r + a6) * q) /
      (((((b1 * r + b2) * r + b3) * r + b4) * r + b5) * r + 1);
  }
}
