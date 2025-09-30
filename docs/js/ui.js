// ==========================================================================
// AgriPlanum - UI Manager 
// Description: Handles all direct DOM manipulations and UI state changes.
// File: ui.js
// ==========================================================================

export const elements = {
    // Screens
    authScreen: document.getElementById('auth-screen'),
    setupScreen: document.getElementById('setup-screen'),
    mainAppScreen: document.getElementById('main-app-screen'),
    
    // Authentication
    loginForm: document.getElementById('login-form'),
    registerForm: document.getElementById('register-form'),
    loginEmailInput: document.getElementById('login-email'),
    loginPasswordInput: document.getElementById('login-password'),
    registerEmailInput: document.getElementById('register-email'),
    registerPasswordInput: document.getElementById('register-password'),
    showRegisterLink: document.getElementById('show-register'),
    showLoginLink: document.getElementById('show-login'),
    loginErrorMessage: document.getElementById('login-error-message'),
    registerErrorMessage: document.getElementById('register-error-message'),
    
    // Main Navigation & Dashboard
    startAppBtn: document.getElementById('start-app-btn'),
    goToDashboardBtn: document.getElementById('go-to-dashboard-btn'),
    dashboardButtons: document.querySelectorAll('.dashboard-button'),
    backToSetupBtn: document.getElementById('back-to-setup-btn'),
    cardTitle: document.getElementById('card-title'),
    
    // Calculation Modules
    varietySelect: document.getElementById('variety-name'),
    plantingDateInput: document.getElementById('planting-date'),
    calculateCycleBtn: document.getElementById('calculate-btn'),
    cultivarInfoElement: document.getElementById('cultivar-info'),
    cultivarInfoWindow: document.getElementById('cultivar-window'),
    resultsContainer: document.getElementById('results-container'),
    resultTextElement: document.getElementById('result-text'),
    showDetailsBtn: document.getElementById('show-details-btn'),
    sowingVarietySelect: document.getElementById('sowing-variety'),
    calculateSowingBtn: document.getElementById('calculate-sowing-btn'),
    sowingResultsContainer: document.getElementById('sowing-results-container'),
    sowingResultText: document.getElementById('sowing-result-text'),
    soilVarietySelect: document.getElementById('soil-variety'),
    analyzeSoilBtn: document.getElementById('analyze-soil-btn'),
    soilResultsContainer: document.getElementById('soil-results-container'),
    soilResultList: document.getElementById('soil-result-list'),

    // Details Modal
    detailsModal: document.getElementById('details-modal'),
    modalTitle: document.getElementById('modal-title'),
    modalDetails: document.getElementById('modal-details'),
    closeBtn: document.querySelector('.close-btn'),

    // Module: Field Mapper
    mapViewDescription: document.getElementById('map-view-description'),
    
    // View Mode Controls
    viewControls: document.getElementById('view-controls'),
    mapViewStatus: document.getElementById('map-view-status'),
    refreshMapBtn: document.getElementById('refresh-map-btn'),
    enterAddFieldModeBtn: document.getElementById('enter-add-field-mode-btn'),
    enterAddPlantModeBtn: document.getElementById('enter-add-plant-mode-btn'),
    
    // Field Creation Controls
    fieldCreationControls: document.getElementById('field-creation-controls'),
    fieldNameInput: document.getElementById('field-name'),
    mapResults: document.getElementById('map-results'),
    unitToggleBtn: document.getElementById('unit-toggle-btn'),
    clearMapBtn: document.getElementById('clear-map-btn'),
    saveFieldBtn: document.getElementById('save-field-btn'),
    cancelFieldCreationBtn: document.getElementById('cancel-field-creation-btn'),
    mapMessage: document.getElementById('map-message'),
    
    // Plant Creation Controls
    plantCreationControls: document.getElementById('plant-creation-controls'),
    plantCreationStatus: document.getElementById('plant-creation-status'),
    plantForm: document.getElementById('plant-form'),
    plantTypeSelect: document.getElementById('plant-type'),
    plantTagInput: document.getElementById('plant-tag'),
    generateTagBtn: document.getElementById('generate-tag-btn'),
    plantCustomFieldsContainer: document.getElementById('plant-custom-fields'),
    savePlantBtn: document.getElementById('save-plant-btn'),
    cancelPlantCreationBtn: document.getElementById('cancel-plant-creation-btn'),
    plantFormMessage: document.getElementById('plant-form-message'),
    useGpsBtn: document.getElementById('use-gps-btn'),

    //Field Details View Elements
    fieldDetailsView: document.getElementById('field-details-view'),
    backToMapViewBtn: document.getElementById('back-to-map-view-btn'),
    detailsFieldName: document.getElementById('details-field-name'),
    detailsFieldInfoList: document.getElementById('details-field-info-list'),
    detailsPlantCount: document.getElementById('details-plant-count'),
    detailsPlantTableBody: document.getElementById('details-plant-table-body'),
    addPlantToFieldBtn: document.getElementById('add-plant-to-field-btn'),
    //Plant Details View Elements
    plantDetailsView: document.getElementById('plant-details-view'),
    detailsPlantTag: document.getElementById('details-plant-tag'),
    detailsPlantInfoList: document.getElementById('details-plant-info-list'),
    detailsPlantCustomDataList: document.getElementById('details-plant-custom-data-list'),
    backToMapFromPlantBtn: document.getElementById('back-to-map-from-plant-btn'),
    selectionControls: document.getElementById('selection-controls'),
    selectionStatus: document.getElementById('selection-status'),
    cancelSelectionBtn: document.getElementById('cancel-selection-btn'),
    createFieldFromSelectionBtn: document.getElementById('create-field-from-selection-btn'),

};

export function showScreen(screenName) {
    elements.authScreen.classList.remove('active');
    elements.setupScreen.classList.remove('active');
    elements.mainAppScreen.classList.remove('active');
    if (screenName === 'auth') elements.authScreen.classList.add('active');
    if (screenName === 'setup') elements.setupScreen.classList.add('active');
    if (screenName === 'main') elements.mainAppScreen.classList.add('active');
}
export function showView(viewId) {
    document.querySelectorAll('.view').forEach(view => view.classList.remove('active'));
    const viewToShow = document.getElementById(viewId);
    if (viewToShow) {
        viewToShow.classList.add('active');
    }
    const titles = { 'dashboard-view': 'Field Center', 'cycle-planner-view': 'Cycle Planner', 'sowing-calculator-view': 'Sowing Calculator', 'soil-analysis-view': 'Soil Analysis', 'map-view': 'Field Mapper' };
    elements.cardTitle.innerText = titles[viewId] || 'Field Center';
}
export function toggleAuthForms(formToShow) {
    elements.loginForm.classList.toggle('active', formToShow === 'login');
    elements.registerForm.classList.toggle('active', formToShow === 'register');
    elements.loginErrorMessage.textContent = '';
    elements.registerErrorMessage.textContent = '';
}
export function showMessage(element, message, isHtml = false) {
    if (isHtml) {
        element.innerHTML = message;
    } else {
        element.textContent = message;
    }
}
export function setButtonLoading(button, isLoading, loadingText = 'Loading...') {
    if (isLoading) {
        button.disabled = true;
        button.dataset.originalText = button.textContent;
        button.textContent = loadingText;
    } else {
        button.disabled = false;
        if (button.dataset.originalText) {
            button.textContent = button.dataset.originalText;
        }
    }
}
export function populateVarieties(varieties) {
    const selects = [elements.varietySelect, elements.sowingVarietySelect, elements.soilVarietySelect];
    selects.forEach(select => {
        if (!select) return;
        select.innerHTML = '<option value="">-- Select a Variety --</option>';
        for (const key in varieties) {
            const variety = varieties[key];
            const option = document.createElement('option');
            option.value = key;
            option.innerText = variety.name;
            select.appendChild(option);
        }
    });
}