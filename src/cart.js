const xss = require('xss');
const { query, paged, updateCartLine } = require('../src/db');
const { findUserById } = require('./users');


/**
 * Staðfestir að cart sé gilt.
 *
 * @param {Number} productid auðkenni á vöru
 * @param {Number} amount heildarverð körfu
 * @returns {array} Fylki af villum sem komu upp, tómt ef engin villa
 */
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

/**
 * Skilar vöru fyrir notanda með öllum línum og reiknuðu heildarverði körfu
 * aðeins ef notandi er innskráður
 *
 * @param {Object} req
 * @param {Object} res
 * @returns {Object} Cart fyrir innskráðan notanda
 */
async function cartRoute(req, res) {
  const { route = 'cart', offset = 0, limit = 10 } = req.query;

  const { userid } = req.user;

  const user = await findUserById(userid);

  if (user === null) {
    return res.status(404).json({ error: 'User not found' });
  }

  const cart = await paged(`
    SELECT products.*, cart_products.amount, cart_products.cartid
    FROM products
    INNER JOIN cart_products 
        ON products.productid = cart_products.productid
    INNER JOIN cart 
        ON cart_products.cartid = cart.cartid
    WHERE userid = $1 AND ordered = '0'
    `, {
    route,
    offset,
    limit,
    values: [userid],
  });

  if (cart.items.length === 0) {
    return res.status(404).json({ error: 'Cart not found' });
  }

  const price = await query(`
    SELECT SUM(price * amount)
    FROM products
    INNER JOIN cart_products 
        ON products.productid = cart_products.productid
    INNER JOIN cart
        ON cart_products.cartid = cart.cartid
    WHERE userid = $1 AND ordered = '0'
    `, [userid]);

  return res.status(201).json({ cart, total: price.rows[0] });
}

/**
 * Bætir við vöru í körfu eftir id ef notandi er innskráður
 *
 * @param {Object} req
 * @param {Object} res
 * @return {Object} uppfærðri körfu notanda
 */
async function cartPostRoute(req, res) {
  const { userid } = req.user;

  const user = await findUserById(userid);

  if (user === null) {
    return res.status(404).json({ error: 'User not found' });
  }

  // Sækjum körfu sem er ekki pöntuð (cart.ordered = '0')
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
    // Annars bæta vörum við körfu og skila
    // Athuga hvort varan sé í körfunni - þá yfirskrifa
    // Ef varan er ekki í körfunni - þá bæta henni við
    const { cartid } = cart.rows[0];

    // Athuga hvort það er vara í cartproducts með þessu productid og cartid
    const cartproducts = await query(`
      SELECT *
      FROM cart_products
      WHERE productid = $1 AND cartid = $2
      `, [req.body.productid, cartid]);

    let q;
    // Ef engin product er með þetta productid í þessari körfu þá
    if (cartproducts.rows.length === 0) {
      q = `
      INSERT INTO
        cart_products(cartid, productid, amount)
      VALUES
        ($1, $2, $3)
      RETURNING *
      `;
    } else {
      q = `
      UPDATE cart_products
      SET amount = $3
      WHERE productid = $2 AND cartid = $1
      RETURNING *
      `;
    }

    const validationMessage = await validateCart(req.body.productid, req.body.amount);

    if (validationMessage.length > 0) {
      return res.status(400).json(validationMessage);
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
    return res.status(400).json(validationMessage);
  }

  const values = [xss(cart.rows[0].cartid), xss(req.body.productid), xss(req.body.amount)];
  const result = await query(q, values);

  return res.status(201).json(result.rows[0]);
}

/**
 * Skilar línu í körfu eftir id með fjölda og upplýsingum um vöru
 * Aðeins ef notandi er innskráður
 *
 * @param {Object} req
 * @param {Object} res
 * @returns {Object} línu í körfu notanda
 */
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

  return res.status(201).json(cartLine.rows[0]);
}

/**
 * Uppfærir línu eftir id í körfu notanda ef notandi er innskráður
 *
 * @param {Object} req
 * @param {Object} res
 * @returns {Object} uppfærðri línu í körfu notanda
 */
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

/**
 * Eyðir línu úr körfu notanda eftir id ef hann er innskráður
 *
 * @param {Object} req
 * @param {Object} res
 */
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

/**
 * Skilar öllum Orders þar sem nýjustu birtast fyrst
 * Ef notandi er ekki admin birtast aðeins pantanir notanda
 *
 * @param {Object} req
 * @param {Object} res
 * @returns {array} fylki af pöntunum
 */
async function ordersRoute(req, res) {
  const { route = 'orders', offset = 0, limit = 10 } = req.query;

  const { userid } = req.user;

  const user = await findUserById(userid);

  if (user === null) {
    return res.status(404).json({ error: 'User not found' });
  }

  // Ef notandi er ekki admin birta bara hans pantanir
  if (user.admin === false) {
    const orders = await paged(`
    SELECT *
    FROM cart
    WHERE userid = $1 AND ordered = '1'
    ORDER BY created DESC
    `, {
      route,
      offset,
      limit,
      values: [userid],
    });

    if (orders.items.length === 0) {
      return res.status(404).json({ error: 'Order not found' });
    }

    return res.status(201).json(orders);
  }

  // Ef notandi er admin þá birta allar pantanir
  const orders = await paged(`
  SELECT * FROM cart ORDER BY created DESC
  `, {
    route,
    offset,
    limit,
  });

  if (orders.items.length === 0) {
    return res.status(404).json({ error: 'Order not found' });
  }
  return res.status(201).json(orders);
}

/**
 * Athugar hvort að númer, nafn og heimilisfang séu til staðar og á réttu formi,
 * ef ekki skilar það fylki með villum
 * @param {Number} cartid Númer körfu
 * @param {String} name Nafn á notanda
 * @param {String} address Heimilisfang notanda
 */
async function validateOrder(name, address) {
  const errors = [];

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
async function ordersPostRoute(req, res) {
  const { userid } = req.user;
  const { name, address } = req.body;

  const user = await findUserById(userid);

  if (user === null) {
    return res.status(404).json({ error: 'User not found' });
  }

  // Finna körfu(ordered=0) þar sem að userid = userid
  const cart = await query(`
    SELECT *
    FROM cart
    WHERE userid = $1 AND ordered = '0'
    ORDER BY created DESC
    `, [userid]);

  // Ef hann á ekki körfu skila að karfa sé ekki fundin
  if (cart.rows.length === 0) {
    return res.status(404).json({ error: 'Cart not found' });
  }
  // Ef hann á körfu - gera validate á body og búa til pöntun
  const validation = await validateOrder(name, address);

  // Ef ekki á réttu formi - skila error fylki
  if (validation.length > 0) {
    return res.status(400).json(validation);
  }
  // Ef validation skilar engu þá setjum við ordered = '1', name = name,
  // address = address og created = current_timestamp
  const p = `
    UPDATE cart
    SET ordered = '1', name = $1, address = $2, created = current_timestamp
    WHERE userid = $3 AND cartid = $4
    RETURNING *`;

  const updates = [xss(name), xss(address), userid, cart.rows[0].cartid];
  const updateResult = await query(p, updates);

  return res.status(201).json({ order: updateResult.rows });
}

/**
 * Skilar pöntun með öllum línum, gildum pöntunar og reiknuðu heildarverði körfu
 * @param {Object} req
 * @param {Object} res
 */
async function orderItemsRoute(req, res) {
  const { userid } = req.user;

  const user = await findUserById(userid);

  if (user === null) {
    return res.status(404).json({ error: 'User not found' });
  }

  const { id } = req.params;

  if (!Number.isInteger(Number(id))) {
    return res.status(404).json({ error: 'Order not found' });
  }

  const order = await query(`
  SELECT products.*, cart_products.amount, categories.title AS categoryTitle
  FROM products
  LEFT JOIN categories on products.categoryid = categories.categoryid
  INNER JOIN cart_products 
    ON products.productid = cart_products.productid
  INNER JOIN cart 
    ON cart_products.cartid = cart.cartid
  WHERE cart.cartid = $1 AND userid = $2 AND ordered = '1'
`, [id, userid]);

  if (order.rows.length === 0) {
    return res.status(404).json({ error: 'Order not found' });
  }

  const price = await query(`
    SELECT SUM(price * amount)
    FROM products
    INNER JOIN cart_products 
      ON products.productid = cart_products.productid
    INNER JOIN cart
      ON cart_products.cartid = cart.cartid
    WHERE cart.cartid = $1 AND userid = $2 AND ordered = '1'
    `, [id, userid]);

  return res.status(201).json({ order: order.rows, total: price.rows[0] });
}

module.exports = {
  cartRoute,
  cartPostRoute,
  cartLineRoute,
  cartLinePatchRoute,
  cartLineDeleteRoute,
  ordersRoute,
  ordersPostRoute,
  orderItemsRoute,
};
