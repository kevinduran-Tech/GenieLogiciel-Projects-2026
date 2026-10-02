const { AppError } = require('../errors');
const { nonEmptyString, oneOf } = require('../validation');
const { STATUS, ROLES_FOR_TARGET, canTransition } = require('./orderStatus');

const PAYMENT_METHODS = ['MOBILE_MONEY', 'CARD', 'CASH_ON_DELIVERY'];
const now = () => new Date().toISOString();

function createOrderService({ db, catalog, cartService }) {
  // ---------- Lecture ----------
  function loadOrder(id) {
    const o = db.prepare('SELECT * FROM orders WHERE id = ?').get(id);
    if (!o) return null;
    const items = db
      .prepare('SELECT product_id, product_name, unit_price, quantity FROM order_items WHERE order_id = ? ORDER BY id')
      .all(id)
      .map((i) => ({
        productId: i.product_id,
        name: i.product_name,
        unitPrice: i.unit_price,
        quantity: i.quantity,
        lineTotal: i.unit_price * i.quantity,
      }));
    return {
      id: o.id,
      userId: o.user_id,
      status: o.status,
      total: o.total,
      currency: 'XAF',
      shippingAddress: o.shipping_address,
      paymentMethod: o.payment_method,
      createdAt: o.created_at,
      updatedAt: o.updated_at,
      items,
    };
  }

  // Un client ne voit que ses commandes (404 sinon, pour ne pas révéler l'existence d'une commande).
  function getOrderFor(user, id) {
    const order = id ? loadOrder(id) : null;
    if (!order || (user.role === 'CLIENT' && order.userId !== user.id)) {
      throw new AppError(404, 'ORDER_NOT_FOUND', 'Commande introuvable');
    }
    return order;
  }

  function listOrders(user, { status } = {}) {
    const clauses = [];
    const params = [];
    if (user.role === 'CLIENT') {
      clauses.push('user_id = ?');
      params.push(user.id);
    }
    if (status) {
      oneOf(status, Object.values(STATUS), 'status');
      clauses.push('status = ?');
      params.push(status);
    }
    const where = clauses.length ? `WHERE ${clauses.join(' AND ')}` : '';
    const ids = db.prepare(`SELECT id FROM orders ${where} ORDER BY id DESC`).all(...params);
    return ids.map((r) => loadOrder(r.id));
  }

  function getHistory(user, id) {
    getOrderFor(user, id);
    return db
      .prepare('SELECT from_status, to_status, changed_by, changed_at FROM order_status_history WHERE order_id = ? ORDER BY id')
      .all(id)
      .map((h) => ({ from: h.from_status, to: h.to_status, changedBy: h.changed_by, changedAt: h.changed_at }));
  }

  // ---------- Création ----------
  async function createOrder(user, body = {}) {
    const shippingAddress = nonEmptyString(body.shippingAddress, 'shippingAddress', 5);
    const paymentMethod = oneOf(body.paymentMethod, PAYMENT_METHODS, 'paymentMethod');

    const cartItems = cartService.rawItems(user.id);
    if (cartItems.length === 0) throw new AppError(409, 'CART_EMPTY', 'Le panier est vide');

    // 1. Prix et disponibilité (les prix sont « figés » dans la commande)
    const lines = [];
    for (const it of cartItems) {
      const p = await catalog.getProduct(it.productId);
      if (!p) throw new AppError(409, 'PRODUCT_UNAVAILABLE', `Le produit ${it.productId} n'est plus disponible`);
      lines.push({ productId: it.productId, name: p.name, unitPrice: p.price, quantity: it.quantity });
    }
    const total = lines.reduce((s, l) => s + l.unitPrice * l.quantity, 0);

    // 2. Réservation du stock : toutes les lignes ou aucune
    const stockLines = lines.map((l) => ({ productId: l.productId, quantity: l.quantity }));
    await catalog.reserveStock(stockLines);

    // 3. Enregistrement en une seule transaction (tout ou rien) ; compensation du stock en cas d'échec
    try {
      const run = db.transaction(() => {
        const t = now();
        const r = db
          .prepare(
            `INSERT INTO orders (user_id, status, total, shipping_address, payment_method, created_at, updated_at)
             VALUES (?, 'PENDING', ?, ?, ?, ?, ?)`
          )
          .run(user.id, total, shippingAddress, paymentMethod, t, t);
        const orderId = Number(r.lastInsertRowid);
        const insItem = db.prepare(
          'INSERT INTO order_items (order_id, product_id, product_name, unit_price, quantity) VALUES (?, ?, ?, ?, ?)'
        );
        for (const l of lines) insItem.run(orderId, l.productId, l.name, l.unitPrice, l.quantity);
        db.prepare(
          'INSERT INTO order_status_history (order_id, from_status, to_status, changed_by, changed_at) VALUES (?, NULL, ?, ?, ?)'
        ).run(orderId, STATUS.PENDING, user.id, t);
        const cart = cartService.ensureCart(user.id);
        db.prepare('DELETE FROM cart_items WHERE cart_id = ?').run(cart.id);
        return orderId;
      });
      return loadOrder(run());
    } catch (err) {
      await catalog.releaseStock(stockLines);
      throw err;
    }
  }

  // ---------- Transitions d'état ----------
  async function transition(user, id, to, extra = {}) {
    const order = getOrderFor(user, id);
    if (!ROLES_FOR_TARGET[to].includes(user.role)) {
      throw new AppError(403, 'FORBIDDEN', 'Action non autorisée pour votre rôle');
    }
    if (!canTransition(order.status, to)) {
      throw new AppError(409, 'INVALID_TRANSITION', `Impossible de passer la commande de ${order.status} à ${to}`);
    }

    const from = order.status;
    db.transaction(() => {
      const t = now();
      // La condition « AND status = from » protège contre deux modifications simultanées.
      const r = db.prepare('UPDATE orders SET status = ?, updated_at = ? WHERE id = ? AND status = ?').run(to, t, id, from);
      if (r.changes !== 1) throw new AppError(409, 'CONCURRENT_UPDATE', 'La commande a été modifiée entre-temps, réessayez');
      db.prepare(
        'INSERT INTO order_status_history (order_id, from_status, to_status, changed_by, changed_at) VALUES (?, ?, ?, ?, ?)'
      ).run(id, from, to, user.id, t);

      if (to === STATUS.CONFIRMED) {
        const number = `FAC-${t.slice(0, 4)}-${String(id).padStart(6, '0')}`;
        db.prepare('INSERT INTO invoices (order_id, number, total, issued_at) VALUES (?, ?, ?, ?)').run(id, number, order.total, t);
        db.prepare("INSERT INTO deliveries (order_id, status) VALUES (?, 'PENDING')").run(id);
      } else if (to === STATUS.SHIPPED) {
        db.prepare("UPDATE deliveries SET status = 'SHIPPED', shipped_at = ?, updated_by = ? WHERE order_id = ?").run(t, user.id, id);
      } else if (to === STATUS.DELIVERED) {
        db.prepare("UPDATE deliveries SET status = 'DELIVERED', delivered_at = ?, updated_by = ? WHERE order_id = ?").run(t, user.id, id);
      } else if (to === STATUS.REFUNDED) {
        db.prepare('INSERT INTO refunds (order_id, amount, reason, created_by, created_at) VALUES (?, ?, ?, ?, ?)').run(
          id, order.total, extra.reason || null, user.id, t
        );
      }
    })();

    // Remise en stock : annulation, ou remboursement d'une commande jamais expédiée
    const restock = to === STATUS.CANCELLED || (to === STATUS.REFUNDED && from === STATUS.CONFIRMED);
    if (restock) {
      try {
        await catalog.releaseStock(order.items.map((i) => ({ productId: i.productId, quantity: i.quantity })));
      } catch (e) {
        console.error(`Remise en stock impossible pour la commande ${id} :`, e.message);
      }
    }
    return loadOrder(id);
  }

  const confirmOrder = (user, id) => transition(user, id, STATUS.CONFIRMED);
  const cancelOrder = (user, id) => transition(user, id, STATUS.CANCELLED);
  const prepareOrder = (user, id) => transition(user, id, STATUS.PREPARING);
  const shipOrder = (user, id) => transition(user, id, STATUS.SHIPPED);
  const deliverOrder = (user, id) => transition(user, id, STATUS.DELIVERED);
  const refundOrder = (user, id, body = {}) =>
    transition(user, id, STATUS.REFUNDED, { reason: typeof body.reason === 'string' ? body.reason.trim() : null });

  // ---------- Facture et livraison ----------
  function getInvoice(user, id) {
    const order = getOrderFor(user, id);
    const inv = db.prepare('SELECT number, total, issued_at FROM invoices WHERE order_id = ?').get(id);
    if (!inv) throw new AppError(404, 'INVOICE_NOT_FOUND', "Aucune facture : la commande n'est pas encore confirmée");
    return {
      number: inv.number,
      issuedAt: inv.issued_at,
      orderId: order.id,
      orderStatus: order.status,
      customerId: order.userId,
      shippingAddress: order.shippingAddress,
      paymentMethod: order.paymentMethod,
      items: order.items,
      total: inv.total,
      currency: 'XAF',
    };
  }

  function getDelivery(user, id) {
    getOrderFor(user, id);
    const d = db.prepare('SELECT status, shipped_at, delivered_at FROM deliveries WHERE order_id = ?').get(id);
    if (!d) throw new AppError(404, 'DELIVERY_NOT_FOUND', "Aucune livraison : la commande n'est pas encore confirmée");
    return { orderId: id, status: d.status, shippedAt: d.shipped_at, deliveredAt: d.delivered_at };
  }

  return {
    createOrder, listOrders, getOrderFor, getHistory,
    confirmOrder, cancelOrder, prepareOrder, shipOrder, deliverOrder, refundOrder,
    getInvoice, getDelivery,
  };
}

module.exports = { createOrderService, PAYMENT_METHODS };
