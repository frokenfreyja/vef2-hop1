const xss = require('xss');
const { query, paged } = require('./db');

async function categoriesRoute(req, res) {
  const categories = await paged('SELECT * FROM categories');

  return res.json(categories);
}

async function categoriesPostRoute(req, res) {
  const { title } = req.body;

  if (typeof title !== 'string' || title.length === 0 || title.length > 255) {
    const message = 'Title is required, must not be empty or longar than 255 characters';
    return res.status(400).json({
      errors: [{ field: 'title', message }],
    });
  }
  const cat = await query('SELECT * FROM categories WHERE title = $1', [title]);

  if (cat.rows.length > 0) {
    return res.status(400).json({
      errors: [{ field: 'title', message: `Category "${title}" already exists` }],
    });
  }

  const q = 'INSERT INTO categories (title) VALUES ($1) RETURNING *';
  const result = await query(q, [xss(title)]);

  return res.status(201).json(result.rows[0]);
}

async function productsRoute(req, res) {
  const { search = '' } = req.query;

  let q = `
    SELECT 
      products.*, categories.title AS categoryTitle
    FROM products
    LEFT JOIN categories ON products.category = categories.id
    ORDER BY created DESC
  `;
  const values = [];

  if (typeof search === 'string' && search !== '') {
    q = `
      SELECT * FROM products
      WHERE
        to_tsvector('english', title) @@ plainto_tsquery('english', $1)
        OR
        to_tsvector('english', description) @@ plainto_tsquery('english', $1)
      ORDER BY created DESC
    `;
    values.push(search);
  }
  const products = await paged(q, { values });
  return res.json(products);
}

/*
async function productsPostRoute(req, res) {
  const validationMessage = await 
}
*/

module.exports = {
  categoriesRoute,
  categoriesPostRoute,
  productsRoute,
};