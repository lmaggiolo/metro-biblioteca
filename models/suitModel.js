// Modello per gli abiti, con campi id, name, selling_price, purchase_price, onSale, insertedBy, updatedBy, updatedAt
const { DataTypes, Op } = require('sequelize');
const sequelize = require('../config/db-config');

const Suit = sequelize.define('Suit', {
  id: {
    type: DataTypes.INTEGER,
    primaryKey: true,
    autoIncrement: true,
  },
  // Campo nome dell'abito
  name: {
    type: DataTypes.STRING,
    allowNull: false,
    validate: {
      notNull: { msg: 'Il campo "Nome" è obbligatorio.' },
      notEmpty: { msg: 'Il campo "Nome" non può essere vuoto.' },
    },
  },
  // Prezzo di vendita
  selling_price: {
    type: DataTypes.INTEGER,
    allowNull: false,
    validate: {
      notNull: { msg: 'Il campo "Prezzo di vendita" è obbligatorio.' },
      isInt: { msg: 'Il campo "Prezzo di vendita" deve essere un numero intero.' },
      min: {
        args: [1],
        msg: 'Il prezzo di vendita deve essere almeno 1.',
      },
    },
  },
  // Prezzo di acquisto
  purchase_price: {
    type: DataTypes.INTEGER,
    allowNull: false,
    validate: {
      notNull: { msg: 'Il campo "Prezzo di acquisto" è obbligatorio.' },
      isInt: { msg: 'Il campo "Prezzo di acquisto" deve essere un numero intero.' },
      min: {
        args: [1],
        msg: 'Il prezzo di acquisto deve essere almeno 1.',
      },
    },
  },
  // Campo onSale, di tipo boolean
  onSale: {
    type: DataTypes.BOOLEAN,
    allowNull: false,
    defaultValue: true,
  },
  // Riferimenti all'utente che l'ha inserito
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
  // Riferimenti all'utente che l'ha aggiornato
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
  // Timestamp di ultima modifica
  updatedAt: {
    type: DataTypes.DATE,
    allowNull: true,
    defaultValue: null,
  },
}, {
  tableName: 'Suits',
  timestamps: true,
  hooks: {
    // Rimuove eventuali spazi dal nome prima della validazione
    beforeValidate: (suit) => {
      if (suit.name) {
        suit.name = suit.name.trim();
      }
    },
    // Forza updatedAt a null prima di un update per consentire il suo refresh
    beforeUpdate: (suit) => {
      suit.updatedAt = null;
    },
  },
  // Validazione personalizzata per il campo name per garantire l'unicità
  validate: {
    async uniqueName() {
      const condition = { name: this.name };
      if (this.id) {
        condition.id = { [Op.ne]: this.id };
      }
      const existing = await Suit.findOne({ where: condition });
      if (existing) {
        throw new Error('Esiste già un abito con questo nome.');
      }
    },
  },
});

module.exports = Suit;
