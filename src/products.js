const xss = require('xss');
const { getProducts } = require('./db');

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
  const products = await getProducts(q, { values });
  return res.json(products);
}

/*
async function productsPostRoute(req, res) {
  const validationMessage = await 
}
*/

module.exports = {
  productsRoute,
};
