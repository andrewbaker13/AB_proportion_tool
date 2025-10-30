<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1.0" />
  <title>A/B Test Sample Size Calculator</title>

  <!-- Plotly.js -->
  <script src="https://cdn.plot.ly/plotly-latest.min.js"></script>

  <!-- Styles -->
  <link rel="stylesheet" href="style.css" />

  <!-- Font & general appearance -->
  <style>
    body {
      font-family: 'Segoe UI', Roboto, sans-serif;
      background-color: #fafafa;
      color: #222;
      margin: 0;
      padding: 2rem;
    }

    h1 {
      text-align: center;
      margin-bottom: 1.5rem;
      color: #c8102e; /* SDSU red accent */
    }

    .container {
      max-width: 700px;
      margin: 0 auto;
      background: white;
      border-radius: 12px;
      box-shadow: 0 2px 6px rgba(0, 0, 0, 0.1);
      padding: 2rem;
    }

    .control-group {
      margin-bottom: 1.5rem;
    }

    label {
      font-weight: 600;
      display: block;
      margin-bottom: 0.3rem;
    }

    input[type="range"] {
      width: 100%;
    }

    .display-row {
      display: flex;
      justify-content: space-between;
      font-size: 0.9rem;
      color: #444;
      margin-top: 0.3rem;
    }

    #plot {
      margin-top: 2rem;
    }

    .note {
      font-size: 0.85rem;
      color: #555;
      text-align: center;
      margin-top: 1rem;
    }
  </style>
</head>

<body>
  <div class="container">
    <h1>A/B Test Sample Size Calculator</h1>

    <div class="control-group">
      <label for="p1Slider">Baseline conversion rate (p₁): <span id="p1Display"></span></label>
      <input type="range" id="p1Slider" min="0" max="0.20" step="0.01" value="0.05" />
    </div>

    <div class="control-group">
      <label for="p2Slider">Variant conversion rate (p₂): <span id="p2Display"></span></label>
      <input type="range" id="p2Slider" min="0" max="0.20" step="0.01" value="0.07" />
      <div class="display-row">
        <div>Difference (Δ): <span id="deltaDisplay"></span></div>
      </div>
    </div>

    <div class="control-group">
      <label for="alphaSlider">Significance level (α): <span id="alphaDisplay"></span></label>
      <input type="range" id="alphaSlider" min="0.01" max="0.10" step="0.01" value="0.05" />
    </div>

    <div class="control-group">
      <label for="powerSlider">Desired power (1−β): <span id="powerDisplay"></span></label>
      <input type="range" id="powerSlider" min="0.70" max="0.99" step="0.01" value="0.80" />
    </div>

    <div id="plot"></div>

    <div class="note">
      Adjust the sliders above to explore how baseline rate, variant rate, α, and power affect
      the required sample size per group for a two-tailed A/B test.
    </div>
  </div>

  <!-- JS logic -->
  <script src="app.js"></script>
</body>
</html>
