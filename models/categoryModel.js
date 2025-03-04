const { DataTypes } = require('sequelize');
const sequelize = require('../config/db-config');

const Category = sequelize.define('Category', {
  id: {
    type: DataTypes.INTEGER,
    primaryKey: true,
    autoIncrement: true,
  },
  name: {
    type: DataTypes.STRING,
    allowNull: false,
    unique: true,
    validate: {
      notNull: { msg: 'Il campo "Nome categoria" è obbligatorio.' },
      notEmpty: { msg: 'Il campo "Nome categoria" non può essere vuoto.' },
    },
  },
}, {
  tableName: 'Categories',
  timestamps: false,
});

module.exports = Category;
