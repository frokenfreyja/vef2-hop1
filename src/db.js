const { Client } = require('pg');

const xss = require('xss');
const { validateCategory, validateProduct, validateCartLine } = require('../validation');

/* hjálparföll */
function isEmpty(s) {
  return s == null && !s;
}

/**
 * Execute an SQL query.
 *
 * @param {string} sqlQuery - SQL query to execute
 * @param {array} [values=[]] - Values for parameterized query
 *
 * @returns {Promise} Promise representing the result of the SQL query
 */
async function query(sqlQuery, values = []) {
  const connectionString = process.env.DATABASE_URL;

  const client = new Client({ connectionString });
  await client.connect();

  let result;

  try {
    result = await client.query(sqlQuery, values);
  } catch (err) {
    console.error('Error executing query', err);
    throw err;
  } finally {
    await client.end();
  }

  return result;
}

async function paged(sqlQuery, {
  route = '',
  offset = 0,
  limit = 10,
  values = [],
}) {
  const sqlLimit = values.length + 1;
  const sqlOffset = values.length + 2;
  const pagedQuery = `${sqlQuery} LIMIT $${sqlLimit} OFFSET $${sqlOffset}`;

  const limitAsNumber = Number(limit);
  const offsetAsNumber = Number(offset);

  const cleanLimit = Number.isInteger(limitAsNumber) && limitAsNumber > 0 ? limitAsNumber : 10;
  const cleanOffset = Number.isInteger(offsetAsNumber) && offsetAsNumber > 0 ? offsetAsNumber : 0;

  const combinedValues = values.concat([cleanLimit, cleanOffset]);

  const result = await query(pagedQuery, combinedValues);

  const pages = {
    _links: {
      self: {
        href: `http://localhost:3000/${route}?offset=${offsetAsNumber}&limit=${limitAsNumber}`,
      },
    },
  };
  if (offsetAsNumber > 0) {
    pages._links.prev = {     /* eslint-disable-line */
      href: `http://localhost:3000/${route}?offset=${offsetAsNumber - limitAsNumber}&limit=${limitAsNumber}`,
    };
  }

  if (result.rows.length <= limitAsNumber) {
    pages._links.next = {     /* eslint-disable-line */
      href: `http://localhost:3000/${route}?offset=${Number(offsetAsNumber) + limitAsNumber}&limit=${limitAsNumber}`,
    };
  }
  return {
    limit: cleanLimit,
    offset: cleanOffset,
    pages,
    items: result.rows,
  };
}

async function updateProduct(id, image, item) {
  const result = await query('SELECT * FROM products WHERE productid = $1', [id]);

  if (result.rows.length === 0) {
    return {
      success: false,
      notFound: true,
      validation: [],
    };
  }

  const validationResult = await validateProduct(
    item.title,
    item.price,
    item.description,
    item.categoryid,
  );

  if (validationResult.length > 0) {
    return {
      success: false,
      notFound: false,
      validation: validationResult,
    };
  }

  const changedColumns = [
    !isEmpty(item.title) ? 'title' : null,
    !isEmpty(item.price) ? 'price' : null,
    !isEmpty(item.description) ? 'description' : null,
    !isEmpty(item.categoryid) ? 'categoryid' : null,
    !isEmpty(image) ? 'image' : null,
  ].filter(Boolean);

  const changedValues = [
    !isEmpty(item.title) ? xss(item.title) : null,
    !isEmpty(item.price) ? xss(item.price) : null,
    !isEmpty(item.description) ? xss(item.description) : null,
    !isEmpty(item.categoryid) ? xss(item.categoryid) : null,
    !isEmpty(image) ? xss(image) : null,
  ].filter(Boolean);

  const updates = [id, ...changedValues];

  const updatedColumnsQuery = changedColumns.map((column, i) => `${column} = $${i + 2}`);

  const sqlQuery = `
    UPDATE products
    SET ${updatedColumnsQuery.join(', ')}
    WHERE productid = $1
    RETURNING *`;

  const updateResult = await query(sqlQuery, updates);
  return {
    success: true,
    item: updateResult.rows[0],
  };
}

async function updateCategory(id, { title } = {}) {
  const result = await query('SELECT * FROM categories where categoryid = $1', [id]);

  if (result.rows.length === 0) {
    return {
      success: false,
      notFound: true,
      validation: [],
    };
  }

  const validationResult = await validateCategory({ title });

  if (validationResult.length > 0) {
    return {
      success: false,
      notFound: false,
      validation: validationResult,
    };
  }

  const changedColumns = [!isEmpty(title) ? 'title' : null].filter(Boolean);

  const changedValues = [!isEmpty(title) ? xss(title) : null].filter(Boolean);

  const updates = [id, ...changedValues];

  const updatedColumnsQuery = changedColumns.map((column, i) => `${column} = $${i + 2}`);

  const sqlQuery = `
    UPDATE categories
    SET ${updatedColumnsQuery.join(', ')}
    WHERE categoryid = $1
    RETURNING *`;

  const updateResult = await query(sqlQuery, updates);
  return {
    success: true,
    item: updateResult.rows[0],
  };
}

async function updateCartLine(id, { amount } = {}) {
  const result = await query('SELECT * FROM cart_products where cartproductid = $1', [id]);

  if (result.rows.length === 0) {
    return {
      success: false,
      notFound: true,
      validation: [],
    };
  }

  const validationResult = await validateCartLine({ amount });

  if (validationResult.length > 0) {
    return {
      success: false,
      notFound: false,
      validation: validationResult,
    };
  }

  const changedColumns = [!isEmpty(amount) ? 'amount' : null].filter(Boolean);

  const changedValues = [!isEmpty(amount) ? xss(amount) : null].filter(Boolean);

  const updates = [id, ...changedValues];

  const updatedColumnsQuery = changedColumns.map((column, i) => `${column} = $${i + 2}`);

  const sqlQuery = `
    UPDATE cart_products
    SET ${updatedColumnsQuery.join(', ')}
    WHERE cartproductid = $1
    RETURNING *`;

  const updateResult = await query(sqlQuery, updates);
  return {
    success: true,
    item: updateResult.rows[0],
  };
}


module.exports = {
  query,
  paged,
  updateProduct,
  updateCategory,
  updateCartLine,
};
