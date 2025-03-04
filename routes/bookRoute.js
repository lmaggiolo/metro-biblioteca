const express = require('express');
const router = express.Router();
const { ensureAuthenticated, ensureEmployee, ensureManagement, ensureAdmin } = require('../middleware/auth');
const { getBookById, getAllBooks, createBook, updateBook, deleteBook } = require('../controllers/bookController');

// Get a book by ID (allow all employees)
router.get('/:id', ensureAuthenticated, getBookById);

// Get all books with pagination, search, and sorting (allow all employees)
router.get('/', ensureAuthenticated, ensureEmployee, getAllBooks);

// Create a new book (management level)
router.post('/', ensureAuthenticated, ensureManagement, createBook);

// Update an existing book (management level)
router.post('/:id/edit', ensureAuthenticated, ensureManagement, updateBook);

// Delete a book (admin level)
router.post('/:id/delete', ensureAuthenticated, ensureAdmin, deleteBook);
module.exports = router;
