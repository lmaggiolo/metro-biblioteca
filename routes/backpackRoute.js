const express = require('express');
const router = express.Router();
const { ensureAuthenticated, ensureEmployee, ensureManagement, ensureAdmin } = require('../middleware/auth');
const { getBackpackById, getAllBackpacks, createBackpack, updateBackpack, deleteBackpack } = require('../controllers/backpackController');

// Get a specific backpack by ID (allow all employees)
router.get('/:id', ensureAuthenticated, getBackpackById);

// Get all backpacks with any search/pagination (allow all employees)
router.get('/', ensureAuthenticated, ensureEmployee, getAllBackpacks);

// Create a new backpack (management level)
router.post('/', ensureAuthenticated, ensureManagement, createBackpack);

// Update an existing backpack (management level)
router.post('/:id/edit', ensureAuthenticated, ensureManagement, updateBackpack);

// Delete a backpack (admin level)
router.post('/:id/delete', ensureAuthenticated, ensureAdmin, deleteBackpack);

module.exports = router;