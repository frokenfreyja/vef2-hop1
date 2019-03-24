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

module.exports = {
  listOfUsers,
  findUserById,
  findByUsername,
  findByEmail,
  getSingleUser,
  comparePasswords,
  updateToAdmin,
};
