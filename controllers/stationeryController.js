// Controller per la gestione della cancelleria

const { Stationery, User, Role } = require('../models');
const { Op } = require('sequelize');
const MessageHandler = require('../utils/messageHandler');

// Funzione di utilità per costruire l'URL di redirect
function buildRedirectUrl(searchParams) {
  const { page, limit, searchName, sortField, sortOrder } = searchParams;
  return `/cancelleria?page=${page}&limit=${encodeURIComponent(limit)}&searchName=${encodeURIComponent(searchName)}&sortField=${encodeURIComponent(sortField)}&sortOrder=${encodeURIComponent(sortOrder)}`;
}

async function getStationeryById(req, res) {
  try {
    const stationery = await Stationery.findByPk(req.params.id);
    if (!stationery) {
      return res.status(404).json({ error: 'Elemento di cancelleria non trovato' });
    }
    return res.json({
      id: stationery.id,
      name: stationery.name,
      price: stationery.selling_price,
      type: 'stationery'
    });
  } catch (error) {
    console.error('Errore nel recupero della cancelleria:', error);
    return res.status(500).json({ error: 'Errore interno del server' });
  }
}

async function getAllStationery(req, res) {
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

    const { count, rows: stationeries } = await Stationery.findAndCountAll(queryOptions);
    const totalPages = limitValue ? Math.ceil(count / limitValue) : 1;

    req.session.searchParams = { page, limit, searchName, sortField, sortOrder };

    res.render('stationeryView', {
      stationeries,
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
    console.error('Errore durante il recupero della cancelleria:', error);
    res.status(500).send('Si è verificato un errore durante il recupero della cancelleria.');
  }
}

async function createStationery(req, res) {
  const messages = new MessageHandler();
  try {
    await Stationery.create({
      ...req.body,
      onSale: req.body.onSale === 'on',
      insertedBy: req.user.id
    });
    messages.addSuccess('Elemento di cancelleria creato con successo');
    req.session.messages = messages.getMessages();

    if (req.session.searchParams) {
      return res.redirect(buildRedirectUrl(req.session.searchParams));
    } else {
      return res.redirect('/cancelleria');
    }
  } catch (error) {
    const errorMsg = error.message.replace(/^Validation error:\s*/, '');
    console.error("Errore durante la creazione della cancelleria:", errorMsg);
    messages.addError(`Errore durante la creazione della cancelleria:\n ${errorMsg}`);
    messages.setModal('addModal');
    req.session.messages = messages.getMessages();
    if (req.session.searchParams) {
      return res.redirect(buildRedirectUrl(req.session.searchParams));
    }
    return res.redirect('/cancelleria');
  }
}

async function updateStationery(req, res) {
  const messages = new MessageHandler();
  try {
    const stationery = await Stationery.findByPk(req.params.id);
    if (!stationery) {
      return res.status(404).send('Elemento di cancelleria non trovato');
    }

    await stationery.update({
      ...req.body,
      onSale: req.body.onSale === 'on',
      updatedBy: req.user.id,
      updatedAt: new Date()
    });
    messages.addSuccess('Elemento di cancelleria aggiornato con successo');
    req.session.messages = messages.getMessages();

    if (req.session.searchParams) {
      return res.redirect(buildRedirectUrl(req.session.searchParams));
    }
    return res.redirect('/cancelleria');
  } catch (error) {
    const errorMsg = error.message.replace(/^Validation error:\s*/, '');
    console.error("Errore durante l'aggiornamento della cancelleria:", errorMsg);
    messages.addError(`Errore durante l'aggiornamento della cancelleria:\n ${errorMsg}`);
    messages.setModal('editModal' + req.params.id);
    req.session.messages = messages.getMessages();

    const {
      page = 1,
      limit = 10,
      searchName = '',
      sortField = 'name',
      sortOrder = 'ASC'
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

    const { count, rows: stationeries } = await Stationery.findAndCountAll(queryOptions);
    const totalPages = limitValue ? Math.ceil(count / limitValue) : 1;

    const currentUser = await User.findByPk(req.user.id, {
      include: { model: Role, as: 'role', attributes: ['name', 'priority'] }
    });

    return res.render('stationeryView', {
      stationeries,
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

async function deleteStationery(req, res) {
    const messages = new MessageHandler();
    try {
      const stationery = await Stationery.findByPk(req.params.id);
      if (!stationery) {
        return res.status(404).send('Elemento di cancelleria non trovato');
      }
  
      await stationery.destroy();
      messages.addSuccess('Elemento di cancelleria eliminato con successo');
      req.session.messages = messages.getMessages();
  
      if (req.session.searchParams) {
        return res.redirect(buildRedirectUrl(req.session.searchParams));
      }
      return res.redirect('/cancelleria');
    } catch (error) {
      const errorMsg = error.message.replace(/^Validation error:\s*/, '');
      console.error("Errore durante l'eliminazione della cancelleria:", errorMsg);
      messages.addError(`Errore durante l'eliminazione della cancelleria:\n ${errorMsg}`);
      messages.setModal('deleteModal' + req.params.id);
      req.session.messages = messages.getMessages();
  
      const {
        page = 1,
        limit = 10,
        searchName = '',
        sortField = 'name',
        sortOrder = 'ASC'
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
  
      const { count, rows: stationeries } = await Stationery.findAndCountAll(queryOptions);
      const totalPages = limitValue ? Math.ceil(count / limitValue) : 1;
  
      const currentUser = await User.findByPk(req.user.id, {
        include: { model: Role, as: 'role', attributes: ['name', 'priority'] }
      });
  
      return res.render('stationeryView', {
        stationeries,
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
  getStationeryById,
  getAllStationery,
  createStationery,
  updateStationery,
  deleteStationery
};