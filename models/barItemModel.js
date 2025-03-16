// Modello per gli item del bar, con campi id, name, type, selling_price, purchase_price, onSale, insertedBy, updatedBy, updatedAt
const { DataTypes, Op } = require('sequelize');
const sequelize = require('../config/db-config');

const BarItem = sequelize.define('BarItem', {
  id: {
    type: DataTypes.INTEGER,
    primaryKey: true,
    autoIncrement: true,
  },
  // Campo nome dell'item
  name: {
    type: DataTypes.STRING,
    allowNull: false,
    validate: {
      notNull: { msg: 'Il campo "Nome" è obbligatorio.' },
      notEmpty: { msg: 'Il campo "Nome" non può essere vuoto.' },
    },
  },
  // Tipo di item (Cibo o Bevanda)
  type_item: {
    type: DataTypes.ENUM('Cibo', 'Bevanda'),
    allowNull: false,
    validate: {
      notNull: { msg: 'Il campo "Tipo" è obbligatorio.' },
      isIn: {
        args: [['Cibo', 'Bevanda']],
        msg: 'Il tipo deve essere "Cibo" o "Bevanda".'
      }
    }
  },
  // Prezzo di vendita
  selling_price: {
    type: DataTypes.INTEGER,
    allowNull: false,
    validate: {
      notNull: { msg: 'Il campo "Prezzo di vendita" è obbligatorio.' },
      isInt: { msg: 'Il campo "Prezzo di vendita" deve essere un numero intero.' },
      min: {
        args: [0],
        msg: 'Il prezzo di vendita deve essere almeno 0.',
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
        args: [0],
        msg: 'Il prezzo di acquisto deve essere almeno 0.',
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
  tableName: 'BarItems',
  timestamps: true,
  hooks: {
    // Rimuove eventuali spazi dal nome prima della validazione
    beforeValidate: (barItem) => {
      if (barItem.name) {
        barItem.name = barItem.name.trim();
      }
    },
    // Forza updatedAt a null prima di un update per consentire il suo refresh
    beforeUpdate: (barItem) => {
      barItem.updatedAt = null;
    },
  },
  // Validazione personalizzata per il campo name per garantire l'unicità
  validate: {
    async uniqueName() {
      const condition = { name: this.name };
      if (this.id) {
        condition.id = { [Op.ne]: this.id };
      }
      const existing = await BarItem.findOne({ where: condition });
      if (existing) {
        throw new Error('Esiste già un item del bar con questo nome.');
      }
    },
  },
});

module.exports = BarItem;
