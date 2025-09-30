// ==========================================================================
// AgriPlanum - Event Handlers
// Description: Manages all user interactions, UI updates, API calls, and
//              state transitions for the AgriPlanum application.
// File: handlers.js
// ==========================================================================

import { state } from './state.js';
import * as ui from './ui.js';
import * as auth from './auth.js';
import * as api from './api.js';
import * as map from './map.js';
import { formatDate, getPlantingSeason } from './utils.js';

// Module-level variable to store currently selected plants.
let currentSelectedPlants = [];

/**
 * Handles the custom event dispatched when a user finishes drawing a selection rectangle on the map.
 * Filters plants within the selection bounds and updates the UI to selection mode.
 * @param {CustomEvent} event - The event object containing the selection bounds in `event.detail.bounds`.
 */
export function handleSelectionDrawn(event) {
    const bounds = event.detail.bounds;
    currentSelectedPlants = [];

    // Filter plants that are within the drawn rectangle
    state.plants.forEach(plant => {
        const plantLatLng = L.latLng(plant.location.lat, plant.location.lng);
        if (bounds.contains(plantLatLng)) {
            currentSelectedPlants.push(plant);
        }
    });

    console.log(`${currentSelectedPlants.length} plants selected.`, currentSelectedPlants);

    // Switch UI from view controls to selection controls
    ui.elements.viewControls.classList.add('hidden');
    ui.elements.selectionControls.classList.remove('hidden');
    ui.elements.selectionStatus.textContent = `${currentSelectedPlants.length} plants selected`;

    // Enable field creation only if enough plants are selected
    if (currentSelectedPlants.length >= 3) {
        ui.elements.createFieldFromSelectionBtn.disabled = false;
    } else {
        ui.elements.createFieldFromSelectionBtn.disabled = true;
        ui.elements.selectionStatus.textContent += '. (Minimum of 3 required to create a field)';
    }
    
    map.highlightSelectedPlants(currentSelectedPlants);
}

/**
 * Resets the selection state and returns the UI to the default view mode.
 */
export function clearSelectionState() {
    currentSelectedPlants = [];
    ui.elements.selectionControls.classList.add('hidden');
    ui.elements.viewControls.classList.remove('hidden');
    map.clearHighlight();
    map.clearSelectionDrawing();
    map.setMapDataOpacity(1.0); // Restore full opacity
}

/**
 * Handles the creation of a new field from the currently selected plants.
 * It calculates the convex hull of the plant locations to define the field's geometry.
 * @returns {Promise<void>}
 */
export async function handleCreateFieldFromSelection() {
    if (currentSelectedPlants.length < 3) {
        alert("At least 3 plants are required to create a field.");
        return;
    }

    const fieldName = prompt("Enter the name for the new field:");
    if (!fieldName || fieldName.trim() === '') {
        alert("Creation cancelled. Field name is required.");
        return;
    }

    // Create a convex hull polygon from the selected plant locations using Turf.js
    const points = currentSelectedPlants.map(p => turf.point([p.location.lng, p.location.lat]));
    const featureCollection = turf.featureCollection(points);
    const hull = turf.convex(featureCollection);

    if (!hull) {
        alert("Could not create a field. The selected plants may be in a straight line.");
        return;
    }

    const areaInSqMeters = turf.area(hull);
    const areaInHectares = areaInSqMeters / 10000;

    const fieldData = {
        name: fieldName.trim(),
        geometry: hull.geometry,
        area_hectares: areaInHectares.toFixed(4)
    };

    const button = ui.elements.createFieldFromSelectionBtn;
    ui.setButtonLoading(button, true, 'Saving...');

    try {
        await api.saveField(fieldData, state.token);
        alert('Field created successfully!');
        clearSelectionState();
        loadMapData(); // Refresh map data
    } catch (error) {
        console.error('Error creating field from selection:', error);
        alert(`Error saving field: ${error.message}`);
    } finally {
        ui.setButtonLoading(button, false);
    }
}


/**
 * Callback function executed upon successful user login.
 * Stores the token and fetches initial application data like varieties.
 * @param {string} token - The JWT authentication token.
 * @returns {Promise<void>}
 */
export async function onLoginSuccess(token) {
    state.token = token;
    ui.showScreen('setup');
    console.log("✅ Login successful.");
    try {
        const varietiesData = await api.fetchVarieties(state.token);
        // Normalize varieties data into a key-value object for easy lookup
        state.varieties = varietiesData.reduce((acc, variety) => {
            const key = variety.name.toLowerCase().replace(/ /g, '-').replace('---', '-');
            acc[key] = variety;
            return acc;
        }, {});
        ui.populateVarieties(state.varieties);
    } catch (error) {
        console.error("Failed to fetch varieties:", error);
    }
}

/**
 * Fetches and renders all map data (fields and plants) from the API.
 * @returns {Promise<void>}
 */
export async function loadMapData() {
    if (!state.token) return;
    ui.showMessage(ui.elements.mapViewStatus, 'Loading map data...');
    try {
        const [fields, plants] = await Promise.all([api.fetchFields(state.token), api.fetchPlants(state.token)]);
        state.fields = fields;
        state.plants = plants;
        map.clearAllDataLayers();
        map.drawFields(state.fields, handleDeleteField);
        map.drawPlants(state.plants, handleDeletePlant);
        ui.showMessage(ui.elements.mapViewStatus, `Displaying ${fields.length} fields and ${plants.length} plants.`);
    } catch (error) {
        console.error("Error loading map data:", error);
        ui.showMessage(ui.elements.mapViewStatus, `Error loading data: ${error.message}`);
    }
}

/**
 * Handles the deletion of a field after user confirmation.
 * @param {number} fieldId - The ID of the field to delete.
 * @param {string} fieldName - The name of the field for the confirmation dialog.
 * @returns {Promise<void>}
 */
export async function handleDeleteField(fieldId, fieldName) {
    if (confirm(`Are you sure you want to delete the field "${fieldName}"? This action cannot be undone.`)) {
        try {
            await api.deleteField(fieldId, state.token);
            loadMapData(); // Refresh map data
        } catch (error) {
            console.error('Error deleting field:', error);
            alert(`Error deleting field: ${error.message}`);
        }
    }
}

/**
 * Handles the deletion of a single plant after user confirmation.
 * @param {number} plantId - The ID of the plant to delete.
 * @param {string} plantTag - The unique tag of the plant for the confirmation dialog.
 * @returns {Promise<void>}
 */
export async function handleDeletePlant(plantId, plantTag) {
    if (confirm(`Are you sure you want to delete the plant "${plantTag}"?`)) {
        try {
            await api.deletePlant(plantId, state.token);
            loadMapData(); // Refresh map data
        } catch (error) {
            console.error('Error deleting plant:', error);
            alert(`Error deleting plant: ${error.message}`);
        }
    }
}

/**
 * Fetches and displays detailed information for a selected field.
 * @param {CustomEvent} event - The event containing the field ID in `event.detail.id`.
 * @returns {Promise<void>}
 */
export async function handleViewFieldDetails(event) {
    const fieldId = event.detail.id;
    ui.showView('field-details-view');
    // Set loading placeholders
    ui.elements.detailsFieldName.textContent = 'Loading...';
    ui.elements.detailsFieldInfoList.innerHTML = '';
    ui.elements.detailsPlantTableBody.innerHTML = `<tr><td colspan="3">Loading plants...</td></tr>`;

    try {
        const fieldData = await api.fetchFieldDetails(fieldId, state.token);
        
        ui.elements.detailsFieldName.textContent = fieldData.name;
        const createdAt = new Date(fieldData.created_at);
        ui.elements.detailsFieldInfoList.innerHTML = `
            <li><span>Field ID:</span> <span>${fieldData.id}</span></li>
            <li><span>Area:</span> <span>${fieldData.area_hectares} ha</span></li>
            <li><span>Created On:</span> <span>${formatDate(createdAt)}</span></li>
        `;

        // Populate the plants table within the field details
        ui.elements.detailsPlantCount.textContent = fieldData.plants.length;
        if (fieldData.plants.length > 0) {
            ui.elements.detailsPlantTableBody.innerHTML = fieldData.plants.map(plant => `
                <tr>
                    <td>${plant.unique_tag}</td>
                    <td>${plant.plant_type}</td>
                    <td>${formatDate(new Date(plant.created_at))}</td>
                </tr>
            `).join('');
        } else {
            ui.elements.detailsPlantTableBody.innerHTML = `<tr><td colspan="3">No plants registered in this field.</td></tr>`;
        }

    } catch (error) {
        console.error("Error fetching field details:", error);
        ui.elements.detailsFieldName.textContent = "Error Loading Details";
    }
}

/**
 * Fetches and displays detailed information for a selected plant.
 * @param {CustomEvent} event - The event containing the plant ID in `event.detail.id`.
 * @returns {Promise<void>}
 */
export async function handleViewPlantDetails(event) {
    const plantId = event.detail.id;
    ui.showView('plant-details-view');
    // Set loading placeholders
    ui.elements.detailsPlantTag.textContent = 'Loading...';
    ui.elements.detailsPlantInfoList.innerHTML = '';
    ui.elements.detailsPlantCustomDataList.innerHTML = '';

    try {
        const plantData = await api.fetchPlantDetails(plantId, state.token);
        
        ui.elements.detailsPlantTag.textContent = `Details for: ${plantData.unique_tag}`;
        const createdAt = new Date(plantData.created_at);
        ui.elements.detailsPlantInfoList.innerHTML = `
            <li><span>Plant ID:</span> <span>${plantData.id}</span></li>
            <li><span>Type:</span> <span>${plantData.plant_type}</span></li>
            <li><span>Created On:</span> <span>${formatDate(createdAt)}</span></li>
            ${plantData.field_id ? `<li><span>Belongs to Field:</span> <span>ID ${plantData.field_id}</span></li>` : ''}
        `;

        // Display any custom data associated with the plant
        const customData = plantData.custom_data || {};
        if (Object.keys(customData).length > 0) {
            ui.elements.detailsPlantCustomDataList.innerHTML = Object.entries(customData).map(([key, value]) => `
                <li><span>${key.replace(/_/g, ' ').replace(/\b\w/g, c => c.toUpperCase())}:</span> <span>${value}</span></li>
            `).join('');
        } else {
            ui.elements.detailsPlantCustomDataList.innerHTML = `<li><span>No custom data available.</span></li>`;
        }
    } catch (error) {
        console.error("Error fetching plant details:", error);
        ui.elements.detailsPlantTag.textContent = "Error Loading Details";
    }
}

/**
 * Calculates and displays the estimated harvest date and development timeline for a selected variety.
 */
export function handleCycleCalculation() {
    ui.elements.resultsContainer.classList.add('hidden');
    const varietyKey = ui.elements.varietySelect.value;
    const plantingDateStr = ui.elements.plantingDateInput.value;
    const regionKey = document.getElementById('region-select').value;

    if (!varietyKey || !plantingDateStr || !regionKey) {
        alert("Please select a variety, region, and planting date.");
        return;
    }

    const cultivar = state.varieties[varietyKey];
    const regionData = state.zoningData[regionKey];
    const userDate = new Date(plantingDateStr + 'T00:00:00');
    
    // Determine the planting season based on date and region
    const userMonth = userDate.getUTCMonth() + 1;
    const userDay = userDate.getUTCDate();
    const plantingSeason = getPlantingSeason(userMonth, userDay, regionData);
    
    // Calculate the total cycle duration and create a timeline
    let totalCycleDays = Object.values(cultivar.stages).reduce((acc, days) => acc + days, 0);
    let timelineHTML = `<h4>Development Timeline:</h4><ul>`;
    let currentDate = new Date(userDate);
    for (const stageName in cultivar.stages) {
        const stageDuration = cultivar.stages[stageName];
        currentDate.setDate(currentDate.getDate() + stageDuration);
        timelineHTML += `<li><strong>${stageName}:</strong><br>${formatDate(new Date(currentDate.getTime() - stageDuration * 86400000))} to ${formatDate(currentDate)} (${stageDuration} days)</li>`;
    }
    timelineHTML += '</ul>';
    
    const harvestDate = formatDate(currentDate);
    const resultHtml = `Your planting date is in the ${plantingSeason}.<br><br>For <strong>${cultivar.name}</strong> (total cycle of <strong>${totalCycleDays}</strong> days), the estimated harvest date is: <strong>${harvestDate}</strong>.<hr>${timelineHTML}`;
    
    ui.showMessage(ui.elements.resultTextElement, resultHtml, true);
    ui.elements.resultsContainer.classList.remove('hidden');
}

/**
 * Calculates the recommended number of seeds to purchase based on area, variety, and conditions.
 */
export function handleSowingCalculation() {
    ui.elements.sowingResultsContainer.classList.add('hidden');
    const area = parseFloat(document.getElementById('sowing-area').value);
    const varietyKey = ui.elements.sowingVarietySelect.value;
    const germinationRate = parseFloat(document.getElementById('germination-rate').value);

    if (!area || !varietyKey || !germinationRate) {
        alert("Please fill in all fields correctly.");
        return;
    }
    
    const cultivar = state.varieties[varietyKey];
    const conditions = document.getElementById('field-conditions').value;
    
    // Adjust for field conditions
    let conditionFactor = 1.0;
    if (conditions === 'average') conditionFactor = 1.05;
    else if (conditions === 'poor') conditionFactor = 1.10;
    
    // Adjust for germination rate
    const germinationFactor = 100 / germinationRate;
    
    const seedsToBuy = (area * cultivar.target_population) * germinationFactor * conditionFactor;
    const resultHtml = `You will need approximately <strong>${Math.ceil(seedsToBuy).toLocaleString('pt-BR')} seeds</strong> to achieve the target population.`;
    
    ui.showMessage(ui.elements.sowingResultText, resultHtml, true);
    ui.elements.sowingResultsContainer.classList.remove('hidden');
}

/**
 * Analyzes user-provided soil data against the ideal conditions for a selected variety.
 */
export function handleSoilAnalysis() {
    ui.elements.soilResultsContainer.classList.add('hidden');
    const varietyKey = ui.elements.soilVarietySelect.value;
    if (!varietyKey) {
        alert("Please select a reference variety.");
        return;
    }
    // Gather all soil input values
    const inputs = {
        ph: parseFloat(document.getElementById('soil-ph').value), v: parseFloat(document.getElementById('soil-v').value),
        al: parseFloat(document.getElementById('soil-al').value), p: parseFloat(document.getElementById('soil-p').value),
        k: parseFloat(document.getElementById('soil-k').value), ca: parseFloat(document.getElementById('soil-ca').value),
        mg: parseFloat(document.getElementById('soil-mg').value), s: parseFloat(document.getElementById('soil-s').value),
        b: parseFloat(document.getElementById('soil-b').value), zn: parseFloat(document.getElementById('soil-zn').value),
        n: parseFloat(document.getElementById('soil-n').value)
    };

    if (Object.values(inputs).some(v => isNaN(v))) {
        ui.showMessage(ui.elements.soilResultList, `<li class="high">Please fill all fields with valid numbers.</li>`, true);
        ui.elements.soilResultsContainer.classList.remove('hidden');
        return;
    }
    
    const ideal = state.varieties[varietyKey].ideal_soil_conditions;
    let reportHTML = '';

    /**
     * Helper to generate a report line item comparing a value against an ideal range.
     * @param {string} label - The nutrient/property name.
     * @param {string} unit - The unit of measurement.
     * @param {number} value - The user's input value.
     * @param {number} idealMin - The minimum ideal value.
     * @param {number} [idealMax] - The maximum ideal value (optional).
     * @param {boolean} [isReversed=false] - If true, a high value is good (e.g., for Aluminum).
     * @returns {string} HTML list item string.
     */
    const createReportLine = (label, unit, value, idealMin, idealMax, isReversed = false) => {
        let status = 'ok'; let idealText = `> ${idealMin}`;
        if (idealMax !== undefined) {
            idealText = `${idealMin} - ${idealMax}`;
            if (value < idealMin) status = 'low'; if (value > idealMax) status = 'high';
        } else {
            if (isReversed) { // For values that should be BELOW a threshold (e.g., Aluminum)
                if (value > idealMin) status = 'high'; idealText = `< ${idealMin}`;
            } else { // For values that should be ABOVE a threshold
                if (value < idealMin) status = 'low';
            }
        }
        return `<li class="${status}"><span>${label}: <strong>${value} ${unit}</strong></span> <span>(Ideal: ${idealText})</span></li>`;
    };
    
    // Generate report for each nutrient
    reportHTML += createReportLine('pH (CaCl₂)', '', inputs.ph, ideal.ph.min, ideal.ph.max);
    reportHTML += createReportLine('Base Saturation (V%)', '%', inputs.v, ideal.v_percent.min);
    reportHTML += createReportLine('Aluminum (Al³⁺)', 'cmolc', inputs.al, ideal.al_cmolc.max, undefined, true);
    reportHTML += createReportLine('Phosphorus (P)', 'ppm', inputs.p, ideal.p_ppm.min);
    reportHTML += createReportLine('Potassium (K)', 'ppm', inputs.k, ideal.k_ppm.min);
    reportHTML += createReportLine('Calcium (Ca)', 'cmolc', inputs.ca, ideal.ca_cmolc.min);
    reportHTML += createReportLine('Magnesium (Mg)', 'cmolc', inputs.mg, ideal.mg_cmolc.min);
    reportHTML += createReportLine('Sulfur (S)', 'ppm', inputs.s, ideal.s_ppm.min);
    reportHTML += createReportLine('Boron (B)', 'ppm', inputs.b, ideal.b_ppm.min);
    reportHTML += createReportLine('Zinc (Zn)', 'ppm', inputs.zn, ideal.zn_ppm.min);
    reportHTML += createReportLine('Nitrogen (N)', 'ppm', inputs.n, ideal.n_ppm.min);
    
    ui.showMessage(ui.elements.soilResultList, reportHTML, true);
    ui.elements.soilResultsContainer.classList.remove('hidden');
}

/**
 * Handles saving a new field drawn on the map.
 * @returns {Promise<void>}
 */
export async function handleSaveField() {
    const fieldName = ui.elements.fieldNameInput.value.trim();
    const geometry = map.getPolygonGeometry();
    if (!fieldName || !geometry) {
        ui.showMessage(ui.elements.mapMessage, 'Field name and at least 3 points on the map are required.');
        return;
    }
    
    ui.showMessage(ui.elements.mapMessage, '');
    ui.setButtonLoading(ui.elements.saveFieldBtn, true, 'Saving...');
    
    const fieldData = { name: fieldName, geometry: geometry, area_hectares: state.currentMapArea.hectares };
    
    try {
        await api.saveField(fieldData, state.token);
        exitCreationMode();
    } catch (error) {
        console.error('Error creating field:', error);
        ui.showMessage(ui.elements.mapMessage, `Error saving: ${error.message}`);
        ui.setButtonLoading(ui.elements.saveFieldBtn, false, 'Save Field'); // Revert button text
    }
}

/**
 * Handles saving a new plant from the form data.
 * @param {Event} event - The form submission event.
 * @returns {Promise<void>}
 */
export async function handleSavePlant(event) {
    event.preventDefault(); // Prevent default form submission
    
    const formButton = ui.elements.savePlantBtn;
    const plantData = {
        location: state.currentPlantLocation,
        plant_type: ui.elements.plantTypeSelect.value,
        unique_tag: ui.elements.plantTagInput.value.trim(),
        custom_data: {}
    };

    if (!plantData.location) {
        ui.showMessage(ui.elements.plantFormMessage, 'Please click on the map to set a location.');
        return;
    }
    if (!plantData.plant_type || !plantData.unique_tag) {
        ui.showMessage(ui.elements.plantFormMessage, 'Culture Type and Unique Tag are required.');
        return;
    }
    
    ui.setButtonLoading(formButton, true, 'Saving...');
    
    try {
        await api.savePlant(plantData, state.token);
        exitCreationMode();
    } catch (error) {
        console.error('Error creating plant:', error);
        ui.showMessage(ui.elements.plantFormMessage, `Error: ${error.message}`);
        ui.setButtonLoading(formButton, false, 'Save Plant');
    }
}

/**
 * Sets the location for a new plant being created.
 * Updates the state and UI to reflect the selected location.
 * @param {L.LatLng} latlng - The geographic coordinates.
 */
function setPlantLocation(latlng) {
    if (state.currentMapMode !== 'create-plant') return;
    
    state.currentPlantLocation = { lat: latlng.lat, lng: latlng.lng };
    map.showTempPlantMarker(latlng);
    if (state.mapInstance) {
        state.mapInstance.panTo(latlng);
    }
    
    // Update UI and enable form fields
    ui.elements.plantCreationStatus.textContent = 'Location set! Please fill in the details below.';
    ui.elements.plantTypeSelect.disabled = false;
    ui.elements.plantTagInput.disabled = false;
    ui.elements.generateTagBtn.disabled = false;
    ui.elements.savePlantBtn.disabled = false;
}

/**
 * Uses the browser's Geolocation API to get the user's current position.
 * @returns {Promise<void>}
 */
export async function handleUseGps() {
    if (!navigator.geolocation) {
        alert("Geolocation is not supported by your browser.");
        return;
    }
    
    const button = ui.elements.useGpsBtn;
    ui.setButtonLoading(button, true, 'Getting GPS...');
    
    const success = (position) => {
        const lat = position.coords.latitude;
        const lng = position.coords.longitude;
        setPlantLocation({ lat, lng });
        ui.setButtonLoading(button, false);
    };
    
    const error = (err) => {
        let message = '';
        switch(err.code) {
            case err.PERMISSION_DENIED:
                message = "You denied the request for Geolocation.";
                break;
            case err.POSITION_UNAVAILABLE:
                message = "Location information is unavailable.";
                break;
            case err.TIMEOUT:
                message = "The request to get user location timed out.";
                break;
            default:
                message = "An unknown error occurred.";
                break;
        }
        alert(`Error getting location: ${message}`);
        ui.setButtonLoading(button, false);
    };
    
    // Request position with high accuracy
    navigator.geolocation.getCurrentPosition(success, error, {
        enableHighAccuracy: true,
        timeout: 10000,
        maximumAge: 0
    });
}

/**
 * Handles click events on the map, delegating actions based on the current mode.
 * @param {L.LeafletMouseEvent} e - The map click event object.
 */
export function handleMapClick(e) {
    if (state.currentMapMode === 'create-field') {
        map.addPolygonMarker(e.latlng);
    } else if (state.currentMapMode === 'create-plant') {
        setPlantLocation(e.latlng);
    }
}

// ==========================================================
// ==         MODIFIED STATE-CHANGING FUNCTIONS            ==
// ==========================================================

/**
 * Enters the 'Add Field' mode.
 * Fades existing map data to provide visual context for drawing.
 */
export function enterAddFieldMode() {
    state.currentMapMode = 'create-field';
    ui.elements.viewControls.classList.add('hidden');
    ui.elements.plantCreationControls.classList.add('hidden');
    ui.elements.fieldCreationControls.classList.remove('hidden');
    ui.elements.mapViewDescription.textContent = 'Draw the new field polygon on the map.';
    // Fade existing data instead of clearing it
    map.setMapDataOpacity(0.5);
}

/**
 * Enters the 'Add Plant' mode.
 * Fades existing map data to provide visual context for placement.
 */
export function enterAddPlantMode() {
    state.currentMapMode = 'create-plant';
    ui.elements.viewControls.classList.add('hidden');
    ui.elements.fieldCreationControls.classList.add('hidden');
    ui.elements.plantCreationControls.classList.remove('hidden');
    ui.elements.mapViewDescription.textContent = 'Adding a new plant.';
    // Fade existing data instead of clearing it
    map.setMapDataOpacity(0.5);
}

/**
 * Exits any creation mode and returns to the default 'view' mode.
 * Cleans up UI, temporary map layers, and resets forms.
 */
export function exitCreationMode() {
    state.currentMapMode = 'view';
    
    // Hide creation controls and show view controls
    ui.elements.fieldCreationControls.classList.add('hidden');
    ui.elements.plantCreationControls.classList.add('hidden');
    ui.elements.viewControls.classList.remove('hidden');
    ui.elements.mapViewDescription.textContent = 'Viewing your fields and plants. Use the buttons to add new items.';
    
    // Clean up temporary map elements and forms
    map.clearDrawing();
    map.clearTempPlantMarker();
    ui.elements.plantForm.reset();
    ui.elements.fieldNameInput.value = '';
    ui.showMessage(ui.elements.mapMessage, '');
    ui.showMessage(ui.elements.plantFormMessage, '');
    
    // === TRANSLATION APPLIED HERE ===
    ui.elements.plantCreationStatus.textContent = "Click on the map to set the plant's location.";
    
    // Reset buttons to their default state
    ui.setButtonLoading(ui.elements.saveFieldBtn, false, 'Save Field');
    ui.setButtonLoading(ui.elements.savePlantBtn, false, 'Save Plant');
    
    // Disable plant form until a location is selected again
    ui.elements.plantTypeSelect.disabled = true;
    ui.elements.plantTagInput.disabled = true;
    ui.elements.generateTagBtn.disabled = true;
    ui.elements.savePlantBtn.disabled = true;
    
    // Reset state variables and reload data
    state.currentPlantLocation = null;
    loadMapData();
    
    // Restore full opacity to map data
    map.setMapDataOpacity(1.0);
}

/**
 * Updates the area display as a user draws a polygon.
 * Toggles between hectares and square meters based on the current state.
 */
export function updateAreaDisplay() {
    const area = state.currentMapArea;
    const button = ui.elements.unitToggleBtn;
    let displayText = '';

    if (state.displayUnit === 'ha') {
        displayText = `Area: <strong>${area.hectares.toFixed(2)} ha</strong>`;
        button.textContent = 'Switch to m²';
    } else {
        displayText = `Area: <strong>${area.squareMeters.toLocaleString('pt-BR', { maximumFractionDigits: 0 })} m²</strong>`;
        button.textContent = 'Switch to ha';
    }
    
    ui.showMessage(ui.elements.mapResults, displayText, true);
}