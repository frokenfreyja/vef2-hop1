
require('dotenv').config();

const fs = require('fs');
const util = require('util');
const faker = require('faker');

const { query } = require('./src/db');

const connectionString = process.env.DATABASE_URL;

const readFileAsync = util.promisify(fs.readFile);

/**
 * Setur upp gagnagrunn og bætir við gögnum
 */
async function main() {
  const departmts = [];
  const products = [];
  console.info(`Set upp gagnagrunn á ${connectionString}`);
  // droppa töflum ef til
  await query('DROP TABLE IF EXISTS categories cascade');
  await query('DROP TABLE IF EXISTS products cascade');
  await query('DROP TABLE IF EXISTS users cascade');
  await query('DROP TABLE IF EXISTS cart cascade');
  await query('DROP TABLE IF EXISTS cart_products cascade');
  console.info('Töflu eytt');

  // búa til töflur út frá skema
  try {
    const createTable = await readFileAsync('./schema.sql');
    await query(createTable.toString('utf8'));
    console.info('Töflur búnar til');
  } catch (e) {
    console.error('Villa við að búa til töflur:', e.message);
    return;
  }

  // bæta færslum við töflur
  try {
    const insert = await readFileAsync('./insert.sql');
    await query(insert.toString('utf8'));
    console.info('Gögnum bætt við');
  } catch (e) {
    console.error('Villa við að bæta gögnum við:', e.message);
  }

  /* Setur inn í töflurnar categories og products */
  while (departmts.length < 12) {
    const departmt = faker.commerce.department();
    if (departmts.indexOf(departmt) === -1) {
      departmts.push(departmt);
      const q = 'INSERT INTO categories (title) VALUES ($1)';
      // eslint-disable-next-line no-await-in-loop
      await query(q, [departmt]);
    }
  }

  while (products.length < 1000) {
    const product = faker.commerce.productName();
    if (products.indexOf(product) === -1) {
      products.push(product);
      const price = Math.round(faker.commerce.price());
      const description = faker.lorem.sentence();
      const department = departmts[Math.floor(Math.random() * departmts.length)];
      const q1 = 'SELECT categoryid FROM categories WHERE title = $1';
      // eslint-disable-next-line no-await-in-loop
      const category = await query(q1, [department]);

      const q2 = 'INSERT INTO products (title, price, description, categoryid) VALUES ($1, $2, $3, $4)';
      const prodValues = [product, price, description, category.rows[0].categoryid];
      // eslint-disable-next-line no-await-in-loop
      await query(q2, prodValues);
    }
  }
  // eslint-disable-next-line no-console
  console.log('komið');
}


main().catch((err) => {
  console.error(err);
});
