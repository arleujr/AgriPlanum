// ==========================================================================
// AGRIPlanum Backend - v2.8 (Detailed View)
// Description: Adds endpoint to fetch details for a single field, including its plants.
// File: server.js
// ==========================================================================

// 1. Imports
require('dotenv').config();
const express = require('express');
const cors = require('cors');
const helmet = require('helmet');
const path = require('path');
const { Pool } = require('pg');
const bcrypt = require('bcrypt');
const jwt = require('jsonwebtoken');

// 2. App Initialization
const app = express();

// 3. Middleware Configuration
app.use(cors());
app.use(
  helmet.contentSecurityPolicy({
    directives: {
      ...helmet.contentSecurityPolicy.getDefaultDirectives(),
      "script-src": ["'self'", "unpkg.com", "cdn.jsdelivr.net", "cdnjs.cloudflare.com"],
      "style-src": ["'self'", "unpkg.com", "cdnjs.cloudflare.com", "fonts.googleapis.com", "'unsafe-inline'"],
      "img-src": ["'self'", "data:","cdnjs.cloudflare.com","*.tile.openstreetmap.org", "unpkg.com","raw.githubusercontent.com" ],
      "font-src": ["'self'", "cdnjs.cloudflare.com", "fonts.gstatic.com"],
      "connect-src": ["'self'"],
    },
  })
);
app.use(express.json());

// 4. PostgreSQL Connection Setup
// 4. PostgreSQL Connection Setup
const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  ssl: {
    rejectUnauthorized: false
  }
});


// 5. Constants
const PORT = process.env.PORT || 3000;
const JWT_SECRET = process.env.JWT_SECRET;

// ==========================================================================
// Authentication Middleware
// ==========================================================================
const authenticateToken = (req, res, next) => {
    const authHeader = req.headers['authorization'];
    const token = authHeader && authHeader.split(' ')[1];
    if (!token) return res.status(401).json({ message: 'Access token is required.' });
    jwt.verify(token, JWT_SECRET, (err, user) => {
        if (err) return res.status(403).json({ message: 'Token is invalid or has expired.' });
        req.user = user;
        next();
    });
};

// ==========================================================================
// API Routes
// ==========================================================================

// --- Auth Routes ---
app.post('/api/register', async (req, res) => {
    try {
        const { email, password } = req.body;
        if (!email || !password) { return res.status(400).send({ message: 'Email and password are required.' }); }
        const saltRounds = 10;
        const passwordHash = await bcrypt.hash(password, saltRounds);
        const newUserQuery = 'INSERT INTO users (email, password_hash) VALUES ($1, $2) RETURNING id, email, created_at';
        const newUser = await pool.query(newUserQuery, [email, passwordHash]);
        res.status(201).json(newUser.rows[0]);
    } catch (err) {
        if (err.code === '23505') { return res.status(409).send({ message: 'Email already in use.' }); }
        console.error('Error during registration:', err.stack);
        res.status(500).send({ message: 'Internal Server Error' });
    }
});
app.post('/api/login', async (req, res) => {
    try {
        const { email, password } = req.body;
        if (!email || !password) { return res.status(400).send({ message: 'Email and password are required.' });}
        const userQuery = await pool.query('SELECT * FROM users WHERE email = $1', [email]);
        if (userQuery.rows.length === 0) { return res.status(401).send({ message: 'Invalid credentials.' }); }
        const user = userQuery.rows[0];
        const isMatch = await bcrypt.compare(password, user.password_hash);
        if (!isMatch) { return res.status(401).send({ message: 'Invalid credentials.' });}
        const payload = { userId: user.id };
        const options = { expiresIn: '1h' };
        const token = jwt.sign(payload, JWT_SECRET, options);
        res.json({ token });
    } catch (err) {
        console.error('Error during login:', err.stack);
        res.status(500).send({ message: 'Internal Server Error' });
    }
});

// --- Data Retrieval Routes (GET) ---
app.get('/api/varieties', authenticateToken, async (req, res) => {
    try {
        const result = await pool.query('SELECT * FROM varieties ORDER BY name ASC');
        res.json(result.rows);
    } catch (err) {
        console.error('Error executing query', err.stack);
        res.status(500).send('Internal Server Error');
    }
});
app.get('/api/fields', authenticateToken, async (req, res) => {
    const userId = req.user.userId;
    try {
        const query = 'SELECT * FROM fields WHERE user_id = $1 ORDER BY created_at DESC';
        const { rows } = await pool.query(query, [userId]);
        res.json(rows);
    } catch (err) {
        console.error('Error fetching fields:', err.stack);
        res.status(500).json({ message: 'Internal Server Error' });
    }
});
app.get('/api/fields/:id', authenticateToken, async (req, res) => {
    const { id } = req.params;
    const userId = req.user.userId;
    try {
        const fieldQuery = 'SELECT * FROM fields WHERE id = $1 AND user_id = $2';
        const fieldResult = await pool.query(fieldQuery, [id, userId]);
        if (fieldResult.rowCount === 0) {
            return res.status(404).json({ message: 'Field not found or permission denied.' });
        }
        const plantsQuery = 'SELECT * FROM plants WHERE field_id = $1 AND user_id = $2 ORDER BY created_at';
        const plantsResult = await pool.query(plantsQuery, [id, userId]);
        const fieldData = fieldResult.rows[0];
        fieldData.plants = plantsResult.rows;
        res.json(fieldData);
    } catch (err) {
        console.error(`Error fetching details for field ${id}:`, err.stack);
        res.status(500).json({ message: 'Internal Server Error' });
    }
});
// NEW: GET A SINGLE PLANT'S DETAILS
app.get('/api/plants/:id', authenticateToken, async (req, res) => {
    const { id } = req.params;
    const userId = req.user.userId;

    try {
        const query = 'SELECT * FROM plants WHERE id = $1 AND user_id = $2';
        const result = await pool.query(query, [id, userId]);

        if (result.rowCount === 0) {
            return res.status(404).json({ message: 'Plant not found or permission denied.' });
        }

        res.json(result.rows[0]);
    } catch (err) {
        console.error(`Error fetching details for plant ${id}:`, err.stack);
        res.status(500).json({ message: 'Internal Server Error' });
    }
});


app.get('/api/plants', authenticateToken, async (req, res) => {
    const userId = req.user.userId;
    try {
        const query = 'SELECT * FROM plants WHERE user_id = $1 ORDER BY created_at DESC';
        const { rows } = await pool.query(query, [userId]);
        res.json(rows);
    } catch (err) {
        console.error('Error fetching plants:', err.stack);
        res.status(500).json({ message: 'Internal Server Error' });
    }
    
});

// --- Data Creation Routes (POST) ---
app.post('/api/fields', authenticateToken, async (req, res) => {
    const { name, geometry, area_hectares } = req.body;
    const userId = req.user.userId;
    if (!name || !geometry || !area_hectares) { return res.status(400).json({ message: 'Name, geometry, and area are required.' }); }
    try {
        const newFieldQuery = 'INSERT INTO fields (user_id, name, geometry, area_hectares) VALUES ($1, $2, $3, $4) RETURNING *;';
        const values = [userId, name, geometry, area_hectares];
        const result = await pool.query(newFieldQuery, values);
        res.status(201).json(result.rows[0]);
    } catch (err) {
        console.error('Error creating field:', err.stack);
        res.status(500).json({ message: 'Internal Server Error' });
    }
});
app.post('/api/plants', authenticateToken, async (req, res) => {
    const { field_id, unique_tag, location, plant_type, custom_data } = req.body;
    const userId = req.user.userId;
    if (!location || !plant_type) { return res.status(400).json({ message: 'Location and plant type are required.' }); }
    try {
        const newPlantQuery = 'INSERT INTO plants (user_id, field_id, unique_tag, location, plant_type, custom_data) VALUES ($1, $2, $3, $4, $5, $6) RETURNING *;';
        const values = [userId, field_id || null, unique_tag, location, plant_type, custom_data || {}];
        const result = await pool.query(newPlantQuery, values);
        res.status(201).json(result.rows[0]);
    } catch (err) {
        if (err.code === '23505' && err.constraint === 'plants_unique_tag_key') { return res.status(409).json({ message: 'This unique tag is already in use.' }); }
        console.error('Error creating plant:', err.stack);
        res.status(500).json({ message: 'Internal Server Error' });
    }
});

// --- Data Deletion Routes (DELETE) ---
app.delete('/api/fields/:id', authenticateToken, async (req, res) => {
    const { id } = req.params;
    const userId = req.user.userId;
    try {
        const deleteQuery = 'DELETE FROM fields WHERE id = $1 AND user_id = $2 RETURNING *';
        const result = await pool.query(deleteQuery, [id, userId]);
        if (result.rowCount === 0) {
            return res.status(404).json({ message: 'Field not found or permission denied.' });
        }
        res.status(200).json({ message: 'Field deleted successfully.', deletedField: result.rows[0] });
    } catch (err) {
        console.error('Error deleting field:', err.stack);
        res.status(500).json({ message: 'Internal Server Error' });
    }
});
app.delete('/api/plants/:id', authenticateToken, async (req, res) => {
    const { id } = req.params;
    const userId = req.user.userId;
    try {
        const deleteQuery = 'DELETE FROM plants WHERE id = $1 AND user_id = $2 RETURNING *';
        const result = await pool.query(deleteQuery, [id, userId]);
        if (result.rowCount === 0) {
            return res.status(404).json({ message: 'Plant not found or permission denied.' });
        }
        res.status(200).json({ message: 'Plant deleted successfully.', deletedPlant: result.rows[0] });
    } catch (err) {
        console.error('Error deleting plant:', err.stack);
        res.status(500).json({ message: 'Internal Server Error' });
    }
});

// ==========================================================================
// 7. Frontend Serving & 8. Server Startup
// ==========================================================================
const frontendPath = path.join(__dirname, '../frontend');
app.use(express.static(frontendPath));
app.listen(PORT, () => {
    console.log(`✅ Server is running. Open http://localhost:${PORT} in your browser.`);
});