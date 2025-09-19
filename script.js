// ==========================================================================
// AGRIPlanum -  v2.1
// Author: Arleu Júnior
// Description: Handles crop planning, sowing calculation, and soil analysis.
// File: script.js
// Last Update: 2025-09-19
// Dependencies: None (Vanilla JS)
// ==========================================================================

document.addEventListener('DOMContentLoaded', () => {

    // ==========================================================================
    // 1. DATABASES & APP STATE
    // ==========================================================================
    const cottonVarieties = {
        'tmg 84 b3xf': {
            name: 'TMG 84 B3XF',
            window: 'High productive potential and excellent fiber quality.',
            stages: {
                'Emergence to First Square (V0 to B1/B3)': 35,
                'First Square to First Flower (B1/B3 to F1)': 25,
                'Flowering Period (F1 to FN)': 40,
                'Boll Development & Maturation (C1 to CN)': 50
            },
            details: { 'Cycle': 'Medium', 'RNC': '2400IB3XF', '1st Season': 'Recommended', 'Boll Weight (g)': '4.4', 'Regulator Demand': 'Medium', 'Fertility Demand': 'High' },
            population: 110000,
            soil: { ph: { min: 6.0, max: 6.5 }, v_percent: { min: 60 }, al_cmolc: { max: 0.3 }, p_ppm: { min: 20 }, k_ppm: { min: 150 }, ca_cmolc: { min: 2.5 }, mg_cmolc: { min: 0.8 }, s_ppm: { min: 10 }, b_ppm: { min: 0.5 }, zn_ppm: { min: 1.2 }, n_ppm: { min: 100 } }
        },
        'brs 433': {
            name: 'BRS 433',
            window: 'Medium cycle cultivar, adapted to the Cerrado biome.',
            stages: {
                'Emergence to First Square (V0 to B1/B3)': 30,
                'First Square to First Flower (B1/B3 to F1)': 25,
                'Flowering Period (F1 to FN)': 40,
                'Boll Development & Maturation (C1 to CN)': 45
            },
            details: { 'Cycle': 'Medium', 'Fiber': 'Long', 'Resistance': 'Ramularia and Blue Disease', 'Boll Weight (g)': '5.0', 'Regulator Demand': 'Low', 'Fertility Demand': 'Medium' },
            population: 100000,
            soil: { ph: { min: 5.8, max: 6.5 }, v_percent: { min: 60 }, al_cmolc: { max: 0.3 }, p_ppm: { min: 25 }, k_ppm: { min: 120 }, ca_cmolc: { min: 2.0 }, mg_cmolc: { min: 0.8 }, s_ppm: { min: 10 }, b_ppm: { min: 0.6 }, zn_ppm: { min: 1.4 }, n_ppm: { min: 120 } }
        }
    };
    const zoningData = {
        'mt-south': { preferential_start: '01-01', preferential_end: '01-31', tolerated_start: '12-15', tolerated_end: '02-15' }, 'mt-mid-north': { preferential_start: '01-01', preferential_end: '01-31', tolerated_start: '12-15', tolerated_end: '02-15' },
        'mt-west': { preferential_start: '01-01', preferential_end: '01-31', tolerated_start: '12-15', tolerated_end: '01-31' }, 'mt-araguaia-valley': { preferential_start: '01-01', preferential_end: '01-20', tolerated_start: '12-15', tolerated_end: '01-31' },
        'ba-rainfed': { preferential_start: '12-15', preferential_end: '12-31', tolerated_start: '12-01', tolerated_end: '01-15' }, 'ba-irrigated': { preferential_start: '01-01', preferential_end: '02-15', tolerated_start: '12-15', tolerated_end: '02-28' },
        'go-ms': { preferential_start: '12-15', preferential_end: '01-15', tolerated_start: '12-01', tolerated_end: '01-31' }, 'mg-sp': { preferential_start: '12-15', preferential_end: '01-15', tolerated_start: '12-01', tolerated_end: '01-31' },
        'ma-pi-1st': { preferential_start: '12-15', preferential_end: '01-15', tolerated_start: '12-01', tolerated_end: '01-31' }, 'ma-pi-2nd': { preferential_start: '01-15', preferential_end: '02-10', tolerated_start: '01-01', tolerated_end: '02-20' }
    };
    let currentCrop, currentRegion;

    // ==========================================================================
    // 2. DOM ELEMENTS
    // ==========================================================================
    // 2.1 General Elements
    const allViews = document.querySelectorAll('.view');
    const setupScreen = document.getElementById('setup-screen');
    const cropSelect = document.getElementById('crop-select');
    const regionSelect = document.getElementById('region-select');
    const startAppBtn = document.getElementById('start-app-btn');
    const mainAppScreen = document.getElementById('main-app-screen');
    const cardTitle = document.getElementById('card-title');
    const appContextTitle = document.getElementById('app-context-title');
    const dashboardButtons = document.querySelectorAll('.dashboard-button');
    const backToSetupBtn = document.getElementById('back-to-setup-btn');
    const modal = document.getElementById('details-modal');
    const modalTitle = document.getElementById('modal-title');
    const modalDetails = document.getElementById('modal-details');
    const closeBtn = document.querySelector('.close-btn');

    // 2.2 Cycle Planner Elements
    const calculateButton = document.getElementById('calculate-btn');
    const dateInput = document.getElementById('planting-date');
    const varietySelect = document.getElementById('variety-name');
    const resultElement = document.getElementById('result-text');
    const cultivarInfoElement = document.getElementById('cultivar-info');
    const cultivarInfoWindow = document.getElementById('cultivar-window');
    const resultsContainer = document.getElementById('results-container');
    const showDetailsBtn = document.getElementById('show-details-btn');

    // 2.3 Sowing Calculator Elements
    const sowingAreaInput = document.getElementById('sowing-area');
    const sowingVarietySelect = document.getElementById('sowing-variety');
    const germinationRateInput = document.getElementById('germination-rate');
    const fieldConditionsSelect = document.getElementById('field-conditions');
    const calculateSowingBtn = document.getElementById('calculate-sowing-btn');
    const sowingResultsContainer = document.getElementById('sowing-results-container');
    const sowingResultText = document.getElementById('sowing-result-text');

    // 2.4 Soil Analysis Elements
    const soilVarietySelect = document.getElementById('soil-variety');
    const soilPhInput = document.getElementById('soil-ph');
    const soilPInput = document.getElementById('soil-p');
    const soilKInput = document.getElementById('soil-k');
    const soilVInput = document.getElementById('soil-v');
    const soilAlInput = document.getElementById('soil-al');
    const soilCaInput = document.getElementById('soil-ca');
    const soilMgInput = document.getElementById('soil-mg');
    const soilSInput = document.getElementById('soil-s');
    const soilBInput = document.getElementById('soil-b');
    const soilZnInput = document.getElementById('soil-zn');
    const soilNInput = document.getElementById('soil-n'); // Added Nitrogen Input
    const analyzeSoilBtn = document.getElementById('analyze-soil-btn');
    const soilResultsContainer = document.getElementById('soil-results-container');
    const soilResultList = document.getElementById('soil-result-list');

    // ==========================================================================
    // 3. NAVIGATION LOGIC
    // ==========================================================================
    function showView(viewId) {
        allViews.forEach(view => view.classList.remove('active'));
        const viewToShow = document.getElementById(viewId);
        if (viewToShow) viewToShow.classList.add('active');
        const titles = { 'dashboard-view': 'Field Center', 'cycle-planner-view': 'Cycle Planner', 'sowing-calculator-view': 'Sowing Calculator', 'soil-analysis-view': 'Soil Analysis' };
        cardTitle.innerText = titles[viewId] || 'Field Center';
    }
    dashboardButtons.forEach(button => {
        if (!button.disabled) {
            button.addEventListener('click', () => {
                const viewId = button.dataset.view;
                if (viewId) showView(viewId);
            });
        }
    });
    // This event listener handles the "Back" button in the header.
    backToSetupBtn.addEventListener('click', () => {
        if (mainAppScreen.classList.contains('active') && !document.getElementById('dashboard-view').classList.contains('active')) {
            showView('dashboard-view');
        } else {
            mainAppScreen.classList.remove('active');
            setupScreen.classList.add('active');
        }
    });
    
    // ==========================================================================
    // 4. SETUP & MODULE LOGIC
    // ==========================================================================
    startAppBtn.addEventListener('click', () => {
        currentCrop = cropSelect.value;
        currentRegion = regionSelect.value;
        populateVarieties(varietySelect);
        populateVarieties(sowingVarietySelect);
        populateVarieties(soilVarietySelect);
        const regionText = regionSelect.options[regionSelect.selectedIndex].text;
        appContextTitle.innerText = `Crop: ${currentCrop.toUpperCase()} | Region: ${regionText}`;
        setupScreen.classList.remove('active');
        mainAppScreen.classList.add('active');
        showView('dashboard-view');
    });
    
    function populateVarieties(selectElement) {
        if (!selectElement) return;
        selectElement.innerHTML = '<option value="">-- Select a Variety --</option>';
        if (currentCrop === 'cotton') {
            for (const key in cottonVarieties) {
                const variety = cottonVarieties[key];
                const option = document.createElement('option');
                option.value = key;
                option.innerText = variety.name;
                selectElement.appendChild(option);
            }
        }
    }

    varietySelect.addEventListener('change', () => {
        const selectedVarietyKey = varietySelect.value;
        cultivarInfoElement.classList.add('hidden');
        resultsContainer.classList.add('hidden');
        if (selectedVarietyKey) {
            const cultivar = cottonVarieties[selectedVarietyKey];
            cultivarInfoWindow.innerText = cultivar.window;
            cultivarInfoElement.classList.remove('hidden');
        }
    });
    
    calculateButton.addEventListener('click', () => {
        resultsContainer.classList.add('hidden');
        const plantingDateStr = dateInput.value;
        const selectedVarietyKey = varietySelect.value;
        if (!plantingDateStr || !selectedVarietyKey) { return showError(resultElement, resultsContainer, 'Please select a variety and a planting date.'); }
        
        const cultivar = cottonVarieties[selectedVarietyKey];
        const regionData = zoningData[currentRegion];
        const userDate = new Date(plantingDateStr + 'T00:00:00');
        if (isNaN(userDate.getTime())) { return showError(resultElement, resultsContainer, 'Invalid planting date. Please use the date picker.'); }
        
        const userMonth = userDate.getUTCMonth() + 1;
        const userDay = userDate.getUTCDate();
        const plantingSeason = getPlantingSeason(userMonth, userDay, regionData);
        
        let totalCycleDays = Object.values(cultivar.stages).reduce((acc, days) => acc + days, 0);
        let timelineHTML = `<h4>Crop Development Timeline:</h4><ul>`;
        let currentDate = new Date(userDate);
        for (const stageName in cultivar.stages) {
            const stageDuration = cultivar.stages[stageName];
            const stageStartDate = new Date(currentDate);
            currentDate.setDate(currentDate.getDate() + stageDuration);
            const stageEndDate = new Date(currentDate);
            timelineHTML += `<li><strong>${stageName}:</strong><br>${formatDate(stageStartDate)} to ${formatDate(stageEndDate)} (${stageDuration} days)</li>`;
        }
        timelineHTML += '</ul>';
        const harvestDate = formatDate(currentDate);
        
        resultElement.innerHTML = `Your planting date falls within the ${plantingSeason}.<br><br>For <strong>${cultivar.name}</strong> (total cycle of <strong>${totalCycleDays}</strong> days), the estimated harvest date is: <strong>${harvestDate}</strong>.<hr>${timelineHTML}`;
        resultsContainer.classList.remove('hidden');
    });

    calculateSowingBtn.addEventListener('click', () => {
        sowingResultsContainer.classList.add('hidden');
        const area = parseFloat(sowingAreaInput.value);
        const varietyKey = sowingVarietySelect.value;
        const germinationRate = parseFloat(germinationRateInput.value);
        if (!area || !varietyKey || !germinationRate) { return showError(sowingResultText, sowingResultsContainer, 'Please fill in all fields correctly.'); }
        
        const cultivar = cottonVarieties[varietyKey];
        const conditions = fieldConditionsSelect.value;
        let conditionFactor = 1.0;
        if (conditions === 'average') conditionFactor = 1.05;
        else if (conditions === 'poor') conditionFactor = 1.10;
        
        const germinationFactor = 100 / germinationRate;
        const seedsToBuy = (area * cultivar.population) * germinationFactor * conditionFactor;
        
        sowingResultText.innerHTML = `You will need approximately <strong>${Math.ceil(seedsToBuy).toLocaleString('en-US')} seeds</strong> to reach the target population.`;
        sowingResultsContainer.classList.remove('hidden');
    });

    analyzeSoilBtn.addEventListener('click', () => {
        soilResultsContainer.classList.add('hidden');
        const varietyKey = soilVarietySelect.value;
        const inputs = {
            ph: parseFloat(soilPhInput.value), v: parseFloat(soilVInput.value), al: parseFloat(soilAlInput.value),
            p: parseFloat(soilPInput.value), k: parseFloat(soilKInput.value), ca: parseFloat(soilCaInput.value),
            mg: parseFloat(soilMgInput.value), s: parseFloat(soilSInput.value), b: parseFloat(soilBInput.value),
            zn: parseFloat(soilZnInput.value), n: parseFloat(soilNInput.value) // Added Nitrogen
        };
        if (!varietyKey || Object.values(inputs).some(v => isNaN(v))) {
            return showError(soilResultList, soilResultsContainer, `<li class="high">Please select a variety and enter valid values in all fields.</li>`, true);
        }

        const ideal = cottonVarieties[varietyKey].soil;
        let reportHTML = '';
        const createReportLine = (label, unit, value, idealMin, idealMax, isReversed) => {
            let status = 'ok'; let idealText = `> ${idealMin}`;
            if (idealMax !== undefined) {
                idealText = `${idealMin} - ${idealMax}`;
                if (value < idealMin) status = 'low'; if (value > idealMax) status = 'high';
            } else {
                if (isReversed) { if (value > idealMin) status = 'high'; idealText = `< ${idealMin}`; }
                else { if (value < idealMin) status = 'low'; }
            }
            return `<li class="${status}"><span>${label}: <strong>${value} ${unit}</strong></span> <span>(Ideal: ${idealText})</span></li>`;
        };
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
        reportHTML += createReportLine('Nitrogen (N)', 'ppm', inputs.n, ideal.n_ppm.min); // Added Nitrogen to the report
        
        soilResultList.innerHTML = reportHTML;
        soilResultsContainer.classList.remove('hidden');
    });

    // ==========================================================================
    // 5. CYCLE PLANNER LOGIC
    // ==========================================================================
    showDetailsBtn.addEventListener('click', () => {
        const selectedVarietyKey = varietySelect.value;
        if (selectedVarietyKey) {
            const cultivar = cottonVarieties[selectedVarietyKey];
            modalTitle.innerText = `Details for ${cultivar.name}`;
            let detailsHTML = '<ul>';
            for (const key in cultivar.details) {
                detailsHTML += `<li><strong>${key}:</strong> ${cultivar.details[key]}</li>`;
            }
            detailsHTML += '</ul>';
            modalDetails.innerHTML = detailsHTML;
            modal.classList.remove('hidden');
        }
    });

    closeBtn.addEventListener('click', () => modal.classList.add('hidden'));
    window.addEventListener('click', (event) => { if (event.target == modal) modal.classList.add('hidden'); });

    // ==========================================================================
    // 6. HELPER FUNCTIONS
    // ==========================================================================
    function showError(element, container, message, isList = false) {
        const errorHTML = isList ? message : `<span style="color: red;">${message}</span>`;
        element.innerHTML = errorHTML;
        container.classList.remove('hidden');
    }
    function formatDate(date) { return date.toLocaleDateString('en-US', { day: '2-digit', month: 'short', year: 'numeric', timeZone: 'UTC' }); }
    function getPlantingSeason(month, day, region) {
        const { preferential_start, preferential_end, tolerated_start, tolerated_end } = region;
        const prefStart = preferential_start.split('-').map(Number);
        const prefEnd = preferential_end.split('-').map(Number);
        if (isBetween(month, day, prefStart, prefEnd)) { return `<span class="badge preferential">Preferential planting window</span>`; }
        const tolStart = tolerated_start.split('-').map(Number);
        const tolEnd = tolerated_end.split('-').map(Number);
        if (isBetween(month, day, tolStart, tolEnd)) { return `<span class="badge tolerated">Tolerated planting window</span>`; }
        return `<span class="badge not-recommended">Not Recommended planting window</span>`;
    }
    function isBetween(month, day, start, end) {
        const [startMonth, startDay] = start;
        const [endMonth, endDay] = end;
        const dateNum = month * 100 + day;
        const startNum = startMonth * 100 + startDay;
        const endNum = endMonth * 100 + endDay;
        if (startNum > endNum) { return dateNum >= startNum || dateNum <= endNum; }
        return dateNum >= startNum && dateNum <= endNum;
    }
});