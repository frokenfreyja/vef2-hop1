const express = require('express');
// const jwt = require('jsonwebtoken');

const { catchErrors, requireAuthenticationAsAdmin, requireAuthentication } = require('../utils');
const {
  listOfUsers,
  getSingleUser,
  updateToAdmin,
  registerAsUser,
} = require('./users');

const {
  categoriesRoute,
  categoriesPostRoute,
  categoriesPatchRoute,
  categoriesDeleteRoute,
  productsRoute,
  productsPostRoute,
  productRoute,
  productPatchRoute,
  productDeleteRoute,
} = require('./products');

const {
  cartRoute,
  cartPostRoute,
  cartLineRoute,
  cartLinePatchRoute,
  cartLineDeleteRoute,
  ordersRoute,
} = require('./cart');

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

/**
 * Breytir boolean fyrir admin með ákveðið id í gagnagrunni, ef id er ekki til skilar það
 * user not found og ef að admin er ekki boolean skilar það að það þurfi.
 * Ef admin er boolean og ekki sama id og hjá þeim sem breytir skilar það user-inum.
 * @param {Object} req
 * @param {Object} res
 */
async function makeUserAdmin(req, res) {
  const { id } = req.params;
  const { admin } = req.body;

  // Þarf að athuga hvort að token.id er sama og id - þá skila að megi ekki breyta
  const result = await updateToAdmin(id, { admin });

  if (!result.success && result.notFound) {
    return res.status(404).json({ error: 'User not found' });
  }

  if (!result.success && !result.notFound) {
    return res.status(400).json({ error: 'Admin has to be of type boolean' });
  }

  return res.status(200).json(result.item);
}

async function registerUser(req, res) {
  const {
    username = '',
    password = '',
    email = '',
  } = req.body;

  const result = await registerAsUser(username, password, email);

  // Skilar 400 bad request ef að upplýsingar um notanda eru ekki réttar eða ekki til staðar
  if (!result.success && result.validation.length > 0) {
    return res.status(400).json(result.validation);
  }

  // Skila 201 created ef upplýsingar eru réttar og notandi búinn til í gagnagrunni
  return res.status(201).json(result.item);
}


router.get('/', listOfUrls);
router.get('/users/', requireAuthenticationAsAdmin, catchErrors(getUsers));
router.get('/users/:id', requireAuthenticationAsAdmin, catchErrors(getUser));
router.patch('/users/:id', requireAuthenticationAsAdmin, catchErrors(makeUserAdmin));
router.post('/users/register', catchErrors(registerUser));

router.get('/categories', catchErrors(categoriesRoute));
router.post('/categories', requireAuthenticationAsAdmin, catchErrors(categoriesPostRoute));
router.patch('/categories/:id', requireAuthenticationAsAdmin, catchErrors(categoriesPatchRoute));
router.delete('/categories/:id', requireAuthenticationAsAdmin, catchErrors(categoriesDeleteRoute));

router.get('/products', catchErrors(productsRoute));
router.post('/products', requireAuthenticationAsAdmin, catchErrors(productsPostRoute));

router.get('/products/:id', catchErrors(productRoute));
router.patch('/products/:id', requireAuthenticationAsAdmin, catchErrors(productPatchRoute));
router.delete('/products/:id', requireAuthenticationAsAdmin, catchErrors(productDeleteRoute));

router.get('/cart', requireAuthentication, catchErrors(cartRoute));
router.post('/cart', requireAuthentication, catchErrors(cartPostRoute));

router.get('/cart/line/:id', requireAuthentication, catchErrors(cartLineRoute));
router.patch('/cart/line/:id', requireAuthentication, catchErrors(cartLinePatchRoute));
router.delete('/cart/line/:id', requireAuthentication, catchErrors(cartLineDeleteRoute));

router.get('/orders', requireAuthentication, catchErrors(ordersRoute));

module.exports = router;
