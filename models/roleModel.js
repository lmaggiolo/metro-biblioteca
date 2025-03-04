const { DataTypes } = require('sequelize');
const sequelize = require('../config/db-config');

const Role = sequelize.define('Role', {
  id: {
    type: DataTypes.INTEGER,
    primaryKey: true,
    autoIncrement: true
  },
  name: {
    type: DataTypes.STRING,
    allowNull: false,
    unique: true
  },
  priority: {
    type: DataTypes.INTEGER,
    allowNull: false
  }
}, {
  tableName: 'Roles',
  timestamps: false,
});

module.exports = Role;
