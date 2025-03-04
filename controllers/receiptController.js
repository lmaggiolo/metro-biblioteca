const Receipt = require('../models/receiptModel');
const Book = require('../models/bookModel');
const Backpack = require('../models/backpackModel');
const Suit = require('../models/suitModel');
const Stationery = require('../models/stationeryModel');

exports.createReceipt = async (req, res) => {
  try {
    const { customerName, items } = req.body;
    if (!customerName || !items || !Array.isArray(items) || items.length === 0) {
      return res.status(400).json({ message: 'Dati mancanti per la creazione dello scontrino.' });
    }

    let totalPrice = 0;
    let detailedItems = [];

    // Per ciascun item, recupera il prodotto dalla tabella corrispondente e calcola il totale
    for (const item of items) {
      let product;
      if (item.type === 'book') {
        product = await Book.findByPk(item.itemId);
        currentPrice = parseFloat(product.price);
      } else if (item.type === 'backpack') {
        product = await Backpack.findByPk(item.itemId);
        currentPrice = parseFloat(product.selling_price);
      } else if (item.type === 'suit') {
        product = await Suit.findByPk(item.itemId);
        currentPrice = parseFloat(product.selling_price);
      } else if (item.type === 'stationery') {
        product = await Stationery.findByPk(item.itemId);
        currentPrice = parseFloat(product.selling_price);
      }

      if (!product) {
        return res.status(404).json({ message: `Prodotto non trovato per id ${item.itemId} e type ${item.type}.` });
      }
      totalPrice += currentPrice * item.quantity;
      detailedItems.push({
        id: product.id,
        name: product.name,
        type: item.type,
        price: currentPrice,
        quantity: item.quantity,
      });
    }

    // Utilizza req.user (disponibile tramite Passport) per registrare l'utente che effettua il checkout
    const insertedBy = req.user ? req.user.id : null;
    if (!insertedBy) {
      return res.status(401).json({ message: 'Utente non autenticato.' });
    }

    const receipt = await Receipt.create({
      customerName,
      items: detailedItems,
      totalPrice,
      insertedBy,
    });

    return res.status(201).json({
      message: 'Scontrino creato con successo.',
      receipt,
    });
  } catch (err) {
    console.error(err);
    return res.status(500).json({ message: 'Errore interno del server.' });
  }
};

exports.getAllReceipts = async (req, res) => {
  try {
    const receipts = await Receipt.findAll();
    return res.json(receipts);
  } catch (err) {
    console.error(err);
    return res.status(500).json({ message: 'Errore interno del server.' });
  }
};
