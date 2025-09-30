// ==========================================================================
// AgriPlanum - Map Service 
// Description: Manages all Leaflet map interactions, including initialization,
//              data rendering (fields, plants), and drawing controls.
// File: map.js
// ==========================================================================

import { state } from './state.js';

// Module-level variables to hold map layers.
let fieldsLayer;
let plantsLayer;
let polygonPoints = [];
let polygonLayer;
let tempPlantMarker;
let highlightLayer;
let selectionRectangle;

/**
 * Initializes the Leaflet map, sets up the tile layer with extended zoom,
 * and configures map controls.
 * @param {string} containerId - The ID of the HTML element where the map will be rendered.
 * @returns {L.Map} The initialized Leaflet map instance.
 */
export function initializeMap(containerId) {
    // Initialize the map with an increased maxZoom level.
    state.mapInstance = L.map(containerId, {
        maxZoom: 24
    }).setView([-14.235, -51.925], 4);

    // Set up the tile layer from OpenStreetMap with custom zoom options.
    L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
        attribution: '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors',
        maxZoom: 24,       // Allows the map UI to zoom in further.
        maxNativeZoom: 19  // Informs Leaflet that tiles are only available up to zoom 19; it will upscale them beyond that.
    }).addTo(state.mapInstance);
    
    // Initialize feature groups to manage layers of fields and plants.
    fieldsLayer = L.featureGroup().addTo(state.mapInstance);
    plantsLayer = L.featureGroup().addTo(state.mapInstance);
    polygonLayer = L.featureGroup().addTo(state.mapInstance);
    highlightLayer = L.featureGroup().addTo(state.mapInstance);

    return state.mapInstance;
}

/**
 * Renders an array of field data as polygons on the map.
 * @param {Array<object>} fields - An array of field objects, each with a 'geometry' property.
 * @param {Function} onDelete - The callback function to execute when a field's delete button is clicked.
 */
export function drawFields(fields, onDelete) {
    fields.forEach(field => {
        const fieldPolygon = L.geoJSON(field.geometry, {
            style: { color: '#2E7D32', weight: 2, opacity: 0.8 }
        }).addTo(fieldsLayer);
        
        // Create popup content with action buttons.
        const popupContent = `
            <b>${field.name}</b><br>
            Área: ${parseFloat(field.area_hectares).toFixed(2)} ha
            <div class="popup-actions">
                <button class="btn-details" data-field-id="${field.id}">Details</button>
                <button class="btn-delete" data-field-id="${field.id}" data-field-name="${field.name}">Delete</button>
            </div>
        `;
        fieldPolygon.bindPopup(popupContent);
    });
}

/**
 * Renders an array of plant data as markers on the map.
 * @param {Array<object>} plants - An array of plant objects, each with a 'location' property.
 * @param {Function} onDelete - The callback function to execute when a plant's delete button is clicked.
 */
export function drawPlants(plants, onDelete) {
    const plantIcon = L.icon({
        iconUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-icon.png',
        iconSize: [12, 20],
        iconAnchor: [6, 20],
        popupAnchor: [0, -20]
    });

    plants.forEach(plant => {
        const plantMarker = L.marker([plant.location.lat, plant.location.lng], { icon: plantIcon }).addTo(plantsLayer);
        
        // Create popup content with action buttons.
        const popupContent = `
            <b>Tag:</b> ${plant.unique_tag || 'N/A'}<br>
            <b>Tipo:</b> ${plant.plant_type}
            <div class="popup-actions">
                <button class="btn-details" data-plant-id="${plant.id}">Details</button>
                <button class="btn-delete" data-plant-id="${plant.id}" data-plant-tag="${plant.unique_tag || ''}">Delete</button>
            </div>
        `;
        plantMarker.bindPopup(popupContent);
    });
}

/**
 * Removes all field and plant layers from the map.
 */
export function clearAllDataLayers() {
    fieldsLayer.clearLayers();
    plantsLayer.clearLayers();
}

/**
 * Sets the opacity of the main data layers (fields and plants).
 * Used for providing visual context during creation modes.
 * @param {number} opacity - The opacity value (0.0 to 1.0).
 */
export function setMapDataOpacity(opacity) {
    fieldsLayer.setStyle({ opacity: opacity, fillOpacity: opacity * 0.2 });
    plantsLayer.eachLayer(layer => {
        if (layer.setOpacity) {
            layer.setOpacity(opacity);
        }
    });
}

/**
 * Adds a marker to the map for polygon drawing and updates the polygon shape.
 * Dispatches a 'mapchange' event with the calculated area.
 * @param {L.LatLng} latlng - The coordinates where the marker should be added.
 */
export function addPolygonMarker(latlng) {
    const point = L.marker(latlng).addTo(polygonLayer);
    polygonPoints.push(point);
    updatePolygon();

    // Calculate area if a polygon can be formed.
    if (polygonPoints.length >= 3) {
        const turfPolygon = getPolygonGeometry();
        const areaInSqMeters = turf.area(turfPolygon);
        const areaInHectares = areaInSqMeters / 10000;
        
        // Dispatch custom event with area data.
        const event = new CustomEvent('mapchange', {
            detail: { area: { squareMeters: areaInSqMeters, hectares: areaInHectares } }
        });
        window.dispatchEvent(event);
    }
}

/**
 * Redraws the polygon on the map based on the current points.
 */
function updatePolygon() {
    // Clear existing polygon before drawing a new one.
    if (polygonLayer.getLayers().length > polygonPoints.length) {
        polygonLayer.eachLayer(layer => {
            if (!(layer instanceof L.Marker)) {
                polygonLayer.removeLayer(layer);
            }
        });
    }
    
    if (polygonPoints.length >= 3) {
        const latLngs = polygonPoints.map(p => p.getLatLng());
        L.polygon(latLngs, { color: 'blue' }).addTo(polygonLayer);
    }
}

/**
 * Constructs a GeoJSON Polygon geometry from the drawn points.
 * @returns {object|null} A GeoJSON Polygon object or null if not enough points.
 */
export function getPolygonGeometry() {
    if (polygonPoints.length < 3) return null;
    
    const coordinates = polygonPoints.map(p => {
        const latlng = p.getLatLng();
        return [latlng.lng, latlng.lat];
    });
    // Close the polygon loop for valid GeoJSON.
    coordinates.push(coordinates[0]);
    
    return {
        type: 'Polygon',
        coordinates: [coordinates]
    };
}

/**
 * Clears all temporary drawings and points related to field creation.
 */
export function clearDrawing() {
    polygonLayer.clearLayers();
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
    clearTempPlantMarker(); // Ensure only one temp marker exists at a time.
    tempPlantMarker = L.marker(latlng, {
        opacity: 0.8,
        icon: L.divIcon({ className: 'blinking-cursor', iconSize: [15, 15] })
    }).addTo(state.mapInstance);
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

/**
 * Highlights a selection of plants on the map with a distinct style.
 * @param {Array<object>} selectedPlants - An array of plant objects to highlight.
 */
export function highlightSelectedPlants(selectedPlants) {
    clearHighlight();
    const highlightIcon = L.icon({
        iconUrl: 'https://raw.githubusercontent.com/pointhi/leaflet-color-markers/master/img/marker-icon-red.png',
        shadowUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/0.7.7/images/marker-shadow.png',
        iconSize: [25, 41],
        iconAnchor: [12, 41],
        popupAnchor: [1, -34],
        shadowSize: [41, 41]
    });

    selectedPlants.forEach(plant => {
        L.marker([plant.location.lat, plant.location.lng], { icon: highlightIcon, zIndexOffset: 1000 }).addTo(highlightLayer);
    });
}

/**
 * Removes all highlight markers from the map.
 */
export function clearHighlight() {
    highlightLayer.clearLayers();
}

/**
 * Clears the user-drawn selection rectangle from the map.
 */
export function clearSelectionDrawing() {
    if (selectionRectangle) {
        state.mapInstance.removeLayer(selectionRectangle);
        selectionRectangle = null;
    }
}