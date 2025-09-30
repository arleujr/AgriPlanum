// ==========================================================================
// AgriPlanum - Map Module 
// Description: Adds function to control opacity of existing data layers.
// File: map.js
// ==========================================================================

let map;
let fieldLayerGroup = null;
let plantLayerGroup = null;
let drawingMarkers = [];
let drawingPolygon = null;
let tempPlantMarker = null;
let drawnItemsLayer = null;
let selectionHighlightLayer = null;

const selectedIcon = new L.Icon({
    iconUrl: 'https://raw.githubusercontent.com/pointhi/leaflet-color-markers/master/img/marker-icon-2x-green.png',
    shadowUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/0.7.7/images/marker-shadow.png',
    iconSize: [25, 41],
    iconAnchor: [12, 41],
    popupAnchor: [1, -34],
    shadowSize: [41, 41]
});

// NOVA FUNÇÃO para controlar a opacidade
export function setMapDataOpacity(opacity) {
    const fillOpacity = opacity === 1 ? 0.2 : opacity * 0.5; // fill mais claro que a borda

    if (plantLayerGroup) {
        plantLayerGroup.eachLayer(layer => {
            if (layer.setOpacity) layer.setOpacity(opacity);
        });
    }
    if (fieldLayerGroup) {
        fieldLayerGroup.eachLayer(layer => {
            if (layer.setStyle) {
                layer.setStyle({ opacity: opacity, fillOpacity: fillOpacity });
            }
        });
    }
}


export function initializeMap(containerId) {
    if (map) { map.remove(); }
    const initialCoords = [-20.754, -42.879];
    map = L.map(containerId).setView(initialCoords, 13);
    L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
        attribution: '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
    }).addTo(map);
    fieldLayerGroup = L.layerGroup().addTo(map);
    plantLayerGroup = L.layerGroup().addTo(map);

    drawnItemsLayer = new L.FeatureGroup();
    selectionHighlightLayer = new L.FeatureGroup();
    map.addLayer(drawnItemsLayer);
    map.addLayer(selectionHighlightLayer);

    const drawControl = new L.Control.Draw({
        edit: { featureGroup: drawnItemsLayer, remove: true },
        draw: {
            polygon: false, polyline: false, marker: false, circle: false, circlemarker: false,
            rectangle: { shapeOptions: { color: '#0288D1' } }
        }
    });
    map.addControl(drawControl);

    map.on(L.Draw.Event.CREATED, (event) => {
        const layer = event.layer;
        drawnItemsLayer.clearLayers();
        drawnItemsLayer.addLayer(layer);
        const bounds = layer.getBounds();
        console.log("Área selecionada:", bounds);
        window.dispatchEvent(new CustomEvent('selection-drawn', { detail: { bounds: bounds } }));
    });
    
    map.on('draw:deleted', () => {
        window.dispatchEvent(new CustomEvent('selection-cleared'));
    });

    console.log("🗺️ Map initialized with Draw Controls.");
    return map;
}

export function highlightSelectedPlants(plants) {
    if (!selectionHighlightLayer) return;
    selectionHighlightLayer.clearLayers();
    
    plantLayerGroup.eachLayer(layer => {
        if (layer.setOpacity) {
            layer.setOpacity(0.3);
        }
    });

    plants.forEach(plant => {
        L.marker([plant.location.lat, plant.location.lng], { icon: selectedIcon })
            .addTo(selectionHighlightLayer);
    });
}

export function clearHighlight() {
    if (selectionHighlightLayer) selectionHighlightLayer.clearLayers();
    
    if (plantLayerGroup) {
        plantLayerGroup.eachLayer(layer => {
            if (layer.setOpacity) {
                layer.setOpacity(1);
            }
        });
    }
}

export function clearSelectionDrawing() {
    if (drawnItemsLayer) {
        drawnItemsLayer.clearLayers();
    }
}

export function clearAllDataLayers() {
    if (fieldLayerGroup) fieldLayerGroup.clearLayers();
    if (plantLayerGroup) plantLayerGroup.clearLayers();
}

export function drawFields(fields, onDelete) {
    if (!fieldLayerGroup) return;
    fields.forEach(field => {
        const reversedCoords = field.geometry.coordinates[0].map(coord => [coord[1], coord[0]]);
        const polygon = L.polygon(reversedCoords, { color: '#2E7D32', weight: 2 });
        const popupContent = `
            <div class="popup-content">
                <b>Talhão:</b> ${field.name}<br>
                <b>Área:</b> ${field.area_hectares} ha
                <div class="popup-actions">
                    <button class="btn-details" id="details-field-${field.id}" title="Ver Detalhes"><i class="fa-solid fa-file-lines"></i></button>
                    <button class="btn-delete" id="delete-field-${field.id}" title="Apagar Talhão"><i class="fa-solid fa-trash-can"></i></button>
                </div>
            </div>
        `;
        polygon.bindPopup(popupContent);

        polygon.on('popupopen', () => {
            document.getElementById(`delete-field-${field.id}`)?.addEventListener('click', () => onDelete(field.id, field.name));
            document.getElementById(`details-field-${field.id}`)?.addEventListener('click', () => {
                 window.dispatchEvent(new CustomEvent('view-field-details', { detail: { id: field.id } }));
            });
        });

        polygon.on('dblclick', () => {
            window.dispatchEvent(new CustomEvent('view-field-details', { detail: { id: field.id } }));
        });

        fieldLayerGroup.addLayer(polygon);
    });
}

export function drawPlants(plants, onDelete) {
    if (!plantLayerGroup) return;

    plants.forEach(plant => {
        const marker = L.marker([plant.location.lat, plant.location.lng]);
        const popupContent = `
            <div class="popup-content">
                <b>Planta:</b> ${plant.unique_tag}<br>
                <b>Tipo:</b> ${plant.plant_type}
                <div class="popup-actions">
                    <button class="btn-details" id="details-plant-${plant.id}" title="Ver Detalhes"><i class="fa-solid fa-file-lines"></i></button>
                    <button class="btn-delete" id="delete-plant-${plant.id}" title="Apagar Planta"><i class="fa-solid fa-trash-can"></i></button>
                </div>
            </div>
        `;
        marker.bindPopup(popupContent);
        marker.on('popupopen', () => {
            document.getElementById(`delete-plant-${plant.id}`)?.addEventListener('click', () => onDelete(plant.id, plant.unique_tag));
            document.getElementById(`details-plant-${plant.id}`)?.addEventListener('click', () => {
                window.dispatchEvent(new CustomEvent('view-plant-details', { detail: { id: plant.id } }));
            });
        });

        marker.on('dblclick', () => {
            window.dispatchEvent(new CustomEvent('view-plant-details', { detail: { id: plant.id } }));
        });

        plantLayerGroup.addLayer(marker);
    });
}

function updateDrawingPolygon() {
    const latLngs = drawingMarkers.map(marker => marker.getLatLng());
    if (drawingPolygon) {
        drawingPolygon.setLatLngs(latLngs);
    } else if (latLngs.length > 1) {
        drawingPolygon = L.polygon(latLngs, { color: '#0288D1', dashArray: '5, 5' }).addTo(map);
    }
}

export function addPolygonMarker(latlng) {
    const marker = L.marker(latlng).addTo(map);
    drawingMarkers.push(marker);
    updateDrawingPolygon();
    const mapChangeEvent = new CustomEvent('mapchange', { detail: { area: calculateArea() } });
    window.dispatchEvent(mapChangeEvent);
}

export function showTempPlantMarker(latlng) {
    if (tempPlantMarker) map.removeLayer(tempPlantMarker);
    const greenIcon = new L.Icon({
        iconUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon.png',
        iconRetinaUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon-2x.png',
        shadowUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-shadow.png',
        iconSize: [25, 41], iconAnchor: [12, 41], popupAnchor: [1, -34], shadowSize: [41, 41],
    });
    tempPlantMarker = L.marker(latlng, { icon: greenIcon }).addTo(map);
}

export function clearTempPlantMarker() {
    if (tempPlantMarker) {
        map.removeLayer(tempPlantMarker);
        tempPlantMarker = null;
    }
}

export function clearDrawing() {
    drawingMarkers.forEach(marker => map.removeLayer(marker));
    if (drawingPolygon) map.removeLayer(drawingPolygon);
    drawingMarkers = [];
    drawingPolygon = null;
    const mapChangeEvent = new CustomEvent('mapchange', { detail: { area: { hectares: 0, squareMeters: 0 } } });
    window.dispatchEvent(mapChangeEvent);
}

export function calculateArea() {
    if (drawingMarkers.length < 3) return { hectares: 0, squareMeters: 0 };
    const coordinates = drawingMarkers.map(marker => [marker.getLatLng().lng, marker.getLatLng().lat]);
    coordinates.push(coordinates[0]);
    const areaInSquareMeters = turf.area(turf.polygon([coordinates]));
    return { hectares: areaInSquareMeters / 10000, squareMeters: areaInSquareMeters };
}

export function getPolygonGeometry() {
    if (drawingMarkers.length < 3) return null;
    const coordinates = drawingMarkers.map(marker => [marker.getLatLng().lng, marker.getLatLng().lat]);
    coordinates.push(coordinates[0]);
    return { type: "Polygon", coordinates: [coordinates] };
}