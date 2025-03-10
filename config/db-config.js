const { Sequelize } = require('sequelize');
const config = require('./config');

let sequelize;

if (config.database.url) {
  // Connessione a PostgreSQL usando DB_URL
  sequelize = new Sequelize(config.database.url, {
    dialect: config.database.dialect,
    protocol: config.database.protocol,
    dialectOptions: {
      ssl: {
        require: true,
        rejectUnauthorized: false,
      }
    },
    logging: config.database.logging,
  });
} else {
  // Connessione a SQLite (default)
  sequelize = new Sequelize({
    dialect: config.database.dialect,
    storage: config.database.storage,
    logging: config.database.logging,
  });
}

module.exports = sequelize;