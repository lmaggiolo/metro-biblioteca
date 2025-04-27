const express = require('express');
const session = require('express-session');
const flash   = require('connect-flash');

const passport = require('./controllers/authController');
const { sequelize } = require('./models');
const config  = require('./config/config');

const indexRoutes       = require('./routes/index');
const userRoutes        = require('./routes/userRoute');
const bookRoutes        = require('./routes/bookRoute');
const backpackRoutes    = require('./routes/backpackRoute');
const suitRoutes        = require('./routes/suitRoute');
const stationeryRoutes  = require('./routes/stationeryRoute');
const barRoutes         = require('./routes/barRoute');
const publicationRoutes = require('./routes/publicationRoute');
const promotionRoutes   = require('./routes/promotionRoute');
const receiptRoutes     = require('./routes/receiptRoute');

const setupBotHandlers = require('./bot');
const pkg = require('./package.json');

const app  = express();
const PORT = process.env.PORT || config.port;

/* 1. Inizializzazione bot: passiamo l’istanza Express */
setupBotHandlers(null, app);

/* ────────────────────────────────
 * 2.  Configurazioni Express
 * ──────────────────────────────── */
// Imposta il nome del progetto in locals per le view
const [first, second]         = pkg.name.split('-').map((w) => w[0].toUpperCase() + w.slice(1));
app.locals.projectName        = `${first}${second}`;
app.locals.projectNamePart1   = first;
app.locals.projectNamePart2   = second;

// Static, template engine, body-parser
app.use(express.static('public'));
app.set('view engine', 'ejs');
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Sessione, passport, flash
app.use(session(config.session));
app.use(flash());
app.use(passport.initialize());
app.use(passport.session());
app.use((req, res, next) => {
  res.locals.user = req.user;
  res.locals.isPrivileged =
    req.isAuthenticated() && req.user && req.user.role && req.user.role.priority === 1;
  res.locals.messages = req.session.messages || req.flash() || {};
  next();
});

/* ────────────────────────────────
 * 3.  Registrazione route applicative
 * ──────────────────────────────── */
app.use('/', indexRoutes);
app.use('/utenti',        userRoutes);
app.use('/libri',         bookRoutes);
app.use('/zaini',         backpackRoutes);
app.use('/abiti',         suitRoutes);
app.use('/cancelleria',   stationeryRoutes);
app.use('/bar',           barRoutes);
app.use('/pubblicazioni', publicationRoutes);
app.use('/promozioni',    promotionRoutes);
app.use('/scontrini',     receiptRoutes);

/* ────────────────────────────────
 * 4.  Sync DB e avvio server
 * ──────────────────────────────── */
sequelize
  .sync() // { alter: true } se serve in sviluppo
  .then(() => {
    console.log('Database synchronized');
    app.listen(PORT, () => console.log(`Server in ascolto sulla porta ${PORT}`));
  })
  .catch((error) =>
    console.error('Errore durante la sincronizzazione del database:', error),
  );
