const xss = require('xss');
const {
  query,
  paged,
  updateProduct,
  updateCategory,
} = require('./db');

async function categoriesRoute(req, res) {
  const { offset = 0, limit = 10 } = req.query;

  const categories = await paged('SELECT * FROM categories', { offset, limit });

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
  const { title } = req.body;

  const result = await updateCategory(id, { title });

  if (!result.success && result.validation.length > 0) {
    return res.status(400).json(result.validation);
  }

  if (!result.success && result.notFound) {
    return res.status(404).json({ error: 'Category not found' });
  }

  return res.status(201).json(result.item);
}

async function categoriesDeleteRoute(req, res) {
  const { id } = req.params;

  if (!Number.isInteger(Number(id))) {
    return res.status(404).json({ error: 'Category not found' });
  }

  const del = await query('DELETE FROM categories WHERE categoryid = $1', [id]);

  if (del.rowCount === 1) {
    return res.status(204).json({});
  }

  return res.status(404).json({ error: 'Category not found' });
}

async function productsRoute(req, res) {
  const {
    offset = 0,
    limit = 10,
    search = '',
    category = '',
  } = req.query;

  let q = `
    SELECT 
      products.*, categories.title AS categoryTitle
    FROM products
    LEFT JOIN categories ON products.categoryid = categories.categoryid
    ORDER BY created DESC
  `;
  const values = [];

  if (typeof search === 'string' && search !== '') {
    q = `
    SELECT 
      products.*, categories.title AS categoryTitle
      FROM products
      LEFT JOIN categories ON products.categoryid = categories.categoryid
      WHERE
        to_tsvector('english', products.title) @@ plainto_tsquery('english', $1)
        OR
        to_tsvector('english', products.description) @@ plainto_tsquery('english', $1)
      ORDER BY created DESC
    `;
    values.push(search);
  }

  if (typeof category === 'string' && category !== '') {
    q = `
    SELECT 
      products.*, categories.title AS categoryTitle
      FROM products
      LEFT JOIN categories ON products.categoryid = categories.categoryid
      WHERE
        to_tsvector('english', categories.title) @@ plainto_tsquery('english', $1)
      ORDER BY created DESC
    `;
    values.push(category);
  }

  const products = await paged(q, { offset, limit, values });
  return res.json(products);
}

/* ------------ VANTAR IMAGE+CATEGORY ------------- */
async function productsPostRoute(req, res) {
  const {
    title,
    price,
    description,
    categoryid,
  } = req.body;

  if (typeof title !== 'string' || title.length === 0 || title.length > 255) {
    const message = 'Title is required, must not be empty or longar than 255 characters';
    return res.status(400).json({
      errors: [{ field: 'title', message }],
    });
  }

  if (typeof price !== 'number') {
    const message = 'Price is required and must be a number';
    return res.status(400).json({
      errors: [{ field: 'price', message }],
    });
  }

  if (typeof description !== 'string') {
    const message = 'Description is required and must be a text';
    return res.status(400).json({
      errors: [{ field: 'description', message }],
    });
  }

  if (typeof categoryid !== 'number') {
    const message = 'CategoryId is required and must be a number';
    return res.status(400).json({
      errors: [{ field: 'CategoryId', message }],
    });
  }

  const q = 'INSERT INTO products (title, price, description, categoryid) VALUES ($1, $2, $3, $4) RETURNING *';
  const result = await query(q, [xss(title), xss(price), xss(description), xss(categoryid)]);

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
    LEFT JOIN categories on products.categoryid = categories.categoryid
    WHERE products.productid = $1
  `, [id]);

  if (product.rows.length === 0) {
    return res.status(404).json({ error: 'Product not found' });
  }

  return res.json(product.rows[0]);
}

async function productPatchRoute(req, res) {
  const { id } = req.params;
  const {
    title,
    price,
    description,
    categoryid,
  } = req.body;

  const result = await updateProduct(id, {
    title,
    price,
    description,
    categoryid,
  });

  if (!result.success && result.validation.length > 0) {
    return res.status(400).json(result.validation);
  }

  if (!result.success && result.notFound) {
    return res.status(404).json({ error: 'Product not found' });
  }

  return res.status(201).json(result.item);
}


async function productDeleteRoute(req, res) {
  const { id } = req.params;

  if (!Number.isInteger(Number(id))) {
    return res.status(404).json({ error: 'Product not found' });
  }

  const del = await query('DELETE FROM products WHERE productid = $1', [id]);

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
