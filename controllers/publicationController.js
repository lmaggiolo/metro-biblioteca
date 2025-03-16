// Controller per la gestione delle pubblicazioni

const { Publication, User, Role } = require('../models');
const { Op } = require('sequelize');
const MessageHandler = require('../utils/messageHandler');

// Funzione di utilità per costruire l'URL di redirect per pubblicazioni
function buildRedirectUrl(searchParams) {
  const { page, limit, searchName, sortField, sortOrder } = searchParams;
  return `/pubblicazioni?page=${page}&limit=${encodeURIComponent(limit)}&searchName=${encodeURIComponent(searchName)}&sortField=${encodeURIComponent(sortField)}&sortOrder=${encodeURIComponent(sortOrder)}`;
}

async function getPublicationById(req, res) {
  try {
    const publication = await Publication.findByPk(req.params.id);
    if (!publication) {
      return res.status(404).json({ error: 'Pubblicazione non trovata' });
    }
    return res.json({
      id: publication.id,
      name: publication.name,
      price: publication.selling_price,
      type: 'publication'
    });
  } catch (error) {
    console.error("Errore nel recupero della pubblicazione:", error);
    return res.status(500).json({ error: 'Errore interno del server' });
  }
}

async function getAllPublications(req, res) {
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

    const { count, rows: publications } = await Publication.findAndCountAll(queryOptions);
    const totalPages = limitValue ? Math.ceil(count / limitValue) : 1;

    // Salvo i parametri di ricerca in sessione
    req.session.searchParams = { page, limit, searchName, sortField, sortOrder };

    res.render('publicationView', {
      publications,
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
    console.error('Errore durante il recupero delle pubblicazioni:', error);
    res.status(500).send('Si è verificato un errore durante il recupero delle pubblicazioni.');
  }
}

async function createPublication(req, res) {
  const messages = new MessageHandler();
  try {
    await Publication.create({
      ...req.body,
      onSale: req.body.onSale === 'on',
      insertedBy: req.user.id
    });
    messages.addSuccess('Pubblicazione creata con successo');
    req.session.messages = messages.getMessages();

    if (req.session.searchParams) {
      return res.redirect(buildRedirectUrl(req.session.searchParams));
    } else {
      return res.redirect('/pubblicazioni');
    }
  } catch (error) {
    const errorMsg = error.message.replace(/^Validation error:\s*/, '');
    console.error("Errore durante la creazione della pubblicazione:", errorMsg);
    messages.addError(`Errore durante la creazione della pubblicazione:\n ${errorMsg}`);
    messages.setModal('addModal');
    req.session.messages = messages.getMessages();
    if (req.session.searchParams) {
      return res.redirect(buildRedirectUrl(req.session.searchParams));
    }
    return res.redirect('/pubblicazioni');
  }
}

async function updatePublication(req, res) {
  const messages = new MessageHandler();
  try {
    const publication = await Publication.findByPk(req.params.id);
    if (!publication) {
      return res.status(404).send('Pubblicazione non trovata');
    }

    await publication.update({
      ...req.body,
      onSale: req.body.onSale === 'on',
      updatedBy: req.user.id,
      updatedAt: new Date()
    });
    messages.addSuccess('Pubblicazione aggiornata con successo');
    req.session.messages = messages.getMessages();

    if (req.session.searchParams) {
      return res.redirect(buildRedirectUrl(req.session.searchParams));
    }
    return res.redirect('/pubblicazioni');
  } catch (error) {
    const errorMsg = error.message.replace(/^Validation error:\s*/, '');
    console.error("Errore durante l'aggiornamento della pubblicazione:", errorMsg);
    messages.addError(`Errore durante l'aggiornamento della pubblicazione:\n ${errorMsg}`);
    messages.setModal('editModal' + req.params.id);
    req.session.messages = messages.getMessages();

    if (req.session.searchParams) {
      return res.redirect(buildRedirectUrl(req.session.searchParams));
    }
    return res.redirect('/pubblicazioni');
  }
}

async function deletePublication(req, res) {
  const messages = new MessageHandler();
  try {
    const publication = await Publication.findByPk(req.params.id);
    if (!publication) {
      return res.status(404).send('Pubblicazione non trovata');
    }

    await publication.destroy();
    messages.addSuccess('Pubblicazione eliminata con successo');
    req.session.messages = messages.getMessages();

    if (req.session.searchParams) {
      return res.redirect(buildRedirectUrl(req.session.searchParams));
    }
    return res.redirect('/pubblicazioni');
  } catch (error) {
    const errorMsg = error.message.replace(/^Validation error:\s*/, '');
    console.error("Errore durante l'eliminazione della pubblicazione:", errorMsg);
    messages.addError(`Errore durante l'eliminazione della pubblicazione:\n ${errorMsg}`);
    messages.setModal('deleteModal' + req.params.id);
    req.session.messages = messages.getMessages();

    if (req.session.searchParams) {
      return res.redirect(buildRedirectUrl(req.session.searchParams));
    }
    return res.redirect('/pubblicazioni');
  }
}

module.exports = {
  getPublicationById,
  getAllPublications,
  createPublication,
  updatePublication,
  deletePublication
};
