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

function isEmpty(s) {
  return s == null && !s;
}

async function validateProduct({
  title,
  price,
  description,
  categoryid,
} = {}) {
  const messages = [];


  if (!isEmpty(title)) {
    if ((typeof title !== 'string' || title.length === 0 || title.length > 255)) {
      messages.push({
        field: 'title',
        message: 'Title must not be empty and no longer than 255 characters',
      });
    }
  }

  if (!isEmpty(price)) {
    if (typeof price !== 'number') {
      messages.push({
        field: 'price',
        message: 'Price is required and must be an integer',
      });
    }
  }
 
  if (!isEmpty(description)) {
    if (typeof description !== 'string') {
      messages.push({
        field: 'description',
        message: 'Description is required and must be a string',
      });
    }
  }
 
  if (!isEmpty(categoryid)) {
    if (typeof categoryid !== 'number' || categoryid > 12 || categoryid < 1) {
      messages.push({
        field: 'categoryid',
        message: 'Category must be a number between 0 and 11',
      });
    }
  }

  
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

async function validateCartLine({ amount } = {}) {
  const messages = [];

  if (amount || isEmpty(amount)) {
    if (!amount || typeof amount !== 'number') {
      messages.push({ field: 'amount', message: 'Amount is required and must be a number' });
    } else if (amount < 0) {
      messages.push({ field: 'amount', message: 'Amount must be a number > 0' });
    }
  }
  return messages;
}

module.exports = {
  validateProduct,
  validateCategory,
  validateCartLine,
};
