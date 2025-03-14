const express = require('express');
const session = require('express-session');
const flash = require('connect-flash');

const passport = require('./controllers/authController');
const { sequelize } = require('./models');
const config = require('./config/config');

const indexRoutes = require('./routes/index');
const userRoutes = require('./routes/userRoute');
const bookRoutes = require('./routes/bookRoute');
const backpackRoutes = require('./routes/backpackRoute');
const suitRoutes = require('./routes/suitRoute');
const stationeryRoutes = require('./routes/stationeryRoute');
const barRoutes = require('./routes/barRoute');
const receiptRoutes = require('./routes/receiptRoute');

const pkg = require('./package.json');

const app = express();
const PORT = process.env.PORT || config.port;

// Imposta il nome del progetto
const [firstPart, secondPart] = pkg.name.split('-').map(word => word.charAt(0).toUpperCase() + word.slice(1));
app.locals.projectName = `${firstPart}${secondPart}`;
app.locals.projectNamePart1 = `${firstPart}`;
app.locals.projectNamePart2 = `${secondPart}`;

// Configura i file statici, il template engine e il parsing del body
app.use(express.static('public'));
app.set('view engine', 'ejs');
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Usa la configurazione della sessione dal file config
app.use(session(config.session));
app.use(flash());
app.use(passport.initialize());
app.use(passport.session());
app.use((req, res, next) => {
  res.locals.user = req.user;
  res.locals.isPrivileged = req.isAuthenticated() && req.user && req.user.role && req.user.role.priority === 1;
  res.locals.messages = req.session.messages || req.flash() || {};
  next();
});

// Registra le route principali
app.use('/', indexRoutes);
app.use('/utenti', userRoutes);
app.use('/libri', bookRoutes);
app.use('/zaini', backpackRoutes);
app.use('/abiti', suitRoutes);
app.use('/cancelleria', stationeryRoutes);
app.use('/bar', barRoutes);
app.use('/scontrini', receiptRoutes);

sequelize
  .sync() // Puoi usare { alter: true } in fase di sviluppo
  .then(() => {
    console.log('Database synchronized');
    // Starta il server dopo che il database è stato sincronizzato
    app.listen(PORT, () => {
      console.log(`Server in ascolto sulla porta ${PORT}`);
    });
  })
  .catch((error) => {
    console.error('Errore durante la sincronizzazione del database:', error);
  });

// Avvio script bot.js (se presente)
const { spawn } = require('child_process');
const botProcess = spawn('node', ['bot.js']);
botProcess.stdout.on('data', data => {
  console.log(`Output di bot.js: ${data}`);
});
botProcess.stderr.on('data', data => {
  console.error(`Errore di stderr: ${data}`);
});
botProcess.on('close', code => {
  console.log(`bot.js process exited with code ${code}`);
});
