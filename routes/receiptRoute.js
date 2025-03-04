const express = require('express');
const router = express.Router();
const { ensureAuthenticated, ensureEmployee } = require('../middleware/auth');
const { createReceipt, getAllReceipts } = require('../controllers/receiptController');

// Route per il checkout
router.post('/post', ensureAuthenticated, ensureEmployee, createReceipt);

// Route per ottenere tutti gli scontrini
router.get('/', ensureAuthenticated, ensureEmployee, getAllReceipts);

module.exports = router;
