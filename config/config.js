require('dotenv').config();
const pkg = require('../package.json');
const dbName = `${pkg.name}.db`; // Costruisce il nome del file database dinamicamente se sqlite

module.exports = {
  // Porta di ascolto del server
  port: process.env.PORT || 3000,

  // Configurazione della sessione
  session: {
    secret: process.env.SESSION_SECRET || 'secret',
    resave: false,
    saveUninitialized: false
  },

  // Configurazione del database
  database: process.env.DATABASE_URL ? {
    dialect: 'postgres',
    protocol: 'postgres',
    url: process.env.DATABASE_URL,
    logging: process.env.DB_LOGGING === 'true' ? console.log : false,
  } : {
    dialect: 'sqlite',
    storage: process.env.DB_STORAGE || `./database/${dbName}`,
    logging: process.env.DB_LOGGING === 'true' ? console.log : false,
  },

  // Configurazione del logging
  logging: {
    level: process.env.LOG_LEVEL || 'info'
  }
};