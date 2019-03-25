const xss = require('xss');
const { query, paged } = require('../src/db');
const { findUserById } = require('./users');

async function validateCart({ cartid, productid, amount }) {
  const messages = [];

  if (!cartid || !Number.isInteger(Number(cartid))) {
    messages.push({ field: 'cartid', message: 'Cart is required and must be an integer' });
  } else {
    const cart = await query('SELECT * FROM cart WHERE cartid = $1', [cartid]);

    if (cart.rows.length === 0) {
      messages.push({ field: 'cartid', message: `Cart "${cartid}" does not exist` });
    }
  }

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
  const { offset = 0 } = req.query;

  const user = await findUserById(userid);

  if (user === null) {
    return res.status(404).json({ error: 'You not found' });
  }

  const cart = await query(`
    SELECT cart_products.*
    FROM cart_products
    LEFT JOIN cart ON cart_products.cartid = cart.cartid
    WHERE userid = $1
    `, [userid]);

  if (cart.rows.length === 0) {
    return res.status(404).json({ error: 'Cart not found' });
  }
  return res.json(cart.rows);
}

async function cartPostRoute(req, res) {
  const { id } = req.user;
  const validationMessage = await validateCart(req.body);

  if (validationMessage.length > 0) {
    return res.status(400).json({ errors: validationMessage });
  }

  const q = `
    INSERT INTO
      cart_products(cartid, productid, amount) AND cart(userid)
    VALUES
      ($1, $2, $3, $4)
    LEFT JOIN cart ON cart_products.cartid = cart.cartid
    RETURNING *
  `;

  const values = [
    xss(req.body.cartid),
    xss(req.body.productid),
    xss(req.body.amount),
    id,
  ];

  const result = await query(q, values);

  return res.status(201).json(result.rows[0]);
}

module.exports = {
  cartRoute,
  cartPostRoute,
};
