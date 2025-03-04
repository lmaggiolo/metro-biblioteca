// Controller per la gestione dei libri (Book)

const { Book, User, Category, Role } = require('../models');
const { Op } = require('sequelize');
const MessageHandler = require('../utils/messageHandler');

// Funzione di utilità per costruire l'URL di redirect
function buildRedirectUrl(searchParams) {
  const {
    page,
    limit,
    searchName,
    searchAuthor,
    searchCategoryId,
    searchOnSale,
    sortField,
    sortOrder,
  } = searchParams;
  return `/libri?page=${page}&limit=${encodeURIComponent(limit)}&searchName=${encodeURIComponent(searchName)}&searchAuthor=${encodeURIComponent(searchAuthor)}&searchCategoryId=${encodeURIComponent(searchCategoryId)}&searchOnSale=${encodeURIComponent(searchOnSale)}&sortField=${encodeURIComponent(sortField)}&sortOrder=${encodeURIComponent(sortOrder)}`;
}

async function getBookById(req, res) {
  try {
    const book = await Book.findByPk(req.params.id, {
      include: [{ model: Category, as: 'category' }]
    });
    if (!book) {
      return res.status(404).json({ error: 'Libro non trovato' });
    }
    return res.json({
      id: book.id,
      name: book.name,
      author: book.author,
      price: book.price,
      category: book.category ? book.category.name : null,
      type: 'book'
    });
  } catch (error) {
    console.error('Errore durante il recupero del libro:', error);
    return res.status(500).json({ error: 'Errore interno del server' });
  }
}

async function getAllBooks(req, res) {
  // Gestione messaggi
  let messages;
  if (req.session.messages) {
    if (req.session.messages.error && req.session.messages.error.length > 0) {
      const messageHandler = new MessageHandler();
      messageHandler.clear();
      messages = messageHandler.getMessages();
    } else {
      messages = req.session.messages;
    }
  } else {
    messages = new MessageHandler().getMessages();
  }
  req.session.messages = null;

  try {
    // Recupero dati utente
    const currentUserId = req.user.id;
    const currentUser = await User.findByPk(currentUserId, {
      include: {
        model: Role,
        as: 'role',
        attributes: ['name', 'priority'],
      },
    });
    const currentUserName = currentUser.name;
    const currentUserPriority = currentUser.role.priority;

    // Leggo parametri dalla query
    let {
      page = 1,
      limit = 10,
      searchName = '',
      searchAuthor = '',
      searchCategoryId = '',
      searchOnSale = '',
      sortField = 'name',
      sortOrder = 'ASC'
    } = req.query;

    let limitValue;
    if (limit === 'all') {
      limitValue = null;
      page = 1;
    } else {
      limitValue = parseInt(limit, 10);
    }
    const offset = limitValue ? (page - 1) * limitValue : null;

    // Condizioni di ricerca
    const searchConditions = {
      name: { [Op.like]: `%${searchName}%` },
      author: { [Op.like]: `%${searchAuthor}%` },
    };
    if (searchCategoryId) {
      searchConditions.categoryId = searchCategoryId;
    }

    // Ordine
    let orderOption = [];
    // Ordina prima su onSale DESC
    orderOption.push(['onSale', 'DESC']);
    // Se sortField è un'associazione (es. "category.name") gestiscila, altrimenti sort su un campo base
    if (sortField.includes('.')) {
      const [associationAlias, associatedField] = sortField.split('.');
      let modelAlias;
      if (associationAlias === 'category') {
        modelAlias = Category;
      } else if (associationAlias === 'inserter' || associationAlias === 'updater') {
        modelAlias = User;
      } else {
        modelAlias = null;
      }
      if (modelAlias) {
        orderOption.push([{ model: modelAlias, as: associationAlias }, associatedField, sortOrder]);
      } else {
        orderOption.push([sortField, sortOrder]);
      }
    } else {
      orderOption.push([sortField, sortOrder]);
    }

    // Opzioni per la query
    const queryOptions = {
      where: searchConditions,
      order: orderOption,
      include: [
        { model: User, as: 'inserter', attributes: ['name'] },
        { model: User, as: 'updater', attributes: ['name'] },
        { model: Category, as: 'category' },
      ],
      distinct: true
    };
    if (limitValue) {
      queryOptions.limit = limitValue;
      queryOptions.offset = offset;
    }

    const { count, rows: books } = await Book.findAndCountAll(queryOptions);
    const totalPages = limitValue ? Math.ceil(count / limitValue) : 1;

    // Salvo i parametri in sessione come valori numerici (mai "all")
    req.session.searchParams = {
      page,
      limit,
      searchName,
      searchAuthor,
      searchCategoryId,
      searchOnSale,
      sortField,
      sortOrder,
    };

    const categories = await Category.findAll({ order: [['name', 'ASC']] });

    return res.render('bookView', {
      books,
      count,
      categories,
      totalPages,
      currentPage: parseInt(page, 10),
      limit,
      searchName,
      searchAuthor,
      searchCategoryId,
      searchOnSale,
      sortField,
      sortOrder,
      currentUserName,
      currentUserPriority,
      messages,
      isPrivileged: req.user.isPrivileged || false
    });
  } catch (error) {
    console.error('Errore durante il recupero dei libri:', error);
    return res
      .status(500)
      .send('Si è verificato un errore durante il recupero dei libri.');
  }
}

async function createBook(req, res) {
  const messages = new MessageHandler();
  try {
    await Book.create({
      ...req.body,
      onSale: req.body.onSale === 'on',
      insertedBy: req.user.id
    });
    messages.addSuccess('Libro creato con successo');
    req.session.messages = messages.getMessages();

    if (req.session.searchParams) {
      return res.redirect(buildRedirectUrl(req.session.searchParams));
    } else {
      return res.redirect('/libri');
    }
  } catch (error) {
    const errorMsg = error.message.replace(/^Validation error:\s*/, '');
    console.error('Errore durante la creazione dello zaino:', errorMsg);
    messages.addError(`Errore durante la creazione dello zaino:\n ${errorMsg}`);
    messages.setModal('addModal');
    req.session.messages = messages.getMessages();

    if (req.session.searchParams) {
      return res.redirect(buildRedirectUrl(req.session.searchParams));
    }
    return res.redirect('/libri');
  }
}

async function updateBook(req, res) {
  const messages = new MessageHandler();
  try {
    const book = await Book.findByPk(req.params.id);
    if (!book) {
      return res.status(404).send('Libro non trovato');
    }

    await book.update({
      ...req.body,
      onSale: req.body.onSale === 'on',
      updatedBy: req.user.id,
      updatedAt: new Date()
    });
    messages.addSuccess('Libro aggiornato con successo');
    req.session.messages = messages.getMessages();

    if (req.session.searchParams) {
      return res.redirect(buildRedirectUrl(req.session.searchParams));
    }
    return res.redirect('/libri');
  } 
  catch (error) {
    const errorMsg = error.message.replace(/^Validation error:\s*/, '');
    console.error("Errore durante l'aggiornamento del libro:", errorMsg);
    messages.addError(`Errore durante l'aggiornamento del libro:\n ${errorMsg}`);
    messages.setModal('editModal' + req.params.id);
    req.session.messages = messages.getMessages();

    // Recupero i parametri di ricerca precedenti dalla sessione
    const {
      page = 1,
      limit = 10,
      searchName = '',
      searchAuthor = '',
      searchCategoryId = '',
      searchOnSale = '',
      sortField = 'name',
      sortOrder = 'ASC',
    } = req.session.searchParams || {};

    let limitValue;
    let currentPage = parseInt(page, 10) || 1;
    if (limit === 'all') {
      limitValue = null;
      currentPage = 1;
    } else {
      limitValue = parseInt(limit, 10);
    }
    const offset = limitValue ? (currentPage - 1) * limitValue : null;

    // Costruisco le condizioni di ricerca come in getAllBooks
    const searchConditions = {
      name: { [Op.like]: `%${searchName}%` },
      author: { [Op.like]: `%${searchAuthor}%` },
    };
    if (searchCategoryId) {
      searchConditions.categoryId = searchCategoryId;
    }

    // Costruisco l'ordine
    let orderOption = [];
    orderOption.push(['onSale', 'DESC']);
    if (sortField.includes('.')) {
      const [associationAlias, associatedField] = sortField.split('.');
      let modelAlias;
      if (associationAlias === 'category') {
        modelAlias = Category;
      } else if (associationAlias === 'inserter' || associationAlias === 'updater') {
        modelAlias = User;
      } else {
        modelAlias = null;
      }
      if (modelAlias) {
        orderOption.push([{ model: modelAlias, as: associationAlias }, associatedField, sortOrder]);
      } else {
        orderOption.push([sortField, sortOrder]);
      }
    } else {
      orderOption.push([sortField, sortOrder]);
    }

    // Opzioni della query per filtrare e paginare
    const queryOptions = {
      where: searchConditions,
      order: orderOption,
      include: [
        { model: User, as: 'inserter', attributes: ['name'] },
        { model: User, as: 'updater', attributes: ['name'] },
        { model: Category, as: 'category' },
      ],
      distinct: true
    };
    if (limitValue) {
      queryOptions.limit = limitValue;
      queryOptions.offset = offset;
    }

    const { count, rows: books } = await Book.findAndCountAll(queryOptions);
    const totalPages = limitValue ? Math.ceil(count / limitValue) : 1;

    // Recupero l'utente corrente e le categorie aggiornate per la view
    const currentUser = await User.findByPk(req.user.id, {
      include: { model: Role, as: 'role', attributes: ['name', 'priority'] },
    });
    const categories = await Category.findAll({ order: [['name', 'ASC']] });

    return res.render('bookView', {
      books,
      count,
      categories,
      totalPages,
      currentPage,
      limit,
      searchName,
      searchAuthor,
      searchCategoryId,
      searchOnSale,
      sortField,
      sortOrder,
      currentUserName: currentUser.name,
      currentUserPriority: currentUser.role.priority,
      messages: req.session.messages,
      isPrivileged: req.user.isPrivileged || false
    });
  }
}

async function deleteBook(req, res) {
  const messages = new MessageHandler();
  try {
    const book = await Book.findByPk(req.params.id);
    if (!book) {
      return res.status(404).send('Libro non trovato');
    }

    await book.destroy();
    messages.addSuccess('Libro eliminato con successo');
    req.session.messages = messages.getMessages();

    if (req.session.searchParams) {
      return res.redirect(buildRedirectUrl(req.session.searchParams));
    }
    return res.redirect('/libri');
  } catch (error) {
    const errorMsg = error.message.replace(/^Validation error:\s*/, '');
    console.error("Errore durante l'eliminazione del libro:", errorMsg);
    messages.addError(`Errore durante l'eliminazione del libro:\n ${errorMsg}`);
    messages.setModal('deleteModal' + req.params.id);
    req.session.messages = messages.getMessages();

    // Ricarico i dati mantenendo i parametri di ricerca per mostrare il modal con gli errori
    const currentUserId = req.user.id;
    const currentUser = await User.findByPk(currentUserId, {
      include: { model: Role, as: 'role', attributes: ['name', 'priority'] }
    });
    const categories = await Category.findAll({ order: [['name', 'ASC']] });
    const { count, rows: books } = await Book.findAndCountAll({
      include: [
        { model: User, as: 'inserter', attributes: ['name'] },
        { model: User, as: 'updater', attributes: ['name'] },
        { model: Category, as: 'category' }
      ],
      distinct: true
    });

    const {
      page = 1,
      limit = 10,
      searchName = '',
      searchAuthor = '',
      searchCategoryId = '',
      searchOnSale = '',
      sortField = 'name',
      sortOrder = 'ASC'
    } = req.session.searchParams || {};

    const numericLimit = limit === 'all' ? 10 : parseInt(limit, 10);
    const totalPages = numericLimit ? Math.ceil(count / numericLimit) : 1;

    return res.render('bookView', {
      books,
      count,
      categories,
      totalPages,
      currentPage: parseInt(page, 10),
      limit,
      searchName,
      searchAuthor,
      searchCategoryId,
      searchOnSale,
      sortField,
      sortOrder,
      currentUserName: currentUser.name,
      currentUserPriority: currentUser.role.priority,
      messages: req.session.messages,
      isPrivileged: req.user.isPrivileged || false
    });
  }
}

module.exports = {
  getBookById,
  getAllBooks,
  createBook,
  updateBook,
  deleteBook
};
