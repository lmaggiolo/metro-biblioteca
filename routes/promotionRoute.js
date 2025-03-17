const express = require('express');
const router = express.Router();
const { ensureAuthenticated, ensureEmployee, ensureManagement, ensureAdmin } = require('../middleware/auth');
const { getPromotionById, getAllPromotions, createPromotion, updatePromotion, deletePromotion } = require('../controllers/promotionController');

// Get a specific promotion by ID (allow all employees)
router.get('/:id', ensureAuthenticated, getPromotionById);

// Get all promotions (allow all employees)
router.get('/', ensureAuthenticated, ensureEmployee, getAllPromotions);

// Create a new promotion (management level)
router.post('/', ensureAuthenticated, ensureManagement, createPromotion);

// Update an existing promotion (management level)
router.post('/:id/edit', ensureAuthenticated, ensureManagement, updatePromotion);

// Delete a promotion (admin level)
router.post('/:id/delete', ensureAuthenticated, ensureAdmin, deletePromotion);

module.exports = router;
