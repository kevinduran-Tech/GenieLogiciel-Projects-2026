const { setup, tokens } = require('./helpers');

describe('Panier (CU1, CU2, CU3)', () => {
  let ctx;
  beforeEach(() => { ctx = setup(); });
  const add = (who, body) => ctx.api.post('/api/cart/items').set('Authorization', who).send(body);

  test('un panier neuf est vide', async () => {
    const res = await ctx.api.get('/api/cart').set('Authorization', tokens.alice);
    expect(res.status).toBe(200);
    expect(res.body).toMatchObject({ items: [], itemCount: 0, total: 0 });
  });

  test('ajoute des produits et calcule le total', async () => {
    await add(tokens.alice, { productId: 'p1', quantity: 2 });
    const res = await add(tokens.alice, { productId: 'p2', quantity: 1 });
    expect(res.status).toBe(201);
    expect(res.body.total).toBe(2 * 4500 + 1500);
    expect(res.body.itemCount).toBe(3);
    expect(res.body.items[0]).toMatchObject({ productId: 'p1', name: 'Riz 5 kg', lineTotal: 9000 });
  });

  test('additionne les quantités quand le même produit est ajouté deux fois', async () => {
    await add(tokens.alice, { productId: 'p1', quantity: 2 });
    const res = await add(tokens.alice, { productId: 'p1', quantity: 3 });
    expect(res.body.items).toHaveLength(1);
    expect(res.body.items[0].quantity).toBe(5);
  });

  test('refuse un produit inconnu (404)', async () => {
    const res = await add(tokens.alice, { productId: 'zzz', quantity: 1 });
    expect(res.status).toBe(404);
    expect(res.body.error.code).toBe('PRODUCT_NOT_FOUND');
  });

  test('refuse une quantité supérieure au stock (409)', async () => {
    const res = await add(tokens.alice, { productId: 'p2', quantity: 6 });
    expect(res.status).toBe(409);
    expect(res.body.error.code).toBe('INSUFFICIENT_STOCK');
  });

  test('refuse un produit en rupture de stock (409)', async () => {
    const res = await add(tokens.alice, { productId: 'p3', quantity: 1 });
    expect(res.status).toBe(409);
  });

  test.each([[0], [-1], [1.5], ['2'], [undefined]])('refuse la quantité invalide %p (400)', async (q) => {
    const res = await add(tokens.alice, { productId: 'p1', quantity: q });
    expect(res.status).toBe(400);
    expect(res.body.error.code).toBe('VALIDATION_ERROR');
  });

  test('modifie la quantité d\'une ligne', async () => {
    await add(tokens.alice, { productId: 'p1', quantity: 2 });
    const res = await ctx.api.patch('/api/cart/items/p1').set('Authorization', tokens.alice).send({ quantity: 4 });
    expect(res.status).toBe(200);
    expect(res.body.total).toBe(18000);
  });

  test('refuse de modifier une ligne absente du panier (404)', async () => {
    const res = await ctx.api.patch('/api/cart/items/p1').set('Authorization', tokens.alice).send({ quantity: 1 });
    expect(res.status).toBe(404);
  });

  test('retire un produit puis vide le panier', async () => {
    await add(tokens.alice, { productId: 'p1', quantity: 1 });
    await add(tokens.alice, { productId: 'p2', quantity: 1 });
    const removed = await ctx.api.delete('/api/cart/items/p1').set('Authorization', tokens.alice);
    expect(removed.body.items.map((i) => i.productId)).toEqual(['p2']);
    const cleared = await ctx.api.delete('/api/cart').set('Authorization', tokens.alice);
    expect(cleared.body.items).toHaveLength(0);
  });

  test('chaque client a son propre panier', async () => {
    await add(tokens.alice, { productId: 'p1', quantity: 1 });
    const res = await ctx.api.get('/api/cart').set('Authorization', tokens.bob);
    expect(res.body.items).toHaveLength(0);
  });
});
