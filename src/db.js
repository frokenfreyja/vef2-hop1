const { Client } = require('pg');
const xss = require('xss');
const { validateCategory, validateProduct } = require('../validation');

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

async function paged(sqlQuery) {
  const pagedQuery = `${sqlQuery}`;
  const result = await query(pagedQuery);

  return {
    products: result.rows,
  };
}

/* ------- VANTAR IMAGE+CATEGORYID ----------- */
async function updateProduct(id, { title, price, description, categoryid }) {
  const result = await query('SELECT * FROM products where productid = $1', [id]);

  if (result.rows.length === 0) {
    return {
      success: false,
      notFound: true,
      validation: [],
    };
  }

  const validationResult = await validateProduct({ title, price, description, categoryid });

  if (validationResult.length > 0) {
    return {
      success: false,
      notFound: false,
      validation: validationResult,
    };
  }

  const changedColumns = [
    !isEmpty(title) ? 'title' : null,
    !isEmpty(price) ? 'price' : null,
    !isEmpty(description) ? 'description' : null,
    !isEmpty(categoryid) ? 'categoryid' : null,
  ].filter(Boolean);

  const changedValues = [
    !isEmpty(title) ? xss(title) : null,
    !isEmpty(price) ? xss(price) : null,
    !isEmpty(description) ? xss(description) : null,
    !isEmpty(categoryid) ? xss(categoryid) : null,
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


module.exports = {
  query,
  paged,
  updateProduct,
  updateCategory,
};
