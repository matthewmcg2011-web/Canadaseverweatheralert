// ============================================================
// CANADA SEVERE WEATHER ALERTS
// ECCC GeoMet + Leaflet
// ============================================================

console.log("NEW alerts.js is loaded");

var ECCC_ALERTS_API =
    "https://api.weather.gc.ca/collections/weather-alerts/items?f=geojson&limit=500";

var map = null;

var warningLayer = null;
var watchLayer = null;
var advisoryLayer = null;
var otherLayer = null;


// ============================================================
// INITIALIZE MAP
// ============================================================

function initMap() {

    var mapElement =
        document.getElementById("map");

    if (!mapElement) {
        console.error("Map element #map was not found.");
        return;
    }

    if (typeof L === "undefined") {
        console.error("Leaflet is not loaded.");
        return;
    }

    map = L.map("map").setView(
        [56.1304, -106.3468],
        4
    );

    L.tileLayer(
        "https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png",
        {
            maxZoom: 19,
            attribution:
                "&copy; OpenStreetMap contributors"
        }
    ).addTo(map);


    warningLayer =
        L.layerGroup().addTo(map);

    watchLayer =
        L.layerGroup().addTo(map);

    advisoryLayer =
        L.layerGroup().addTo(map);

    otherLayer =
        L.layerGroup().addTo(map);


    createMapControls();


    setTimeout(function () {
        map.invalidateSize();
    }, 500);
}


// ============================================================
// MAP CONTROLS
// ============================================================

function createMapControls() {

    var control =
        L.control({
            position: "topright"
        });


    control.onAdd = function () {

        var div =
            L.DomUtil.create(
                "div",
                "alert-map-controls"
            );


        div.style.background =
            "#ffffff";

        div.style.padding =
            "12px";

        div.style.borderRadius =
            "8px";

        div.style.boxShadow =
            "0 2px 8px rgba(0,0,0,0.25)";

        div.style.fontFamily =
            "Arial, sans-serif";


        div.innerHTML = `
            <strong
                style="
                    display:block;
                    margin-bottom:9px;
                "
            >
                Alert Types
            </strong>

            <label
                style="
                    display:block;
                    margin-bottom:7px;
                    cursor:pointer;
                "
            >
                <input
                    id="toggle-warnings"
                    type="checkbox"
                    checked
                >
                <span
                    style="
                        color:#d32f2f;
                        font-weight:bold;
                    "
                >
                    Warnings
                </span>
            </label>

            <label
                style="
                    display:block;
                    margin-bottom:7px;
                    cursor:pointer;
                "
            >
                <input
                    id="toggle-watches"
                    type="checkbox"
                    checked
                >
                <span
                    style="
                        color:#ef6c00;
                        font-weight:bold;
                    "
                >
                    Watches
                </span>
            </label>

            <label
                style="
                    display:block;
                    margin-bottom:7px;
                    cursor:pointer;
                "
            >
                <input
                    id="toggle-advisories"
                    type="checkbox"
                    checked
                >
                <span
                    style="
                        color:#0288d1;
                        font-weight:bold;
                    "
                >
                    Advisories
                </span>
            </label>

            <label
                style="
                    display:block;
                    cursor:pointer;
                "
            >
                <input
                    id="toggle-other"
                    type="checkbox"
                    checked
                >
                Other
            </label>
        `;


        L.DomEvent.disableClickPropagation(
            div
        );

        L.DomEvent.disableScrollPropagation(
            div
        );


        return div;
    };


    control.addTo(map);


    setTimeout(function () {

        setupToggle(
            "toggle-warnings",
            warningLayer
        );

        setupToggle(
            "toggle-watches",
            watchLayer
        );

        setupToggle(
            "toggle-advisories",
            advisoryLayer
        );

        setupToggle(
            "toggle-other",
            otherLayer
        );

    }, 100);
}


// ============================================================
// TOGGLE SETUP
// ============================================================

function setupToggle(
    id,
    layer
) {

    var checkbox =
        document.getElementById(id);

    if (!checkbox) {
        return;
    }


    checkbox.addEventListener(
        "change",
        function () {

            if (this.checked) {

                map.addLayer(layer);

            } else {

                map.removeLayer(layer);
            }
        }
    );
}


// ============================================================
// LOAD ECCC ALERTS
// ============================================================

function loadAlerts() {

    var container =
        document.getElementById(
            "active-alerts"
        );


    if (!container) {

        console.error(
            "The #active-alerts element was not found."
        );
    }


    fetch(
        ECCC_ALERTS_API,
        {
            cache: "no-store"
        }
    )
    .then(function (response) {

        if (!response.ok) {

            throw new Error(
                "ECCC returned HTTP " +
                response.status
            );
        }


        return response.json();
    })
    .then(function (data) {

        console.log(
            "ECCC data received:",
            data
        );


        var features =
            Array.isArray(
                data.features
            )
                ? data.features
                : [];


        console.log(
            "ECCC alert count:",
            features.length
        );


        var activeFeatures =
            removeExpiredAlerts(
                features
            );


        console.log(
            "Active alert count:",
            activeFeatures.length
        );


        displayAlerts(
            activeFeatures,
            container
        );


        plotAlertsOnMap(
            activeFeatures
        );


        updateStatus(
            activeFeatures.length
        );
    })
    .catch(function (error) {

        console.error(
            "ECCC alert error:",
            error
        );


        if (container) {

            container.innerHTML = `
                <div
                    style="
                        padding:20px;
                        border:1px solid #ffcdd2;
                        background:#ffebee;
                        border-radius:8px;
                    "
                >

                    <h3
                        style="
                            margin:0 0 8px 0;
                            color:#c62828;
                        "
                    >
                        Unable to Load Alerts
                    </h3>

                    <p
                        style="
                            margin:0 0 12px 0;
                            color:#b71c1c;
                        "
                    >
                        The live ECCC weather service
                        could not be reached.
                    </p>

                    <button
                        onclick="loadAlerts()"
                        style="
                            padding:8px 16px;
                            background:#d32f2f;
                            color:white;
                            border:none;
                            border-radius:4px;
                            cursor:pointer;
                            font-weight:bold;
                        "
                    >
                        Try Again
                    </button>

                </div>
            `;
        }
    });
}


// ============================================================
// REMOVE EXPIRED ALERTS
// ============================================================

function removeExpiredAlerts(
    features
) {

    var now =
        Date.now();


    return features.filter(
        function (feature) {

            var p =
                feature.properties || {};


            var expiry =
                p.expiration_datetime;


            if (!expiry) {
                return true;
            }


            var expiryTime =
                new Date(
                    expiry
                ).getTime();


            if (isNaN(expiryTime)) {
                return true;
            }


            return expiryTime > now;
        }
    );
}


// ============================================================
// DISPLAY ALERTS
// ============================================================

function displayAlerts(
    features,
    container
) {

    if (!container) {
        return;
    }


    if (
        !features ||
        features.length === 0
    ) {

        container.innerHTML = `
            <div
                style="
                    padding:20px;
                    background:#ffffff;
                    border:1px solid #e0e0e0;
                    border-radius:8px;
                    text-align:center;
                "
            >

                <h3
                    style="
                        margin:0 0 6px 0;
                        color:#2e7d32;
                    "
                >
                    No Active Alerts
                </h3>

                <p
                    style="
                        margin:0;
                        color:#555;
                    "
                >
                    There are currently no active
                    public weather alerts from
                    Environment and Climate Change Canada.
                </p>

            </div>
        `;

        return;
    }


    var html = "";


    for (
        var i = 0;
        i < features.length;
        i++
    ) {

        var p =
            features[i].properties || {};


        // ECCC official fields
        var alertName =
            p.alert_name_en ||
            "Weather Alert";


        var shortName =
            p.alert_short_name_en ||
            "";


        var alertType =
            p.alert_type ||
            "Alert";


        var area =
            p.feature_name_en ||
            "Canadian location";


        var description =
            p.alert_text_en ||
            "No additional details available for this alert.";


        var impact =
            p.impact_en ||
            "";


        var risk =
            p.risk_colour_en ||
            "";


        var status =
            p.status_en ||
            "";


        var province =
            p.province ||
            "";


        var issued =
            p.publication_datetime ||
            "";


        var expires =
            p.expiration_datetime ||
            "";


        var color =
            getAlertColor(
                p
            );


        html += `
            <div
                class="alert-card"
                style="
                    border:1px solid #e0e0e0;
                    border-left:6px solid ${color};
                    border-radius:8px;
                    padding:18px;
                    margin-bottom:16px;
                    background:#ffffff;
                    box-shadow:
                        0 2px 5px
                        rgba(0,0,0,0.05);
                    text-align:left;
                "
            >

                <div
                    style="
                        display:flex;
                        justify-content:space-between;
                        align-items:flex-start;
                        gap:12px;
                        margin-bottom:10px;
                    "
                >

                    <div>

                        <h3
                            style="
                                margin:0;
                                font-size:1.15rem;
                                color:#111;
                            "
                        >
                            ${escapeHtml(alertName)}
                        </h3>

                        ${
                            shortName
                                ? `
                                    <div
                                        style="
                                            margin-top:3px;
                                            color:#666;
                                            font-size:0.85rem;
                                        "
                                    >
                                        ${escapeHtml(shortName)}
                                    </div>
                                  `
                                : ""
                        }

                    </div>


                    <span
                        style="
                            background:${color};
                            color:#ffffff;
                            padding:5px 9px;
                            border-radius:5px;
                            font-size:0.72rem;
                            font-weight:bold;
                            white-space:nowrap;
                        "
                    >
                        ${escapeHtml(alertType)}
                    </span>

                </div>


                <div
                    style="
                        color:#555;
                        font-size:0.9rem;
                        margin-bottom:12px;
                    "
                >

                    ${
                        area
                            ? `
                                <strong>Area:</strong>
                                ${escapeHtml(area)}
                              `
                            : ""
                    }

                    ${
                        province
                            ? `
                                ${
                                    area
                                        ? " &bull; "
                                        : ""
                                }
                                <strong>Province:</strong>
                                ${escapeHtml(province)}
                              `
                            : ""
                    }

                </div>


                <div
                    style="
                        color:#222;
                        font-size:0.95rem;
                        line-height:1.6;
                        white-space:pre-line;
                    "
                >
                    ${escapeHtml(description)}
                </div>


                <div
                    style="
                        margin-top:14px;
                        padding-top:12px;
                        border-top:1px solid #eeeeee;
                        color:#666;
                        font-size:0.85rem;
                        line-height:1.6;
                    "
                >

                    ${
                        risk
                            ? `
                                <strong>Risk:</strong>
                                ${escapeHtml(risk)}
                                <br>
                              `
                            : ""
                    }

                    ${
                        status
                            ? `
                                <strong>Status:</strong>
                                ${escapeHtml(status)}
                                <br>
                              `
                            : ""
                    }

                    ${
                        impact
                            ? `
                                <strong>Impact:</strong>
                                ${escapeHtml(impact)}
                                <br>
                              `
                            : ""
                    }

                    ${
                        issued
                            ? `
                                <strong>Issued:</strong>
                                ${escapeHtml(
                                    formatDate(issued)
                                )}
                                <br>
                              `
                            : ""
                    }

                    ${
                        expires
                            ? `
                                <strong>Expires:</strong>
                                ${escapeHtml(
                                    formatDate(expires)
                                )}
                              `
                            : ""
                    }

                </div>

            </div>
        `;
    }


    container.innerHTML =
        html;
}


// ============================================================
// PLOT ALERTS ON MAP
// ============================================================

function plotAlertsOnMap(
    features
) {

    if (!map) {
        return;
    }


    warningLayer.clearLayers();
    watchLayer.clearLayers();
    advisoryLayer.clearLayers();
    otherLayer.clearLayers();


    var bounds =
        L.latLngBounds([]);


    for (
        var i = 0;
        i < features.length;
        i++
    ) {

        var feature =
            features[i];


        var properties =
            feature.properties || {};


        var category =
            getAlertCategory(
                properties
            );


        var color =
            getAlertColor(
                properties
            );


        var alertLayer =
            L.geoJSON(
                feature,
                {
                    style:
                        function () {

                            return {
                                color: color,
                                weight: 2,
                                opacity: 0.95,
                                fillColor: color,
                                fillOpacity: 0.30
                            };
                        },


                    onEachFeature:
                        function (
                            feature,
                            layer
                        ) {

                            var p =
                                feature.properties ||
                                {};


                            var title =
                                p.alert_name_en ||
                                "Weather Alert";


                            var area =
                                p.feature_name_en ||
                                "";


                            var alertType =
                                p.alert_type ||
                                "";


                            var description =
                                p.alert_text_en ||
                                "";


                            var expires =
                                p.expiration_datetime ||
                                "";


                            layer.bindPopup(`
                                <div
                                    style="
                                        min-width:240px;
                                        max-width:320px;
                                    "
                                >

                                    <h3
                                        style="
                                            margin:0 0 8px 0;
                                        "
                                    >
                                        ${escapeHtml(title)}
                                    </h3>


                                    ${
                                        alertType
                                            ? `
                                                <strong>
                                                    Type:
                                                </strong>
                                                ${escapeHtml(
                                                    alertType
                                                )}
                                                <br>
                                              `
                                            : ""
                                    }


                                    ${
                                        area
                                            ? `
                                                <strong>
                                                    Area:
                                                </strong>
                                                ${escapeHtml(
                                                    area
                                                )}
                                                <br>
                                              `
                                            : ""
                                    }


                                    ${
                                        expires
                                            ? `
                                                <strong>
                                                    Expires:
                                                </strong>
                                                ${escapeHtml(
                                                    formatDate(
                                                        expires
                                                    )
                                                )}
                                                <br>
                                              `
                                            : ""
                                    }


                                    ${
                                        description
                                            ? `
                                                <hr>
                                                <div
                                                    style="
                                                        line-height:1.45;
                                                        max-height:180px;
                                                        overflow:auto;
                                                    "
                                                >
                                                    ${escapeHtml(
                                                        description
                                                    )}
                                                </div>
                                              `
                                            : ""
                                    }

                                </div>
                            `);
                        }
                }
            );


        if (
            category ===
            "warning"
        ) {

            alertLayer.addTo(
                warningLayer
            );

        } else if (
            category ===
            "watch"
        ) {

            alertLayer.addTo(
                watchLayer
            );

        } else if (
            category ===
            "advisory"
        ) {

            alertLayer.addTo(
                advisoryLayer
            );

        } else {

            alertLayer.addTo(
                otherLayer
            );
        }


        try {

            var layerBounds =
                alertLayer.getBounds();


            if (
                layerBounds &&
                layerBounds.isValid()
            ) {

                bounds.extend(
                    layerBounds
                );
            }

        } catch (e) {

            console.warn(
                "Could not calculate alert bounds.",
                e
            );
        }
    }


    if (
        bounds.isValid()
    ) {

        map.fitBounds(
            bounds,
            {
                padding: [
                    25,
                    25
                ],
                maxZoom: 7
            }
        );

    } else {

        map.setView(
            [56.1304, -106.3468],
            4
        );
    }


    setTimeout(function () {
        map.invalidateSize();
    }, 300);
}


// ============================================================
// ALERT CATEGORY
// ============================================================

function getAlertCategory(
    props
) {

    var type =
        String(
            props.alert_type ||
            ""
        ).toLowerCase();


    if (
        type ===
        "warning"
    ) {
        return "warning";
    }


    if (
        type ===
        "watch"
    ) {
        return "watch";
    }


    if (
        type ===
        "advisory" ||
        type ===
        "statement"
    ) {
        return "advisory";
    }


    return "other";
}


// ============================================================
// ALERT COLOUR
// ============================================================

function getAlertColor(
    props
) {

    var category =
        getAlertCategory(
            props
        );


    if (
        category ===
        "warning"
    ) {
        return "#d32f2f";
    }


    if (
        category ===
        "watch"
    ) {
        return "#ef6c00";
    }


    if (
        category ===
        "advisory"
    ) {
        return "#0288d1";
    }


    return "#757575";
}


// ============================================================
// STATUS
// ============================================================

function updateStatus(
    count
) {

    var status =
        document.querySelector(
            ".status"
        );


    if (!status) {
        return;
    }


    if (count === 0) {

        status.textContent =
            "● No active weather alerts";

        status.style.color =
            "#2e7d32";

    } else {

        status.textContent =
            "● " +
            count +
            " active weather alert" +
            (
                count === 1
                    ? ""
                    : "s"
            );

        status.style.color =
            "#b3261e";
    }
}


// ============================================================
// DATE FORMAT
// ============================================================

function formatDate(
    value
) {

    if (!value) {
        return "";
    }


    var date =
        new Date(
            value
        );


    if (
        isNaN(
            date.getTime()
        )
    ) {
        return value;
    }


    return date.toLocaleString(
        "en-CA",
        {
            dateStyle:
                "medium",
            timeStyle:
                "short"
        }
    );
}


// ============================================================
// HTML ESCAPING
// ============================================================

function escapeHtml(
    value
) {

    if (
        value === null ||
        value === undefined
    ) {
        return "";
    }


    return String(value)
        .replace(
            /&/g,
            "&amp;"
        )
        .replace(
            /</g,
            "&lt;"
        )
        .replace(
            />/g,
            "&gt;"
        )
        .replace(
            /"/g,
            "&quot;"
        )
        .replace(
            /'/g,
            "&#039;"
        );
}


// ============================================================
// START
// ============================================================

document.addEventListener(
    "DOMContentLoaded",
    function () {

        initMap();

        loadAlerts();


        // Refresh every 5 minutes
        setInterval(
            loadAlerts,
            5 * 60 * 1000
        );

    }
);
