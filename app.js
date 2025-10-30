(function () {
  "use strict";

  // --- Constants and Utility Functions ---

  // Standard Normal Distribution (Z-score) lookup function
  // This is a simplified approximation for common values used in A/B testing
  function getZScore(p) {
    // Corrected lookup logic: p is the area to the left (e.g., 0.95 for Z_alpha, 0.80 for Z_beta)
    if (p >= 0.99) return 2.33; // 99% Power / 1% one-tailed alpha
    if (p >= 0.975) return 1.96; // 95% two-tailed alpha
    if (p >= 0.95) return 1.645; // 95% one-tailed alpha
    if (p >= 0.90) return 1.28; // 90% Power
    if (p >= 0.84) return 1.00; // 84% Power
    if (p >= 0.80) return 0.84; // 80% Power (Common Beta of 0.20)
    if (p >= 0.75) return 0.67;
    if (p >= 0.70) return 0.52;
    // Lower tail values for completeness, though mainly positive Z scores are used here
    if (p <= 0.05) return -1.645;
    return 0; // Fallback
  }

  // Calculate the probability density function for the Normal Distribution
  function normalPDF(x, mu, sigma) {
    return (1 / (sigma * Math.sqrt(2 * Math.PI))) * Math.exp(-0.5 * Math.pow((x - mu) / sigma, 2));
  }

  // Synchronize slider and number input values; the number input is the master.
  // This function is now exposed globally using window.syncValue later.
  function syncValue(prefix, source) {
    const slider = document.getElementById(prefix);
    const number = document.getElementById(prefix + "_num");
    const display = document.getElementById(prefix + "_value");

    if (source === "slider") {
      // Update number input with slider value, then trigger number's sync
      number.value = parseFloat(slider.value).toFixed(prefix === 'P1' || prefix === 'delta' ? 3 : 2);
    } else {
      // Ensure the number input value updates the slider (for better visual position)
      slider.value = number.value;
    }

    const value = parseFloat(number.value);

    // Dynamic display formatting
    if (prefix === 'P1' || prefix === 'delta') {
      display.textContent = value.toFixed(3);
    } else {
       display.textContent = value.toFixed(2);
    }

    updateABTestViz();
  }
  
  // CRITICAL FIX: Expose syncValue globally for inline event handlers (oninput).
  window.syncValue = syncValue;

  // --- Core Calculation and Plotting Function ---
  function updateABTestViz() {
    // 1. Retrieve current input values from the number fields (for precision)
    const P1 = parseFloat(document.getElementById("P1_num").value); // Baseline Proportion
    const delta = parseFloat(document.getElementById("delta_num").value); // Hypothesized Difference
    const alpha = parseFloat(document.getElementById("alpha_num").value); // Type I Error
    const power = parseFloat(document.getElementById("power_num").value); // Statistical Power

    // Calculate derived parameters
    const P2 = P1 + delta; // Variant Proportion
    const P_pool = (P1 + P2) / 2; // Pooled proportion (used in the H0 variance)
    const beta = 1 - power; // Type II Error

    // Input validation to prevent crashes if P2 or P_pool are out of range [0, 1]
    if (P2 < 0.001 || P2 > 0.999 || P_pool < 0.001 || P_pool > 0.999 || delta <= 0) {
      document.getElementById("sample_size").innerHTML =
        "**Required Unique Visitors per Influencer (N):** <span class='dynamic-value'>---</span>";
      document.getElementById("p2_rate").innerHTML =
        "**Target Conversion Rate for Beta (P₂):** <span class='dynamic-value'>---</span>";
      Plotly.purge("distributionPlot"); // Clear the plot
      return;
    }
    
    // 2. Sample Size Calculation (N per group)
    // Z-scores for 1-alpha (critical value, one-tailed test) and 1-beta (power)
    const Z_alpha = getZScore(1 - alpha);
    const Z_beta = getZScore(power);

    // Term 1 (Variance under H0, using pooled estimate)
    const term1 = Z_alpha * Math.sqrt(2 * P_pool * (1 - P_pool));

    // Term 2 (Variance under HA, using unpooled estimates)
    const term2 = Z_beta * Math.sqrt(P1 * (1 - P1) + P2 * (1 - P2));

    // Sample size formula
    let N = Math.pow(term1 + term2, 2) / Math.pow(delta, 2);

    // Round up the sample size to the nearest whole number and ensure a minimum of 10
    N = Math.max(10, Math.ceil(N));

    // 3. Update Metric Display
    document.getElementById("sample_size").innerHTML =
      "**Required Unique Visitors per Influencer (N):** <span class='dynamic-value'>" + N.toLocaleString() + "</span>";

    document.getElementById("p2_rate").innerHTML =
      "**Target Conversion Rate for Beta (P₂):** <span class='dynamic-value'>" + (P2 * 100).toFixed(1) + "%</span>";

    // 4. Visualization Setup (Null and Alternative Distributions)

    // Using Z-space (standard error of the difference) for plotting clarity
    // Mean of H0 distribution (no difference) = 0
    const mu0 = 0;
    // Standard deviation (Standard Error) of the difference under H0
    const sigma0 = Math.sqrt(2 * P_pool * (1 - P_pool) / N);

    // Mean of HA distribution (hypothesized difference) = delta
    const muA = delta;
    // Standard deviation (Standard Error) of the difference under HA
    const sigmaA = Math.sqrt((P1 * (1 - P1) + P2 * (1 - P2)) / N);

    // Generate x and y points for the PDF curves
    const xDist = [];
    const yH0 = [];
    const yHA = [];

    // Define plotting range based on the distributions (e.g., 4 standard deviations out)
    const maxSigma = Math.max(sigma0, sigmaA);
    const xMin = Math.min(mu0, muA) - 4 * maxSigma;
    const xMax = Math.max(mu0, muA) + 4 * maxSigma;

    // Use at least 200 points for a smooth curve
    for (let x = xMin; x <= xMax; x += (xMax - xMin) / 200) {
      xDist.push(x);
      yH0.push(normalPDF(x, mu0, sigma0));
      yHA.push(normalPDF(x, muA, sigmaA));
    }

    const yMaxPlot = Math.max(...yH0, ...yHA) * 1.1;

    // Calculate Critical Value (CV) - the boundary between "Accept H0" and "Reject H0" regions
    // CV = mu0 + Z_alpha * SE_H0 (This is the critical difference, not Z-score)
    const criticalValue = mu0 + getZScore(1 - alpha) * sigma0;

    // Define shapes for shading (Type I Error (Alpha) and Type II Error (Beta))
    const shapes = [];

    // --- Type I Error (Alpha) Shading ---
    // Region where H0 is incorrectly rejected (CV to positive infinity)
    const alpha_x_shade = xDist.filter(x => x >= criticalValue);
    const alpha_y_shade = alpha_x_shade.map(x => normalPDF(x, mu0, sigma0));

    if (alpha_x_shade.length > 0) {
        const pathPoints = alpha_x_shade.map((x, i) => `${x},${alpha_y_shade[i]}`).join(' L ');
        
        shapes.push({
            type: 'path',
            path: 'M ' + criticalValue + ',0 L ' + pathPoints + ' L ' + xDist[xDist.length - 1] + ',0 Z',
            fillcolor: 'rgba(255, 0, 0, 0.4)', // Red for Type I (False Positive)
            line: { width: 0 },
            name: 'Type I Error (α)',
            layer: 'below'
        });
    }

    // --- Type II Error (Beta) Shading ---
    // Region where HA is incorrectly accepted (negative infinity to CV)
    const beta_x_shade = xDist.filter(x => x <= criticalValue);
    const beta_y_shade = beta_x_shade.map(x => normalPDF(x, muA, sigmaA));

    if (beta_x_shade.length > 0) {
        const pathPoints = beta_x_shade.map((x, i) => `${x},${beta_y_shade[i]}`).join(' L ');
        
        shapes.push({
            type: 'path',
            path: 'M ' + xDist[0] + ',0 L ' + pathPoints + ' L ' + criticalValue + ',0 Z',
            fillcolor: 'rgba(255, 165, 0, 0.4)', // Orange for Type II (False Negative)
            line: { width: 0 },
            name: 'Type II Error (β)',
            layer: 'below'
        });
    }


    // --- Critical Value Line ---
    shapes.push({
        type: 'line',
        x0: criticalValue,
        y0: 0,
        x1: criticalValue,
        y1: yMaxPlot / 1.1,
        line: { color: 'black', dash: 'dash', width: 2 },
        name: 'Critical Value',
        layer: 'above'
    });


    // 5. Plotly Data and Layout
    const dataPlot = [
      {
        x: xDist,
        y: yH0,
        mode: 'lines',
        name: 'Null Hypothesis (H₀: $\\delta=0$)',
        line: { color: '#3b82f6', width: 3 }, // Blue for Null
        fill: 'tozeroy',
        fillcolor: 'rgba(59, 130, 246, 0.1)'
      },
      {
        x: xDist,
        y: yHA,
        mode: 'lines',
        name: 'Alternative Hypothesis (Hₐ: $\\delta=' + delta.toFixed(3) + '$)',
        line: { color: '#059669', width: 3 }, // Green for Alternative
        fill: 'tozeroy',
        fillcolor: 'rgba(5, 150, 105, 0.1)'
      }
    ];

    const layout = {
      title: 'Visualization of Statistical Distributions (Difference Space)',
      xaxis: {
        title: "Difference in Conversion Rates ($\hat{P}_2 - \hat{P}_1$)",
        zeroline: true,
        showgrid: false,
        tickformat: ',.1%', // Format ticks as percentages
      },
      yaxis: {
        title: "Probability Density",
        showticklabels: false,
        range: [0, yMaxPlot]
      },
      shapes: shapes,
      annotations: [
        {
          x: mu0, y: 0, text: "H₀ Center: 0%", showarrow: false, yshift: 10, font: { color: '#3b82f6', size: 10 }
        },
        {
          x: muA, y: 0, text: "Hₐ Center: " + (muA * 100).toFixed(1) + "%", showarrow: false, yshift: 10, font: { color: '#059669', size: 10 }
        },
        {
          x: criticalValue, y: yMaxPlot * 0.9, text: "Critical Value (" + (criticalValue * 100).toFixed(1) + "%)", showarrow: true, arrowhead: 2, ax: 0, ay: -30, font: { size: 10 }
        }
      ],
      hovermode: 'closest',
      responsive: true,
      legend: { x: 0.05, y: 0.95 }
    };

    Plotly.newPlot("distributionPlot", dataPlot, layout, { responsive: true, displayModeBar: false });
  }

  // --- Initialization ---
  document.addEventListener("DOMContentLoaded", function () {
    // Manually trigger the initial sync for all controls to set the display values and fire the initial plot
    window.syncValue('P1', 'number');
    window.syncValue('delta', 'number');
    window.syncValue('alpha', 'number');
    window.syncValue('power', 'number');
  });

  // Add window resize listener to trigger Plotly's resize method.
  window.addEventListener("resize", function () {
    const plotDiv = document.getElementById("distributionPlot");
    if (plotDiv) Plotly.Plots.resize(plotDiv);
  });
})();
