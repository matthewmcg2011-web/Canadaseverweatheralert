// Canada Severe Weather Alerts
// Live data from Environment and Climate Change Canada (ECCC)
// MSC GeoMet Weather Alerts API

const ALERT_API =
  "https://api.weather.gc.ca/collections/weather-alerts/items?f=json&limit=1000";

async function loadAlerts() {
  const alertsContainer = document.querySelector(".alerts");

  if (!alertsContainer) {
    console.error("Could not find the alerts container.");
    return;
  }

  try {
    alertsContainer.innerHTML = `
      <div class="alert-card">
        <div class="alert-header">
          <h3>Loading Canadian alerts...</h3>
          <span class="badge">LIVE</span>
        </div>
      </div>
    `;

    const response = await fetch(ALERT_API);

    if (!response.ok) {
      throw new Error(`HTTP error ${response.status}`);
    }

    const data = await response.json();
    const features = Array.isArray(data.features) ? data.features : [];

    // Remove alerts that are no longer active/valid when the API provides
    // an expiration time in the past.
    const now = Date.now();

    const activeAlerts = features.filter(alert => {
      const p = alert.properties || {};

      if (!p.expiration_datetime) {
        return true;
      }

      const expiration = new Date(p.expiration_datetime).getTime();

      return Number.isNaN(expiration) || expiration > now;
    });

    if (activeAlerts.length === 0) {
      alertsContainer.innerHTML = `
        <div class="alert-card no-alerts">
          <h3>No Active Alerts</h3>
          <p>
            Environment and Climate Change Canada is not currently reporting
            any active weather alerts in this feed.
          </p>
        </div>
      `;
      updateStatus(0);
      return;
    }

    // Sort higher-severity colours first.
    activeAlerts.sort((a, b) => {
      return severityScore(b.properties || {}) -
             severityScore(a.properties || {});
    });

    alertsContainer.innerHTML = activeAlerts
      .map((alert, index) => createAlertCard(alert, index))
      .join("");

    updateStatus(activeAlerts.length);

    // Add click handlers for the details buttons.
    document.querySelectorAll(".details-button").forEach(button => {
      button.addEventListener("click", () => {
        const details = document.getElementById(button.dataset.target);

        if (!details) return;

        const hidden = details.classList.toggle("hidden");

        button.textContent = hidden
          ? "View Details"
          : "Hide Details";
      });
    });

  } catch (error) {
    console.error("Unable to load ECCC alerts:", error);

    alertsContainer.innerHTML = `
      <div class="alert-card">
        <div class="alert-header">
          <h3>Alert Data Unavailable</h3>
          <span class="badge">ERROR</span>
        </div>

        <div class="alert-content">
          <p>
            The dashboard could not retrieve the live Environment and Climate
            Change Canada alert feed right now.
          </p>

          <button class="details-button" onclick="loadAlerts()">
            Try Again
          </button>
        </div>
      </div>
    `;
  }
}


function createAlertCard(alert, index) {
  const p = alert.properties || {};

  const alertName =
    p.alert_name_en ||
    p.alert_short_name_en ||
    p.alert_type ||
    "Weather Alert";

  const area =
    p.feature_name_en ||
    "Canadian location";

  const alertType =
    p.alert_type ||
    "Weather";

  const status =
    p.status_en ||
    "Active";

  const riskColour =
    p.risk_colour_en ||
    "Unknown";

  const alertText =
    p.alert_text_en ||
    "No additional alert information was provided.";

  const impact =
    p.impact_en ||
    "Not specified";

  const issued =
    formatDate(p.publication_datetime);

  const expires =
    formatDate(
      p.expiration_datetime ||
      p.event_end_datetime
    );

  const detailsId = `alert-details-${index}`;

  const cardClass = getCardClass(p);

  return `
    <article class="alert-card ${cardClass}">

      <div class="alert-header">
        <div>
          <h3>${escapeHTML(alertName)}</h3>
          <div>
            <strong>${escapeHTML(area)}</strong>
          </div>
        </div>

        <span class="badge">
          ${escapeHTML(alertType)}
        </span>
      </div>

      <div class="alert-content">

        <p>
          <strong>Status:</strong>
          ${escapeHTML(status)}
        </p>

        <p>
          <strong>Risk level:</strong>
          ${escapeHTML(riskColour)}
        </p>

        <button
          class="details-button"
          data-target="${detailsId}">
          View Details
        </button>

        <div id="${detailsId}" class="hidden">

          <hr>

          <p>
            <strong>Area:</strong>
            ${escapeHTML(area)}
          </p>

          <p>
            <strong>Alert:</strong>
            ${escapeHTML(alertName)}
          </p>

          <p>
            <strong>Issued:</strong>
            ${escapeHTML(issued)}
          </p>

          <p>
            <strong>Expires:</strong>
            ${escapeHTML(expires)}
          </p>

          <p>
            <strong>Impact:</strong>
            ${escapeHTML(impact)}
          </p>

          <p>
            <strong>Details:</strong><br>
            ${escapeHTML(alertText)}
          </p>

          <p>
            <strong>Source:</strong>
            Environment and Climate Change Canada
          </p>

        </div>

      </div>

    </article>
  `;
}


function severityScore(properties) {
  const colour =
    String(properties.risk_colour_en || "").toLowerCase();

  const type =
    String(properties.alert_type || "").toLowerCase();

  const name =
    String(properties.alert_name_en || "").toLowerCase();

  if (
    type.includes("warning") ||
    name.includes("warning")
  ) {
    return 4;
  }

  if (
    type.includes("watch") ||
    name.includes("watch")
  ) {
    return 3;
  }

  if (
    colour.includes("orange")
  ) {
    return 3;
  }

  if (
    colour.includes("yellow")
  ) {
    return 2;
  }

  if (
    type.includes("advisory") ||
    type.includes("statement") ||
    name.includes("statement")
  ) {
    return 1;
  }

  return 0;
}


function getCardClass(properties) {
  const type =
    String(properties.alert_type || "").toLowerCase();

  const name =
    String(properties.alert_name_en || "").toLowerCase();

  if (
    type.includes("warning") ||
    name.includes("warning")
  ) {
    return "warning-alert";
  }

  if (
    type.includes("watch") ||
    name.includes("watch")
  ) {
    return "watch-alert";
  }

  if (
    type.includes("advisory") ||
    name.includes("advisory")
  ) {
    return "advisory-alert";
  }

  return "statement-alert";
}


function updateStatus(count) {
  const statusElement = document.querySelector(".status");

  if (!statusElement) return;

  if (count === 0) {
    statusElement.textContent =
      "● No active weather alerts";
    statusElement.style.color = "#2e7d32";
    return;
  }

  statusElement.textContent =
    `● ${count} active weather alert${count === 1 ? "" : "s"}`;

  statusElement.style.color = "#b3261e";
}


function formatDate(value) {
  if (!value) {
    return "Not provided";
  }

  const date = new Date(value);

  if (Number.isNaN(date.getTime())) {
    return value;
  }

  return date.toLocaleString("en-CA", {
    dateStyle: "medium",
    timeStyle: "short"
  });
}


function escapeHTML(value) {
  return String(value ?? "")
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#039;");
}


// Load alerts when the page opens.
loadAlerts();


// Refresh the live alert feed every 5 minutes.
setInterval(loadAlerts, 5 * 60 * 1000);
