// ============================================================
// Canada Severe Weather Alerts
// Live Environment and Climate Change Canada (ECCC) data
// ============================================================

const ALERT_API =
  "https://api.weather.gc.ca/collections/weather-alerts/items?f=geojson&limit=1000";

let alertMap = null;
let alertLayer = null;


// ============================================================
// MAP
// ============================================================

function initializeMap() {
  const mapElement = document.getElementById("map");

  if (!mapElement || typeof L === "undefined") {
    console.error("Map element or Leaflet was not found.");
    return;
  }

  alertMap = L.map("map", {
    zoomControl: true
  }).setView([56.1304, -106.3468], 4);

  L.tileLayer(
    "https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png",
    {
      maxZoom: 18,
      attribution: "&copy; OpenStreetMap contributors"
    }
  ).addTo(alertMap);

  alertLayer = L.geoJSON(null, {
    style: feature => getAlertStyle(feature.properties || {}),

    onEachFeature: (feature, layer) => {
      const p = feature.properties || {};

      const name =
        p.alert_name_en ||
        p.alert_short_name_en ||
        p.alert_type ||
        "Weather Alert";

      const area =
        p.feature_name_en ||
        "Canadian location";

      const type =
        p.alert_type ||
        "Weather Alert";

      const expires =
        formatDate(
          p.expiration_datetime ||
          p.event_end_datetime
        );

      layer.bindPopup(`
        <div style="min-width:220px;">
          <strong>${escapeHTML(name)}</strong>
          <br><br>
          <strong>Type:</strong> ${escapeHTML(type)}
          <br>
          <strong>Area:</strong> ${escapeHTML(area)}
          <br>
          <strong>Expires:</strong> ${escapeHTML(expires)}
        </div>
      `);
    }
  }).addTo(alertMap);
}


// ============================================================
// ALERT COLOURS
// ============================================================

function getAlertStyle(properties) {
  const type = String(
    properties.alert_type || ""
  ).toLowerCase();

  const name = String(
    properties.alert_name_en || ""
  ).toLowerCase();

  const risk = String(
    properties.risk_colour_en || ""
  ).toLowerCase();


  // Severe warnings
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


  // Watches
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


  // Orange risk
  if (risk.includes("orange")) {
    return {
      color: "#e65100",
      weight: 2,
      fillColor: "#fb8c00",
      fillOpacity: 0.35
    };
  }


  // Yellow risk
  if (risk.includes("yellow")) {
    return {
      color: "#f9a825",
      weight: 2,
      fillColor: "#fdd835",
      fillOpacity: 0.30
    };
  }


  // Advisories / statements / other
  return {
    color: "#1565c0",
    weight: 2,
    fillColor: "#42a5f5",
    fillOpacity: 0.25
  };
}


// ============================================================
// LOAD LIVE ALERTS
// ============================================================

async function loadAlerts() {

  const alertsContainer =
    document.querySelector(".alerts");

  if (!alertsContainer) {
    console.error("Alerts container was not found.");
    return;
  }


  try {

    const response = await fetch(ALERT_API, {
      cache: "no-store"
    });


    if (!response.ok) {
      throw new Error(
        `ECCC returned HTTP ${response.status}`
      );
    }


    const data = await response.json();

    const features =
      Array.isArray(data.features)
        ? data.features
        : [];


    // --------------------------------------------------------
    // Remove expired alerts
    // --------------------------------------------------------

    const now = Date.now();

    const activeAlerts = features.filter(feature => {

      const p = feature.properties || {};

      if (!p.expiration_datetime) {
        return true;
      }

      const expiration =
        new Date(
          p.expiration_datetime
        ).getTime();

      return (
        Number.isNaN(expiration) ||
        expiration > now
      );
    });


    // --------------------------------------------------------
    // CLEAR MAP
    // --------------------------------------------------------

    if (alertLayer) {
      alertLayer.clearLayers();
    }


    // --------------------------------------------------------
    // ADD LIVE ALERT AREAS TO MAP
    // --------------------------------------------------------

    if (
      alertLayer &&
      activeAlerts.length > 0
    ) {

      alertLayer.addData({
        type: "FeatureCollection",
        features: activeAlerts
      });

      fitMapToAlerts(activeAlerts);
    }


    // --------------------------------------------------------
    // NO ALERTS
    // --------------------------------------------------------

    if (activeAlerts.length === 0) {

      alertsContainer.innerHTML = `
        <div class="alert-card no-alerts">

          <h3>No Active Alerts</h3>

          <p>
            Environment and Climate Change Canada
            is not currently reporting any active
            weather alerts in this feed.
          </p>

        </div>
      `;

      updateStatus(0);

      return;
    }


    // --------------------------------------------------------
    // SORT ALERTS
    // --------------------------------------------------------

    activeAlerts.sort(
      (a, b) =>
        severityScore(b.properties || {}) -
        severityScore(a.properties || {})
    );


    // --------------------------------------------------------
    // CREATE ALERT CARDS
    // --------------------------------------------------------

    alertsContainer.innerHTML =
      activeAlerts
        .map((feature, index) =>
          createAlertCard(feature, index)
        )
        .join("");


    updateStatus(
      activeAlerts.length
    );


    // --------------------------------------------------------
    // DETAILS BUTTONS
    // --------------------------------------------------------

    document
      .querySelectorAll(".details-button")
      .forEach(button => {

        button.addEventListener(
          "click",
          () => {

            const details =
              document.getElementById(
                button.dataset.target
              );

            if (!details) {
              return;
            }

            const hidden =
              details.classList.toggle(
                "hidden"
              );

            button.textContent =
              hidden
                ? "View Details"
                : "Hide Details";
          }
        );

      });


  } catch (error) {

    console.error(
      "Unable to load ECCC alerts:",
      error
    );


    alertsContainer.innerHTML = `
      <div class="alert-card">

        <div class="alert-header">

          <h3>
            Alert Data Unavailable
          </h3>

          <span class="badge">
            ERROR
          </span>

        </div>

        <div class="alert-content">

          <p>
            The live Environment and Climate
            Change Canada alert feed could not
            be reached right now.
          </p>

          <button
            class="details-button"
            onclick="loadAlerts()"
          >
            Try Again
          </button>

        </div>

      </div>
    `;
  }
}


// ============================================================
// FIT MAP TO ACTIVE ALERTS
// ============================================================

function fitMapToAlerts(features) {

  if (!alertMap || !alertLayer) {
    return;
  }


  const bounds =
    alertLayer.getBounds();


  if (bounds.isValid()) {

    alertMap.fitBounds(bounds, {
      padding: [30, 30],
      maxZoom: 7
    });

  } else {

    alertMap.setView(
      [56.1304, -106.3468],
      4
    );

  }
}


// ============================================================
// ALERT CARD
// ============================================================

function createAlertCard(feature, index) {

  const p = feature.properties || {};


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
    "Weather Alert";


  const status =
    p.status_en ||
    "Active";


  const riskColour =
    p.risk_colour_en ||
    "Not specified";


  const alertText =
    p.alert_text_en ||
    "No additional information was provided.";


  const impact =
    p.impact_en ||
    "Not specified";


  const issued =
    formatDate(
      p.publication_datetime
    );


  const expires =
    formatDate(
      p.expiration_datetime ||
      p.event_end_datetime
    );


  const detailsId =
    `alert-details-${index}`;


  const cardClass =
    getCardClass(p);


  return `

    <article
      class="alert-card ${cardClass}"
    >

      <div class="alert-header">

        <div>

          <h3>
            ${escapeHTML(alertName)}
          </h3>

          <strong>
            ${escapeHTML(area)}
          </strong>

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
          <strong>Risk:</strong>
          ${escapeHTML(riskColour)}
        </p>


        <button
          class="details-button"
          data-target="${detailsId}"
        >
          View Details
        </button>


        <div
          id="${detailsId}"
          class="hidden"
        >

          <hr>

          <p>
            <strong>Alert:</strong>
            ${escapeHTML(alertName)}
          </p>


          <p>
            <strong>Area:</strong>
            ${escapeHTML(area)}
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


// ============================================================
// SEVERITY
// ============================================================

function severityScore(properties) {

  const type =
    String(
      properties.alert_type || ""
    ).toLowerCase();


  const name =
    String(
      properties.alert_name_en || ""
    ).toLowerCase();


  const risk =
    String(
      properties.risk_colour_en || ""
    ).toLowerCase();


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
    risk.includes("orange")
  ) {
    return 3;
  }


  if (
    risk.includes("yellow")
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


// ============================================================
// CARD TYPE
// ============================================================

function getCardClass(properties) {

  const type =
    String(
      properties.alert_type || ""
    ).toLowerCase();


  const name =
    String(
      properties.alert_name_en || ""
    ).toLowerCase();


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


// ============================================================
// STATUS
// ============================================================

function updateStatus(count) {

  const statusElement =
    document.querySelector(".status");


  if (!statusElement) {
    return;
  }


  if (count === 0) {

    statusElement.textContent =
      "● No active weather alerts";

    statusElement.style.color =
      "#2e7d32";

    return;
  }


  statusElement.textContent =
    `● ${count} active weather alert${
      count === 1 ? "" : "s"
    }`;

  statusElement.style.color =
    "#b3261e";
}


// ============================================================
// DATE
// ============================================================

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


// ============================================================
// SECURITY
// ============================================================

function escapeHTML(value) {

  return String(
    value ?? ""
  )
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#039;");
}


// ============================================================
// START
// ============================================================

document.addEventListener(
  "DOMContentLoaded",
  () => {

    initializeMap();

    loadAlerts();

    // Refresh every 5 minutes.
    setInterval(
      loadAlerts,
      5 * 60 * 1000
    );

  }
);
