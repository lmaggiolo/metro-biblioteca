const TelegramBot = require('node-telegram-bot-api');
const { crypto, encrypt, decrypt } = require('./utils/encryption');
const { User } = require('./models'); // Importiamo il modello User
const Role = require('./models/roleModel'); // Importiamo il modello Role

const token = process.env.BOT_SITO_TOKEN;
const bot = new TelegramBot(token, { polling: true });

console.log("Bot is running...");

// Funzione per salvare o aggiornare l'utente nel database
async function saveOrUpdateUser(telegram_account, chatId) {
  // Assicuriamoci che telegram_account inizi con '@' e convertiamolo in minuscolo
  if (!telegram_account.startsWith('@')) {
    telegram_account = '@' + telegram_account;
  }
  telegram_account = telegram_account.toLowerCase();

  console.log(`Saving or updating user: ${telegram_account} with chatId: ${chatId}`);

  try {
    // Cerchiamo l'utente nel database
    let user = await User.findOne({ where: { telegram_account } });

    if (user) {
      console.log(`User found: ${telegram_account}. Updating telegram_chatId.`);
      // Aggiorniamo telegram_chatId
      await user.update({ telegram_chatId: chatId });
      console.log(`telegram_chatId updated for user: ${telegram_account}`);
    } else {
      console.log(`User not found: ${telegram_account}. Inserting new user.`);
      // Creiamo un nuovo utente con password casuale e ruolo "Dipendente" di default
      const randomPassword = crypto.randomBytes(4).toString('hex');
      const encryptedPassword = encrypt(randomPassword);

      await User.create({
        name: telegram_account,
        password: encryptedPassword,
        roleId: '6', // Ruolo "Dipendente" di default
        telegram_account: telegram_account,
        telegram_chatId: chatId,
      });
      console.log(`New user inserted: ${telegram_account}`);
    }
  } catch (error) {
    console.error("Errore nel salvataggio o aggiornamento dell'utente:", error);
  }
}

// Comando per ottenere i dati dell'utente
bot.onText(/\/ottienidati/, async (msg) => {
  const chatId = msg.chat.id;
  let telegram_account = msg.from.username;

  // Assicuriamoci che telegram_account inizi con '@' e convertiamolo in minuscolo
  if (!telegram_account.startsWith('@')) {
    telegram_account = '@' + telegram_account;
  }
  telegram_account = telegram_account.toLowerCase();

  console.log(`Command /ottienidati received from: ${telegram_account}`);

  await saveOrUpdateUser(telegram_account, chatId);

  try {
    let user = await User.findOne({
      where: { telegram_account },
      include: [{ model: Role, as: 'role' }]
    });

    if (user) {
      console.log(`Data retrieved for user: ${telegram_account}`);
      const decryptedPassword = decrypt(user.password); // Decripta la password
      bot.sendMessage(chatId, `I tuoi dati:
Nome: ${user.name}
Ruolo: ${user.role.name}
Telegram: ${user.telegram_account}
Password: ${decryptedPassword}
Creato il: ${user.createdAt ? user.createdAt.toLocaleString() : '-'}
Ultimo Accesso: ${user.lastAccess ? user.lastAccess.toLocaleString() : '-'}`);
    } else {
      console.log(`No data found for user: ${telegram_account}`);
      bot.sendMessage(chatId, "Nessun dato trovato per il tuo utente.");
    }
  } catch (error) {
    console.error("Errore nel recupero dei dati:", error);
    bot.sendMessage(chatId, "Errore nel recupero dei dati.");
  }
});

// Comando per cambiare la password
bot.onText(/\/cambiapassword (.+)/, async (msg, match) => {
  const chatId = msg.chat.id;
  let telegram_account = msg.from.username;
  const newPassword = match[1];

  // Assicuriamoci che telegram_account inizi con '@' e convertiamolo in minuscolo
  if (!telegram_account.startsWith('@')) {
    telegram_account = '@' + telegram_account;
  }
  telegram_account = telegram_account.toLowerCase();

  console.log(`Command /cambiapassword received from: ${telegram_account}`);

  await saveOrUpdateUser(telegram_account, chatId);

  try {
    const encryptedPassword = encrypt(newPassword);
    let user = await User.findOne({ where: { telegram_account } });

    if (user) {
      await user.update({ password: encryptedPassword });
      console.log(`Password changed for user: ${telegram_account}`);
      bot.sendMessage(chatId, "Password cambiata con successo.");
    } else {
      console.log(`No user found to change password for: ${telegram_account}`);
      bot.sendMessage(chatId, "Nessun utente trovato per cambiare la password.");
    }
  } catch (error) {
    console.error("Errore nel cambiare la password:", error);
    bot.sendMessage(chatId, "Errore nel cambiare la password.");
  }
});

// Funzione per inviare la lista dei comandi
const sendCommandList = (chatId) => {
  const commandList = `
Ecco i comandi disponibili:
/ottienidati - Ottieni i tuoi dati utente
/cambiapassword <nuova_password> - Cambia la tua password
/comandi - Mostra la lista dei comandi
`;
  bot.sendMessage(chatId, commandList);
};

// Comando per mostrare la lista dei comandi
bot.onText(/\/comandi/, (msg) => {
  const chatId = msg.chat.id;
  const telegram_account = msg.from.username;
  console.log(`Command /comandi received from ${telegram_account} with chatId: ${chatId}`);
  sendCommandList(chatId);
});

// Comando /start per mostrare la lista dei comandi
bot.onText(/\/start/, (msg) => {
  const chatId = msg.chat.id;
  const telegram_account = msg.from.username;
  console.log(`Command /start received from ${telegram_account} with chatId: ${chatId}`);
  bot.sendMessage(chatId, "Benvenuto! Ecco cosa puoi fare:");
  sendCommandList(chatId);
});