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
  categoryid,
} = {}) {
  const messages = [];

  if (title || isEmpty(title)) {
    if ((typeof title !== 'string' || title.length === 0 || title.length > 255)) {
      messages.push({
        field: 'title',
        message: 'Title must not be empty and no longer than 255 characters',
      });
    }
  }

  if (!price || !Number.isInteger(Number(price))) {
    messages.push({ field: 'price', message: 'Price is required and must be an integer' });
  }

  if (!description || invalidField(description)) {
    messages.push({ field: 'description', message: 'Description is required and must be a string' });
  }

  if (!categoryid || !Number.isInteger(Number(price))) {
    messages.push({ field: 'category', message: 'Category is required and must be an integer' });
  }

  /* ----------------- VANTAR IMAGE+CATEGORIES ----------------- */

  return messages;
}

async function validateCategory({ title } = {}) {
  const messages = [];

  if (title || isEmpty(title)) {
    if ((typeof title !== 'string' || title.length === 0 || title.length > 255)) {
      messages.push({
        field: 'title',
        message: 'Title is required and must not be empty and no longer than 255 characters',
      });
    }
  }

  return messages;
}

module.exports = {
  validateProduct,
  validateCategory,
};
