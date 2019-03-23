const bcrypt = require('bcrypt');

const { query } = require('./db');

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


module.exports = {
  listOfUsers,
  findUserById,
  findByUsername,
  findByEmail,
  getSingleUser,
  comparePasswords,
};
