// ECCC Weather Alerts Endpoint
var ECCC_ALERTS_API = 'https://api.weather.gc.ca/collections/weather-alerts/items?f=json&limit=500';

var map = null;
var alertsGeoJsonLayer = null;

// Initialize Leaflet Map
function initMap() {
    var mapElement = document.getElementById('map');
    if (!mapElement) return;

    // Center over Canada
    map = L.map('map').setView([56.1304, -106.3468], 4);

    L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
        maxZoom: 19,
        attribution: '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
    }).addTo(map);
}

// Fetch Active Alerts from ECCC API
function loadAlerts() {
    var container = document.getElementById('active-alerts') || document.querySelector('.alerts-container');

    fetch(ECCC_ALERTS_API)
        .then(function(response) {
            if (!response.ok) {
                throw new Error('ECCC HTTP ' + response.status);
            }
            return response.json();
        })
        .then(function(data) {
            var features = data.features || [];
            displayAlerts(features, container);
            plotAlertsOnMap(data);
        })
        .catch(function(error) {
            console.error('ECCC alert error:', error);
            if (container) {
                container.innerHTML = 
                    '<div class="alert-card error">' +
                        '<h3>Unable to load alerts</h3>' +
                        '<p>The live ECCC alert service could not be reached right now.</p>' +
                        '<button class="btn btn-primary" onclick="loadAlerts()">Try Again</button>' +
                    '</div>';
            }
        });
}

// Display Alerts in UI List
function displayAlerts(features, container) {
    if (!container) return;

    if (!features || features.length === 0) {
        container.innerHTML = '<p>No active weather alerts across Canada at this time.</p>';
        return;
    }

    var html = '';
    for (var i = 0; i < features.length; i++) {
        var props = features[i].properties || {};
        var title = props.headline || props.event || 'Weather Alert';
        var description = props.description || props.summary || 'No detailed description available.';
        var severity = props.severity || 'Info';

        html += '<div class="alert-card alert-severity-' + severity.toLowerCase() + '">';
        html += '<h4>' + escapeHtml(title) + '</h4>';
        html += '<p>' + escapeHtml(description) + '</p>';
        html += '</div>';
    }

    container.innerHTML = html;
}

// Render GeoJSON Polygons on Map
function plotAlertsOnMap(geoJsonData) {
    if (!map) return;

    if (alertsGeoJsonLayer) {
        map.removeLayer(alertsGeoJsonLayer);
    }

    alertsGeoJsonLayer = L.geoJSON(geoJsonData, {
        style: function() {
            return {
                color: '#d32f2f',
                weight: 2,
                opacity: 0.8,
                fillColor: '#f44336',
                fillOpacity: 0.35
            };
        },
        onEachFeature: function(feature, layer) {
            if (feature.properties && feature.properties.headline) {
                layer.bindPopup('<strong>' + escapeHtml(feature.properties.headline) + '</strong>');
            }
        }
    }).addTo(map);
}

// Escape HTML utility
function escapeHtml(str) {
    if (!str) return '';
    return String(str)
        .replace(/&/g, '&amp;')
        .replace(/</g, '&lt;')
        .replace(/>/g, '&gt;')
        .replace(/"/g, '&quot;');
}

// Start on DOM Ready
document.addEventListener('DOMContentLoaded', function() {
    initMap();
    loadAlerts();
});
