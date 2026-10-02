const express = require('express');
const { authenticate } = require('./middleware/auth');
const { errorHandler, notFoundHandler } = require('./middleware/errorHandler');
const { createCartService } = require('./services/cartService');
const { createOrderService } = require('./services/orderService');
const { createRouter } = require('./routes');

// db : base SQLite ; catalog : client du catalogue (Groupe 2) ; jwtSecret : secret partagé avec le Groupe 1
function createApp({ db, catalog, jwtSecret }) {
  const app = express();
  app.use(express.json());

  app.get('/health', (req, res) => res.json({ status: 'ok', module: 'groupe3-panier-commandes-livraison' }));

  const cartService = createCartService({ db, catalog });
  const orderService = createOrderService({ db, catalog, cartService });
  app.use('/api', authenticate(jwtSecret), createRouter({ cartService, orderService }));

  app.use(notFoundHandler);
  app.use(errorHandler);
  return app;
}

module.exports = { createApp };
