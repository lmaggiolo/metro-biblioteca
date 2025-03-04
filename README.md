# 📚 Metro Biblioteca

![Banner Metro Biblioteca](public/imgs/screenshots/screenshot-banner.png)

## 🔍 Descrizione del Progetto

Metro Biblioteca è una piattaforma web per la gestione di una biblioteca digitale. L'applicazione permette di gestire libri, utenti, zaini, abiti, cancelleria e scontrini.

![Pagina di Login](public/imgs/screenshots/screenshot-login.png)

## ✨ Funzionalità Principali

- 📖 **Gestione Libri**: Catalogazione di libri con diverse categorie (Avventura, Manga, Fantasy, Fantascienza, Romantico, ecc.)
- 👥 **Gestione Utenti**: Registrazione, autenticazione e gestione dei privilegi degli utenti
- 🎒 **Gestione Zaini**: Catalogazione e gestione di zaini
- 👔 **Gestione Abiti**: Catalogazione e gestione di abiti
- 📏 **Gestione Cancelleria**: Catalogazione e gestione di articoli di cancelleria
- 🧾 **Gestione Scontrini**: Generazione e gestione di scontrini per le transazioni

![Pagina dei Libri](public/imgs/screenshots/screenshot-libri-scontrino.png)

![Pagina degli Utenti](public/imgs/screenshots/screenshot-utenti.png)

## 💻 Requisiti di Sistema

- Node.js versione LTS consigliata, sviluppato con la **v20.16.0**
- Database SQL (MySQL/PostgreSQL)

## 🛠️ Tecnologie Utilizzate e Componenti del Progetto

- **Backend**: Sviluppato in Node.js con Express.js come framework per il web server.  
  ![Node.js](https://img.shields.io/badge/Node.js-339933?style=for-the-badge&logo=nodedotjs&logoColor=white)  
  ![Express.js](https://img.shields.io/badge/Express.js-000000?style=for-the-badge&logo=express&logoColor=white)

- **Database**: Gestione dei dati tramite SQL, utilizzando Sequelize come ORM.  
  ![Sequelize](https://img.shields.io/badge/Sequelize-52B0E7?style=for-the-badge&logo=Sequelize&logoColor=white)  
  ![MySQL](https://img.shields.io/badge/MySQL-005C84?style=for-the-badge&logo=mysql&logoColor=white)  
  ![PostgreSQL](https://img.shields.io/badge/PostgreSQL-336791?style=for-the-badge&logo=postgresql&logoColor=white)

- **Autenticazione**: Implementata con Passport.js per una gestione sicura degli accessi.  
  ![Passport.js](https://img.shields.io/badge/Passport.js-000000?style=for-the-badge&logo=passport&logoColor=white)

- **Frontend**: Interfaccia utente realizzata con il template engine EJS, arricchita da CSS e JavaScript.  
  ![EJS](https://img.shields.io/badge/EJS-B4CA65?style=for-the-badge&logo=ejs&logoColor=white)  
  ![CSS](https://img.shields.io/badge/CSS-1572B6?style=for-the-badge&logo=css3&logoColor=white)  
  ![JavaScript](https://img.shields.io/badge/JavaScript-F7DF1E?style=for-the-badge&logo=javascript&logoColor=black)

- **Strumenti Aggiuntivi**:  
  - *Express-session* per la gestione delle sessioni.  
    ![Express-session](https://img.shields.io/badge/Express--session-000000?style=for-the-badge)

  - *Connect-flash* per la visualizzazione di messaggi flash nelle interazioni utente.  
    ![Connect-flash](https://img.shields.io/badge/Connect--flash-000000?style=for-the-badge)

## 🚀 Installazione

1. Clona il repository

   ```bash
   git clone [URL_DEL_REPOSITORY]
   cd metro-biblioteca
   ```

2. Installa le dipendenze

   ```bash
   npm install
   ```

3. Configura il database
   - Assicurati che il tuo database SQL sia in esecuzione
   - Modifica le configurazioni di connessione in `models/index.js` se necessario

4. Avvia l'applicazione

   ```bash
   npm start
   ```

5. Accedi all'applicazione
   - Apri il browser e vai a `http://localhost:3000`

## 📂 Struttura del Progetto

```nodejs
metro-biblioteca/
├── controllers/  # Logica di controllo
├── models/       # Definizioni dei modelli Sequelize
├── routes/       # Definizioni delle rotte Express
├── views/        # Template EJS
├── public/       # File statici (CSS, JS, immagini)
├── database/     # Script SQL
└── app.js        # Entry point dell'applicazione
```

## 🤖 Bot Telegram Integrato

L'applicazione include un bot automatizzato (bot.js) che viene avviato insieme al server principale, facilitando alcune operazioni automatiche.

## 🗃️ Manutenzione del Database

- 📥 Per importare nuovi libri: utilizzare gli script nella cartella `database/import`
- 📤 Per esportare dati: utilizzare gli script nella cartella `database/export`

## 📄 Licenza

Consultare il file [LICENSE](LICENSE) per informazioni sulla licenza.

## ©️ Crediti

Sviluppato con ❤️ da  **[Lorenzo Maggiolo - LM16](https://github.com/lmaggiolo)**  
[![GitHub](https://img.shields.io/badge/GitHub-181717?style=for-the-badge&logo=github&logoColor=white)](https://github.com/lmaggiolo)
