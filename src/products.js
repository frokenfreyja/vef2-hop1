const xss = require('xss');
const { query, paged, conditionalUpdate } = require('./db');
const { validateProduct } = require('../validation');

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

async function categoriesPatchRoute(req, res) {
  const { id } = req.params;

  if (!Number.isInteger(Number(id))) {
    return res.status(404).json({ error: 'Category not found' });
  }

  const category = await query('SELECT * FROM categories WHERE id = $1', [id]);

  if (category.rows.length === 0) {
    return res.status(404).json({ error: 'Category not found' });
  }

  const isset = f => typeof f === 'number';

  const field = isset(req.body.category) ? 'category' : null;

  const value = isset(req.body.category) ? xss(req.body.category) : null;
  const result = await conditionalUpdate('categories', id, field, value);

  if (!result) {
    return res.status(400).json({ error: 'Nothing to patch' });
  }

  return res.status(201).json(result.rows[0]);
}

async function categoriesDeleteRoute(req, res) {
  const { id } = req.params;

  if (!Number.isInteger(Number(id))) {
    return res.status(404).json({ error: 'Category not found' });
  }

  const del = await query('DELETE FROM categories WHERE id = $1', [id]);

  if (del.rowCount === 1) {
    return res.status(204).json({});
  }

  return res.status(404).json({ error: 'Category not found' });
}

async function productsRoute(req, res) {
  const { search, category } = req.query;

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

  if (typeof category === 'number' && category !== '') {
    q = `
      SELECT * FROM products
      WHERE
        to_tsvector('english', category) @@ plainto_tsquery('english', $1)
      ORDER BY created DESC
    `;
    values.push(category);
  }

  const products = await paged(q, { values });
  return res.json(products);
}

/* ------------ VANTAR IMAGE ------------- */
async function productsPostRoute(req, res) {
  const validationMessage = await validateProduct(req.body);

  if (validationMessage.length > 0) {
    return res.status(400).json({ errors: validationMessage });
  }

  const q = `INSERT INTO products
    (title, price, description, category)
    VALUES
    ($1, $2, $3, $4)
    RETURNING *`;

  const data = [
    xss(req.body.title),
    xss(req.body.price),
    xss(req.body.description),
    Number(xss(req.body.category)),
  ];

  const result = await query(q, data);

  return res.status(201).json(result.rows[0]);
}

async function productRoute(req, res) {
  const { id } = req.params;

  if (!Number.isInteger(Number(id))) {
    return res.status(404).json({ error: 'Product not found' });
  }

  const product = await query(`
    SELECT
      products.*, categories.title AS categoryTitle
    FROM products
    LEFT JOIN categories on products.category = categories.id
    WHERE products.id = $1
  `, [id]);

  if (product.rows.length === 0) {
    return res.status(404).json({ error: 'Product not found' });
  }

  return res.json(product.rows[0]);
}


async function productPatchRoute(req, res) {
  const { id } = req.params;

  if (!Number.isInteger(Number(id))) {
    return res.status(404).json({ error: 'Product not found' });
  }

  const product = await query('SELECT * FROM products WHERE id = $1', [id]);

  if (product.rows.length === 0) {
    return res.status(404).json({ error: 'Product not found' });
  }

  const validationMessage = await validateProduct(req.body, id, true);

  if (validationMessage.length > 0) {
    return res.status(400).json({ errors: validationMessage });
  }

  const isset = f => typeof f === 'string' || typeof f === 'number';

  const fields = [
    isset(req.body.title) ? 'title' : null,
    isset(req.body.price) ? 'price' : null,
    isset(req.body.description) ? 'description' : null,
    isset(req.body.category) ? 'category' : null,
  ];

  const values = [
    isset(req.body.title) ? xss(req.body.title) : null,
    isset(req.body.price) ? xss(req.body.price) : null,
    isset(req.body.description) ? xss(req.body.description) : null,
    isset(req.body.category) ? xss(req.body.category) : null,
  ];

  const result = await conditionalUpdate('products', id, fields, values);

  if (!result) {
    return res.status(400).json({ error: 'Nothing to patch' });
  }

  return res.status(201).json(result.rows[0]);
}


async function productDeleteRoute(req, res) {
  const { id } = req.params;

  if (!Number.isInteger(Number(id))) {
    return res.status(404).json({ error: 'Product not found' });
  }

  const del = await query('DELETE FROM products WHERE id = $1', [id]);

  if (del.rowCount === 1) {
    return res.status(204).json({});
  }

  return res.status(404).json({ error: 'Product not found' });
}

module.exports = {
  categoriesRoute,
  categoriesPostRoute,
  categoriesPatchRoute,
  categoriesDeleteRoute,
  productsRoute,
  productsPostRoute,
  productRoute,
  productPatchRoute,
  productDeleteRoute,
};
