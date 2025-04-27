const TelegramBot = require('node-telegram-bot-api');
const express     = require('express');
const bodyParser  = require('body-parser');
const { crypto, encrypt, decrypt } = require('./utils/encryption');
const { User }   = require('./models');
const Role       = require('./models/roleModel');

const TOKEN       = process.env.BOT_SITO_TOKEN;
let MODE          = process.env.TELEGRAM_MODE || 'polling';   // 'polling' | 'webhook'
const PUBLIC_URL  = process.env.BOT_PUBLIC_URL;               // richiesto se webhook
const PORT        = process.env.BOT_PORT || 3001;

const isInvalidWebhookURL = MODE === 'webhook' && (!PUBLIC_URL || !PUBLIC_URL.startsWith('https://'));

if (isInvalidWebhookURL) {
  console.warn(
    'BOT_PUBLIC_URL deve essere HTTPS e raggiungibile da Telegram; passo a polling',
  );
  MODE = 'polling';               // change const → let or introduce new var
}

/**
 * Inizializza il bot. Se expressApp viene passato,
 * il webhook viene montato su quella istanza Express.
 */
function setupBot(externalBot, expressApp) {
  if (!TOKEN) {
    console.warn('⚠️  BOT_SITO_TOKEN mancante – bot non inizializzato');
    return null;
  }

  // Ri-usa l’istanza esistente per hot-reload
  const bot =
    externalBot ||
    global._telegramBot ||
    new TelegramBot(
      TOKEN,
      MODE === 'polling'
        ? { polling: false }
        : { webHook: { port: PORT } }
    );

  /* ─── Avvio transport (solo la prima volta) ─── */
  if (!externalBot && !bot._transportStarted) {
    if (MODE === 'polling') {
      bot
        .deleteWebHook({ drop_pending_updates: true })
        .then(() => bot.startPolling())
        .then(() => console.log('✅  Bot Telegram in polling'))
        .catch((err) => console.error('❌  Errore startPolling:', err));
    } else {
      if (!PUBLIC_URL) {
        throw new Error('BOT_PUBLIC_URL necessario in modalità webhook');
      }
      const path = `/bot${TOKEN}`;
      bot
        .setWebHook(`${PUBLIC_URL}${path}`)
        .then(() => console.log('✅  Webhook impostato a', `${PUBLIC_URL}${path}`))
        .catch(console.error);

      // usa expressApp se esiste, altrimenti ne crea uno e lo mette in ascolto
      const app = expressApp || express();
      app.use(bodyParser.json());
      app.post(path, (req, res) => {
        bot.processUpdate(req.body);
        res.sendStatus(200);
      });
      if (!expressApp) {
        app.listen(PORT, () => console.log(`🚀  Express (solo webhook) su porta ${PORT}`));
      }
    }
    bot._transportStarted = true;
  }

  global._telegramBot = bot; // Salva per i reload

  /* ───── Soppressione errori 409 da polling ───── */
  bot.on('polling_error', (err) => {
    // Ignora il classico "terminated by other getUpdates request"
    const isConflict409 =
      err?.response?.statusCode === 409 ||
      (err.code === 'ETELEGRAM' && /409.*getUpdates/i.test(err.message));

    if (!isConflict409) {
      console.error('[polling_error]', err);
    }
  });

  /* ────────────────────────────────
   *  HANDLER & FUNZIONI DI SUPPORTO
   * ──────────────────────────────── */

  async function saveOrUpdateUser(telegram_account, chatId) {
    if (!telegram_account.startsWith('@')) telegram_account = '@' + telegram_account;
    telegram_account = telegram_account.toLowerCase();
    try {
      let user = await User.findOne({ where: { telegram_account } });
      if (user) {
        await user.update({ telegram_chatId: chatId });
      } else {
        const randomPassword    = crypto.randomBytes(4).toString('hex');
        const encryptedPassword = encrypt(randomPassword);
        await User.create({
          name: telegram_account,
          password: encryptedPassword,
          roleId: '6', // Dipendente
          telegram_account,
          telegram_chatId: chatId,
        });
      }
    } catch (err) {
      console.error('Errore saveOrUpdateUser:', err);
    }
  }

  // /ottienidati
  bot.onText(/\/ottienidati/, async (msg) => {
    const chatId           = msg.chat.id;
    const telegram_account = msg.from.username || '';
    await saveOrUpdateUser(telegram_account, chatId);

    try {
      const user = await User.findOne({
        where: { telegram_account: '@' + telegram_account.toLowerCase() },
        include: [{ model: Role, as: 'role' }],
      });
      if (user) {
        const pwd = decrypt(user.password);
        bot.sendMessage(
          chatId,
          `I tuoi dati:
Nome: ${user.name}
Ruolo: ${user.role.name}
Telegram: ${user.telegram_account}
Password: ${pwd}
Creato il: ${user.createdAt?.toLocaleString() ?? '-'}
Ultimo Accesso: ${user.lastAccess?.toLocaleString() ?? '-'}`
        );
      } else {
        bot.sendMessage(chatId, 'Nessun dato trovato per il tuo utente.');
      }
    } catch (err) {
      console.error('Errore recupero dati:', err);
      bot.sendMessage(chatId, 'Errore nel recupero dei dati.');
    }
  });

  // /cambiapassword <nuova_pass>
  bot.onText(/\/cambiapassword (.+)/, async (msg, match) => {
    const chatId           = msg.chat.id;
    const telegram_account = msg.from.username || '';
    const newPassword      = match[1];
    await saveOrUpdateUser(telegram_account, chatId);

    try {
      const encryptedPassword = encrypt(newPassword);
      const user = await User.findOne({
        where: { telegram_account: '@' + telegram_account.toLowerCase() },
      });
      if (user) {
        await user.update({ password: encryptedPassword });
        bot.sendMessage(chatId, 'Password cambiata con successo.');
      } else {
        bot.sendMessage(chatId, 'Nessun utente trovato.');
      }
    } catch (err) {
      console.error('Errore cambio password:', err);
      bot.sendMessage(chatId, 'Errore nel cambiare la password.');
    }
  });

  // lista comandi
  const sendCommandList = (chatId) =>
    bot.sendMessage(
      chatId,
      `Comandi disponibili:
/ottienidati – Visualizza i tuoi dati
/cambiapassword <nuova_password> – Cambia la password
/comandi – Lista comandi`
    );

  bot.onText(/\/comandi/, (msg) => sendCommandList(msg.chat.id));
  bot.onText(/\/start/,   (msg) => { bot.sendMessage(msg.chat.id, 'Benvenuto!'); sendCommandList(msg.chat.id); });

  /* ───── gestione chiusura processo ───── */
  if (!global._gracefulExitHookAdded) {
    const stop = () => bot.stopPolling?.().finally(() => process.exit(0));
    process.once('SIGINT',  stop);
    process.once('SIGTERM', stop);
    global._gracefulExitHookAdded = true;
  }

  return bot;
}

module.exports = setupBot;
