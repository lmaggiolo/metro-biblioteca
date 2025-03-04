const { User, Role } = require('../models');

function isPrivileged(role) {
  return role && role.priority === 1;
}

async function ensureAuthenticated(req, res, next) {
  if (req.isAuthenticated()) {
    try {
      await User.update({ lastAccess: new Date() }, { where: { id: req.user.id } });
      return next();
    } catch (error) {
      console.error('Error updating lastAccess:', error);
      return res.redirect('/');
    }
  } else {
    return res.redirect('/');
  }
}

async function ensureManagement(req, res, next) {
  if (!req.user) return res.redirect('/');
  try {
    const currentUser = await User.findByPk(req.user.id, {
      include: {
        model: Role,
        as: 'role',
        attributes: ['id', 'priority']
      },
    });
    if (currentUser && currentUser.role) {
      // Se è Director o Staff (id 1 o 2) lo lasciamo passare
      if (isPrivileged(currentUser.role)) {
        return next();
      }
      if (currentUser.role.priority <= 4) {
        return next(); // Ruoli fino a Gestore
      }
    }
    return res.redirect('/');
  } catch (error) {
    console.error('Error in ensureManagement middleware:', error);
    return res.redirect('/');
  }
}

async function ensureAdmin(req, res, next) {
  if (!req.user) return res.redirect('/');
  try {
    const currentUser = await User.findByPk(req.user.id, {
      include: {
        model: Role,
        as: 'role',
        attributes: ['id', 'priority']
      },
    });
    if (currentUser && currentUser.role) {
      if (isPrivileged(currentUser.role)) {
        return next();
      }
      if (currentUser.role.priority <= 3) {
        return next(); // Ruoli fino a Vice Direttore
      }
    }
    return res.redirect('/home');
  } catch (error) {
    console.error('Error in ensureAdmin middleware:', error);
    return res.redirect('/');
  }
}

async function ensureEmployee(req, res, next) {
  if (!req.user) return res.redirect('/');
  try {
    const currentUser = await User.findByPk(req.user.id, {
      include: {
        model: Role,
        as: 'role',
        attributes: ['id', 'priority']
      },
    });
    if (currentUser && currentUser.role) {
      if (isPrivileged(currentUser.role)) {
        return next();
      }
      if (currentUser.role.priority <= 6) {
        return next(); // Ruoli fino a Dipendente
      }
    }
    return res.redirect('/');
  } catch (error) {
    console.error('Error in ensureEmployee middleware:', error);
    return res.redirect('/');
  }
}

module.exports = {
  isPrivileged,
  ensureAuthenticated,
  ensureManagement,
  ensureAdmin,
  ensureEmployee,
};