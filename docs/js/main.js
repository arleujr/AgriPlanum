// ==========================================================================
// AgriPlanum - Application Entry Point
// Description: This file initializes the application, checks for user
//              authentication, and sets up all global event listeners that
//              connect UI elements to their corresponding handler functions.
// ==========================================================================

import * as ui from './ui.js';
import * as auth from './auth.js';
import * as map from './map.js';
import { state } from './state.js';
import { 
    onLoginSuccess, 
    handleCycleCalculation, 
    handleSowingCalculation, 
    handleSoilAnalysis, 
    handleSaveField, 
    handleSavePlant,
    handleDeleteField,
    handleDeletePlant,
    handleViewFieldDetails,
    handleViewPlantDetails,
    handleMapClick, 
    enterAddFieldMode, 
    enterAddPlantMode,
    handleSelectionDrawn, 
    clearSelectionState,
    handleCreateFieldFromSelection,
    handleUseGps, 
    exitCreationMode, 
    loadMapData, 
    updateAreaDisplay 
} from './handlers.js';

/**
 * Centralized function to set up all DOM event listeners for the application.
 * This function organizes listeners by their functional area (e.g., Auth, Navigation, Map).
 * @returns {void}
 */
function setupEventListeners() {
    
    // --- Authentication ---
    // Handles toggling between login and registration forms.
    ui.elements.showRegisterLink.addEventListener('click', (e) => { e.preventDefault(); ui.toggleAuthForms('register'); });
    ui.elements.showLoginLink.addEventListener('click', (e) => { e.preventDefault(); ui.toggleAuthForms('login'); });
    // Handles form submissions for registration and login.
    ui.elements.registerForm.addEventListener('submit', auth.handleRegisterSubmit);
    ui.elements.loginForm.addEventListener('submit', (e) => auth.handleLoginSubmit(e, onLoginSuccess));
    
    // --- Main Navigation & Dashboard ---
    // Button to navigate from the setup screen to the main dashboard.
    ui.elements.goToDashboardBtn.addEventListener('click', () => {
        ui.showScreen('main');
        ui.showView('dashboard-view');
    });

    // A multi-level back button with contextual navigation logic.
    ui.elements.backToSetupBtn.addEventListener('click', () => {
        const currentView = document.querySelector('.view.active');
        if (currentView && currentView.id === 'field-details-view') {
            ui.showView('map-view'); // From field details -> map
        } else if (currentView && (currentView.id === 'map-view' || currentView.id === 'cycle-planner-view' || currentView.id === 'sowing-calculator-view' || currentView.id === 'soil-analysis-view')) {
            ui.showView('dashboard-view'); // From a main tool -> dashboard
        } else if (currentView && currentView.id === 'dashboard-view') {
            ui.showScreen('setup'); // From dashboard -> setup screen
        } else {
            ui.showView('dashboard-view'); // Default fallback
        }
    });

    // Binds click events to all dashboard buttons to show the corresponding view.
    ui.elements.dashboardButtons.forEach(button => {
        button.addEventListener('click', () => {
            const viewId = button.dataset.view;
            if (viewId) {
                ui.showView(viewId);
                // Special handling for the map view: initialize it if it doesn't exist.
                if (viewId === 'map-view') {
                    setTimeout(() => {
                       if (!state.mapInstance) {
                            state.mapInstance = map.initializeMap('map-container');
                            state.mapInstance.on('click', handleMapClick); // Attach global map click handler
                       }
                       state.mapInstance.invalidateSize(); // Ensures map renders correctly in a revealed container.
                       exitCreationMode(); // Start in a clean view state.
                    }, 100); // Timeout allows the container to become visible before map initialization.
                }
            }
        });
    });

    // --- Calculation Modules ---
    // When a variety is selected, display its information.
    ui.elements.varietySelect.addEventListener('change', () => {
        const varietyKey = ui.elements.varietySelect.value;
        if (varietyKey && state.varieties[varietyKey]) {
            const variety = state.varieties[varietyKey];
            ui.showMessage(ui.elements.cultivarInfoWindow, variety.description);
            ui.elements.cultivarInfoElement.classList.remove('hidden');
        } else {
            ui.elements.cultivarInfoElement.classList.add('hidden');
        }
    });
    // Binds calculation buttons to their respective handlers.
    ui.elements.calculateCycleBtn.addEventListener('click', handleCycleCalculation);
    ui.elements.calculateSowingBtn.addEventListener('click', handleSowingCalculation);
    ui.elements.analyzeSoilBtn.addEventListener('click', handleSoilAnalysis);

    // --- Map View Controls ---
    ui.elements.refreshMapBtn.addEventListener('click', loadMapData);
    ui.elements.enterAddFieldModeBtn.addEventListener('click', enterAddFieldMode);
    ui.elements.enterAddPlantModeBtn.addEventListener('click', enterAddPlantMode);
    
    // --- Field Creation Controls ---
    ui.elements.saveFieldBtn.addEventListener('click', handleSaveField);
    ui.elements.cancelFieldCreationBtn.addEventListener('click', exitCreationMode);
    ui.elements.clearMapBtn.addEventListener('click', map.clearDrawing);
    // Toggles the area display unit between hectares and square meters.
    ui.elements.unitToggleBtn.addEventListener('click', () => {
        state.displayUnit = state.displayUnit === 'ha' ? 'm2' : 'ha';
        updateAreaDisplay();
    });

    // --- Plant Creation Controls ---
    ui.elements.plantForm.addEventListener('submit', handleSavePlant);
    ui.elements.cancelPlantCreationBtn.addEventListener('click', exitCreationMode);
    // Generates a simple unique tag for a new plant.
    ui.elements.generateTagBtn.addEventListener('click', () => {
        ui.elements.plantTagInput.value = `plant-${Date.now()}`;
    });
    ui.elements.useGpsBtn.addEventListener('click', handleUseGps);
    
    // --- Custom Global Event Listeners ---
    // Listens for area changes from the map module to update the UI.
    window.addEventListener('mapchange', (event) => {
        state.currentMapArea = event.detail.area;
        updateAreaDisplay();
    });
    // Listens for events to open the field/plant details view.
    window.addEventListener('view-field-details', handleViewFieldDetails);
    window.addEventListener('view-plant-details', handleViewPlantDetails);
    // Listens for selection events from the map module.
    window.addEventListener('selection-drawn', handleSelectionDrawn);
    window.addEventListener('selection-cleared', clearSelectionState);
    // Listens for authentication errors (e.g., expired token) to log the user out.
     window.addEventListener('auth-error', () => {
        console.warn("Authentication error detected. Logging out.");
        auth.logout();
        ui.showScreen('auth');
        ui.showMessage(ui.elements.loginErrorMessage, "Your session has expired. Please log in again.");
    });
    
    // --- Variety Details Modal ---
    // Opens the modal with details for the selected variety.
    ui.elements.showDetailsBtn.addEventListener('click', () => {
        const varietyKey = ui.elements.varietySelect.value;
        if (varietyKey && state.varieties[varietyKey]) {
            const cultivar = state.varieties[varietyKey];
            ui.elements.modalTitle.innerText = `Details for ${cultivar.name}`;
            let detailsHTML = '<ul>';
            for (const key in cultivar.details) {
                detailsHTML += `<li><strong>${key}:</strong> ${cultivar.details[key]}</li>`;
            }
            detailsHTML += '</ul>';
            ui.showMessage(ui.elements.modalDetails, detailsHTML, true);
            ui.elements.detailsModal.classList.remove('hidden');
        }
    });
    // Closes the modal.
    ui.elements.closeBtn.addEventListener('click', () => ui.elements.detailsModal.classList.add('hidden'));
    // Closes the modal if the user clicks outside of the content area.
    window.addEventListener('click', (event) => {
        if (event.target == ui.elements.detailsModal) {
            ui.elements.detailsModal.classList.add('hidden');
        }
    });
    
    // --- Details View Controls ---
    // Back buttons for the field and plant detail views.
    ui.elements.backToMapViewBtn.addEventListener('click', () => ui.showView('map-view'));
    ui.elements.backToMapFromPlantBtn.addEventListener('click', () => ui.showView('map-view'));
    
    // --- Selection Flow Controls ---
    // Binds buttons in the selection UI to their handlers.
    ui.elements.cancelSelectionBtn.addEventListener('click', clearSelectionState);
    ui.elements.createFieldFromSelectionBtn.addEventListener('click', handleCreateFieldFromSelection);
}

/**
 * Initializes the application.
 * Checks for a stored authentication token to determine the initial screen
 * and then sets up all event listeners to make the app interactive.
 * @returns {void}
 */
function initializeApp() {
    const token = auth.getToken();
    // If a token exists, treat the user as logged in; otherwise, show the auth screen.
    token ? onLoginSuccess(token) : ui.showScreen('auth');
    setupEventListeners();
}

// Start the application.
initializeApp();