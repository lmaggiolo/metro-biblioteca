const fs = require('fs');
const path = require('path');
const csv = require('fast-csv');
const sequelize = require('../config/db-config'); // Assicura la configurazione corretta del DB
const User = require('../models/userModel'); // Supponendo che sia definito il modello "User"

if (process.argv.length < 3) {
  console.error('Utilizzo: node import_csv.js <nome_file_csv>');
  process.exit(1);
}


const csvFilePath = process.argv[2];
const results = [];

fs.createReadStream(path.resolve(__dirname, csvFilePath))
  .pipe(csv.parse({ headers: true }))
  .on('error', error => console.error('Errore durante la lettura del CSV:', error))
  .on('data', row => {
    // Per ogni campo, se la stringa è vuota, la settiamo a null
    Object.keys(row).forEach(key => {
      if (row[key] === '') {
        row[key] = null;
      }
    });
    results.push(row);
  })
  .on('end', async rowCount => {
    console.log(`Righe lette: ${rowCount}`);
    try {
      await sequelize.authenticate();
      console.log('Connessione al database avvenuta con successo.');
      
      await User.bulkCreate(results);
      console.log('Importazione completata con successo.');
      process.exit(0);
    } catch (err) {
      console.error('Errore durante l\'importazione CSV:', err);
      process.exit(1);
    }
  });