const { query } = require('./src/db');

const invalidField = (s, maxlen) => {
  if (s !== undefined && typeof s !== 'string') {
    return true;
  }

  if (maxlen && s && s.length) {
    return s.length > maxlen;
  }

  return false;
};
const isEmpty = s => s != null && !s;

async function validateProduct({
  title,
  price,
  description,
  category = null,
} = {}, id = null, patch = false) {
  const messages = [];

  if (!patch || title || isEmpty(title)) {
    if ((typeof title !== 'string' || title.length === 0 || title.length > 255)) {
      messages.push({
        field: 'title',
        message: 'Title is required and must not be empty and no longer than 255 characters',
      });
    }
  }

  if (!patch || title || isEmpty(title)) {
    const product = await query('SELECT * FROM products WHERE title = $1', [title]);

    // leyfum að uppfæra titil í sama titil
    if (product.rows.length > 0 && (Number(product.rows[0].id) !== Number(id))) {
      messages.push({ field: 'title', message: `Product "${title}" already exists` });
    }
  }

  if (!price || !Number.isInteger(Number(price))) {
    messages.push({ field: 'price', message: 'Price is required and must be an integer' });
  }

  if (invalidField(description)) {
    messages.push({ field: 'description', message: 'Description must be a string' });
  }

  /* ----------------- VANTAR IMAGE ----------------- */

  if (!patch || category || isEmpty(category)) {
    const message = category == null ?
      'Category does not exist' : `Category with id "${category}" does not exist`;
    const err = { field: 'category', message };

    if (!Number.isInteger(Number(category))) {
      messages.push(err);
    } else {
      const catExists = await query('SELECT * FROM categories WHERE id = $1', [Number(category)]);
      if (catExists.rows.length === 0) {
        messages.push(err);
      }
    }
  }

  return messages;
}

module.exports = {
  validateProduct,
};
