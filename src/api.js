const express = require('express');

const { catchErrors, requireAuthenticationAsAdmin } = require('../utils');
const { listOfUsers, getSingleUser, updateToAdmin } = require('./users');

const router = express.Router();

/**
 * Skilar lista af mögulegum aðgerðum
 *
 * @param {Object} req
 * @param {Object} res
 */
function listOfUrls(req, res) {
  res.json({
    login: '/users/login',
    register: '/users/register',
    users: '/users/',
    user: '/users/:id',
    me: '/users/me',
    products: '/products',
    productcategory: '/products?category={category}',
    searchproduct: '/products?search={query}',
    product: '/products/:id',
    categories: '/categories',
    category: '/categories/:id',
    cart: '/cart',
    cartline: '/cart/line/:id',
    orders: '/orders',
    order: '/orders/:id',
  });
}

/**
 * Skilar lista af notendum
 *
 * @param {Object} req
 * @param {Object} res
 */
async function getUsers(req, res) {
  const result = await listOfUsers();

  return res.json(result);
}

async function getUser(req, res) {
  const { id } = req.params;

  if (!Number.isInteger(Number(id))) {
    return res.status(404).json({ error: 'User not found' });
  }

  const user = await getSingleUser(id);

  if (user) {
    return res.json(user);
  }

  return res.status(404).json({ error: 'User not found' });
}

async function makeUserAdmin(req, res) {
  const { id } = req.params;
  const { admin } = req.body;

  const result = await updateToAdmin(id, { admin });

  if (!result.success && result.notFound) {
    return res.status(404).json({ error: 'User not found' });
  }

  if (!result.success && !result.notFound) {
    return res.status(400).json({ error: 'Admin has to be of type boolean' });
  }

  return res.status(200).json(result.item);
}


router.get('/', listOfUrls);
router.get('/users/', requireAuthenticationAsAdmin, catchErrors(getUsers));
router.get('/users/:id', requireAuthenticationAsAdmin, catchErrors(getUser));
router.patch('/users/:id', requireAuthenticationAsAdmin, catchErrors(makeUserAdmin));

module.exports = router;
