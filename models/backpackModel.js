// Modello per gli zaini, con campi id, name, slot, selling_price, purchase_price
// Include riferimenti a insertedBy, updatedBy, e il timestamp updatedAt, come per i libri

const { DataTypes, Op } = require('sequelize');
const sequelize = require('../config/db-config');

const Backpack = sequelize.define('Backpack', {
  id: {
    type: DataTypes.INTEGER,
    primaryKey: true,
    autoIncrement: true,
  },
  // Campo nome zaino
  name: {
    type: DataTypes.STRING,
    allowNull: false,
    validate: {
      notNull: { msg: 'Il campo "Nome" è obbligatorio.' },
      notEmpty: { msg: 'Il campo "Nome" non può essere vuoto.' },
    },
  },
  // Campo slot: valori accettati 9, 18, 27
  slot: {
    type: DataTypes.INTEGER,
    allowNull: false,
    validate: {
      notNull: { msg: 'Il campo "Slot" è obbligatorio.' },
      isIn: {
        args: [[9, 18, 27]],
        msg: 'Il campo "Slot" deve essere uno tra 9, 18 o 27.',
      },
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
  tableName: 'Backpacks',
  timestamps: true,
  hooks: {
    // Rimuove eventuali spazi dal nome prima della validazione
    beforeValidate: (backpack) => {
      if (backpack.name) {
        backpack.name = backpack.name.trim();
      }
    },
    // Forza updatedAt a null prima di un update per consentire il suo refresh
    beforeUpdate: (backpack) => {
      backpack.updatedAt = null;
    },
  },
  // Validazione personalizzata per il campo name, se si desidera garantirne l'unicità
  validate: {
    async uniqueName() {
      const condition = { name: this.name };
      if (this.id) {
        condition.id = { [Op.ne]: this.id };
      }
      const existing = await Backpack.findOne({ where: condition });
      if (existing) {
        throw new Error('Esiste già uno zaino con questo nome.');
      }
    },
  },
});

module.exports = Backpack;
