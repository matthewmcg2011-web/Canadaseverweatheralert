// ECCC GeoMet Weather Alerts API Endpoint
var ECCC_ALERTS_API = 'https://api.weather.gc.ca/collections/weather-alerts/items?f=json&limit=500';

var map = null;
var alertsGeoJsonLayer = null;

// Initialize Leaflet Map
function initMap() {
    var mapElement = document.getElementById('map');
    if (!mapElement) return;

    // Center map over Canada
    map = L.map('map').setView([56.1304, -106.3468], 4);

    L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
        maxZoom: 19,
        attribution: '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
    }).addTo(map);
}

// Fetch Active Alerts from ECCC API
function loadAlerts() {
    var container = getAlertsContainer();

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
                    '<div class="alert-card error" style="padding: 16px; border: 1px solid #f44336; border-radius: 8px; background: #ffebee;">' +
                        '<h3 style="margin-top:0; color: #c62828;">Unable to load alerts</h3>' +
                        '<p>The live ECCC alert service could not be reached right now.</p>' +
                        '<button onclick="loadAlerts()" style="padding: 8px 16px; background: #1976d2; color: #fff; border: none; border-radius: 4px; cursor: pointer;">Try Again</button>' +
                    '</div>';
            }
        });
}

// Locate the DOM container for text alerts
function getAlertsContainer() {
    return document.getElementById('active-alerts') || 
           document.getElementById('alerts-list') || 
           document.getElementById('alerts') || 
           document.querySelector('.alerts-container') ||
           document.querySelector('.active-alerts') ||
           document.querySelector('main section:last-child');
}

// Render detailed text cards into the container
function displayAlerts(features, container) {
    if (!container) return;

    if (!features || features.length === 0) {
        container.innerHTML = 
            '<div style="padding: 24px; text-align: center; color: #555;">' +
                '<p><strong>No active weather alerts across Canada at this time.</strong></p>' +
            '</div>';
        return;
    }

    var html = '';

    for (var i = 0; i < features.length; i++) {
        var props = features[i].properties || {};

        // Extract key alert properties with fallback checks
        var headline = props.headline || props.event || props.title || 'Weather Alert';
        var eventType = props.event || props.event_en || props.type || 'Alert';
        var area = props.area_name || props.area || props.location || props.name_en || '';
        var description = props.description || props.summary || props.text || 'No detailed description available.';
        var severity = props.severity || props.urgency || 'Notice';
        var timeIssued = props.issued || props.effective || props.updated || '';

        // Dynamic badge and border color based on warning/watch level
        var color = '#d32f2f'; // Red for Warnings
        var lowerCheck = (severity + ' ' + eventType + ' ' + headline).toLowerCase();
        if (lowerCheck.indexOf('watch') !== -1) color = '#f57c00'; // Orange for Watches
        if (lowerCheck.indexOf('statement') !== -1 || lowerCheck.indexOf('advisory') !== -1) color = '#1976d2'; // Blue for Statements

        html += '<article style="border: 1px solid #e0e0e0; border-left: 6px solid ' + color + '; border-radius: 8px; padding: 18px; margin-bottom: 16px; background: #ffffff; box-shadow: 0 2px 6px rgba(0,0,0,0.04);">';
        
        // Header title and event tag
        html += '<div style="display: flex; justify-content: space-between; align-items: flex-start; gap: 12px; margin-bottom: 8px;">';
        html += '<h3 style="margin: 0; font-size: 1.15rem; color: #111;">' + escapeHtml(headline) + '</h3>';
        html += '<span style="background: ' + color + '; color: #ffffff; font-size: 0.75rem; font-weight: bold; padding: 4px 8px; border-radius: 4px; white-space: nowrap; text-transform: uppercase;">' + escapeHtml(eventType) + '</span>';
        html += '</div>';

        // Area & Issued time metadata
        if (area || timeIssued) {
            html += '<div style="font-size: 0.85rem; color: #666; margin-bottom: 12px;">';
            if (area) html += '<strong>Area:</strong> ' + escapeHtml(area);
            if (area && timeIssued) html += ' | ';
            if (timeIssued) html += '<strong>Issued:</strong> ' + escapeHtml(formatDate(timeIssued));
            html += '</div>';
        }

        // Detailed alert narrative text
        html += '<div style="font-size: 0.95rem; color: #333; line-height: 1.5; white-space: pre-line;">' + escapeHtml(description) + '</div>';

        html += '</article>';
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
        style: function(feature) {
            var props = feature ? feature.properties || {} : {};
            var text = (props.severity || props.event || props.headline || '').toLowerCase();
            var color = '#d32f2f';

            if (text.indexOf('watch') !== -1) color = '#f57c00';
            if (text.indexOf('statement') !== -1 || text.indexOf('advisory') !== -1) color = '#1976d2';

            return {
                color: color,
                weight: 2,
                opacity: 0.8,
                fillColor: color,
                fillOpacity: 0.3
            };
        },
        onEachFeature: function(feature, layer) {
            if (feature.properties) {
                var props = feature.properties;
                var title = props.headline || props.event || 'Weather Alert';
                layer.bindPopup('<strong>' + escapeHtml(title) + '</strong>');
            }
        }
    }).addTo(map);
}

// Format timestamp
function formatDate(dateStr) {
    try {
        var d = new Date(dateStr);
        if (isNaN(d.getTime())) return dateStr;
        return d.toLocaleString();
    } catch (e) {
        return dateStr;
    }
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

// Initialize on DOM ready
document.addEventListener('DOMContentLoaded', function() {
    initMap();
    loadAlerts();
});
