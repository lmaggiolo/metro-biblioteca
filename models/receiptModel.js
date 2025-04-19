
const { DataTypes } = require('sequelize');
const sequelize = require('../config/db-config');

const Receipt = sequelize.define('Receipt', {
  id: {
    type: DataTypes.INTEGER,
    autoIncrement: true,
    primaryKey: true,
  },
  customerName: {
    type: DataTypes.STRING,
    allowNull: false,
  },
  // Salviamo gli item come JSON (array di oggetti: id, nome, tipo, prezzo, quantità)
  items: {
    type: DataTypes.JSON,
    allowNull: false,
  },
  totalPrice: {
    type: DataTypes.FLOAT,
    allowNull: false,
  },
  // L'id dell'utente che ha creato lo scontrino
  insertedBy: {
    type: DataTypes.INTEGER,
    allowNull: false,
  }
}, {
  tableName: 'Receipts',
  timestamps: true,
});

module.exports = Receipt;
