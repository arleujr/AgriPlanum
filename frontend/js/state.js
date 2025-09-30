// ==========================================================================
// AgriPlanum - Global Application State
// Description: A single source of truth for the application's state.
// File: state.js
// ==========================================================================

export const state = {
    token: null,
    varieties: {},
    fields: [],
    plants: [],
    mapInstance: null,
    currentMapMode: 'view', // view, create-field, create-plant
    currentPlantLocation: null,
    currentRegion: null,
    currentMapArea: { hectares: 0, squareMeters: 0 },
    displayUnit: 'ha',
    zoningData: {
        'mt-south': { preferential_start: '01-01', preferential_end: '01-31', tolerated_start: '12-15', tolerated_end: '02-15' },
        'mt-mid-north': { preferential_start: '01-01', preferential_end: '01-31', tolerated_start: '12-15', tolerated_end: '02-15' },
        'mt-west': { preferential_start: '01-01', preferential_end: '01-31', tolerated_start: '12-15', tolerated_end: '01-31' },
        'mt-araguaia-valley': { preferential_start: '01-01', preferential_end: '01-20', tolerated_start: '12-15', tolerated_end: '01-31' },
        'ba-rainfed': { preferential_start: '12-15', preferential_end: '12-31', tolerated_start: '12-01', tolerated_end: '01-15' },
        'ba-irrigated': { preferential_start: '01-01', preferential_end: '02-15', tolerated_start: '12-15', tolerated_end: '02-28' },
        'go-ms': { preferential_start: '12-15', preferential_end: '01-15', tolerated_start: '12-01', tolerated_end: '01-31' },
        'mg-sp': { preferential_start: '12-15', preferential_end: '01-15', tolerated_start: '12-01', tolerated_end: '01-31' },
        'ma-pi-1st': { preferential_start: '12-15', preferential_end: '01-15', tolerated_start: '12-01', tolerated_end: '01-31' },
        'ma-pi-2nd': { preferential_start: '01-15', preferential_end: '02-10', tolerated_start: '01-01', tolerated_end: '02-20' }
    }
};