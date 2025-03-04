const express = require('express');
const router = express.Router();
const passport = require('../controllers/authController');
const { ensureAuthenticated } = require('../middleware/auth');

// Se l'utente è autenticato, reindirizza subito a /home, altrimenti mostra la login
router.get('/', (req, res) => {
  if (req.isAuthenticated()) {
    req.session.messages = null;
    return res.redirect('/home');
  }
  
  res.render('login');
});

// Login con autenticazione
router.post('/login', passport.authenticate('local', {
  successRedirect: '/home',
  failureRedirect: '/',
  failureFlash: true
}));

// Rotta per la home (richiede autenticazione)
router.get('/home', ensureAuthenticated, (req, res) => {
  req.session.messages = null;
  res.render('home');
});

// Rotta per il logout
router.get('/logout', (req, res, next) => {
  req.logout((err) => {
    if (err) return next(err);
    res.redirect('/');
  });
});

module.exports = router;
