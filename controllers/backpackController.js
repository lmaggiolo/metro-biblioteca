// Controller per la gestione degli zaini (Backpack)

const { Backpack, User, Role } = require('../models');
const { Op } = require('sequelize');
const MessageHandler = require('../utils/messageHandler');

// Funzione di utilità per costruire l'URL di redirect per zaini
function buildRedirectUrl(searchParams) {
  const { page, limit, searchName, sortField, sortOrder } = searchParams;
  return `/zaini?page=${page}&limit=${encodeURIComponent(limit)}&searchName=${encodeURIComponent(searchName)}&sortField=${encodeURIComponent(sortField)}&sortOrder=${encodeURIComponent(sortOrder)}`;
}

async function getBackpackById(req, res) {
  try {
    const backpack = await Backpack.findByPk(req.params.id);
    if (!backpack) {
      return res.status(404).json({ error: 'Zaino non trovato' });
    }
    return res.json({
      id: backpack.id,
      name: backpack.name,
      price: backpack.selling_price,
      type: 'backpack'
    });
  } catch (error) {
    console.error('Errore nel recupero dello zaino:', error);
    return res.status(500).json({ error: 'Errore interno del server' });
  }
}

async function getAllBackpacks(req, res) {
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
      name: { [Op.like]: `%${searchName}%` }
    };

    // Ordine: per default viene messo onSale DESC, poi eventuale ordinamento
    let orderOption = [];
    orderOption.push(['onSale', 'DESC']);
    if (sortField && sortOrder && sortField !== 'onSale') {
      // Se sortField contiene un punto potremmo gestire associazioni (nota: qui, tipicamente non si ha associazione)
      if (sortField.includes('.')) {
        const [associationAlias, associatedField] = sortField.split('.');
        // Per semplicità, assumiamo solo ordinamento su User (inserter/updater) se necessario
        let modelAlias = null;
        if (associationAlias === 'inserter' || associationAlias === 'updater') {
          modelAlias = User;
        }
        if (modelAlias) {
          orderOption.push([{ model: modelAlias, as: associationAlias }, associatedField, sortOrder.toUpperCase()]);
        } else {
          orderOption.push([sortField, sortOrder.toUpperCase()]);
        }
      } else {
        orderOption.push([sortField, sortOrder.toUpperCase()]);
      }
    }

    // Opzioni della query
    const queryOptions = {
      where: searchConditions,
      order: orderOption,
      include: [
        { model: User, as: 'inserter', attributes: ['name'] },
        { model: User, as: 'updater', attributes: ['name'] }
      ],
      distinct: true
    };
    if (limitValue) {
      queryOptions.limit = limitValue;
      queryOptions.offset = offset;
    }

    const { count, rows: backpacks } = await Backpack.findAndCountAll(queryOptions);
    const totalPages = limitValue ? Math.ceil(count / limitValue) : 1;

    req.session.searchParams = { page, limit, searchName, sortField, sortOrder };

    res.render('backpackView', {
      backpacks,
      count,
      totalPages,
      currentPage: parseInt(page, 10),
      limit,
      searchName,
      sortField,
      sortOrder,
      currentUserName,
      currentUserPriority,
      messages,
      isPrivileged: req.user.isPrivileged || false
    });
  } catch (error) {
    console.error('Errore durante il recupero degli zaini:', error);
    res.status(500).send('Si è verificato un errore durante il recupero degli zaini.');
  }
}

async function createBackpack(req, res) {
  const messages = new MessageHandler();
  try {
    await Backpack.create({
      ...req.body,
      onSale: req.body.onSale === 'on',
      insertedBy: req.user.id
    });
    messages.addSuccess('Zaino creato con successo');
    req.session.messages = messages.getMessages();

    if (req.session.searchParams) {
      return res.redirect(buildRedirectUrl(req.session.searchParams));
    } else {
      return res.redirect('/zaini');
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
    return res.redirect('/zaini');
  }
}

async function updateBackpack(req, res) {
  const messages = new MessageHandler();
  try {
    const backpack = await Backpack.findByPk(req.params.id);
    if (!backpack) {
      return res.status(404).send('Zaino non trovato');
    }

    await backpack.update({
      ...req.body,
      onSale: req.body.onSale === 'on',
      updatedBy: req.user.id,
      updatedAt: new Date()
    });
    messages.addSuccess('Zaino aggiornato con successo');
    req.session.messages = messages.getMessages();

    if (req.session.searchParams) {
      return res.redirect(buildRedirectUrl(req.session.searchParams));
    }
    return res.redirect('/zaini');
  } 
  catch (error) {
    const errorMsg = error.message.replace(/^Validation error:\s*/, '');
    console.error("Errore durante l'aggiornamento dello zaino:", errorMsg);
    messages.addError(`Errore durante l'aggiornamento dello zaino:\n ${errorMsg}`);
    messages.setModal('editModal' + req.params.id);
    req.session.messages = messages.getMessages();

    // Recupero i parametri di ricerca dalla sessione e ricostruisco la query per il render
    const {
      page = 1,
      limit = 10,
      searchName = '',
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

    // Costruisco le condizioni di ricerca
    const searchConditions = {
      name: { [Op.like]: `%${searchName}%` }
    };

    let orderOption = [];
    orderOption.push(['onSale', 'DESC']);
    if (sortField && sortOrder && sortField !== 'onSale') {
      if (sortField.includes('.')) {
        const [associationAlias, associatedField] = sortField.split('.');
        let modelAlias = null;
        if (associationAlias === 'inserter' || associationAlias === 'updater') {
          modelAlias = User;
        }
        if (modelAlias) {
          orderOption.push([{ model: modelAlias, as: associationAlias }, associatedField, sortOrder.toUpperCase()]);
        } else {
          orderOption.push([sortField, sortOrder.toUpperCase()]);
        }
      } else {
        orderOption.push([sortField, sortOrder.toUpperCase()]);
      }
    }

    // Opzioni della query per filtrare e paginare
    const queryOptions = {
      where: searchConditions,
      order: orderOption,
      include: [
        { model: User, as: 'inserter', attributes: ['name'] },
        { model: User, as: 'updater', attributes: ['name'] }
      ],
      distinct: true
    };
    if (limitValue) {
      queryOptions.limit = limitValue;
      queryOptions.offset = offset;
    }

    const { count, rows: backpacks } = await Backpack.findAndCountAll(queryOptions);
    const totalPages = limitValue ? Math.ceil(count / limitValue) : 1;

    // Recupero l'utente corrente e le categorie aggiornate per la view
    const currentUser = await User.findByPk(req.user.id, {
      include: { model: Role, as: 'role', attributes: ['name', 'priority'] },
    });
    return res.render('backpackView', {
      backpacks,
      count,
      totalPages,
      currentPage,
      limit,
      searchName,
      sortField,
      sortOrder,
      currentUserName: currentUser.name,
      currentUserPriority: currentUser.role.priority,
      messages: req.session.messages,
      isPrivileged: req.user.isPrivileged || false
    });
  }
}

async function deleteBackpack(req, res) {
  const messages = new MessageHandler();
  try {
    const backpack = await Backpack.findByPk(req.params.id);
    if (!backpack) {
      return res.status(404).send('Zaino non trovato');
    }

    await backpack.destroy();
    messages.addSuccess('Zaino eliminato con successo');
    req.session.messages = messages.getMessages();

    if (req.session.searchParams) {
      return res.redirect(buildRedirectUrl(req.session.searchParams));
    }
    return res.redirect('/zaini');
  } catch (error) {
    const errorMsg = error.message.replace(/^Validation error:\s*/, '');
    console.error("Errore durante l'eliminazione dello zaino:", errorMsg);
    messages.addError(`Errore durante l'eliminazione dello zaino:\n ${errorMsg}`);
    messages.setModal('deleteModal' + req.params.id);
    req.session.messages = messages.getMessages();

    // Recupero i parametri di ricerca dalla sessione per il render
    const {
      page = 1,
      limit = 10,
      searchName = '',
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

    const searchConditions = {
      name: { [Op.like]: `%${searchName}%` }
    };

    let orderOption = [];
    orderOption.push(['onSale', 'DESC']);
    if (sortField && sortOrder && sortField !== 'onSale') {
      if (sortField.includes('.')) {
        const [associationAlias, associatedField] = sortField.split('.');
        let modelAlias = null;
        if (associationAlias === 'inserter' || associationAlias === 'updater') {
          modelAlias = User;
        }
        if (modelAlias) {
          orderOption.push([{ model: modelAlias, as: associationAlias }, associatedField, sortOrder.toUpperCase()]);
        } else {
          orderOption.push([sortField, sortOrder.toUpperCase()]);
        }
      } else {
        orderOption.push([sortField, sortOrder.toUpperCase()]);
      }
    }

    const queryOptions = {
      where: searchConditions,
      order: orderOption,
      include: [
        { model: User, as: 'inserter', attributes: ['name'] },
        { model: User, as: 'updater', attributes: ['name'] }
      ],
      distinct: true
    };
    if (limitValue) {
      queryOptions.limit = limitValue;
      queryOptions.offset = offset;
    }

    const { count, rows: backpacks } = await Backpack.findAndCountAll(queryOptions);
    const totalPages = limitValue ? Math.ceil(count / limitValue) : 1;

    const currentUser = await User.findByPk(req.user.id, {
      include: { model: Role, as: 'role', attributes: ['name', 'priority'] },
    });
    return res.render('backpackView', {
      backpacks,
      count,
      totalPages,
      currentPage,
      limit,
      searchName,
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
  getBackpackById,
  getAllBackpacks,
  createBackpack,
  updateBackpack,
  deleteBackpack
};
