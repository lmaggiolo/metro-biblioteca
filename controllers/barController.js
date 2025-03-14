// Controller per la gestione degli item del bar (Bar)

const { BarItem, User, Role } = require('../models');
const { Op } = require('sequelize');
const MessageHandler = require('../utils/messageHandler');

// Funzione di utilità per costruire l'URL di redirect per gli item del bar
function buildRedirectUrl(searchParams) {
  const { page, limit, searchName, sortField, sortOrder } = searchParams;
  return `/bar?page=${page}&limit=${encodeURIComponent(limit)}&searchName=${encodeURIComponent(searchName)}&sortField=${encodeURIComponent(sortField)}&sortOrder=${encodeURIComponent(sortOrder)}`;
}

async function getBarItemById(req, res) {
  try {
    const barItem = await BarItem.findByPk(req.params.id);
    if (!barItem) {
      return res.status(404).json({ error: 'Item non trovato' });
    }
    return res.json({
      id: barItem.id,
      name: barItem.name,
      type_item: barItem.type_item,
      price: barItem.selling_price,
      type: 'barItem'
    });
  } catch (error) {
    console.error("Errore nel recupero dell'item:", error);
    return res.status(500).json({ error: 'Errore interno del server' });
  }
}

async function getAllBarItems(req, res) {
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
    const currentUserId = req.user.id;
    const currentUser = await User.findByPk(currentUserId, {
      include: {
        model: Role,
        as: 'role',
        attributes: ['name', 'priority']
      }
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

    // Ordine: per default uso onSale DESC (se presente) e poi l'ordinamento scelto
    let orderOption = [];
    orderOption.push(['onSale', 'DESC']);
    if (sortField && sortOrder && sortField !== 'onSale') {
      if (sortField.includes('.')) {
        const [associationAlias, associatedField] = sortField.split('.');
        let modelAlias = null;
        // Supporto per ordinamento su inserter o updater
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

    // IMPORTANTE: includo sia inserter che updater se serve ordinare su questi campi
    const queryOptions = {
      where: searchConditions,
      order: orderOption,
      include: [
        { model: User, as: 'inserter', attributes: ['name'] },
        { model: User, as: 'updater', attributes: ['name'] }  // Aggiunto per supportare sortField "updater.name"
      ],
      distinct: true
    };
    if (limitValue) {
      queryOptions.limit = limitValue;
      queryOptions.offset = offset;
    }

    const { count, rows: barItems } = await BarItem.findAndCountAll(queryOptions);
    const totalPages = limitValue ? Math.ceil(count / limitValue) : 1;

    // Salvo i parametri di ricerca in sessione
    req.session.searchParams = { page, limit, searchName, sortField, sortOrder };

    res.render('barView', {
      barItems,
      count,
      totalPages,
      currentPage: parseInt(page, 10),
      limit,
      searchName,
      sortField,
      sortOrder,
      currentUserName,
      currentUserPriority,
      messages
    });
  } catch (error) {
    console.error('Errore durante il recupero degli item del bar:', error);
    res.status(500).send('Si è verificato un errore durante il recupero degli item del bar.');
  }
}

async function createBarItem(req, res) {
  const messages = new MessageHandler();
  try {
    await BarItem.create({
      ...req.body,
      onSale: req.body.onSale === 'on',
      insertedBy: req.user.id
    });
    messages.addSuccess('Item del bar creato con successo');
    req.session.messages = messages.getMessages();

    if (req.session.searchParams) {
      return res.redirect(buildRedirectUrl(req.session.searchParams));
    } else {
      return res.redirect('/bar');
    }
  } catch (error) {
    const errorMsg = error.message.replace(/^Validation error:\s*/, '');
    console.error("Errore durante la creazione dell'item del bar:", errorMsg);
    messages.addError(`Errore durante la creazione dell'item del bar:\n ${errorMsg}`);
    messages.setModal('addModal');
    req.session.messages = messages.getMessages();
    if (req.session.searchParams) {
      return res.redirect(buildRedirectUrl(req.session.searchParams));
    }
    return res.redirect('/bar');
  }
}

async function updateBarItem(req, res) {
  const messages = new MessageHandler();
  try {
    const barItem = await BarItem.findByPk(req.params.id);
    if (!barItem) {
      return res.status(404).send('Item del bar non trovato');
    }

    await barItem.update({
      ...req.body,
      onSale: req.body.onSale === 'on',
      updatedBy: req.user.id,
      updatedAt: new Date()
    });
    messages.addSuccess('Item del bar aggiornato con successo');
    req.session.messages = messages.getMessages();

    if (req.session.searchParams) {
      return res.redirect(buildRedirectUrl(req.session.searchParams));
    }
    return res.redirect('/bar');
  } catch (error) {
    const errorMsg = error.message.replace(/^Validation error:\s*/, '');
    console.error("Errore durante l'aggiornamento dell'item del bar:", errorMsg);
    messages.addError(`Errore durante l'aggiornamento dell'item del bar:\n ${errorMsg}`);
    messages.setModal('editModal' + req.params.id);
    req.session.messages = messages.getMessages();

    // Recupero i parametri di ricerca dalla sessione
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

    const { count, rows: barItems } = await BarItem.findAndCountAll(queryOptions);
    const totalPages = limitValue ? Math.ceil(count / limitValue) : 1;

    const currentUser = await User.findByPk(req.user.id, {
      include: { model: Role, as: 'role', attributes: ['name', 'priority'] }
    });
    return res.render('barView', {
      barItems,
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
    });
  }
}

async function deleteBarItem(req, res) {
  const messages = new MessageHandler();
  try {
    const barItem = await BarItem.findByPk(req.params.id);
    if (!barItem) {
      return res.status(404).send('Item del bar non trovato');
    }

    await barItem.destroy();
    messages.addSuccess('Item del bar eliminato con successo');
    req.session.messages = messages.getMessages();

    if (req.session.searchParams) {
      return res.redirect(buildRedirectUrl(req.session.searchParams));
    }
    return res.redirect('/bar');
  } catch (error) {
    const errorMsg = error.message.replace(/^Validation error:\s*/, '');
    console.error("Errore durante l'eliminazione dell'item del bar:", errorMsg);
    messages.addError(`Errore durante l'eliminazione dell'item del bar:\n ${errorMsg}`);
    messages.setModal('deleteModal' + req.params.id);
    req.session.messages = messages.getMessages();

    // Recupero i parametri di ricerca dalla sessione
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

    const { count, rows: barItems } = await BarItem.findAndCountAll(queryOptions);
    const totalPages = limitValue ? Math.ceil(count / limitValue) : 1;

    const currentUser = await User.findByPk(req.user.id, {
      include: { model: Role, as: 'role', attributes: ['name', 'priority'] }
    });

    return res.render('barView', {
      barItems,
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
    });
  }
}

module.exports = {
  getBarItemById,
  getAllBarItems,
  createBarItem,
  updateBarItem,
  deleteBarItem
};
