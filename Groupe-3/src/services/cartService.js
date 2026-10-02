const { AppError } = require('../errors');
const { positiveInt, productId: checkProductId } = require('../validation');

const now = () => new Date().toISOString();

function createCartService({ db, catalog }) {
  function ensureCart(userId) {
    let cart = db.prepare('SELECT * FROM carts WHERE user_id = ?').get(userId);
    if (!cart) {
      const t = now();
      const r = db.prepare('INSERT INTO carts (user_id, created_at, updated_at) VALUES (?, ?, ?)').run(userId, t, t);
      cart = { id: Number(r.lastInsertRowid), user_id: userId };
    }
    return cart;
  }

  const touch = (cartId) => db.prepare('UPDATE carts SET updated_at = ? WHERE id = ?').run(now(), cartId);

  async function getCart(userId) {
    const cart = ensureCart(userId);
    const rows = db.prepare('SELECT product_id, quantity FROM cart_items WHERE cart_id = ? ORDER BY id').all(cart.id);
    const items = [];
    let total = 0;
    for (const r of rows) {
      const p = await catalog.getProduct(r.product_id);
      const lineTotal = p ? p.price * r.quantity : 0;
      total += lineTotal;
      items.push({
        productId: r.product_id,
        name: p ? p.name : null,
        unitPrice: p ? p.price : null,
        quantity: r.quantity,
        lineTotal,
        available: Boolean(p) && p.stock >= r.quantity,
      });
    }
    return {
      items,
      itemCount: items.reduce((n, i) => n + i.quantity, 0),
      total,
      currency: 'XAF',
    };
  }

  function currentQuantity(cartId, pid) {
    const row = db.prepare('SELECT quantity FROM cart_items WHERE cart_id = ? AND product_id = ?').get(cartId, pid);
    return row ? row.quantity : 0;
  }

  async function requireProduct(pid) {
    const p = await catalog.getProduct(pid);
    if (!p) throw new AppError(404, 'PRODUCT_NOT_FOUND', `Produit ${pid} introuvable dans le catalogue`);
    return p;
  }

  function assertStock(product, wanted) {
    if (wanted > product.stock) {
      throw new AppError(409, 'INSUFFICIENT_STOCK', `Stock insuffisant pour « ${product.name} » (disponible : ${product.stock})`);
    }
  }

  async function addItem(userId, rawProductId, rawQuantity) {
    const pid = checkProductId(rawProductId);
    const quantity = positiveInt(rawQuantity, 'quantity');
    const product = await requireProduct(pid);
    const cart = ensureCart(userId);
    const wanted = currentQuantity(cart.id, pid) + quantity;
    assertStock(product, wanted);
    db.prepare(
      `INSERT INTO cart_items (cart_id, product_id, quantity) VALUES (?, ?, ?)
       ON CONFLICT (cart_id, product_id) DO UPDATE SET quantity = excluded.quantity`
    ).run(cart.id, pid, wanted);
    touch(cart.id);
    return getCart(userId);
  }

  async function setQuantity(userId, rawProductId, rawQuantity) {
    const pid = checkProductId(rawProductId);
    const quantity = positiveInt(rawQuantity, 'quantity');
    const cart = ensureCart(userId);
    if (currentQuantity(cart.id, pid) === 0) {
      throw new AppError(404, 'ITEM_NOT_IN_CART', `Le produit ${pid} n'est pas dans le panier`);
    }
    const product = await requireProduct(pid);
    assertStock(product, quantity);
    db.prepare('UPDATE cart_items SET quantity = ? WHERE cart_id = ? AND product_id = ?').run(quantity, cart.id, pid);
    touch(cart.id);
    return getCart(userId);
  }

  async function removeItem(userId, rawProductId) {
    const pid = checkProductId(rawProductId);
    const cart = ensureCart(userId);
    const r = db.prepare('DELETE FROM cart_items WHERE cart_id = ? AND product_id = ?').run(cart.id, pid);
    if (r.changes === 0) throw new AppError(404, 'ITEM_NOT_IN_CART', `Le produit ${pid} n'est pas dans le panier`);
    touch(cart.id);
    return getCart(userId);
  }

  async function clear(userId) {
    const cart = ensureCart(userId);
    db.prepare('DELETE FROM cart_items WHERE cart_id = ?').run(cart.id);
    touch(cart.id);
    return getCart(userId);
  }

  function rawItems(userId) {
    const cart = ensureCart(userId);
    return db.prepare('SELECT product_id AS productId, quantity FROM cart_items WHERE cart_id = ? ORDER BY id').all(cart.id);
  }

  return { getCart, addItem, setQuantity, removeItem, clear, rawItems, ensureCart };
}

module.exports = { createCartService };
