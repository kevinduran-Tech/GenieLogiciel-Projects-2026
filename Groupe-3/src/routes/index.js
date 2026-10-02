const express = require('express');
const { requireRole } = require('../middleware/auth');
const { parseId } = require('../validation');

const wrap = (fn) => (req, res, next) => Promise.resolve(fn(req, res, next)).catch(next);
const esc = (s) => String(s).replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));

function invoiceHtml(inv) {
  const rows = inv.items
    .map((i) => `<tr><td>${esc(i.name)}</td><td>${i.quantity}</td><td>${i.unitPrice}</td><td>${i.lineTotal}</td></tr>`)
    .join('');
  return `<!doctype html><html lang="fr"><head><meta charset="utf-8"><title>Facture ${esc(inv.number)}</title>
<style>body{font-family:Arial,sans-serif;max-width:700px;margin:30px auto}table{width:100%;border-collapse:collapse}
th,td{border:1px solid #ccc;padding:8px;text-align:left}th{background:#1F3864;color:#fff}.t{text-align:right;font-weight:bold;margin-top:12px}</style></head>
<body><h1>Facture ${esc(inv.number)}</h1>
<p>Date : ${esc(inv.issuedAt)}<br>Commande n° ${inv.orderId} – Client : ${esc(inv.customerId)}<br>
Adresse de livraison : ${esc(inv.shippingAddress)}<br>Paiement : ${esc(inv.paymentMethod)}</p>
<table><tr><th>Produit</th><th>Quantité</th><th>Prix unitaire (${inv.currency})</th><th>Total (${inv.currency})</th></tr>${rows}</table>
<p class="t">Total à payer : ${inv.total} ${inv.currency}</p></body></html>`;
}

function createRouter({ cartService, orderService }) {
  const r = express.Router();
  const client = requireRole('CLIENT');
  const id = (req) => parseId(req.params.id);

  // ----- Panier (rôle CLIENT) -----
  r.get('/cart', client, wrap(async (req, res) => res.json(await cartService.getCart(req.user.id))));
  r.post('/cart/items', client, wrap(async (req, res) => {
    const { productId, quantity } = req.body || {};
    res.status(201).json(await cartService.addItem(req.user.id, productId, quantity));
  }));
  r.patch('/cart/items/:productId', client, wrap(async (req, res) =>
    res.json(await cartService.setQuantity(req.user.id, req.params.productId, (req.body || {}).quantity))));
  r.delete('/cart/items/:productId', client, wrap(async (req, res) =>
    res.json(await cartService.removeItem(req.user.id, req.params.productId))));
  r.delete('/cart', client, wrap(async (req, res) => res.json(await cartService.clear(req.user.id))));

  // ----- Commandes -----
  r.post('/orders', client, wrap(async (req, res) => res.status(201).json(await orderService.createOrder(req.user, req.body))));
  r.get('/orders', wrap(async (req, res) => res.json(orderService.listOrders(req.user, { status: req.query.status }))));
  r.get('/orders/:id', wrap(async (req, res) => res.json(orderService.getOrderFor(req.user, id(req)))));
  r.get('/orders/:id/history', wrap(async (req, res) => res.json(orderService.getHistory(req.user, id(req)))));

  r.post('/orders/:id/confirm', wrap(async (req, res) => res.json(await orderService.confirmOrder(req.user, id(req)))));
  r.post('/orders/:id/cancel', wrap(async (req, res) => res.json(await orderService.cancelOrder(req.user, id(req)))));
  r.post('/orders/:id/prepare', wrap(async (req, res) => res.json(await orderService.prepareOrder(req.user, id(req)))));
  r.post('/orders/:id/ship', wrap(async (req, res) => res.json(await orderService.shipOrder(req.user, id(req)))));
  r.post('/orders/:id/deliver', wrap(async (req, res) => res.json(await orderService.deliverOrder(req.user, id(req)))));
  r.post('/orders/:id/refund', wrap(async (req, res) => res.json(await orderService.refundOrder(req.user, id(req), req.body))));

  // ----- Facture et livraison -----
  r.get('/orders/:id/invoice', wrap(async (req, res) => res.json(orderService.getInvoice(req.user, id(req)))));
  r.get('/orders/:id/invoice.html', wrap(async (req, res) => res.type('html').send(invoiceHtml(orderService.getInvoice(req.user, id(req))))));
  r.get('/orders/:id/delivery', wrap(async (req, res) => res.json(orderService.getDelivery(req.user, id(req)))));

  return r;
}

module.exports = { createRouter };
