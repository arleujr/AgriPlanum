// ==========================================================================
// AgriPlanum - Map Service v2.5 (Manual Draw Restored)
// Description: Manages all Leaflet map interactions, including initialization,
//              data rendering, popups, and both manual and selection drawing.
// File: map.js
// ==========================================================================

import { state } from './state.js';

// Module-level variables to hold the map instance and its layers.
let fieldsLayer, plantsLayer, highlightLayer, drawnItems;
let polygonPoints = [];
let polygonLayer;
let tempPlantMarker;

/**
 * Initializes the Leaflet map, sets up tile layer with extended zoom,
 * and configures Leaflet.Draw controls for selection.
 * @param {string} containerId - The ID of the HTML element where the map will be rendered.
 * @returns {L.Map} The initialized Leaflet map instance.
 */
export function initializeMap(containerId) {
    if (state.mapInstance) {
        state.mapInstance.remove();
    }

    state.mapInstance = L.map(containerId, { maxZoom: 24 }).setView([-14.235, -51.925], 5);

    L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
        attribution: '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors',
        maxZoom: 24,
        maxNativeZoom: 19
    }).addTo(state.mapInstance);

    // Initialize layers for displaying and creating data.
    fieldsLayer = L.featureGroup().addTo(state.mapInstance);
    plantsLayer = L.featureGroup().addTo(state.mapInstance);
    highlightLayer = L.featureGroup().addTo(state.mapInstance);
    drawnItems = new L.FeatureGroup().addTo(state.mapInstance); // For Leaflet.Draw selection tool
    polygonLayer = L.featureGroup().addTo(state.mapInstance); // For manual field drawing

    // Configure the Leaflet.Draw control for rectangle selection.
    const drawControl = new L.Control.Draw({
        edit: { featureGroup: drawnItems, remove: true },
        draw: {
            polygon: false, polyline: false, marker: false, circle: false, circlemarker: false,
            rectangle: { shapeOptions: { color: '#0288D1' } }
        }
    });
    state.mapInstance.addControl(drawControl);

    // Event listener for when a rectangle selection is created.
    state.mapInstance.on(L.Draw.Event.CREATED, (event) => {
        const layer = event.layer;
        drawnItems.clearLayers();
        drawnItems.addLayer(layer);
        const bounds = layer.getBounds();
        window.dispatchEvent(new CustomEvent('selection-drawn', { detail: { bounds: bounds } }));
    });
    
    // Event listener for when the selection is cleared via the draw control.
    state.mapInstance.on('draw:deleted', () => {
        window.dispatchEvent(new CustomEvent('selection-cleared'));
    });

    return state.mapInstance;
}

/**
 * Renders field polygons on the map and attaches event listeners to their popups.
 * @param {Array<object>} fields - Array of field objects.
 * @param {Function} onDelete - Callback function for the delete button.
 */
export function drawFields(fields, onDelete) {
    if (!fieldsLayer) return;
    fieldsLayer.clearLayers();

    fields.forEach(field => {
        const fieldPolygon = L.geoJSON(field.geometry, {
            style: { color: '#2E7D32', weight: 2, opacity: 0.8 }
        }).addTo(fieldsLayer);
        
        const popupContent = `
            <b>${field.name}</b><br>
            Área: ${parseFloat(field.area_hectares).toFixed(2)} ha
            <div class="popup-actions">
                <button class="btn-details" data-field-id="${field.id}">Details</button>
                <button class="btn-delete" data-field-id="${field.id}" data-field-name="${field.name}">Delete</button>
            </div>
        `;
        fieldPolygon.bindPopup(popupContent);

        fieldPolygon.on('popupopen', () => {
            document.querySelector(`.btn-details[data-field-id="${field.id}"]`)?.addEventListener('click', () => {
                window.dispatchEvent(new CustomEvent('view-field-details', { detail: { id: field.id } }));
            });
            document.querySelector(`.btn-delete[data-field-id="${field.id}"]`)?.addEventListener('click', () => {
                onDelete(field.id, field.name);
            });
        });
    });
}

/**
 * Renders plant markers on the map and attaches event listeners to their popups.
 * @param {Array<object>} plants - Array of plant objects.
 * @param {Function} onDelete - Callback function for the delete button.
 */
export function drawPlants(plants, onDelete) {
    if (!plantsLayer) return;
    plantsLayer.clearLayers();

    const plantIcon = L.icon({
        iconUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-icon.png',
        iconSize: [12, 20],
        iconAnchor: [6, 20],
        popupAnchor: [0, -20]
    });

    plants.forEach(plant => {
        const plantMarker = L.marker([plant.location.lat, plant.location.lng], { icon: plantIcon }).addTo(plantsLayer);
        
        const popupContent = `
            <b>Tag:</b> ${plant.unique_tag || 'N/A'}<br>
            <b>Tipo:</b> ${plant.plant_type}
            <div class="popup-actions">
                <button class="btn-details" data-plant-id="${plant.id}">Details</button>
                <button class="btn-delete" data-plant-id="${plant.id}" data-plant-tag="${plant.unique_tag || ''}">Delete</button>
            </div>
        `;
        plantMarker.bindPopup(popupContent);

        plantMarker.on('popupopen', () => {
            document.querySelector(`.btn-details[data-plant-id="${plant.id}"]`)?.addEventListener('click', () => {
                window.dispatchEvent(new CustomEvent('view-plant-details', { detail: { id: plant.id } }));
            });
            document.querySelector(`.btn-delete[data-plant-id="${plant.id}"]`)?.addEventListener('click', () => {
                onDelete(plant.id, plant.unique_tag);
            });
        });
    });
}

/**
 * Adds a marker for manual polygon drawing and updates the polygon shape.
 * @fires mapchange - Custom event with calculated area.
 * @param {L.LatLng} latlng - The coordinates where the marker should be added.
 */
export function addPolygonMarker(latlng) {
    const point = L.marker(latlng).addTo(polygonLayer);
    polygonPoints.push(point);
    updatePolygon();

    if (polygonPoints.length >= 3) {
        const turfPolygon = getPolygonGeometry();
        const areaInSqMeters = turf.area(turfPolygon);
        const areaInHectares = areaInSqMeters / 10000;
        
        const event = new CustomEvent('mapchange', {
            detail: { area: { squareMeters: areaInSqMeters, hectares: areaInHectares } }
        });
        window.dispatchEvent(event);
    }
}

/**
 * Helper function to redraw the manual polygon on the map as points are added.
 */
function updatePolygon() {
    polygonLayer.eachLayer(layer => {
        if (layer instanceof L.Polygon) {
            polygonLayer.removeLayer(layer);
        }
    });
    
    if (polygonPoints.length >= 2) {
        const latLngs = polygonPoints.map(p => p.getLatLng());
        L.polygon(latLngs, { color: 'blue' }).addTo(polygonLayer);
    }
}

/**
 * Constructs a GeoJSON Polygon geometry from the manually drawn points.
 * @returns {object|null} A GeoJSON Polygon object or null if not enough points.
 */
export function getPolygonGeometry() {
    if (polygonPoints.length < 3) return null;
    
    const coordinates = polygonPoints.map(p => {
        const latlng = p.getLatLng();
        return [latlng.lng, latlng.lat];
    });
    coordinates.push(coordinates[0]); // Close the polygon loop.
    
    return {
        type: 'Polygon',
        coordinates: [coordinates]
    };
}

/**
 * Clears all temporary drawings and points related to manual field creation.
 */
export function clearDrawing() {
    if (polygonLayer) polygonLayer.clearLayers();
    polygonPoints = [];
    const event = new CustomEvent('mapchange', {
        detail: { area: { squareMeters: 0, hectares: 0 } }
    });
    window.dispatchEvent(event);
}

/**
 * Displays a temporary marker on the map for plant creation.
 * @param {L.LatLng} latlng - The location for the temporary marker.
 */
export function showTempPlantMarker(latlng) {
    clearTempPlantMarker();
    tempPlantMarker = L.marker(latlng).addTo(state.mapInstance);
}

/**
 * Removes the temporary plant marker from the map.
 */
export function clearTempPlantMarker() {
    if (tempPlantMarker) {
        state.mapInstance.removeLayer(tempPlantMarker);
        tempPlantMarker = null;
    }
}

// --- Funções de Limpeza e Visualização ---

/** Removes all main data layers from the map. */
export function clearAllDataLayers() {
    if (fieldsLayer) fieldsLayer.clearLayers();
    if (plantsLayer) plantsLayer.clearLayers();
}

/**
 * Sets the opacity of data layers for contextual creation modes.
 * @param {number} opacity - The opacity value (0.0 to 1.0).
 */
export function setMapDataOpacity(opacity) {
    if (fieldsLayer) fieldsLayer.setStyle({ opacity: opacity, fillOpacity: opacity * 0.2 });
    if (plantsLayer) {
        plantsLayer.eachLayer(layer => {
            if (layer.setOpacity) layer.setOpacity(opacity);
        });
    }
}

/**
 * Highlights selected plants with a distinct style.
 * @param {Array<object>} selectedPlants - Array of plant objects to highlight.
 */
export function highlightSelectedPlants(selectedPlants) {
    if (!highlightLayer) return;
    highlightLayer.clearLayers();

    const highlightIcon = L.icon({
        iconUrl: 'https://raw.githubusercontent.com/pointhi/leaflet-color-markers/master/img/marker-icon-red.png',
        shadowUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/0.7.7/images/marker-shadow.png',
        iconSize: [25, 41], iconAnchor: [12, 41], popupAnchor: [1, -34], shadowSize: [41, 41]
    });

    selectedPlants.forEach(plant => {
        L.marker([plant.location.lat, plant.location.lng], { icon: highlightIcon, zIndexOffset: 1000 }).addTo(highlightLayer);
    });
}

/** Removes all highlight markers from the map. */
export function clearHighlight() {
    if (highlightLayer) highlightLayer.clearLayers();
}

/** Removes the user-drawn selection rectangle from the map. */
export function clearSelectionDrawing() {
    if (drawnItems) {
        drawnItems.clearLayers();
    }
}