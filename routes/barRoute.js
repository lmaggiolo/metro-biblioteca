const express = require('express');
const router = express.Router();
const { ensureAuthenticated, ensureEmployee, ensureManagement, ensureAdmin } = require('../middleware/auth');
const { getBarItemById, getAllBarItems, createBarItem, updateBarItem, deleteBarItem } = require('../controllers/barController');

// Get a specific bar item by ID (allow all employees)
router.get('/:id', ensureAuthenticated, getBarItemById);

// Get all bar items (allow all employees)
router.get('/', ensureAuthenticated, ensureEmployee, getAllBarItems);

// Create a new bar item (management level)
router.post('/', ensureAuthenticated, ensureManagement, createBarItem);

// Update an existing bar item (management level)
router.post('/:id/edit', ensureAuthenticated, ensureManagement, updateBarItem);

// Delete a bar item (admin level)
router.post('/:id/delete', ensureAuthenticated, ensureAdmin, deleteBarItem);

module.exports = router;
