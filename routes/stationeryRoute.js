const express = require('express');
const router = express.Router();
const { ensureAuthenticated, ensureEmployee, ensureManagement, ensureAdmin } = require('../middleware/auth');
const { getStationeryById, getAllStationery, createStationery, updateStationery, deleteStationery } = require('../controllers/stationeryController');

// Get a specific stationery by ID (allowed for all employees)
router.get('/:id', ensureAuthenticated, getStationeryById);

// Get all cancelleria (consentito a tutti gli impiegati)
router.get('/', ensureAuthenticated, ensureEmployee, getAllStationery);

// Create a new cancelleria (livello management)
router.post('/', ensureAuthenticated, ensureManagement, createStationery);

// Update an existing cancelleria (livello management)
router.post('/:id/edit', ensureAuthenticated, ensureManagement, updateStationery);

// Delete cancelleria (livello admin)
router.post('/:id/delete', ensureAuthenticated, ensureAdmin, deleteStationery);

module.exports = router;
