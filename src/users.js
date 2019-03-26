const bcrypt = require('bcrypt');
const xss = require('xss');
const emailValidator = require('email-validator');
// const util = require('util');
// const fs = require('fs');

const { query } = require('./db');

// const readFileAsync = util.promisify(fs.readFile);

/* Lesum inn commonpw.txt skránna
async function readList() {
  const data = await readFileAsync('./commonpw.txt').toString('utf-8');
  return data;
} /*

/**
 * Nær í lista af notendum með userid, username, email og admin
 */
async function listOfUsers() {
  const q = 'SELECT userid, username, email, admin FROM users';
  const result = await query(q);

  return result.rows;
}


/**
 * Nær í stakann notanda með ákveðið id
 *
 * @param {Number} id Auðkenni á user
 * @returns {object} User eða null ef ekkert fannst
 */
async function getSingleUser(id) {
  const q = 'SELECT userid, username, email, admin FROM users WHERE userid = $1';

  let result = null;

  try {
    result = await query(q, [id]);
  } catch (e) {
    console.warn('Error fetching user', e);
  }

  if (!result || result.rows.length === 0) {
    return null;
  }

  return result.rows[0];
}


async function findUserById(id) {
  const q = 'SELECT * FROM users WHERE userid = $1';

  const result = await query(q, [id]);

  if (result.rowCount === 1) {
    return result.rows[0];
  }

  return null;
}


async function findByUsername(username) {
  const q = 'SELECT * FROM users WHERE username=$1';
  const result = await query(q, [username]);

  if (result.rowCount === 1) {
    return result.rows[0];
  }
  return null;
}

async function findByEmail(email) {
  const q = 'SELECT * FROM users WHERE email=$1';
  const result = await query(q, [email]);

  if (result.rowCount === 1) {
    return result.rows[0];
  }
  return null;
}

async function comparePasswords(password, hash) {
  const result = await bcrypt.compare(password, hash);

  return result;
}

/**
 * Athugar hvort að inntak sé tómt(null eða false)
 *
 * @param {*} s Sá parameter sem á að athuga
 */
function isEmpty(s) {
  return s == null && !s;
}


async function updateToAdmin(id, item) {
  const q = 'SELECT * FROM users WHERE userid=$1';
  const found = await query(q, [id]);

  // Ef það er enginn user með þetta id til
  if (found.rows.length === 0) {
    return {
      success: false,
      notFound: true,
    };
  }

  if (!isEmpty(item.admin)) {
    if (typeof item.admin !== 'boolean') {
      return {
        success: false,
        notFound: false,
      };
    }
  }

  const p = `
    UPDATE users
    SET admin = $2
    WHERE userid = $1
    RETURNING userid, username, email, admin`;

  const updateResult = await query(p, [id, item.admin]);

  return {
    success: true,
    notFound: false,
    item: updateResult.rows[0],
  };
}

/**
 * Staðfestir að upplýsingar um notenda séu gildar
 * @param {String} username Notendanafn
 * @param {String} email Netfang
 * @param {String} password Lykilorð
 */
async function validate(username, password, email) {
  const errors = [];

  // Ef það er username - athuga hvort það er strengur að lengd 0-128
  if (!isEmpty(username)) {
    if (typeof username !== 'string' || username.length === 0 || username.length > 128) {
      errors.push({
        field: 'username',
        message: 'Username must be a string of length 1 to 128',
      });
    }

    // Svo athuga hvort að username sé til - ef til skila error
    const userExistByUsername = await findByUsername(username);

    if (userExistByUsername) {
      errors.push({
        field: 'username',
        message: 'Username is already registered',
      });
    }
  }

  if (!isEmpty(email)) {
    if (email.length === 0 || email.length > 128) {
      errors.push({
        field: 'email',
        message: 'Email must be a string of length 1 to 128',
      });
    }

    if (!emailValidator.validate(email)) {
      errors.push({
        field: 'email',
        message: 'Email must be an email',
      });
    }

    // Svo athuga hvort að email sé til - ef til skila error
    const userExistByEmail = await findByEmail(email);

    if (userExistByEmail) {
      errors.push({
        field: 'email',
        message: 'Email is already registered',
      });
    }
  }

  // TODO - Vantar að athuga hvort að password sé eitt af common pw
  if (!isEmpty(password)) {
    if (typeof password !== 'string' || password.length < 8 || password.length > 128) {
      errors.push({
        field: 'password',
        message: 'Password has to be a string of length 8 to 128',
      });
    }
  }

  return errors;
}


/**
 * Býr til nýjan notanda og setur í gagnagrunn ef að upplýsingar um hann eru gildar
 * @param {String} username Notendanafn
 * @param {String} password Lykilorð
 * @param {String} email Netfang
 */
async function registerAsUser(username, password, email) {
  const validation = await validate(username, password, email);

  if (validation.length > 0) {
    return {
      success: false,
      notFound: false,
      validation,
    };
  }

  // Ef allt í lagi þá bcrypt-a password og setja notanda í gagnagrunn - skila username og email
  const hashedPassword = await bcrypt.hash(password, 11);

  const newUser = [
    xss(username),
    hashedPassword,
    xss(email),
  ];

  const p = `
  INSERT INTO users
  (username, password, email)
  VALUES
  ($1, $2, $3)
  RETURNING userid, email`;

  const createUser = await query(p, newUser);

  return {
    success: true,
    item: createUser.rows[0],
  };
}

module.exports = {
  listOfUsers,
  findUserById,
  findByUsername,
  findByEmail,
  getSingleUser,
  comparePasswords,
  updateToAdmin,
  registerAsUser,
};
