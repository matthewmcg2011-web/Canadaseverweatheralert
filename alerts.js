// ECCC GeoMet Weather Alerts API Endpoint
var ECCC_ALERTS_API = 'https://api.weather.gc.ca/collections/weather-alerts/items?f=json&limit=500';

var map = null;
var alertsGeoJsonLayer = null;

// Initialize Leaflet Map
function initMap() {
    var mapElement = document.getElementById('map');
    if (!mapElement) return;

    map = L.map('map').setView([56.1304, -106.3468], 4);

    L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
        maxZoom: 19,
        attribution: '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
    }).addTo(map);
}

// Fetch Active Alerts from ECCC API
function loadAlerts() {
    var container = findAlertsContainer();

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
                    '<div style="padding: 20px; border: 1px solid #ffcdd2; background: #ffebee; border-radius: 8px; margin-top: 10px;">' +
                        '<h3 style="margin: 0 0 8px 0; color: #c62828;">Unable to Load Alerts</h3>' +
                        '<p style="margin: 0 0 12px 0; color: #b71c1c;">The live ECCC weather service could not be reached right now.</p>' +
                        '<button onclick="loadAlerts()" style="padding: 8px 16px; background: #d32f2f; color: white; border: none; border-radius: 4px; cursor: pointer; font-weight: bold;">Try Again</button>' +
                    '</div>';
            }
        });
}

// Automatically locate the text alerts container element in index.html
function findAlertsContainer() {
    var container = document.getElementById('active-alerts') || 
                    document.getElementById('alerts-container') || 
                    document.getElementById('alerts-list') || 
                    document.getElementById('alerts') || 
                    document.querySelector('.alerts-container') || 
                    document.querySelector('.active-alerts');

    if (container) return container;

    // Search by heading text as fallback
    var headings = document.querySelectorAll('h1, h2, h3, h4');
    for (var i = 0; i < headings.length; i++) {
        if (headings[i].textContent.toLowerCase().includes('active alert')) {
            var parent = headings[i].parentElement;
            var nextElem = headings[i].nextElementSibling;
            return nextElem || parent;
        }
    }
    return null;
}

// Render alert cards
function displayAlerts(features, container) {
    if (!container) return;

    if (!features || features.length === 0) {
        container.innerHTML = 
            '<div style="padding: 20px; background: #ffffff; border: 1px solid #e0e0e0; border-radius: 8px; text-align: center; color: #555; margin-top: 10px;">' +
                '<h3 style="margin: 0 0 6px 0; color: #2e7d32;">No Active Severe Weather Alerts</h3>' +
                '<p style="margin: 0; font-size: 0.95rem;">There are currently no active public weather alerts issued by Environment Canada.</p>' +
            '</div>';
        return;
    }

    // Deduplicate alerts by headline and area
    var uniqueAlerts = [];
    var seenKeys = {};

    for (var i = 0; i < features.length; i++) {
        var props = features[i].properties || {};
        var key = (props.headline || props.event || '') + '|' + (props.area_name || props.location || '');
        
        if (!seenKeys[key]) {
            seenKeys[key] = true;
            uniqueAlerts.push(props);
        }
    }

    var html = '';
    for (var j = 0; j < uniqueAlerts.length; j++) {
        var alertProps = uniqueAlerts[j];

        var headline = alertProps.headline || alertProps.event || alertProps.title || 'Weather Alert';
        var eventType = alertProps.event || alertProps.event_en || 'Alert';
        var area = alertProps.area_name || alertProps.area || alertProps.location || alertProps.name_en || '';
        var description = alertProps.description || alertProps.summary || alertProps.text || 'No additional details available for this alert.';
        var severity = alertProps.severity || 'Notice';
        var timeIssued = alertProps.issued || alertProps.effective || alertProps.updated || '';

        // Color coding by alert type
        var badgeColor = '#d32f2f'; // Red for Warnings
        var textCheck = (severity + ' ' + eventType + ' ' + headline).toLowerCase();
        
        if (textCheck.indexOf('watch') !== -1) {
            badgeColor = '#ef6c00'; // Orange for Watches
        } else if (textCheck.indexOf('statement') !== -1 || textCheck.indexOf('advisory') !== -1) {
            badgeColor = '#0288d1'; // Blue for Statements
        }

        html += '<div class="alert-card" style="border: 1px solid #e0e0e0; border-left: 6px solid ' + badgeColor + '; border-radius: 8px; padding: 18px; margin-bottom: 16px; background: #ffffff; box-shadow: 0 2px 5px rgba(0,0,0,0.05); text-align: left;">';
        
        // Title & Event Tag
        html += '<div style="display: flex; justify-content: space-between; align-items: flex-start; gap: 10px; margin-bottom: 8px;">';
        html += '<h3 style="margin: 0; font-size: 1.1rem; color: #111; font-weight: 600;">' + escapeHtml(headline) + '</h3>';
        html += '<span style="background: ' + badgeColor + '; color: #fff; font-size: 0.72rem; font-weight: bold; padding: 4px 8px; border-radius: 4px; white-space: nowrap; text-transform: uppercase;">' + escapeHtml(eventType) + '</span>';
        html += '</div>';

        // Area & Issued Time
        if (area || timeIssued) {
            html += '<div style="font-size: 0.85rem; color: #666; margin-bottom: 10px;">';
            if (area) html += '<strong>Area:</strong> ' + escapeHtml(area);
            if (area && timeIssued) html += ' &bull; ';
            if (timeIssued) html += '<strong>Issued:</strong> ' + escapeHtml(formatDate(timeIssued));
            html += '</div>';
        }

        // Full Description Narrative
        html += '<div style="font-size: 0.92rem; color: #333; line-height: 1.5; white-space: pre-line;">' + escapeHtml(description) + '</div>';
        
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
        style: function(feature) {
            var props = feature ? feature.properties || {} : {};
            var text = (props.severity || props.event || props.headline || '').toLowerCase();
            var color = '#d32f2f';

            if (text.indexOf('watch') !== -1) color = '#ef6c00';
            if (text.indexOf('statement') !== -1 || text.indexOf('advisory') !== -1) color = '#0288d1';

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

// Format Timestamp
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

// Start on DOM Ready
document.addEventListener('DOMContentLoaded', function() {
    initMap();
    loadAlerts();
});
