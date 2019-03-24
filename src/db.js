const { Client } = require('pg');

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

async function conditionalUpdate(table, id, fields, values) {
  const filteredFields = fields.filter(i => typeof i === 'string');
  const filteredValues = values.filter(i => typeof i === 'string' || typeof i === 'number');

  if (filteredFields.length === 0) {
    return false;
  }

  if (filteredFields.length !== filteredValues.length) {
    throw new Error('fields and values must be of equal length');
  }

  // id is field = 1
  const updates = filteredFields.map((field, i) => `${field} = $${i + 2}`);

  const q = `
    UPDATE ${table}
      SET ${updates.join(', ')}
    WHERE
      id = $1
    RETURNING *
    `;

  const result = await query(q, [id].concat(filteredValues));

  return result;
}


module.exports = {
  query,
  paged,
  conditionalUpdate,
};
