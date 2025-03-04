const { Sequelize } = require('sequelize');
const config = require('./config');

// Usa le impostazioni dal file di configurazione centralizzato
const sequelize = new Sequelize({
  dialect: config.database.dialect,
  storage: config.database.storage,
  logging: config.database.logging
});
module.exports = sequelize;