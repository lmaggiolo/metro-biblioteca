const passport = require('passport');
const LocalStrategy = require('passport-local').Strategy;
const { encrypt, decrypt } = require('../utils/encryption');
const { User, Role } = require('../models');

passport.use(new LocalStrategy(
  {
    usernameField: 'name',
    passwordField: 'password',
    badRequestMessage: 'Per favore inserisci sia il Nickname che la Password.' // Custom error message
  },
  async (name, password, done) => {
    try {
      const user = await User.findOne({ where: { name } });
      if (!user) return done(null, false, { message: 'Nickname non trovato.' });

      const decryptedPassword = decrypt(user.password);
      if (password !== decryptedPassword) return done(null, false, { message: 'Password errata.' });

      // Update last access time
      user.lastAccess = new Date();
      await user.save();

      return done(null, user);
    } catch (err) {
      return done(err);
    }
  }
));

passport.serializeUser((user, done) => {
  done(null, user.id);
});

passport.deserializeUser(async (id, done) => {
  try {
    const user = await User.findByPk(id, {
      include: {
        model: Role,
        as: 'role',
        attributes: ['name', 'priority'],
      },
    });
    done(null, user);
  } catch (err) {
    done(err);
  }
});

module.exports = passport;