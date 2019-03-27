const xss = require('xss');
const { query, paged, updateCartLine } = require('../src/db');
const { findUserById } = require('./users');

async function validateCart(productid, amount) {
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
  const { route = 'cart', offset = 0, limit = 10 } = req.query;

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
    `, [userid], { route, offset, limit });

  if (cart === 0) {
    return res.status(404).json({ error: 'Cart not found' });
  }

  const price = await query(`
    SELECT SUM(price * amount)
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

  // Sækjum körfu sem er ekki pöntuð
  let cart = await query(`
  SELECT cart.*
  FROM cart
  WHERE userid = $1 AND ordered = '0'
  `, [userid]);

  // Búum til körfu fyrir user ef hún er ekki til
  if (cart.rows.length === 0) {
    cart = await query(`
      INSERT INTO
        cart(userid)
      VALUES
        ($1)
      RETURNING *
      `, [userid]);
  } else {
    // Annars bæta vöru/vörum við körfu og skila
    // TODO bæta við að athuga hvort varan sé í körfunni - þá yfirskrifa
    // Ef varan er ekki í körfunni - þá bæta henni við
    const q = `
    INSERT INTO
      cart_products(cartid, productid, amount)
    VALUES
      ($2, $3, $4)
    RETURNING *
    `;

    const validationMessage = await validateCart(req.body.productid, req.body.amount);

    if (validationMessage.length > 0) {
      return res.status(400).json({ errors: validationMessage });
    }


    const values = [req.body.productid,
      xss(cart.rows[0].cartid), xss(req.body.productid), xss(req.body.amount)];
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
  const { route = 'orders', offset = 0, limit = 10 } = req.query;

  const { userid } = req.user;

  const user = await findUserById(userid);

  if (user === null) {
    return res.status(404).json({ error: 'User not found' });
  }

  // Ef notandi er ekki admin birta bara hans pantanir
  if (user.admin === false) {
    const orders = await query(`
    SELECT *
    FROM cart
    WHERE userid = $1 AND ordered = '0'
    ORDER BY created DESC
    `, [userid]);

    if (orders.rows.length === 0) {
      return res.status(404).json({ error: 'Order not found' });
    }

    return res.json(orders.rows);
  }

  // Ef notandi er admin þá birta allar pantanir
  const orders = await paged('SELECT * FROM cart ORDER BY created DESC', { route, offset, limit });

  if (orders === 0) {
    return res.status(404).json({ error: 'Order not found' });
  }
  return res.json(orders);
}

/**
 * Athugar hvort að númer, nafn og heimilisfang séu til staðar og á réttu formi,
 * ef ekki skilar það fylki með villum
 * @param {Number} cartid Númer körfu
 * @param {String} name Nafn á notanda
 * @param {String} address Heimilisfang notanda
 */
async function validateOrder(cartid, name, address) {
  const errors = [];

  if (!cartid || typeof cartid !== 'number') {
    errors.push({
      field: 'cartid',
      message: 'Cartid is required and must be a number',
    });
  }

  if (!name || typeof name !== 'string' || name.length > 128) {
    errors.push({
      field: 'name',
      message: 'Name is required and must be a string no longer than 128 characters',
    });
  }

  if (!address || typeof address !== 'string' || address.length > 128) {
    errors.push({
      field: 'address',
      message: 'Address is required and must be a string no longer than 128 characters',
    });
  }

  return errors;
}


/**
 * Breytir körfu í pöntun ef að allar upplýsingar eru réttar
 * @param {Object} req
 * @param {Object} res
 */
async function ordersToCartRoute(req, res) {
  const { userid } = req.user;
  const { cartid, name, address } = req.body;

  const user = await findUserById(userid);

  if (user === null) {
    return res.status(404).json({ error: 'User not found' });
  }

  // Finna körfu(ordered=0) þar sem að userid = userid
  const orders = await query(`
    SELECT *
    FROM cart
    WHERE userid = $1 AND cartid = $2 AND ordered IS NULL
    ORDER BY created DESC
    `, [userid, cartid]);

  // Ef hann á ekki körfu skila að karfa sé ekki fundin
  if (orders.rows.length === 0) {
    return res.status(404).json({ error: 'Order not found' });
  }
  // Ef hann á körfu - gera validate á body og búa til pöntun
  const validation = await validateOrder(cartid, name, address);

  // Ef ekki á réttu formi - skila error fylki
  if (validation.length > 0) {
    return res.status(400).json(validation);
  }

  const updates = [xss(name), xss(address), userid, cartid];
  // Ef validation skilar engu þá setjum við ordered = '1', name = name,
  // address = address og created = current_timestamp
  const p = `
    UPDATE cart
    SET ordered = '1', name = $1, address = $2, created = current_timestamp
    WHERE userid = $3 AND cartid = $4
    RETURNING *`;

  const updateResult = await query(p, updates);

  return res.status(201).json({ order: updateResult.rows });
}

module.exports = {
  cartRoute,
  cartPostRoute,
  cartLineRoute,
  cartLinePatchRoute,
  cartLineDeleteRoute,
  ordersRoute,
  ordersToCartRoute,
};
