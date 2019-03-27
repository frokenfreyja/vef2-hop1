/* eslint-disable no-console */
const xss = require('xss');
const multer = require('multer');

const uploads = multer({ dest: './temp' });
const cloudinary = require('cloudinary');
const {
  query,
  paged,
  // createProduct,
  updateProduct,
  updateCategory,
} = require('./db');

const {
  CLOUDINARY_CLOUD,
  CLOUDINARY_API_KEY,
  CLOUDINARY_API_SECRET,
} = process.env;

if (!CLOUDINARY_CLOUD || !CLOUDINARY_API_KEY || !CLOUDINARY_API_SECRET) {
  console.warn('Missing cloudinary config, uploading images will not work');
}

cloudinary.config({
  cloud_name: CLOUDINARY_CLOUD,
  api_key: CLOUDINARY_API_KEY,
  api_secret: CLOUDINARY_API_SECRET,
});


/**
 * Skilar lista af Categories
 *
 * @param {Object} req
 * @param {Object} res
 * @returns {array} Fylki af Categories
 */
async function categoriesRoute(req, res) {
  const { route = 'categories', offset = 0, limit = 10 } = req.query;

  const categories = await paged('SELECT * FROM categories', { route, offset, limit });

  return res.json(categories);
}

/**
 * Býr til nýjan flokk og vistar í gagnagrunni ef að upplýsingar um hann eru gildar
 *
 * @param {Object} req
 * @param {Object} res
 * @returns {Result} Niðurstaða þess að búa til Category
 */
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

/**
 * Uppfærir stakan flokk eftir id ef upplýsingarnar eru á réttu formi og vistar
 * í gagnagrunni
 *
 * @param {Object} req
 * @param {Object} res
 * @returns {object} Category uppfærðum flokki
 */
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

/**
 * Eyðir flokki úr gagnagrunni eftir id ef flokkurinn er til
 *
 * @param {Object} req
 * @param {Object} res
 */
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

/**
 * Skilar lista af Products
 *
 * @param {Object} req
 * @param {Object} res
 * @returns {array} Fylki af Products
 */
async function productsRoute(req, res) {
  const {
    route = 'products',
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

  const products = await paged(q, {
    route,
    offset,
    limit,
    values,
  });
  return res.json(products);
}


/**
 * Býr til nýja vöru og vistar í gagnagrunni ef að upplýsingar um hana eru gildar
 *
 * @param {Object} req
 * @param {Object} res
 * @returns {Result} Niðurstaða þess að búa til Product
 */
async function productsPostRoute(req, res, next) {
  const {
    title,
    price,
    description,
    categoryid,
  } = req.body;
  const { file: { path, mimetype } = {} } = req;

  // eslint-disable-next-line radix
  const newPrice = parseInt(price);
  // eslint-disable-next-line radix
  const newCat = parseInt(categoryid);

  const splitMimeArray = mimetype.split('/');
  const fileType = splitMimeArray.pop();
  const types = ['jpeg', 'jpg', 'png', 'gif'];

  if (types.indexOf(fileType) === -1) {
    return res.status(400).json({ error: 'The file is not in the right format' });
  }

  const errors = [];

  // Athugum hvort categoryid er til - ef ekki er result falsy
  const p = 'SELECT * FROM categories WHERE categoryid = $1';
  const found = await query(p, [categoryid]);

  if (typeof title !== 'string' || title.length === 0 || title.length > 255) {
    const message = 'Title is required, must not be empty or longar than 255 characters';
    errors.push({
      field: 'title',
      message,
    });
  }

  if (typeof newPrice !== 'number') {
    const message = 'Price is required and must be a number';
    errors.push({
      field: 'price',
      message,
    });
  }

  if (typeof description !== 'string') {
    const message = 'Description is required and must be a text';
    errors.push({
      field: 'description',
      message,
    });
  }

  if (found.rows.length === 0) {
    const message = 'CategoryId does not exist';
    errors.push({
      field: 'categoryid',
      message,
    });
  }

  if (typeof newCat !== 'number') {
    const message = 'CategoryId is required and must be a number';
    errors.push({
      field: 'categoryid',
      message,
    });
  }

  if (errors.length > 0) {
    return res.status(400).json(errors);
  }

  let upload = null;

  try {
    // eslint-disable-next-line camelcase
    const allowed_formats = ['gif', 'jpg', 'png'];
    upload = await cloudinary.v2.uploader.upload(path, allowed_formats);
  } catch (error) {
    if (error.http_code && error.http_code === 400) {
      return res.status(400).json({ error: error.message });
    }

    console.error('Unable to upload file to cloudinary:', path);
    return next(error);
  }

  const q = `
    INSERT INTO products 
    (title, price, description, categoryid, image)
    VALUES
    ($1, $2, $3, $4, $5)
    RETURNING *
  `;
  const result = await query(q,
    [xss(title), xss(newPrice), xss(description), xss(newCat), upload.secure_url]);

  return res.status(201).json(result.rows);
}

/**
 * Sækir staka vöru úr gagnagrunni eftir id ef varan er til
 *
 * @param {Object} req
 * @param {Object} res
 * @returns {Object} Product eða null ef ekkert fannst
 */
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


/**
 * Uppfærir staka vöru eftir id ef upplýsingarnar eru á réttu formi og vistar
 * í gagnagrunni
 *
 * @param {Object} req
 * @param {Object} res
 * @returns {object} Product uppfærðri vöru
 */
async function productPatchRoute(req, res, next) {
  const { id } = req.params;
  const {
    title,
    price,
    description,
    categoryid,
  } = req.body;
  const { file: { path, mimetype } = {} } = req;

  // eslint-disable-next-line radix
  const newPrice = parseInt(price);
  // eslint-disable-next-line radix
  const newCat = parseInt(categoryid);

  const splitMimeArray = mimetype.split('/');
  const fileType = splitMimeArray.pop();
  const types = ['jpeg', 'png', 'gif'];

  if (types.indexOf(fileType) === -1) {
    return res.status(400).json({ error: 'The file is not in the right format' });
  }

  const errors = [];

  // Athugum hvort categoryid er til - ef ekki er result falsy
  const p = 'SELECT * FROM categories WHERE categoryid = $1';
  const found = await query(p, [categoryid]);

  if (typeof title !== 'string' || title.length === 0 || title.length > 255) {
    const message = 'Title is required, must not be empty or longar than 255 characters';
    errors.push({
      field: 'title',
      message,
    });
  }

  if (typeof newPrice !== 'number') {
    const message = 'Price is required and must be a number';
    errors.push({
      field: 'price',
      message,
    });
  }

  if (typeof description !== 'string') {
    const message = 'Description is required and must be a text';
    errors.push({
      field: 'description',
      message,
    });
  }

  if (found.rows.length === 0) {
    const message = 'CategoryId does not exist';
    errors.push({
      field: 'categoryid',
      message,
    });
  }

  if (typeof newCat !== 'number') {
    const message = 'CategoryId is required and must be a number';
    errors.push({
      field: 'categoryid',
      message,
    });
  }

  if (errors.length > 0) {
    return res.status(400).json(errors);
  }

  let upload = null;

  try {
    // eslint-disable-next-line camelcase
    const allowed_formats = ['gif', 'jpg', 'png'];
    upload = await cloudinary.v2.uploader.upload(path, allowed_formats);
  } catch (error) {
    if (error.http_code && error.http_code === 400) {
      return res.status(400).json({ error: error.message });
    }

    console.error('Unable to upload file to cloudinary:', path);
    return next(error);
  }

  const url = upload.secure_url;

  const result = await updateProduct(id, {
    title,
    price,
    description,
    categoryid,
    url,
  });

  if (!result.success && result.validation.length > 0) {
    return res.status(400).json(result.validation);
  }

  if (!result.success && result.notFound) {
    return res.status(404).json({ error: 'Product not found' });
  }

  return res.status(201).json(result.item);
}

/**
 * Eyðir vöru úr gagnagrunni eftir id ef varan er til
 *
 * @param {Object} req
 * @param {Object} res
 */
async function productDeleteRoute(req, res) {
  const { productid } = req.params;

  if (!Number.isInteger(Number(productid))) {
    return res.status(404).json({ error: 'Product not found' });
  }

  const del = await query('DELETE FROM products WHERE productid = $1', [productid]);

  if (del.rowCount === 1) {
    return res.status(204).json({});
  }

  return res.status(404).json({ error: 'Product not found' });
}


/**
 * Middleware sem tekur við form-data og upload-ar mynd ef hún fylgir nýrri vöru
 *
 * @module Multer
 * @function
 * @param {Object} req
 * @param {Object} res
 */
async function productsImageRouteWithMulter(req, res, next) {
  uploads.single('image')(req, res, (err) => {
    if (err) {
      if (err.message === 'Unexpected field') {
        return res.status(400).json({ error: 'Unable to read image' });
      }

      return next(err);
    }

    return productsPostRoute(req, res, next);
  });
}

/**
 * Middleware sem tekur við form-data og upload-ar mynd ef verið er að uppfæra mynd vöru
 *
 * @module Multer
 * @function
 * @param {Object} req
 * @param {Object} res
 */
async function productsImagePatchRouteWithMulter(req, res, next) {
  uploads.single('image')(req, res, (err) => {
    if (err) {
      if (err.message === 'Unexpected field') {
        return res.status(400).json({ error: 'Unable to read image' });
      }

      return next(err);
    }

    return productPatchRoute(req, res, next);
  });
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
  productsImageRouteWithMulter,
  productsImagePatchRouteWithMulter,
};
