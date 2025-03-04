const { encrypt } = require('../utils/encryption');
const sequelize = require('../config/database');
const { User } = require('../models');

async function addUser() {
  try {
    // Connessione al database
    await sequelize.authenticate();
    console.log('Connessione al database riuscita.');

    // Sincronizza il modello (assicurati che la tabella esista)
    await sequelize.sync();

    // Dettagli del nuovo utente
    const name = 'thelekick'; // Sostituisci con il tuo nickname
    const password = 'test'; // Sostituisci con la tua password
    const role = 'Direttore'; // Puoi cambiare il ruolo se necessario
    const telegram_account = '@Darkmario90'; // Sostituisci con il tuo handle Telegram

    // Verifica se l'utente esiste già
    const existingUser = await User.findOne({ where: { name } });
    if (existingUser) {
      console.log(`L'utente con nickname "${name}" esiste già.`);
      return;
    }

    // Cripta la password
    const encryptedPassword = encrypt(password);

    // Crea il nuovo utente
    const newUser = await User.create({
      name,
      password: encryptedPassword,
      role,
      telegram_account,
    });

    console.log('Nuovo utente aggiunto con successo:');
    console.log({
      id: newUser.id,
      name: newUser.name,
      role: newUser.role,
      telegram_account: newUser.telegram_account,
    });

    process.exit(0);
  } catch (error) {
    console.error('Errore durante l\'aggiunta dell\'utente:', error);
    process.exit(1);
  }
}

addUser();