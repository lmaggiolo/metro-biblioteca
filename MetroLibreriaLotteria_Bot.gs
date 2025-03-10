// Replace with your actual bot token and channel ID
const BOT_LOTTERIA_TOKEN = process.env.BOT_LOTTERIA_TOKEN;
const CHANNEL_LOTTERIA_ID = process.env.CHANNEL_LOTTERIA_ID;
const SPREADSHEET_LOTTERIA_ID = process.env.SPREADSHEET_LOTTERIA_ID;

// Definisci la whitelist degli username consentiti
const ALLOWED_USERNAMES = [
  '@Darkmario90',
  '@Batdomi',
  '@loremaggio',
  '@Vulpixshy82',
  '@Leonardo_cesa',
  '@austenide',
  '@Gabrieledidestra',
  '@csamasutra',
  '@y4ndereee',
  '@Alex01i2',
  '@Paneciokk',
  '@M_attia010',
  '@PocoCnN',
  '@joananana_7'
];

/**
 * Genera nuovi biglietti per un determinato nickname.
 * @param {string} nickname Il nickname dell'utente.
 * @param {number} [numTickets=1] Il numero di biglietti da generare (opzionale, default 1).
 * @returns {number[]} Un array con i numeri dei biglietti generati.
 */
function generateTickets(nickname, numTickets = 1, telegramUsername = '') {
  const ss = SpreadsheetApp.openById(SPREADSHEET_ID);
  const sheet = ss.getActiveSheet();

  const today = new Date();
  const ticketsGenerated = [];

  // Prepara i dati da inserire
  const newRows = [];

  for (let i = 0; i < numTickets; i++) {
    const ticketUUID = Utilities.getUuid();
    newRows.push([nickname, ticketUUID, '', telegramUsername, today, false]);
    ticketsGenerated.push(ticketUUID);
  }

  // Aggiungi tutte le nuove righe in una volta
  sheet.getRange(sheet.getLastRow() + 1, 1, newRows.length, newRows[0].length).setValues(newRows);

  return ticketsGenerated;
}

/**
 * Assegna numeri sequenziali alle righe che non hanno ancora un numero assegnato.
 */
function assignSequentialNumbers() {
  const ss = SpreadsheetApp.openById(SPREADSHEET_ID);
  const sheet = ss.getActiveSheet();

  const dataRange = sheet.getDataRange();
  const data = dataRange.getValues();

  // Presupponendo che la prima riga sia l'intestazione
  let lastNumber = 0;

  // Trova l'ultimo numero assegnato
  for (let i = 1; i < data.length; i++) {
    const numero = data[i][2]; // Colonna 'Numero'
    if (numero !== '' && !isNaN(numero)) {
      lastNumber = Math.max(lastNumber, Number(numero));
    }
  }

  // Assegna numeri alle righe senza numero
  for (let i = 1; i < data.length; i++) {
    const numero = data[i][2]; // Colonna 'Numero'
    if (numero === '' || isNaN(numero)) {
      lastNumber += 1;
      sheet.getRange(i + 1, 3).setValue(lastNumber); // i + 1 perché le righe del foglio partono da 1
    }
  }
}

/**
 * Invia un riepilogo giornaliero dei biglietti al canale Telegram, raggruppati per nickname e ordinati per numero di biglietti.
 */
function sendDailyTickets() {
  // Assegna numeri sequenziali alle nuove righe
  assignSequentialNumbers();

  const ss = SpreadsheetApp.openById(SPREADSHEET_ID);
  const sheet = ss.getActiveSheet();

  // Ottieni la data di ieri
  const yesterday = new Date();
  yesterday.setDate(yesterday.getDate() - 1);

  // Formatta la data di ieri come DD/MM/YYYY
  const day = ('0' + yesterday.getDate()).slice(-2);
  const month = ('0' + (yesterday.getMonth() + 1)).slice(-2);
  const year = yesterday.getFullYear();
  const formattedDate = `${day}/${month}/${year}`;

  // Converti la data di ieri in stringa per il confronto
  const yesterdayString = yesterday.toLocaleDateString();

  const data = sheet.getDataRange().getValues();
  let ticketsByNickname = {}; // Oggetto per raggruppare i numeri dei biglietti per nickname
  let ticketsSent = false;

  for (let i = 1; i < data.length; i++) {
    const row = data[i];
    const nickname   = row[0];   // Colonna 'Nickname'
    const numero     = row[2];   // Colonna 'Numero'
    const date       = row[4];   // Colonna 'Data di Creazione'
    const sent       = row[5];   // Colonna 'Inviato'

    if (date && date.toLocaleDateString() === yesterdayString && !sent) {
      if (!ticketsByNickname[nickname]) {
        ticketsByNickname[nickname] = [];
      }
      ticketsByNickname[nickname].push(numero); // Aggiungi il numero sequenziale al nickname

      // Segna il biglietto come inviato
      sheet.getRange(i + 1, 6).setValue(true); // Colonna 'Inviato' (colonna F)
      ticketsSent = true;
    }
  }

  if (ticketsSent) {
    // Trasforma l'oggetto ticketsByNickname in un array per poterlo ordinare
    let ticketsArray = [];

    for (let nickname in ticketsByNickname) {
      ticketsArray.push({
        nickname: nickname,
        tickets: ticketsByNickname[nickname]
      });
    }

    // Ordina l'array in base al numero di biglietti in ordine decrescente
    ticketsArray.sort((a, b) => b.tickets.length - a.tickets.length);

    // Costruisci il messaggio con la formattazione
    let message = `*🎟 Biglietti del ${formattedDate}:*`; // Intestazione con la data di ieri

    for (let i = 0; i < ticketsArray.length; i++) {
      const item = ticketsArray[i];
      const nickname = item.nickname;
      const numbers = item.tickets.join(', ');
      const count = item.tickets.length;

      // Assegna l'emoji in base alla posizione
      let icon = '👤';
      if (i === 0) {
        icon = '🥇';
      } else if (i === 1) {
        icon = '🥈';
      } else if (i === 2) {
        icon = '🥉';
      }

      message += `\n\n${icon} *${nickname}*: ${count} bigliett${count > 1 ? 'i' : 'o'} → ${numbers}`;
    }

    sendTelegramMessageToChannel(message); // Invia al canale
  } else {
    sendTelegramMessageToChannel("_Nessun biglietto generato ieri._"); // Testo in corsivo
  }
}

/**
 * Invia un riepilogo totale di tutti i biglietti al canale Telegram, raggruppati per nickname e ordinati per numero di biglietti.
 */
function sendTotalTickets() {

  const ss = SpreadsheetApp.openById(SPREADSHEET_ID);
  const sheet = ss.getActiveSheet();
  const data = sheet.getDataRange().getValues();

  let ticketsByNickname = {}; // Oggetto per raggruppare i numeri dei biglietti per nickname

  for (let i = 1; i < data.length; i++) {
    const row = data[i];
    const nickname    = row[0];   // Colonna 'Nickname'
    const numero      = row[2];   // Colonna 'Numero'

    // Elabora solo le righe che hanno un numero assegnato
    if (numero) {
      if (!ticketsByNickname[nickname]) {
        ticketsByNickname[nickname] = [];
      }
      ticketsByNickname[nickname].push(numero); // Aggiungi il numero al nickname
    }
  }

  if (Object.keys(ticketsByNickname).length > 0) {
    // Trasforma l'oggetto ticketsByNickname in un array per poterlo ordinare
    let ticketsArray = [];

    for (let nickname in ticketsByNickname) {
      ticketsArray.push({
        nickname: nickname,
        tickets: ticketsByNickname[nickname]
      });
    }

    // Ordina l'array in base al numero di biglietti in ordine decrescente
    ticketsArray.sort((a, b) => b.tickets.length - a.tickets.length);

    // Costruisci il messaggio con la formattazione
    let message = "*🔖 Riepilogo Totale Biglietti:*"; // Intestazione in grassetto

    for (let i = 0; i < ticketsArray.length; i++) {
      const item = ticketsArray[i];
      const nickname = item.nickname;
      const numbers = item.tickets.join(', ');
      const count = item.tickets.length;

      // Assegna l'emoji in base alla posizione
      let icon = '👤';
      if (i === 0) {
        icon = '🥇';
      } else if (i === 1) {
        icon = '🥈';
      } else if (i === 2) {
        icon = '🥉';
      }

      message += `\n\n${icon} *${nickname}*: ${count} bigliett${count > 1 ? 'i' : 'o'} → ${numbers}`;
    }

    sendTelegramMessageToChannel(message); // Invia al canale
  } else {
    sendTelegramMessageToChannel("_Nessun biglietto registrato._"); // Messaggio in corsivo
  }
}

/**
 * Sends a message to the Telegram channel.
 * @param {string} message The message to send.
 */
function sendTelegramMessageToChannel(message) {
  const url = `https://api.telegram.org/bot${BOT_TOKEN}/sendMessage`;
  const data = {
    chat_id: CHANNEL_ID,
    text: message,
    parse_mode: 'Markdown', // Puoi usare 'Markdown' o 'HTML'
  };
  const options = {
    method: 'post',
    contentType: 'application/json',
    payload: JSON.stringify(data),
  };
  try {
    UrlFetchApp.fetch(url, options);
  } catch (e) {
    Logger.log("Error sending Telegram message to channel: " + e);
  }
}

/**
 * Sends a message to a specific chat ID (user).
 * @param {string} message The message to send.
 * @param {string} chatId The chat ID to send the message to.
 */
function sendTelegramMessageToUser(message, chatId) {
  const url = `https://api.telegram.org/bot${BOT_TOKEN}/sendMessage`;
  const data = {
    chat_id: chatId,
    text: message,
  };
  const options = {
    method: 'post',
    contentType: 'application/json',
    payload: JSON.stringify(data),
  };
  try {
    UrlFetchApp.fetch(url, options);
  } catch (e) {
    Logger.log("Error sending Telegram message to user: " + e);
  }
}

/**
 * Gestisce le richieste POST in arrivo da Telegram (per i comandi del bot).
 * @param {object} e L'oggetto evento contenente i dati POST.
 */
function doPost(e) {
  const contents = JSON.parse(e.postData.contents);
  const message = contents.message || contents.edited_message;
  if (!message) return;
  
  const text = message.text;
  const chatId = message.chat.id;
  const telegramUsername = message.from.username ? '@' + message.from.username : '';

  // Controlla se l'username è nella whitelist
  if (!ALLOWED_USERNAMES.includes(telegramUsername)) {
    sendTelegramMessageToUser("⚠️ Mi dispiace, non sei autorizzato a utilizzare questo bot.", chatId);
    return;
  }

  if (text.startsWith('/biglietto')) {
    // Dividi il comando per estrarre il nickname e il numero di biglietti (se specificato)
    const args = text.split(' ').slice(1); // Rimuovi il comando stesso
    if (args.length >= 1) {
      const nickname = args[0];
      let numTickets = 1; // Numero di biglietti di default
      
      if (args.length >= 2) {
        numTickets = parseInt(args[1], 10);
        if (isNaN(numTickets) || numTickets < 1) {
          numTickets = 1; // Se il numero è invalido, default a 1
        }
      }

      const tickets = generateTickets(nickname, numTickets, telegramUsername);
      const totalTickets = tickets.length;

      // Invia il messaggio all'utente
      sendTelegramMessageToUser(`🎫 Biglietti generati per ${nickname}: ${totalTickets}.`, chatId);
    } else {
      sendTelegramMessageToUser("⚠️ Devi specificare un nickname dopo /biglietto. Uso: /biglietto [nickname] [numero biglietti]", chatId);
    }
  } else if (text === '/biglietto') {
    sendTelegramMessageToUser("⚠️ Devi specificare un nickname dopo /biglietto. Uso: /biglietto [nickname] [numero biglietti]", chatId);
  } else if (text === '/help') {
    const helpMessage = "ℹ️ Guida all'uso del bot:\n\n" +
      "/biglietto [nickname] [numero biglietti] - Genera nuovi biglietti con il nickname del cliente (numero di biglietti opzionale, default 1).\n" +
      "/help - Mostra questo messaggio di aiuto.";
    sendTelegramMessageToUser(helpMessage, chatId);
  } else if (text === '/start') {
    const welcomeMessage = "👋 Benvenuto! Questo bot ti permette di generare biglietti per la lotteria.\n\n" +
      "Usa /biglietto [nickname] [numero biglietti] per generare biglietti.\n" +
      "Usa /help per ulteriori informazioni.";
    sendTelegramMessageToUser(welcomeMessage, chatId);
  } else {
    sendTelegramMessageToUser("❓ Comando non riconosciuto. Usa /help per vedere la lista dei comandi disponibili.", chatId);
  }
}