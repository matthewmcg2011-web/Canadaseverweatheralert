function loadAlerts() {

    var container =
        document.getElementById("active-alerts");

    console.log("REQUESTING ECCC:", ECCC_ALERTS_API);

    fetch(ECCC_ALERTS_API, {
        method: "GET",
        cache: "no-store"
    })
    .then(function(response) {

        console.log(
            "ECCC RESPONSE:",
            response.status,
            response.statusText
        );

        if (!response.ok) {
            throw new Error(
                "ECCC HTTP " +
                response.status +
                " " +
                response.statusText
            );
        }

        return response.json();
    })
    .then(function(data) {

        console.log("ECCC JSON RECEIVED:", data);

        if (!data) {
            throw new Error(
                "ECCC returned an empty response."
            );
        }

        if (!Array.isArray(data.features)) {
            throw new Error(
                "ECCC response did not contain a GeoJSON features array."
            );
        }

        console.log(
            "ECCC FEATURES:",
            data.features.length
        );

        var features =
            data.features;

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
    .catch(function(error) {

        console.error(
            "ECCC REQUEST FAILED:",
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
                    could not be reached.
                </p>

                <p style="
                    margin:0 0 12px 0;
                    color:#555;
                    font-family:monospace;
                    font-size:12px;
                    word-break:break-word;
                ">
                    ${escapeHtml(
                        error.message ||
                        String(error)
                    )}
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
    });
}
