const express = require('express');
const router = express.Router();
const { ensureAuthenticated, ensureAdmin, ensureEmployee } = require('../middleware/auth');
const { createUser, updateUser, deleteUser, showUsers } = require('../controllers/userController');

// Tutti i dipendenti (priority <= 6) possono vedere la lista
router.get('/', ensureAuthenticated, ensureEmployee, showUsers);

// Solo admin (priority <= 3) possono creare utenti
router.post('/', ensureAuthenticated, ensureAdmin, createUser);

// Solo admin possono modificare
router.post('/:id/edit', ensureAuthenticated, ensureAdmin, updateUser);

// E solo admin possono eliminare (e qualsiasi utente può eliminarsi)
router.post('/:id/delete', ensureAuthenticated, (req, res, next) => {
    // Se l'utente sta eliminando se stesso, non è necessario controllare le autorizzazioni
    if (req.params.id === String(req.user.id)) {
        return next();
    }
    // Altrimenti, controlla le autorizzazioni
    return ensureAdmin(req, res, next);
}, deleteUser);

module.exports = router;