const { crypto, encrypt, decrypt } = require('../utils/encryption');
const { User, Role } = require('../models');
const { Op } = require('sequelize');
const MessageHandler = require('../utils/messageHandler');
const { isPrivileged } = require('../middleware/auth');

// Helper function per costruire l'URL di redirect per utenti
function buildRedirectUrl(searchParams) {
  const { page, limit, searchName, searchRole, sortField, sortOrder, modal } = searchParams;
  let url = `/utenti?page=${page}&limit=${encodeURIComponent(limit)}&searchName=${encodeURIComponent(searchName)}&searchRole=${encodeURIComponent(searchRole)}&sortField=${encodeURIComponent(sortField)}&sortOrder=${encodeURIComponent(sortOrder)}`;
  if (modal) {
    url += `&modal=${encodeURIComponent(modal)}`;
  }
  return url;
}

async function showUsers(req, res) {
  let messages;
  if (req.session.messages) {
    if (req.session.messages.error && req.session.messages.error.length > 0) {
      // Se ci sono errori, li lasciamo per la view (non li resettiamo subito)
      messages = req.session.messages;
    } else {
      messages = req.session.messages;
      req.session.messages = null;
    }
  } else {
    messages = new MessageHandler().getMessages();
  }

  try {
    const currentUserId = req.user.id;
    const currentUser = await User.findByPk(currentUserId, {
      include: {
        model: Role,
        as: 'role',
        attributes: ['name', 'priority']
      }
    });

    let { limit = 10, page = 1, sortField = '', sortOrder = '', searchName = '', searchRole = '' } = req.query;
    const limitValue = limit === 'all' ? null : parseInt(limit, 10);
    const offset = limitValue ? (page - 1) * limitValue : null;

    const searchConditions = {};
    if (searchName) {
      searchConditions.name = { [Op.like]: `%${searchName}%` };
    }
    if (searchRole) {
      searchConditions.roleId = searchRole;
    }

    let orderOption = [];
    if (sortField && sortOrder) {
      if (sortField.includes('.')) {
        const [associationAlias, associatedField] = sortField.split('.');
        if (associationAlias === 'role') {
          orderOption.push([{ model: Role, as: 'role' }, associatedField, sortOrder.toUpperCase()]);
        } else if (associationAlias === 'inserter') {
          orderOption.push([{ model: User, as: 'inserter' }, associatedField, sortOrder.toUpperCase()]);
        } else if (associationAlias === 'updater') {
          orderOption.push([{ model: User, as: 'updater' }, associatedField, sortOrder.toUpperCase()]);
        } else {
          orderOption.push([sortField, sortOrder.toUpperCase()]);
        }
      } else {
        orderOption.push([sortField, sortOrder.toUpperCase()]);
      }
    }
    if (orderOption.length === 0) {
      orderOption.push([{ model: Role, as: 'role' }, 'priority', 'ASC']);
      orderOption.push(['name', 'ASC']);
    }

    const { count, rows: users } = await User.findAndCountAll({
      where: searchConditions,
      include: [
        { model: Role, as: 'role', attributes: ['name', 'priority'] },
        { model: User, as: 'inserter', attributes: ['name'] },
        { model: User, as: 'updater', attributes: ['name'] }
      ],
      order: orderOption,
      limit: limitValue,
      offset,
      distinct: true
    });

    const totalPages = limitValue ? Math.ceil(count / limitValue) : 1;
    const roles = await Role.findAll({ order: [['priority', 'ASC']] });
    // Salvo i parametri di ricerca (eventuale modal passa via query)
    req.session.searchParams = { page, limit, searchName, searchRole, sortField, sortOrder, modal: req.query.modal || '' };

    res.render('userView', {
      users,
      roles,
      count,
      totalPages,
      currentPage: parseInt(page, 10),
      limit,
      searchName,
      searchRole,
      sortField,
      sortOrder,
      currentUserRole: currentUser.role.name,
      currentUserPriority: currentUser.role.priority,
      currentUserId,
      messages
    });
  } catch (error) {
    console.error('Error showing users:', error);
    res.status(500).send('Internal Server Error');
  }
}

async function createUser(req, res) {
  const messages = new MessageHandler();
  req.session.messages = null;

  const { name, roleId, telegram_account } = req.body;
  const randomPassword = crypto.randomBytes(4).toString('hex');
  const encryptedPassword = encrypt(randomPassword);
  const formattedTelegramAccount = telegram_account.startsWith('@')
    ? telegram_account.toLowerCase()
    : `@${telegram_account.toLowerCase()}`;
  const currentUserId = req.user.id;

  try {
    const targetRole = await Role.findByPk(roleId);
    const currentUser = await User.findByPk(currentUserId, {
      include: { model: Role, as: 'role', attributes: ['priority'] }
    });
    if (!targetRole) {
      throw new Error('Ruolo non valido.');
    }
    if (targetRole.priority < currentUser.role.priority) {
      throw new Error('Non hai il permesso di creare un utente con questo ruolo.');
    }
    await User.create({
      name,
      password: encryptedPassword,
      roleId,
      telegram_account: formattedTelegramAccount,
      insertedBy: currentUserId
    });
    messages.addSuccess(`Utente creato con successo. Password temporanea: ${randomPassword}`);
    req.session.messages = messages.getMessages();
    return res.redirect(buildRedirectUrl(req.session.searchParams || {
      page: 1,
      limit: 10,
      searchName: '',
      searchRole: '',
      sortField: 'name',
      sortOrder: 'ASC'
    }));
  } catch (error) {
    console.error("Errore durante la creazione dell'utente:", error.message);
    messages.addError(`Errore durante la creazione dell'utente:\n ${error.message}`);
    messages.setModal('addModal');
    req.session.messages = messages.getMessages();
    // In caso di errore, re-render della view in modo simile a bookController.js
    const currentUser = await User.findByPk(currentUserId, {
      include: { model: Role, as: 'role', attributes: ['name', 'priority'] }
    });
    const roles = await Role.findAll({ order: [['priority', 'ASC']] });
    const { count, rows: users } = await User.findAndCountAll({
      include: [{ model: Role, as: 'role', attributes: ['name', 'priority'] }],
      distinct: true
    });
    const limitValue = (req.session.searchParams && req.session.searchParams.limit === 'all') ? null : parseInt(req.session.searchParams.limit || 10, 10);
    const totalPages = limitValue ? Math.ceil(count / limitValue) : 1;
    return res.render('userView', {
      users,
      roles,
      count,
      totalPages,
      currentPage: parseInt(req.session.searchParams.page || 1, 10),
      limit: req.session.searchParams.limit || 10,
      searchName: req.session.searchParams.searchName || '',
      searchRole: req.session.searchParams.searchRole || '',
      sortField: req.session.searchParams.sortField || 'name',
      sortOrder: req.session.searchParams.sortOrder || 'ASC',
      currentUserRole: currentUser.role.name,
      currentUserPriority: currentUser.role.priority,
      currentUserId,
      messages: req.session.messages
    });
  }
}

async function updateUser(req, res) {
  const messages = new MessageHandler();
  req.session.messages = null;

  const { id } = req.params;
  const { name, roleId, telegram_account } = req.body;
  const currentUserId = req.user.id;
  const {
    page = 1,
    limit = 10,
    searchName = '',
    searchRole = '',
    sortField = 'name',
    sortOrder = 'ASC'
  } = req.session.searchParams || {};

  try {
    const targetUser = await User.findByPk(id, {
      include: { model: Role, as: 'role', attributes: ['priority'] }
    });
    if (!targetUser) {
      throw new Error('Utente non trovato');
    }
    const currentUser = await User.findByPk(currentUserId, {
      include: { model: Role, as: 'role', attributes: ['priority'] }
    });
    // Controlla la gerarchia se l'utente non è privileged
    if (!isPrivileged(currentUser.role) &&
        targetUser.role.priority <= currentUser.role.priority &&
        targetUser.id !== currentUserId) {
      throw new Error('Non hai il permesso di modificare questo utente.');
    }
    await targetUser.update({
      name,
      roleId,
      telegram_account,
      updatedBy: currentUserId,
      updatedAt: new Date()
    });
    messages.addSuccess('Utente aggiornato con successo');
    req.session.messages = messages.getMessages();
    return res.redirect(buildRedirectUrl(req.session.searchParams || {
      page: 1,
      limit: 10,
      searchName: '',
      searchRole: '',
      sortField: 'name',
      sortOrder: 'ASC'
    }));
  } catch (error) {
    console.error("Errore durante l'aggiornamento dell'utente:", error.message);
    messages.addError(`Errore durante l'aggiornamento dell'utente:\n ${error.message}`);
    messages.setModal(`editModal${id}`);
    req.session.messages = messages.getMessages();

    // Ricarica i dati e re-render della view, in analogia a bookController.js
    const currentUser = await User.findByPk(currentUserId, {
      include: { model: Role, as: 'role', attributes: ['name', 'priority'] }
    });
    const roles = await Role.findAll({ order: [['priority', 'ASC']] });
    const { count, rows: users } = await User.findAndCountAll({
      include: [{ model: Role, as: 'role', attributes: ['name', 'priority'] }],
      distinct: true
    });
    const limitValue = limit === 'all' ? null : parseInt(limit, 10);
    const totalPages = limitValue ? Math.ceil(count / limitValue) : 1;
    return res.render('userView', {
      users,
      roles,
      count,
      totalPages,
      currentPage: parseInt(page, 10),
      limit,
      searchName,
      searchRole,
      sortField,
      sortOrder,
      currentUserRole: currentUser.role.name,
      currentUserPriority: currentUser.role.priority,
      currentUserId,
      messages: req.session.messages
    });
  }
}

async function deleteUser(req, res) {
  const messages = new MessageHandler();
  req.session.messages = null;
  
  const { id } = req.params;
  try {
    const targetUser = await User.findByPk(id, {
      include: { model: Role, as: 'role', attributes: ['priority'] }
    });
    const currentUser = await User.findByPk(req.user.id, {
      include: { model: Role, as: 'role', attributes: ['priority'] }
    });
    if (!targetUser) {
      throw new Error('Utente non trovato');
    }
    if (targetUser.id !== currentUser.id && targetUser.role.priority <= currentUser.role.priority) {
      throw new Error('Non hai il permesso di eliminare questo utente.');
    }
    await targetUser.destroy();
    messages.addSuccess('Utente eliminato con successo');
    req.session.messages = messages.getMessages();

    // Se l'utente che sta per essere eliminato è l'utente corrente, effettua il logout
    if (targetUser.id === currentUser.id) {
      req.logout(function(err) {
        if (err) { return next(err); }
        return res.redirect('/logout');
      });
    } else {
      return res.redirect('/utenti');
    }
  } catch (error) {
    console.error("Errore durante l'eliminazione dell'utente:", error.message);
    messages.addError(`Errore durante l'eliminazione dell'utente:\n ${error.message}`);
    messages.setModal(`deleteModal${id}`);
    req.session.messages = messages.getMessages();
    
    // In caso di errore, re-render della view
    const currentUserId = req.user.id;
    const currentUser = await User.findByPk(currentUserId, {
      include: { model: Role, as: 'role', attributes: ['name', 'priority'] }
    });
    const roles = await Role.findAll({ order: [['priority', 'ASC']] });
    let { limit = 10, page = 1, searchName = '', searchRole = '', sortField = 'name', sortOrder = 'ASC' } = req.session.searchParams || {};
    const { count, rows: users } = await User.findAndCountAll({
      include: [{ model: Role, as: 'role', attributes: ['name', 'priority'] }],
      distinct: true
    });
    const limitValue = limit === 'all' ? null : parseInt(limit, 10);
    const totalPages = limitValue ? Math.ceil(count / limitValue) : 1;
    return res.render('userView', {
      users,
      roles,
      count,
      totalPages,
      currentPage: parseInt(page, 10),
      limit,
      searchName,
      searchRole,
      sortField,
      sortOrder,
      currentUserRole: currentUser.role.name,
      currentUserPriority: currentUser.role.priority,
      currentUserId,
      messages: req.session.messages
    });
  }
}

module.exports = { createUser, showUsers, updateUser, deleteUser };
