// ======================================================
// CANADA SEVERE WEATHER ALERTS
// Live ECCC alerts + Leaflet alert map
// ======================================================

const ECCC_URL =
  "https://api.weather.gc.ca/collections/weather-alerts/items?f=geojson&limit=1000";

let map;
let alertLayer;

// ======================================================
// START MAP
// ======================================================

function startMap() {
  const mapBox = document.getElementById("map");

  if (!mapBox) {
    console.error("Map container not found.");
    return;
  }

  if (typeof L === "undefined") {
    console.error("Leaflet did not load.");
    mapBox.innerHTML =
      "<p style='padding:20px;'>Map library failed to load.</p>";
    return;
  }

  map = L.map("map").setView([56.1304, -106.3468], 4);

  L.tileLayer(
    "https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png",
    {
      maxZoom: 18,
      attribution: "&copy; OpenStreetMap contributors"
    }
  ).addTo(map);

  alertLayer = L.geoJSON(null, {
    style: styleAlert,

    onEachFeature: function (feature, layer) {
      const p = feature.properties || {};

      const name =
        p.alert_name_en ||
        p.alert_short_name_en ||
        p.alert_type ||
        "Weather Alert";

      const area =
        p.feature_name_en ||
        "Canadian area";

      const type =
        p.alert_type ||
        "Weather Alert";

      layer.bindPopup(`
        <strong>${escapeHTML(name)}</strong>
        <br><br>
        <strong>Type:</strong> ${escapeHTML(type)}
        <br>
        <strong>Area:</strong> ${escapeHTML(area)}
      `);
    }
  }).addTo(map);

  // Sometimes Leaflet needs a moment to calculate the map size.
  setTimeout(() => {
    map.invalidateSize();
  }, 300);
}


// ======================================================
// ALERT MAP STYLE
// ======================================================

function styleAlert(feature) {
  const p = feature.properties || {};

  const type =
    String(p.alert_type || "").toLowerCase();

  const name =
    String(p.alert_name_en || "").toLowerCase();

  // WARNING
  if (
    type.includes("warning") ||
    name.includes("warning")
  ) {
    return {
      color: "#b71c1c",
      weight: 2,
      fillColor: "#e53935",
      fillOpacity: 0.35
    };
  }

  // WATCH
  if (
    type.includes("watch") ||
    name.includes("watch")
  ) {
    return {
      color: "#f57f17",
      weight: 2,
      fillColor: "#fbc02d",
      fillOpacity: 0.35
    };
  }

  // ADVISORY / OTHER
  return {
    color: "#1565c0",
    weight: 2,
    fillColor: "#42a5f5",
    fillOpacity: 0.25
  };
}


// ======================================================
// LOAD LIVE ECCC ALERTS
// ======================================================

async function loadAlerts() {
  const alertBox = document.querySelector(".alerts");

  try {
    const response = await fetch(ECCC_URL, {
      cache: "no-store"
    });

    if (!response.ok) {
      throw new Error(
        "ECCC HTTP " + response.status
      );
    }

    const data = await response.json();

    const features =
      Array.isArray(data.features)
        ? data.features
        : [];

    // Remove expired alerts
    const now = Date.now();

    const activeAlerts = features.filter(feature => {
      const p = feature.properties || {};

      if (!p.expiration_datetime) {
        return true;
      }

      const expiry =
        new Date(
          p.expiration_datetime
        ).getTime();

      return (
        Number.isNaN(expiry) ||
        expiry > now
      );
    });


    // -----------------------------
    // UPDATE MAP
    // -----------------------------

    if (alertLayer) {
      alertLayer.clearLayers();

      if (activeAlerts.length > 0) {
        alertLayer.addData({
          type: "FeatureCollection",
          features: activeAlerts
        });

        const bounds =
          alertLayer.getBounds();

        if (bounds.isValid()) {
          map.fitBounds(bounds, {
            padding: [20, 20],
            maxZoom: 7
          });
        }
      } else {
        map.setView(
          [56.1304, -106.3468],
          4
        );
      }
    }


    // -----------------------------
    // UPDATE STATUS
    // -----------------------------

    const status =
      document.querySelector(".status");

    if (status) {
      if (activeAlerts.length === 0) {
        status.textContent =
          "● No active weather alerts";

        status.style.color =
          "#2e7d32";
      } else {
        status.textContent =
          `● ${activeAlerts.length} active weather alert${
            activeAlerts.length === 1
              ? ""
              : "s"
          }`;

        status.style.color =
          "#b3261e";
      }
    }


    // -----------------------------
    // UPDATE ALERT CARDS
    // -----------------------------

    if (!alertBox) {
      return;
    }

    if (activeAlerts.length === 0) {

      alertBox.innerHTML = `
        <div class="alert-card no-alerts">
          <h3>No Active Alerts</h3>
          <p>
            Environment and Climate Change Canada
            is not currently reporting active alerts.
          </p>
        </div>
      `;

      return;
    }


    alertBox.innerHTML =
      activeAlerts
        .map(createAlertCard)
        .join("");


    // -----------------------------
    // DETAILS BUTTONS
    // -----------------------------

    document
      .querySelectorAll(".details-button")
      .forEach(button => {

        button.addEventListener(
          "click",
          function () {

            const target =
              document.getElementById(
                this.dataset.target
              );

            if (!target) {
              return;
            }

            target.classList.toggle(
              "hidden"
            );

            this.textContent =
              target.classList.contains("hidden")
                ? "View Details"
                : "Hide Details";
          }
        );

      });


  } catch (error) {

    console.error(
      "ECCC alert error:",
      error
    );

    if (alertBox) {
      alertBox.innerHTML = `
        <div class="alert-card">
          <h3>Unable to load alerts</h3>
          <p>
            The live ECCC alert service could not
            be reached right now.
          </p>
          <button
            class="details-button"
            onclick="loadAlerts()">
            Try Again
          </button>
        </div>
      `;
    }
  }
}


// ======================================================
// CREATE ALERT CARD
// ======================================================

function createAlertCard(feature, index) {
  const p = feature.properties || {};

  const name =
    p.alert_name_en ||
    p.alert_short_name_en ||
    p.alert_type ||
    "Weather Alert";

  const area =
    p.feature_name_en ||
    "Canadian area";

  const type =
    p.alert_type ||
    "Weather Alert";

  const risk =
    p.risk_colour_en ||
    "Not specified";

  const text =
    p.alert_text_en ||
    "No additional information available.";

  const issued =
    formatDate(
      p.publication_datetime
    );

  const expires =
    formatDate(
      p.expiration_datetime
    );

  let cardClass =
    "statement-alert";

  if (
    type.toLowerCase().includes("warning") ||
    name.toLowerCase().includes("warning")
  ) {
    cardClass = "warning-alert";
  }
  else if (
    type.toLowerCase().includes("watch") ||
    name.toLowerCase().includes("watch")
  ) {
    cardClass = "watch-alert";
  }
  else if (
    type.toLowerCase().includes("advisory")
  ) {
    cardClass = "advisory-alert";
  }

  const detailsId =
    "alert-details-" + index;

  return `
    <article class="alert-card ${cardClass}">

      <div class="alert-header">

        <div>
          <h3>
            ${escapeHTML(name)}
          </h3>

          <strong>
            ${escapeHTML(area)}
          </strong>
        </div>

        <span class="badge">
          ${escapeHTML(type)}
        </span>

      </div>

      <div class="alert-content">

        <p>
          <strong>Risk:</strong>
          ${escapeHTML(risk)}
        </p>

        <button
          class="details-button"
          data-target="${detailsId}">
          View Details
        </button>

        <div
          id="${detailsId}"
          class="hidden">

          <hr>

          <p>
            <strong>Issued:</strong>
            ${escapeHTML(issued)}
          </p>

          <p>
            <strong>Expires:</strong>
            ${escapeHTML(expires)}
          </p>

          <p>
            <strong>Details:</strong><br>
            ${escapeHTML(text)}
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


// ======================================================
// DATE FORMAT
// ======================================================

function formatDate(value) {
  if (!value) {
    return "Not provided";
  }

  const date =
    new Date(value);

  if (
    Number.isNaN(
      date.getTime()
    )
  ) {
    return value;
  }

  return date.toLocaleString(
    "en-CA",
    {
      dateStyle: "medium",
      timeStyle: "short"
    }
  );
}


// ======================================================
// HTML SAFETY
// ======================================================

function escapeHTML(value) {
  return String(value ?? "")
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#039;");
}


// ======================================================
// START EVERYTHING
// ======================================================

document.addEventListener(
  "DOMContentLoaded",
  function () {

    startMap();

    loadAlerts();

    // Refresh every 5 minutes
    setInterval(
      loadAlerts,
      5 * 60 * 1000
    );

  }
);
