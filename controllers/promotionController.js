// Controller per la gestione delle promozioni

const { Promotion, User, Role } = require('../models');
const { Op } = require('sequelize');
const MessageHandler = require('../utils/messageHandler');

// Funzione di utilità per costruire l'URL di redirect per promozioni
function buildRedirectUrl(searchParams) {
  const { page, limit, searchName, sortField, sortOrder } = searchParams;
  return `/promozioni?page=${page}&limit=${encodeURIComponent(limit)}&searchName=${encodeURIComponent(searchName)}&sortField=${encodeURIComponent(sortField)}&sortOrder=${encodeURIComponent(sortOrder)}`;
}

async function getPromotionById(req, res) {
  try {
    const promotion = await Promotion.findByPk(req.params.id);
    if (!promotion) {
      return res.status(404).json({ error: 'Promozione non trovata' });
    }
    return res.json({
      id: promotion.id,
      name: promotion.name,
      price: promotion.selling_price,
      type: 'promotion'
    });
  } catch (error) {
    console.error("Errore nel recupero della promozione:", error);
    return res.status(500).json({ error: 'Errore interno del server' });
  }
}

async function getAllPromotions(req, res) {
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
        { model: User, as: 'updater', attributes: ['name'] }
      ],
      distinct: true
    };
    if (limitValue) {
      queryOptions.limit = limitValue;
      queryOptions.offset = offset;
    }

    const { count, rows: promotions } = await Promotion.findAndCountAll(queryOptions);
    const totalPages = limitValue ? Math.ceil(count / limitValue) : 1;

    // Salvo i parametri di ricerca in sessione
    req.session.searchParams = { page, limit, searchName, sortField, sortOrder };

    res.render('promotionView', {
      promotions,
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
    console.error('Errore durante il recupero delle promozioni:', error);
    res.status(500).send('Si è verificato un errore durante il recupero delle promozioni.');
  }
}

async function createPromotion(req, res) {
  const messages = new MessageHandler();
  try {
    await Promotion.create({
      ...req.body,
      onSale: req.body.onSale === 'on',
      insertedBy: req.user.id
    });
    messages.addSuccess('Promozione creata con successo');
    req.session.messages = messages.getMessages();

    if (req.session.searchParams) {
      return res.redirect(buildRedirectUrl(req.session.searchParams));
    } else {
      return res.redirect('/promozioni');
    }
  } catch (error) {
    const errorMsg = error.message.replace(/^Validation error:\s*/, '');
    console.error("Errore durante la creazione della promozione:", errorMsg);
    messages.addError(`Errore durante la creazione della promozione:\n ${errorMsg}`);
    messages.setModal('addModal');
    req.session.messages = messages.getMessages();
    if (req.session.searchParams) {
      return res.redirect(buildRedirectUrl(req.session.searchParams));
    }
    return res.redirect('/promozioni');
  }
}

async function updatePromotion(req, res) {
  const messages = new MessageHandler();
  try {
    const promotion = await Promotion.findByPk(req.params.id);
    if (!promotion) {
      return res.status(404).send('Promozione non trovata');
    }

    await promotion.update({
      ...req.body,
      onSale: req.body.onSale === 'on',
      updatedBy: req.user.id,
      updatedAt: new Date()
    });
    messages.addSuccess('Promozione aggiornata con successo');
    req.session.messages = messages.getMessages();

    if (req.session.searchParams) {
      return res.redirect(buildRedirectUrl(req.session.searchParams));
    }
    return res.redirect('/promozioni');
  } catch (error) {
    const errorMsg = error.message.replace(/^Validation error:\s*/, '');
    console.error("Errore durante l'aggiornamento della promozione:", errorMsg);
    messages.addError(`Errore durante l'aggiornamento della promozione:\n ${errorMsg}`);
    messages.setModal('editModal' + req.params.id);
    req.session.messages = messages.getMessages();

    if (req.session.searchParams) {
      return res.redirect(buildRedirectUrl(req.session.searchParams));
    }
    return res.redirect('/promozioni');
  }
}

async function deletePromotion(req, res) {
  const messages = new MessageHandler();
  try {
    const promotion = await Promotion.findByPk(req.params.id);
    if (!promotion) {
      return res.status(404).send('Promozione non trovata');
    }

    await promotion.destroy();
    messages.addSuccess('Promozione eliminata con successo');
    req.session.messages = messages.getMessages();

    if (req.session.searchParams) {
      return res.redirect(buildRedirectUrl(req.session.searchParams));
    }
    return res.redirect('/promozioni');
  } catch (error) {
    const errorMsg = error.message.replace(/^Validation error:\s*/, '');
    console.error("Errore durante l'eliminazione della promozione:", errorMsg);
    messages.addError(`Errore durante l'eliminazione della promozione:\n ${errorMsg}`);
    messages.setModal('deleteModal' + req.params.id);
    req.session.messages = messages.getMessages();

    if (req.session.searchParams) {
      return res.redirect(buildRedirectUrl(req.session.searchParams));
    }
    return res.redirect('/promozioni');
  }
}

module.exports = {
  getPromotionById,
  getAllPromotions,
  createPromotion,
  updatePromotion,
  deletePromotion
};