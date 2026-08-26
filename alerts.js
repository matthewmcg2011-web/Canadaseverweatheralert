// ============================================================
// CANADA SEVERE WEATHER ALERTS
// Environment and Climate Change Canada (ECCC)
// ============================================================

console.log("ECCC alerts.js loaded - categorized alert system");


// ============================================================
// ECCC API
// ============================================================

var ECCC_BASE_URL =
    "https://api.weather.gc.ca/collections/weather-alerts/items";


// ============================================================
// MAP
// ============================================================

var map = null;

var warningLayer = null;
var watchLayer = null;
var statementLayer = null;
var advisoryLayer = null;
var otherLayer = null;


// ============================================================
// FILTER STATE
// ============================================================

var activeFilters = {};


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

    statementLayer =
        L.layerGroup().addTo(map);

    advisoryLayer =
        L.layerGroup().addTo(map);

    otherLayer =
        L.layerGroup().addTo(map);


    createMapControls();


    setTimeout(
        function () {
            map.invalidateSize();
        },
        500
    );
}


// ============================================================
// MAP CONTROLS
// ============================================================

function createMapControls() {

    var control =
        L.control({
            position: "topright"
        });


    control.onAdd =
        function () {

            var div =
                L.DomUtil.create(
                    "div",
                    "alert-controls"
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

            div.style.fontSize =
                "14px";


            div.innerHTML = `
                <strong
                    style="
                        display:block;
                        margin-bottom:10px;
                    "
                >
                    Alert Types
                </strong>

                <label style="
                    display:block;
                    margin-bottom:7px;
                    cursor:pointer;
                ">
                    <input
                        id="map-toggle-warning"
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
                        id="map-toggle-watch"
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
                        id="map-toggle-statement"
                        type="checkbox"
                        checked
                    >
                    <span style="
                        color:#1976d2;
                        font-weight:bold;
                    ">
                        Statements
                    </span>
                </label>

                <label style="
                    display:block;
                    margin-bottom:7px;
                    cursor:pointer;
                ">
                    <input
                        id="map-toggle-advisory"
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
                        id="map-toggle-other"
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


    setTimeout(
        function () {

            setupMapToggle(
                "map-toggle-warning",
                warningLayer
            );

            setupMapToggle(
                "map-toggle-watch",
                watchLayer
            );

            setupMapToggle(
                "map-toggle-statement",
                statementLayer
            );

            setupMapToggle(
                "map-toggle-advisory",
                advisoryLayer
            );

            setupMapToggle(
                "map-toggle-other",
                otherLayer
            );

        },
        200
    );
}


// ============================================================
// MAP TOGGLE
// ============================================================

function setupMapToggle(
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
// FETCH ONE ALERT TYPE
// ============================================================

function fetchAlertType(
    alertType
) {

    var url =
        ECCC_BASE_URL +
        "?filter=" +
        encodeURIComponent(
            "properties.alert_type='" +
            alertType +
            "'"
        ) +
        "&limit=500";


    console.log(
        "REQUESTING ECCC:",
        alertType,
        url
    );


    return fetch(
        url,
        {
            method: "GET",
            cache: "no-store",
            headers: {
                "Accept":
                    "application/geo+json, application/json"
            }
        }
    )
    .then(
        function (response) {

            console.log(
                "ECCC",
                alertType,
                "STATUS:",
                response.status
            );


            if (!response.ok) {

                return response.text()
                    .then(
                        function (body) {

                            throw new Error(
                                alertType +
                                " request failed: HTTP " +
                                response.status +
                                " | " +
                                body.substring(
                                    0,
                                    300
                                )
                            );
                        }
                    );
            }


            return response.json();
        }
    )
    .then(
        function (data) {

            return Array.isArray(
                data.features
            )
                ? data.features
                : [];
        }
    );
}


// ============================================================
// LOAD ALL ALERT TYPES
// ============================================================

function loadAlerts() {

    var container =
        document.getElementById(
            "active-alerts"
        );


    console.log(
        "Loading all ECCC alert types..."
    );


    Promise.all(
        [
            fetchAlertType("warning"),
            fetchAlertType("watch"),
            fetchAlertType("statement"),
            fetchAlertType("advisory")
        ]
    )
    .then(
        function (results) {

            var allFeatures = [];


            results.forEach(
                function (result) {

                    allFeatures =
                        allFeatures.concat(
                            result
                        );
                }
            );


            allFeatures =
                removeExpiredAlerts(
                    allFeatures
                );


            allFeatures =
                removeDuplicates(
                    allFeatures
                );


            console.log(
                "ACTIVE UNIQUE ALERTS:",
                allFeatures.length
            );


            buildActiveAlertFilters(
                allFeatures
            );


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
        }
    )
    .catch(
        function (error) {

            console.error(
                "ECCC ALERT LOAD FAILED:",
                error
            );


            if (container) {

                container.innerHTML = `
                    <div style="
                        padding:20px;
                        background:#ffebee;
                        border:1px solid #ffcdd2;
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
                            The ECCC alert service
                            returned an error.
                        </p>

                        <pre style="
                            white-space:pre-wrap;
                            word-break:break-word;
                            font-size:12px;
                            background:#ffffff;
                            padding:10px;
                            border-radius:6px;
                        ">${escapeHtml(
                            error.message
                        )}</pre>

                        <button
                            onclick="loadAlerts()"
                            style="
                                padding:9px 16px;
                                background:#d32f2f;
                                color:#ffffff;
                                border:none;
                                border-radius:6px;
                                cursor:pointer;
                                font-weight:bold;
                            "
                        >
                            Try Again
                        </button>

                    </div>
                `;
            }
        }
    );
}


// ============================================================
// BUILD ACTIVE ALERT FILTERS
// ============================================================

function buildActiveAlertFilters(
    features
) {

    var container =
        document.getElementById(
            "active-alerts"
        );


    if (!container) {
        return;
    }


    var oldFilters =
        document.getElementById(
            "alert-filter-panel"
        );


    if (oldFilters) {
        oldFilters.remove();
    }


    var filterPanel =
        document.createElement(
            "div"
        );


    filterPanel.id =
        "alert-filter-panel";


    filterPanel.style.marginBottom =
        "20px";


    filterPanel.innerHTML = `
        <details
            open
            style="
                background:#ffffff;
                border:1px solid #dddddd;
                border-radius:10px;
                padding:14px 16px;
                box-shadow:
                    0 2px 6px
                    rgba(0,0,0,0.05);
            "
        >

            <summary
                style="
                    cursor:pointer;
                    font-size:18px;
                    font-weight:bold;
                "
            >
                Filter Active Alerts
            </summary>

            <div
                id="alert-filter-groups"
                style="
                    margin-top:14px;
                "
            >
            </div>

        </details>
    `;


    container.parentNode.insertBefore(
        filterPanel,
        container
    );


    var groups =
        document.getElementById(
            "alert-filter-groups"
        );


    var categories = [
        {
            title: "Warnings",
            category: "warning",
            color: "#d32f2f",
            types: [
                "Severe Thunderstorm Warning",
                "Tornado Warning",
                "Snow Squall Warning",
                "Blizzard Warning",
                "Winter Storm Warning",
                "Rainfall Warning",
                "Wind Warning",
                "Freezing Rain Warning",
                "Other Warning"
            ]
        },

        {
            title: "Watches",
            category: "watch",
            color: "#ef6c00",
            types: [
                "Severe Thunderstorm Watch",
                "Tornado Watch",
                "Snow Squall Watch",
                "Winter Storm Watch",
                "Blizzard Watch",
                "Other Watch"
            ]
        },

        {
            title: "Statements",
            category: "statement",
            color: "#1976d2",
            types: [
                "Special Weather Statement",
                "Other Statement"
            ]
        },

        {
            title: "Advisories",
            category: "advisory",
            color: "#0288d1",
            types: [
                "Heat Warning",
                "Fog Advisory",
                "Freezing Rain Advisory",
                "Frost Advisory",
                "Air Quality Advisory",
                "Other Advisory"
            ]
        }
    ];


    categories.forEach(
        function (group) {

            var details =
                document.createElement(
                    "details"
                );


            details.style.marginBottom =
                "8px";

            details.style.border =
                "1px solid #eeeeee";

            details.style.borderRadius =
                "7px";


            var summary =
                document.createElement(
                    "summary"
                );


            summary.textContent =
                group.title;


            summary.style.cursor =
                "pointer";

            summary.style.fontWeight =
                "bold";

            summary.style.padding =
                "10px";

            summary.style.color =
                group.color;


            details.appendChild(
                summary
            );


            var options =
                document.createElement(
                    "div"
                );


            options.style.padding =
                "0 12px 10px 12px";


            group.types.forEach(
                function (typeName) {

                    var key =
                        makeFilterKey(
                            group.category,
                            typeName
                        );


                    activeFilters[key] =
                        true;


                    var label =
                        document.createElement(
                            "label"
                        );


                    label.style.display =
                        "block";

                    label.style.padding =
                        "5px 0";

                    label.style.cursor =
                        "pointer";


                    var checkbox =
                        document.createElement(
                            "input"
                        );


                    checkbox.type =
                        "checkbox";

                    checkbox.checked =
                        true;


                    checkbox.dataset.category =
                        group.category;

                    checkbox.dataset.type =
                        typeName;


                    checkbox.addEventListener(
                        "change",
                        function () {

                            activeFilters[key] =
                                this.checked;

                            refreshAlertDisplay();
                        }
                    );


                    label.appendChild(
                        checkbox
                    );


                    label.appendChild(
                        document.createTextNode(
                            " " +
                            typeName
                        )
                    );


                    options.appendChild(
                        label
                    );
                }
            );


            details.appendChild(
                options
            );


            groups.appendChild(
                details
            );
        }
    );


    // Other category
    var otherDetails =
        document.createElement(
            "details"
        );


    otherDetails.style.marginBottom =
        "8px";

    otherDetails.style.border =
        "1px solid #eeeeee";

    otherDetails.style.borderRadius =
        "7px";


    otherDetails.innerHTML = `
        <summary style="
            cursor:pointer;
            font-weight:bold;
            padding:10px;
            color:#757575;
        ">
            Other
        </summary>

        <label style="
            display:block;
            padding:10px;
            cursor:pointer;
        ">
            <input
                id="filter-other"
                type="checkbox"
                checked
            >
            Other Alerts
        </label>
    `;


    groups.appendChild(
        otherDetails
    );


    var otherCheckbox =
        document.getElementById(
            "filter-other"
        );


    if (otherCheckbox) {

        activeFilters[
            "other|other"
        ] = true;


        otherCheckbox.addEventListener(
            "change",
            function () {

                activeFilters[
                    "other|other"
                ] =
                    this.checked;

                refreshAlertDisplay();
            }
        );
    }


    window.currentAlertFeatures =
        features;


    refreshAlertDisplay();
}


// ============================================================
// FILTER KEY
// ============================================================

function makeFilterKey(
    category,
    typeName
) {

    return (
        String(category)
            .toLowerCase()
    ) +
    "|" +
    (
        String(typeName)
            .toLowerCase()
    );
}


// ============================================================
// REFRESH DISPLAY
// ============================================================

function refreshAlertDisplay() {

    var features =
        window.currentAlertFeatures ||
        [];


    var container =
        document.getElementById(
            "active-alerts"
        );


    if (!container) {
        return;
    }


    var cards =
        container.querySelectorAll(
            ".alert-card"
        );


    cards.forEach(
        function (card) {

            var category =
                card.dataset.category ||
                "other";


            var type =
                card.dataset.alertType ||
                "";


            var key =
                makeFilterKey(
                    category,
                    type
                );


            var shouldShow =
                activeFilters[key];


            if (
                typeof shouldShow ===
                "undefined"
            ) {

                shouldShow =
                    activeFilters[
                        category +
                        "|other " +
                        (
                            category ===
                            "warning"
                                ? "warning"
                                : ""
                        )
                    ];
            }


            if (
                typeof shouldShow ===
                "undefined"
            ) {

                shouldShow =
                    activeFilters[
                        "other|other"
                    ];
            }


            card.style.display =
                shouldShow
                    ? ""
                    : "none";
        }
    );


    plotAlertsOnMap(
        features
    );
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


            if (!p.expiration_datetime) {
                return true;
            }


            var expiry =
                new Date(
                    p.expiration_datetime
                ).getTime();


            if (isNaN(expiry)) {
                return true;
            }


            return expiry > now;
        }
    );
}


// ============================================================
// REMOVE DUPLICATES
// ============================================================

function removeDuplicates(
    features
) {

    var seen = {};

    var unique = [];


    features.forEach(
        function (feature) {

            var p =
                feature.properties || {};


            var key =
                (
                    p.alert_code ||
                    p.feature_id ||
                    feature.id ||
                    p.alert_name_en ||
                    ""
                ) +
                "|" +
                (
                    p.feature_name_en ||
                    ""
                ) +
                "|" +
                (
                    p.alert_type ||
                    ""
                );


            if (!seen[key]) {

                seen[key] =
                    true;

                unique.push(
                    feature
                );
            }
        }
    );


    return unique;
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


    // Remove only the old alert cards.
    var oldCards =
        container.querySelectorAll(
            ".alert-card, .no-alerts-card"
        );


    oldCards.forEach(
        function (card) {
            card.remove();
        }
    );


    if (
        !features ||
        features.length === 0
    ) {

        var noAlerts =
            document.createElement(
                "div"
            );


        noAlerts.className =
            "no-alerts-card";


        noAlerts.innerHTML = `
            <div style="
                padding:20px;
                text-align:center;
                background:#ffffff;
                border:1px solid #dddddd;
                border-radius:8px;
            ">

                <h3 style="
                    margin:0 0 8px 0;
                    color:#2e7d32;
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


        container.appendChild(
            noAlerts
        );


        return;
    }


    features.forEach(
        function (feature) {

            var p =
                feature.properties || {};


            var name =
                p.alert_name_en ||
                "Weather Alert";


            var type =
                p.alert_type ||
                "other";


            var category =
                getAlertCategory(
                    p
                );


            var area =
                p.feature_name_en ||
                "the affected area";


            var text =
                p.alert_text_en ||
                "";


            var color =
                getAlertColor(
                    p
                );


            var summary =
                createAlertSummary(
                    p
                );


            var hazards =
                extractHazards(
                    text
                );


            var card =
                document.createElement(
                    "div"
                );


            card.className =
                "alert-card";


            card.dataset.category =
                category;


            card.dataset.alertType =
                getAlertSubtype(
                    p
                );


            card.style.border =
                "1px solid #dddddd";

            card.style.borderLeft =
                "6px solid " +
                color;

            card.style.borderRadius =
                "9px";

            card.style.padding =
                "18px";

            card.style.marginBottom =
                "16px";

            card.style.background =
                "#ffffff";

            card.style.boxShadow =
                "0 2px 6px rgba(0,0,0,.05)";


            var hazardHTML = "";


            if (
                hazards.length > 0
            ) {

                hazardHTML = `
                    <div style="
                        margin-top:12px;
                    ">

                        <strong>
                            Main hazards:
                        </strong>

                        <ul style="
                            margin:6px 0 0 20px;
                            padding:0;
                        ">

                            ${hazards.map(
                                function (hazard) {

                                    return `
                                        <li>
                                            ${escapeHtml(
                                                hazard
                                            )}
                                        </li>
                                    `;
                                }
                            ).join("")}

                        </ul>

                    </div>
                `;
            }


            card.innerHTML = `
                <div style="
                    display:flex;
                    justify-content:space-between;
                    align-items:flex-start;
                    gap:12px;
                ">

                    <div>

                        <h3 style="
                            margin:0;
                            font-size:1.2rem;
                            color:#111;
                        ">
                            ${escapeHtml(
                                summary.title
                            )}
                        </h3>

                        <div style="
                            margin-top:5px;
                            color:#555;
                            font-size:.92rem;
                        ">
                            ${escapeHtml(
                                summary.location
                            )}
                        </div>

                    </div>


                    <span style="
                        background:${color};
                        color:#fff;
                        padding:5px 9px;
                        border-radius:5px;
                        font-size:.72rem;
                        font-weight:bold;
                        white-space:nowrap;
                    ">
                        ${escapeHtml(
                            type
                        )}
                    </span>

                </div>


                <div style="
                    margin-top:12px;
                    padding:11px;
                    background:#f6f7f9;
                    border-radius:7px;
                    line-height:1.5;
                ">
                    ${escapeHtml(
                        summary.oneLine
                    )}
                </div>


                ${hazardHTML}


                <details style="
                    margin-top:14px;
                ">

                    <summary style="
                        cursor:pointer;
                        font-weight:bold;
                    ">
                        Full alert details
                    </summary>

                    <div style="
                        margin-top:10px;
                        white-space:pre-line;
                        line-height:1.55;
                        color:#333;
                    ">
                        ${escapeHtml(
                            text ||
                            "No additional details are available."
                        )}
                    </div>

                </details>


                <div style="
                    margin-top:12px;
                    padding-top:10px;
                    border-top:1px solid #eeeeee;
                    font-size:.82rem;
                    color:#666;
                    line-height:1.6;
                ">

                    ${
                        p.risk_colour_en
                            ? `
                                <strong>
                                    Risk:
                                </strong>
                                ${escapeHtml(
                                    p.risk_colour_en
                                )}
                                <br>
                              `
                            : ""
                    }

                    ${
                        p.publication_datetime
                            ? `
                                <strong>
                                    Issued:
                                </strong>
                                ${escapeHtml(
                                    formatDate(
                                        p.publication_datetime
                                    )
                                )}
                                <br>
                              `
                            : ""
                    }

                    ${
                        p.expiration_datetime
                            ? `
                                <strong>
                                    Expires:
                                </strong>
                                ${escapeHtml(
                                    formatDate(
                                        p.expiration_datetime
                                    )
                                )}
                              `
                            : ""
                    }

                </div>
            `;


            container.appendChild(
                card
            );
        }
    );
}


// ============================================================
// CREATE EASY-TO-READ SUMMARY
// ============================================================

function createAlertSummary(
    props
) {

    var type =
        props.alert_name_en ||
        props.alert_short_name_en ||
        "Weather Alert";


    var area =
        props.feature_name_en ||
        "the affected area";


    var text =
        props.alert_text_en ||
        "";


    var cleanText =
        cleanAlertText(
            text
        );


    var hazards =
        extractHazards(
            text
        );


    var oneLine =
        type +
        " has been issued for " +
        area +
        ".";


    if (
        hazards.length > 0
    ) {

        oneLine +=
            " Main hazards: " +
            hazards.join(
                "; "
            ) +
            ".";

    } else if (
        cleanText
    ) {

        oneLine +=
            " " +
            limitText(
                cleanText,
                240
            );
    }


    return {
        title:
            type,

        location:
            area,

        oneLine:
            oneLine
    };
}


// ============================================================
// EXTRACT MAIN HAZARDS
// ============================================================

function extractHazards(
    text
) {

    if (!text) {
        return [];
    }


    var results = [];


    var normalized =
        String(text)
            .replace(
                /\r/g,
                " "
            )
            .replace(
                /\n+/g,
                " "
            )
            .replace(
                /\s+/g,
                " "
            );


    var patterns = [

        /damaging wind gusts? (?:up to|of)\s+[^.,;]+/i,

        /wind gusts? (?:up to|of)\s+[^.,;]+/i,

        /hail (?:up to|of)\s+[^.,;]+/i,

        /tornado(?:es)?[^.,;]*/i,

        /flash flooding[^.,;]*/i,

        /flooding[^.,;]*/i,

        /heavy rainfall[^.,;]*/i,

        /rainfall (?:amounts|rates)[^.,;]*/i,

        /heavy snow[^.,;]*/i,

        /snowfall (?:amounts|rates)[^.,;]*/i,

        /snow squalls?[^.,;]*/i,

        /blowing snow[^.,;]*/i,

        /freezing rain[^.,;]*/i,

        /ice pellets[^.,;]*/i,

        /visibility (?:may be|reduced to)[^.,;]*/i,

        /dangerously cold temperatures?[^.,;]*/i,

        /extreme cold[^.,;]*/i,

        /poor air quality[^.,;]*/i,

        /high winds?[^.,;]*/i

    ];


    patterns.forEach(
        function (pattern) {

            var match =
                normalized.match(
                    pattern
                );


            if (
                match &&
                match[0]
            ) {

                var value =
                    match[0]
                        .trim();


                if (
                    !results.some(
                        function (existing) {

                            return existing
                                .toLowerCase() ===
                                value
                                    .toLowerCase();
                        }
                    )
                ) {

                    results.push(
                        capitalizeFirst(
                            value
                        )
                    );
                }
            }
        }
    );


    return results.slice(
        0,
        5
    );
}


// ============================================================
// CLEAN ALERT TEXT
// ============================================================

function cleanAlertText(
    text
) {

    return String(
        text || ""
    )
        .replace(
            /\r/g,
            " "
        )
        .replace(
            /\n+/g,
            " "
        )
        .replace(
            /\s+/g,
            " "
        )
        .trim();
}


// ============================================================
// LIMIT TEXT
// ============================================================

function limitText(
    text,
    max
) {

    if (
        text.length <= max
    ) {
        return text;
    }


    return (
        text.substring(
            0,
            max
        ).trim() +
        "..."
    );
}


// ============================================================
// CAPITALIZE
// ============================================================

function capitalizeFirst(
    text
) {

    if (!text) {
        return "";
    }


    return (
        text.charAt(0).toUpperCase() +
        text.slice(1)
    );
}


// ============================================================
// ALERT SUBTYPE
// ============================================================

function getAlertSubtype(
    props
) {

    var category =
        getAlertCategory(
            props
        );


    var name =
        String(
            props.alert_name_en ||
            props.alert_short_name_en ||
            ""
        )
            .toLowerCase();


    var type =
        String(
            props.alert_type ||
            ""
        )
            .toLowerCase();


    var combined =
        name +
        " " +
        type;


    if (
        category ===
        "warning"
    ) {

        if (
            combined.includes(
                "tornado"
            )
        ) {
            return "severe thunderstorm warning"
                .includes(
                    ""
                )
                ? findWarningSubtype(
                    combined,
                    "Tornado Warning"
                )
                : "Other Warning";
        }


        return findWarningSubtype(
            combined,
            "Other Warning"
        );
    }


    if (
        category ===
        "watch"
    ) {

        return findWatchSubtype(
            combined
        );
    }


    if (
        category ===
        "statement"
    ) {

        if (
            combined.includes(
                "special weather statement"
            )
        ) {
            return "Special Weather Statement";
        }


        return "Other Statement";
    }


    if (
        category ===
        "advisory"
    ) {

        return findAdvisorySubtype(
            combined
        );
    }


    return "Other Alerts";
}


// ============================================================
// WARNING SUBTYPE
// ============================================================

function findWarningSubtype(
    text,
    fallback
) {

    if (
        text.includes(
            "tornado"
        )
    ) {
        return "Tornado Warning";
    }


    if (
        text.includes(
            "severe thunderstorm"
        )
    ) {
        return "Severe Thunderstorm Warning";
    }


    if (
        text.includes(
            "snow squall"
        )
    ) {
        return "Snow Squall Warning";
    }


    if (
        text.includes(
            "blizzard"
        )
    ) {
        return "Blizzard Warning";
    }


    if (
        text.includes(
            "winter storm"
        )
    ) {
        return "Winter Storm Warning";
    }


    if (
        text.includes(
            "rainfall"
        )
    ) {
        return "Rainfall Warning";
    }


    if (
        text.includes(
            "wind"
        )
    ) {
        return "Wind Warning";
    }


    if (
        text.includes(
            "freezing rain"
        )
    ) {
        return "Freezing Rain Warning";
    }


    return fallback;
}


// ============================================================
// WATCH SUBTYPE
// ============================================================

function findWatchSubtype(
    text
) {

    if (
        text.includes(
            "tornado"
        )
    ) {
        return "Tornado Watch";
    }


    if (
        text.includes(
            "severe thunderstorm"
        )
    ) {
        return "Severe Thunderstorm Watch";
    }


    if (
        text.includes(
            "snow squall"
        )
    ) {
        return "Snow Squall Watch";
    }


    if (
        text.includes(
            "winter storm"
        )
    ) {
        return "Winter Storm Watch";
    }


    if (
        text.includes(
            "blizzard"
        )
    ) {
        return "Blizzard Watch";
    }


    return "Other Watch";
}


// ============================================================
// ADVISORY SUBTYPE
// ============================================================

function findAdvisorySubtype(
    text
) {

    if (
        text.includes(
            "heat"
        )
    ) {
        return "Heat Warning";
    }


    if (
        text.includes(
            "fog"
        )
    ) {
        return "Fog Advisory";
    }


    if (
        text.includes(
            "freezing rain"
        )
    ) {
        return "Freezing Rain Advisory";
    }


    if (
        text.includes(
            "frost"
        )
    ) {
        return "Frost Advisory";
    }


    if (
        text.includes(
            "air quality"
        )
    ) {
        return "Air Quality Advisory";
    }


    return "Other Advisory";
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
        )
            .toLowerCase()
            .trim();


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
        "statement"
    ) {
        return "statement";
    }


    if (
        type ===
        "advisory"
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
        "statement"
    ) {
        return "#1976d2";
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
    statementLayer.clearLayers();
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


            var p =
                feature.properties || {};


            var category =
                getAlertCategory(
                    p
                );


            var subtype =
                getAlertSubtype(
                    p
                );


            var key =
                makeFilterKey(
                    category,
                    subtype
                );


            var allowed =
                activeFilters[key];


            if (
                typeof allowed ===
                "undefined"
            ) {

                if (
                    category ===
                    "other"
                ) {

                    allowed =
                        activeFilters[
                            "other|other"
                        ];

                } else {

                    allowed =
                        true;
                }
            }


            if (!allowed) {
                return;
            }


            var color =
                getAlertColor(
                    p
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
                                        0.30
                                };
                            },


                        onEachFeature:
                            function (
                                feature,
                                alertLayer
                            ) {

                                var props =
                                    feature.properties ||
                                    {};


                                var title =
                                    props.alert_name_en ||
                                    "Weather Alert";


                                var type =
                                    props.alert_type ||
                                    "";


                                var area =
                                    props.feature_name_en ||
                                    "";


                                var text =
                                    props.alert_text_en ||
                                    "";


                                var hazards =
                                    extractHazards(
                                        text
                                    );


                                alertLayer.bindPopup(
                                    `
                                    <div style="
                                        min-width:240px;
                                        max-width:330px;
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
                                                    ${escapeHtml(
                                                        type
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
                                            hazards.length > 0
                                                ? `
                                                    <br>
                                                    <strong>
                                                        Main hazards:
                                                    </strong>

                                                    <ul
                                                        style="
                                                            margin:5px 0 0 18px;
                                                            padding:0;
                                                        "
                                                    >
                                                        ${hazards.map(
                                                            function (
                                                                hazard
                                                            ) {

                                                                return `
                                                                    <li>
                                                                        ${escapeHtml(
                                                                            hazard
                                                                        )}
                                                                    </li>
                                                                `;
                                                            }
                                                        ).join("")}
                                                    </ul>
                                                  `
                                                : ""
                                        }


                                        ${
                                            props.expiration_datetime
                                                ? `
                                                    <br>
                                                    <strong>
                                                        Expires:
                                                    </strong>
                                                    ${escapeHtml(
                                                        formatDate(
                                                            props.expiration_datetime
                                                        )
                                                    )}
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
                "statement"
            ) {

                layer.addTo(
                    statementLayer
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
                    "Unable to calculate alert bounds.",
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

                maxZoom:
                    7
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


        // Update every 5 minutes
        setInterval(
            loadAlerts,
            5 * 60 * 1000
        );

    }
);
