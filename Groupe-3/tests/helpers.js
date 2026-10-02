const jwt = require('jsonwebtoken');
const request = require('supertest');
const { openDatabase } = require('../src/db/database');
const { InMemoryCatalog } = require('../src/integrations/catalogClient');
const { createApp } = require('../src/app');

const SECRET = 'test-secret';

function setup() {
  const db = openDatabase(':memory:');
  const catalog = new InMemoryCatalog([
    { id: 'p1', name: 'Riz 5 kg', price: 4500, stock: 10 },
    { id: 'p2', name: 'Huile 1 L', price: 1500, stock: 5 },
    { id: 'p3', name: 'Sucre 1 kg', price: 800, stock: 0 },
  ]);
  const app = createApp({ db, catalog, jwtSecret: SECRET });
  return { db, catalog, app, api: request(app) };
}

const token = (id, role) => `Bearer ${jwt.sign({ id, role }, SECRET, { expiresIn: '1h' })}`;
const tokens = {
  alice: token('alice', 'CLIENT'),
  bob: token('bob', 'CLIENT'),
  admin: token('admin1', 'ADMIN'),
  livreur: token('liv1', 'LIVREUR'),
};

const ADDRESS = { shippingAddress: 'Quartier Bastos, Yaoundé', paymentMethod: 'MOBILE_MONEY' };

// Alice remplit son panier (2 x p1 + 1 x p2 = 10 500 FCFA) puis passe commande.
async function placeOrder(ctx, who = tokens.alice) {
  await ctx.api.post('/api/cart/items').set('Authorization', who).send({ productId: 'p1', quantity: 2 });
  await ctx.api.post('/api/cart/items').set('Authorization', who).send({ productId: 'p2', quantity: 1 });
  const res = await ctx.api.post('/api/orders').set('Authorization', who).send(ADDRESS);
  return res.body;
}

module.exports = { setup, tokens, token, ADDRESS, placeOrder, SECRET };
