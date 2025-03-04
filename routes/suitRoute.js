const express = require('express');
const router = express.Router();
const { ensureAuthenticated, ensureEmployee, ensureManagement, ensureAdmin } = require('../middleware/auth');
const { getSuitById, getAllSuits, createSuit, updateSuit, deleteSuit } = require('../controllers/suitController');

// Get a specific suit by ID (allow all employees)
router.get('/:id', ensureAuthenticated, getSuitById);

// Get all suits (allow all employees)
router.get('/', ensureAuthenticated, ensureEmployee, getAllSuits);

// Create a new suit (management level)
router.post('/', ensureAuthenticated, ensureManagement, createSuit);

// Update an existing suit (management level)
router.post('/:id/edit', ensureAuthenticated, ensureManagement, updateSuit);

// Delete a suit (admin level)
router.post('/:id/delete', ensureAuthenticated, ensureAdmin, deleteSuit);

module.exports = router;