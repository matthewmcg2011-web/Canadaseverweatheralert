console.log("ECCC ALERTS JS LOADED");

var ECCC_ALERTS_API =
    "https://api.weather.gc.ca/collections/weather-alerts/items?limit=100";

var map = null;

var warningLayer = null;
var watchLayer = null;
var advisoryLayer = null;
var otherLayer = null;


// ============================================================
// MAP
// ============================================================

function initMap() {

    var mapElement =
        document.getElementById("map");

    if (!mapElement) {
        console.error("Map element #map not found.");
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
                "alert-controls"
            );


        div.style.background =
            "white";

        div.style.padding =
            "12px";

        div.style.borderRadius =
            "8px";

        div.style.boxShadow =
            "0 2px 8px rgba(0,0,0,.25)";

        div.style.fontFamily =
            "Arial, sans-serif";


        div.innerHTML = `
            <strong style="
                display:block;
                margin-bottom:10px;
            ">
                Alert Types
            </strong>

            <label style="
                display:block;
                margin-bottom:7px;
                cursor:pointer;
            ">
                <input
                    id="toggle-warning"
                    type="checkbox"
                    checked
                >
                <span style="
                    color:#d32f2f;
                    font-weight:bold;
                ">
                    Warnings
                </span>
            </label>

            <label style="
                display:block;
                margin-bottom:7px;
                cursor:pointer;
            ">
                <input
                    id="toggle-watch"
                    type="checkbox"
                    checked
                >
                <span style="
                    color:#ef6c00;
                    font-weight:bold;
                ">
                    Watches
                </span>
            </label>

            <label style="
                display:block;
                margin-bottom:7px;
                cursor:pointer;
            ">
                <input
                    id="toggle-advisory"
                    type="checkbox"
                    checked
                >
                <span style="
                    color:#0288d1;
                    font-weight:bold;
                ">
                    Advisories
                </span>
            </label>

            <label style="
                display:block;
                cursor:pointer;
            ">
                <input
                    id="toggle-other"
                    type="checkbox"
                    checked
                >
                Other
            </label>
        `;


        L.DomEvent.disableClickPropagation(div);
        L.DomEvent.disableScrollPropagation(div);


        return div;
    };


    control.addTo(map);


    setTimeout(function () {

        setupToggle(
            "toggle-warning",
            warningLayer
        );

        setupToggle(
            "toggle-watch",
            watchLayer
        );

        setupToggle(
            "toggle-advisory",
            advisoryLayer
        );

        setupToggle(
            "toggle-other",
            otherLayer
        );

    }, 200);
}


// ============================================================
// TOGGLE
// ============================================================

function setupToggle(
    checkboxId,
    layer
) {

    var checkbox =
        document.getElementById(
            checkboxId
        );

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
// LOAD ALERTS
// ============================================================

function loadAlerts() {

    var container =
        document.getElementById(
            "active-alerts"
        );


    console.log(
        "REQUESTING ECCC:",
        ECCC_ALERTS_API
    );


    fetch(
        ECCC_ALERTS_API,
        {
            method: "GET",
            cache: "no-store",
            headers: {
                "Accept":
                    "application/geo+json, application/json"
            }
        }
    )
    .then(function (response) {

        console.log(
            "ECCC STATUS:",
            response.status,
            response.statusText
        );


        if (!response.ok) {

            return response.text()
                .then(function (body) {

                    throw new Error(
                        "ECCC HTTP " +
                        response.status +
                        " " +
                        response.statusText +
                        " | " +
                        body.substring(
                            0,
                            500
                        )
                    );
                });
        }


        return response.json();
    })
    .then(function (data) {

        console.log(
            "ECCC RESPONSE:",
            data
        );


        if (
            !data ||
            !Array.isArray(
                data.features
            )
        ) {

            throw new Error(
                "ECCC returned invalid GeoJSON."
            );
        }


        var features =
            data.features;


        console.log(
            "ALERT COUNT:",
            features.length
        );


        displayAlerts(
            features,
            container
        );


        plotAlertsOnMap(
            features
        );


        updateStatus(
            features.length
        );

    })
    .catch(function (error) {

        console.error(
            "ECCC ALERT LOAD FAILED:",
            error
        );


        if (!container) {
            return;
        }


        container.innerHTML = `
            <div style="
                padding:20px;
                border:1px solid #ffcdd2;
                background:#ffebee;
                border-radius:8px;
            ">

                <h3 style="
                    margin:0 0 8px 0;
                    color:#c62828;
                ">
                    Unable to Load Alerts
                </h3>

                <p style="
                    margin:0 0 10px 0;
                    color:#b71c1c;
                ">
                    The live ECCC weather service
                    could not be reached right now.
                </p>

                <pre style="
                    white-space:pre-wrap;
                    word-break:break-word;
                    font-size:12px;
                    color:#444;
                    background:#fff;
                    padding:10px;
                    border-radius:6px;
                    overflow:auto;
                ">${escapeHtml(
                    error.message ||
                    String(error)
                )}</pre>

                <button
                    onclick="loadAlerts()"
                    style="
                        padding:9px 16px;
                        background:#d32f2f;
                        color:#fff;
                        border:0;
                        border-radius:6px;
                        cursor:pointer;
                        font-weight:bold;
                    "
                >
                    Try Again
                </button>

            </div>
        `;
    });
}


// ============================================================
// DISPLAY ALERT CARDS
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
            <div style="
                padding:20px;
                text-align:center;
                background:#fff;
                border:1px solid #ddd;
                border-radius:8px;
            ">

                <h3 style="
                    color:#2e7d32;
                    margin:0 0 8px 0;
                ">
                    No Active Alerts
                </h3>

                <p style="
                    margin:0;
                    color:#555;
                ">
                    There are currently no active
                    public weather alerts from ECCC.
                </p>

            </div>
        `;

        return;
    }


    var html = "";


    features.forEach(
        function (feature) {

            var p =
                feature.properties || {};


            var name =
                p.alert_name_en ||
                "Weather Alert";


            var type =
                p.alert_type ||
                "Alert";


            var area =
                p.feature_name_en ||
                "Canadian location";


            var text =
                p.alert_text_en ||
                "No additional details are available.";


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
                getAlertColor(p);


            html += `
                <div style="
                    border:1px solid #ddd;
                    border-left:6px solid ${color};
                    border-radius:8px;
                    padding:18px;
                    margin-bottom:16px;
                    background:#fff;
                    box-shadow:
                        0 2px 6px
                        rgba(0,0,0,.05);
                ">

                    <div style="
                        display:flex;
                        justify-content:space-between;
                        align-items:flex-start;
                        gap:12px;
                    ">

                        <div>

                            <h3 style="
                                margin:0;
                                color:#111;
                                font-size:1.15rem;
                            ">
                                ${escapeHtml(name)}
                            </h3>

                            <div style="
                                margin-top:5px;
                                color:#666;
                                font-size:.9rem;
                            ">
                                ${escapeHtml(area)}
                            </div>

                        </div>


                        <span style="
                            background:${color};
                            color:#fff;
                            padding:5px 8px;
                            border-radius:5px;
                            font-size:.72rem;
                            font-weight:bold;
                            white-space:nowrap;
                        ">
                            ${escapeHtml(type)}
                        </span>

                    </div>


                    ${
                        province
                            ? `
                                <div style="
                                    margin-top:8px;
                                    font-size:.85rem;
                                    color:#666;
                                ">
                                    <strong>
                                        Province:
                                    </strong>
                                    ${escapeHtml(province)}
                                </div>
                              `
                            : ""
                    }


                    <div style="
                        margin-top:14px;
                        color:#333;
                        line-height:1.6;
                        white-space:pre-line;
                    ">
                        ${escapeHtml(text)}
                    </div>


                    ${
                        impact
                            ? `
                                <div style="
                                    margin-top:12px;
                                    color:#555;
                                    font-size:.9rem;
                                ">
                                    <strong>
                                        Impact:
                                    </strong>
                                    ${escapeHtml(impact)}
                                </div>
                              `
                            : ""
                    }


                    <div style="
                        margin-top:12px;
                        padding-top:10px;
                        border-top:1px solid #eee;
                        color:#666;
                        font-size:.82rem;
                        line-height:1.6;
                    ">

                        ${
                            risk
                                ? `
                                    <strong>
                                        Risk:
                                    </strong>
                                    ${escapeHtml(risk)}
                                    <br>
                                  `
                                : ""
                        }

                        ${
                            status
                                ? `
                                    <strong>
                                        Status:
                                    </strong>
                                    ${escapeHtml(status)}
                                    <br>
                                  `
                                : ""
                        }

                        ${
                            issued
                                ? `
                                    <strong>
                                        Issued:
                                    </strong>
                                    ${escapeHtml(
                                        formatDate(
                                            issued
                                        )
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
                                  `
                                : ""
                        }

                    </div>

                </div>
            `;
        }
    );


    container.innerHTML =
        html;
}


// ============================================================
// MAP ALERTS
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


    features.forEach(
        function (feature) {

            if (
                !feature.geometry
            ) {
                return;
            }


            var props =
                feature.properties || {};


            var category =
                getAlertCategory(
                    props
                );


            var color =
                getAlertColor(
                    props
                );


            var layer =
                L.geoJSON(
                    feature,
                    {
                        style:
                            function () {

                                return {
                                    color:
                                        color,
                                    weight:
                                        2,
                                    opacity:
                                        0.9,
                                    fillColor:
                                        color,
                                    fillOpacity:
                                        0.3
                                };
                            },


                        onEachFeature:
                            function (
                                feature,
                                featureLayer
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


                                var type =
                                    p.alert_type ||
                                    "";


                                var text =
                                    p.alert_text_en ||
                                    "";


                                featureLayer.bindPopup(
                                    `
                                    <div style="
                                        min-width:240px;
                                        max-width:320px;
                                    ">

                                        <h3 style="
                                            margin:0 0 8px 0;
                                        ">
                                            ${escapeHtml(
                                                title
                                            )}
                                        </h3>

                                        ${
                                            type
                                                ? `
                                                    <strong>
                                                        Type:
                                                    </strong>
                                                    ${escapeHtml(type)}
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
                                                    ${escapeHtml(area)}
                                                    <br>
                                                  `
                                                : ""
                                        }

                                        ${
                                            text
                                                ? `
                                                    <hr>
                                                    <div style="
                                                        line-height:1.45;
                                                        max-height:180px;
                                                        overflow:auto;
                                                    ">
                                                        ${escapeHtml(text)}
                                                    </div>
                                                  `
                                                : ""
                                        }

                                    </div>
                                    `
                                );
                            }
                    }
                );


            if (
                category ===
                "warning"
            ) {

                layer.addTo(
                    warningLayer
                );

            } else if (
                category ===
                "watch"
            ) {

                layer.addTo(
                    watchLayer
                );

            } else if (
                category ===
                "advisory"
            ) {

                layer.addTo(
                    advisoryLayer
                );

            } else {

                layer.addTo(
                    otherLayer
                );
            }


            try {

                var layerBounds =
                    layer.getBounds();


                if (
                    layerBounds &&
                    layerBounds.isValid()
                ) {

                    bounds.extend(
                        layerBounds
                    );
                }

            } catch (error) {

                console.warn(
                    "Could not calculate layer bounds.",
                    error
                );
            }

        }
    );


    if (
        bounds.isValid()
    ) {

        map.fitBounds(
            bounds,
            {
                padding:[
                    25,
                    25
                ],
                maxZoom:7
            }
        );

    } else {

        map.setView(
            [56.1304, -106.3468],
            4
        );
    }


    setTimeout(
        function () {
            map.invalidateSize();
        },
        300
    );
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


    if (
        count === 0
    ) {

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
// FORMAT DATE
// ============================================================

function formatDate(
    value
) {

    if (!value) {
        return "";
    }


    var date =
        new Date(value);


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
// ESCAPE HTML
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
