const xss = require('xss');
const { query } = require('../src/db');
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
  const { userid } = req.user;

  const user = await findUserById(userid);

  if (user === null) {
    return res.status(404).json({ error: 'You not found' });
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

module.exports = {
  cartRoute,
  cartPostRoute,
};