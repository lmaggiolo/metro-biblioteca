const express = require('express');
const router = express.Router();
const { ensureAuthenticated, ensureEmployee, ensureManagement, ensureAdmin } = require('../middleware/auth');
const { getPublicationById, getAllPublications, createPublication, updatePublication, deletePublication } = require('../controllers/publicationController');

// Get a specific publication by ID (allow all employees)
router.get('/:id', ensureAuthenticated, getPublicationById);

// Get all publications (allow all employees)
router.get('/', ensureAuthenticated, ensureEmployee, getAllPublications);

// Create a new publication (management level)
router.post('/', ensureAuthenticated, ensureManagement, createPublication);

// Update an existing publication (management level)
router.post('/:id/edit', ensureAuthenticated, ensureManagement, updatePublication);

// Delete a publication (admin level)
router.post('/:id/delete', ensureAuthenticated, ensureAdmin, deletePublication);

module.exports = router;
