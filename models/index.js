const sequelize = require('../config/db-config')

/* 1. Modelli "radice" (non hanno FK esterne) */
const Role       = require('./roleModel')      // ↔ Users.roleId
const Category   = require('./categoryModel')  // ↔ Books.categoryId

/* 2. Modello User dipende da Role ma nessun altro lo referenzia "prima" */
const User       = require('./userModel')      // ↔ FK su Role

/* 3. Tutti gli altri modelli che dipendono da User / Category, ecc. */
const Book        = require('./bookModel')
const Backpack    = require('./backpackModel')
const Suit        = require('./suitModel')
const Stationery  = require('./stationeryModel')
const BarItem     = require('./barItemModel')
const Publication = require('./publicationModel')
const Promotion   = require('./promotionModel')
const Receipt     = require('./receiptModel')

/* ───────────────────────────────────
 * Associazioni
 * ──────────────────────────────────*/

/* User ↔ Role */
User.belongsTo(Role, { foreignKey: 'roleId', as: 'role' });
Role.hasMany(User,  { foreignKey: 'roleId', as: 'users' });

/* Self-reference User (insertedBy / updatedBy) */
User.hasMany(User, { foreignKey: 'insertedBy', as: 'insertedUsers' });
User.belongsTo(User, { foreignKey: 'insertedBy', as: 'inserter' });

User.hasMany(User, { foreignKey: 'updatedBy', as: 'updatedUsers' });
User.belongsTo(User, { foreignKey: 'updatedBy', as: 'updater' });

/* Book ↔ Category + User (inserted/updated) */
Book.belongsTo(Category, { foreignKey: 'categoryId', as: 'category' });
Category.hasMany(Book,   { foreignKey: 'categoryId', as: 'books' });

User.hasMany(Book, { foreignKey: 'insertedBy', as: 'insertedBooks' });
Book.belongsTo(User, { foreignKey: 'insertedBy', as: 'inserter' });

User.hasMany(Book, { foreignKey: 'updatedBy', as: 'updatedBooks' });
Book.belongsTo(User, { foreignKey: 'updatedBy', as: 'updater' });

/* Backpack */
User.hasMany(Backpack, { foreignKey: 'insertedBy', as: 'insertedBackpacks' });
Backpack.belongsTo(User, { foreignKey: 'insertedBy', as: 'inserter' });

User.hasMany(Backpack, { foreignKey: 'updatedBy', as: 'updatedBackpacks' });
Backpack.belongsTo(User, { foreignKey: 'updatedBy', as: 'updater' });

/* Suit */
User.hasMany(Suit, { foreignKey: 'insertedBy', as: 'insertedSuits' });
Suit.belongsTo(User, { foreignKey: 'insertedBy', as: 'inserter' });

User.hasMany(Suit, { foreignKey: 'updatedBy', as: 'updatedSuits' });
Suit.belongsTo(User, { foreignKey: 'updatedBy', as: 'updater' });

/* Stationery */
User.hasMany(Stationery, { foreignKey: 'insertedBy', as: 'insertedStationeries' });
Stationery.belongsTo(User, { foreignKey: 'insertedBy', as: 'inserter' });

User.hasMany(Stationery, { foreignKey: 'updatedBy', as: 'updatedStationeries' });
Stationery.belongsTo(User, { foreignKey: 'updatedBy', as: 'updater' });

/* BarItem */
User.hasMany(BarItem, { foreignKey: 'insertedBy', as: 'insertedBarItems' });
BarItem.belongsTo(User, { foreignKey: 'insertedBy', as: 'inserter' });

User.hasMany(BarItem, { foreignKey: 'updatedBy', as: 'updatedBarItems' });
BarItem.belongsTo(User, { foreignKey: 'updatedBy', as: 'updater' });

/* Publication */
User.hasMany(Publication, { foreignKey: 'insertedBy', as: 'insertedPublications' });
Publication.belongsTo(User, { foreignKey: 'insertedBy', as: 'inserter' });

User.hasMany(Publication, { foreignKey: 'updatedBy', as: 'updatedPublications' });
Publication.belongsTo(User, { foreignKey: 'updatedBy', as: 'updater' });

/* Promotion */
User.hasMany(Promotion, { foreignKey: 'insertedBy', as: 'insertedPromotions' });
Promotion.belongsTo(User, { foreignKey: 'insertedBy', as: 'inserter' });

User.hasMany(Promotion, { foreignKey: 'updatedBy', as: 'updatedPromotions' });
Promotion.belongsTo(User, { foreignKey: 'updatedBy', as: 'updater' });

/* Receipt */
User.hasMany(Receipt, { foreignKey: 'insertedBy', as: 'insertedReceipts' });
Receipt.belongsTo(User, { foreignKey: 'insertedBy', as: 'inserter' });

module.exports = {
  sequelize,
  Role,
  Category,
  User,
  Book,
  Backpack,
  Suit,
  Stationery,
  BarItem,
  Publication,
  Promotion,
  Receipt,
};