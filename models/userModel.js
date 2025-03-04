const { DataTypes, Sequelize } = require('sequelize');
const sequelize = require('../config/db-config');
const Role = require('./roleModel');

const User = sequelize.define('User', {
  id: {
    type: DataTypes.INTEGER,
    primaryKey: true,
    autoIncrement: true,
  },
  name: {
    type: DataTypes.STRING,
    allowNull: false,
    unique: true,
  },
  password: {
    type: DataTypes.STRING,
    allowNull: false,
  },
  roleId: {
    type: DataTypes.INTEGER,
    allowNull: false,
    references: {
      model: Role,
      key: 'id'
    },
    onDelete: 'RESTRICT',
    onUpdate: 'CASCADE'
  },
  telegram_account: {
    type: DataTypes.STRING,
    allowNull: false,
    validate: {
      async isUnique(value) {
        if (value) {
          const existingUser = await User.findOne({
            where: sequelize.where(
              sequelize.fn('lower', sequelize.col('telegram_account')),
              value.toLowerCase()
            )
          });
          if (existingUser && existingUser.id !== this.id) {
            throw new Error('Il contatto Telegram è già in uso.');
          }
        }
      },
    },
  },
  telegram_chatId: {
    type: DataTypes.STRING,
    allowNull: true,
  },
  insertedBy: {
    type: DataTypes.INTEGER,
    allowNull: true,
    references: {
      model: 'Users',
      key: 'id',
    },
    onDelete: 'SET NULL',
    onUpdate: 'CASCADE',
  },
  updatedBy: {
    type: DataTypes.INTEGER,
    allowNull: true,
    references: {
      model: 'Users',
      key: 'id',
    },
    onDelete: 'SET NULL',
    onUpdate: 'CASCADE',
  },
  updatedAt: {
    type: DataTypes.DATE,
    allowNull: true,
    defaultValue: null,
  },
  lastAccess: {
    type: DataTypes.DATE,
    allowNull: true,
  },
}, {
  tableName: 'Users',
  timestamps: true,
  hooks: {
    beforeValidate: (user) => {
      if (user.telegram_account) {
        user.telegram_account = user.telegram_account.toLowerCase();
      }
    },
  },
  indexes: [
    // Unique index on 'name'
    {
      unique: true,
      fields: ['name'],
    },
    // Unique index on 'telegram_account' (case-insensitive)
    {
      unique: true,
      fields: [sequelize.fn('lower', sequelize.col('telegram_account'))],
      name: 'unique_user_telegram_account_lowercase',
    },
    // Index on 'role' if you often query users by role
    {
      fields: ['roleId'],
    },
  ],
});

module.exports = User;