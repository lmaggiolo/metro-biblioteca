const sequelize = require('../config/db-config');
const User = require('./userModel');
const Role = require('./roleModel');
const Book = require('./bookModel');
const Category = require('./categoryModel');
const Backpack = require('./backpackModel');
const Suit = require('./suitModel');
const Stationery = require('./stationeryModel');

// Associazioni tra User e Role
User.belongsTo(Role, { foreignKey: 'roleId', as: 'role' });
Role.hasMany(User, { foreignKey: 'roleId', as: 'users' });

// Associazioni tra User e Book
User.hasMany(Book, { foreignKey: 'insertedBy', as: 'insertedBooks' });
Book.belongsTo(User, { foreignKey: 'insertedBy', as: 'inserter' });

User.hasMany(Book, { foreignKey: 'updatedBy', as: 'updatedBooks' });
Book.belongsTo(User, { foreignKey: 'updatedBy', as: 'updater' });

// Associazioni self-referential in User
User.hasMany(User, { foreignKey: 'insertedBy', as: 'insertedUsers' });
User.belongsTo(User, { foreignKey: 'insertedBy', as: 'inserter' });

User.hasMany(User, { foreignKey: 'updatedBy', as: 'updatedUsers' });
User.belongsTo(User, { foreignKey: 'updatedBy', as: 'updater' });

// Associazioni tra Book e Category
Book.belongsTo(Category, { foreignKey: 'categoryId', as: 'category' });
Category.hasMany(Book, { foreignKey: 'categoryId', as: 'books' });

// Associazioni tra User e Backpack
User.hasMany(Backpack, { foreignKey: 'insertedBy', as: 'insertedBackpacks' });
Backpack.belongsTo(User, { foreignKey: 'insertedBy', as: 'inserter' });

User.hasMany(Backpack, { foreignKey: 'updatedBy', as: 'updatedBackpacks' });
Backpack.belongsTo(User, { foreignKey: 'updatedBy', as: 'updater' });

// Associazioni tra User e Suit
User.hasMany(Suit, { foreignKey: 'insertedBy', as: 'insertedSuits' });
Suit.belongsTo(User, { foreignKey: 'insertedBy', as: 'inserter' });

User.hasMany(Suit, { foreignKey: 'updatedBy', as: 'updatedSuits' });
Suit.belongsTo(User, { foreignKey: 'updatedBy', as: 'updater' });

// Associazioni tra User e Stationery
User.hasMany(Stationery, { foreignKey: 'insertedBy', as: 'insertedStationeries' });
Stationery.belongsTo(User, { foreignKey: 'insertedBy', as: 'inserter' });

User.hasMany(Stationery, { foreignKey: 'updatedBy', as: 'updatedStationeries' });
Stationery.belongsTo(User, { foreignKey: 'updatedBy', as: 'updater' });

module.exports = {
  sequelize,
  User,
  Role,
  Book,
  Category,
  Backpack,
  Suit,
  Stationery,
};