// ==========================================================================
// AgriPlanum - Authentication Service
// Description: Manages user authentication, token lifecycle, and form handling.
// ==========================================================================

import * as api from './api.js';
import * as ui from './ui.js';

const TOKEN_KEY = 'agriplanum_token';

/**
 * Stores the JWT in localStorage for session persistence.
 * @param {string} token - The authentication token to store.
 */
export function saveToken(token) {
    localStorage.setItem(TOKEN_KEY, token);
}

/**
 * Retrieves the stored JWT from localStorage.
 * @returns {string|null} The token if available, otherwise null.
 */
export function getToken() {
    return localStorage.getItem(TOKEN_KEY);
}

/**
 * Clears the JWT from localStorage, effectively logging the user out.
 */
export function logout() {
    localStorage.removeItem(TOKEN_KEY);
}

/**
 * Handles user registration form submission.
 * Gathers form data, triggers an API call for registration, and manages UI feedback.
 * @param {Event} event - The form submission event.
 */
export async function handleRegisterSubmit(event) {
    event.preventDefault();
    const email = ui.elements.registerEmailInput.value;
    const password = ui.elements.registerPasswordInput.value;
    const button = ui.elements.registerForm.querySelector('button');

    ui.showMessage(ui.elements.registerErrorMessage, '');
    ui.setButtonLoading(button, true, 'Registering...');

    try {
        await api.registerUser(email, password);
        ui.toggleAuthForms('login');
        ui.showMessage(ui.elements.loginErrorMessage, 'Registration successful. Please log in.');
    } catch (error) {
        // Provide user-friendly feedback based on the likely API error.
        const errorMessage = error.message.includes('in use')
            ? 'This email is already in use.'
            : 'An error occurred. Please try again.';
        ui.showMessage(ui.elements.registerErrorMessage, errorMessage);
    } finally {
        ui.setButtonLoading(button, false);
    }
}

/**
 * Handles user login form submission.
 * Sends credentials to the API, stores the token upon success, and triggers the post-login flow.
 * @param {Event} event - The form submission event.
 * @param {Function} onLoginSuccess - The callback function to execute after a successful login, used to initialize the main application.
 */
export async function handleLoginSubmit(event, onLoginSuccess) {
    event.preventDefault();
    const email = ui.elements.loginEmailInput.value;
    const password = ui.elements.loginPasswordInput.value;
    const button = ui.elements.loginForm.querySelector('button');

    ui.showMessage(ui.elements.loginErrorMessage, '');
    ui.setButtonLoading(button, true, 'Logging in...');

    try {
        const data = await api.loginUser(email, password);
        saveToken(data.token);
        onLoginSuccess(data.token); // Proceed with application startup.
    } catch (error) {
        ui.showMessage(ui.elements.loginErrorMessage, 'Invalid email or password.');
    } finally {
        ui.setButtonLoading(button, false);
    }
}