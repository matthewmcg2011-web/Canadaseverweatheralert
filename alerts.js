// alerts.js - ECCC Live Weather Alerts Fetcher & Leaflet Renderer

// ECCC GeoMet OGC API endpoint for active weather alerts
const ECCC_ALERTS_API = 'https://api.weather.gc.ca/collections/weather-alerts/items?f=json&limit=500';

let map;
let alertsGeoJsonLayer;

// Initialize the Leaflet Map
function initMap() {
    const mapElement = document.getElementById('map');
    if (!mapElement) return;

    // Center map over Canada
    map = L.map('map').setView([56.1304, -106.3468], 4);

    L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
        maxZoom: 19,
        attribution: '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
    }).addTo(map);
}

// Fetch active alerts from ECCC API
async function loadAlerts() {
    const alertsContainer = document.getElementById('active-alerts') || document.querySelector('.alerts-container');

    try {
        const response = await fetch(ECCC_ALERTS_API);

        if (!response.ok) {
            throw new Error(`ECCC HTTP ${response.status}`);
        }

        const data = await response.json();
        const features = data.features || [];

        displayAlerts(features, alertsContainer);
        plotAlertsOnMap(data);

    } catch (error) {
        console.error('ECCC alert error:', error);
        
        if (alertsContainer) {
            alertsContainer.innerHTML = `
                <div class="alert-card error">
                    <h3>Unable to load alerts</h3>
                    <p>The live ECCC alert service could not be reached right now.</p>
                    <button class="btn btn-primary" onclick="loadAlerts()">Try Again</button>
                </div>
            `;
        }
    }
}

// Display alert details in the UI list
function displayAlerts(features, container) {
    if (!container) return;

    if (features.length === 0) {
        container.innerHTML = '<p>No active weather alerts across Canada at this time.</p>';
        return;
    }

    const html = features.map(feature => {
        const props = feature.properties || {};
        const title = props.headline || props.event || 'Weather Alert';
        const description = props.description || props.summary || 'No detailed description available.';
        const severity = props.severity || 'Info';

        return `
            <div class="alert-card alert-severity-${severity.toLowerCase()}">
                <h4>${escapeHtml(title)}</h4>
                <p>${escapeHtml(description)}</p>
            </div>
        `;
    }).join('');

    container.innerHTML = html;
}

// Render GeoJSON alert polygons on the Leaflet map
function plotAlertsOnMap(geoJsonData) {
    if (!map) return;

    if (alertsGeoJsonLayer) {
        map.removeLayer(alertsGeoJsonLayer);
    }

    alertsGeoJsonLayer = L.geoJSON(geoJsonData, {
        style: function () {
            return {
                color: '#d32f2f',
                weight: 2,
                opacity: 0.8,
                fillColor: '#f44336',
                fillOpacity: 0.35
            };
        },
        onEachFeature: function (feature, layer) {
            if (feature.properties && feature.properties.headline) {
                layer.bindPopup(`<strong>${escapeHtml(feature.properties.headline)}</strong>`);
            }
        }
    }).addTo(map);
}

// Utility function to prevent XSS
function escapeHtml(str) {
    if (!str) return '';
    return String(str)
        .replace(/&/g, '&amp;')
        .replace(/</g, '&lt;')
        .replace(/>/g, '&gt;')
        .replace(/"/g, '&quot;');
}

// Initialize on page load
document.addEventListener('DOMContentLoaded', () => {
    initMap();
    loadAlerts();
});
