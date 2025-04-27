const { Sequelize } = require('sequelize');
const config = require('./config');

let sequelize;

if (config.database.url) {
  // Connessione a PostgreSQL con URL
  const options = {
    dialect:    config.database.dialect,
    protocol:   config.database.protocol,
    logging:    config.database.logging,
    define:     { schema: config.database.schema },
    searchPath: config.database.searchPath,
  };

  // attiva SSL solo se esplicitamente richiesto
  if (config.database.ssl) {
    options.dialectOptions = {
      ssl: {
        require: true,
        rejectUnauthorized: false,
      },
    };
  }

  sequelize = new Sequelize(config.database.url, options);
} else {
  // SQLite (default)
  sequelize = new Sequelize({
    dialect: config.database.dialect,
    storage: config.database.storage,
    logging: config.database.logging,
  });
}

module.exports = sequelize;