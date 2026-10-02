const { setup, tokens, ADDRESS, placeOrder } = require('./helpers');

describe('Passage de commande (CU4)', () => {
  let ctx;
  beforeEach(() => { ctx = setup(); });

  test('crée une commande PENDING, fige les prix, réserve le stock et vide le panier', async () => {
    const order = await placeOrder(ctx);
    expect(order.status).toBe('PENDING');
    expect(order.total).toBe(10500);
    expect(order.items).toHaveLength(2);
    expect(ctx.catalog.stockOf('p1')).toBe(8);
    expect(ctx.catalog.stockOf('p2')).toBe(4);
    const cart = await ctx.api.get('/api/cart').set('Authorization', tokens.alice);
    expect(cart.body.items).toHaveLength(0);
  });

  test('refuse une commande avec un panier vide (409)', async () => {
    const res = await ctx.api.post('/api/orders').set('Authorization', tokens.alice).send(ADDRESS);
    expect(res.status).toBe(409);
    expect(res.body.error.code).toBe('CART_EMPTY');
  });

  test('refuse une adresse trop courte ou un mode de paiement inconnu (400)', async () => {
    await ctx.api.post('/api/cart/items').set('Authorization', tokens.alice).send({ productId: 'p1', quantity: 1 });
    const a = await ctx.api.post('/api/orders').set('Authorization', tokens.alice).send({ ...ADDRESS, shippingAddress: 'a' });
    const b = await ctx.api.post('/api/orders').set('Authorization', tokens.alice).send({ ...ADDRESS, paymentMethod: 'BITCOIN' });
    expect(a.status).toBe(400);
    expect(b.status).toBe(400);
  });

  test('si le stock a baissé entre-temps, rien n\'est enregistré et le panier est conservé', async () => {
    await ctx.api.post('/api/cart/items').set('Authorization', tokens.alice).send({ productId: 'p1', quantity: 2 });
    await ctx.api.post('/api/cart/items').set('Authorization', tokens.alice).send({ productId: 'p2', quantity: 3 });
    ctx.catalog.products.get('p2').stock = 1; // un autre client a acheté entre-temps
    const res = await ctx.api.post('/api/orders').set('Authorization', tokens.alice).send(ADDRESS);
    expect(res.status).toBe(409);
    expect(res.body.error.code).toBe('INSUFFICIENT_STOCK');
    expect(ctx.catalog.stockOf('p1')).toBe(10); // aucune réservation partielle
    expect(ctx.db.prepare('SELECT COUNT(*) AS n FROM orders').get().n).toBe(0);
    const cart = await ctx.api.get('/api/cart').set('Authorization', tokens.alice);
    expect(cart.body.items).toHaveLength(2);
  });

  test('en cas d\'erreur d\'enregistrement, le stock réservé est remis (compensation)', async () => {
    await ctx.api.post('/api/cart/items').set('Authorization', tokens.alice).send({ productId: 'p1', quantity: 2 });
    ctx.db.exec('DROP TABLE order_status_history'); // panne volontaire en cours de transaction
    const spy = jest.spyOn(console, 'error').mockImplementation(() => {}); // on attend une erreur 500
    const res = await ctx.api.post('/api/orders').set('Authorization', tokens.alice).send(ADDRESS);
    spy.mockRestore();
    expect(res.status).toBe(500);
    expect(ctx.catalog.stockOf('p1')).toBe(10);
    expect(ctx.db.prepare('SELECT COUNT(*) AS n FROM orders').get().n).toBe(0);
  });

  test("le prix figé dans la commande ne change pas si le catalogue change ensuite", async () => {
    const order = await placeOrder(ctx);
    ctx.catalog.products.get('p1').price = 9999;
    const res = await ctx.api.get(`/api/orders/${order.id}`).set('Authorization', tokens.alice);
    expect(res.body.total).toBe(10500);
    expect(res.body.items[0].unitPrice).toBe(4500);
  });
});

describe('Consultation et accès aux commandes (CU6)', () => {
  let ctx;
  beforeEach(() => { ctx = setup(); });

  test('un client liste uniquement ses commandes', async () => {
    await placeOrder(ctx, tokens.alice);
    await placeOrder(ctx, tokens.bob);
    const a = await ctx.api.get('/api/orders').set('Authorization', tokens.alice);
    const adm = await ctx.api.get('/api/orders').set('Authorization', tokens.admin);
    expect(a.body).toHaveLength(1);
    expect(adm.body).toHaveLength(2);
  });

  test("un client ne peut pas lire la commande d'un autre (404)", async () => {
    const order = await placeOrder(ctx, tokens.alice);
    const res = await ctx.api.get(`/api/orders/${order.id}`).set('Authorization', tokens.bob);
    expect(res.status).toBe(404);
  });

  test("un client ne peut pas annuler la commande d'un autre (404)", async () => {
    const order = await placeOrder(ctx, tokens.alice);
    const res = await ctx.api.post(`/api/orders/${order.id}/cancel`).set('Authorization', tokens.bob);
    expect(res.status).toBe(404);
  });

  test('filtre par statut et refuse un statut invalide', async () => {
    await placeOrder(ctx);
    const ok = await ctx.api.get('/api/orders?status=PENDING').set('Authorization', tokens.admin);
    const none = await ctx.api.get('/api/orders?status=DELIVERED').set('Authorization', tokens.admin);
    const bad = await ctx.api.get('/api/orders?status=NIMPORTE').set('Authorization', tokens.admin);
    expect(ok.body).toHaveLength(1);
    expect(none.body).toHaveLength(0);
    expect(bad.status).toBe(400);
  });

  test('un identifiant de commande invalide renvoie 404', async () => {
    const res = await ctx.api.get('/api/orders/abc').set('Authorization', tokens.admin);
    expect(res.status).toBe(404);
  });
});
