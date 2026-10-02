const { setup, token } = require('./helpers');
const jwt = require('jsonwebtoken');

describe('Authentification et contrôle des rôles', () => {
  const ctx = setup();

  test('refuse une requête sans jeton (401)', async () => {
    const res = await ctx.api.get('/api/cart');
    expect(res.status).toBe(401);
    expect(res.body.error.code).toBe('UNAUTHENTICATED');
  });

  test('refuse un jeton signé avec un mauvais secret (401)', async () => {
    const bad = jwt.sign({ id: 'x', role: 'CLIENT' }, 'autre-secret');
    const res = await ctx.api.get('/api/cart').set('Authorization', `Bearer ${bad}`);
    expect(res.status).toBe(401);
    expect(res.body.error.code).toBe('INVALID_TOKEN');
  });

  test('refuse un jeton expiré (401)', async () => {
    const old = jwt.sign({ id: 'x', role: 'CLIENT' }, 'test-secret', { expiresIn: -10 });
    const res = await ctx.api.get('/api/cart').set('Authorization', `Bearer ${old}`);
    expect(res.status).toBe(401);
  });

  test('refuse un rôle inconnu (401)', async () => {
    const res = await ctx.api.get('/api/cart').set('Authorization', token('x', 'PIRATE'));
    expect(res.status).toBe(401);
  });

  test("le panier est réservé au rôle CLIENT (403 pour l'administrateur)", async () => {
    const res = await ctx.api.get('/api/cart').set('Authorization', token('a', 'ADMIN'));
    expect(res.status).toBe(403);
  });

  test('la route /health est publique', async () => {
    const res = await ctx.api.get('/health');
    expect(res.status).toBe(200);
    expect(res.body.status).toBe('ok');
  });

  test('une route inconnue renvoie 404', async () => {
    const res = await ctx.api.get('/nimporte-quoi');
    expect(res.status).toBe(404);
  });
});
