// ==========================================================================
// AgriPlanum - API Service
// Description: Centralized interface for all backend API interactions.
// File: api.js
// ==========================================================================

const API_BASE_URL = 'https://agriplanum.onrender.com';

async function handleResponse(response) {
    if (response.status === 401 || response.status === 403) {
        window.dispatchEvent(new CustomEvent('auth-error'));
    }
    const data = await response.json();
    if (!response.ok) {
        throw new Error(data.message || `HTTP error! status: ${response.status}`);
    }
    return data;
}

export async function registerUser(email, password) {
    const response = await fetch(`${API_BASE_URL}/api/register`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email, password }),
    });
    return handleResponse(response);
}

export async function loginUser(email, password) {
    const response = await fetch(`${API_BASE_URL}/api/login`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email, password }),
    });
    return handleResponse(response);
}

export async function fetchVarieties(token) {
    const response = await fetch(`${API_BASE_URL}/api/varieties`, {
        headers: { 'Authorization': `Bearer ${token}` }
    });
    return handleResponse(response);
}

export async function saveField(fieldData, token) {
    const response = await fetch(`${API_BASE_URL}/api/fields`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${token}` },
        body: JSON.stringify(fieldData),
    });
    return handleResponse(response);
}

export async function savePlant(plantData, token) {
    const response = await fetch(`${API_BASE_URL}/api/plants`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${token}` },
        body: JSON.stringify(plantData),
    });
    return handleResponse(response);
}

export async function fetchFields(token) {
    const response = await fetch(`${API_BASE_URL}/api/fields`, {
        headers: { 'Authorization': `Bearer ${token}` }
    });
    return handleResponse(response);
}

export async function fetchPlants(token) {
    const response = await fetch(`${API_BASE_URL}/api/plants`, {
        headers: { 'Authorization': `Bearer ${token}` }
    });
    return handleResponse(response);
}

export async function deleteField(fieldId, token) {
    const response = await fetch(`${API_BASE_URL}/api/fields/${fieldId}`, {
        method: 'DELETE',
        headers: {
            'Authorization': `Bearer ${token}`
        }
    });
    return handleResponse(response);
}

export async function deletePlant(plantId, token) {
    const response = await fetch(`${API_BASE_URL}/api/plants/${plantId}`, {
        method: 'DELETE',
        headers: {
            'Authorization': `Bearer ${token}`
        }
    });
    return handleResponse(response);
}

export async function fetchFieldDetails(fieldId, token) {
    const response = await fetch(`${API_BASE_URL}/api/fields/${fieldId}`, {
        headers: {
            'Authorization': `Bearer ${token}`
        }
        
    });
    return handleResponse(response);
}
export async function fetchPlantDetails(plantId, token) {
    const response = await fetch(`${API_BASE_URL}/api/plants/${plantId}`, {
        headers: {
            'Authorization': `Bearer ${token}`
        }
    });
    return handleResponse(response);
}