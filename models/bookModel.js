const { DataTypes, Sequelize, Op } = require('sequelize');
const sequelize = require('../config/db-config');

const Book = sequelize.define('Book', {
  id: {
    type: DataTypes.INTEGER,
    primaryKey: true,
    autoIncrement: true,
  },
  name: {
    type: DataTypes.STRING,
    allowNull: false,
    validate: {
      notNull: { msg: 'Il campo "Nome" è obbligatorio.' },
      notEmpty: { msg: 'Il campo "Nome" non può essere vuoto.' },
    },
  },
  author: {
    type: DataTypes.STRING,
    allowNull: false,
    validate: {
      notNull: { msg: 'Il campo "Autore" è obbligatorio.' },
      notEmpty: { msg: 'Il campo "Autore" non può essere vuoto.' },
    },
  },
  categoryId: {
    type: DataTypes.INTEGER,
    allowNull: false,
    references: {
      model: 'Categories',
      key: 'id',
    },
    onDelete: 'CASCADE',
    onUpdate: 'CASCADE',
    validate: {
      notNull: { msg: 'Il campo "Categoria" è obbligatorio.' },
      isInt: { msg: 'Il campo "Categoria" deve essere un numero intero.' },
    },
  },
  pages: {
    type: DataTypes.INTEGER,
    allowNull: false,
    validate: {
      notNull: { msg: 'Il campo "Pagine" è obbligatorio.' },
      isInt: { msg: 'Il campo "Pagine" deve essere un numero intero.' },
      min: {
        args: [1],
        msg: 'Il numero di pagine deve essere almeno 1.',
      },
    },
  },
  price: {
    type: DataTypes.INTEGER,
    allowNull: false,
    validate: {
      notNull: { msg: 'Il campo "Prezzo" è obbligatorio.' },
      isInt: { msg: 'Il campo "Prezzo" deve essere un numero intero.' },
      min: {
        args: [1],
        msg: 'Il prezzo deve essere almeno 1.',
      },
    },
  },
  onSale: {
    type: DataTypes.BOOLEAN,
    allowNull: false,
    defaultValue: true,
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
}, {
  tableName: 'Books',
  timestamps: true,
  hooks: {
    beforeValidate: (book) => {
      if (book.name) {
        book.name = book.name.trim();
      }
    },
    beforeUpdate: (book) => {
      book.updatedAt = null;
    },
  },
  indexes: [
    // Indice univoco composto su 'name', 'author'
    {
      unique: true,
      fields: ['name', 'author'],
    },
    // Index on 'categoria' for faster queries
    {
      fields: ['categoryId'],
    },
  ],
  validate: {
    async uniqueNameAuthor() {
      const condition = {
        name: this.name,
        author: this.author,
      };

      // Escludi il record corrente in caso di aggiornamento
      if (this.id) {
        condition.id = { [Op.ne]: this.id };
      }

      const existingBook = await Book.findOne({ where: condition });

      if (existingBook) {
        throw new Error('Esiste già un libro con questo nome e autore.');
      }
    },
  },
});

module.exports = Book;