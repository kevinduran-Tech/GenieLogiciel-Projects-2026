const { setup, tokens, placeOrder } = require('./helpers');

describe('Cycle de vie, facture, livraison, annulation, remboursement (CU5, CU7 à CU10)', () => {
  let ctx;
  let order;
  beforeEach(async () => {
    ctx = setup();
    order = await placeOrder(ctx);
  });
  const post = (action, who, body) => ctx.api.post(`/api/orders/${order.id}/${action}`).set('Authorization', who).send(body || {});

  test('parcours complet : confirmation, préparation, expédition, livraison', async () => {
    expect((await post('confirm', tokens.alice)).body.status).toBe('CONFIRMED');
    expect((await post('prepare', tokens.admin)).body.status).toBe('PREPARING');
    expect((await post('ship', tokens.livreur)).body.status).toBe('SHIPPED');
    expect((await post('deliver', tokens.livreur)).body.status).toBe('DELIVERED');

    const history = await ctx.api.get(`/api/orders/${order.id}/history`).set('Authorization', tokens.alice);
    expect(history.body.map((h) => h.to)).toEqual(['PENDING', 'CONFIRMED', 'PREPARING', 'SHIPPED', 'DELIVERED']);
    expect(history.body[1]).toMatchObject({ from: 'PENDING', changedBy: 'alice' });
  });

  test('la confirmation génère la facture avec le bon total', async () => {
    const before = await ctx.api.get(`/api/orders/${order.id}/invoice`).set('Authorization', tokens.alice);
    expect(before.status).toBe(404);
    await post('confirm', tokens.alice);
    const res = await ctx.api.get(`/api/orders/${order.id}/invoice`).set('Authorization', tokens.alice);
    expect(res.status).toBe(200);
    expect(res.body.number).toMatch(/^FAC-\d{4}-\d{6}$/);
    expect(res.body.total).toBe(10500);
    expect(res.body.items).toHaveLength(2);
  });

  test('la facture est disponible en HTML', async () => {
    await post('confirm', tokens.alice);
    const res = await ctx.api.get(`/api/orders/${order.id}/invoice.html`).set('Authorization', tokens.alice);
    expect(res.status).toBe(200);
    expect(res.headers['content-type']).toMatch(/html/);
    expect(res.text).toContain('Total à payer : 10500 XAF');
  });

  test('suit la livraison (PENDING, SHIPPED puis DELIVERED)', async () => {
    await post('confirm', tokens.alice);
    const get = () => ctx.api.get(`/api/orders/${order.id}/delivery`).set('Authorization', tokens.alice);
    expect((await get()).body.status).toBe('PENDING');
    await post('prepare', tokens.admin);
    await post('ship', tokens.livreur);
    const shipped = (await get()).body;
    expect(shipped.status).toBe('SHIPPED');
    expect(shipped.shippedAt).toBeTruthy();
    await post('deliver', tokens.livreur);
    expect((await get()).body.deliveredAt).toBeTruthy();
  });

  test('refuse les transitions interdites (409)', async () => {
    const skip = await post('ship', tokens.admin); // PENDING -> SHIPPED
    expect(skip.status).toBe(409);
    expect(skip.body.error.code).toBe('INVALID_TRANSITION');
    await post('confirm', tokens.alice);
    const again = await post('confirm', tokens.alice);
    expect(again.status).toBe(409);
  });

  test('respecte les rôles : le client ne prépare ni n\'expédie, le livreur ne prépare pas', async () => {
    await post('confirm', tokens.alice);
    expect((await post('prepare', tokens.alice)).status).toBe(403);
    expect((await post('prepare', tokens.livreur)).status).toBe(403);
    await post('prepare', tokens.admin);
    expect((await post('ship', tokens.alice)).status).toBe(403);
    expect((await post('refund', tokens.alice)).status).toBe(403);
  });

  test('annulation avant expédition : statut CANCELLED et stock remis', async () => {
    expect(ctx.catalog.stockOf('p1')).toBe(8);
    const res = await post('cancel', tokens.alice);
    expect(res.body.status).toBe('CANCELLED');
    expect(ctx.catalog.stockOf('p1')).toBe(10);
    expect(ctx.catalog.stockOf('p2')).toBe(5);
  });

  test('annulation possible après confirmation et préparation, impossible une fois expédiée', async () => {
    await post('confirm', tokens.alice);
    await post('prepare', tokens.admin);
    await post('ship', tokens.admin);
    const res = await post('cancel', tokens.alice);
    expect(res.status).toBe(409);
    expect(ctx.catalog.stockOf('p1')).toBe(8);
  });

  test("une commande annulée est définitive", async () => {
    await post('cancel', tokens.alice);
    expect((await post('confirm', tokens.alice)).status).toBe(409);
  });

  test('remboursement d\'une commande livrée : pas de remise en stock, remboursement enregistré', async () => {
    await post('confirm', tokens.alice);
    await post('prepare', tokens.admin);
    await post('ship', tokens.livreur);
    await post('deliver', tokens.livreur);
    const res = await post('refund', tokens.admin, { reason: 'Produit endommagé' });
    expect(res.body.status).toBe('REFUNDED');
    expect(ctx.catalog.stockOf('p1')).toBe(8);
    const refund = ctx.db.prepare('SELECT * FROM refunds WHERE order_id = ?').get(order.id);
    expect(refund).toMatchObject({ amount: 10500, reason: 'Produit endommagé', created_by: 'admin1' });
  });

  test('remboursement d\'une commande confirmée mais non expédiée : stock remis', async () => {
    await post('confirm', tokens.alice);
    const res = await post('refund', tokens.admin);
    expect(res.body.status).toBe('REFUNDED');
    expect(ctx.catalog.stockOf('p1')).toBe(10);
  });

  test('on ne rembourse pas une commande non confirmée (409)', async () => {
    expect((await post('refund', tokens.admin)).status).toBe(409);
  });

  test('deux transitions simultanées : une seule est acceptée', async () => {
    await post('confirm', tokens.alice);
    const [a, b] = await Promise.all([post('prepare', tokens.admin), post('prepare', tokens.admin)]);
    expect([a.status, b.status].sort()).toEqual([200, 409]);
  });
});
