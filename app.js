require('dotenv').config();

const express = require('express');

const api = require('./src/api');

const {
  PORT: port = 3000,
  HOST: host = '127.0.0.1',
} = process.env;

const app = express();

app.use(express.json());

app.use(api);

/**
 * Handler fyrir 404 villu - Not found
 *
 * @param {Object} req
 * @param {Object} res
 * @param {Object} next
 */
function notFoundHandler(req, res, next) { // eslint-disable-line
  console.warn('Not found', req.originalUrl);
  res.status(404).json({ error: 'Not found' });
}

/**
 * Handler fyrir 400 og 500 villur - Invalid json og Internal server error
 *
 * @param {Object} err
 * @param {Object} req
 * @param {Object} res
 * @param {Object} next
 */
function errorHandler(err, req, res, next) { // eslint-disable-line
  console.error(err);

  if (err instanceof SyntaxError && err.status === 400 && 'body' in err) {
    return res.status(400).json({ error: 'Invalid json' });
  }

  return res.status(500).json({ error: 'Internal server error' });
}

app.use(notFoundHandler);
app.use(errorHandler);

app.listen(port, () => {
  if (host) {
    console.info(`Server running at http://${host}:${port}/`);
  }
});
