const xss = require('xss');
const { query, updateCartLine } = require('../src/db');
const { findUserById } = require('./users');

async function validateCart({ productid, amount }) {
  const messages = [];

  if (!productid || !Number.isInteger(Number(productid))) {
    messages.push({ field: 'productid', message: 'Product is required and must be an integer' });
  } else {
    const product = await query('SELECT * FROM products WHERE productid = $1', [productid]);

    if (product.rows.length === 0) {
      messages.push({ field: 'productid', message: `Product "${productid}" does not exist` });
    }
  }

  if (!amount || typeof amount !== 'number') {
    messages.push({ field: 'amount', message: 'Amount is required and must be a number' });
  } else if (amount < 0) {
    messages.push({ field: 'amount', message: 'Amount must be a number > 0' });
  }

  return messages;
}

async function cartRoute(req, res) {
  const { userid } = req.user;

  const user = await findUserById(userid);

  if (user === null) {
    return res.status(404).json({ error: 'User not found' });
  }

  const cart = await query(`
    SELECT products.*, cart_products.amount
    FROM products
    INNER JOIN cart_products 
        ON products.productid = cart_products.productid
    INNER JOIN cart 
        ON cart_products.cartid = cart.cartid
    WHERE userid = $1
    `, [userid]);

  if (cart.rows.length === 0) {
    return res.status(404).json({ error: 'Cart not found' });
  }
  const price = await query(`
    SELECT SUM(price)
    FROM products
    INNER JOIN cart_products 
        ON products.productid = cart_products.productid
    INNER JOIN cart 
        ON cart_products.cartid = cart.cartid
    WHERE userid = $1
    `, [userid]);

  return res.json({ cart: cart.rows, totalPrice: price.rows[0] });
}

async function cartPostRoute(req, res) {
  const { userid } = req.user;

  const user = await findUserById(userid);

  if (user === null) {
    return res.status(404).json({ error: 'User not found' });
  }

  const validationMessage = await validateCart(req.body);

  if (validationMessage.length > 0) {
    return res.status(400).json({ errors: validationMessage });
  }

  const q = `
  INSERT INTO
    cart_products(cartid, productid, amount)
  VALUES
    ($1, $2, $3)
  RETURNING *
`;
  //  LEFT JOIN cart ON cart_products.cartid = cart.cartid AND users.userid = cart.userid

  const values = [xss(req.body.cartid), xss(req.body.productid), xss(req.body.amount)];

  const result = await query(q, values);

  return res.status(201).json(result.rows[0]);
}

async function cartLineRoute(req, res) {
  const { id } = req.params;

  if (!Number.isInteger(Number(id))) {
    return res.status(404).json({ error: 'Cart product not found' });
  }

  const cartLine = await query(`
    SELECT products.*, cart_products.amount
    FROM products
    LEFT JOIN cart_products ON products.productid = cart_products.productid
    WHERE cart_products.cartproductid = $1
    `, [id]);

  if (cartLine.rows.length === 0) {
    return res.status(404).json({ error: 'Cart product not found' });
  }

  return res.json(cartLine.rows[0]);
}

async function cartLinePatchRoute(req, res) {
  const { id } = req.params;
  const { amount } = req.body;

  const result = await updateCartLine(id, { amount });

  if (!result.success && result.validation.length > 0) {
    return res.status(400).json(result.validation);
  }

  if (!result.success && result.notFound) {
    return res.status(404).json({ error: 'Cart product not found' });
  }

  return res.status(201).json(result.item);
}

module.exports = {
  cartRoute,
  cartPostRoute,
  cartLineRoute,
  cartLinePatchRoute,
};
