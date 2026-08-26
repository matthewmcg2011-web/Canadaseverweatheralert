// ============================================================
// CANADA SEVERE WEATHER ALERTS
// ECCC GeoMet + Leaflet
// ============================================================

var ECCC_ALERTS_API =
    'https://api.weather.gc.ca/collections/weather-alerts/items?f=geojson&limit=500';

var map = null;

var warningLayer = null;
var watchLayer = null;
var advisoryLayer = null;
var otherLayer = null;

var allFeatures = [];


// ============================================================
// INITIALIZE MAP
// ============================================================

function initMap() {
    var mapElement = document.getElementById('map');

    if (!mapElement) {
        console.error('Map element not found.');
        return;
    }

    if (typeof L === 'undefined') {
        console.error('Leaflet is not loaded.');
        return;
    }

    map = L.map('map').setView(
        [56.1304, -106.3468],
        4
    );

    L.tileLayer(
        'https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png',
        {
            maxZoom: 19,
            attribution:
                '&copy; OpenStreetMap contributors'
        }
    ).addTo(map);


    // Separate layers for filtering
    warningLayer = L.layerGroup().addTo(map);
    watchLayer = L.layerGroup().addTo(map);
    advisoryLayer = L.layerGroup().addTo(map);
    otherLayer = L.layerGroup().addTo(map);

    // Create toggle controls
    createMapControls();
}


// ============================================================
// MAP TOGGLE CONTROLS
// ============================================================

function createMapControls() {

    if (!map) return;

    var control =
        L.control({ position: 'topright' });

    control.onAdd = function () {

        var div =
            L.DomUtil.create(
                'div',
                'alert-map-controls'
            );

        div.style.background = '#ffffff';
        div.style.padding = '12px';
        div.style.borderRadius = '8px';
        div.style.boxShadow =
            '0 2px 8px rgba(0,0,0,0.2)';
        div.style.fontFamily =
            'Arial, sans-serif';
        div.style.fontSize = '14px';

        div.innerHTML = `
            <strong style="display:block;margin-bottom:8px;">
                Alert Types
            </strong>

            <label style="display:block;margin-bottom:6px;">
                <input
                    type="checkbox"
                    id="toggle-warnings"
                    checked
                >
                <span style="color:#d32f2f;font-weight:bold;">
                    Warnings
                </span>
            </label>

            <label style="display:block;margin-bottom:6px;">
                <input
                    type="checkbox"
                    id="toggle-watches"
                    checked
                >
                <span style="color:#ef6c00;font-weight:bold;">
                    Watches
                </span>
            </label>

            <label style="display:block;margin-bottom:6px;">
                <input
                    type="checkbox"
                    id="toggle-advisories"
                    checked
                >
                <span style="color:#0288d1;font-weight:bold;">
                    Advisories
                </span>
            </label>

            <label style="display:block;">
                <input
                    type="checkbox"
                    id="toggle-other"
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


    // Toggle events
    setTimeout(function () {

        var warningToggle =
            document.getElementById(
                'toggle-warnings'
            );

        var watchToggle =
            document.getElementById(
                'toggle-watches'
            );

        var advisoryToggle =
            document.getElementById(
                'toggle-advisories'
            );

        var otherToggle =
            document.getElementById(
                'toggle-other'
            );


        warningToggle.addEventListener(
            'change',
            function () {

                if (this.checked) {
                    map.addLayer(
                        warningLayer
                    );
                } else {
                    map.removeLayer(
                        warningLayer
                    );
                }
            }
        );


        watchToggle.addEventListener(
            'change',
            function () {

                if (this.checked) {
                    map.addLayer(
                        watchLayer
                    );
                } else {
                    map.removeLayer(
                        watchLayer
                    );
                }
            }
        );


        advisoryToggle.addEventListener(
            'change',
            function () {

                if (this.checked) {
                    map.addLayer(
                        advisoryLayer
                    );
                } else {
                    map.removeLayer(
                        advisoryLayer
                    );
                }
            }
        );


        otherToggle.addEventListener(
            'change',
            function () {

                if (this.checked) {
                    map.addLayer(
                        otherLayer
                    );
                } else {
                    map.removeLayer(
                        otherLayer
                    );
                }
            }
        );

    }, 100);
}


// ============================================================
// LOAD ALERTS
// ============================================================

function loadAlerts() {

    var container =
        findAlertsContainer();

    fetch(
        ECCC_ALERTS_API,
        {
            cache: 'no-store'
        }
    )
    .then(function (response) {

        if (!response.ok) {
            throw new Error(
                'ECCC HTTP ' +
                response.status
            );
        }

        return response.json();
    })
    .then(function (data) {

        var features =
            data.features || [];

        allFeatures =
            removeExpiredAlerts(features);

        displayAlerts(
            allFeatures,
            container
        );

        plotAlertsOnMap(
            allFeatures
        );

        updateStatus(
            allFeatures.length
        );
    })
    .catch(function (error) {

        console.error(
            'ECCC alert error:',
            error
        );

        if (container) {

            container.innerHTML = `
                <div style="
                    padding:20px;
                    border:1px solid #ffcdd2;
                    background:#ffebee;
                    border-radius:8px;
                    margin-top:10px;
                ">

                    <h3 style="
                        margin:0 0 8px 0;
                        color:#c62828;
                    ">
                        Unable to Load Alerts
                    </h3>

                    <p style="
                        margin:0 0 12px 0;
                        color:#b71c1c;
                    ">
                        The live ECCC weather service
                        could not be reached right now.
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

function removeExpiredAlerts(features) {

    var now =
        Date.now();

    return features.filter(
        function (feature) {

            var props =
                feature.properties || {};

            var expiry =
                props.expiration_datetime ||
                props.event_end_datetime ||
                props.expires;

            if (!expiry) {
                return true;
            }

            var expirationTime =
                new Date(expiry).getTime();

            if (isNaN(expirationTime)) {
                return true;
            }

            return expirationTime > now;
        }
    );
}


// ============================================================
// FIND ALERT CONTAINER
// ============================================================

function findAlertsContainer() {

    var container =
        document.getElementById(
            'active-alerts'
        );

    if (container) {
        return container;
    }

    container =
        document.getElementById(
            'alerts-container'
        );

    if (container) {
        return container;
    }

    container =
        document.getElementById(
            'alerts-list'
        );

    if (container) {
        return container;
    }

    container =
        document.querySelector(
            '.alerts-container'
        );

    if (container) {
        return container;
    }

    return null;
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
                background:#ffffff;
                border:1px solid #e0e0e0;
                border-radius:8px;
                text-align:center;
                color:#555;
            ">

                <h3 style="
                    margin:0 0 6px 0;
                    color:#2e7d32;
                ">
                    No Active Alerts
                </h3>

                <p style="
                    margin:0;
                    font-size:0.95rem;
                ">
                    There are currently no active
                    public weather alerts issued by
                    Environment and Climate Change Canada.
                </p>

            </div>
        `;

        return;
    }


    var html = '';


    for (
        var i = 0;
        i < features.length;
        i++
    ) {

        var props =
            features[i].properties || {};


        var headline =
            props.alert_name_en ||
            props.alert_short_name_en ||
            props.headline ||
            props.event ||
            props.title ||
            'Weather Alert';


        var eventType =
            props.alert_type ||
            props.event ||
            props.event_en ||
            'Alert';


        var area =
            props.feature_name_en ||
            props.area_name ||
            props.area ||
            props.location ||
            props.name_en ||
            '';


        var description =
            props.alert_text_en ||
            props.description ||
            props.summary ||
            props.text ||
            'No additional details available.';


        var severity =
            props.risk_colour_en ||
            props.severity ||
            'Notice';


        var timeIssued =
            props.publication_datetime ||
            props.issued ||
            props.effective ||
            props.updated ||
            '';


        var expires =
            props.expiration_datetime ||
            props.event_end_datetime ||
            '';


        var badgeColor =
            getAlertColor(
                props
            );


        html += `
            <div
                class="alert-card"
                style="
                    border:1px solid #e0e0e0;
                    border-left:6px solid ${badgeColor};
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

                <div style="
                    display:flex;
                    justify-content:space-between;
                    align-items:flex-start;
                    gap:10px;
                    margin-bottom:8px;
                ">

                    <h3 style="
                        margin:0;
                        font-size:1.1rem;
                        color:#111;
                        font-weight:600;
                    ">
                        ${escapeHtml(
                            headline
                        )}
                    </h3>

                    <span style="
                        background:${badgeColor};
                        color:#fff;
                        font-size:0.72rem;
                        font-weight:bold;
                        padding:4px 8px;
                        border-radius:4px;
                        white-space:nowrap;
                        text-transform:uppercase;
                    ">
                        ${escapeHtml(
                            eventType
                        )}
                    </span>

                </div>


                <div style="
                    font-size:0.85rem;
                    color:#666;
                    margin-bottom:10px;
                ">

                    ${
                        area
                            ? '<strong>Area:</strong> ' +
                              escapeHtml(area)
                            : ''
                    }

                    ${
                        area && timeIssued
                            ? ' &bull; '
                            : ''
                    }

                    ${
                        timeIssued
                            ? '<strong>Issued:</strong> ' +
                              escapeHtml(
                                  formatDate(
                                      timeIssued
                                  )
                              )
                            : ''
                    }

                </div>


                <div style="
                    font-size:0.92rem;
                    color:#333;
                    line-height:1.5;
                    white-space:pre-line;
                ">
                    ${escapeHtml(
                        description
                    )}
                </div>


                <div style="
                    margin-top:12px;
                    font-size:0.85rem;
                    color:#666;
                ">

                    ${
                        expires
                            ? '<strong>Expires:</strong> ' +
                              escapeHtml(
                                  formatDate(
                                      expires
                                  )
                              )
                            : ''
                    }

                    ${
                        severity
                            ? '<br><strong>Risk:</strong> ' +
                              escapeHtml(
                                  severity
                              )
                            : ''
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

        var props =
            feature.properties || {};


        var category =
            getAlertCategory(
                props
            );


        var layer =
            L.geoJSON(
                feature,
                {
                    style:
                        function () {

                            var color =
                                getAlertColor(
                                    props
                                );

                            return {
                                color: color,
                                weight: 2,
                                opacity: 0.9,
                                fillColor: color,
                                fillOpacity: 0.3
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
                                p.alert_short_name_en ||
                                p.headline ||
                                p.event ||
                                'Weather Alert';


                            var area =
                                p.feature_name_en ||
                                p.area_name ||
                                p.area ||
                                p.location ||
                                '';


                            var expires =
                                p.expiration_datetime ||
                                p.event_end_datetime ||
                                '';


                            featureLayer.bindPopup(`
                                <div style="
                                    min-width:220px;
                                ">

                                    <strong>
                                        ${escapeHtml(
                                            title
                                        )}
                                    </strong>

                                    ${
                                        area
                                            ? '<br><br><strong>Area:</strong> ' +
                                              escapeHtml(
                                                  area
                                              )
                                            : ''
                                    }

                                    ${
                                        expires
                                            ? '<br><strong>Expires:</strong> ' +
                                              escapeHtml(
                                                  formatDate(
                                                      expires
                                                  )
                                              )
                                            : ''
                                    }

                                </div>
                            `);

                        }
                }
            );


        if (
            category ===
            'warning'
        ) {

            layer.addTo(
                warningLayer
            );

        } else if (
            category ===
            'watch'
        ) {

            layer.addTo(
                watchLayer
            );

        } else if (
            category ===
            'advisory'
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

        } catch (e) {
            console.warn(
                'Unable to calculate alert bounds.',
                e
            );
        }
    }


    // Zoom to active alert areas
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


    setTimeout(
        function () {
            map.invalidateSize();
        },
        300
    );
}


// ============================================================
// DETERMINE ALERT CATEGORY
// ============================================================

function getAlertCategory(
    props
) {

    var text = (
        String(
            props.alert_type || ''
        ) +
        ' ' +
        String(
            props.alert_name_en || ''
        ) +
        ' ' +
        String(
            props.alert_short_name_en || ''
        ) +
        ' ' +
        String(
            props.event || ''
        ) +
        ' ' +
        String(
            props.headline || ''
        )
    ).toLowerCase();


    if (
        text.indexOf(
            'warning'
        ) !== -1
    ) {
        return 'warning';
    }


    if (
        text.indexOf(
            'watch'
        ) !== -1
    ) {
        return 'watch';
    }


    if (
        text.indexOf(
            'advisory'
        ) !== -1 ||
        text.indexOf(
            'statement'
        ) !== -1
    ) {
        return 'advisory';
    }


    return 'other';
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
        'warning'
    ) {
        return '#d32f2f';
    }


    if (
        category ===
        'watch'
    ) {
        return '#ef6c00';
    }


    if (
        category ===
        'advisory'
    ) {
        return '#0288d1';
    }


    return '#757575';
}


// ============================================================
// STATUS
// ============================================================

function updateStatus(
    count
) {

    var statusElement =
        document.querySelector(
            '.status'
        );


    if (!statusElement) {
        return;
    }


    if (count === 0) {

        statusElement.textContent =
            '● No active weather alerts';

        statusElement.style.color =
            '#2e7d32';

    } else {

        statusElement.textContent =
            '● ' +
            count +
            ' active weather alert' +
            (
                count === 1
                    ? ''
                    : 's'
            );

        statusElement.style.color =
            '#b3261e';
    }
}


// ============================================================
// DATE FORMAT
// ============================================================

function formatDate(
    dateStr
) {

    try {

        var d =
            new Date(
                dateStr
            );


        if (
            isNaN(
                d.getTime()
            )
        ) {
            return dateStr;
        }


        return d.toLocaleString(
            'en-CA',
            {
                dateStyle:
                    'medium',
                timeStyle:
                    'short'
            }
        );

    } catch (e) {

        return dateStr;
    }
}


// ============================================================
// HTML ESCAPING
// ============================================================

function escapeHtml(
    str
) {

    if (
        str === null ||
        str === undefined
    ) {
        return '';
    }


    return String(str)
        .replace(
            /&/g,
            '&amp;'
        )
        .replace(
            /</g,
            '&lt;'
        )
        .replace(
            />/g,
            '&gt;'
        )
        .replace(
            /"/g,
            '&quot;'
        )
        .replace(
            /'/g,
            '&#039;'
        );
}


// ============================================================
// START APPLICATION
// ============================================================

document.addEventListener(
    'DOMContentLoaded',
    function () {

        initMap();

        loadAlerts();


        // Refresh live data
        // every 5 minutes.
        setInterval(
            loadAlerts,
            5 * 60 * 1000
        );

    }
);
