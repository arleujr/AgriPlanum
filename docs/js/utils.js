// ==========================================================================
// AgriPlanum - Utility Functions
// Description: A collection of helper functions used across the application for
//              tasks like date formatting and agricultural calculations.
// File: utils.js
// ==========================================================================

/**
 * Formats a JavaScript Date object into a Brazilian standard date string (DD/MM/YYYY).
 * The timeZone is set to 'UTC' to ensure consistency regardless of the user's local time.
 * @param {Date} date - The date object to be formatted.
 * @returns {string} The formatted date string (e.g., "30/09/2025").
 */
export function formatDate(date) {
    return date.toLocaleDateString('pt-BR', { day: '2-digit', month: '2-digit', year: 'numeric', timeZone: 'UTC' });
}

/**
 * Determines the planting season category based on a given date and region's planting windows.
 * It returns an HTML string with a styled badge indicating the result.
 * @param {number} month - The month of the planting date (1-12).
 * @param {number} day - The day of the planting date (1-31).
 * @param {object} region - An object containing the start and end dates for preferential and tolerated windows.
 * @returns {string} An HTML span element with a class ('preferential', 'tolerated', 'not-recommended') and text describing the planting window.
 */
export function getPlantingSeason(month, day, region) {
    if (!region) return '<span class="badge not-recommended">Region not selected</span>';

    const { preferential_start, preferential_end, tolerated_start, tolerated_end } = region;
    
    // Check against the preferential window
    const prefStart = preferential_start.split('-').map(Number);
    const prefEnd = preferential_end.split('-').map(Number);
    if (isBetween(month, day, prefStart, prefEnd)) {
        return `<span class="badge preferential">Preferential Window</span>`;
    }

    // Check against the tolerated window
    const tolStart = tolerated_start.split('-').map(Number);
    const tolEnd = tolerated_end.split('-').map(Number);
    if (isBetween(month, day, tolStart, tolEnd)) {
        return `<span class="badge tolerated">Tolerated Window</span>`;
    }

    // If not in any window, it's not recommended
    return `<span class="badge not-recommended">Not Recommended</span>`;
}

/**
 * A helper function to check if a given date (month, day) falls within a start and end date range.
 * This function correctly handles date ranges that span across the end of the year (e.g., December to February).
 * @param {number} month - The month of the date to check.
 * @param {number} day - The day of the date to check.
 * @param {Array<number>} start - An array representing the start date, e.g., [12, 1] for December 1st.
 * @param {Array<number>} end - An array representing the end date, e.g., [2, 28] for February 28th.
 * @returns {boolean} True if the date is within the range, otherwise false.
 */
function isBetween(month, day, start, end) {
    const [startMonth, startDay] = start;
    const [endMonth, endDay] = end;

    // Convert dates to a numerical format (MMDD) for easy comparison.
    const dateNum = month * 100 + day;
    const startNum = startMonth * 100 + startDay;
    const endNum = endMonth * 100 + endDay;

    // Handle cases where the date range crosses the new year (e.g., start is in December, end is in February).
    if (startNum > endNum) {
        // The date is valid if it's after the start OR before the end.
        return dateNum >= startNum || dateNum <= endNum;
    }
    
    // Standard case: the date range is within the same year.
    return dateNum >= startNum && dateNum <= endNum;
}