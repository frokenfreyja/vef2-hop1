const xss = require('xss');
const { query, paged, updateCartLine } = require('../src/db');
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
    SELECT products.*, cart_products.amount, cart_products.cartid
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

  // Sækjum körfu
  let cart = await query(`
  SELECT cart.*
  FROM cart
  WHERE userid = $1
  `, [userid]);

  // Buum til körfu fyrir user ef hun er ekki til
  if (cart.rows.length === 0) {
    cart = await query(`
      INSERT INTO 
        cart(userid)
      VALUES
        ($1)
      RETURNING *
      `, [userid]);
  } else {
    // Annars bæta vöru við körfu og skila
    const q = `
    INSERT INTO
      cart_products(cartid, productid, amount)
    VALUES
      ($1, $2, $3)
    RETURNING *
    `;

    const validationMessage = await validateCart(req.body.productid, req.body.amount);

    if (validationMessage.length > 0) {
      return res.status(400).json({ errors: validationMessage });
    }

    const values = [xss(cart.rows[0].cartid), xss(req.body.productid), xss(req.body.amount)];
    const result = await query(q, values);
    return res.status(201).json(result.rows[0]);
  }

  const q = `
  INSERT INTO
    cart_products(cartid, productid, amount)
  VALUES
    ($1, $2, $3)
  RETURNING *
  `;
  const validationMessage = await validateCart(req.body.productid, req.body.amount);

  if (validationMessage.length > 0) {
    return res.status(400).json({ errors: validationMessage });
  }

  const values = [xss(cart.rows[0].cartid), xss(req.body.productid), xss(req.body.amount)];
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

async function cartLineDeleteRoute(req, res) {
  const { id } = req.params;

  if (!Number.isInteger(Number(id))) {
    return res.status(404).json({ error: 'Cart product not found' });
  }

  const del = await query('DELETE FROM cart_products WHERE cartproductid = $1', [id]);

  if (del.rowCount === 1) {
    return res.status(204).json({});
  }

  return res.status(404).json({ error: 'Cart product not found' });
}

async function ordersRoute(req, res) {
  const { offset = 0, limit = 10 } = req.query;

  const { userid, admin } = req.user;

  console.log("admin: ", admin);
  const user = await findUserById(userid);

  console.log("user: ", user);
  if (user === null) {
    return res.status(404).json({ error: 'User not found' });
  }

  const q = `
  SELECT *
  FROM cart
  ORDER BY created DESC
  `;
  /*
  let q = (`
  SELECT * 
  FROM cart
  WHERE userid = $1
  ORDER BY created DESC
  `, [userid]);

  if (admin) {
    q = `
    SELECT *
    FROM cart
    ORDER BY created DESC
    `;
  }

  if (q.rows.length === 0) {
    return res.status(404).json({ error: 'Orders not found' });
  }
  */

  const orders = await paged(q, { offset, limit });
  return res.json(orders);
}

module.exports = {
  cartRoute,
  cartPostRoute,
  cartLineRoute,
  cartLinePatchRoute,
  cartLineDeleteRoute,
  ordersRoute,
};
